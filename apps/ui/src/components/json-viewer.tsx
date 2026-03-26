import { ResolvableId } from './resolvable-id';
import { resolveKeyType } from '../lib/parse-description';

interface JsonViewerProps {
  data: unknown;
  service: string;
  accountId: string;
  method: string;
  resolvableTypes: Record<string, { label: string; params?: Record<string, string> }>;
  truncated?: number | null;
}

export function JsonViewer({ data, service, accountId, method, resolvableTypes, truncated }: JsonViewerProps) {
  return (
    <pre className="p-2 rounded bg-muted/50 text-xs font-mono whitespace-pre-wrap break-all max-h-64 overflow-y-auto scrollbar-thin">
      <JsonNode value={data} indent={0} service={service} accountId={accountId} method={method} resolvableTypes={resolvableTypes} />
      {truncated != null && truncated > 0 && (
        <span className="text-muted-foreground italic">
          {'\n'}...({truncated.toLocaleString()} chars more)
        </span>
      )}
    </pre>
  );
}

interface JsonNodeProps {
  value: unknown;
  indent: number;
  objectKey?: string;
  service: string;
  accountId: string;
  method: string;
  resolvableTypes: Record<string, { label: string; params?: Record<string, string> }>;
}

function JsonNode({ value, indent, objectKey, service, accountId, method, resolvableTypes }: JsonNodeProps) {
  const pad = '  '.repeat(indent);

  // Check if this string value is resolvable
  if (typeof value === 'string' && objectKey) {
    const resolvedType = resolveKeyType(resolvableTypes, method, objectKey);
    if (resolvedType) {
      const typeInfo = resolvableTypes[resolvedType];
      return (
        <span>
          <span className="text-green-700 dark:text-green-400">"</span>
          <ResolvableId
            type={resolvedType}
            id={value}
            label={typeInfo.label}
            service={service}
            accountId={accountId}
            display="raw"
          />
          <span className="text-green-700 dark:text-green-400">"</span>
        </span>
      );
    }
  }

  if (value === null) return <span className="text-orange-600 dark:text-orange-400">null</span>;
  if (typeof value === 'boolean') return <span className="text-orange-600 dark:text-orange-400">{String(value)}</span>;
  if (typeof value === 'number') return <span className="text-blue-700 dark:text-blue-300">{String(value)}</span>;
  if (typeof value === 'string') return <span className="text-green-700 dark:text-green-400">"{value}"</span>;

  if (Array.isArray(value)) {
    if (value.length === 0) return <span>{'[]'}</span>;
    return (
      <span>
        {'[\n'}
        {value.map((item, i) => (
          <span key={i}>
            {pad}{'  '}
            <JsonNode value={item} indent={indent + 1} service={service} accountId={accountId} method={method} resolvableTypes={resolvableTypes} />
            {i < value.length - 1 ? ',' : ''}
            {'\n'}
          </span>
        ))}
        {pad}{']'}
      </span>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return <span>{'{}'}</span>;
    return (
      <span>
        {'{\n'}
        {entries.map(([key, val], i) => (
          <span key={key}>
            {pad}{'  '}<span className="text-purple-700 dark:text-purple-400">"{key}"</span>: <JsonNode value={val} indent={indent + 1} objectKey={key} service={service} accountId={accountId} method={method} resolvableTypes={resolvableTypes} />
            {i < entries.length - 1 ? ',' : ''}
            {'\n'}
          </span>
        ))}
        {pad}{'}'}
      </span>
    );
  }

  return <span>{String(value)}</span>;
}
