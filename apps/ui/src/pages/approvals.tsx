import { ShieldCheck } from 'lucide-react';
import { useQueue, useApproveRequest, useDenyRequest } from '../hooks/use-queue';
import { ApprovalCard } from '../components/approval-card';
import { EmptyState } from '../components/empty-state';

export function ApprovalsPage() {
  const { data: queue, isLoading } = useQueue();
  const approveMutation = useApproveRequest();
  const denyMutation = useDenyRequest();

  const items = queue ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Approvals</h1>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="w-12 h-12" />}
          title="No pending approvals"
          description="When an agent requests an action that requires approval, it will appear here."
        />
      ) : (
        <div className="space-y-3">
          {items.map((item: any) => (
            <ApprovalCard
              key={item.id}
              item={item}
              onApprove={(id) => approveMutation.mutate(id)}
              onDeny={(id) => denyMutation.mutate(id)}
              isApproving={approveMutation.isPending}
              isDenying={denyMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
