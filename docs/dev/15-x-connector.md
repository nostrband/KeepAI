# 15 — X (Twitter) Connector

## Overview

Add X.com as a KeepAI connector using the official `@xdevplatform/xdk` SDK (v0.5.0, already installed). Unlike Gmail/Notion, X won't use an OAuth flow managed by KeepAI — instead the user pastes their **API credentials** from https://console.x.com/ (this way the user pays for their own API access).

## Authentication: Manual OAuth 1.0a Credentials

### Why OAuth 1.0a (not bearer token)

Bearer tokens are app-only and **read-only**. For write operations (posting, liking, DMs), we need user-context auth. At console.x.com, users can generate all 4 OAuth 1.0a credentials directly:

1. **API Key** (Consumer Key)
2. **API Key Secret** (Consumer Secret)
3. **Access Token**
4. **Access Token Secret**

Together these give full read+write user-context access via OAuth 1.0a signing.

### New auth type: `manualToken`

The existing `ServiceDefinition` supports `oauthConfig` and `tokenAuth` (Trello-style redirect). X needs a third mode: **manual credential entry** — no redirect, no callback, just paste 4 fields.

Add to `ServiceDefinition` (in `packages/connectors/src/types.ts`):

```typescript
export interface ManualTokenField {
  /** Field key used in the credentials object. */
  key: string;
  /** Label shown to user. */
  label: string;
  /** Help text / placeholder. */
  placeholder?: string;
  /** If true, render as password input. */
  secret?: boolean;
}

export interface ManualTokenAuthConfig {
  /** Instructions shown to user on how to get credentials. */
  instructions: string;
  /** URL to create/manage API keys. */
  consoleUrl: string;
  /** Fields the user needs to fill in. */
  fields: ManualTokenField[];
  /** Validate credentials and return account info. */
  validateCredentials: (creds: Record<string, string>) => Promise<{ accountId: string; displayName?: string }>;
}

// Add to ServiceDefinition:
manualTokenAuth?: ManualTokenAuthConfig;
```

### How credentials are stored

The 4 OAuth 1.0a values are stored in `OAuthCredentials`:
- `accessToken` — the Access Token
- `metadata.apiKey` — the API Key (Consumer Key)
- `metadata.apiSecret` — the API Key Secret (Consumer Secret)
- `metadata.accessTokenSecret` — the Access Token Secret

This reuses the existing `OAuthCredentials` shape without schema changes to `ConnectionDb`.

### Connection flow

1. User clicks "Connect X" in UI
2. UI shows a form with 4 fields: API Key, API Key Secret, Access Token, Access Token Secret
3. Link to https://console.x.com/ with instructions on generating these
4. User pastes all 4 values and clicks Connect
5. `keepd` calls `POST /api/connections/manual-token` with `{ service: 'x', credentials: { apiKey, apiSecret, accessToken, accessTokenSecret } }`
6. `ConnectionManager` validates via `GET /2/users/me` using OAuth 1.0a signing
7. On success: stores credentials, creates connection with `accountId` = X username
8. No refresh needed — these credentials don't expire (until revoked by user at console.x.com)

### keepd API endpoint

```
POST /api/connections/manual-token
Body: { service: string, credentials: Record<string, string> }
Response: { connection: Connection }
```

### UI changes

- Connection dialog for X shows 4 input fields (secrets masked) + link to console.x.com
- Show connected X username + display name after validation

## Service Definition

`packages/connectors/src/services/x.ts`:

```typescript
import { Client, OAuth1 } from '@xdevplatform/xdk';

export const xService: ServiceDefinition = {
  id: 'x',
  name: 'X',
  icon: 'x',

  // Placeholder — manual token auth, not OAuth managed by KeepAI
  oauthConfig: { authUrl: '', tokenUrl: '', scopes: [] },
  supportsRefresh: false,

  manualTokenAuth: {
    instructions: 'Create an API project at console.x.com, then go to Keys and Tokens to generate all 4 values below.',
    consoleUrl: 'https://console.x.com/',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'Consumer Key' },
      { key: 'apiSecret', label: 'API Key Secret', placeholder: 'Consumer Secret', secret: true },
      { key: 'accessToken', label: 'Access Token', placeholder: 'User access token' },
      { key: 'accessTokenSecret', label: 'Access Token Secret', placeholder: 'User access token secret', secret: true },
    ],
    validateCredentials: async (creds) => {
      const client = new Client({
        oauth1: new OAuth1({
          apiKey: creds.apiKey,
          apiSecret: creds.apiSecret,
          accessToken: creds.accessToken,
          accessTokenSecret: creds.accessTokenSecret,
        }),
      });
      const me = await client.users.getMe();
      return {
        accountId: me.data.username,
        displayName: `${me.data.name} (@${me.data.username})`,
      };
    },
  },

  async extractAccountId() { throw new Error('Use manualTokenAuth'); },
};
```

