import { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { useConnectService } from '../hooks/use-connections';
import { ServiceIcon, serviceName } from './service-icon';
import type { ConnectionFailure } from '../hooks/use-oauth-flow';

const AVAILABLE_SERVICES = ['gmail', 'notion', 'github', 'airtable', 'trello'];

const BETA_SERVICES: Record<string, string> = {
  gmail: 'Gmail integration is in beta and has not yet been verified by Google LLC. You may see warning screens during authorization. Proceed with caution.',
};

type Step = 'select' | 'warning' | 'redirecting' | 'waiting' | 'connected' | 'failed';

interface ConnectAppDialogProps {
  open: boolean;
  onClose: () => void;
  /** When set, overrides dialog to show 'connected' state for this service */
  connectedService?: string | null;
  /** When set, overrides dialog to show 'failed' state */
  connectionFailure?: ConnectionFailure | null;
}

export function ConnectAppDialog({
  open,
  onClose,
  connectedService,
  connectionFailure,
}: ConnectAppDialogProps) {
  const connectMutation = useConnectService();
  const [step, setStep] = useState<Step>('select');
  const [activeService, setActiveService] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // When connectedService is set externally, override whatever state
  // the dialog is in to show the 'connected' screen for that service.
  useEffect(() => {
    if (connectedService) {
      setActiveService(connectedService);
      setErrorMessage(null);
      setStep('connected');
    }
  }, [connectedService]);

  // When connectionFailure is set externally, show the 'failed' screen.
  useEffect(() => {
    if (connectionFailure) {
      setActiveService(connectionFailure.service);
      setErrorMessage(connectionFailure.error);
      setStep('failed');
    }
  }, [connectionFailure]);

  // Always reset to clean state when dialog closes so reopening
  // never shows a stale spinner.
  useEffect(() => {
    if (!open) {
      setStep('select');
      setActiveService(null);
      setErrorMessage(null);
    }
  }, [open]);

  if (!open) return null;

  const startConnect = async (service: string) => {
    setActiveService(service);
    setErrorMessage(null);
    setStep('redirecting');

    try {
      const result = await connectMutation.mutateAsync(service);
      if (result.authUrl) {
        if ((window as any).electronAPI?.openExternal) {
          (window as any).electronAPI.openExternal(result.authUrl);
        } else {
          window.open(result.authUrl, '_blank');
        }
        setStep('waiting');
      }
    } catch {
      // error toast shown by global mutation handler
      setStep('select');
      setActiveService(null);
    }
  };

  const handleConnect = (service: string) => {
    if (BETA_SERVICES[service]) {
      setActiveService(service);
      setStep('warning');
    } else {
      startConnect(service);
    }
  };

  const name = activeService ? serviceName(activeService) : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 relative">
        {/* X button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>

        {step === 'select' && (
          <>
            <h2 className="text-lg font-semibold mb-4">Connect App</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Choose an app to connect:
            </p>
            <div className="flex flex-wrap gap-3">
              {AVAILABLE_SERVICES.map((svc) => (
                <button
                  key={svc}
                  onClick={() => handleConnect(svc)}
                  disabled={connectMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl hover:bg-accent hover:border-foreground/20 transition-all disabled:opacity-50"
                >
                  <ServiceIcon service={svc} />
                  <span className="text-sm font-medium">{serviceName(svc)}</span>
                  {BETA_SERVICES[svc] && (
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                      Beta
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'warning' && activeService && (
          <div className="flex flex-col items-center py-6">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-lg font-semibold mb-2">{name} — Beta</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">
              {BETA_SERVICES[activeService]}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setStep('select'); setActiveService(null); }}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-border hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={() => startConnect(activeService)}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-brand-hover"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 'redirecting' && activeService && (
          <div className="flex flex-col items-center py-6">
            <ServiceIcon service={activeService} className="w-10 h-10 mb-4" />
            <h2 className="text-lg font-semibold mb-2">Connecting to {name}</h2>
            <p className="text-sm text-muted-foreground text-center">
              You will be redirected to your browser to authorize on {name}.
            </p>
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mt-4" />
          </div>
        )}

        {step === 'waiting' && activeService && (
          <div className="flex flex-col items-center py-6">
            <ServiceIcon service={activeService} className="w-10 h-10 mb-4" />
            <h2 className="text-lg font-semibold mb-2">Connecting to {name}</h2>
            <div className="flex items-center gap-2 mt-2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Please confirm the connection in your browser
              </span>
            </div>
          </div>
        )}

        {step === 'connected' && activeService && (
          <>
            <div className="flex flex-col items-center py-6">
              <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
              <h2 className="text-lg font-semibold mb-1">{name} Connected</h2>
              <p className="text-sm text-muted-foreground">
                Your <span className="font-medium text-foreground">{name}</span> account has been connected successfully.
              </p>
            </div>
            <div className="flex justify-end mt-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-brand-hover"
              >
                Done
              </button>
            </div>
          </>
        )}

        {step === 'failed' && activeService && (
          <>
            <div className="flex flex-col items-center py-6">
              <XCircle className="w-12 h-12 text-destructive mb-3" />
              <h2 className="text-lg font-semibold mb-1">Failed to connect {name}</h2>
              <p className="text-sm text-muted-foreground text-center">
                {errorMessage}
              </p>
            </div>
            <div className="flex justify-end gap-3 mt-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-border hover:bg-accent"
              >
                Close
              </button>
              <button
                onClick={() => startConnect(activeService)}
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
