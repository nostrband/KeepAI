# Resolvable IDs — Cloudflare Connector

Depends on: `resolvable-ids-infra.md`

## Resolvable Types

```ts
resolvableTypes: {
  zone_id:        { label: 'Zone' },
  account_id:     { label: 'Account' },
  namespace_id:   { label: 'KV Namespace' },
  database_id:    { label: 'D1 Database' },
}
```

### Types not resolved

- `dns_record_id` — only meaningful with zone context, and the record content/type is usually in params
- `script_name` — already human-readable (it's a name, not an ID)
- `bucket_name` — already human-readable
- `project_name` — already human-readable
- `rule_id`, `ruleset_id` — low frequency, hard to present meaningfully
- `member_id`, `token_id` — rarely seen in approval requests
- `queue_id`, `queue_name` — name is already readable

---

## resolveId Implementation

File: `packages/connectors/src/connectors/cloudflare/index.ts`

Cloudflare uses the official SDK.

```ts
async resolveId(
  type: string,
  id: string,
  credentials: OAuthCredentials
): Promise<ResolveResult | null> {
  const client = new Cloudflare({
    apiToken: credentials.accessToken || (credentials as any).apiToken,
  });

  try {
    switch (type) {
      case 'zone_id': {
        const zone = await client.zones.get({ zone_id: id });
        return {
          title: zone.name || id,  // zone.name is the domain, e.g. "example.com"
          url: `https://dash.cloudflare.com/${zone.account?.id || ''}/domains/${zone.name}`,
        };
      }
      case 'account_id': {
        const account = await client.accounts.get({ account_id: id });
        return {
          title: account.name || id,
          url: `https://dash.cloudflare.com/${id}`,
        };
      }
      case 'namespace_id': {
        // KV namespaces need account_id context — may need to iterate accounts
        // or get it from credentials metadata
        // For now, just show the ID as-is since namespace titles require account context
        return null;
      }
      case 'database_id': {
        // D1 databases similarly need account context
        return null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}
```

### Account context problem

Several Cloudflare resources (KV namespaces, D1 databases, Workers) are scoped under an account ID. To resolve them, we need the account ID — which may or may not be in the same request params. Options:

1. Pass the full params to `resolveId` — breaks the generic interface
2. Store the account ID in credentials metadata — already done (`meta.accountId` exists in Cloudflare connector)
3. Accept that some types can't be resolved without context — return null

For V1, go with option 2 for types where account ID is in credentials metadata, and null for others. The most impactful resolvable type (`zone_id` → domain name) works without extra context.

---

## describeCloudflareRequest — Updated Format

Key changes (methods that reference resolvable IDs):

```ts
// Before
case 'dns.records.create':
  return `Create ${params.type || ''} DNS record ... in zone ${params.zone_id || '(unknown)'}`;
// After
case 'dns.records.create':
  return `Create ${params.type || ''} DNS record${params.name ? ` "${params.name}"` : ''} in ${params.zone_id ? `[zone_id:${params.zone_id}]` : 'zone (unknown)'}`;

// Before
case 'dns.records.list': return `List DNS records in zone ${params.zone_id || '(unknown)'}`;
// After
case 'dns.records.list':
  return params.zone_id
    ? `List DNS records in [zone_id:${params.zone_id}]`
    : 'List DNS records in zone (unknown)';
```

Apply the same pattern to all methods that reference `zone_id` or `account_id`. Methods referencing `script_name`, `bucket_name`, `project_name` stay as-is since those are already human-readable strings.
