import { useState, useEffect, useRef } from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { qk } from '../lib/query-keys';
import { BILLING_API_URL } from '@keepai/proto';

type Step = 'initiating' | 'waiting' | 'success' | 'error';

interface SignInDialogProps {
  open: boolean;
  onClose: () => void;
  /** When true, opens the plans page after successful sign-in */
  openPlansAfter?: boolean;
}

export function SignInDialog({ open, onClose, openPlansAfter }: SignInDialogProps) {
  const [step, setStep] = useState<Step>('initiating');
  const [userCode, setUserCode] = useState<string | null>(null);
  const [deviceCode, setDeviceCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queryClient = useQueryClient();

  const cleanup = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const handleClose = () => {
    cleanup();
    setStep('initiating');
    setUserCode(null);
    setDeviceCode(null);
    setErrorMessage(null);
    setEmail(null);
    onClose();
  };

  const startSignIn = async () => {
    setStep('initiating');
    setErrorMessage(null);
    try {
      const result = await api.startSignIn();
      setUserCode(result.user_code);
      setDeviceCode(result.device_code);
      setStep('waiting');

      // Open browser
      const url = `${BILLING_API_URL}/signin?code=${result.user_code}`;
      if ((window as any).electronAPI?.openExternal) {
        (window as any).electronAPI.openExternal(url);
      } else {
        window.open(url, '_blank');
      }

      // Start polling
      const deadline = new Date(result.expires_at).getTime();
      pollRef.current = setInterval(async () => {
        if (Date.now() >= deadline) {
          cleanup();
          setStep('error');
          setErrorMessage('Sign-in timed out. Please try again.');
          return;
        }

        try {
          const pollResult = await api.pollSignIn(result.device_code);
          if (pollResult.status === 'success') {
            cleanup();
            setEmail(pollResult.user?.email ?? null);
            setStep('success');
            queryClient.invalidateQueries({ queryKey: qk.billing() });
          } else if (pollResult.status === 'expired') {
            cleanup();
            setStep('error');
            setErrorMessage('Sign-in expired. Please try again.');
          }
        } catch {
          // Network error during poll — keep trying
        }
      }, 2000);
    } catch (err: any) {
      setStep('error');
      setErrorMessage(err.message || 'Failed to start sign-in');
    }
  };

  useEffect(() => {
    if (open) {
      startSignIn();
    }
    return cleanup;
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
        {step === 'initiating' && (
          <div className="flex flex-col items-center py-6">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Connecting to KeepAI...</p>
          </div>
        )}

        {step === 'waiting' && (
          <div className="flex flex-col items-center py-6">
            <h2 className="text-lg font-semibold mb-2">Sign in with your browser</h2>
            {userCode && (
              <div className="my-4 px-4 py-2 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1 text-center">Your code</p>
                <p className="text-2xl font-mono font-bold tracking-widest text-center">{userCode}</p>
              </div>
            )}
            <p className="text-sm text-muted-foreground mt-2">Verify this code in your browser.</p>
            <div className="flex items-center gap-2 mt-2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Waiting for sign-in...</span>
            </div>
            <button
              onClick={handleClose}
              className="mt-4 px-3 py-1.5 text-sm rounded-lg hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        )}

        {step === 'success' && (
          <>
            <div className="flex flex-col items-center py-6">
              <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
              <h2 className="text-lg font-semibold mb-1">Signed In</h2>
              {email && (
                <p className="text-sm text-muted-foreground">
                  Signed in as <span className="font-medium text-foreground">{email}</span>
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={handleClose}
                className="px-3 py-1.5 text-sm rounded-lg hover:bg-accent"
              >
                Close
              </button>
              {openPlansAfter && (
                <button
                  onClick={() => {
                    const url = `${BILLING_API_URL}/plans`;
                    if ((window as any).electronAPI?.openExternal) {
                      (window as any).electronAPI.openExternal(url);
                    } else {
                      window.open(url, '_blank');
                    }
                    handleClose();
                  }}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-brand-hover"
                >
                  View Plans
                </button>
              )}
            </div>
          </>
        )}

        {step === 'error' && (
          <>
            <div className="flex flex-col items-center py-6">
              <XCircle className="w-12 h-12 text-destructive mb-3" />
              <h2 className="text-lg font-semibold mb-1">Sign-in Failed</h2>
              <p className="text-sm text-muted-foreground text-center">
                {errorMessage}
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleClose}
                className="px-3 py-1.5 text-sm rounded-lg hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={startSignIn}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-brand-hover"
              >
                Try again
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
