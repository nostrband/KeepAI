# Cloudflare Methods — Storage & Media

Sub-spec of [cloudflare-connector.md](./cloudflare-connector.md). Covers R2 object storage, Stream video, and Images.

> **Descriptions**: Copy method `description` fields verbatim from the JSDoc in the referenced `.d.ts` files. Do not paraphrase.

## R2 Buckets (5 methods)

**JSDoc source**: `node_modules/cloudflare/resources/r2/buckets/buckets.d.ts`

R2 is Cloudflare's S3-compatible object storage with zero egress fees.

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `r2.buckets.create` | write | `client.r2.buckets.create({ account_id, ...params })` |
| `r2.buckets.list` | read | `client.r2.buckets.list({ account_id, ...params })` |
| `r2.buckets.delete` | delete | `client.r2.buckets.delete({ account_id, bucket_name })` |
| `r2.buckets.edit` | write | `client.r2.buckets.edit({ account_id, bucket_name, ...params })` |
| `r2.buckets.get` | read | `client.r2.buckets.get({ account_id, bucket_name })` |

### Key Params — r2.buckets.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `account_id` | string | yes | Account ID |
| `name` | string | yes | Bucket name (3-63 chars, lowercase, hyphens allowed) |
| `locationHint` | string | no | Location hint: `wnam`, `enam`, `weur`, `eeur`, `apac`, `oc` |
| `storageClass` | string | no | `Standard` (default) or `InfrequentAccess` |

### Key Params — r2.buckets.list

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `account_id` | string | yes | Account ID |
| `name_contains` | string | no | Filter by name substring |
| `start_after` | string | no | Cursor for pagination |
| `per_page` | number | no | Results per page (1-1000, default 1000) |
| `order` | string | no | `name` |
| `direction` | string | no | `asc` or `desc` |
| `cursor` | string | no | Pagination cursor |

---

## R2 Bucket Lifecycle (2 methods)

**JSDoc source**: `node_modules/cloudflare/resources/r2/buckets/lifecycle.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `r2.buckets.lifecycle.update` | write | `client.r2.buckets.lifecycle.update({ account_id, bucket_name, rules })` |
| `r2.buckets.lifecycle.get` | read | `client.r2.buckets.lifecycle.get({ account_id, bucket_name })` |

---

## R2 Bucket CORS (3 methods)

**JSDoc source**: `node_modules/cloudflare/resources/r2/buckets/cors.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `r2.buckets.cors.update` | write | `client.r2.buckets.cors.update({ account_id, bucket_name, rules })` |
| `r2.buckets.cors.get` | read | `client.r2.buckets.cors.get({ account_id, bucket_name })` |
| `r2.buckets.cors.delete` | delete | `client.r2.buckets.cors.delete({ account_id, bucket_name })` |

---

## R2 Bucket Domains (4 methods)

**JSDoc source**: `node_modules/cloudflare/resources/r2/buckets/domains/domains.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `r2.buckets.domains.custom.create` | write | `client.r2.buckets.domains.custom.create({ account_id, bucket_name, ...params })` |
| `r2.buckets.domains.custom.list` | read | `client.r2.buckets.domains.custom.list({ account_id, bucket_name })` |
| `r2.buckets.domains.custom.delete` | delete | `client.r2.buckets.domains.custom.delete({ account_id, bucket_name, domain_id })` |
| `r2.buckets.domains.custom.update` | write | `client.r2.buckets.domains.custom.update({ account_id, bucket_name, domain_id, ...params })` |

---

## R2 Bucket Event Notifications (4 methods)

**JSDoc source**: `node_modules/cloudflare/resources/r2/buckets/event-notifications.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `r2.buckets.eventNotifications.update` | write | `client.r2.buckets.eventNotifications.update({ account_id, bucket_name, ...params })` |
| `r2.buckets.eventNotifications.list` | read | `client.r2.buckets.eventNotifications.list({ account_id, bucket_name })` |
| `r2.buckets.eventNotifications.delete` | delete | `client.r2.buckets.eventNotifications.delete({ account_id, bucket_name, rule_id })` |
| `r2.buckets.eventNotifications.get` | read | `client.r2.buckets.eventNotifications.get({ account_id, bucket_name, rule_id })` |

