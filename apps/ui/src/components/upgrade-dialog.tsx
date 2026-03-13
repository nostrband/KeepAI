import { useState } from 'react';
import { useBilling } from '../hooks/use-billing';
import { SignInDialog } from './signin-dialog';
import { BILLING_API_URL } from '@keepai/proto';

type ResourceType = 'agents' | 'apps';

interface UpgradeDialogProps {
  open: boolean;
  onClose: () => void;
  resourceType: ResourceType;
}

export function UpgradeDialog({ open, onClose, resourceType }: UpgradeDialogProps) {
  const { data: billing } = useBilling();
  const [showSignIn, setShowSignIn] = useState(false);

  if (!open || !billing) return null;

  const { plan } = billing;
  const limit = resourceType === 'agents' ? plan.max_agents : plan.max_apps;
  const label = resourceType === 'agents' ? 'agent' : 'app';
  const labelPlural = resourceType === 'agents' ? 'agents' : 'apps';

  const handleUpgrade = () => {
    if (!billing.authenticated) {
      setShowSignIn(true);
    } else {
      const url = `${BILLING_API_URL}/plans`;
      if ((window as any).electronAPI?.openExternal) {
        (window as any).electronAPI.openExternal(url);
      } else {
        window.open(url, '_blank');
      }
      onClose();
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
          <h2 className="text-lg font-semibold mb-2">
            Upgrade to add more {labelPlural}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Your {plan.plan_name} plan includes {limit} {limit === 1 ? label : labelPlural}.
            {' '}Upgrade your plan to add more.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm rounded-lg hover:bg-accent"
            >
              Cancel
            </button>
            <button
              onClick={handleUpgrade}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-brand-hover"
            >
              Upgrade
            </button>
          </div>
        </div>
      </div>

      <SignInDialog
        open={showSignIn}
        onClose={() => setShowSignIn(false)}
        openPlansAfter
      />
    </>
  );
}
