# Cloudflare Methods — Security

Sub-spec of [cloudflare-connector.md](./cloudflare-connector.md). Covers rulesets, firewall, SSL/TLS, certificates, Turnstile, bot management, page shield, and WAF.

> **Descriptions**: Copy method `description` fields verbatim from the JSDoc in the referenced `.d.ts` files. Do not paraphrase.

## Rulesets (5 methods)

**JSDoc source**: `node_modules/cloudflare/resources/rulesets/rulesets.d.ts`

Rulesets are the modern way to manage Cloudflare rules (WAF, transform, redirect, cache, etc.).

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `rulesets.create` | write | `client.rulesets.create({ account_id or zone_id, ...params })` |
| `rulesets.update` | write | `client.rulesets.update({ account_id or zone_id, ruleset_id, ...params })` |
| `rulesets.list` | read | `client.rulesets.list({ account_id or zone_id })` |
| `rulesets.delete` | delete | `client.rulesets.delete({ account_id or zone_id, ruleset_id })` |
| `rulesets.get` | read | `client.rulesets.get({ account_id or zone_id, ruleset_id })` |

### Key Params — rulesets.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `account_id` or `zone_id` | string | yes | Scope (account-level or zone-level) |
| `name` | string | yes | Ruleset name |
| `kind` | string | yes | `managed`, `custom`, `root`, `zone` |
| `phase` | string | yes | Execution phase: `http_request_firewall_managed`, `http_request_transform`, `http_request_redirect`, etc. |
| `rules` | array | yes | Array of rule objects |
| `description` | string | no | Ruleset description |

### Ruleset Rule Types

`block`, `challenge`, `compress_response`, `ddos_dynamic`, `execute`, `force_connection_close`, `log`, `managed_challenge`, `redirect`, `rewrite`, `route`, `score`, `serve_error`, `set_cache_settings`, `set_config`, `skip`.

---

## Ruleset Phases (2 methods)

**JSDoc source**: `node_modules/cloudflare/resources/rulesets/phases/phases.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `rulesets.phases.update` | write | `client.rulesets.phases.update({ account_id or zone_id, ruleset_phase, ...params })` |
| `rulesets.phases.get` | read | `client.rulesets.phases.get({ account_id or zone_id, ruleset_phase })` |

---

## Ruleset Rules (3 methods)

**JSDoc source**: `node_modules/cloudflare/resources/rulesets/rules.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `rulesets.rules.create` | write | `client.rulesets.rules.create({ account_id or zone_id, ruleset_id, ...params })` |
| `rulesets.rules.delete` | delete | `client.rulesets.rules.delete({ account_id or zone_id, ruleset_id, rule_id })` |
| `rulesets.rules.edit` | write | `client.rulesets.rules.edit({ account_id or zone_id, ruleset_id, rule_id, ...params })` |

---

## Ruleset Versions (3 methods)