---

## R2 Bucket Locks (2 methods)

**JSDoc source**: `node_modules/cloudflare/resources/r2/buckets/locks.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `r2.buckets.locks.update` | write | `client.r2.buckets.locks.update({ account_id, bucket_name, ...params })` |
| `r2.buckets.locks.get` | read | `client.r2.buckets.locks.get({ account_id, bucket_name })` |

---

## R2 Bucket Sippy (Incremental Migration) (3 methods)

**JSDoc source**: `node_modules/cloudflare/resources/r2/buckets/sippy.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `r2.buckets.sippy.update` | write | `client.r2.buckets.sippy.update({ account_id, bucket_name, ...params })` |
| `r2.buckets.sippy.delete` | delete | `client.r2.buckets.sippy.delete({ account_id, bucket_name })` |
| `r2.buckets.sippy.get` | read | `client.r2.buckets.sippy.get({ account_id, bucket_name })` |

---

## R2 Temporary Credentials (1 method)

**JSDoc source**: `node_modules/cloudflare/resources/r2/temporary-credentials.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `r2.temporaryCredentials.create` | write | `client.r2.temporaryCredentials.create({ account_id, ...params })` |

### Key Params — r2.temporaryCredentials.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `account_id` | string | yes | Account ID |
| `bucket` | string | yes | Bucket name |
| `parentAccessKeyId` | string | yes | Parent access key ID |
| `permission` | string | yes | `admin-read-write`, `admin-read-only`, `object-read-write`, `object-read-only` |
| `ttlSeconds` | number | yes | TTL in seconds (max 3600) |
| `objects` | array | no | Restrict to specific object keys |
| `prefixes` | array | no | Restrict to key prefixes |

---

## Stream Videos (5 methods)

**JSDoc source**: `node_modules/cloudflare/resources/stream/stream.d.ts`

Cloudflare Stream for video encoding, storage, and delivery.

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `stream.create` | write | `client.stream.create({ account_id, ...params })` |
| `stream.list` | read | `client.stream.list({ account_id, ...params })` |
| `stream.delete` | delete | `client.stream.delete({ account_id, identifier })` |
| `stream.edit` | write | `client.stream.edit({ account_id, identifier, ...params })` |
| `stream.get` | read | `client.stream.get({ account_id, identifier })` |

### Key Params — stream.list

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `account_id` | string | yes | Account ID |
| `creator` | string | no | Filter by creator ID |
| `search` | string | no | Search by name |
| `status` | string | no | `pendingupload`, `downloading`, `queued`, `inprogress`, `ready`, `error` |
| `type` | string | no | `input` (uploaded) or `live-input` |

---

## Stream Direct Upload (1 method)

**JSDoc source**: `node_modules/cloudflare/resources/stream/direct-upload.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `stream.directUpload.create` | write | `client.stream.directUpload.create({ account_id, ...params })` |

---

## Stream Live Inputs (5 methods)

**JSDoc source**: `node_modules/cloudflare/resources/stream/live-inputs/live-inputs.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `stream.liveInputs.create` | write | `client.stream.liveInputs.create({ account_id, ...params })` |
| `stream.liveInputs.update` | write | `client.stream.liveInputs.update({ account_id, live_input_identifier, ...params })` |
| `stream.liveInputs.list` | read | `client.stream.liveInputs.list({ account_id })` |
| `stream.liveInputs.delete` | delete | `client.stream.liveInputs.delete({ account_id, live_input_identifier })` |
| `stream.liveInputs.get` | read | `client.stream.liveInputs.get({ account_id, live_input_identifier })` |

---

## Stream Keys (3 methods)

**JSDoc source**: `node_modules/cloudflare/resources/stream/keys.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `stream.keys.create` | write | `client.stream.keys.create({ account_id })` |
| `stream.keys.delete` | delete | `client.stream.keys.delete({ account_id, identifier })` |
| `stream.keys.get` | read | `client.stream.keys.get({ account_id })` |

---

## Stream Watermarks (4 methods)

