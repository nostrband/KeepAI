# Resolvable IDs — Notion Connector

Depends on: `resolvable-ids-infra.md`

## Resolvable Types

```ts
resolvableTypes: {
  page_id:      { label: 'Page' },
  database_id:  { label: 'Database' },
  block_id:     { label: 'Block' },
  user_id:      { label: 'User' },
  comment_id:   { label: 'Comment' },
}
```

### Types not resolved

- `data_source_id` — no public Notion web URL, low user recognition
- `view_id` — internal to databases, hard to present meaningfully
- `property_id` — property name is typically already in context
- `file_upload_id` — transient, filename is usually in params

These can be added later if users request them.

---

## resolveId Implementation

File: `packages/connectors/src/connectors/notion/index.ts`

```ts
async resolveId(
  type: string,
  id: string,
  credentials: OAuthCredentials
): Promise<ResolveResult | null> {
  const client = new NotionClient({ auth: credentials.accessToken });
  try {
    switch (type) {
      case 'page_id': {
        const page = await client.pages.retrieve({ page_id: id });
        return {
          title: extractPageTitle(page) || 'Untitled',
          url: pageUrl(id),
        };
      }
      case 'database_id': {
        const db = await client.databases.retrieve({ database_id: id });
        return {
          title: extractDbTitle(db) || 'Untitled database',
          url: pageUrl(id),
        };
      }
      case 'block_id': {
        const block = await client.blocks.retrieve({ block_id: id });
        // Blocks don't have titles — show block type + parent info
        return {
          title: `${formatBlockType(block.type)} block`,
          url: blockUrl(id),
        };
      }
      case 'user_id': {
        const user = await client.users.retrieve({ user_id: id });
        return {
          title: user.name || 'Unknown user',
        };
      }
      case 'comment_id': {
        const comment = await client.comments.retrieve({ comment_id: id });
        // Show first ~50 chars of comment text
        const text = extractCommentText(comment);
        return {
          title: text ? truncate(text, 50) : 'Comment',
        };
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}
```

### Helper functions

```ts
function extractPageTitle(page: any): string {
  // Page title is in properties.title or properties.Name (title type)
  const props = page.properties || {};
  for (const prop of Object.values(props)) {
    if (prop.type === 'title' && prop.title?.length) {
      return prop.title.map((t: any) => t.plain_text).join('');
    }
  }
  return '';
}

function extractDbTitle(db: any): string {
  return db.title?.map((t: any) => t.plain_text).join('') || '';
}

function formatBlockType(type: string): string {
  // "bulleted_list_item" → "Bulleted list item"
  return type.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
}

function extractCommentText(comment: any): string {
  return comment.rich_text?.map((t: any) => t.plain_text).join('') || '';
}

function pageUrl(id: string): string {
  return `https://notion.so/${id.replace(/-/g, '')}`;
}

