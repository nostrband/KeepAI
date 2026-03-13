import { useEffect, useRef, useState, useCallback } from 'react';

export interface ActivityEntry {
  service: string;
  method: string;
  accountId: string;
  agentId: string;
  agentName: string;
  requestSummary: string | null;
  /** When this activity was received */
  receivedAt: number;
  /** Whether the activity is currently visible (false = exiting) */
  visible: boolean;
}

const DISPLAY_DURATION = 10_000;
const EXIT_ANIMATION_DURATION = 300;

/**
 * Generic activity tracker — listens to keepai:request-completed window events
 * and maintains a keyed map of latest activity with auto-expiry.
 */
function useActivityTracker(keyFn: (data: any) => string | null) {
  const [activities, setActivities] = useState<Map<string, ActivityEntry>>(new Map());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearTimers = useCallback((key: string) => {
    const existing = timersRef.current.get(key);
    if (existing) clearTimeout(existing);
    const exitKey = `${key}:exit`;
    const existingExit = timersRef.current.get(exitKey);
    if (existingExit) clearTimeout(existingExit);
  }, []);

  const scheduleHide = useCallback((key: string) => {
    const hideTimer = setTimeout(() => {
      setActivities((prev) => {
        const entry = prev.get(key);
        if (!entry) return prev;
        const next = new Map(prev);
        next.set(key, { ...entry, visible: false });
        return next;
      });
      const exitTimer = setTimeout(() => {
        setActivities((prev) => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
        timersRef.current.delete(`${key}:exit`);
      }, EXIT_ANIMATION_DURATION);
      timersRef.current.set(`${key}:exit`, exitTimer);
    }, DISPLAY_DURATION);
    timersRef.current.set(key, hideTimer);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const data = (e as CustomEvent).detail;
      const key = keyFn(data);
      if (!key) return;

      clearTimers(key);

      const activity: ActivityEntry = {
        service: data.service,
        method: data.method,
        accountId: data.accountId ?? '',
        agentId: data.agentId ?? '',
        agentName: data.agentName ?? '',
        requestSummary: data.requestSummary ?? null,
        receivedAt: Date.now(),
        visible: true,
      };

      setActivities((prev) => {
        const next = new Map(prev);
        next.set(key, activity);
        return next;
      });

      scheduleHide(key);
    };

    window.addEventListener('keepai:request-completed', handler);
    return () => {
      window.removeEventListener('keepai:request-completed', handler);
      for (const timer of timersRef.current.values()) {
        clearTimeout(timer);
      }
      timersRef.current.clear();
    };
  }, [keyFn, clearTimers, scheduleHide]);

  return activities;
}

/** Activity keyed by agentId — for agent rows (shows service + account + method). */
export function useAgentActivity() {
  return useActivityTracker(
    useCallback((data: any) => data?.agentId || null, [])
  );
}

/** Activity keyed by service:accountId — for app rows (shows agent + method). */
export function useAppActivity() {
  return useActivityTracker(
    useCallback((data: any) => {
      if (!data?.service || !data?.accountId) return null;
      return `${data.service}:${data.accountId}`;
    }, [])
  );
}
