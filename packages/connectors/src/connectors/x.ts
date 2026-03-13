/**
 * X (Twitter) connector — 62 methods covering posts, users, DMs, lists,
 * spaces, communities, community notes, trends, news, media, and usage.
 */

import { Client, OAuth1 } from '@xdevplatform/xdk';
import type {
  Connector,
  ConnectorMethod,
  PermissionMetadata,
  ServiceHelp,
  OAuthCredentials,
} from '@keepai/proto';

// ---------------------------------------------------------------------------
// SDK client helper
// ---------------------------------------------------------------------------

function getClient(credentials: OAuthCredentials): Client {
  const meta = ((credentials as any).metadata ?? {}) as Record<string, string>;
  return new Client({
    oauth1: new OAuth1({
      apiKey: meta.apiKey,
      apiSecret: meta.apiSecret,
      accessToken: credentials.accessToken,
      accessTokenSecret: meta.accessTokenSecret,
      callback: 'oob',
    }),
  });
}

// ---------------------------------------------------------------------------
// Common param schemas (reused across methods)
// ---------------------------------------------------------------------------

const TWEET_FIELDS_PARAM = {
  name: 'tweetFields',
  type: 'array' as const,
  required: false,
  description: 'Additional tweet fields to include in the response.',
  syntax: [
    'created_at', 'author_id', 'public_metrics', 'entities',
    'referenced_tweets', 'conversation_id', 'attachments',
    'geo', 'context_annotations', 'withheld', 'reply_settings',
    'lang', 'source', 'non_public_metrics', 'organic_metrics',
  ],
};

const USER_FIELDS_PARAM = {
  name: 'userFields',
  type: 'array' as const,
  required: false,
  description: 'Additional user fields to include in the response.',
  syntax: [
    'name', 'username', 'description', 'public_metrics',
    'profile_image_url', 'verified', 'created_at', 'location',
    'url', 'pinned_tweet_id', 'protected', 'entities',
  ],
};

const EXPANSIONS_PARAM = {
  name: 'expansions',
  type: 'array' as const,
  required: false,
  description: 'Expand related objects inline (adds "includes" to response).',
  syntax: [
    'author_id', 'attachments.media_keys', 'referenced_tweets.id',
    'in_reply_to_user_id', 'attachments.poll_ids', 'geo.place_id',
    'entities.mentions.username', 'referenced_tweets.id.author_id',
  ],
};

const MAX_RESULTS_PARAM = {
  name: 'maxResults',
  type: 'number' as const,
  required: false,
  description: 'Maximum number of results to return per page',
};

const PAGINATION_TOKEN_PARAM = {
  name: 'paginationToken',
  type: 'string' as const,
  required: false,
  description: 'Token for paginating to next page of results (from previous response meta.nextToken)',
};

// ---------------------------------------------------------------------------
// Human-readable request descriptions
// ---------------------------------------------------------------------------

