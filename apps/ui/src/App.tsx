import { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Header } from './components/header';
import { useSSE } from './hooks/use-sse';
import { useTelemetry } from './hooks/use-telemetry';
import { DashboardPage } from './pages/dashboard';
import { ConnectionsPage } from './pages/connections';
import { AgentsPage } from './pages/agents';
import { AgentDetailPage } from './pages/agent-detail';
import { PermissionsPage } from './pages/permissions';
import { ApprovalsPage } from './pages/approvals';
import { LogsPage } from './pages/logs';
import { AppDetailPage } from './pages/app-detail';
import { SettingsPage } from './pages/settings';

export default function App() {
  useSSE();
  useTelemetry();

  const navigate = useNavigate();
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api?.onNavigateTo) return;
    return api.onNavigateTo((path: string) => navigate(path));
  }, [navigate]);

  return (
    <>
      <Header />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/apps" element={<ConnectionsPage />} />
            <Route path="/apps/:service/:accountId" element={<AppDetailPage />} />
            <Route path="/agents" element={<AgentsPage />} />
            <Route path="/agents/:agentId" element={<AgentDetailPage />} />
            <Route path="/agents/:agentId/policies" element={<PermissionsPage />} />
            <Route path="/approvals" element={<ApprovalsPage />} />
            <Route path="/logs" element={<LogsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </div>
      </main>
    </>
  );
}
