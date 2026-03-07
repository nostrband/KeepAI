/**
 * useSSE — subscribe to keepd SSE endpoint and invalidate queries on events.
 */
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { qk } from '../lib/query-keys';
import { getAccessToken } from '../lib/api';

const SSE_URL = '/api/events';

export function useSSE() {
  const queryClient = useQueryClient();
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let cancelled = false;

    getAccessToken().then((token) => {
      if (cancelled) return;
      const url = token ? `${SSE_URL}?access_token=${token}` : SSE_URL;
      const source = new EventSource(url);
      sourceRef.current = source;

    source.addEventListener('approval_request', () => {
      queryClient.invalidateQueries({ queryKey: qk.queue() });
    });

    source.addEventListener('approval_resolved', () => {
      queryClient.invalidateQueries({ queryKey: qk.queue() });
    });

    source.addEventListener('pairing_completed', (e: MessageEvent) => {
      queryClient.invalidateQueries({ queryKey: qk.agents() });
      try {
        const data = JSON.parse(e.data);
        if (data?.id) {
          queryClient.invalidateQueries({ queryKey: qk.agent(data.id) });
        }
      } catch { /* ignore parse errors */ }
    });

    source.addEventListener('request_completed', () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    });

    source.addEventListener('agent_connected', () => {
      queryClient.invalidateQueries({ queryKey: qk.agents() });
    });

    source.addEventListener('agent_disconnected', () => {
      queryClient.invalidateQueries({ queryKey: qk.agents() });
    });

    source.addEventListener('connection_updated', () => {
      queryClient.invalidateQueries({ queryKey: qk.connections() });
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
  }, [queryClient]);
}