**JSDoc source**: `node_modules/cloudflare/resources/rulesets/versions.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `rulesets.versions.list` | read | `client.rulesets.versions.list({ account_id or zone_id, ruleset_id })` |
| `rulesets.versions.delete` | delete | `client.rulesets.versions.delete({ account_id or zone_id, ruleset_id, ruleset_version })` |
| `rulesets.versions.get` | read | `client.rulesets.versions.get({ account_id or zone_id, ruleset_id, ruleset_version })` |

---

## Firewall Rules (Legacy) (7 methods)

**JSDoc source**: `node_modules/cloudflare/resources/firewall/rules.d.ts`

Legacy firewall rules. New implementations should use Rulesets.

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `firewall.rules.create` | write | `client.firewall.rules.create({ zone_id, body })` |
| `firewall.rules.update` | write | `client.firewall.rules.update({ zone_id, id, body })` |
| `firewall.rules.list` | read | `client.firewall.rules.list({ zone_id })` |
| `firewall.rules.delete` | delete | `client.firewall.rules.delete({ zone_id, id })` |
| `firewall.rules.edit` | write | `client.firewall.rules.edit({ zone_id, id, body })` |
| `firewall.rules.get` | read | `client.firewall.rules.get({ zone_id, id })` |
| `firewall.rules.bulkEdit` | write | `client.firewall.rules.bulkEdit({ zone_id, body })` |

**notes**: Deprecated — use `rulesets.*` methods instead.

---

## Firewall Lockdowns (5 methods)

**JSDoc source**: `node_modules/cloudflare/resources/firewall/lockdowns.d.ts`

Lock a URL to specific IP addresses.

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `firewall.lockdowns.create` | write | `client.firewall.lockdowns.create({ zone_id, ...params })` |
| `firewall.lockdowns.update` | write | `client.firewall.lockdowns.update({ zone_id, id, ...params })` |
| `firewall.lockdowns.list` | read | `client.firewall.lockdowns.list({ zone_id })` |
| `firewall.lockdowns.delete` | delete | `client.firewall.lockdowns.delete({ zone_id, id })` |
| `firewall.lockdowns.get` | read | `client.firewall.lockdowns.get({ zone_id, id })` |

---

## Firewall Access Rules (5 methods)

**JSDoc source**: `node_modules/cloudflare/resources/firewall/access-rules.d.ts`

IP/ASN/country-level access rules.

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `firewall.accessRules.create` | write | `client.firewall.accessRules.create({ account_id or zone_id, ...params })` |
| `firewall.accessRules.list` | read | `client.firewall.accessRules.list({ account_id or zone_id })` |
| `firewall.accessRules.delete` | delete | `client.firewall.accessRules.delete({ account_id or zone_id, identifier })` |
| `firewall.accessRules.edit` | write | `client.firewall.accessRules.edit({ account_id or zone_id, identifier, ...params })` |
| `firewall.accessRules.get` | read | `client.firewall.accessRules.get({ account_id or zone_id, identifier })` |

### Key Params — firewall.accessRules.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `configuration` | object | yes | `{ target: 'ip'/'ip_range'/'asn'/'country', value: '...' }` |
| `mode` | string | yes | `block`, `challenge`, `whitelist`, `js_challenge`, `managed_challenge` |
| `notes` | string | no | Description of the rule |

---

## Firewall UA Rules (5 methods)

**JSDoc source**: `node_modules/cloudflare/resources/firewall/ua-rules.d.ts`

User-Agent blocking rules.

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `firewall.uaRules.create` | write | `client.firewall.uaRules.create({ zone_id, ...params })` |
| `firewall.uaRules.update` | write | `client.firewall.uaRules.update({ zone_id, ua_rule_id, ...params })` |
| `firewall.uaRules.list` | read | `client.firewall.uaRules.list({ zone_id })` |
| `firewall.uaRules.delete` | delete | `client.firewall.uaRules.delete({ zone_id, ua_rule_id })` |
| `firewall.uaRules.get` | read | `client.firewall.uaRules.get({ zone_id, ua_rule_id })` |

---

## SSL Certificate Packs (5 methods)

**JSDoc source**: `node_modules/cloudflare/resources/ssl/certificate-packs/certificate-packs.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `ssl.certificatePacks.create` | write | `client.ssl.certificatePacks.create({ zone_id, ...params })` |
| `ssl.certificatePacks.list` | read | `client.ssl.certificatePacks.list({ zone_id })` |
| `ssl.certificatePacks.delete` | delete | `client.ssl.certificatePacks.delete({ zone_id, certificate_pack_id })` |
| `ssl.certificatePacks.edit` | write | `client.ssl.certificatePacks.edit({ zone_id, certificate_pack_id, ...params })` |
| `ssl.certificatePacks.get` | read | `client.ssl.certificatePacks.get({ zone_id, certificate_pack_id })` |

---

## SSL Analyze (1 method)

**JSDoc source**: `node_modules/cloudflare/resources/ssl/analyze.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `ssl.analyze.create` | read | `client.ssl.analyze.create({ zone_id, ...params })` |

---

## SSL Verification (2 methods)

**JSDoc source**: `node_modules/cloudflare/resources/ssl/verification.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `ssl.verification.get` | read | `client.ssl.verification.get({ zone_id })` |
| `ssl.verification.edit` | write | `client.ssl.verification.edit({ zone_id, certificate_pack_id, ...params })` |

---

## SSL Recommendations (1 method)

