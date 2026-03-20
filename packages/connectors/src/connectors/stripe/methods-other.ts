import type { ConnectorMethod } from '@keepai/proto';
import { ID_PARAM, METADATA_PARAM, LIST_PARAMS, crudMethods } from './params.js';

// ===== OTHER =====
export const otherMethods: ConnectorMethod[] = [
  // Terminal
  ...crudMethods('terminal.configurations', 'terminal configuration', { create: { params: [] }, list: {}, del: {} }),
  { name: 'terminal.connectionTokens.create', description: 'Create a terminal connection token', operationType: 'write', params: [], returns: 'Connection token' },
  ...crudMethods('terminal.locations', 'terminal location', {
    create: { params: [{ name: 'display_name', type: 'string', required: true, description: 'Display name' }, { name: 'address', type: 'object', required: true, description: 'Address' }] },
    list: {}, del: {},
  }),
  ...crudMethods('terminal.readers', 'terminal reader', {
    create: { params: [{ name: 'registration_code', type: 'string', required: true, description: 'Registration code' }, { name: 'label', type: 'string', required: false, description: 'Label' }, { name: 'location', type: 'string', required: false, description: 'Location ID' }] },
    list: {}, del: {},
    extra: [
      { name: 'terminal.readers.cancelAction', description: 'Cancel current reader action', operationType: 'write', params: [ID_PARAM], returns: 'Reader' },
      { name: 'terminal.readers.processPaymentIntent', description: 'Initiate payment on a reader', operationType: 'write', params: [ID_PARAM, { name: 'payment_intent', type: 'string', required: true, description: 'PaymentIntent ID' }], returns: 'Reader' },
      { name: 'terminal.readers.processSetupIntent', description: 'Initiate SetupIntent on a reader', operationType: 'write', params: [ID_PARAM, { name: 'setup_intent', type: 'string', required: true, description: 'SetupIntent ID' }], returns: 'Reader' },
      { name: 'terminal.readers.refundPayment', description: 'Initiate in-person refund', operationType: 'write', params: [ID_PARAM], returns: 'Reader' },
      { name: 'terminal.readers.collectInputs', description: 'Collect inputs from reader display', operationType: 'write', params: [ID_PARAM, { name: 'inputs', type: 'array', required: true, description: 'Input configs' }], returns: 'Reader' },
      { name: 'terminal.readers.collectPaymentMethod', description: 'Collect payment method on reader', operationType: 'write', params: [ID_PARAM, { name: 'payment_intent', type: 'string', required: true, description: 'PaymentIntent ID' }], returns: 'Reader' },
      { name: 'terminal.readers.confirmPaymentIntent', description: 'Finalize payment on reader', operationType: 'write', params: [ID_PARAM, { name: 'payment_intent', type: 'string', required: true, description: 'PaymentIntent ID' }], returns: 'Reader' },
    ],
  }),

  // Identity
  ...crudMethods('identity.verificationSessions', 'verification session', {
    create: { params: [{ name: 'type', type: 'string', required: true, description: 'document or id_number' }] },
    list: {},
    extra: [
      { name: 'identity.verificationSessions.cancel', description: 'Cancel a verification session', operationType: 'write', params: [ID_PARAM], returns: 'Canceled session' },
      { name: 'identity.verificationSessions.redact', description: 'Redact all collected info', operationType: 'delete', params: [ID_PARAM], returns: 'Redacted session' },
    ],
  }),
  { name: 'identity.verificationReports.retrieve', description: 'Retrieve a verification report', operationType: 'read', params: [ID_PARAM], returns: 'Report' },
  { name: 'identity.verificationReports.list', description: 'List verification reports', operationType: 'read', params: LIST_PARAMS, returns: 'List of reports' },

  // Financial Connections
  { name: 'financialConnections.accounts.retrieve', description: 'Retrieve a financial connections account', operationType: 'read', params: [ID_PARAM], returns: 'Account' },
  { name: 'financialConnections.accounts.list', description: 'List financial connections accounts', operationType: 'read', params: LIST_PARAMS, returns: 'List of accounts' },
  { name: 'financialConnections.accounts.disconnect', description: 'Disconnect an account', operationType: 'write', params: [ID_PARAM], returns: 'Disconnected account' },
  { name: 'financialConnections.accounts.listOwners', description: 'List account owners', operationType: 'read', params: [ID_PARAM, { name: 'ownership', type: 'string', required: true, description: 'Ownership ID' }, ...LIST_PARAMS], returns: 'List of owners' },
  { name: 'financialConnections.accounts.refresh', description: 'Refresh account data', operationType: 'write', params: [ID_PARAM, { name: 'features', type: 'array', required: true, description: 'Features to refresh' }], returns: 'Refreshed account' },
  { name: 'financialConnections.accounts.subscribe', description: 'Subscribe to periodic data refresh', operationType: 'write', params: [ID_PARAM, { name: 'features', type: 'array', required: true, description: 'Features to subscribe' }], returns: 'Account' },
  { name: 'financialConnections.accounts.unsubscribe', description: 'Unsubscribe from periodic refresh', operationType: 'write', params: [ID_PARAM, { name: 'features', type: 'array', required: true, description: 'Features to unsubscribe' }], returns: 'Account' },
  { name: 'financialConnections.sessions.create', description: 'Create a financial connections session', operationType: 'write', params: [{ name: 'account_holder', type: 'object', required: true, description: '{ type, customer? }' }, { name: 'permissions', type: 'array', required: true, description: 'Requested permissions' }], returns: 'Session' },
  { name: 'financialConnections.sessions.retrieve', description: 'Retrieve a session', operationType: 'read', params: [ID_PARAM], returns: 'Session' },
  { name: 'financialConnections.transactions.retrieve', description: 'Retrieve a transaction', operationType: 'read', params: [ID_PARAM], returns: 'Transaction' },
  { name: 'financialConnections.transactions.list', description: 'List transactions', operationType: 'read', params: [{ name: 'account', type: 'string', required: true, description: 'Account ID' }, ...LIST_PARAMS], returns: 'List of transactions' },

  // Tax
  { name: 'tax.calculations.create', description: 'Calculate tax', operationType: 'write', params: [{ name: 'currency', type: 'string', required: true, description: 'Currency' }, { name: 'line_items', type: 'array', required: true, description: 'Line items' }, { name: 'customer_details', type: 'object', required: true, description: 'Customer details' }], returns: 'Tax calculation' },
  { name: 'tax.calculations.retrieve', description: 'Retrieve a tax calculation', operationType: 'read', params: [ID_PARAM], returns: 'Tax calculation' },
  { name: 'tax.calculations.listLineItems', description: 'List tax calculation line items', operationType: 'read', params: [ID_PARAM, ...LIST_PARAMS], returns: 'List of line items' },
  ...crudMethods('tax.registrations', 'tax registration', {
    create: { params: [{ name: 'country', type: 'string', required: true, description: 'Country code' }, { name: 'country_options', type: 'object', required: true, description: 'Country-specific options' }, { name: 'active_from', type: 'string', required: true, description: 'When registration becomes active' }] },
    list: {},
  }),
  { name: 'tax.settings.retrieve', description: 'Retrieve tax settings', operationType: 'read', params: [], returns: 'Tax settings' },
  { name: 'tax.settings.update', description: 'Update tax settings', operationType: 'write', params: [{ name: 'defaults', type: 'object', required: false, description: 'Default tax settings' }], returns: 'Updated settings' },
  { name: 'tax.transactions.retrieve', description: 'Retrieve a tax transaction', operationType: 'read', params: [ID_PARAM], returns: 'Tax transaction' },
  { name: 'tax.transactions.createFromCalculation', description: 'Create tax transaction from calculation', operationType: 'write', params: [{ name: 'calculation', type: 'string', required: true, description: 'Calculation ID' }, { name: 'reference', type: 'string', required: true, description: 'Reference' }], returns: 'Tax transaction' },
  { name: 'tax.transactions.createReversal', description: 'Reverse a tax transaction', operationType: 'write', params: [{ name: 'original_transaction', type: 'string', required: true, description: 'Original transaction ID' }, { name: 'reference', type: 'string', required: true, description: 'Reference' }, { name: 'mode', type: 'string', required: true, description: 'full or partial' }], returns: 'Tax transaction reversal' },
  { name: 'tax.transactions.listLineItems', description: 'List tax transaction line items', operationType: 'read', params: [ID_PARAM, ...LIST_PARAMS], returns: 'List of line items' },

  // Radar
  { name: 'radar.earlyFraudWarnings.retrieve', description: 'Retrieve an early fraud warning', operationType: 'read', params: [ID_PARAM], returns: 'Fraud warning' },
  { name: 'radar.earlyFraudWarnings.list', description: 'List early fraud warnings', operationType: 'read', params: LIST_PARAMS, returns: 'List of warnings' },
  ...crudMethods('radar.valueLists', 'value list', {
    create: { params: [{ name: 'alias', type: 'string', required: true, description: 'Alias' }, { name: 'name', type: 'string', required: true, description: 'Name' }, { name: 'item_type', type: 'string', required: false, description: 'Type of items' }] },
    list: {}, del: {},
  }),
  ...crudMethods('radar.valueListItems', 'value list item', {
    create: { params: [{ name: 'value_list', type: 'string', required: true, description: 'Value list ID' }, { name: 'value', type: 'string', required: true, description: 'Value' }] },
    list: { params: [{ name: 'value_list', type: 'string', required: true, description: 'Value list ID' }] },
    del: {},
  }),

  // Reporting
  { name: 'reporting.reportRuns.create', description: 'Create and run a report', operationType: 'write', params: [{ name: 'report_type', type: 'string', required: true, description: 'Report type' }, { name: 'parameters', type: 'object', required: false, description: 'Report parameters' }], returns: 'Report run' },
  { name: 'reporting.reportRuns.retrieve', description: 'Retrieve a report run', operationType: 'read', params: [ID_PARAM], returns: 'Report run' },
  { name: 'reporting.reportRuns.list', description: 'List report runs', operationType: 'read', params: LIST_PARAMS, returns: 'List of runs' },
  { name: 'reporting.reportTypes.retrieve', description: 'Retrieve a report type', operationType: 'read', params: [ID_PARAM], returns: 'Report type' },
  { name: 'reporting.reportTypes.list', description: 'List report types', operationType: 'read', params: LIST_PARAMS, returns: 'List of types' },

  // Sigma
  { name: 'sigma.scheduledQueryRuns.retrieve', description: 'Retrieve a scheduled query run', operationType: 'read', params: [ID_PARAM], returns: 'Query run' },
  { name: 'sigma.scheduledQueryRuns.list', description: 'List scheduled query runs', operationType: 'read', params: LIST_PARAMS, returns: 'List of runs' },

  // Events
  { name: 'events.retrieve', description: 'Retrieve an event (30-day retention)', operationType: 'read', params: [ID_PARAM], returns: 'Event' },
  { name: 'events.list', description: 'List events (up to 30 days)', operationType: 'read', params: [{ name: 'type', type: 'string', required: false, description: 'Filter by event type' }, { name: 'types', type: 'array', required: false, description: 'Filter by multiple types' }, { name: 'created', type: 'object', required: false, description: 'Filter by date' }, ...LIST_PARAMS], returns: 'List of events' },

  // Files
  { name: 'files.create', description: 'Upload a file', operationType: 'write', params: [{ name: 'file', type: 'string', required: true, description: 'File data (base64)' }, { name: 'purpose', type: 'string', required: true, description: 'dispute_evidence, identity_document, business_logo, etc.' }], returns: 'File object' },
  { name: 'files.retrieve', description: 'Retrieve a file', operationType: 'read', params: [ID_PARAM], returns: 'File object' },
  { name: 'files.list', description: 'List files', operationType: 'read', params: [{ name: 'purpose', type: 'string', required: false, description: 'Filter by purpose' }, ...LIST_PARAMS], returns: 'List of files' },

  // FileLinks
  ...crudMethods('fileLinks', 'file link', {
    create: { params: [{ name: 'file', type: 'string', required: true, description: 'File ID' }, { name: 'expires_at', type: 'number', required: false, description: 'Expiry (unix timestamp)' }] },
    list: {},
  }),

  // WebhookEndpoints
  ...crudMethods('webhookEndpoints', 'webhook endpoint', {
    create: {
      params: [
        { name: 'url', type: 'string', required: true, description: 'Webhook URL' },
        { name: 'enabled_events', type: 'array', required: true, description: 'Events to subscribe to' },
        { name: 'description', type: 'string', required: false, description: 'Description' },
      ],
    },
    list: {}, del: {},
  }),

  // Reviews
  { name: 'reviews.retrieve', description: 'Retrieve a review', operationType: 'read', params: [ID_PARAM], returns: 'Review' },
  { name: 'reviews.list', description: 'List open reviews', operationType: 'read', params: LIST_PARAMS, returns: 'List of reviews' },
  { name: 'reviews.approve', description: 'Approve a review', operationType: 'write', params: [ID_PARAM], returns: 'Approved review' },

  // ApplePayDomains
  ...crudMethods('applePayDomains', 'Apple Pay domain', {
    create: { params: [{ name: 'domain_name', type: 'string', required: true, description: 'Domain name' }] },
    list: {}, del: {},
  }),

  // EphemeralKeys
  { name: 'ephemeralKeys.create', description: 'Create a short-lived API key', operationType: 'write', params: [{ name: 'customer', type: 'string', required: false, description: 'Customer ID' }, { name: 'issuing_card', type: 'string', required: false, description: 'Issuing card ID' }], returns: 'Ephemeral key' },
  { name: 'ephemeralKeys.delete', description: 'Invalidate an ephemeral key', operationType: 'delete', params: [ID_PARAM], returns: 'Deleted key' },

  // CustomerSessions
  { name: 'customerSessions.create', description: 'Create a customer session', operationType: 'write', params: [{ name: 'customer', type: 'string', required: true, description: 'Customer ID' }, { name: 'components', type: 'object', required: true, description: 'Components config' }], returns: 'Customer session' },

  // apps.secrets
  { name: 'apps.secrets.create', description: 'Create or replace a secret', operationType: 'write', params: [{ name: 'name', type: 'string', required: true, description: 'Secret name' }, { name: 'payload', type: 'string', required: true, description: 'Secret value' }, { name: 'scope', type: 'object', required: true, description: 'Scope' }], returns: 'Secret' },
  { name: 'apps.secrets.find', description: 'Find a secret by name', operationType: 'read', params: [{ name: 'name', type: 'string', required: true, description: 'Secret name' }, { name: 'scope', type: 'object', required: true, description: 'Scope' }], returns: 'Secret' },
  { name: 'apps.secrets.list', description: 'List secrets', operationType: 'read', params: [{ name: 'scope', type: 'object', required: true, description: 'Scope' }, ...LIST_PARAMS], returns: 'List of secrets' },
  { name: 'apps.secrets.deleteWhere', description: 'Delete a secret by name', operationType: 'delete', params: [{ name: 'name', type: 'string', required: true, description: 'Secret name' }, { name: 'scope', type: 'object', required: true, description: 'Scope' }], returns: 'Deleted secret' },

  // entitlements
  { name: 'entitlements.activeEntitlements.retrieve', description: 'Retrieve an active entitlement', operationType: 'read', params: [ID_PARAM], returns: 'Entitlement' },
  { name: 'entitlements.activeEntitlements.list', description: 'List active entitlements', operationType: 'read', params: [{ name: 'customer', type: 'string', required: true, description: 'Customer ID' }, ...LIST_PARAMS], returns: 'List of entitlements' },
  ...crudMethods('entitlements.features', 'entitlement feature', {
    create: { params: [{ name: 'lookup_key', type: 'string', required: true, description: 'Lookup key' }, { name: 'name', type: 'string', required: true, description: 'Name' }] },
    list: {},
  }),

  // forwarding
  { name: 'forwarding.requests.create', description: 'Create a forwarding request', operationType: 'write', params: [{ name: 'payment_method', type: 'string', required: true, description: 'Payment method ID' }, { name: 'url', type: 'string', required: true, description: 'Destination URL' }, { name: 'request', type: 'object', required: true, description: 'Request config' }], returns: 'Forwarding request' },
  { name: 'forwarding.requests.retrieve', description: 'Retrieve a forwarding request', operationType: 'read', params: [ID_PARAM], returns: 'Forwarding request' },
  { name: 'forwarding.requests.list', description: 'List forwarding requests', operationType: 'read', params: LIST_PARAMS, returns: 'List of requests' },

  // PaymentAttemptRecords
  { name: 'paymentAttemptRecords.retrieve', description: 'Retrieve a payment attempt record', operationType: 'read', params: [ID_PARAM], returns: 'Payment attempt record' },
  { name: 'paymentAttemptRecords.list', description: 'List payment attempt records', operationType: 'read', params: [{ name: 'payment_record', type: 'string', required: true, description: 'Payment record ID' }, ...LIST_PARAMS], returns: 'List of records' },

  // PaymentRecords
  { name: 'paymentRecords.retrieve', description: 'Retrieve a payment record', operationType: 'read', params: [ID_PARAM], returns: 'Payment record' },
];