**JSDoc source**: `node_modules/cloudflare/resources/stream/watermarks.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `stream.watermarks.create` | write | `client.stream.watermarks.create({ account_id, file })` |
| `stream.watermarks.list` | read | `client.stream.watermarks.list({ account_id })` |
| `stream.watermarks.delete` | delete | `client.stream.watermarks.delete({ account_id, identifier })` |
| `stream.watermarks.get` | read | `client.stream.watermarks.get({ account_id, identifier })` |

---

## Stream Webhooks (3 methods)

**JSDoc source**: `node_modules/cloudflare/resources/stream/webhooks.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `stream.webhooks.update` | write | `client.stream.webhooks.update({ account_id, ...params })` |
| `stream.webhooks.delete` | delete | `client.stream.webhooks.delete({ account_id })` |
| `stream.webhooks.get` | read | `client.stream.webhooks.get({ account_id })` |

---

## Stream Captions (1 method)

**JSDoc source**: `node_modules/cloudflare/resources/stream/captions/captions.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `stream.captions.get` | read | `client.stream.captions.get({ account_id, identifier })` |

---

## Stream Downloads (3 methods)

**JSDoc source**: `node_modules/cloudflare/resources/stream/downloads.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `stream.downloads.create` | write | `client.stream.downloads.create({ account_id, identifier })` |
| `stream.downloads.delete` | delete | `client.stream.downloads.delete({ account_id, identifier })` |
| `stream.downloads.get` | read | `client.stream.downloads.get({ account_id, identifier })` |

---

## Stream Clip (1 method)

**JSDoc source**: `node_modules/cloudflare/resources/stream/clip.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `stream.clip.create` | write | `client.stream.clip.create({ account_id, ...params })` |

---

## Stream Token (1 method)

**JSDoc source**: `node_modules/cloudflare/resources/stream/token.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `stream.token.create` | write | `client.stream.token.create({ account_id, identifier, ...params })` |

---

## Images V1 (5 methods)

**JSDoc source**: `node_modules/cloudflare/resources/images/v1/v1.d.ts`

Cloudflare Images for image storage, optimization, and delivery.

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `images.v1.create` | write | `client.images.v1.create({ account_id, ...params })` |
| `images.v1.list` | read | `client.images.v1.list({ account_id })` |
| `images.v1.delete` | delete | `client.images.v1.delete({ account_id, image_id })` |
| `images.v1.edit` | write | `client.images.v1.edit({ account_id, image_id, ...params })` |
| `images.v1.get` | read | `client.images.v1.get({ account_id, image_id })` |

### Key Params — images.v1.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `account_id` | string | yes | Account ID |
| `file` | file | yes* | Image file to upload (*one of `file` or `url` required) |
| `url` | string | yes* | URL of image to fetch and store |
| `id` | string | no | Custom image ID |
| `metadata` | object | no | Key-value metadata |
| `requireSignedURLs` | boolean | no | Require signed URLs for delivery (default false) |

---

## Images V2 (1 method)

**JSDoc source**: `node_modules/cloudflare/resources/images/v2/v2.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `images.v2.list` | read | `client.images.v2.list({ account_id, ...params })` |

---

## Summary

| Resource | Methods | Notes |
|----------|---------|-------|
| R2 Buckets | 5 | Bucket CRUD |
| R2 Lifecycle | 2 | Auto-delete, storage class transitions |
| R2 CORS | 3 | Cross-origin access rules |
| R2 Domains | 4 | Custom domains for buckets |
| R2 Event Notifications | 4 | Event-driven notifications |
| R2 Locks | 2 | Object lock configuration |
| R2 Sippy | 3 | Incremental S3/GCS migration |
| R2 Temp Credentials | 1 | S3-compatible temporary credentials |
| Stream Videos | 5 | Video CRUD |
| Stream Direct Upload | 1 | Client-side upload URLs |
| Stream Live Inputs | 5 | Live streaming endpoints |
| Stream Keys | 3 | Signing keys for tokens |
| Stream Watermarks | 4 | Watermark images |
| Stream Webhooks | 3 | Notification webhooks |
| Stream Captions | 1 | Subtitles |
| Stream Downloads | 3 | MP4 download URLs |
| Stream Clip | 1 | Video clipping |
| Stream Token | 1 | Signed playback tokens |
| Images V1 | 5 | Image CRUD |
| Images V2 | 1 | Paginated image listing |
| **Total** | **~57** | |