**JSDoc source**: `node_modules/cloudflare/resources/ssl/recommendations.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `ssl.recommendations.get` | read | `client.ssl.recommendations.get({ zone_id })` |

---

## Custom Certificates (6 methods)

**JSDoc source**: `node_modules/cloudflare/resources/custom-certificates/custom-certificates.d.ts`

Upload custom SSL certificates.

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `customCertificates.create` | write | `client.customCertificates.create({ zone_id, ...params })` |
| `customCertificates.list` | read | `client.customCertificates.list({ zone_id })` |
| `customCertificates.delete` | delete | `client.customCertificates.delete({ zone_id, custom_certificate_id })` |
| `customCertificates.edit` | write | `client.customCertificates.edit({ zone_id, custom_certificate_id, ...params })` |
| `customCertificates.get` | read | `client.customCertificates.get({ zone_id, custom_certificate_id })` |
| `customCertificates.update` | write | `client.customCertificates.update({ zone_id, custom_certificate_id, ...params })` |

---

## Origin CA Certificates (4 methods)

**JSDoc source**: `node_modules/cloudflare/resources/origin-ca-certificates.d.ts`

Cloudflare-signed certificates for origin servers.

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `originCACertificates.create` | write | `client.originCACertificates.create({ ...params })` |
| `originCACertificates.list` | read | `client.originCACertificates.list({ zone_id })` |
| `originCACertificates.delete` | delete | `client.originCACertificates.delete({ certificate_id })` |
| `originCACertificates.get` | read | `client.originCACertificates.get({ certificate_id })` |

---

## Keyless Certificates (5 methods)

**JSDoc source**: `node_modules/cloudflare/resources/keyless-certificates.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `keylessCertificates.create` | write | `client.keylessCertificates.create({ zone_id, ...params })` |
| `keylessCertificates.list` | read | `client.keylessCertificates.list({ zone_id })` |
| `keylessCertificates.delete` | delete | `client.keylessCertificates.delete({ zone_id, keyless_certificate_id })` |
| `keylessCertificates.edit` | write | `client.keylessCertificates.edit({ zone_id, keyless_certificate_id, ...params })` |
| `keylessCertificates.get` | read | `client.keylessCertificates.get({ zone_id, keyless_certificate_id })` |

---

## Client Certificates (5 methods)

**JSDoc source**: `node_modules/cloudflare/resources/client-certificates.d.ts`

mTLS client certificates for API Shield.

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `clientCertificates.create` | write | `client.clientCertificates.create({ zone_id, ...params })` |
| `clientCertificates.list` | read | `client.clientCertificates.list({ zone_id })` |
| `clientCertificates.delete` | delete | `client.clientCertificates.delete({ zone_id, client_certificate_id })` |
| `clientCertificates.edit` | write | `client.clientCertificates.edit({ zone_id, client_certificate_id })` |
| `clientCertificates.get` | read | `client.clientCertificates.get({ zone_id, client_certificate_id })` |

---

## Turnstile Widgets (6 methods)

**JSDoc source**: `node_modules/cloudflare/resources/turnstile/widgets.d.ts`

Turnstile is Cloudflare's CAPTCHA alternative.

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `turnstile.widgets.create` | write | `client.turnstile.widgets.create({ account_id, ...params })` |
| `turnstile.widgets.update` | write | `client.turnstile.widgets.update({ account_id, sitekey, ...params })` |
| `turnstile.widgets.list` | read | `client.turnstile.widgets.list({ account_id })` |
| `turnstile.widgets.delete` | delete | `client.turnstile.widgets.delete({ account_id, sitekey })` |
| `turnstile.widgets.get` | read | `client.turnstile.widgets.get({ account_id, sitekey })` |
| `turnstile.widgets.rotateSecret` | write | `client.turnstile.widgets.rotateSecret({ account_id, sitekey })` |

### Key Params — turnstile.widgets.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `account_id` | string | yes | Account ID |
| `name` | string | yes | Widget name |
| `domains` | array | yes | Allowed domains (e.g., `['example.com']`) |
| `mode` | string | yes | `managed`, `non-interactive`, or `invisible` |
| `bot_fight_mode` | boolean | no | Enable bot fight mode |
| `clearance_level` | string | no | `no_clearance`, `jschallenge`, `managed`, `interactive` |

---

## Bot Management (2 methods)

