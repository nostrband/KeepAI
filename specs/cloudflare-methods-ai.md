# Cloudflare Methods — AI & ML

Sub-spec of [cloudflare-connector.md](./cloudflare-connector.md). Covers Workers AI, AI Gateway, Vectorize, and Browser Rendering.

> **Descriptions**: Copy method `description` fields verbatim from the JSDoc in the referenced `.d.ts` files. Do not paraphrase.

## Workers AI (2 methods)

**JSDoc source**: `node_modules/cloudflare/resources/ai/ai.d.ts`

Run AI models on Cloudflare's global network. Supports text generation, image generation, embeddings, speech recognition, translation, and more.

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `ai.run` | write | `client.ai.run({ account_id, model_name, ...params })` |
| `ai.toMarkdown.transform` | write | `client.ai.toMarkdown.transform({ account_id, ...params })` |

### Key Params — ai.run

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `account_id` | string | yes | Account ID |
| `model_name` | string | yes | Model to run (e.g., `@cf/meta/llama-3.1-8b-instruct`, `@cf/stabilityai/stable-diffusion-xl-base-1.0`) |
| `prompt` | string | no | Text prompt (for text generation, summarization) |
| `messages` | array | no | Chat messages: `[{ role: 'system'/'user'/'assistant', content: '...' }]` |
| `text` | string | no | Input text (for translation, embeddings, classification) |
| `image` | array | no | Image data (for image classification, image-to-text) |
| `audio` | array | no | Audio data (for speech recognition) |
| `source_lang` | string | no | Source language code (for translation) |
| `target_lang` | string | no | Target language code (for translation) |
| `max_tokens` | number | no | Max tokens in response |
| `temperature` | number | no | Sampling temperature (0-5) |
| `stream` | boolean | no | Enable streaming response |
| `lora` | string | no | LoRA adapter name |

### Supported Model Types

- **Text Generation**: `@cf/meta/llama-3.1-8b-instruct`, `@cf/mistral/mistral-7b-instruct-v0.2`, etc.
- **Text Embeddings**: `@cf/baai/bge-base-en-v1.5`, `@cf/baai/bge-large-en-v1.5`
- **Image Generation**: `@cf/stabilityai/stable-diffusion-xl-base-1.0`
- **Speech Recognition**: `@cf/openai/whisper`, `@cf/openai/whisper-large-v3-turbo`
- **Translation**: `@cf/meta/m2m100-1.2b`
- **Image Classification**: `@cf/microsoft/resnet-50`
- **Object Detection**: `@cf/facebook/detr-resnet-50`
- **Text Classification**: `@cf/huggingface/distilbert-sst-2-int8`
- **Summarization**: `@cf/facebook/bart-large-cnn`

---

## AI Models (1 method)

**JSDoc source**: `node_modules/cloudflare/resources/ai/ai.d.ts` (models sub-resource)

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `ai.models.list` | read | `client.ai.models.list({ account_id })` |

---

## AI Fine-Tunes (2 methods)

**JSDoc source**: `node_modules/cloudflare/resources/ai/ai.d.ts` (finetunes sub-resource)

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `ai.finetunes.create` | write | `client.ai.finetunes.create({ account_id, ...params })` |
| `ai.finetunes.list` | read | `client.ai.finetunes.list({ account_id })` |

---

## AI Authors (1 method)

**JSDoc source**: `node_modules/cloudflare/resources/ai/ai.d.ts` (authors sub-resource)

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `ai.authors.list` | read | `client.ai.authors.list({ account_id })` |

---

## AI Tasks (1 method)

**JSDoc source**: `node_modules/cloudflare/resources/ai/ai.d.ts` (tasks sub-resource)

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `ai.tasks.list` | read | `client.ai.tasks.list({ account_id })` |

---

## AI Gateway (5 methods)

**JSDoc source**: `node_modules/cloudflare/resources/ai-gateway/ai-gateway.d.ts`

