/**
 * useSSE — subscribe to keepd SSE endpoint and invalidate queries on events.
 */
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { qk } from '../lib/query-keys';

const SSE_URL = '/api/events';

export function useSSE() {
  const queryClient = useQueryClient();
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const source = new EventSource(SSE_URL);
    sourceRef.current = source;

    source.addEventListener('approval_request', () => {
      queryClient.invalidateQueries({ queryKey: qk.queue() });
    });

    source.addEventListener('approval_resolved', () => {
      queryClient.invalidateQueries({ queryKey: qk.queue() });
    });

    source.addEventListener('pairing_completed', () => {
      queryClient.invalidateQueries({ queryKey: qk.agents() });
    });

    source.addEventListener('request_completed', () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    });

    source.addEventListener('connection_updated', () => {
      queryClient.invalidateQueries({ queryKey: qk.connections() });
    });

    source.onerror = () => {
      // EventSource auto-reconnects on error
    };

    return () => {
      source.close();
      sourceRef.current = null;
    };
  }, [queryClient]);
}
