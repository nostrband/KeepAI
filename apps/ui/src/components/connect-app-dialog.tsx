import { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle2 } from 'lucide-react';
import { useConnectService } from '../hooks/use-connections';
import { ServiceIcon, serviceName } from './service-icon';

const AVAILABLE_SERVICES = ['gmail', 'notion', 'github'];

type Step = 'select' | 'redirecting' | 'waiting' | 'connected';

interface ConnectAppDialogProps {
  open: boolean;
  onClose: () => void;
  /** When set, forces dialog open in 'connected' state for this service */
  connectedService?: string | null;
  /** Reports the service user initiated OAuth for (for re-show tracking) */
  onPendingService?: (service: string | null) => void;
}

export function ConnectAppDialog({
  open,
  onClose,
  connectedService,
  onPendingService,
}: ConnectAppDialogProps) {
  const connectMutation = useConnectService();
  const [step, setStep] = useState<Step>('select');
  const [activeService, setActiveService] = useState<string | null>(null);

  // When connectedService is set externally (re-show), jump to connected state
  useEffect(() => {
    if (connectedService) {
      setActiveService(connectedService);
      setStep('connected');
    }
  }, [connectedService]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      // Only reset if we're in connected state (flow complete)
      // Keep state for redirecting/waiting so re-show works
      if (step === 'connected' || step === 'select') {
        setStep('select');
        setActiveService(null);
      }
    }
  }, [open, step]);

  if (!open) return null;

  const handleConnect = async (service: string) => {
    setActiveService(service);
    setStep('redirecting');
    onPendingService?.(service);

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
      onPendingService?.(null);
    }
  };

  const handleClose = () => {
    if (step === 'connected') {
      onPendingService?.(null);
    }
    onClose();
  };

  const name = activeService ? serviceName(activeService) : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 relative">
        {/* X button */}
        <button
          onClick={handleClose}
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
            <div className="flex gap-3">
              {AVAILABLE_SERVICES.map((svc) => (
                <button
                  key={svc}
                  onClick={() => handleConnect(svc)}
                  disabled={connectMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl hover:bg-accent hover:border-foreground/20 transition-all disabled:opacity-50"
                >
                  <ServiceIcon service={svc} />
                  <span className="text-sm font-medium">{serviceName(svc)}</span>
                </button>
              ))}
            </div>
          </>
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
                onClick={handleClose}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-brand-hover"
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
