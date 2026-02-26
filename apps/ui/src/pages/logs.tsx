import { useState } from 'react';
import { ScrollText, ChevronDown, ChevronUp } from 'lucide-react';
import { useLogs } from '../hooks/use-logs';
import { ServiceIcon, serviceName } from '../components/service-icon';
import { EmptyState } from '../components/empty-state';

export function LogsPage() {
  const [filters, setFilters] = useState<Record<string, string>>({
    limit: '50',
    offset: '0',
  });
  const { data, isLoading } = useLogs(filters);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const entries = data?.entries ?? [];
  const total = data?.total ?? 0;
  const offset = Number(filters.offset || '0');
  const limit = Number(filters.limit || '50');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Logs</h1>
        <span className="text-sm text-muted-foreground">{total} total entries</span>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Filter by service..."
          onChange={(e) => setFilters((prev) => ({ ...prev, service: e.target.value || '', offset: '0' }))}
          className="px-3 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring w-40"
        />
        <input
          type="text"
          placeholder="Filter by agent..."
          onChange={(e) => setFilters((prev) => ({ ...prev, agent: e.target.value || '', offset: '0' }))}
          className="px-3 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring w-40"
        />
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading logs...</div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<ScrollText className="w-12 h-12" />}
          title="No log entries"
          description="Request logs will appear here once agents start making requests."
        />
      ) : (
        <>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Time</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Service</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Method</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Agent</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Duration</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((entry: any) => (
                  <>
                    <tr
                      key={entry.id}
                      className="hover:bg-accent/30 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                    >
                      <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <ServiceIcon service={entry.service} className="w-3.5 h-3.5" />
                          <span>{serviceName(entry.service)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{entry.method}</td>
                      <td className="px-3 py-2 text-muted-foreground">{entry.agentName || '—'}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`text-xs font-medium ${
                            entry.responseStatus === 'success'
                              ? 'text-green-600'
                              : entry.responseStatus === 'denied'
                                ? 'text-red-600'
                                : 'text-yellow-600'
                          }`}
                        >
                          {entry.responseStatus || entry.policyAction || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {entry.durationMs ? `${entry.durationMs}ms` : '—'}
                      </td>
                      <td className="px-3 py-2">
                        {expandedId === entry.id ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </td>
                    </tr>
                    {expandedId === entry.id && (
                      <tr key={`${entry.id}-detail`}>
                        <td colSpan={7} className="px-3 py-3 bg-gray-50">
                          <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                            {JSON.stringify(entry, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between mt-4">
              <button
                disabled={offset === 0}
                onClick={() => setFilters((prev) => ({ ...prev, offset: String(Math.max(0, offset - limit)) }))}
                className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-accent disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">
                {offset + 1}–{Math.min(offset + limit, total)} of {total}
              </span>
              <button
                disabled={offset + limit >= total}
                onClick={() => setFilters((prev) => ({ ...prev, offset: String(offset + limit) }))}
                className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-accent disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
