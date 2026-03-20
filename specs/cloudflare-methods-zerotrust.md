# Cloudflare Methods — Zero Trust

Sub-spec of [cloudflare-connector.md](./cloudflare-connector.md). Covers Zero Trust Access, Tunnels, Gateway, Devices, DLP, and Identity Providers.

> **Descriptions**: Copy method `description` fields verbatim from the JSDoc in the referenced `.d.ts` files. Do not paraphrase.

## Zero Trust Access Applications (6 methods)

**JSDoc source**: `node_modules/cloudflare/resources/zero-trust/access/applications/applications.d.ts`

Access applications define which services are protected by Zero Trust policies.

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `zeroTrust.access.applications.create` | write | `client.zeroTrust.access.applications.create({ account_id, ...params })` |
| `zeroTrust.access.applications.update` | write | `client.zeroTrust.access.applications.update({ account_id, app_id, ...params })` |
| `zeroTrust.access.applications.list` | read | `client.zeroTrust.access.applications.list({ account_id })` |
| `zeroTrust.access.applications.delete` | delete | `client.zeroTrust.access.applications.delete({ account_id, app_id })` |
| `zeroTrust.access.applications.get` | read | `client.zeroTrust.access.applications.get({ account_id, app_id })` |
| `zeroTrust.access.applications.revokeTokens` | write | `client.zeroTrust.access.applications.revokeTokens({ account_id, app_id })` |

### Key Params — zeroTrust.access.applications.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `account_id` | string | yes | Account ID |
| `name` | string | yes | Application name |
| `domain` | string | yes | Protected domain (e.g., `app.example.com`) |
| `type` | string | yes | `self_hosted`, `saas`, `ssh`, `vnc`, `app_launcher`, `warp`, `biso`, `bookmark` |
| `session_duration` | string | no | Session duration (e.g., `24h`, `720h`) |
| `auto_redirect_to_identity` | boolean | no | Auto-redirect to identity provider |
| `allowed_idps` | array | no | Allowed identity provider IDs |

---

## Zero Trust Access Groups (5 methods)

**JSDoc source**: `node_modules/cloudflare/resources/zero-trust/access/groups.d.ts`

Access groups define reusable access policies (who can access what).

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `zeroTrust.access.groups.create` | write | `client.zeroTrust.access.groups.create({ account_id, ...params })` |
| `zeroTrust.access.groups.update` | write | `client.zeroTrust.access.groups.update({ account_id, group_id, ...params })` |
| `zeroTrust.access.groups.list` | read | `client.zeroTrust.access.groups.list({ account_id })` |
| `zeroTrust.access.groups.delete` | delete | `client.zeroTrust.access.groups.delete({ account_id, group_id })` |
| `zeroTrust.access.groups.get` | read | `client.zeroTrust.access.groups.get({ account_id, group_id })` |

### Key Params — zeroTrust.access.groups.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `account_id` | string | yes | Account ID |
| `name` | string | yes | Group name |
| `include` | array | yes | Rules that must match (email, domain, IP range, service token, etc.) |
| `exclude` | array | no | Rules that must NOT match |
| `require` | array | no | Additional rules that must also match |

---

## Zero Trust Access Policies (5 methods)

