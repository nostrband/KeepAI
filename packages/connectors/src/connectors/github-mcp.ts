/**
 * GitHub MCP connector config.
 */

import type { McpConnectorConfig } from '../mcp-connector.js';

export const githubMcpConfig: McpConnectorConfig = {
  service: 'github',
  name: 'GitHub',
  serverUrl: 'https://api.githubcopilot.com',
  mcpEndpoint: '/mcp/',

  // GitHub tools have proper annotations: readOnlyHint (23 tools), destructiveHint (delete_file).
  // The 16 unannotated tools are all writes, matching the default.

  describeRequest(method, params) {
    const owner = params.owner as string | undefined;
    const repo = params.repo as string | undefined;
    const repoSlug = owner && repo ? `${owner}/${repo}` : '';

    switch (method) {
      case 'get_me':
        return 'Get authenticated user';
      case 'get_issue':
        return `Get issue #${params.issue_number || '?'} in ${repoSlug}`;
      case 'list_issues':
        return `List issues in ${repoSlug}`;
      case 'create_issue':
        return `Create issue in ${repoSlug}: ${params.title || ''}`;
      case 'update_issue':
        return `Update issue #${params.issue_number || '?'} in ${repoSlug}`;
      case 'get_pull_request':
        return `Get PR #${params.pull_number || '?'} in ${repoSlug}`;
      case 'list_pull_requests':
        return `List PRs in ${repoSlug}`;
      case 'create_pull_request':
        return `Create PR in ${repoSlug}: ${params.title || ''}`;
      case 'merge_pull_request':
        return `Merge PR #${params.pull_number || '?'} in ${repoSlug}`;
      case 'get_file_contents':
        return `Read ${params.path || 'file'} in ${repoSlug}`;
      case 'create_or_update_file':
        return `Write ${params.path || 'file'} in ${repoSlug}`;
      case 'push_files':
        return `Push files to ${repoSlug}`;
      case 'search_code':
        return `Search code: "${params.q || ''}"`;
      case 'search_issues':
        return `Search issues: "${params.q || ''}"`;
      case 'search_repositories':
        return `Search repos: "${params.q || ''}"`;
      default:
        return `GitHub ${method}`;
    }
  },

  async extractAccountId(session) {
    try {
      const result = await session.callTool('get_me', {});
      const text = result.content
        .filter((c) => c.type === 'text' && c.text)
        .map((c) => c.text!)
        .join('\n');
      const parsed = JSON.parse(text);

      if (parsed?.login) {
        return {
          accountId: String(parsed.login),
          displayName: parsed.name ? `${parsed.name} (${parsed.login})` : String(parsed.login),
        };
      }

      return { accountId: 'default', displayName: 'GitHub' };
    } catch {
      return { accountId: 'default', displayName: 'GitHub' };
    }
  },
};
