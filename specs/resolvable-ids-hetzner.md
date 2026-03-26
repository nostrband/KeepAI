# Resolvable IDs — Hetzner Connector

Depends on: `resolvable-ids-infra.md`

## Resolvable Types

```ts
resolvableTypes: {
  server_id: {
    label: 'Server',
    params: {
      'servers.get': 'id',
      'servers.update': 'id',
      'servers.delete': 'id',
      'servers.actions': 'id',
    },
  },
  network_id: {
    label: 'Network',
    params: {
      'networks.get': 'id',
      'networks.update': 'id',
      'networks.delete': 'id',
      'networks.actions': 'id',
    },
  },
  firewall_id: {
    label: 'Firewall',
    params: {
      'firewalls.get': 'id',
      'firewalls.update': 'id',
      'firewalls.delete': 'id',
      'firewalls.actions': 'id',
    },
  },
  load_balancer_id: {
    label: 'Load Balancer',
    params: {
      'load_balancers.get': 'id',
      'load_balancers.update': 'id',
      'load_balancers.delete': 'id',
      'load_balancers.actions': 'id',
    },
  },
  volume_id: {
    label: 'Volume',
    params: {
      'volumes.get': 'id',
      'volumes.update': 'id',
      'volumes.delete': 'id',
      'volumes.actions': 'id',
    },
  },
  floating_ip_id: {
    label: 'Floating IP',
    params: {
      'floating_ips.get': 'id',
      'floating_ips.update': 'id',
      'floating_ips.delete': 'id',
      'floating_ips.actions': 'id',
    },
  },
  ssh_key_id: {
    label: 'SSH Key',
    params: {
      'ssh_keys.get': 'id',
      'ssh_keys.update': 'id',
      'ssh_keys.delete': 'id',
    },
  },
  image_id: {
    label: 'Image',
    params: {
      'images.get': 'id',
      'images.update': 'id',
      'images.delete': 'id',
    },
  },
}
```

### Types not resolved

- `placement_group_id`, `primary_ip_id`, `certificate_id` — lower frequency
- `iso_id`, `datacenter_id`, `location_id`, `server_type_id` — reference data, names usually in params

Can be added later based on usage.

---

## resolveId Implementation

File: `packages/connectors/src/connectors/hetzner.ts`

Hetzner uses direct HTTP with `https://api.hetzner.cloud/v1`.

```ts
async resolveId(
  type: string,
  id: string,
  credentials: OAuthCredentials
): Promise<ResolveResult | null> {
  const base = 'https://api.hetzner.cloud/v1';
  const headers = { Authorization: `Bearer ${credentials.accessToken}` };

  // Map type to API path and response key
  const typeConfig: Record<string, { path: string; key: string }> = {
    server_id:        { path: 'servers',        key: 'server' },
    network_id:       { path: 'networks',       key: 'network' },
    firewall_id:      { path: 'firewalls',      key: 'firewall' },
    load_balancer_id: { path: 'load_balancers', key: 'load_balancer' },
    volume_id:        { path: 'volumes',        key: 'volume' },
    floating_ip_id:   { path: 'floating_ips',   key: 'floating_ip' },
    ssh_key_id:       { path: 'ssh_keys',       key: 'ssh_key' },
    image_id:         { path: 'images',         key: 'image' },
  };

  const config = typeConfig[type];
  if (!config) return null;

  try {
    const res = await fetch(`${base}/${config.path}/${id}`, { headers });
    if (!res.ok) return null;
    const data = await res.json();
    const resource = data[config.key];

    // Most Hetzner resources have a `name` field
    const title = resource?.name
      || (type === 'floating_ip_id' ? resource?.ip : null)
      || (type === 'image_id' ? resource?.description : null)
      || id;

    return {
      title: String(title),
      url: hetznerConsoleUrl(type, id),
    };
  } catch {
    return null;
  }
}

function hetznerConsoleUrl(type: string, id: string): string | undefined {
  // Hetzner Cloud Console URLs
  const pathMap: Record<string, string> = {
    server_id: 'servers',
    network_id: 'networks',
    firewall_id: 'firewalls',
    load_balancer_id: 'load-balancers',
    volume_id: 'volumes',
    floating_ip_id: 'floating-ips',
  };
  const path = pathMap[type];
  // Console URL requires project context which we don't have
  // Return undefined — Hetzner console URLs are project-scoped
  return undefined;
}
```

### Note on Hetzner Console URLs

Hetzner Cloud Console URLs are scoped under a project ID (`https://console.hetzner.cloud/projects/{projectId}/servers/{id}`). We don't have the project ID in credentials metadata. For V1, omit the URL — the resolved title (server name) is the main value. Project ID can be added to credentials metadata later if desired.

---

## describeHetznerRequest — Updated Format

Hetzner uses numeric `id` parameter. The resolvable type depends on the resource group.

### ID type mapping

| Method prefix | `params.id` resolves as |
|---|---|
| `servers.*` | `server_id` |
| `networks.*` | `network_id` |
| `firewalls.*` | `firewall_id` |
| `load_balancers.*` | `load_balancer_id` |
| `volumes.*` | `volume_id` |
| `floating_ips.*` | `floating_ip_id` |
| `ssh_keys.*` | `ssh_key_id` |
| `images.*` | `image_id` |

### Key changes

Use the same generic `ref()` helper as Stripe (see Stripe spec) that consults `resolvableTypes`:

```ts
// Before
case 'servers.get': return `Get server ${params.id || '(unknown)'}`;
// After
case 'servers.get': return `Get ${ref(method, 'id', params.id)}`;

// Before
case 'servers.delete': return `Delete server ${params.id || '(unknown)'}`;
// After
case 'servers.delete': return `Delete ${ref(method, 'id', params.id)}`;
```

Apply `ref(method, 'id', params.id)` across all methods that show an `id` parameter.

### Bare `id` Handling

Hetzner uses bare `id` for most methods. The `params` field on each resolvable type declares the mapping explicitly — same pattern as Gmail and Stripe. No heuristics needed.