**JSDoc source**: `node_modules/cloudflare/resources/zero-trust/access/policies.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `zeroTrust.access.policies.create` | write | `client.zeroTrust.access.policies.create({ account_id, ...params })` |
| `zeroTrust.access.policies.update` | write | `client.zeroTrust.access.policies.update({ account_id, policy_id, ...params })` |
| `zeroTrust.access.policies.list` | read | `client.zeroTrust.access.policies.list({ account_id })` |
| `zeroTrust.access.policies.delete` | delete | `client.zeroTrust.access.policies.delete({ account_id, policy_id })` |
| `zeroTrust.access.policies.get` | read | `client.zeroTrust.access.policies.get({ account_id, policy_id })` |

---

## Zero Trust Access Service Tokens (6 methods)

**JSDoc source**: `node_modules/cloudflare/resources/zero-trust/access/service-tokens.d.ts`

Service tokens allow automated systems to access protected applications.

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `zeroTrust.access.serviceTokens.create` | write | `client.zeroTrust.access.serviceTokens.create({ account_id, ...params })` |
| `zeroTrust.access.serviceTokens.update` | write | `client.zeroTrust.access.serviceTokens.update({ account_id, service_token_id, ...params })` |
| `zeroTrust.access.serviceTokens.list` | read | `client.zeroTrust.access.serviceTokens.list({ account_id })` |
| `zeroTrust.access.serviceTokens.delete` | delete | `client.zeroTrust.access.serviceTokens.delete({ account_id, service_token_id })` |
| `zeroTrust.access.serviceTokens.get` | read | `client.zeroTrust.access.serviceTokens.get({ account_id, service_token_id })` |
| `zeroTrust.access.serviceTokens.rotate` | write | `client.zeroTrust.access.serviceTokens.rotate({ account_id, service_token_id })` |

---

## Zero Trust Access Certificates (5 methods)

**JSDoc source**: `node_modules/cloudflare/resources/zero-trust/access/certificates/certificates.d.ts`

mTLS certificates for Access-protected applications.

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `zeroTrust.access.certificates.create` | write | `client.zeroTrust.access.certificates.create({ account_id, ...params })` |
| `zeroTrust.access.certificates.update` | write | `client.zeroTrust.access.certificates.update({ account_id, certificate_id, ...params })` |
| `zeroTrust.access.certificates.list` | read | `client.zeroTrust.access.certificates.list({ account_id })` |
| `zeroTrust.access.certificates.delete` | delete | `client.zeroTrust.access.certificates.delete({ account_id, certificate_id })` |
| `zeroTrust.access.certificates.get` | read | `client.zeroTrust.access.certificates.get({ account_id, certificate_id })` |

---

## Zero Trust Access Custom Pages (5 methods)

**JSDoc source**: `node_modules/cloudflare/resources/zero-trust/access/custom-pages.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `zeroTrust.access.customPages.create` | write | `client.zeroTrust.access.customPages.create({ account_id, ...params })` |
| `zeroTrust.access.customPages.update` | write | `client.zeroTrust.access.customPages.update({ account_id, custom_page_id, ...params })` |
| `zeroTrust.access.customPages.list` | read | `client.zeroTrust.access.customPages.list({ account_id })` |
| `zeroTrust.access.customPages.delete` | delete | `client.zeroTrust.access.customPages.delete({ account_id, custom_page_id })` |
| `zeroTrust.access.customPages.get` | read | `client.zeroTrust.access.customPages.get({ account_id, custom_page_id })` |

---

## Zero Trust Access Tags (5 methods)

**JSDoc source**: `node_modules/cloudflare/resources/zero-trust/access/tags.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `zeroTrust.access.tags.create` | write | `client.zeroTrust.access.tags.create({ account_id, ...params })` |
| `zeroTrust.access.tags.update` | write | `client.zeroTrust.access.tags.update({ account_id, tag_name, ...params })` |
| `zeroTrust.access.tags.list` | read | `client.zeroTrust.access.tags.list({ account_id })` |
| `zeroTrust.access.tags.delete` | delete | `client.zeroTrust.access.tags.delete({ account_id, tag_name })` |
| `zeroTrust.access.tags.get` | read | `client.zeroTrust.access.tags.get({ account_id, tag_name })` |

---

## Zero Trust Access Keys (3 methods)

**JSDoc source**: `node_modules/cloudflare/resources/zero-trust/access/keys.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `zeroTrust.access.keys.update` | write | `client.zeroTrust.access.keys.update({ account_id })` |
| `zeroTrust.access.keys.get` | read | `client.zeroTrust.access.keys.get({ account_id })` |
| `zeroTrust.access.keys.rotate` | write | `client.zeroTrust.access.keys.rotate({ account_id })` |

---

## Zero Trust Access Users (1 method)

**JSDoc source**: `node_modules/cloudflare/resources/zero-trust/access/users/users.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `zeroTrust.access.users.list` | read | `client.zeroTrust.access.users.list({ account_id })` |

---

## Zero Trust Identity Providers (5 methods)

**JSDoc source**: `node_modules/cloudflare/resources/zero-trust/identity-providers.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `zeroTrust.identityProviders.create` | write | `client.zeroTrust.identityProviders.create({ account_id, ...params })` |
| `zeroTrust.identityProviders.update` | write | `client.zeroTrust.identityProviders.update({ account_id, identity_provider_id, ...params })` |
| `zeroTrust.identityProviders.list` | read | `client.zeroTrust.identityProviders.list({ account_id })` |
| `zeroTrust.identityProviders.delete` | delete | `client.zeroTrust.identityProviders.delete({ account_id, identity_provider_id })` |
| `zeroTrust.identityProviders.get` | read | `client.zeroTrust.identityProviders.get({ account_id, identity_provider_id })` |

