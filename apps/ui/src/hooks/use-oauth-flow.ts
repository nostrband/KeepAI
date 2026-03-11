import { useState, useEffect, useRef, useCallback } from 'react';
import { useConnections } from './use-connections';
import { serviceName } from '../components/service-icon';

export interface ConnectionFailure {
  service: string;
  error: string;
}

/**
 * Shared hook for OAuth connection flow state.
 *
 * Detection mechanisms:
 * 1. Diff-based: detects genuinely new entries in the connections list.
 * 2. Event-based (connected): listens for `keepai:app-connected` DOM event.
 * 3. Event-based (failed): listens for `keepai:app-connect-failed` DOM event.
 */
export function useOAuthFlow() {
  const [showDialog, setShowDialog] = useState(false);
  const [connectedService, setConnectedService] = useState<string | null>(null);
  const [connectionFailure, setConnectionFailure] = useState<ConnectionFailure | null>(null);
  const { data: connections } = useConnections();
  const prevConnectionsRef = useRef<any[] | undefined>(undefined);

  const showConnected = useCallback((service: string) => {
    setConnectionFailure(null);
    setConnectedService(service);
    setShowDialog(true);

    const name = serviceName(service);
    (window as any).electronAPI?.showNotification({
      title: 'KeepAI',
      body: `${name} connected`,
    });
  }, []);

  const showFailed = useCallback((service: string, error: string) => {
    setConnectedService(null);
    setConnectionFailure({ service, error });
    setShowDialog(true);
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

  // 3. Event-based: SSE `connection_updated` with action=failed
  useEffect(() => {
    const handler = (e: Event) => {
      const { service, error } = (e as CustomEvent).detail ?? {};
      if (service) {
        showFailed(service, error || 'Connection failed');
      }
    };
    window.addEventListener('keepai:app-connect-failed', handler);
    return () => window.removeEventListener('keepai:app-connect-failed', handler);
  }, [showFailed]);

  const openDialog = useCallback(() => {
    setConnectedService(null);
    setConnectionFailure(null);
    setShowDialog(true);
  }, []);

  const closeDialog = useCallback(() => {
    setShowDialog(false);
    setConnectedService(null);
    setConnectionFailure(null);
  }, []);

  return {
    showDialog,
    connectedService,
    connectionFailure,
    openDialog,
    closeDialog,
  };
}