**JSDoc source**: `node_modules/cloudflare/resources/bot-management.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `botManagement.update` | write | `client.botManagement.update({ zone_id, ...params })` |
| `botManagement.get` | read | `client.botManagement.get({ zone_id })` |

---

## Page Shield (6 methods)

**JSDoc source**: `node_modules/cloudflare/resources/page-shield/page-shield.d.ts`, `node_modules/cloudflare/resources/page-shield/scripts.d.ts`, `node_modules/cloudflare/resources/page-shield/connections.d.ts`

Monitor and control third-party scripts on your site.

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `pageShield.update` | write | `client.pageShield.update({ zone_id, ...params })` |
| `pageShield.get` | read | `client.pageShield.get({ zone_id })` |
| `pageShield.scripts.list` | read | `client.pageShield.scripts.list({ zone_id })` |
| `pageShield.scripts.get` | read | `client.pageShield.scripts.get({ zone_id, script_id })` |
| `pageShield.connections.list` | read | `client.pageShield.connections.list({ zone_id })` |
| `pageShield.connections.get` | read | `client.pageShield.connections.get({ zone_id, connection_id })` |

---

## Page Rules (Legacy) (6 methods)

**JSDoc source**: `node_modules/cloudflare/resources/page-rules.d.ts`

**notes**: Deprecated — use `rulesets.*` with appropriate phases instead.

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `pageRules.create` | write | `client.pageRules.create({ zone_id, ...params })` |
| `pageRules.update` | write | `client.pageRules.update({ zone_id, pagerule_id, ...params })` |
| `pageRules.list` | read | `client.pageRules.list({ zone_id })` |
| `pageRules.delete` | delete | `client.pageRules.delete({ zone_id, pagerule_id })` |
| `pageRules.edit` | write | `client.pageRules.edit({ zone_id, pagerule_id, ...params })` |
| `pageRules.get` | read | `client.pageRules.get({ zone_id, pagerule_id })` |

---

## Rate Limits (Legacy) (5 methods)

**JSDoc source**: `node_modules/cloudflare/resources/rate-limits.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `rateLimits.create` | write | `client.rateLimits.create({ zone_id, ...params })` |
| `rateLimits.list` | read | `client.rateLimits.list({ zone_id })` |
| `rateLimits.delete` | delete | `client.rateLimits.delete({ zone_id, id })` |
| `rateLimits.edit` | write | `client.rateLimits.edit({ zone_id, id, ...params })` |
| `rateLimits.get` | read | `client.rateLimits.get({ zone_id, id })` |

---

## Managed Transforms (3 methods)

**JSDoc source**: `node_modules/cloudflare/resources/managed-transforms.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `managedTransforms.update` | write | `client.managedTransforms.update({ zone_id, ...params })` |
| `managedTransforms.list` | read | `client.managedTransforms.list({ zone_id })` |
| `managedTransforms.delete` | delete | `client.managedTransforms.delete({ zone_id })` |

---

## URL Normalization (2 methods)

**JSDoc source**: `node_modules/cloudflare/resources/url-normalization.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `urlNormalization.update` | write | `client.urlNormalization.update({ zone_id, ...params })` |
| `urlNormalization.get` | read | `client.urlNormalization.get({ zone_id })` |

---

## Security TXT (3 methods)

**JSDoc source**: `node_modules/cloudflare/resources/security-txt.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `securityTXT.update` | write | `client.securityTXT.update({ zone_id, ...params })` |
| `securityTXT.delete` | delete | `client.securityTXT.delete({ zone_id })` |
| `securityTXT.get` | read | `client.securityTXT.get({ zone_id })` |

---

## Summary

| Resource | Methods | Notes |
|----------|---------|-------|
| Rulesets | 5 | Modern rule management |
| Ruleset Phases | 2 | Phase entrypoints |
| Ruleset Rules | 3 | Individual rule CRUD |
| Ruleset Versions | 3 | Version history |
| Firewall Rules (Legacy) | 7 | Deprecated — use rulesets |
| Firewall Lockdowns | 5 | IP lockdown rules |
| Firewall Access Rules | 5 | IP/ASN/country access rules |
| Firewall UA Rules | 5 | User-Agent rules |
| SSL Certificate Packs | 5 | Advanced certificates |
| SSL Analyze | 1 | Certificate analysis |
| SSL Verification | 2 | Validation status |
| SSL Recommendations | 1 | SSL level recommendation |
| Custom Certificates | 6 | Uploaded SSL certs |
| Origin CA Certificates | 4 | Cloudflare-signed origin certs |
| Keyless Certificates | 5 | Keyless SSL |
| Client Certificates | 5 | mTLS client certs |
| Turnstile | 6 | CAPTCHA alternative |
| Bot Management | 2 | Bot detection settings |
| Page Shield | 6 | Third-party script monitoring |
| Page Rules (Legacy) | 6 | Deprecated — use rulesets |
| Rate Limits (Legacy) | 5 | Legacy rate limiting |
| Managed Transforms | 3 | Request/response transforms |
| URL Normalization | 2 | URL normalization settings |
| Security TXT | 3 | security.txt management |
| **Total** | **~97** | |
