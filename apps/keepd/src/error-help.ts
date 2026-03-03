/**
 * Error-as-help renderers.
 *
 * Every validation error returns pre-formatted text that guides the user
 * to fix the problem: what's wrong, what's needed, what to run next.
 */

import type { ConnectorMethod, ParamSchema } from '@keepai/proto';

/**
 * Missing required parameters.
 *
 * Output:
 *   Error: missing required parameters: to, subject, body
 *
 *   Usage: npx keepai run gmail drafts.create --to=<string> --subject=<string> --body=<string>
 *
 *   Run 'npx keepai help gmail drafts.create' for full details.
 */
export function renderMissingParams(
  service: string,
  method: string,
  missing: string[],
  allParams: ParamSchema[]
): string {
  const lines: string[] = [];
  lines.push(`Error: missing required parameters: ${missing.join(', ')}`);
  lines.push('');

  // Build usage line with all required params
  const required = allParams.filter(p => p.required);
  const flags = required.map(p => `--${p.name}=<${p.type}>`).join(' ');
  lines.push(`Usage: npx keepai run ${service} ${method} ${flags}`);
  lines.push('');
  lines.push(`Run 'npx keepai help ${service} ${method}' for full details.`);

  return lines.join('\n');
}

/**
 * Unknown service with fuzzy suggestions.
 *
 * Output:
 *   Error: unknown service 'gmal'
 *
 *   Did you mean?
 *     gmail    Email — read, send, draft, organize
 *
 *   Run 'npx keepai help' to see all services.
 */
export function renderUnknownService(
  input: string,
  available: Array<{ service: string; summary?: string }>
): string {
  const lines: string[] = [];
  lines.push(`Error: unknown service '${input}'`);
  lines.push('');

  const names = available.map(s => s.service);
  const matches = fuzzyMatch(input, names);

  if (matches.length > 0) {
    lines.push('Did you mean?');
    for (const match of matches) {
      const svc = available.find(s => s.service === match);
      const summary = svc?.summary ? `    ${svc.summary}` : '';
      lines.push(`  ${match}${summary}`);
    }
  } else {
    lines.push(`Available services: ${names.join(', ')}`);
  }

  lines.push('');
  lines.push("Run 'npx keepai help' to see all services.");

  return lines.join('\n');
}

/**
 * Unknown method with fuzzy suggestions.
 *
 * Output:
 *   Error: unknown method 'draft.create' on gmail
 *
 *   Did you mean?
 *     drafts.create    Create a draft email
 *
 *   Run 'npx keepai help gmail' to see all methods.
 */
export function renderUnknownMethod(
  service: string,
  input: string,
  methods: ConnectorMethod[]
): string {
  const lines: string[] = [];
  lines.push(`Error: unknown method '${input}' on ${service}`);
  lines.push('');

  const names = methods.map(m => m.name);
  const matches = fuzzyMatch(input, names);

  if (matches.length > 0) {
    lines.push('Did you mean?');
    for (const match of matches) {
      const m = methods.find(md => md.name === match);
      lines.push(`  ${match}    ${m?.description ?? ''}`);
    }
  }

  lines.push('');
  lines.push(`Run 'npx keepai help ${service}' to see all methods.`);

  return lines.join('\n');
}

/**
 * Invalid parameter value.
 *
 * Output:
 *   Error: 'maxResults' must be a number, got 'abc'
 *
 *   Run 'npx keepai help gmail messages.list' for parameter details.
 */
export function renderInvalidParam(
  service: string,
  method: string,
  paramName: string,
  expectedType: string,
  actualValue: unknown
): string {
  const lines: string[] = [];
  const display = typeof actualValue === 'string' ? `'${actualValue}'` : String(actualValue);
  lines.push(`Error: '${paramName}' must be a ${expectedType}, got ${display}`);
  lines.push('');
  lines.push(`Run 'npx keepai help ${service} ${method}' for parameter details.`);

  return lines.join('\n');
}

/**
 * Multiple accounts available, need --account.
 *
 * Output:
 *   Error: multiple Gmail accounts available, specify one with --account
 *
 *   Accounts:
 *     user@gmail.com
 *     work@gmail.com
 *
 *   Example: npx keepai run gmail messages.list --account=user@gmail.com
 */
export function renderMultipleAccounts(
  service: string,
  serviceName: string,
  method: string,
  accounts: Array<{ id: string; label?: string }>
): string {
  const lines: string[] = [];
  lines.push(`Error: multiple ${serviceName} accounts available, specify one with --account`);
  lines.push('');
  lines.push('Accounts:');
  for (const a of accounts) {
    lines.push(`  ${a.label || a.id}`);
  }
  lines.push('');
  lines.push(`Example: npx keepai run ${service} ${method} --account=${accounts[0]?.id ?? 'ACCOUNT_ID'}`);

  return lines.join('\n');
}

// --- Fuzzy matching ---

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

export function fuzzyMatch(input: string, candidates: string[], maxResults = 3): string[] {
  const scored = candidates
    .map(c => ({ name: c, dist: levenshtein(input.toLowerCase(), c.toLowerCase()) }))
    .filter(c => c.dist <= Math.max(3, Math.floor(c.name.length / 2)))
    .sort((a, b) => a.dist - b.dist);
  return scored.slice(0, maxResults).map(c => c.name);
}