function blockUrl(id: string): string {
  // Notion doesn't have direct block URLs independent of page,
  // but the page URL with block ID as fragment works
  return `https://notion.so/${id.replace(/-/g, '')}`;
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s;
}
```

---

## describeNotionRequest — Updated Format

Replace raw IDs with `[type:id]` markup:

```ts
function describeNotionRequest(method: string, params: Record<string, unknown>): string {
  const pid = params.page_id as string | undefined;
  const bid = params.block_id as string | undefined;
  const did = params.database_id as string | undefined;
  const uid = params.user_id as string | undefined;
  const cid = params.comment_id as string | undefined;
  const vid = params.view_id as string | undefined;
  const dsid = params.data_source_id as string | undefined;
  const fuid = params.file_upload_id as string | undefined;

  const ref = (type: string, id: string | undefined) =>
    id ? `[${type}:${id}]` : '(unknown)';

  switch (method) {
    case 'pages.create': {
      const parent = params.parent as Record<string, unknown> | undefined;
      if (parent?.page_id) return `Create page in ${ref('page_id', parent.page_id as string)}`;
      if (parent?.database_id) return `Create page in ${ref('database_id', parent.database_id as string)}`;
      return 'Create page';
    }
    case 'pages.retrieve': return `Retrieve page ${ref('page_id', pid)}`;
    case 'pages.update': return `Update page ${ref('page_id', pid)}`;
    case 'pages.move': return `Move page ${ref('page_id', pid)}`;
    case 'pages.retrieveMarkdown': return `Retrieve markdown of ${ref('page_id', pid)}`;
    case 'pages.updateMarkdown': return `Update markdown of ${ref('page_id', pid)}`;
    case 'pages.properties.retrieve':
      return `Retrieve property of ${ref('page_id', pid)}`;
    case 'blocks.retrieve': return `Retrieve ${ref('block_id', bid)}`;
    case 'blocks.update': return `Update ${ref('block_id', bid)}`;
    case 'blocks.delete': return `Delete ${ref('block_id', bid)}`;
    case 'blocks.children.list': return `List children of ${ref('block_id', bid)}`;
    case 'blocks.children.append': return `Append children to ${ref('block_id', bid)}`;
    case 'databases.retrieve': return `Retrieve ${ref('database_id', did)}`;
    case 'databases.create': return 'Create database';
    case 'databases.update': return `Update ${ref('database_id', did)}`;
    case 'dataSources.retrieve': return `Retrieve data source ${dsid || '(unknown)'}`;
    case 'dataSources.query': return `Query data source ${dsid || '(unknown)'}`;
    case 'dataSources.create': return 'Create data source';
    case 'dataSources.update': return `Update data source ${dsid || '(unknown)'}`;
    case 'dataSources.listTemplates': return `List templates for data source ${dsid || '(unknown)'}`;
    case 'users.retrieve': return `Retrieve ${ref('user_id', uid)}`;
    case 'users.list': return 'List users';
    case 'users.me': return 'Get bot user info';
    case 'comments.create': return 'Create comment';
    case 'comments.list': return `List comments for ${ref('block_id', bid)}`;
    case 'comments.retrieve': return `Retrieve ${ref('comment_id', cid)}`;
    case 'search': return params.query ? `Search: "${params.query}"` : 'Search workspace';
    case 'views.create': return 'Create view';
    case 'views.retrieve': return `Retrieve view ${vid || '(unknown)'}`;
    case 'views.update': return `Update view ${vid || '(unknown)'}`;
    case 'views.delete': return `Delete view ${vid || '(unknown)'}`;
    case 'views.list': return 'List views';
    case 'views.queries.create': return `Create query for view ${vid || '(unknown)'}`;
    case 'views.queries.results': return `Get query results for view ${vid || '(unknown)'}`;
    case 'views.queries.delete': return `Delete query from view ${vid || '(unknown)'}`;
    case 'fileUploads.create':
      return `Create file upload${params.filename ? ` "${params.filename}"` : ''}`;
    case 'fileUploads.retrieve': return `Retrieve file upload ${fuid || '(unknown)'}`;
    case 'fileUploads.list': return 'List file uploads';
    case 'fileUploads.send': return `Send file upload ${fuid || '(unknown)'}`;
    case 'fileUploads.complete': return `Complete file upload ${fuid || '(unknown)'}`;
    default: {
      const parts = method.split('.');
      const action = parts[parts.length - 1];
      const resource = parts.slice(0, -1).join('.');
      return `${action} ${resource}`;
    }
  }
}
```

### Key changes from current

- `pages.create` — now resolves the parent ID from the `parent` object (which has `{ type: "page_id", page_id: "..." }` or `{ type: "database_id", database_id: "..." }`)
- All `page_id`, `block_id`, `database_id`, `user_id`, `comment_id` references use `[type:id]` markup
- Non-resolvable IDs (`data_source_id`, `view_id`, `file_upload_id`) stay as raw text — can be promoted later
- `property_id` dropped from description (not useful standalone) — the page ref is enough context

---

## Example Approval Descriptions

Before:
```
Update page 1a2b3c4d-5e6f-7890-abcd-ef1234567890
Create page in {"type":"page_id","page_id":"abc123"}
Append children to block 9f8e7d6c-...
```

After (raw markup):
```
Update page [page_id:1a2b3c4d-5e6f-7890-abcd-ef1234567890]
Create page in [page_id:abc123]
Append children to [block_id:9f8e7d6c-...]
```

After (rendered in UI):
```
Update page  Page 1a2b3c…7890       ← underlined, clickable
Create page in  Page abc123          ← underlined, clickable
Append children to  Block 9f8e7d…   ← underlined, clickable
```

On click → popover:
```
┌──────────────────────────┐
│ Meeting Notes Q1         │
│ Open in Notion ↗         │
└──────────────────────────┘
```
