import { useState, useEffect, useRef, useCallback } from 'react';
import { useConnections } from './use-connections';
import { serviceName } from '../components/service-icon';

/**
 * Shared hook for OAuth connection flow state.
 *
 * Two detection mechanisms (both trigger the "connected" dialog):
 * 1. Diff-based: detects genuinely new entries in the connections list.
 * 2. Event-based: listens for the `keepai:app-connected` DOM event
 *    dispatched by useSSE on `connection_updated { action: 'connected' }`.
 *    This handles re-auth of an already-connected account where the list
 *    doesn't change but the backend still confirms success.
 */
export function useOAuthFlow() {
  const [showDialog, setShowDialog] = useState(false);
  const [connectedService, setConnectedService] = useState<string | null>(null);
  const { data: connections } = useConnections();
  const prevConnectionsRef = useRef<any[] | undefined>(undefined);

  const showConnected = useCallback((service: string) => {
    setConnectedService(service);
    setShowDialog(true);

    const name = serviceName(service);
    (window as any).electronAPI?.showNotification({
      title: 'KeepAI',
      body: `${name} connected`,
    });
  }, []);

  // 1. Diff-based: detect genuinely new connections in the list
  useEffect(() => {
    const prev = prevConnectionsRef.current;
    prevConnectionsRef.current = connections;

    if (!connections || !prev) return;

    const newConn = connections.find(
      (c: any) =>
        !prev.some((p: any) => p.service === c.service && p.accountId === c.accountId)
    );

    if (newConn) {
      showConnected(newConn.service);
    }
  }, [connections, showConnected]);

  // 2. Event-based: SSE `connection_updated` with action=connected
  //    Covers re-auth of already-connected accounts.
  useEffect(() => {
    const handler = (e: Event) => {
      const service = (e as CustomEvent).detail?.service;
      if (service) {
        showConnected(service);
      }
    };
    window.addEventListener('keepai:app-connected', handler);
    return () => window.removeEventListener('keepai:app-connected', handler);
  }, [showConnected]);

  const openDialog = useCallback(() => {
    setConnectedService(null);
    setShowDialog(true);
  }, []);

  const closeDialog = useCallback(() => {
    setShowDialog(false);
    setConnectedService(null);
  }, []);

  return {
    showDialog,
    connectedService,
    openDialog,
    closeDialog,
  };
}
