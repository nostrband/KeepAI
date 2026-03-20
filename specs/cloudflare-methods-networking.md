# Cloudflare Methods — Networking

Sub-spec of [cloudflare-connector.md](./cloudflare-connector.md). Covers Load Balancers, Spectrum, Magic Transit, Argo, and Addressing.

> **Descriptions**: Copy method `description` fields verbatim from the JSDoc in the referenced `.d.ts` files. Do not paraphrase.

## Load Balancers (6 methods)

**JSDoc source**: `node_modules/cloudflare/resources/load-balancers/load-balancers.d.ts`

Distribute traffic across origins with health checking, geo-steering, and failover.

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `loadBalancers.create` | write | `client.loadBalancers.create({ zone_id, ...params })` |
| `loadBalancers.update` | write | `client.loadBalancers.update({ zone_id, load_balancer_id, ...params })` |
| `loadBalancers.list` | read | `client.loadBalancers.list({ zone_id })` |
| `loadBalancers.delete` | delete | `client.loadBalancers.delete({ zone_id, load_balancer_id })` |
| `loadBalancers.edit` | write | `client.loadBalancers.edit({ zone_id, load_balancer_id, ...params })` |
| `loadBalancers.get` | read | `client.loadBalancers.get({ zone_id, load_balancer_id })` |

### Key Params — loadBalancers.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `zone_id` | string | yes | Zone ID |
| `name` | string | yes | Hostname for the LB (e.g., `www.example.com`) |
| `default_pools` | array | yes | Array of pool IDs for default traffic |
| `fallback_pool` | string | yes | Pool ID for fallback when all pools are unhealthy |
| `description` | string | no | Description |
| `proxied` | boolean | no | Whether traffic is proxied through Cloudflare |
| `steering_policy` | string | no | `off`, `geo`, `random`, `dynamic_latency`, `proximity`, `least_outstanding_requests`, `least_connections` |
| `session_affinity` | string | no | `none`, `cookie`, `ip_cookie`, `header` |
| `session_affinity_ttl` | number | no | Session affinity TTL in seconds |
| `region_pools` | object | no | Map of region → pool IDs for geo steering |
| `country_pools` | object | no | Map of country code → pool IDs |
| `rules` | array | no | Custom rules for traffic routing |

---

## Load Balancer Pools (6 methods)

**JSDoc source**: `node_modules/cloudflare/resources/load-balancers/pools/pools.d.ts`

Pools are groups of origin servers.

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `loadBalancers.pools.create` | write | `client.loadBalancers.pools.create({ account_id, ...params })` |
| `loadBalancers.pools.update` | write | `client.loadBalancers.pools.update({ account_id, pool_id, ...params })` |
| `loadBalancers.pools.list` | read | `client.loadBalancers.pools.list({ account_id })` |
| `loadBalancers.pools.delete` | delete | `client.loadBalancers.pools.delete({ account_id, pool_id })` |
| `loadBalancers.pools.edit` | write | `client.loadBalancers.pools.edit({ account_id, pool_id, ...params })` |
| `loadBalancers.pools.get` | read | `client.loadBalancers.pools.get({ account_id, pool_id })` |

### Key Params — loadBalancers.pools.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `account_id` | string | yes | Account ID |
| `name` | string | yes | Pool name |
| `origins` | array | yes | Array of origin objects: `[{ name, address, weight, enabled, header }]` |
| `monitor` | string | no | Monitor ID for health checking |
| `notification_email` | string | no | Email for health alerts |
| `minimum_origins` | number | no | Min healthy origins before pool marked unhealthy |
| `check_regions` | array | no | Regions to run health checks from |
| `origin_steering` | object | no | `{ policy: 'random'/'hash'/'least_outstanding_requests'/'least_connections' }` |

---

## Load Balancer Monitors (6 methods)

**JSDoc source**: `node_modules/cloudflare/resources/load-balancers/monitors/monitors.d.ts`

Health check monitors for origin pools.

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `loadBalancers.monitors.create` | write | `client.loadBalancers.monitors.create({ account_id, ...params })` |
| `loadBalancers.monitors.update` | write | `client.loadBalancers.monitors.update({ account_id, monitor_id, ...params })` |
| `loadBalancers.monitors.list` | read | `client.loadBalancers.monitors.list({ account_id })` |
| `loadBalancers.monitors.delete` | delete | `client.loadBalancers.monitors.delete({ account_id, monitor_id })` |
| `loadBalancers.monitors.edit` | write | `client.loadBalancers.monitors.edit({ account_id, monitor_id, ...params })` |
| `loadBalancers.monitors.get` | read | `client.loadBalancers.monitors.get({ account_id, monitor_id })` |