## Connector Implementation

`packages/connectors/src/connectors/x.ts`

### SDK Usage Pattern

```typescript
import { Client, OAuth1 } from '@xdevplatform/xdk';

function getClient(credentials: OAuthCredentials): Client {
  const meta = credentials.metadata as Record<string, string>;
  return new Client({
    oauth1: new OAuth1({
      apiKey: meta.apiKey,
      apiSecret: meta.apiSecret,
      accessToken: credentials.accessToken,
      accessTokenSecret: meta.accessTokenSecret,
    }),
  });
}
```

The XDK `Client` wraps all API calls. We call its methods directly — no raw HTTP needed. OAuth 1.0a signing is handled by the SDK.

### Method Categories and Methods

Below are the methods to expose, organized by resource. Each maps 1:1 to an XDK client method. All methods (read and write) work with OAuth 1.0a user-context credentials.

#### Posts (12 methods)

| Method | Op Type | XDK Call | Description |
|--------|---------|----------|-------------|
| `posts.get` | read | `client.posts.getById(id)` | Get a post by ID |
| `posts.getBatch` | read | `client.posts.getByIds(ids)` | Get multiple posts by IDs |
| `posts.create` | write | `client.posts.create(body)` | Create a new post |
| `posts.delete` | delete | `client.posts.delete(id)` | Delete a post |
| `posts.searchRecent` | read | `client.posts.searchRecent(query)` | Search recent posts (7 days) |
| `posts.searchAll` | read | `client.posts.searchAll(query)` | Full-archive search |
| `posts.getQuoted` | read | `client.posts.getQuoted(id)` | Get quote posts of a post |
| `posts.getReposts` | read | `client.posts.getReposts(id)` | Get reposts of a post |
| `posts.getRepostedBy` | read | `client.posts.getRepostedBy(id)` | Users who reposted |
| `posts.hideReply` | write | `client.posts.hideReply(id, body)` | Hide/unhide a reply |
| `posts.getAnalytics` | read | `client.posts.getAnalytics(...)` | Post engagement analytics |
| `posts.getInsights` | read | `client.posts.getInsights28hr(...)` | 28-hour post insights |

#### Users (18 methods)

| Method | Op Type | XDK Call | Description |
|--------|---------|----------|-------------|
| `users.getMe` | read | `client.users.getMe()` | Get authenticated user |
| `users.get` | read | `client.users.getById(id)` | Get user by ID |
| `users.getBatch` | read | `client.users.getByIds(ids)` | Get multiple users by IDs |
| `users.getByUsername` | read | `client.users.getByUsername(username)` | Get user by username |
| `users.getFollowers` | read | `client.users.getFollowers(id)` | List followers |
| `users.getFollowing` | read | `client.users.getFollowing(id)` | List following |
| `users.follow` | write | `client.users.followUser(id, body)` | Follow a user |
| `users.unfollow` | write | `client.users.unfollowUser(id, targetUserId)` | Unfollow a user |
| `users.getMentions` | read | `client.users.getMentions(id)` | Get mentions of user |
| `users.getTimeline` | read | `client.users.getTimeline(id)` | Get user's timeline |
| `users.getLikedPosts` | read | `client.users.getLikedPosts(id)` | Posts liked by user |
| `users.like` | write | `client.users.likePost(id, tweetId)` | Like a post |
| `users.unlike` | write | `client.users.unlikePost(id, tweetId)` | Unlike a post |
| `users.getBookmarks` | read | `client.users.getBookmarks(id)` | List bookmarks |
| `users.bookmark` | write | `client.users.bookmarkPost(id, tweetId)` | Bookmark a post |
| `users.removeBookmark` | delete | `client.users.deleteBookmark(id, tweetId)` | Remove bookmark |
| `users.block` | write | `client.users.blockUser(id, targetUserId)` | Block a user |
| `users.unblock` | write | `client.users.unblockUser(id, targetUserId)` | Unblock a user |

#### Direct Messages (6 methods)

