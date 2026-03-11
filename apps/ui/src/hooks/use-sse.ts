/**
 * useSSE — subscribe to keepd SSE endpoint and invalidate queries on events.
 */
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePostHog } from '@posthog/react';
import { qk } from '../lib/query-keys';
import { getAccessToken } from '../lib/api';

const SSE_URL = '/api/events';

export function useSSE() {
  const queryClient = useQueryClient();
  const posthog = usePostHog();
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let cancelled = false;

    getAccessToken().then((token) => {
      if (cancelled) return;
      const url = token ? `${SSE_URL}?access_token=${token}` : SSE_URL;
      const source = new EventSource(url);
      sourceRef.current = source;

    source.addEventListener('approval_request', (e: MessageEvent) => {
      queryClient.invalidateQueries({ queryKey: qk.queue() });
      try {
        const data = JSON.parse(e.data);
        posthog?.capture('approval_requested', {
          service: data.service,
          method: data.method,
          operation_type: data.operationType,
        });
      } catch { /* ignore */ }
    });

    source.addEventListener('approval_resolved', (e: MessageEvent) => {
      queryClient.invalidateQueries({ queryKey: qk.queue() });
      try {
        const data = JSON.parse(e.data);
        posthog?.capture('approval_resolved', {
          status: data.status,
          resolved_by: data.resolvedBy,
        });
      } catch { /* ignore */ }
    });

    source.addEventListener('pairing_completed', (e: MessageEvent) => {
      queryClient.invalidateQueries({ queryKey: qk.agents() });
      try {
        const data = JSON.parse(e.data);
        if (data?.id) {
          queryClient.invalidateQueries({ queryKey: qk.agent(data.id) });
        }
        posthog?.capture('agent_paired');
      } catch { /* ignore parse errors */ }
    });

    source.addEventListener('request_completed', (e: MessageEvent) => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      try {
        const data = JSON.parse(e.data);
        posthog?.capture('rpc_call', {
          service: data.service,
          method: data.method,
          status: data.responseStatus,
        });
      } catch { /* ignore */ }
    });

    source.addEventListener('agent_connected', () => {
      queryClient.invalidateQueries({ queryKey: qk.agents() });
    });

    source.addEventListener('agent_disconnected', () => {
      queryClient.invalidateQueries({ queryKey: qk.agents() });
    });

    source.addEventListener('connection_updated', (e: MessageEvent) => {
      queryClient.invalidateQueries({ queryKey: qk.connections() });
      try {
        const data = JSON.parse(e.data);
        if (data.action === 'connected') {
          posthog?.capture('app_connected', { service: data.service });
          window.dispatchEvent(
            new CustomEvent('keepai:app-connected', { detail: { service: data.service } })
          );
        } else if (data.status === 'paused') {
          posthog?.capture('app_paused', { service: data.service });
        }
      } catch { /* ignore */ }
    });

    source.addEventListener('connection_health', () => {
      queryClient.invalidateQueries({ queryKey: qk.connections() });
    });

    source.onerror = () => {
      // EventSource auto-reconnects on error
    };

    });

    return () => {
      cancelled = true;
      sourceRef.current?.close();
      sourceRef.current = null;
    };
  }, [queryClient, posthog]);
}