function describeXRequest(method: string, params: Record<string, unknown>): string {
  switch (method) {
    // Posts
    case 'posts.get':
      return `Get post ${params.id || '(unknown)'}`;
    case 'posts.getBatch':
      return `Get ${Array.isArray(params.ids) ? params.ids.length : '?'} posts`;
    case 'posts.create':
      return `Create post: "${String(params.text || '').slice(0, 60)}"`;
    case 'posts.delete':
      return `Delete post ${params.id || '(unknown)'}`;
    case 'posts.searchRecent':
      return `Search recent posts: "${params.query}"`;
    case 'posts.searchAll':
      return `Full-archive search: "${params.query}"`;
    case 'posts.getQuoted':
      return `Get quote posts of ${params.id || '(unknown)'}`;
    case 'posts.getReposts':
      return `Get reposts of ${params.id || '(unknown)'}`;
    case 'posts.getRepostedBy':
      return `Get users who reposted ${params.id || '(unknown)'}`;
    case 'posts.hideReply':
      return `${params.hidden ? 'Hide' : 'Unhide'} reply ${params.id || '(unknown)'}`;
    case 'posts.getAnalytics':
      return `Get analytics for ${Array.isArray(params.ids) ? params.ids.length : '?'} posts`;
    case 'posts.getInsights':
      return `Get 28-hour insights for ${Array.isArray(params.tweetIds) ? params.tweetIds.length : '?'} posts`;

    // Users
    case 'users.getMe':
      return 'Get authenticated user profile';
    case 'users.get':
      return `Get user ${params.id || '(unknown)'}`;
    case 'users.getBatch':
      return `Get ${Array.isArray(params.ids) ? params.ids.length : '?'} users`;
    case 'users.getByUsername':
      return `Look up user @${params.username || '(unknown)'}`;
    case 'users.getFollowers':
      return `Get followers of user ${params.id || '(unknown)'}`;
    case 'users.getFollowing':
      return `Get following of user ${params.id || '(unknown)'}`;
    case 'users.follow':
      return `Follow user ${params.targetUserId || '(unknown)'}`;
    case 'users.unfollow':
      return `Unfollow user ${params.targetUserId || '(unknown)'}`;
    case 'users.getMentions':
      return `Get mentions of user ${params.id || '(unknown)'}`;
    case 'users.getTimeline':
      return `Get timeline of user ${params.id || '(unknown)'}`;
    case 'users.getLikedPosts':
      return `Get posts liked by user ${params.id || '(unknown)'}`;
    case 'users.like':
      return `Like post ${params.tweetId || '(unknown)'}`;
    case 'users.unlike':
      return `Unlike post ${params.tweetId || '(unknown)'}`;
    case 'users.getBookmarks':
      return 'Get bookmarks';
    case 'users.bookmark':
      return `Bookmark post ${params.tweetId || '(unknown)'}`;
    case 'users.removeBookmark':
      return `Remove bookmark for post ${params.tweetId || '(unknown)'}`;
    case 'users.getBlocking':
      return 'Get blocked users';

    // DMs
    case 'dm.getEvents':
      return 'List recent DM events';
    case 'dm.getEventsByConversation':
      return `Get DMs in conversation ${params.id || '(unknown)'}`;
    case 'dm.getEventsByParticipant':
      return `Get DMs with user ${params.participantId || '(unknown)'}`;
    case 'dm.send':
      return `Send DM to user ${params.participantId || '(unknown)'}`;
    case 'dm.sendToConversation':
      return `Send DM to conversation ${params.id || '(unknown)'}`;
    case 'dm.createConversation':
      return 'Create group DM conversation';

    // Lists
    case 'lists.get':
      return `Get list ${params.id || '(unknown)'}`;
    case 'lists.getPosts':
      return `Get posts in list ${params.id || '(unknown)'}`;
    case 'lists.getMembers':
      return `Get members of list ${params.id || '(unknown)'}`;
    case 'lists.getFollowers':
      return `Get followers of list ${params.id || '(unknown)'}`;
    case 'lists.create':
      return `Create list "${params.name || '(unnamed)'}"`;
    case 'lists.update':
      return `Update list ${params.id || '(unknown)'}`;
    case 'lists.delete':
      return `Delete list ${params.id || '(unknown)'}`;
    case 'lists.addMember':
      return `Add member to list ${params.id || '(unknown)'}`;

    // Spaces
    case 'spaces.get':
      return `Get space ${params.id || '(unknown)'}`;
    case 'spaces.getBatch':
      return `Get ${Array.isArray(params.ids) ? params.ids.length : '?'} spaces`;
    case 'spaces.search':
      return `Search spaces: "${params.query}"`;
    case 'spaces.getPosts':
      return `Get posts in space ${params.id || '(unknown)'}`;

    // Communities
    case 'communities.get':
      return `Get community ${params.id || '(unknown)'}`;
    case 'communities.search':
      return `Search communities: "${params.query}"`;

    // Community Notes
    case 'communityNotes.create':
      return 'Create community note';
    case 'communityNotes.evaluate':
      return 'Evaluate community note';
    case 'communityNotes.search':
      return 'Search community notes';
    case 'communityNotes.delete':
      return `Delete community note ${params.id || '(unknown)'}`;

    // Trends
    case 'trends.getByLocation':
      return `Get trends for WOEID ${params.woeid || '(unknown)'}`;
    case 'trends.getPersonalized':
      return 'Get personalized trends';

    // News
    case 'news.search':
      return `Search news: "${params.query}"`;
    case 'news.get':
      return `Get news story ${params.id || '(unknown)'}`;

    // Media
    case 'media.upload':
      return 'Upload media';
    case 'media.getStatus':
      return `Check upload status ${params.id || '(unknown)'}`;
    case 'media.getAnalytics':
      return `Get media analytics for ${Array.isArray(params.ids) ? params.ids.length : '?'} items`;

    // Usage
    case 'usage.get':
      return 'Get API usage statistics';

    default:
      return `X ${method}`;
  }
}

// ---------------------------------------------------------------------------
// Method definitions
// ---------------------------------------------------------------------------