### Key Params — zeroTrust.identityProviders.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `account_id` | string | yes | Account ID |
| `name` | string | yes | Provider name |
| `type` | string | yes | `onetimepin`, `azureAD`, `saml`, `centrify`, `facebook`, `github`, `google-apps`, `google`, `linkedin`, `oidc`, `okta`, `onelogin`, `pingone`, `yandex` |
| `config` | object | yes | Provider-specific configuration (client_id, client_secret, etc.) |

---

## Zero Trust Organizations (4 methods)

**JSDoc source**: `node_modules/cloudflare/resources/zero-trust/organizations.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `zeroTrust.organizations.create` | write | `client.zeroTrust.organizations.create({ account_id, ...params })` |
| `zeroTrust.organizations.update` | write | `client.zeroTrust.organizations.update({ account_id, ...params })` |
| `zeroTrust.organizations.list` | read | `client.zeroTrust.organizations.list({ account_id })` |
| `zeroTrust.organizations.revokeUsers` | write | `client.zeroTrust.organizations.revokeUsers({ account_id, email })` |

---

## Zero Trust Tunnels (1 method)

**JSDoc source**: `node_modules/cloudflare/resources/zero-trust/tunnels.d.ts`

Cloudflare Tunnels connect your origin to Cloudflare without opening inbound ports.

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `zeroTrust.tunnels.list` | read | `client.zeroTrust.tunnels.list({ account_id })` |

**notes**: Tunnel creation/management is typically done via `cloudflared` CLI. The API provides read access to tunnel status.

---

## Zero Trust Devices (2 methods)

**JSDoc source**: `node_modules/cloudflare/resources/zero-trust/devices/devices_.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `zeroTrust.devices.list` | read | `client.zeroTrust.devices.list({ account_id })` |
| `zeroTrust.devices.get` | read | `client.zeroTrust.devices.get({ account_id, device_id })` |

---

## Zero Trust Connectivity Settings (2 methods)

**JSDoc source**: `node_modules/cloudflare/resources/zero-trust/connectivity-settings.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `zeroTrust.connectivitySettings.edit` | write | `client.zeroTrust.connectivitySettings.edit({ account_id, ...params })` |
| `zeroTrust.connectivitySettings.get` | read | `client.zeroTrust.connectivitySettings.get({ account_id })` |

---

## Zero Trust Seats (1 method)

**JSDoc source**: `node_modules/cloudflare/resources/zero-trust/seats.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `zeroTrust.seats.edit` | write | `client.zeroTrust.seats.edit({ account_id, body })` |

---

## Zero Trust Risk Scoring (2 methods)

**JSDoc source**: `node_modules/cloudflare/resources/zero-trust/risk-scoring.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `zeroTrust.riskScoring.get` | read | `client.zeroTrust.riskScoring.get({ account_id, user_id })` |
| `zeroTrust.riskScoring.reset` | write | `client.zeroTrust.riskScoring.reset({ account_id, user_id })` |

---

## Zero Trust Gateway CA (3 methods)

**JSDoc source**: `node_modules/cloudflare/resources/zero-trust/access/gateway-ca.d.ts`

Gateway CA certificates for TLS decryption.

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `zeroTrust.access.gatewayCA.create` | write | `client.zeroTrust.access.gatewayCA.create({ account_id })` |
| `zeroTrust.access.gatewayCA.list` | read | `client.zeroTrust.access.gatewayCA.list({ account_id })` |
| `zeroTrust.access.gatewayCA.delete` | delete | `client.zeroTrust.access.gatewayCA.delete({ account_id, certificate_id })` |

---

## Summary

| Resource | Methods | Notes |
|----------|---------|-------|
| Access Applications | 6 | Protected apps + token revocation |
| Access Groups | 5 | Reusable access policies |
| Access Policies | 5 | Reusable policies |
| Access Service Tokens | 6 | Machine-to-machine auth |
| Access Certificates | 5 | mTLS certificates |
| Access Custom Pages | 5 | Custom block/deny pages |
| Access Tags | 5 | Application organization |
| Access Keys | 3 | Signing key management |
| Access Users | 1 | User listing |
| Identity Providers | 5 | IdP management |
| Organizations | 4 | ZT org settings |
| Tunnels | 1 | Tunnel listing |
| Devices | 2 | WARP device listing |
| Connectivity Settings | 2 | WARP connectivity |
| Seats | 1 | Seat assignment |
| Risk Scoring | 2 | User risk scores |
| Gateway CA | 3 | Gateway certificates |
| **Total** | **~61** | |