AI Gateway provides caching, rate limiting, logging, and analytics for AI API calls.

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `aiGateway.create` | write | `client.aiGateway.create({ account_id, ...params })` |
| `aiGateway.update` | write | `client.aiGateway.update({ account_id, id, ...params })` |
| `aiGateway.list` | read | `client.aiGateway.list({ account_id })` |
| `aiGateway.delete` | delete | `client.aiGateway.delete({ account_id, id })` |
| `aiGateway.get` | read | `client.aiGateway.get({ account_id, id })` |

### Key Params — aiGateway.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `account_id` | string | yes | Account ID |
| `id` | string | yes | Gateway slug (URL-safe identifier) |
| `cache_invalidate_on_update` | boolean | no | Invalidate cache on gateway update |
| `cache_ttl` | number | no | Cache TTL in seconds |
| `collect_logs` | boolean | no | Enable request logging |
| `rate_limiting_interval` | number | no | Rate limiting window in seconds |
| `rate_limiting_limit` | number | no | Max requests per interval |
| `rate_limiting_technique` | string | no | `fixed` or `sliding` |

---

## AI Gateway Logs (6 methods)

**JSDoc source**: `node_modules/cloudflare/resources/ai-gateway/logs.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `aiGateway.logs.list` | read | `client.aiGateway.logs.list({ account_id, id })` |
| `aiGateway.logs.delete` | delete | `client.aiGateway.logs.delete({ account_id, id, log_id })` |
| `aiGateway.logs.edit` | write | `client.aiGateway.logs.edit({ account_id, id, log_id, ...params })` |
| `aiGateway.logs.get` | read | `client.aiGateway.logs.get({ account_id, id, log_id })` |
| `aiGateway.logs.request` | read | `client.aiGateway.logs.request({ account_id, id, log_id })` |
| `aiGateway.logs.response` | read | `client.aiGateway.logs.response({ account_id, id, log_id })` |

---

## AI Gateway Datasets (5 methods)

**JSDoc source**: `node_modules/cloudflare/resources/ai-gateway/datasets.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `aiGateway.datasets.create` | write | `client.aiGateway.datasets.create({ account_id, id, ...params })` |
| `aiGateway.datasets.update` | write | `client.aiGateway.datasets.update({ account_id, id, dataset_id, ...params })` |
| `aiGateway.datasets.list` | read | `client.aiGateway.datasets.list({ account_id, id })` |
| `aiGateway.datasets.delete` | delete | `client.aiGateway.datasets.delete({ account_id, id, dataset_id })` |
| `aiGateway.datasets.get` | read | `client.aiGateway.datasets.get({ account_id, id, dataset_id })` |

---

## AI Gateway Evaluations (4 methods)

**JSDoc source**: `node_modules/cloudflare/resources/ai-gateway/evaluations.d.ts`

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `aiGateway.evaluations.create` | write | `client.aiGateway.evaluations.create({ account_id, id, ...params })` |
| `aiGateway.evaluations.list` | read | `client.aiGateway.evaluations.list({ account_id, id })` |
| `aiGateway.evaluations.delete` | delete | `client.aiGateway.evaluations.delete({ account_id, id, evaluation_id })` |
| `aiGateway.evaluations.get` | read | `client.aiGateway.evaluations.get({ account_id, id, evaluation_id })` |

---

## Vectorize Indexes (10 methods)

**JSDoc source**: `node_modules/cloudflare/resources/vectorize/indexes/indexes.d.ts`

Vectorize is a vector database for building semantic search, RAG, and recommendation systems.

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `vectorize.indexes.create` | write | `client.vectorize.indexes.create({ account_id, ...params })` |
| `vectorize.indexes.list` | read | `client.vectorize.indexes.list({ account_id })` |
| `vectorize.indexes.delete` | delete | `client.vectorize.indexes.delete({ account_id, index_name })` |
| `vectorize.indexes.get` | read | `client.vectorize.indexes.get({ account_id, index_name })` |
| `vectorize.indexes.info` | read | `client.vectorize.indexes.info({ account_id, index_name })` |
| `vectorize.indexes.insert` | write | `client.vectorize.indexes.insert({ account_id, index_name, body })` |
| `vectorize.indexes.upsert` | write | `client.vectorize.indexes.upsert({ account_id, index_name, body })` |
| `vectorize.indexes.query` | read | `client.vectorize.indexes.query({ account_id, index_name, ...params })` |
| `vectorize.indexes.getByIDs` | read | `client.vectorize.indexes.getByIDs({ account_id, index_name, ids })` |
| `vectorize.indexes.deleteByIDs` | delete | `client.vectorize.indexes.deleteByIDs({ account_id, index_name, ids })` |