### Key Params — loadBalancers.monitors.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `account_id` | string | yes | Account ID |
| `type` | string | no | `http`, `https`, `tcp`, `udp_icmp`, `icmp_ping`, `smtp` (default `http`) |
| `expected_codes` | string | no | Expected HTTP status codes (e.g., `2xx`, `200,302`) |
| `expected_body` | string | no | Expected response body substring |
| `method` | string | no | HTTP method (default `GET`) |
| `path` | string | no | Path to monitor (default `/`) |
| `port` | number | no | Port (default from type) |
| `interval` | number | no | Check interval in seconds (default 60) |
| `retries` | number | no | Retries before marking unhealthy (default 2) |
| `timeout` | number | no | Timeout in seconds (default 5) |
| `follow_redirects` | boolean | no | Follow HTTP redirects |
| `header` | object | no | Custom headers to send |

---

## Load Balancer Regions (2 methods)

**JSDoc source**: `node_modules/cloudflare/resources/load-balancers/regions.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `loadBalancers.regions.list` | read | `client.loadBalancers.regions.list({ account_id })` |
| `loadBalancers.regions.get` | read | `client.loadBalancers.regions.get({ account_id, region_id })` |

---

## Load Balancer Searches (1 method)

**JSDoc source**: `node_modules/cloudflare/resources/load-balancers/searches.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `loadBalancers.searches.list` | read | `client.loadBalancers.searches.list({ account_id })` |

---

## Load Balancer Previews (1 method)

**JSDoc source**: `node_modules/cloudflare/resources/load-balancers/previews.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `loadBalancers.previews.get` | read | `client.loadBalancers.previews.get({ account_id, preview_id })` |

---

## Spectrum Applications (5 methods)

**JSDoc source**: `node_modules/cloudflare/resources/spectrum/apps.d.ts`

Spectrum provides DDoS protection and load balancing for non-HTTP protocols (TCP/UDP).

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `spectrum.apps.create` | write | `client.spectrum.apps.create({ zone_id, ...params })` |
| `spectrum.apps.update` | write | `client.spectrum.apps.update({ zone_id, app_id, ...params })` |
| `spectrum.apps.list` | read | `client.spectrum.apps.list({ zone_id })` |
| `spectrum.apps.delete` | delete | `client.spectrum.apps.delete({ zone_id, app_id })` |
| `spectrum.apps.get` | read | `client.spectrum.apps.get({ zone_id, app_id })` |

### Key Params — spectrum.apps.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `zone_id` | string | yes | Zone ID |
| `protocol` | string | yes | Protocol (e.g., `tcp/22`, `tcp/443`, `udp/53`) |
| `dns` | object | yes | `{ type: 'CNAME', name: 'ssh.example.com' }` |
| `origin_direct` | array | no | Direct origin IPs (e.g., `['tcp://192.0.2.1:22']`) |
| `origin_dns` | object | no | DNS origin: `{ name: 'origin.example.com' }` |
| `origin_port` | number | no | Origin port |
| `ip_firewall` | boolean | no | Enable Cloudflare IP firewall |
| `proxy_protocol` | string | no | `off`, `v1`, `v2`, `simple` |
| `tls` | string | no | TLS mode: `off`, `flexible`, `full`, `strict` |

---

## Magic Transit GRE Tunnels (5 methods)

**JSDoc source**: `node_modules/cloudflare/resources/magic-transit/gre-tunnels.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `magicTransit.greTunnels.create` | write | `client.magicTransit.greTunnels.create({ account_id, ...params })` |
| `magicTransit.greTunnels.update` | write | `client.magicTransit.greTunnels.update({ account_id, tunnel_identifier, ...params })` |
| `magicTransit.greTunnels.list` | read | `client.magicTransit.greTunnels.list({ account_id })` |
| `magicTransit.greTunnels.delete` | delete | `client.magicTransit.greTunnels.delete({ account_id, tunnel_identifier })` |
| `magicTransit.greTunnels.get` | read | `client.magicTransit.greTunnels.get({ account_id, tunnel_identifier })` |

---

## Magic Transit IPsec Tunnels (6 methods)

**JSDoc source**: `node_modules/cloudflare/resources/magic-transit/ipsec-tunnels.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `magicTransit.ipsecTunnels.create` | write | `client.magicTransit.ipsecTunnels.create({ account_id, ...params })` |
| `magicTransit.ipsecTunnels.update` | write | `client.magicTransit.ipsecTunnels.update({ account_id, tunnel_identifier, ...params })` |
| `magicTransit.ipsecTunnels.list` | read | `client.magicTransit.ipsecTunnels.list({ account_id })` |
| `magicTransit.ipsecTunnels.delete` | delete | `client.magicTransit.ipsecTunnels.delete({ account_id, tunnel_identifier })` |
| `magicTransit.ipsecTunnels.get` | read | `client.magicTransit.ipsecTunnels.get({ account_id, tunnel_identifier })` |
| `magicTransit.ipsecTunnels.pskGenerate` | write | `client.magicTransit.ipsecTunnels.pskGenerate({ account_id, tunnel_identifier })` |

---

## Magic Transit Routes (5 methods)

**JSDoc source**: `node_modules/cloudflare/resources/magic-transit/routes.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `magicTransit.routes.create` | write | `client.magicTransit.routes.create({ account_id, ...params })` |
| `magicTransit.routes.update` | write | `client.magicTransit.routes.update({ account_id, route_identifier, ...params })` |
| `magicTransit.routes.list` | read | `client.magicTransit.routes.list({ account_id })` |
| `magicTransit.routes.delete` | delete | `client.magicTransit.routes.delete({ account_id, route_identifier })` |
| `magicTransit.routes.get` | read | `client.magicTransit.routes.get({ account_id, route_identifier })` |

