# Cloudflare Methods — DNS & Zones

Sub-spec of [cloudflare-connector.md](./cloudflare-connector.md). Covers zones, DNS records, DNSSEC, zone settings, and DNS Firewall.

> **Descriptions**: Copy method `description` fields verbatim from the JSDoc in the referenced `.d.ts` files. Do not paraphrase.

## Zones (5 methods)

**JSDoc source**: `node_modules/cloudflare/resources/zones/zones.d.ts`

Zones are the primary organizational unit in Cloudflare. Each zone corresponds to a domain.

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `zones.create` | write | `client.zones.create(params)` |
| `zones.list` | read | `client.zones.list(params)` |
| `zones.get` | read | `client.zones.get({ zone_id })` |
| `zones.edit` | write | `client.zones.edit({ zone_id, ...params })` |
| `zones.delete` | delete | `client.zones.delete({ zone_id })` |

### Key Params — zones.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `account` | object | yes | `{ id: 'account_id' }` — the account to add the zone to |
| `name` | string | yes | Domain name (e.g., `example.com`) |
| `type` | string | no | `full` (default, Cloudflare nameservers) or `partial` (CNAME setup) |

### Key Params — zones.list

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `account` | object | no | `{ id: 'account_id' }` — filter by account |
| `name` | string | no | Filter by domain name (exact match) |
| `status` | string | no | `active`, `pending`, `initializing`, `moved`, `deleted`, `deactivated`, `read only` |
| `match` | string | no | `any` or `all` (default) for combining filters |
| `order` | string | no | `name`, `status`, `account.id`, `account.name` |
| `direction` | string | no | `asc` or `desc` |
| `page` | number | no | Page number (default 1) |
| `per_page` | number | no | Results per page (5-50, default 20) |

**seeAlso**: `dns.records.list`, `zones.settings.get`

---

## Zone Activation Check (1 method)

**JSDoc source**: `node_modules/cloudflare/resources/zones/activation-check.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `zones.activationCheck.trigger` | write | `client.zones.activationCheck.trigger({ zone_id })` |

---

## Zone Settings (2 methods)

**JSDoc source**: `node_modules/cloudflare/resources/zones/settings.d.ts`

Zone settings control SSL, caching, security, performance, and other zone-level configurations.

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `zones.settings.get` | read | `client.zones.settings.get({ zone_id })` |
| `zones.settings.edit` | write | `client.zones.settings.edit({ zone_id, ...params })` |

### Key Settings

Settings controlled via `zones.settings.edit` include: `always_online`, `always_use_https`, `automatic_https_rewrites`, `browser_cache_ttl`, `browser_check`, `cache_level`, `challenge_ttl`, `development_mode`, `email_obfuscation`, `hotlink_protection`, `http2`, `http3`, `ipv6`, `min_tls_version`, `minify`, `mirage`, `opportunistic_encryption`, `opportunistic_onion`, `origin_error_page_pass_thru`, `polish`, `prefetch_preload`, `privacy_pass`, `pseudo_ipv4`, `response_buffering`, `rocket_loader`, `security_header`, `security_level`, `server_side_exclude`, `ssl`, `tls_1_3`, `tls_client_auth`, `true_client_ip_header`, `waf`, `webp`, `websockets`, `0rtt`.

---

## Zone Custom Nameservers (2 methods)

**JSDoc source**: `node_modules/cloudflare/resources/zones/custom-nameservers.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `zones.customNameservers.get` | read | `client.zones.customNameservers.get({ zone_id })` |
| `zones.customNameservers.update` | write | `client.zones.customNameservers.update({ zone_id, ...params })` |

---

## Zone Holds (4 methods)

**JSDoc source**: `node_modules/cloudflare/resources/zones/holds.d.ts`

Prevent a zone from being deleted or transferred.

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `zones.holds.create` | write | `client.zones.holds.create({ zone_id })` |
| `zones.holds.delete` | delete | `client.zones.holds.delete({ zone_id })` |
| `zones.holds.edit` | write | `client.zones.holds.edit({ zone_id, ...params })` |
| `zones.holds.get` | read | `client.zones.holds.get({ zone_id })` |

---

## Zone Subscriptions (3 methods)

**JSDoc source**: `node_modules/cloudflare/resources/zones/subscriptions.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `zones.subscriptions.create` | write | `client.zones.subscriptions.create({ identifier, ...params })` |
| `zones.subscriptions.update` | write | `client.zones.subscriptions.update({ identifier, ...params })` |
| `zones.subscriptions.get` | read | `client.zones.subscriptions.get({ identifier })` |

---

## Zone Plans (2 methods)

**JSDoc source**: `node_modules/cloudflare/resources/zones/plans.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `zones.plans.list` | read | `client.zones.plans.list({ zone_id })` |
| `zones.plans.get` | read | `client.zones.plans.get({ zone_id, plan_identifier })` |

---

## DNS Records (10 methods)

**JSDoc source**: `node_modules/cloudflare/resources/dns/records.d.ts`

