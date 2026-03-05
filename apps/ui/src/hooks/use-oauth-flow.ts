import { useState, useEffect, useRef, useCallback } from 'react';
import { useConnections } from './use-connections';
import { serviceName } from '../components/service-icon';

/**
 * Shared hook for OAuth connection flow state.
 * Tracks pending OAuth service, watches connections list for completion,
 * fires system notification, and manages dialog re-show.
 */
export function useOAuthFlow() {
  const [showDialog, setShowDialog] = useState(false);
  const [pendingService, setPendingService] = useState<string | null>(null);
  const [connectedService, setConnectedService] = useState<string | null>(null);
  const { data: connections } = useConnections();
  const prevConnectionsRef = useRef<any[] | undefined>(undefined);

  // Watch connections list for new entries matching pendingService
  useEffect(() => {
    const prev = prevConnectionsRef.current;
    prevConnectionsRef.current = connections;

    if (!pendingService || !connections || !prev) return;

    const newConn = connections.find(
      (c: any) =>
        c.service === pendingService &&
        !prev.some((p: any) => p.service === c.service && p.accountId === c.accountId)
    );

    if (newConn) {
      setConnectedService(pendingService);
      setShowDialog(true);

      // Fire system notification
      const name = serviceName(pendingService);
      (window as any).electronAPI?.showNotification({
        title: 'KeepAI',
        body: `${name} connected`,
      });
    }
  }, [connections, pendingService]);

  const openDialog = useCallback(() => {
    setConnectedService(null);
    setShowDialog(true);
  }, []);

  const closeDialog = useCallback(() => {
    setShowDialog(false);
    // Clear pending if we're closing from connected state
    if (connectedService) {
      setPendingService(null);
      setConnectedService(null);
    }
  }, [connectedService]);

  return {
    showDialog,
    pendingService,
    connectedService,
    openDialog,
    closeDialog,
    setPendingService,
  };
}