---

## Magic Transit Sites (6 methods)

**JSDoc source**: `node_modules/cloudflare/resources/magic-transit/sites/sites.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `magicTransit.sites.create` | write | `client.magicTransit.sites.create({ account_id, ...params })` |
| `magicTransit.sites.update` | write | `client.magicTransit.sites.update({ account_id, site_id, ...params })` |
| `magicTransit.sites.list` | read | `client.magicTransit.sites.list({ account_id })` |
| `magicTransit.sites.delete` | delete | `client.magicTransit.sites.delete({ account_id, site_id })` |
| `magicTransit.sites.edit` | write | `client.magicTransit.sites.edit({ account_id, site_id, ...params })` |
| `magicTransit.sites.get` | read | `client.magicTransit.sites.get({ account_id, site_id })` |

---

## Magic Transit Connectors (6 methods)

**JSDoc source**: `node_modules/cloudflare/resources/magic-transit/connectors/connectors.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `magicTransit.connectors.create` | write | `client.magicTransit.connectors.create({ account_id, ...params })` |
| `magicTransit.connectors.update` | write | `client.magicTransit.connectors.update({ account_id, connector_id, ...params })` |
| `magicTransit.connectors.list` | read | `client.magicTransit.connectors.list({ account_id })` |
| `magicTransit.connectors.delete` | delete | `client.magicTransit.connectors.delete({ account_id, connector_id })` |
| `magicTransit.connectors.edit` | write | `client.magicTransit.connectors.edit({ account_id, connector_id, ...params })` |
| `magicTransit.connectors.get` | read | `client.magicTransit.connectors.get({ account_id, connector_id })` |

---

## Magic Transit CF Interconnects (4 methods)

**JSDoc source**: `node_modules/cloudflare/resources/magic-transit/cf-interconnects.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `magicTransit.cfInterconnects.update` | write | `client.magicTransit.cfInterconnects.update({ account_id, tunnel_identifier, ...params })` |
| `magicTransit.cfInterconnects.list` | read | `client.magicTransit.cfInterconnects.list({ account_id })` |
| `magicTransit.cfInterconnects.get` | read | `client.magicTransit.cfInterconnects.get({ account_id, tunnel_identifier })` |
| `magicTransit.cfInterconnects.bulkUpdate` | write | `client.magicTransit.cfInterconnects.bulkUpdate({ account_id, body })` |

---

## Argo Smart Routing (2 methods)

**JSDoc source**: `node_modules/cloudflare/resources/argo/smart-routing.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `argo.smartRouting.edit` | write | `client.argo.smartRouting.edit({ zone_id, ...params })` |
| `argo.smartRouting.get` | read | `client.argo.smartRouting.get({ zone_id })` |

---

## Argo Tiered Caching (2 methods)

**JSDoc source**: `node_modules/cloudflare/resources/argo/tiered-caching.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `argo.tieredCaching.edit` | write | `client.argo.tieredCaching.edit({ zone_id, ...params })` |
| `argo.tieredCaching.get` | read | `client.argo.tieredCaching.get({ zone_id })` |

---

## IPs (1 method)

**JSDoc source**: `node_modules/cloudflare/resources/ips.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `ips.list` | read | `client.ips.list()` |

---

## Custom Nameservers (Account-Level) (4 methods)

**JSDoc source**: `node_modules/cloudflare/resources/custom-nameservers.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `customNameservers.create` | write | `client.customNameservers.create({ account_id, ...params })` |
| `customNameservers.list` | read | `client.customNameservers.list({ account_id })` |
| `customNameservers.delete` | delete | `client.customNameservers.delete({ account_id, custom_ns_id })` |
| `customNameservers.get` | read | `client.customNameservers.get({ account_id, custom_ns_id })` |

---

## Summary

| Resource | Methods | Notes |
|----------|---------|-------|
| Load Balancers | 6 | Traffic distribution |
| LB Pools | 6 | Origin groups |
| LB Monitors | 6 | Health checks |
| LB Regions | 2 | Region reference data |
| LB Searches | 1 | Search across LB resources |
| LB Previews | 1 | Preview monitor changes |
| Spectrum | 5 | Non-HTTP DDoS protection |
| Magic Transit GRE | 5 | GRE tunnels |
| Magic Transit IPsec | 6 | IPsec tunnels |
| Magic Transit Routes | 5 | Static routes |
| Magic Transit Sites | 6 | WAN sites |
| Magic Transit Connectors | 6 | WAN connectors |
| Magic Transit Interconnects | 4 | CF interconnects |
| Argo Smart Routing | 2 | Smart traffic routing |
| Argo Tiered Caching | 2 | Tiered caching |
| IPs | 1 | Cloudflare IP ranges |
| Custom Nameservers | 4 | Account-level custom NS |
| **Total** | **~68** | |