const methods: ConnectorMethod[] = [
  // ===== POSTS =====
  {
    name: 'posts.get',
    description: 'Get a post by ID',
    operationType: 'read',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Post ID' },
      TWEET_FIELDS_PARAM,
      USER_FIELDS_PARAM,
      EXPANSIONS_PARAM,
    ],
    returns: 'Post object with id, text, and requested fields',
    example: { params: { id: '1234567890' }, description: 'Get a specific post' },
    seeAlso: ['posts.getBatch', 'posts.searchRecent'],
  },
  {
    name: 'posts.getBatch',
    description: 'Get multiple posts by IDs',
    operationType: 'read',
    params: [
      { name: 'ids', type: 'array', required: true, description: 'Array of post IDs (max 100)' },
      TWEET_FIELDS_PARAM,
      USER_FIELDS_PARAM,
      EXPANSIONS_PARAM,
    ],
    returns: 'Array of post objects',
    example: { params: { ids: ['123', '456'] }, description: 'Get two posts' },
    notes: ['Maximum 100 IDs per request'],
    seeAlso: ['posts.get'],
  },
  {
    name: 'posts.create',
    description: 'Create a new post (tweet)',
    operationType: 'write',
    params: [
      { name: 'text', type: 'string', required: true, description: 'Post text (max 280 characters)' },
      { name: 'reply', type: 'object', required: false, description: 'Reply settings: { in_reply_to_tweet_id: string }' },
      { name: 'quote_tweet_id', type: 'string', required: false, description: 'Post ID to quote' },
      { name: 'media', type: 'object', required: false, description: 'Media to attach: { media_ids: string[] }' },
      { name: 'poll', type: 'object', required: false, description: 'Poll: { options: string[], duration_minutes: number }' },
    ],
    returns: 'Created post with id and text',
    example: { params: { text: 'Hello from KeepAI!' }, description: 'Create a simple post' },
    seeAlso: ['posts.delete', 'media.upload'],
  },
  {
    name: 'posts.delete',
    description: 'Delete a post',
    operationType: 'delete',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Post ID to delete' },
    ],
    returns: 'Deletion confirmation',
    seeAlso: ['posts.create'],
  },
  {
    name: 'posts.searchRecent',
    description: 'Search posts from the last 7 days',
    operationType: 'read',
    params: [
      { name: 'query', type: 'string', required: true, description: 'Search query (X search syntax)', syntax: [
        'keyword                       Posts containing keyword',
        'from:username                  Posts from a user',
        'to:username                    Posts replying to a user',
        '@username                      Posts mentioning a user',
        '#hashtag                       Posts with hashtag',
        'has:media                      Posts with media',
        'has:links                      Posts with links',
        'is:retweet                     Retweets only',
        '-is:retweet                    Exclude retweets',
        'lang:en                        Posts in English',
        'Combine with spaces (AND) or use OR',
      ] },
      MAX_RESULTS_PARAM,
      PAGINATION_TOKEN_PARAM,
      { name: 'startTime', type: 'string', required: false, description: 'Start time (ISO 8601)' },
      { name: 'endTime', type: 'string', required: false, description: 'End time (ISO 8601)' },
      { name: 'sortOrder', type: 'string', required: false, description: 'Sort order', enum: ['recency', 'relevancy'] },
      TWEET_FIELDS_PARAM,
      USER_FIELDS_PARAM,
      EXPANSIONS_PARAM,
    ],
    returns: 'List of matching posts with pagination',
    example: { params: { query: 'from:elonmusk', maxResults: 10 }, description: 'Search recent posts from a user' },
    notes: [
      "When response contains meta.nextToken, pass it as paginationToken to get the next page",
    ],
    seeAlso: ['posts.searchAll'],
  },
  {
    name: 'posts.searchAll',
    description: 'Full-archive search (all time)',
    operationType: 'read',
    params: [
      { name: 'query', type: 'string', required: true, description: 'Search query (X search syntax)' },
      MAX_RESULTS_PARAM,
      PAGINATION_TOKEN_PARAM,
      { name: 'startTime', type: 'string', required: false, description: 'Start time (ISO 8601)' },
      { name: 'endTime', type: 'string', required: false, description: 'End time (ISO 8601)' },
      { name: 'sortOrder', type: 'string', required: false, description: 'Sort order', enum: ['recency', 'relevancy'] },
      TWEET_FIELDS_PARAM,
      USER_FIELDS_PARAM,
      EXPANSIONS_PARAM,
    ],
    returns: 'List of matching posts with pagination',
    notes: ['Requires Academic Research or similar access level'],
    seeAlso: ['posts.searchRecent'],
  },
  {
    name: 'posts.getQuoted',
    description: 'Get posts that quote a specific post',
    operationType: 'read',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Post ID to find quotes of' },
      MAX_RESULTS_PARAM,
      PAGINATION_TOKEN_PARAM,
      TWEET_FIELDS_PARAM,
      USER_FIELDS_PARAM,
      EXPANSIONS_PARAM,
    ],
    returns: 'List of quote posts',
    seeAlso: ['posts.getReposts'],
  },
  {
    name: 'posts.getReposts',
    description: 'Get reposts of a specific post',
    operationType: 'read',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Post ID to find reposts of' },
      MAX_RESULTS_PARAM,
      PAGINATION_TOKEN_PARAM,
      TWEET_FIELDS_PARAM,
      USER_FIELDS_PARAM,
      EXPANSIONS_PARAM,
    ],
    returns: 'List of reposts',
    seeAlso: ['posts.getQuoted', 'posts.getRepostedBy'],
  },
  {
    name: 'posts.getRepostedBy',
    description: 'Get users who reposted a specific post',
    operationType: 'read',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Post ID' },
      MAX_RESULTS_PARAM,
      PAGINATION_TOKEN_PARAM,
      USER_FIELDS_PARAM,
    ],
    returns: 'List of users who reposted',
    seeAlso: ['posts.getReposts'],
  },
  {
    name: 'posts.hideReply',
    description: 'Hide or unhide a reply to your post',
    operationType: 'write',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Reply post ID to hide/unhide' },
      { name: 'hidden', type: 'boolean', required: true, description: 'true to hide, false to unhide' },
    ],
    returns: 'Updated hidden status',
  },
  {
    name: 'posts.getAnalytics',
    description: 'Get engagement analytics for posts',
    operationType: 'read',
    params: [
      { name: 'ids', type: 'array', required: true, description: 'Post IDs to get analytics for' },
      { name: 'startTime', type: 'string', required: true, description: 'Start time (ISO 8601)' },
      { name: 'endTime', type: 'string', required: true, description: 'End time (ISO 8601)' },
      { name: 'granularity', type: 'string', required: true, description: 'Time granularity', enum: ['day', 'hour'] },
    ],
    returns: 'Analytics data with impressions, engagements, etc.',
  },
  {
    name: 'posts.getInsights',
    description: 'Get 28-hour insights for posts',
    operationType: 'read',
    params: [
      { name: 'tweetIds', type: 'array', required: true, description: 'Post IDs' },
      { name: 'granularity', type: 'string', required: true, description: 'Time granularity', enum: ['day', 'hour'] },
      { name: 'requestedMetrics', type: 'array', required: true, description: 'Metrics to retrieve', syntax: [
        'impressions', 'engagements', 'retweets', 'quotes',
        'likes', 'replies', 'bookmarks', 'url_link_clicks',
        'profile_visits',
      ] },
    ],
    returns: 'Insights data for the requested metrics',
  },

  // ===== USERS =====
  {
    name: 'users.getMe',
    description: 'Get the authenticated user profile',
    operationType: 'read',
    params: [
      USER_FIELDS_PARAM,
    ],
    returns: 'Authenticated user object',
    seeAlso: ['users.get', 'users.getByUsername'],
  },
  {
    name: 'users.get',
    description: 'Get a user by ID',
    operationType: 'read',
    params: [
      { name: 'id', type: 'string', required: true, description: 'User ID' },
      USER_FIELDS_PARAM,
    ],
    returns: 'User object',
    seeAlso: ['users.getByUsername', 'users.getBatch'],
  },
  {
    name: 'users.getBatch',
    description: 'Get multiple users by IDs',
    operationType: 'read',
    params: [
      { name: 'ids', type: 'array', required: true, description: 'Array of user IDs (max 100)' },
      USER_FIELDS_PARAM,
    ],
    returns: 'Array of user objects',
    notes: ['Maximum 100 IDs per request'],
    seeAlso: ['users.get'],
  },
  {
    name: 'users.getByUsername',
    description: 'Get a user by username',
    operationType: 'read',
    params: [
      { name: 'username', type: 'string', required: true, description: 'Username (without @)' },
      USER_FIELDS_PARAM,
    ],
    returns: 'User object',
    example: { params: { username: 'elonmusk' }, description: 'Look up a user by handle' },
    seeAlso: ['users.get'],
  },
  {
    name: 'users.getFollowers',
    description: 'Get followers of a user',
    operationType: 'read',
    params: [
      { name: 'id', type: 'string', required: true, description: 'User ID' },
      MAX_RESULTS_PARAM,
      PAGINATION_TOKEN_PARAM,
      USER_FIELDS_PARAM,
    ],
    returns: 'Paginated list of follower user objects',
    seeAlso: ['users.getFollowing'],
  },
  {
    name: 'users.getFollowing',
    description: 'Get users that a user is following',
    operationType: 'read',
    params: [
      { name: 'id', type: 'string', required: true, description: 'User ID' },
      MAX_RESULTS_PARAM,
      PAGINATION_TOKEN_PARAM,
      USER_FIELDS_PARAM,
    ],
    returns: 'Paginated list of following user objects',
    seeAlso: ['users.getFollowers'],
  },
  {
    name: 'users.follow',
    description: 'Follow a user',
    operationType: 'write',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Your user ID (authenticated user)' },
      { name: 'targetUserId', type: 'string', required: true, description: 'User ID to follow' },
    ],
    returns: 'Follow confirmation',
    seeAlso: ['users.unfollow'],
  },
  {
    name: 'users.unfollow',
    description: 'Unfollow a user',
    operationType: 'write',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Your user ID (authenticated user)' },
      { name: 'targetUserId', type: 'string', required: true, description: 'User ID to unfollow' },
    ],
    returns: 'Unfollow confirmation',
    seeAlso: ['users.follow'],
  },
  {
    name: 'users.getMentions',
    description: 'Get posts mentioning a user',
    operationType: 'read',
    params: [
      { name: 'id', type: 'string', required: true, description: 'User ID' },
      MAX_RESULTS_PARAM,
      PAGINATION_TOKEN_PARAM,
      TWEET_FIELDS_PARAM,
      USER_FIELDS_PARAM,
      EXPANSIONS_PARAM,
    ],
    returns: 'Paginated list of posts mentioning the user',
    seeAlso: ['users.getTimeline'],
  },
  {
    name: 'users.getTimeline',
    description: "Get a user's timeline (their posts and retweets)",
    operationType: 'read',
    params: [
      { name: 'id', type: 'string', required: true, description: 'User ID' },
      MAX_RESULTS_PARAM,
      PAGINATION_TOKEN_PARAM,
      TWEET_FIELDS_PARAM,
      USER_FIELDS_PARAM,
      EXPANSIONS_PARAM,
    ],
    returns: "Paginated list of the user's timeline posts",
    seeAlso: ['users.getMentions'],
  },
  {
    name: 'users.getLikedPosts',
    description: 'Get posts liked by a user',
    operationType: 'read',
    params: [
      { name: 'id', type: 'string', required: true, description: 'User ID' },
      MAX_RESULTS_PARAM,
      PAGINATION_TOKEN_PARAM,
      TWEET_FIELDS_PARAM,
      USER_FIELDS_PARAM,
      EXPANSIONS_PARAM,
    ],
    returns: 'Paginated list of liked posts',
    seeAlso: ['users.like'],
  },
  {
    name: 'users.like',
    description: 'Like a post',
    operationType: 'write',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Your user ID (authenticated user)' },
      { name: 'tweetId', type: 'string', required: true, description: 'Post ID to like' },
    ],
    returns: 'Like confirmation',
    seeAlso: ['users.unlike', 'users.getLikedPosts'],
  },
  {
    name: 'users.unlike',
    description: 'Unlike a post',
    operationType: 'write',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Your user ID (authenticated user)' },
      { name: 'tweetId', type: 'string', required: true, description: 'Post ID to unlike' },
    ],
    returns: 'Unlike confirmation',
    seeAlso: ['users.like'],
  },
  {
    name: 'users.getBookmarks',
    description: 'Get bookmarked posts',
    operationType: 'read',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Your user ID (authenticated user)' },
      MAX_RESULTS_PARAM,
      PAGINATION_TOKEN_PARAM,
      TWEET_FIELDS_PARAM,
      USER_FIELDS_PARAM,
      EXPANSIONS_PARAM,
    ],
    returns: 'Paginated list of bookmarked posts',
    seeAlso: ['users.bookmark', 'users.removeBookmark'],
  },
  {
    name: 'users.bookmark',
    description: 'Bookmark a post',
    operationType: 'write',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Your user ID (authenticated user)' },
      { name: 'tweetId', type: 'string', required: true, description: 'Post ID to bookmark' },
    ],
    returns: 'Bookmark confirmation',
    seeAlso: ['users.removeBookmark', 'users.getBookmarks'],
  },
  {
    name: 'users.removeBookmark',
    description: 'Remove a bookmark',
    operationType: 'delete',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Your user ID (authenticated user)' },
      { name: 'tweetId', type: 'string', required: true, description: 'Post ID to remove from bookmarks' },
    ],
    returns: 'Removal confirmation',
    seeAlso: ['users.bookmark', 'users.getBookmarks'],
  },
  {
    name: 'users.getBlocking',
    description: 'Get list of users blocked by the authenticated user',
    operationType: 'read',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Your user ID (authenticated user)' },
      MAX_RESULTS_PARAM,
      PAGINATION_TOKEN_PARAM,
      USER_FIELDS_PARAM,
    ],
    returns: 'Paginated list of blocked user objects',
  },

  // ===== DIRECT MESSAGES =====
  {
    name: 'dm.getEvents',
    description: 'List recent DM events across all conversations',
    operationType: 'read',
    params: [
      MAX_RESULTS_PARAM,
      PAGINATION_TOKEN_PARAM,
    ],
    returns: 'Paginated list of DM events',
    seeAlso: ['dm.getEventsByConversation', 'dm.getEventsByParticipant'],
  },
  {
    name: 'dm.getEventsByConversation',
    description: 'Get DM events in a specific conversation',
    operationType: 'read',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Conversation ID' },
      MAX_RESULTS_PARAM,
      PAGINATION_TOKEN_PARAM,
    ],
    returns: 'Paginated list of DM events in the conversation',
    seeAlso: ['dm.getEvents', 'dm.sendToConversation'],
  },
  {
    name: 'dm.getEventsByParticipant',
    description: 'Get DM events with a specific user',
    operationType: 'read',
    params: [
      { name: 'participantId', type: 'string', required: true, description: 'User ID of the other participant' },
      MAX_RESULTS_PARAM,
      PAGINATION_TOKEN_PARAM,
    ],
    returns: 'Paginated list of DM events with the user',
    seeAlso: ['dm.getEvents', 'dm.send'],
  },
  {
    name: 'dm.send',
    description: 'Send a DM to a user',
    operationType: 'write',
    params: [
      { name: 'participantId', type: 'string', required: true, description: 'User ID to send DM to' },
      { name: 'text', type: 'string', required: true, description: 'Message text' },
      { name: 'attachments', type: 'array', required: false, description: 'Media attachment IDs' },
    ],
    returns: 'Sent DM event',
    seeAlso: ['dm.sendToConversation', 'dm.getEventsByParticipant'],
  },
  {
    name: 'dm.sendToConversation',
    description: 'Send a DM to an existing conversation',
    operationType: 'write',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Conversation ID' },
      { name: 'text', type: 'string', required: true, description: 'Message text' },
      { name: 'attachments', type: 'array', required: false, description: 'Media attachment IDs' },
    ],
    returns: 'Sent DM event',
    seeAlso: ['dm.send', 'dm.getEventsByConversation'],
  },
  {
    name: 'dm.createConversation',
    description: 'Create a new group DM conversation',
    operationType: 'write',
    params: [
      { name: 'participantIds', type: 'array', required: true, description: 'User IDs to include in the conversation' },
      { name: 'text', type: 'string', required: true, description: 'Initial message text' },
    ],
    returns: 'Created conversation with ID',
    seeAlso: ['dm.send'],
  },

  // ===== LISTS =====
  {
    name: 'lists.get',
    description: 'Get a list by ID',
    operationType: 'read',
    params: [
      { name: 'id', type: 'string', required: true, description: 'List ID' },
    ],
    returns: 'List object with id, name, description',
    seeAlso: ['lists.getPosts', 'lists.getMembers'],
  },
  {
    name: 'lists.getPosts',
    description: 'Get posts in a list',
    operationType: 'read',
    params: [
      { name: 'id', type: 'string', required: true, description: 'List ID' },
      MAX_RESULTS_PARAM,
      PAGINATION_TOKEN_PARAM,
      TWEET_FIELDS_PARAM,
      USER_FIELDS_PARAM,
      EXPANSIONS_PARAM,
    ],
    returns: 'Paginated list of posts in the list',
    seeAlso: ['lists.get', 'lists.getMembers'],
  },
  {
    name: 'lists.getMembers',
    description: 'Get members of a list',
    operationType: 'read',
    params: [
      { name: 'id', type: 'string', required: true, description: 'List ID' },
      MAX_RESULTS_PARAM,
      PAGINATION_TOKEN_PARAM,
      USER_FIELDS_PARAM,
    ],
    returns: 'Paginated list of member user objects',
    seeAlso: ['lists.get', 'lists.addMember'],
  },
  {
    name: 'lists.getFollowers',
    description: 'Get followers of a list',
    operationType: 'read',
    params: [
      { name: 'id', type: 'string', required: true, description: 'List ID' },
      MAX_RESULTS_PARAM,
      PAGINATION_TOKEN_PARAM,
      USER_FIELDS_PARAM,
    ],
    returns: 'Paginated list of follower user objects',
    seeAlso: ['lists.get'],
  },
  {
    name: 'lists.create',
    description: 'Create a new list',
    operationType: 'write',
    params: [
      { name: 'name', type: 'string', required: true, description: 'List name (max 25 characters)' },
      { name: 'description', type: 'string', required: false, description: 'List description (max 100 characters)' },
      { name: 'private', type: 'boolean', required: false, description: 'Whether the list is private' },
    ],
    returns: 'Created list with id and name',
    seeAlso: ['lists.update', 'lists.addMember'],
  },
  {
    name: 'lists.update',
    description: 'Update list details',
    operationType: 'write',
    params: [
      { name: 'id', type: 'string', required: true, description: 'List ID to update' },
      { name: 'name', type: 'string', required: false, description: 'New list name' },
      { name: 'description', type: 'string', required: false, description: 'New list description' },
      { name: 'private', type: 'boolean', required: false, description: 'Whether the list is private' },
    ],
    returns: 'Update confirmation',
    seeAlso: ['lists.get', 'lists.create'],
  },
  {
    name: 'lists.delete',
    description: 'Delete a list',
    operationType: 'delete',
    params: [
      { name: 'id', type: 'string', required: true, description: 'List ID to delete' },
    ],
    returns: 'Deletion confirmation',
    seeAlso: ['lists.create'],
  },
  {
    name: 'lists.addMember',
    description: 'Add a member to a list',
    operationType: 'write',
    params: [
      { name: 'id', type: 'string', required: true, description: 'List ID' },
      { name: 'userId', type: 'string', required: true, description: 'User ID to add' },
    ],
    returns: 'Add member confirmation',
    seeAlso: ['lists.getMembers'],
  },

  // ===== SPACES =====
  {
    name: 'spaces.get',
    description: 'Get a space by ID',
    operationType: 'read',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Space ID' },
    ],
    returns: 'Space object',
    seeAlso: ['spaces.search', 'spaces.getPosts'],
  },
  {
    name: 'spaces.getBatch',
    description: 'Get multiple spaces by IDs',
    operationType: 'read',
    params: [
      { name: 'ids', type: 'array', required: true, description: 'Array of space IDs' },
    ],
    returns: 'Array of space objects',
    seeAlso: ['spaces.get'],
  },
  {
    name: 'spaces.search',
    description: 'Search for spaces',
    operationType: 'read',
    params: [
      { name: 'query', type: 'string', required: true, description: 'Search query' },
    ],
    returns: 'List of matching spaces',
    seeAlso: ['spaces.get'],
  },
  {
    name: 'spaces.getPosts',
    description: 'Get posts shared in a space',
    operationType: 'read',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Space ID' },
      TWEET_FIELDS_PARAM,
      USER_FIELDS_PARAM,
      EXPANSIONS_PARAM,
    ],
    returns: 'List of posts shared in the space',
    seeAlso: ['spaces.get'],
  },

  // ===== COMMUNITIES =====
  {
    name: 'communities.get',
    description: 'Get a community by ID',
    operationType: 'read',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Community ID' },
    ],
    returns: 'Community object',
    seeAlso: ['communities.search'],
  },
  {
    name: 'communities.search',
    description: 'Search for communities',
    operationType: 'read',
    params: [
      { name: 'query', type: 'string', required: true, description: 'Search query' },
    ],
    returns: 'List of matching communities',
    seeAlso: ['communities.get'],
  },

  // ===== COMMUNITY NOTES =====
  {
    name: 'communityNotes.create',
    description: 'Create a community note on a post',
    operationType: 'write',
    params: [
      { name: 'tweetId', type: 'string', required: true, description: 'Post ID to annotate' },
      { name: 'text', type: 'string', required: true, description: 'Note text' },
    ],
    returns: 'Created note object',
    seeAlso: ['communityNotes.delete'],
  },
  {
    name: 'communityNotes.evaluate',
    description: 'Rate/evaluate a community note',
    operationType: 'write',
    params: [
      { name: 'noteId', type: 'string', required: true, description: 'Note ID to evaluate' },
      { name: 'rating', type: 'string', required: true, description: 'Rating value' },
    ],
    returns: 'Evaluation confirmation',
  },
  {
    name: 'communityNotes.search',
    description: 'Search community notes written by a user',
    operationType: 'read',
    params: [
      { name: 'userId', type: 'string', required: true, description: 'Author user ID' },
      { name: 'testMode', type: 'boolean', required: false, description: 'Whether to use test mode', default: false },
      MAX_RESULTS_PARAM,
      PAGINATION_TOKEN_PARAM,
    ],
    returns: 'Paginated list of community notes',
    seeAlso: ['communityNotes.create'],
  },
  {
    name: 'communityNotes.delete',
    description: 'Delete a community note',
    operationType: 'delete',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Note ID to delete' },
    ],
    returns: 'Deletion confirmation',
    seeAlso: ['communityNotes.create'],
  },

  // ===== TRENDS =====
  {
    name: 'trends.getByLocation',
    description: 'Get trending topics by location (WOEID)',
    operationType: 'read',
    params: [
      { name: 'woeid', type: 'number', required: true, description: 'Where On Earth ID (1 = worldwide, 23424977 = US, 23424975 = UK)' },
    ],
    returns: 'List of trending topics with tweet volumes',
    seeAlso: ['trends.getPersonalized'],
  },
  {
    name: 'trends.getPersonalized',
    description: 'Get personalized trends for the authenticated user',
    operationType: 'read',
    params: [],
    returns: 'List of personalized trending topics',
    seeAlso: ['trends.getByLocation'],
  },

  // ===== NEWS =====
  {
    name: 'news.search',
    description: 'Search news stories',
    operationType: 'read',
    params: [
      { name: 'query', type: 'string', required: true, description: 'Search query' },
    ],
    returns: 'List of matching news stories',
    seeAlso: ['news.get'],
  },
  {
    name: 'news.get',
    description: 'Get a news story by ID',
    operationType: 'read',
    params: [
      { name: 'id', type: 'string', required: true, description: 'News story ID' },
    ],
    returns: 'News story object',
    seeAlso: ['news.search'],
  },

  // ===== MEDIA =====
  {
    name: 'media.upload',
    description: 'Upload media (image or video) for attachment to posts',
    operationType: 'write',
    params: [
      { name: 'media_data', type: 'string', required: false, description: 'Base64-encoded media data' },
      { name: 'media_type', type: 'string', required: true, description: 'MIME type (e.g., image/jpeg, video/mp4)' },
      { name: 'media_category', type: 'string', required: false, description: 'Media category', enum: ['tweet_image', 'tweet_gif', 'tweet_video'] },
    ],
    returns: 'Upload result with media_id to use in posts.create',
    seeAlso: ['posts.create'],
  },
  {
    name: 'media.getStatus',
    description: 'Check the upload/processing status of media',
    operationType: 'read',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Media ID (from media.upload)' },
    ],
    returns: 'Upload status (pending, in_progress, succeeded, failed)',
    seeAlso: ['media.upload'],
  },
  {
    name: 'media.getAnalytics',
    description: 'Get analytics for uploaded media',
    operationType: 'read',
    params: [
      { name: 'ids', type: 'array', required: true, description: 'Media IDs' },
      { name: 'startTime', type: 'string', required: true, description: 'Start time (ISO 8601)' },
      { name: 'endTime', type: 'string', required: true, description: 'End time (ISO 8601)' },
      { name: 'granularity', type: 'string', required: true, description: 'Time granularity', enum: ['day', 'hour'] },
    ],
    returns: 'Media analytics data',
  },

  // ===== USAGE =====
  {
    name: 'usage.get',
    description: 'Get API usage statistics for your app',
    operationType: 'read',
    params: [],
    returns: 'Usage statistics with request counts and limits',
  },
];

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