| Method | Op Type | XDK Call | Description |
|--------|---------|----------|-------------|
| `dm.getEvents` | read | `client.directMessages.getEvents()` | List recent DM events |
| `dm.getEventsByConversation` | read | `client.directMessages.getEventsByConversationId(id)` | Get DMs in a conversation |
| `dm.getEventsByParticipant` | read | `client.directMessages.getEventsByParticipantId(id)` | Get DMs with a user |
| `dm.send` | write | `client.directMessages.createByParticipantId(id, body)` | Send DM to a user |
| `dm.sendToConversation` | write | `client.directMessages.createByConversationId(id, body)` | Send DM to conversation |
| `dm.createConversation` | write | `client.directMessages.createConversation(body)` | Create group DM conversation |

#### Lists (8 methods)

| Method | Op Type | XDK Call | Description |
|--------|---------|----------|-------------|
| `lists.get` | read | `client.lists.getById(id)` | Get list by ID |
| `lists.getPosts` | read | `client.lists.getPosts(id)` | Get posts in a list |
| `lists.getMembers` | read | `client.lists.getMembers(id)` | Get list members |
| `lists.getFollowers` | read | `client.lists.getFollowers(id)` | Get list followers |
| `lists.create` | write | `client.lists.create(body)` | Create a list |
| `lists.update` | write | `client.lists.update(id, body)` | Update list details |
| `lists.delete` | delete | `client.lists.delete(id)` | Delete a list |
| `lists.addMember` | write | `client.lists.addMember(id, body)` | Add member to list |

#### Spaces (4 methods)

| Method | Op Type | XDK Call | Description |
|--------|---------|----------|-------------|
| `spaces.get` | read | `client.spaces.getById(id)` | Get space by ID |
| `spaces.getBatch` | read | `client.spaces.getByIds(ids)` | Get multiple spaces |
| `spaces.search` | read | `client.spaces.search(query)` | Search spaces |
| `spaces.getPosts` | read | `client.spaces.getPosts(id)` | Get posts shared in a space |

#### Communities (2 methods)

| Method | Op Type | XDK Call | Description |
|--------|---------|----------|-------------|
| `communities.get` | read | `client.communities.getById(id)` | Get community by ID |
| `communities.search` | read | `client.communities.search(query)` | Search communities |

#### Community Notes (4 methods)

| Method | Op Type | XDK Call | Description |
|--------|---------|----------|-------------|
| `communityNotes.create` | write | `client.communityNotes.create(body)` | Create a community note |
| `communityNotes.evaluate` | write | `client.communityNotes.evaluate(body)` | Rate a community note |
| `communityNotes.search` | read | `client.communityNotes.searchWritten(...)` | Search notes by author |
| `communityNotes.delete` | delete | `client.communityNotes.delete(id)` | Delete a community note |

#### Trends (2 methods)

| Method | Op Type | XDK Call | Description |
|--------|---------|----------|-------------|
| `trends.getByLocation` | read | `client.trends.getByWoeid(woeid)` | Trending topics by location (WOEID) |
| `trends.getPersonalized` | read | `client.trends.getPersonalized()` | Personalized trends |

#### News (2 methods)

| Method | Op Type | XDK Call | Description |
|--------|---------|----------|-------------|
| `news.search` | read | `client.news.search(query)` | Search news stories |
| `news.get` | read | `client.news.get(id)` | Get news story by ID |

#### Media (3 methods)

| Method | Op Type | XDK Call | Description |
|--------|---------|----------|-------------|
| `media.upload` | write | `client.media.upload(body)` | Upload media (image/video) |
| `media.getStatus` | read | `client.media.getUploadStatus(id)` | Check upload status |
| `media.getAnalytics` | read | `client.media.getAnalytics(ids, ...)` | Media engagement analytics |

#### Usage (1 method)

| Method | Op Type | XDK Call | Description |
|--------|---------|----------|-------------|
| `usage.get` | read | `client.usage.get()` | Get API usage statistics |

**Total: 62 methods**

### Method Descriptions

Method descriptions should be concise, human-readable strings for the `ConnectorMethod.description` field. We'll write them manually (as done for Gmail) — the XDK doesn't embed JSDoc descriptions that would be easy to extract at runtime. The descriptions above serve as the source.

### Param Schemas

For each method, params will mirror the XDK method signature. Common patterns:

- `id: string` (required) — resource ID
- `ids: string[]` — batch lookups
- `query: string` — search queries
- `maxResults: number` — pagination limit
- `paginationToken: string` — cursor for next page

We'll define `ParamSchema[]` for each method.

### Field Expansions