### Key Params — vectorize.indexes.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `account_id` | string | yes | Account ID |
| `name` | string | yes | Index name |
| `config` | object | yes | `{ dimensions: 768, metric: 'cosine'/'euclidean'/'dot-product' }` |
| `description` | string | no | Index description |

### Key Params — vectorize.indexes.query

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `account_id` | string | yes | Account ID |
| `index_name` | string | yes | Index name |
| `vector` | array | yes | Query vector (array of floats) |
| `topK` | number | no | Number of results to return (default 5) |
| `returnValues` | boolean | no | Return vector values in results |
| `returnMetadata` | string | no | `none`, `indexed`, `all` |
| `filter` | object | no | Metadata filter object |
| `namespace` | string | no | Filter by namespace |

### Key Params — vectorize.indexes.insert / upsert

Vectors are provided as NDJSON body:
```
{"id": "vec1", "values": [0.1, 0.2, ...], "namespace": "ns1", "metadata": {"key": "value"}}
```

---

## Browser Rendering (6 methods)

**JSDoc source**: `node_modules/cloudflare/resources/browser-rendering/content.d.ts`, `node_modules/cloudflare/resources/browser-rendering/json.d.ts`, `node_modules/cloudflare/resources/browser-rendering/links.d.ts`, `node_modules/cloudflare/resources/browser-rendering/markdown.d.ts`, `node_modules/cloudflare/resources/browser-rendering/pdf.d.ts`, `node_modules/cloudflare/resources/browser-rendering/screenshot.d.ts`

Headless browser powered by Cloudflare Workers — fetch rendered HTML, take screenshots, generate PDFs.

| Method | Op Type | SDK Call |
|--------|---------|----------|
| `browserRendering.content` | read | `client.browserRendering.content({ account_id, ...params })` |
| `browserRendering.json` | read | `client.browserRendering.json({ account_id, ...params })` |
| `browserRendering.links` | read | `client.browserRendering.links({ account_id, ...params })` |
| `browserRendering.markdown` | read | `client.browserRendering.markdown({ account_id, ...params })` |
| `browserRendering.pdf` | read | `client.browserRendering.pdf({ account_id, ...params })` |
| `browserRendering.screenshot` | read | `client.browserRendering.screenshot({ account_id, ...params })` |

### Key Params — browserRendering (all methods)

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `account_id` | string | yes | Account ID |
| `url` | string | yes | URL to render |
| `viewport` | object | no | `{ width, height, deviceScaleFactor }` |
| `gotoOptions` | object | no | `{ waitUntil: 'load'/'domcontentloaded'/'networkidle0'/'networkidle2', timeout }` |
| `html` | string | no | Render HTML directly instead of fetching URL |

---

## Summary

| Resource | Methods | Notes |
|----------|---------|-------|
| Workers AI | 2 | Model inference + doc-to-markdown |
| AI Models | 1 | Model catalog |
| AI Fine-Tunes | 2 | Fine-tuning jobs |
| AI Authors | 1 | Model providers |
| AI Tasks | 1 | Task type catalog |
| AI Gateway | 5 | Gateway CRUD |
| AI Gateway Logs | 6 | Request logging |
| AI Gateway Datasets | 5 | Training datasets |
| AI Gateway Evaluations | 4 | Model evaluations |
| Vectorize Indexes | 10 | Vector database |
| Browser Rendering | 6 | Headless browser |
| **Total** | **~43** | |