function buildOpts(params: Record<string, unknown>): Record<string, unknown> {
  const opts: Record<string, unknown> = {};
  if (params.tweetFields) opts.tweetFields = params.tweetFields;
  if (params.userFields) opts.userFields = params.userFields;
  if (params.expansions) opts.expansions = params.expansions;
  if (params.maxResults) opts.maxResults = params.maxResults;
  if (params.paginationToken) opts.paginationToken = params.paginationToken;
  if (params.startTime) opts.startTime = params.startTime;
  if (params.endTime) opts.endTime = params.endTime;
  if (params.sortOrder) opts.sortOrder = params.sortOrder;
  return opts;
}

async function executeX(
  method: string,
  params: Record<string, unknown>,
  credentials: OAuthCredentials
): Promise<unknown> {
  const client = getClient(credentials);
  const opts = buildOpts(params);

  switch (method) {
    // ----- Posts -----
    case 'posts.get':
      return client.posts.getById(String(params.id), opts);

    case 'posts.getBatch':
      return client.posts.getByIds(params.ids as string[], opts);

    case 'posts.create':
      return client.posts.create({
        text: String(params.text),
        ...(params.reply ? { reply: params.reply as any } : {}),
        ...(params.quote_tweet_id ? { quote_tweet_id: String(params.quote_tweet_id) } : {}),
        ...(params.media ? { media: params.media as any } : {}),
        ...(params.poll ? { poll: params.poll as any } : {}),
      });

    case 'posts.delete':
      return client.posts.delete(String(params.id));

    case 'posts.searchRecent':
      return client.posts.searchRecent(String(params.query), opts);

    case 'posts.searchAll':
      return client.posts.searchAll(String(params.query), opts);

    case 'posts.getQuoted':
      return client.posts.getQuoted(String(params.id), opts);

    case 'posts.getReposts':
      return client.posts.getReposts(String(params.id), opts);

    case 'posts.getRepostedBy':
      return client.posts.getRepostedBy(String(params.id), opts);

    case 'posts.hideReply':
      return client.posts.hideReply(String(params.id), {
        hidden: Boolean(params.hidden),
      });

    case 'posts.getAnalytics':
      return client.posts.getAnalytics(
        params.ids as string[],
        String(params.endTime),
        String(params.startTime),
        String(params.granularity),
      );

    case 'posts.getInsights':
      return client.posts.getInsights28hr(
        params.tweetIds as string[],
        String(params.granularity),
        params.requestedMetrics as string[],
      );

    // ----- Users -----
    case 'users.getMe':
      return client.users.getMe(opts);

    case 'users.get':
      return client.users.getById(String(params.id), opts);

    case 'users.getBatch':
      return client.users.getByIds(params.ids as string[], opts);

    case 'users.getByUsername':
      return client.users.getByUsername(String(params.username), opts);

    case 'users.getFollowers':
      return client.users.getFollowers(String(params.id), opts);

    case 'users.getFollowing':
      return client.users.getFollowing(String(params.id), opts);

    case 'users.follow':
      return client.users.followUser(String(params.id), {
        body: { targetUserId: String(params.targetUserId) },
      });

    case 'users.unfollow':
      return client.users.unfollowUser(String(params.id), String(params.targetUserId));

    case 'users.getMentions':
      return client.users.getMentions(String(params.id), opts);

    case 'users.getTimeline':
      return client.users.getTimeline(String(params.id), opts);

    case 'users.getLikedPosts':
      return client.users.getLikedPosts(String(params.id), opts);

    case 'users.like':
      return client.users.likePost(String(params.id), {
        body: { tweetId: String(params.tweetId) },
      });

    case 'users.unlike':
      return client.users.unlikePost(String(params.id), String(params.tweetId));

    case 'users.getBookmarks':
      return client.users.getBookmarks(String(params.id), opts);

    case 'users.bookmark':
      return client.users.createBookmark(String(params.id), {
        tweetId: String(params.tweetId),
      });

    case 'users.removeBookmark':
      return client.users.deleteBookmark(String(params.id), String(params.tweetId));

    case 'users.getBlocking':
      return client.users.getBlocking(String(params.id), opts);

    // ----- Direct Messages -----
    case 'dm.getEvents':
      return client.directMessages.getEvents(opts);

    case 'dm.getEventsByConversation':
      return client.directMessages.getEventsByConversationId(String(params.id), opts);

    case 'dm.getEventsByParticipant':
      return client.directMessages.getEventsByParticipantId(String(params.participantId), opts);

    case 'dm.send': {
      const dmOpts: Record<string, unknown> = {
        message: { text: String(params.text) },
      };
      if (params.attachments) {
        (dmOpts.message as any).attachments = params.attachments;
      }
      return client.directMessages.createByParticipantId(
        String(params.participantId),
        dmOpts,
      );
    }

    case 'dm.sendToConversation': {
      const dmOpts: Record<string, unknown> = {
        message: { text: String(params.text) },
      };
      if (params.attachments) {
        (dmOpts.message as any).attachments = params.attachments;
      }
      return client.directMessages.createByConversationId(
        String(params.id),
        dmOpts,
      );
    }

    case 'dm.createConversation':
      return client.directMessages.createConversation({
        conversation_type: 'Group',
        participant_ids: params.participantIds as string[],
        message: { text: String(params.text) },
      });

    // ----- Lists -----
    case 'lists.get':
      return client.lists.getById(String(params.id));

    case 'lists.getPosts':
      return client.lists.getPosts(String(params.id), opts);

    case 'lists.getMembers':
      return client.lists.getMembers(String(params.id), opts);

    case 'lists.getFollowers':
      return client.lists.getFollowers(String(params.id), opts);

    case 'lists.create':
      return client.lists.create({
        name: String(params.name),
        ...(params.description ? { description: String(params.description) } : {}),
        ...(params.private !== undefined ? { private: Boolean(params.private) } : {}),
      });

    case 'lists.update':
      return client.lists.update(String(params.id), {
        ...(params.name ? { name: String(params.name) } : {}),
        ...(params.description ? { description: String(params.description) } : {}),
        ...(params.private !== undefined ? { private: Boolean(params.private) } : {}),
      });

    case 'lists.delete':
      return client.lists.delete(String(params.id));

    case 'lists.addMember':
      return client.lists.addMember(String(params.id), {
        user_id: String(params.userId),
      });

    // ----- Spaces -----
    case 'spaces.get':
      return client.spaces.getById(String(params.id));

    case 'spaces.getBatch':
      return client.spaces.getByIds(params.ids as string[]);

    case 'spaces.search':
      return client.spaces.search(String(params.query));

    case 'spaces.getPosts':
      return client.spaces.getPosts(String(params.id), opts);

    // ----- Communities -----
    case 'communities.get':
      return client.communities.getById(String(params.id));

    case 'communities.search':
      return client.communities.search(String(params.query));

    // ----- Community Notes -----
    case 'communityNotes.create':
      return client.communityNotes.create({
        tweet_id: String(params.tweetId),
        text: String(params.text),
      } as any);

    case 'communityNotes.evaluate':
      return client.communityNotes.evaluate({
        note_id: String(params.noteId),
        rating: String(params.rating),
      } as any);

    case 'communityNotes.search':
      return client.communityNotes.searchWritten(
        Boolean(params.testMode),
        { ...opts, authorId: String(params.userId) },
      );

    case 'communityNotes.delete':
      return client.communityNotes.delete(String(params.id));

    // ----- Trends -----
    case 'trends.getByLocation':
      return client.trends.getByWoeid(Number(params.woeid));

    case 'trends.getPersonalized':
      return client.trends.getPersonalized();

    // ----- News -----
    case 'news.search':
      return client.news.search(String(params.query));

    case 'news.get':
      return client.news.get(String(params.id));

    // ----- Media -----
    case 'media.upload':
      return client.media.upload({
        ...(params.media_data ? { media_data: String(params.media_data) } : {}),
        media_type: String(params.media_type),
        ...(params.media_category ? { media_category: String(params.media_category) } : {}),
      } as any);

    case 'media.getStatus':
      return client.media.getUploadStatus(String(params.id));

    case 'media.getAnalytics':
      return client.media.getAnalytics(
        params.ids as string[],
        String(params.endTime),
        String(params.startTime),
        String(params.granularity),
      );

    // ----- Usage -----
    case 'usage.get':
      return client.usage.get();

    default:
      throw new Error(`Unknown X method: ${method}`);
  }
}