X API returns minimal data by default (e.g. `{ id, text }` for a post). Richer data requires passing `tweetFields`, `userFields`, `expansions` params. We do **not** apply any defaults — we pass through whatever the agent requests (or nothing, getting X's defaults).

Agents learn about available fields from the `help` output. Each method that supports field expansion will list the available values in the param description / `syntax` field:

```typescript
{
  name: 'tweetFields',
  type: 'array',
  required: false,
  description: 'Additional tweet fields to include in the response.',
  syntax: ['created_at', 'author_id', 'public_metrics', 'entities',
           'referenced_tweets', 'conversation_id', 'attachments',
           'geo', 'context_annotations', 'withheld', 'reply_settings',
           'lang', 'source', 'non_public_metrics', 'organic_metrics'],
},
{
  name: 'userFields',
  type: 'array',
  required: false,
  description: 'Additional user fields to include in the response.',
  syntax: ['name', 'username', 'description', 'public_metrics',
           'profile_image_url', 'verified', 'created_at', 'location',
           'url', 'pinned_tweet_id', 'protected', 'entities'],
},
{
  name: 'expansions',
  type: 'array',
  required: false,
  description: 'Expand related objects inline (adds "includes" to response).',
  syntax: ['author_id', 'attachments.media_keys', 'referenced_tweets.id',
           'in_reply_to_user_id', 'attachments.poll_ids', 'geo.place_id',
           'entities.mentions.username', 'referenced_tweets.id.author_id'],
},
```

These expansion params are added to methods that support them (posts.get, posts.searchRecent, users.getFollowers, etc.). The agent decides what to request.

### Human-Readable Request Descriptions

`describeXRequest(method, params)` — same pattern as `describeGmailRequest`:

```typescript
function describeXRequest(method: string, params: Record<string, unknown>): string {
  switch (method) {
    case 'posts.get': return `Get post ${params.id || '(unknown)'}`;
    case 'posts.create': return `Create post: "${String(params.text || '').slice(0, 50)}..."`;
    case 'posts.searchRecent': return `Search recent posts: "${params.query}"`;
    case 'users.getByUsername': return `Look up user @${params.username}`;
    case 'dm.send': return `Send DM to user ${params.participantId}`;
    // ... etc
  }
}
```

### Resource Types

Derived from method prefix for `PermissionMetadata.resourceType`:
- `posts.*` → `"post"`
- `users.*` → `"user"`
- `dm.*` → `"direct_message"`
- `lists.*` → `"list"`
- `spaces.*` → `"space"`
- `communities.*` → `"community"`
- `communityNotes.*` → `"community_note"`
- `trends.*` → `"trend"`
- `news.*` → `"news"`
- `media.*` → `"media"`
- `usage.*` → `"usage"`

## Implementation Plan

### Files to create

1. **`packages/connectors/src/services/x.ts`** — X service definition with `manualTokenAuth`
2. **`packages/connectors/src/connectors/x.ts`** — X connector (methods array, execute function, help)

### Files to modify

3. **`packages/connectors/src/types.ts`** — Add `ManualTokenAuthConfig` interface, add `manualTokenAuth?` to `ServiceDefinition`
4. **`packages/connectors/src/manager.ts`** — Add `connectManualToken(serviceId, token)` method
5. **`packages/connectors/src/index.ts`** — Export `xConnector` and `xService`
6. **`apps/keepd/src/server.ts`** — Register X connector & service, add `POST /api/connections/manual-token` route
7. **`apps/ui/`** — Add X to connection UI with manual token input (details TBD)

### Execution order

1. Types (`ManualTokenAuthConfig`)
2. Service definition (`x.ts`)
3. Connector implementation (`x.ts`) — biggest file, ~800-1000 lines
4. ConnectionManager changes
5. keepd registration + API route
6. UI (separate pass)

### Rate Limiting

X API has strict rate limits. The connector will:
- Pass `x-rate-limit-remaining` and `x-rate-limit-reset` headers through in the response when available
- On 429 responses, return an RPC error with `retryAfter` field so the agent knows when to retry
- No automatic retries in the connector — agents handle backoff

### Pagination

XDK methods that return paginated data return `Paginator` objects. The connector calls the initial fetch and returns:

```json
{
  "data": [...],
  "includes": { ... },
  "meta": {
    "resultCount": 10,
    "nextToken": "abc123"
  }
}
```

Agent passes `paginationToken: "abc123"` on next call to get the next page. Same pattern as Gmail's `pageToken`.

## Decisions (Resolved)

1. **Auth**: OAuth 1.0a with 4 user-provided credentials from console.x.com — full read+write access
2. **Streaming**: Skipped for v1 — doesn't fit request/response agentic model
3. **Pagination**: Single-page fetch, return nextToken, agent paginates manually (like Gmail)
4. **Rate limiting**: Pass rate limit info in responses, return retryAfter on 429 errors
5. **Field expansions**: No defaults — pass through what agents request. Available field names listed in method help/`syntax`
