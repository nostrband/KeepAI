import { Plus } from 'lucide-react';
import { useConnectService } from '../hooks/use-connections';
import { ServiceIcon, serviceName } from './service-icon';

const AVAILABLE_SERVICES = ['gmail', 'notion', 'github'];

interface ConnectAppDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ConnectAppDialog({ open, onClose }: ConnectAppDialogProps) {
  const connectMutation = useConnectService();

  if (!open) return null;

  const handleConnect = async (service: string) => {
    onClose();
    try {
      const result = await connectMutation.mutateAsync(service);
      if (result.authUrl) {
        if ((window as any).electronAPI?.openExternal) {
          (window as any).electronAPI.openExternal(result.authUrl);
        } else {
          window.open(result.authUrl, '_blank');
        }
      }
    } catch {
      // error toast shown by global mutation handler
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
        <h2 className="text-lg font-semibold mb-4">Connect App</h2>
        <p className="text-sm text-muted-foreground mb-4">Choose an app to connect:</p>
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
        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded-lg hover:bg-accent"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