// ---------------------------------------------------------------------------
// Resource type mapping
// ---------------------------------------------------------------------------

function getResourceType(method: string): string | undefined {
  const [resource] = method.split('.');
  switch (resource) {
    case 'posts': return 'post';
    case 'users': return 'user';
    case 'dm': return 'direct_message';
    case 'lists': return 'list';
    case 'spaces': return 'space';
    case 'communities': return 'community';
    case 'communityNotes': return 'community_note';
    case 'trends': return 'trend';
    case 'news': return 'news';
    case 'media': return 'media';
    case 'usage': return 'usage';
    default: return undefined;
  }
}

// ---------------------------------------------------------------------------
// Connector export
// ---------------------------------------------------------------------------

export const xConnector: Connector = {
  service: 'x',
  name: 'X',
  methods,

  extractPermMetadata(
    method: string,
    params: Record<string, unknown>,
    accountId: string
  ): PermissionMetadata {
    const methodDef = methods.find((m) => m.name === method);
    if (!methodDef) {
      throw new Error(`Unknown X method: ${method}`);
    }
    return {
      service: 'x',
      accountId,
      method,
      operationType: methodDef.operationType,
      resourceType: getResourceType(method),
      description: describeXRequest(method, params),
    };
  },

  async execute(
    method: string,
    params: Record<string, unknown>,
    credentials: OAuthCredentials
  ): Promise<unknown> {
    return executeX(method, params, credentials);
  },

  help(method?: string): ServiceHelp {
    if (method) {
      const m = methods.find((md) => md.name === method);
      return {
        service: 'x',
        name: 'X',
        summary: 'X (Twitter) — posts, users, DMs, lists, spaces, communities, trends, news, media',
        methods: m ? [m] : [],
      };
    }
    return {
      service: 'x',
      name: 'X',
      summary: 'X (Twitter) — posts, users, DMs, lists, spaces, communities, trends, news, media',
      methods,
    };
  },
};