Core DNS record management. Supports all standard record types: A, AAAA, CNAME, MX, TXT, NS, SRV, CAA, CERT, DNSKEY, DS, HTTPS, LOC, NAPTR, PTR, SMIMEA, SSHFP, SVCB, TLSA, URI.

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `dns.records.create` | write | `client.dns.records.create({ zone_id, ...params })` |
| `dns.records.update` | write | `client.dns.records.update({ zone_id, dns_record_id, ...params })` |
| `dns.records.list` | read | `client.dns.records.list({ zone_id, ...params })` |
| `dns.records.delete` | delete | `client.dns.records.delete({ zone_id, dns_record_id })` |
| `dns.records.batch` | write | `client.dns.records.batch({ zone_id, ...params })` |
| `dns.records.edit` | write | `client.dns.records.edit({ zone_id, dns_record_id, ...params })` |
| `dns.records.export` | read | `client.dns.records.export({ zone_id })` |
| `dns.records.get` | read | `client.dns.records.get({ zone_id, dns_record_id })` |
| `dns.records.import` | write | `client.dns.records.import({ zone_id, file })` |
| `dns.records.scan` | write | `client.dns.records.scan({ zone_id })` |

### Key Params — dns.records.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `zone_id` | string | yes | Zone ID |
| `type` | string | yes | Record type: `A`, `AAAA`, `CNAME`, `MX`, `TXT`, `NS`, `SRV`, `CAA`, etc. |
| `name` | string | yes | DNS record name (e.g., `example.com`, `sub.example.com`, `@` for root) |
| `content` | string | yes | Record content (IP for A/AAAA, hostname for CNAME, text for TXT, etc.) |
| `ttl` | number | no | Time to live in seconds (1 = automatic, default 1) |
| `proxied` | boolean | no | Whether traffic is proxied through Cloudflare (default false for most types) |
| `priority` | number | no | Priority for MX/SRV records |
| `comment` | string | no | Comment for the record |
| `tags` | array | no | Tags for the record |

### Key Params — dns.records.list

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `zone_id` | string | yes | Zone ID |
| `type` | string | no | Filter by record type |
| `name` | string | no | Filter by record name (exact or contains based on `match`) |
| `content` | string | no | Filter by content |
| `proxied` | boolean | no | Filter by proxy status |
| `match` | string | no | `any` or `all` for combining filters |
| `order` | string | no | `type`, `name`, `content`, `ttl`, `proxied` |
| `direction` | string | no | `asc` or `desc` |
| `tag` | string | no | Filter by tag |
| `page` | number | no | Page number |
| `per_page` | number | no | Results per page (5-5000, default 100) |

### Key Params — dns.records.batch

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `zone_id` | string | yes | Zone ID |
| `deletes` | array | no | Array of `{ id }` records to delete |
| `patches` | array | no | Array of records to partially update |
| `puts` | array | no | Array of records to fully replace |
| `posts` | array | no | Array of new records to create |

**seeAlso**: `zones.list`, `dns.dnssec.get`

---

## DNSSEC (3 methods)

**JSDoc source**: `node_modules/cloudflare/resources/dns/dnssec.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `dns.dnssec.get` | read | `client.dns.dnssec.get({ zone_id })` |
| `dns.dnssec.edit` | write | `client.dns.dnssec.edit({ zone_id, ...params })` |
| `dns.dnssec.delete` | delete | `client.dns.dnssec.delete({ zone_id })` |

---

## DNS Settings (2 methods)

**JSDoc source**: `node_modules/cloudflare/resources/dns/settings/settings.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `dns.settings.get` | read | `client.dns.settings.get({ zone_id })` |
| `dns.settings.edit` | write | `client.dns.settings.edit({ zone_id, ...params })` |

---

## DNS Firewall (6 methods)

**JSDoc source**: `node_modules/cloudflare/resources/dns-firewall/dns-firewall.d.ts`

DNS Firewall clusters provide DNS resolution with caching and security for authoritative nameservers.

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `dnsFirewall.create` | write | `client.dnsFirewall.create({ account_id, ...params })` |
| `dnsFirewall.list` | read | `client.dnsFirewall.list({ account_id })` |
| `dnsFirewall.get` | read | `client.dnsFirewall.get({ account_id, dns_firewall_id })` |
| `dnsFirewall.edit` | write | `client.dnsFirewall.edit({ account_id, dns_firewall_id, ...params })` |
| `dnsFirewall.update` | write | `client.dnsFirewall.update({ account_id, dns_firewall_id, ...params })` |
| `dnsFirewall.delete` | delete | `client.dnsFirewall.delete({ account_id, dns_firewall_id })` |

### Key Params — dnsFirewall.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `account_id` | string | yes | Account ID |
| `name` | string | yes | Cluster name |
| `upstream_ips` | array | yes | Array of upstream DNS server IPs |
| `attack_mitigation` | object | no | DDoS attack mitigation settings |
| `deprecate_any_requests` | boolean | no | Deprecate ANY queries |
| `ecs_fallback` | boolean | no | Enable ECS fallback |
| `maximum_cache_ttl` | number | no | Max cache TTL in seconds (default 900) |
| `minimum_cache_ttl` | number | no | Min cache TTL in seconds (default 60) |
| `negative_cache_ttl` | number | no | Negative cache TTL |
| `ratelimit` | number | no | Rate limit per second |

---

## Summary

| Resource | Methods | Notes |
|----------|---------|-------|
| Zones | 5 | Core zone CRUD |
| Zone Activation Check | 1 | Trigger check for pending zones |
| Zone Settings | 2 | Get/edit 40+ zone settings |
| Zone Custom Nameservers | 2 | Custom NS config |
| Zone Holds | 4 | Prevent zone deletion |
| Zone Subscriptions | 3 | Zone plan subscriptions |
| Zone Plans | 2 | Available plans |
| DNS Records | 10 | Full CRUD + batch/import/export/scan |
| DNSSEC | 3 | Enable/disable/get DNSSEC |
| DNS Settings | 2 | DNS-level settings |
| DNS Firewall | 6 | DNS Firewall clusters |
| **Total** | **40** | |
