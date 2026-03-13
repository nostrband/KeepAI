import { useEffect, useState, useRef } from 'react';
import { ServiceIcon } from './service-icon';
import type { ActivityEntry } from '../hooks/use-agent-activity';

interface AgentActivityBadgeProps {
  activity: ActivityEntry | undefined;
}

export function AgentActivityBadge({ activity }: AgentActivityBadgeProps) {
  const [entered, setEntered] = useState(false);
  const prevReceivedAtRef = useRef<number | undefined>();

  // Reset entered state when a new activity arrives (new receivedAt),
  // then flip to true on next frame to trigger the CSS transition.
  useEffect(() => {
    if (!activity) {
      setEntered(false);
      prevReceivedAtRef.current = undefined;
      return;
    }

    if (activity.receivedAt !== prevReceivedAtRef.current) {
      prevReceivedAtRef.current = activity.receivedAt;
      setEntered(false);
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setEntered(true);
        });
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [activity]);

  if (!activity) return null;

  const label = activity.requestSummary || activity.method;
  const show = entered && activity.visible;

  return (
    <div className="relative overflow-hidden h-6 flex-shrink-0">
      <div
        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/60 text-xs text-muted-foreground transition-all duration-300 ease-out ${
          show
            ? 'translate-y-0 opacity-100'
            : '-translate-y-full opacity-0'
        }`}
      >
        <ServiceIcon service={activity.service} className="w-3.5 h-3.5" />
        {activity.accountId && (
          <>
            <span className="truncate max-w-[80px] font-medium">{activity.accountId}</span>
            <span className="text-muted-foreground/50">·</span>
          </>
        )}
        <span className="truncate max-w-[140px]">{label}</span>
      </div>
    </div>
  );
}
