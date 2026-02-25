// @keepai/connectors — OAuth + service connectors (Gmail, Notion)

// Types
export * from './types.js';

// OAuth handler
export { OAuthHandler, tokenResponseToCredentials, type RevokeResult } from './oauth.js';

// Credential storage
export { CredentialStore } from './store.js';

// Build-time credentials
export {
  getGoogleCredentials,
  getNotionCredentials,
  getCredentialsForService,
  hasCredentialsForService,
} from './credentials.js';

// Connection manager
export { ConnectionManager, AuthError } from './manager.js';

// Database adapter
export {
  ConnectionDbAdapter,
  createConnectionDbAdapter,
  type DbConnection,
  type DbConnectionStore,
} from './db-adapter.js';

// Service definitions (OAuth configs)
export {
  gmailService,
  googleOAuthBase,
  fetchGoogleProfile,
  type GoogleProfile,
} from './services/google.js';

export { notionService } from './services/notion.js';

// Connectors (method registries + execution)
export { gmailConnector } from './connectors/gmail.js';
export { notionConnector } from './connectors/notion.js';

// Executor (registry + dispatcher)
export { ConnectorExecutor } from './executor.js';
