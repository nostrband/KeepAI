/**
 * Server-side help text renderer.
 *
 * Three pure functions that take ServiceHelp data and produce
 * pre-formatted plain text ready to print in a terminal.
 */

import type { ServiceHelp, ConnectorMethod, ParamSchema } from '@keepai/proto';

/**
 * Level 1: list all available services with accounts.
 */
export function renderServiceList(services: ServiceHelp[]): string {
  const lines: string[] = ['Available services:', ''];

  const maxName = services.length > 0
    ? Math.max(...services.map(s => s.service.length))
    : 0;

  for (const svc of services) {
    const padded = svc.service.padEnd(maxName + 4);
    lines.push(`  ${padded}${svc.summary || ''}`);
    const indent = ' '.repeat(maxName + 6);
    const accounts = formatAccounts(svc);
    lines.push(`${indent}Accounts: ${accounts}`);
    lines.push('');
  }

  lines.push("Run 'npx keepai help <service>' to see methods.");
  if (services.length > 0) {
    lines.push(`Example: npx keepai help ${services[0].service}`);
  }

  return lines.join('\n');
}

/**
 * Level 2: all methods for one service, grouped by resource.
 */
export function renderServiceMethods(service: ServiceHelp): string {
  const lines: string[] = [];

  // Header
  const accounts = formatAccounts(service);
  lines.push(`${service.name} — ${accounts}`);
  lines.push('');

  // Group methods by prefix (before first dot)
  const groups = groupMethods(service.methods);

  for (const [group, methods] of groups) {
    lines.push(`  ${group}`);

    // Calculate column widths for alignment within this group
    const maxShort = Math.max(...methods.map(m => shortName(m.name).length));

    for (const m of methods) {
      const short = shortName(m.name);
      const padded = short.padEnd(maxShort + 4);
      const preview = paramPreview(m.params);
      lines.push(`    ${padded}${m.description}${preview ? `  ${preview}` : ''}`);
    }
    lines.push('');
  }

  lines.push(`Run 'npx keepai help ${service.service} <method>' for parameters and examples.`);
  // Pick a write method for the example hint, or fall back to first method
  const exampleMethod = service.methods.find(m => m.operationType === 'write') || service.methods[0];
  if (exampleMethod) {
    lines.push(`Example: npx keepai help ${service.service} ${exampleMethod.name}`);
  }

  return lines.join('\n');
}

/**
 * Level 3: full detail for a single method.
 */
export function renderMethodDetail(service: ServiceHelp, methodName: string): string {
  const method = service.methods.find(m => m.name === methodName);
  if (!method) {
    return `Unknown method '${methodName}' on service '${service.service}'`;
  }

  const lines: string[] = [];

  // Header
  lines.push(`${service.service} ${method.name} — ${method.description}`);
  lines.push('');

  // Parameters
  if (method.params.length > 0) {
    lines.push('Parameters:');

    const required = method.params.filter(p => p.required);
    const optional = method.params.filter(p => !p.required);
    const ordered = [...required, ...optional];

    // Calculate column widths
    const maxName = Math.max(...ordered.map(p => p.name.length));
    const maxType = Math.max(...ordered.map(p => p.type.length));

    for (const p of ordered) {
      const name = p.name.padEnd(maxName + 2);
      const type = p.type.padEnd(maxType + 2);
      const req = p.required ? 'required' : '        ';
      let desc = p.description;
      if (p.default !== undefined) desc += ` (default: ${JSON.stringify(p.default)})`;
      if (p.enum) desc += `. One of: ${p.enum.join(', ')}`;
      lines.push(`  ${name}${type}${req}   ${desc}`);
    }
    lines.push('');

    // Syntax blocks (e.g. Gmail search query syntax)
    for (const p of ordered) {
      if (p.syntax && p.syntax.length > 0) {
        lines.push(`Query syntax for '${p.name}':`);
        for (const s of p.syntax) {
          lines.push(`  ${s}`);
        }
        lines.push('');
      }
    }
  } else {
    lines.push('Parameters: none');
    lines.push('');
  }

  // Examples
  if (method.example) {
    lines.push('Examples:');
    lines.push(`  ${buildFlagExample(service.service, method.name, method.example.params)}`);
    lines.push(`  ${buildJsonExample(service.service, method.name, method.example.params)}`);
    lines.push('');
  }

  // Response example
  if (method.responseExample !== undefined) {
    lines.push('Response:');
    const json = JSON.stringify(method.responseExample, null, 2);
    for (const line of json.split('\n')) {
      lines.push(`  ${line}`);
    }
    lines.push('');
  }

  // Notes
  if (method.notes && method.notes.length > 0) {
    for (const note of method.notes) {
      lines.push(note);
    }
    lines.push('');
  }

  // See also
  if (method.seeAlso && method.seeAlso.length > 0) {
    const refs = method.seeAlso.map(m => `${service.service} ${m}`).join(', ');
    lines.push(`See also: ${refs}`);
  }

  // Trim trailing empty lines
  while (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  return lines.join('\n');
}

// --- Helpers ---

function formatAccounts(svc: ServiceHelp): string {
  if (!svc.accounts || svc.accounts.length === 0) return '(none connected)';
  return svc.accounts.map(a => a.label || a.id).join(', ');
}

function shortName(methodName: string): string {
  const dot = methodName.indexOf('.');
  return dot >= 0 ? methodName.slice(dot + 1) : methodName;
}

function groupPrefix(methodName: string): string {
  const dot = methodName.indexOf('.');
  return dot >= 0 ? methodName.slice(0, dot) : methodName;
}

function groupMethods(methods: ConnectorMethod[]): [string, ConnectorMethod[]][] {
  const map = new Map<string, ConnectorMethod[]>();
  for (const m of methods) {
    const prefix = groupPrefix(m.name);
    if (!map.has(prefix)) map.set(prefix, []);
    map.get(prefix)!.push(m);
  }
  return Array.from(map.entries());
}

function paramPreview(params: ParamSchema[]): string {
  if (params.length === 0) return '()';
  // Show required first, then optional — cap at 5 total to avoid clutter
  const required = params.filter(p => p.required).map(p => p.name);
  const optional = params.filter(p => !p.required).map(p => p.name);
  const all = [...required, ...optional];
  if (all.length <= 5) {
    return `(${all.join(', ')})`;
  }
  return `(${all.slice(0, 5).join(', ')}, ...)`;
}

function buildFlagExample(service: string, method: string, params: Record<string, unknown>): string {
  const flags = Object.entries(params)
    .map(([key, value]) => {
      if (typeof value === 'string') {
        const quoted = value.includes(' ') ? `"${value}"` : value;
        return `--${key}=${quoted}`;
      }
      return `--${key}=${JSON.stringify(value)}`;
    })
    .join(' ');
  return `npx keepai run ${service} ${method} ${flags}`;
}

function buildJsonExample(service: string, method: string, params: Record<string, unknown>): string {
  const json = JSON.stringify(params);
  return `npx keepai run ${service} ${method} --params '${json}'`;
}
