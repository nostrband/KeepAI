/**
 * Stripe connector — ~390 methods covering core payments, customers, products,
 * billing, connect, checkout, issuing, treasury, terminal, identity,
 * financial connections, tax, radar, reporting, sigma, and more.
 *
 * Uses the official `stripe` npm package. Auth is via API key (manual entry).
 */

import Stripe from 'stripe';
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

function getClient(credentials: OAuthCredentials): Stripe {
  const meta = ((credentials as any).metadata ?? {}) as Record<string, string>;
  return new Stripe(credentials.accessToken || meta.apiKey, {
    ...(meta?.accountId ? { stripeAccount: meta.accountId } : {}),
  });
}

// ---------------------------------------------------------------------------
// Common param helpers (reused across many methods)
// ---------------------------------------------------------------------------

const ID_PARAM = { name: 'id', type: 'string' as const, required: true, description: 'Resource ID' };
const LIMIT_PARAM = { name: 'limit', type: 'number' as const, required: false, description: 'Number of results (1-100, default 10)', default: 10 };
const STARTING_AFTER_PARAM = { name: 'starting_after', type: 'string' as const, required: false, description: 'Cursor for pagination — ID of last object from previous page' };
const ENDING_BEFORE_PARAM = { name: 'ending_before', type: 'string' as const, required: false, description: 'Cursor for reverse pagination' };
const METADATA_PARAM = { name: 'metadata', type: 'object' as const, required: false, description: 'Key-value metadata' };
const LIST_PARAMS = [LIMIT_PARAM, STARTING_AFTER_PARAM, ENDING_BEFORE_PARAM];
const SEARCH_QUERY_PARAM = { name: 'query', type: 'string' as const, required: true, description: 'Search query using Stripe Search Query Language' };
const SEARCH_PAGE_PARAM = { name: 'page', type: 'string' as const, required: false, description: 'Pagination cursor from previous search response' };

// Quick helper to build a simple CRUD method set
function crudMethods(
  resource: string,
  singular: string,
  opts: {
    create?: { params: any[]; returns?: string };
    retrieve?: { params?: any[]; returns?: string };
    update?: { params?: any[]; returns?: string };
    list?: { params?: any[]; returns?: string };
    del?: { returns?: string; description?: string };
    search?: boolean;
    extra?: ConnectorMethod[];
  },
): ConnectorMethod[] {
  const result: ConnectorMethod[] = [];

  if (opts.create) {
    result.push({
      name: `${resource}.create`,
      description: `Create a ${singular}`,
      operationType: 'write',
      params: [...opts.create.params, METADATA_PARAM],
      returns: opts.create.returns || `${singular} object`,
    });
  }

  if (opts.retrieve) {
    result.push({
      name: `${resource}.retrieve`,
      description: `Retrieve a ${singular} by ID`,
      operationType: 'read',
      params: opts.retrieve.params || [ID_PARAM],
      returns: opts.retrieve.returns || `${singular} object`,
    });
  }

  if (opts.update) {
    result.push({
      name: `${resource}.update`,
      description: `Update a ${singular}`,
      operationType: 'write',
      params: opts.update.params || [ID_PARAM, METADATA_PARAM],
      returns: opts.update.returns || `Updated ${singular} object`,
    });
  }

  if (opts.list) {
    result.push({
      name: `${resource}.list`,
      description: `List ${resource}`,
      operationType: 'read',
      params: [...(opts.list.params || []), ...LIST_PARAMS],
      returns: opts.list.returns || `List of ${singular} objects`,
    });
  }

  if (opts.del) {
    result.push({
      name: `${resource}.delete`,
      description: opts.del.description || `Delete a ${singular}`,
      operationType: 'delete',
      params: [ID_PARAM],
      returns: opts.del.returns || `Deleted ${singular} confirmation`,
    });
  }

  if (opts.search) {
    result.push({
      name: `${resource}.search`,
      description: `Search ${resource} using Stripe Search Query Language`,
      operationType: 'read',
      params: [SEARCH_QUERY_PARAM, SEARCH_PAGE_PARAM, LIMIT_PARAM],
      returns: `Search results with ${singular} objects`,
    });
  }

  if (opts.extra) result.push(...opts.extra);

  return result;
}

// ---------------------------------------------------------------------------
// Method definitions — organized by group
// ---------------------------------------------------------------------------

// ===== CORE PAYMENTS =====
const coreMethods: ConnectorMethod[] = [
  // PaymentIntents
  ...crudMethods('paymentIntents', 'payment intent', {
    create: {
      params: [
        { name: 'amount', type: 'number', required: true, description: 'Amount in smallest currency unit (e.g., 100 = $1.00)' },
        { name: 'currency', type: 'string', required: true, description: 'Three-letter ISO currency code' },
        { name: 'customer', type: 'string', required: false, description: 'Customer ID' },
        { name: 'payment_method', type: 'string', required: false, description: 'Payment method ID' },
        { name: 'description', type: 'string', required: false, description: 'Description' },
        { name: 'confirm', type: 'boolean', required: false, description: 'Confirm immediately on creation' },
        { name: 'capture_method', type: 'string', required: false, description: 'automatic or manual', enum: ['automatic', 'manual'] },
        { name: 'automatic_payment_methods', type: 'object', required: false, description: '{ enabled: true }' },
        { name: 'receipt_email', type: 'string', required: false, description: 'Email for receipt' },
        { name: 'setup_future_usage', type: 'string', required: false, description: 'off_session or on_session' },
        { name: 'statement_descriptor', type: 'string', required: false, description: 'Statement descriptor (max 22 chars)' },
        { name: 'transfer_data', type: 'object', required: false, description: '{ destination: "acct_..." }' },
      ],
    },
    list: { params: [{ name: 'customer', type: 'string', required: false, description: 'Filter by customer' }] },
    search: true,
    extra: [
      { name: 'paymentIntents.confirm', description: 'Confirm a PaymentIntent to initiate payment', operationType: 'write', params: [ID_PARAM, { name: 'payment_method', type: 'string', required: false, description: 'Payment method to confirm with' }], returns: 'Confirmed PaymentIntent' },
      { name: 'paymentIntents.capture', description: 'Capture funds of an uncaptured PaymentIntent', operationType: 'write', params: [ID_PARAM, { name: 'amount_to_capture', type: 'number', required: false, description: 'Amount to capture (default: full)' }], returns: 'Captured PaymentIntent' },
      { name: 'paymentIntents.cancel', description: 'Cancel a PaymentIntent', operationType: 'write', params: [ID_PARAM], returns: 'Canceled PaymentIntent' },
      { name: 'paymentIntents.applyCustomerBalance', description: 'Reconcile remaining amount for a customer_balance PaymentIntent', operationType: 'write', params: [ID_PARAM], returns: 'PaymentIntent' },
      { name: 'paymentIntents.incrementAuthorization', description: 'Incremental authorization on an eligible PaymentIntent', operationType: 'write', params: [ID_PARAM, { name: 'amount', type: 'number', required: true, description: 'New authorized amount' }], returns: 'PaymentIntent' },
      { name: 'paymentIntents.verifyMicrodeposits', description: 'Verify microdeposits on a PaymentIntent', operationType: 'write', params: [ID_PARAM], returns: 'PaymentIntent' },
      { name: 'paymentIntents.listAmountDetailsLineItems', description: 'List line items of a PaymentIntent', operationType: 'read', params: [ID_PARAM, ...LIST_PARAMS], returns: 'List of line items' },
    ],
  }),

  // Charges
  ...crudMethods('charges', 'charge', {
    create: {
      params: [
        { name: 'amount', type: 'number', required: false, description: 'Amount in smallest currency unit' },
        { name: 'currency', type: 'string', required: false, description: 'Three-letter ISO currency code' },
        { name: 'customer', type: 'string', required: false, description: 'Customer ID' },
        { name: 'source', type: 'string', required: false, description: 'Payment source' },
        { name: 'description', type: 'string', required: false, description: 'Description' },
        { name: 'capture', type: 'boolean', required: false, description: 'Capture immediately (default: true)' },
      ],
    },
    list: {},
    search: true,
    extra: [
      { name: 'charges.capture', description: 'Capture an uncaptured charge', operationType: 'write', params: [ID_PARAM, { name: 'amount', type: 'number', required: false, description: 'Amount to capture' }], returns: 'Captured charge' },
    ],
  }),

  // Refunds
  ...crudMethods('refunds', 'refund', {
    create: {
      params: [
        { name: 'payment_intent', type: 'string', required: false, description: 'PaymentIntent ID to refund' },
        { name: 'charge', type: 'string', required: false, description: 'Charge ID to refund' },
        { name: 'amount', type: 'number', required: false, description: 'Amount to refund (default: full)' },
        { name: 'reason', type: 'string', required: false, description: 'Reason', enum: ['duplicate', 'fraudulent', 'requested_by_customer'] },
      ],
    },
    list: { params: [{ name: 'payment_intent', type: 'string', required: false, description: 'Filter by PaymentIntent' }, { name: 'charge', type: 'string', required: false, description: 'Filter by Charge' }] },
    extra: [
      { name: 'refunds.cancel', description: 'Cancel a refund with status requires_action', operationType: 'write', params: [ID_PARAM], returns: 'Canceled refund' },
    ],
  }),

  // Disputes
  {
    name: 'disputes.retrieve', description: 'Retrieve a dispute', operationType: 'read',
    params: [ID_PARAM], returns: 'Dispute object',
  },
  {
    name: 'disputes.update', description: 'Submit evidence for a dispute', operationType: 'write',
    params: [ID_PARAM, { name: 'evidence', type: 'object', required: false, description: 'Evidence to submit' }, METADATA_PARAM], returns: 'Updated dispute',
  },
  {
    name: 'disputes.list', description: 'List disputes', operationType: 'read',
    params: LIST_PARAMS, returns: 'List of disputes',
  },
  {
    name: 'disputes.close', description: 'Close a dispute, acknowledging it as lost (irreversible)', operationType: 'write',
    params: [ID_PARAM], returns: 'Closed dispute',
  },

  // PaymentMethods
  ...crudMethods('paymentMethods', 'payment method', {
    create: {
      params: [
        { name: 'type', type: 'string', required: true, description: 'card, us_bank_account, sepa_debit, ideal, link, etc.' },
        { name: 'card', type: 'object', required: false, description: '{ number, exp_month, exp_year, cvc }' },
        { name: 'billing_details', type: 'object', required: false, description: '{ name, email, phone, address }' },
      ],
    },
    list: { params: [{ name: 'customer', type: 'string', required: false, description: 'Filter by customer' }, { name: 'type', type: 'string', required: false, description: 'Filter by type' }] },
    extra: [
      { name: 'paymentMethods.attach', description: 'Attach a PaymentMethod to a Customer', operationType: 'write', params: [ID_PARAM, { name: 'customer', type: 'string', required: true, description: 'Customer ID' }], returns: 'Attached PaymentMethod' },
      { name: 'paymentMethods.detach', description: 'Detach a PaymentMethod from a Customer', operationType: 'write', params: [ID_PARAM], returns: 'Detached PaymentMethod' },
    ],
  }),

  // SetupIntents
  ...crudMethods('setupIntents', 'setup intent', {
    create: {
      params: [
        { name: 'customer', type: 'string', required: false, description: 'Customer ID' },
        { name: 'payment_method_types', type: 'array', required: false, description: 'Allowed payment method types' },
        { name: 'payment_method', type: 'string', required: false, description: 'Payment method ID' },
      ],
    },
    list: { params: [{ name: 'customer', type: 'string', required: false, description: 'Filter by customer' }] },
    extra: [
      { name: 'setupIntents.confirm', description: 'Confirm a SetupIntent', operationType: 'write', params: [ID_PARAM, { name: 'payment_method', type: 'string', required: false, description: 'Payment method' }], returns: 'Confirmed SetupIntent' },
      { name: 'setupIntents.cancel', description: 'Cancel a SetupIntent', operationType: 'write', params: [ID_PARAM], returns: 'Canceled SetupIntent' },
      { name: 'setupIntents.verifyMicrodeposits', description: 'Verify microdeposits on a SetupIntent', operationType: 'write', params: [ID_PARAM], returns: 'SetupIntent' },
    ],
  }),

  // Tokens
  { name: 'tokens.create', description: 'Create a single-use token', operationType: 'write', params: [{ name: 'card', type: 'object', required: false, description: 'Card details' }, { name: 'bank_account', type: 'object', required: false, description: 'Bank account details' }], returns: 'Token object' },
  { name: 'tokens.retrieve', description: 'Retrieve a token', operationType: 'read', params: [ID_PARAM], returns: 'Token object' },

  // Sources (legacy)
  { name: 'sources.create', description: 'Create a source (legacy)', operationType: 'write', params: [{ name: 'type', type: 'string', required: true, description: 'Source type' }, { name: 'amount', type: 'number', required: false, description: 'Amount' }, { name: 'currency', type: 'string', required: false, description: 'Currency' }, METADATA_PARAM], returns: 'Source object' },
  { name: 'sources.retrieve', description: 'Retrieve a source', operationType: 'read', params: [ID_PARAM], returns: 'Source object' },
  { name: 'sources.update', description: 'Update source metadata', operationType: 'write', params: [ID_PARAM, METADATA_PARAM], returns: 'Updated source' },
  { name: 'sources.listSourceTransactions', description: 'List transactions for a source', operationType: 'read', params: [ID_PARAM, ...LIST_PARAMS], returns: 'List of source transactions' },
  { name: 'sources.verify', description: 'Verify a source', operationType: 'write', params: [ID_PARAM, { name: 'values', type: 'array', required: true, description: 'Verification values' }], returns: 'Verified source' },

  // Mandates
  { name: 'mandates.retrieve', description: 'Retrieve a Mandate', operationType: 'read', params: [ID_PARAM], returns: 'Mandate object' },

  // SetupAttempts
  { name: 'setupAttempts.list', description: 'List SetupAttempts for a SetupIntent', operationType: 'read', params: [{ name: 'setup_intent', type: 'string', required: true, description: 'SetupIntent ID' }, ...LIST_PARAMS], returns: 'List of SetupAttempts' },

  // ConfirmationTokens
  { name: 'confirmationTokens.retrieve', description: 'Retrieve a ConfirmationToken', operationType: 'read', params: [ID_PARAM], returns: 'ConfirmationToken object' },

  // PaymentMethodConfigurations
  ...crudMethods('paymentMethodConfigurations', 'payment method configuration', {
    create: { params: [] }, retrieve: {}, update: {}, list: {},
  }),

  // PaymentMethodDomains
  ...crudMethods('paymentMethodDomains', 'payment method domain', {
    create: { params: [{ name: 'domain_name', type: 'string', required: true, description: 'Domain name' }] },
    retrieve: {}, update: {}, list: {},
    extra: [
      { name: 'paymentMethodDomains.validate', description: 'Validate a payment method domain', operationType: 'write', params: [ID_PARAM], returns: 'Validated domain' },
    ],
  }),
];

// ===== CUSTOMERS & PRODUCTS =====
const customerMethods: ConnectorMethod[] = [
  // Customers
  ...crudMethods('customers', 'customer', {
    create: {
      params: [
        { name: 'email', type: 'string', required: false, description: 'Customer email (up to 512 chars)' },
        { name: 'name', type: 'string', required: false, description: 'Full name or business name' },
        { name: 'phone', type: 'string', required: false, description: 'Phone number' },
        { name: 'description', type: 'string', required: false, description: 'Description' },
        { name: 'address', type: 'object', required: false, description: '{ line1, line2, city, state, postal_code, country }' },
        { name: 'payment_method', type: 'string', required: false, description: 'Default payment method ID' },
        { name: 'invoice_settings', type: 'object', required: false, description: 'Default invoice settings' },
      ],
    },
    list: { params: [{ name: 'email', type: 'string', required: false, description: 'Filter by email' }] },
    del: { description: 'Permanently delete a customer (cancels active subscriptions)' },
    search: true,
    extra: [
      { name: 'customers.createBalanceTransaction', description: 'Create a balance transaction on a customer', operationType: 'write', params: [ID_PARAM, { name: 'amount', type: 'number', required: true, description: 'Amount in smallest currency unit' }, { name: 'currency', type: 'string', required: true, description: 'Currency' }, { name: 'description', type: 'string', required: false, description: 'Description' }, METADATA_PARAM], returns: 'Customer balance transaction' },
      { name: 'customers.retrieveBalanceTransaction', description: 'Retrieve a customer balance transaction', operationType: 'read', params: [ID_PARAM, { name: 'transaction', type: 'string', required: true, description: 'Transaction ID' }], returns: 'Balance transaction' },
      { name: 'customers.updateBalanceTransaction', description: 'Update a balance transaction', operationType: 'write', params: [ID_PARAM, { name: 'transaction', type: 'string', required: true, description: 'Transaction ID' }, METADATA_PARAM], returns: 'Updated balance transaction' },
      { name: 'customers.listBalanceTransactions', description: 'List customer balance transactions', operationType: 'read', params: [ID_PARAM, ...LIST_PARAMS], returns: 'List of balance transactions' },
      { name: 'customers.retrieveCashBalance', description: 'Retrieve customer cash balance', operationType: 'read', params: [ID_PARAM], returns: 'Cash balance' },
      { name: 'customers.updateCashBalance', description: 'Update customer cash balance settings', operationType: 'write', params: [ID_PARAM, { name: 'settings', type: 'object', required: false, description: 'Cash balance settings' }], returns: 'Updated cash balance' },
      { name: 'customers.listCashBalanceTransactions', description: 'List customer cash balance transactions', operationType: 'read', params: [ID_PARAM, ...LIST_PARAMS], returns: 'List of cash balance transactions' },
      { name: 'customers.createFundingInstructions', description: 'Get/create funding instructions for customer cash balance', operationType: 'write', params: [ID_PARAM, { name: 'bank_transfer', type: 'object', required: true, description: 'Bank transfer config' }, { name: 'currency', type: 'string', required: true, description: 'Currency' }, { name: 'funding_type', type: 'string', required: true, description: 'Funding type (bank_transfer)' }], returns: 'Funding instructions' },
      { name: 'customers.listPaymentMethods', description: 'List PaymentMethods for a customer', operationType: 'read', params: [ID_PARAM, { name: 'type', type: 'string', required: false, description: 'Filter by type' }, ...LIST_PARAMS], returns: 'List of PaymentMethods' },
      { name: 'customers.retrievePaymentMethod', description: 'Retrieve a customer PaymentMethod', operationType: 'read', params: [ID_PARAM, { name: 'payment_method', type: 'string', required: true, description: 'PaymentMethod ID' }], returns: 'PaymentMethod' },
      { name: 'customers.createSource', description: 'Add a payment source to a customer', operationType: 'write', params: [ID_PARAM, { name: 'source', type: 'string', required: true, description: 'Source or token ID' }], returns: 'Source object' },
      { name: 'customers.retrieveSource', description: 'Retrieve a customer source', operationType: 'read', params: [ID_PARAM, { name: 'source', type: 'string', required: true, description: 'Source ID' }], returns: 'Source object' },
      { name: 'customers.updateSource', description: 'Update a customer source', operationType: 'write', params: [ID_PARAM, { name: 'source', type: 'string', required: true, description: 'Source ID' }, METADATA_PARAM], returns: 'Updated source' },
      { name: 'customers.deleteSource', description: 'Delete a customer source', operationType: 'delete', params: [ID_PARAM, { name: 'source', type: 'string', required: true, description: 'Source ID' }], returns: 'Deleted source' },
      { name: 'customers.listSources', description: 'List customer sources', operationType: 'read', params: [ID_PARAM, ...LIST_PARAMS], returns: 'List of sources' },
      { name: 'customers.verifySource', description: 'Verify a customer bank account source', operationType: 'write', params: [ID_PARAM, { name: 'source', type: 'string', required: true, description: 'Source ID' }, { name: 'values', type: 'array', required: true, description: 'Verification amounts' }], returns: 'Verified source' },
      { name: 'customers.createTaxId', description: 'Create a tax ID for a customer', operationType: 'write', params: [ID_PARAM, { name: 'type', type: 'string', required: true, description: 'Tax ID type' }, { name: 'value', type: 'string', required: true, description: 'Tax ID value' }], returns: 'Tax ID object' },
      { name: 'customers.retrieveTaxId', description: 'Retrieve a customer tax ID', operationType: 'read', params: [ID_PARAM, { name: 'tax_id', type: 'string', required: true, description: 'Tax ID' }], returns: 'Tax ID object' },
      { name: 'customers.listTaxIds', description: 'List customer tax IDs', operationType: 'read', params: [ID_PARAM, ...LIST_PARAMS], returns: 'List of tax IDs' },
      { name: 'customers.deleteTaxId', description: 'Delete a customer tax ID', operationType: 'delete', params: [ID_PARAM, { name: 'tax_id', type: 'string', required: true, description: 'Tax ID' }], returns: 'Deleted tax ID' },
      { name: 'customers.deleteDiscount', description: 'Remove discount from a customer', operationType: 'delete', params: [ID_PARAM], returns: 'Deleted discount' },
    ],
  }),

  // Products
  ...crudMethods('products', 'product', {
    create: {
      params: [
        { name: 'name', type: 'string', required: true, description: 'Product name' },
        { name: 'description', type: 'string', required: false, description: 'Description' },
        { name: 'active', type: 'boolean', required: false, description: 'Available for purchase (default: true)' },
        { name: 'default_price_data', type: 'object', required: false, description: '{ unit_amount, currency, recurring? }' },
        { name: 'images', type: 'array', required: false, description: 'Up to 8 image URLs' },
        { name: 'url', type: 'string', required: false, description: 'Product page URL' },
      ],
    },
    list: { params: [{ name: 'active', type: 'boolean', required: false, description: 'Filter by active' }] },
    del: { description: 'Delete a product (only if no prices)' },
    search: true,
    extra: [
      { name: 'products.createFeature', description: 'Attach a feature to a product', operationType: 'write', params: [ID_PARAM, { name: 'entitlement_feature', type: 'string', required: true, description: 'Feature ID' }], returns: 'Product feature' },
      { name: 'products.retrieveFeature', description: 'Retrieve a product feature', operationType: 'read', params: [ID_PARAM, { name: 'feature', type: 'string', required: true, description: 'Feature ID' }], returns: 'Product feature' },
      { name: 'products.listFeatures', description: 'List product features', operationType: 'read', params: [ID_PARAM, ...LIST_PARAMS], returns: 'List of product features' },
      { name: 'products.deleteFeature', description: 'Remove a feature from a product', operationType: 'delete', params: [ID_PARAM, { name: 'feature', type: 'string', required: true, description: 'Feature ID' }], returns: 'Deleted feature' },
    ],
  }),

  // Prices
  ...crudMethods('prices', 'price', {
    create: {
      params: [
        { name: 'product', type: 'string', required: true, description: 'Product ID' },
        { name: 'currency', type: 'string', required: true, description: 'Three-letter ISO currency code' },
        { name: 'unit_amount', type: 'number', required: false, description: 'Amount in smallest currency unit' },
        { name: 'recurring', type: 'object', required: false, description: '{ interval: "month"|"year"|"week"|"day", interval_count? }' },
        { name: 'billing_scheme', type: 'string', required: false, description: 'per_unit or tiered' },
        { name: 'tiers', type: 'array', required: false, description: 'Tier definitions' },
      ],
    },
    list: { params: [{ name: 'product', type: 'string', required: false, description: 'Filter by product' }, { name: 'active', type: 'boolean', required: false, description: 'Filter by active' }] },
    search: true,
  }),

  // Plans (legacy)
  ...crudMethods('plans', 'plan', {
    create: {
      params: [
        { name: 'amount', type: 'number', required: true, description: 'Amount per interval' },
        { name: 'currency', type: 'string', required: true, description: 'Currency' },
        { name: 'interval', type: 'string', required: true, description: 'day, week, month, or year' },
        { name: 'product', type: 'string', required: true, description: 'Product ID' },
      ],
    },
    list: {},
    del: {},
  }),

  // Coupons
  ...crudMethods('coupons', 'coupon', {
    create: {
      params: [
        { name: 'duration', type: 'string', required: true, description: 'once, repeating, or forever' },
        { name: 'percent_off', type: 'number', required: false, description: 'Percentage discount (1-100)' },
        { name: 'amount_off', type: 'number', required: false, description: 'Fixed amount discount' },
        { name: 'currency', type: 'string', required: false, description: 'Required if amount_off' },
        { name: 'duration_in_months', type: 'number', required: false, description: 'Months (for repeating)' },
        { name: 'max_redemptions', type: 'number', required: false, description: 'Max uses' },
        { name: 'redeem_by', type: 'number', required: false, description: 'Expiry (unix timestamp)' },
      ],
    },
    list: {},
    del: {},
  }),

  // PromotionCodes
  ...crudMethods('promotionCodes', 'promotion code', {
    create: {
      params: [
        { name: 'coupon', type: 'string', required: true, description: 'Coupon ID' },
        { name: 'code', type: 'string', required: false, description: 'Customer-facing code' },
        { name: 'max_redemptions', type: 'number', required: false, description: 'Max uses' },
        { name: 'customer', type: 'string', required: false, description: 'Restrict to customer' },
      ],
    },
    list: { params: [{ name: 'code', type: 'string', required: false, description: 'Filter by code' }] },
  }),

  // ShippingRates
  ...crudMethods('shippingRates', 'shipping rate', {
    create: {
      params: [
        { name: 'display_name', type: 'string', required: true, description: 'Display name' },
        { name: 'type', type: 'string', required: false, description: 'fixed_amount' },
        { name: 'fixed_amount', type: 'object', required: false, description: '{ amount, currency }' },
      ],
    },
    list: {},
  }),

  // TaxCodes
  { name: 'taxCodes.retrieve', description: 'Retrieve a tax code', operationType: 'read', params: [ID_PARAM], returns: 'Tax code' },
  { name: 'taxCodes.list', description: 'List all tax codes', operationType: 'read', params: LIST_PARAMS, returns: 'List of tax codes' },

  // TaxRates
  ...crudMethods('taxRates', 'tax rate', {
    create: {
      params: [
        { name: 'display_name', type: 'string', required: true, description: 'Display name' },
        { name: 'inclusive', type: 'boolean', required: true, description: 'Is tax inclusive' },
        { name: 'percentage', type: 'number', required: true, description: 'Tax rate percentage' },
      ],
    },
    list: {},
  }),

  // TaxIds
  ...crudMethods('taxIds', 'tax ID', {
    create: {
      params: [
        { name: 'type', type: 'string', required: true, description: 'Tax ID type (e.g., us_ein, eu_vat)' },
        { name: 'value', type: 'string', required: true, description: 'Tax ID value' },
      ],
    },
    list: {},
    del: {},
  }),
];

// ===== BILLING =====
const billingMethods: ConnectorMethod[] = [
  // Invoices
  ...crudMethods('invoices', 'invoice', {
    create: {
      params: [
        { name: 'customer', type: 'string', required: false, description: 'Customer ID' },
        { name: 'auto_advance', type: 'boolean', required: false, description: 'Auto-finalize (default: true)' },
        { name: 'collection_method', type: 'string', required: false, description: 'charge_automatically or send_invoice' },
        { name: 'days_until_due', type: 'number', required: false, description: 'Days until due' },
        { name: 'description', type: 'string', required: false, description: 'Description' },
        { name: 'subscription', type: 'string', required: false, description: 'Subscription ID' },
      ],
    },
    list: { params: [{ name: 'customer', type: 'string', required: false, description: 'Filter by customer' }, { name: 'status', type: 'string', required: false, description: 'Filter by status' }, { name: 'subscription', type: 'string', required: false, description: 'Filter by subscription' }] },
    del: { description: 'Delete a draft invoice (finalized must be voided)' },
    search: true,
    extra: [
      { name: 'invoices.finalizeInvoice', description: 'Finalize a draft invoice for payment', operationType: 'write', params: [ID_PARAM], returns: 'Finalized invoice' },
      { name: 'invoices.pay', description: 'Attempt payment on an invoice', operationType: 'write', params: [ID_PARAM], returns: 'Paid invoice' },
      { name: 'invoices.sendInvoice', description: 'Send an invoice email to the customer', operationType: 'write', params: [ID_PARAM], returns: 'Invoice' },
      { name: 'invoices.voidInvoice', description: 'Void a finalized invoice', operationType: 'write', params: [ID_PARAM], returns: 'Voided invoice' },
      { name: 'invoices.markUncollectible', description: 'Mark invoice as uncollectible (bad debt)', operationType: 'write', params: [ID_PARAM], returns: 'Invoice' },
      { name: 'invoices.listLineItems', description: 'List invoice line items', operationType: 'read', params: [ID_PARAM, ...LIST_PARAMS], returns: 'List of line items' },
      { name: 'invoices.updateLineItem', description: 'Update a line item on a draft invoice', operationType: 'write', params: [{ name: 'invoice', type: 'string', required: true, description: 'Invoice ID' }, ID_PARAM], returns: 'Updated line item' },
      { name: 'invoices.addLines', description: 'Add multiple line items to a draft invoice', operationType: 'write', params: [ID_PARAM, { name: 'lines', type: 'array', required: true, description: 'Line items to add' }], returns: 'Invoice' },
      { name: 'invoices.removeLines', description: 'Remove multiple line items from a draft invoice', operationType: 'write', params: [ID_PARAM, { name: 'lines', type: 'array', required: true, description: 'Line items to remove' }], returns: 'Invoice' },
      { name: 'invoices.updateLines', description: 'Update multiple line items on a draft invoice', operationType: 'write', params: [ID_PARAM, { name: 'lines', type: 'array', required: true, description: 'Line items to update' }], returns: 'Invoice' },
      { name: 'invoices.createPreview', description: 'Preview an invoice without creating it', operationType: 'read', params: [{ name: 'customer', type: 'string', required: false, description: 'Customer ID' }], returns: 'Invoice preview' },
    ],
  }),

  // InvoiceItems
  ...crudMethods('invoiceItems', 'invoice item', {
    create: {
      params: [
        { name: 'customer', type: 'string', required: true, description: 'Customer ID' },
        { name: 'amount', type: 'number', required: false, description: 'Amount' },
        { name: 'currency', type: 'string', required: false, description: 'Currency' },
        { name: 'invoice', type: 'string', required: false, description: 'Invoice ID (or next invoice)' },
        { name: 'description', type: 'string', required: false, description: 'Description' },
        { name: 'price', type: 'string', required: false, description: 'Price ID' },
        { name: 'quantity', type: 'number', required: false, description: 'Quantity' },
      ],
    },
    list: { params: [{ name: 'customer', type: 'string', required: false, description: 'Filter by customer' }, { name: 'invoice', type: 'string', required: false, description: 'Filter by invoice' }] },
    del: {},
  }),

  // InvoicePayments
  { name: 'invoicePayments.retrieve', description: 'Retrieve an invoice payment', operationType: 'read', params: [ID_PARAM], returns: 'Invoice payment' },
  { name: 'invoicePayments.list', description: 'List invoice payments', operationType: 'read', params: [{ name: 'invoice', type: 'string', required: false, description: 'Filter by invoice' }, ...LIST_PARAMS], returns: 'List of invoice payments' },

  // InvoiceRenderingTemplates
  { name: 'invoiceRenderingTemplates.retrieve', description: 'Retrieve a rendering template', operationType: 'read', params: [ID_PARAM], returns: 'Rendering template' },
  { name: 'invoiceRenderingTemplates.list', description: 'List rendering templates', operationType: 'read', params: LIST_PARAMS, returns: 'List of templates' },
  { name: 'invoiceRenderingTemplates.archive', description: 'Archive a rendering template', operationType: 'write', params: [ID_PARAM], returns: 'Archived template' },
  { name: 'invoiceRenderingTemplates.unarchive', description: 'Unarchive a rendering template', operationType: 'write', params: [ID_PARAM], returns: 'Unarchived template' },

  // CreditNotes
  ...crudMethods('creditNotes', 'credit note', {
    create: {
      params: [
        { name: 'invoice', type: 'string', required: true, description: 'Invoice ID' },
        { name: 'amount', type: 'number', required: false, description: 'Credit amount' },
        { name: 'lines', type: 'array', required: false, description: 'Line item credits' },
        { name: 'reason', type: 'string', required: false, description: 'duplicate, fraudulent, order_change, product_unsatisfactory' },
        { name: 'refund_amount', type: 'number', required: false, description: 'Amount to refund' },
        { name: 'credit_amount', type: 'number', required: false, description: 'Amount to credit customer balance' },
        { name: 'out_of_band_amount', type: 'number', required: false, description: 'Amount credited outside Stripe' },
        { name: 'memo', type: 'string', required: false, description: 'Memo' },
      ],
    },
    list: { params: [{ name: 'invoice', type: 'string', required: false, description: 'Filter by invoice' }] },
    extra: [
      { name: 'creditNotes.voidCreditNote', description: 'Void a credit note', operationType: 'write', params: [ID_PARAM], returns: 'Voided credit note' },
      { name: 'creditNotes.listLineItems', description: 'List credit note line items', operationType: 'read', params: [ID_PARAM, ...LIST_PARAMS], returns: 'List of line items' },
      { name: 'creditNotes.preview', description: 'Preview a credit note', operationType: 'read', params: [{ name: 'invoice', type: 'string', required: true, description: 'Invoice ID' }], returns: 'Credit note preview' },
      { name: 'creditNotes.listPreviewLineItems', description: 'List preview line items', operationType: 'read', params: [{ name: 'invoice', type: 'string', required: true, description: 'Invoice ID' }], returns: 'List of preview line items' },
    ],
  }),

  // Subscriptions
  ...crudMethods('subscriptions', 'subscription', {
    create: {
      params: [
        { name: 'customer', type: 'string', required: true, description: 'Customer ID' },
        { name: 'items', type: 'array', required: true, description: '[{ price, quantity? }]' },
        { name: 'default_payment_method', type: 'string', required: false, description: 'Default payment method' },
        { name: 'trial_period_days', type: 'number', required: false, description: 'Free trial days' },
        { name: 'trial_end', type: 'number', required: false, description: 'Trial end (unix timestamp)' },
        { name: 'cancel_at_period_end', type: 'boolean', required: false, description: 'Cancel at period end' },
        { name: 'billing_cycle_anchor', type: 'number', required: false, description: 'Billing anchor (unix)' },
        { name: 'proration_behavior', type: 'string', required: false, description: 'create_prorations, none, always_invoice' },
        { name: 'coupon', type: 'string', required: false, description: 'Coupon ID' },
      ],
    },
    list: { params: [{ name: 'customer', type: 'string', required: false, description: 'Filter by customer' }, { name: 'status', type: 'string', required: false, description: 'Filter by status' }, { name: 'price', type: 'string', required: false, description: 'Filter by price' }] },
    search: true,
    extra: [
      { name: 'subscriptions.cancel', description: 'Cancel a subscription immediately', operationType: 'delete', params: [ID_PARAM, { name: 'invoice_now', type: 'boolean', required: false, description: 'Generate final invoice' }, { name: 'prorate', type: 'boolean', required: false, description: 'Prorate' }], returns: 'Canceled subscription' },
      { name: 'subscriptions.resume', description: 'Resume a paused subscription', operationType: 'write', params: [ID_PARAM], returns: 'Resumed subscription' },
      { name: 'subscriptions.deleteDiscount', description: 'Remove discount from subscription', operationType: 'delete', params: [ID_PARAM], returns: 'Deleted discount' },
      { name: 'subscriptions.migrate', description: 'Upgrade subscription billing mode', operationType: 'write', params: [ID_PARAM, { name: 'billing_mode', type: 'object', required: true, description: 'New billing mode' }], returns: 'Migrated subscription' },
    ],
  }),

  // SubscriptionItems
  ...crudMethods('subscriptionItems', 'subscription item', {
    create: {
      params: [
        { name: 'subscription', type: 'string', required: true, description: 'Subscription ID' },
        { name: 'price', type: 'string', required: true, description: 'Price ID' },
        { name: 'quantity', type: 'number', required: false, description: 'Quantity' },
      ],
    },
    list: { params: [{ name: 'subscription', type: 'string', required: true, description: 'Subscription ID' }] },
    del: {},
  }),

  // SubscriptionSchedules
  ...crudMethods('subscriptionSchedules', 'subscription schedule', {
    create: {
      params: [
        { name: 'customer', type: 'string', required: false, description: 'Customer ID' },
        { name: 'phases', type: 'array', required: false, description: 'Schedule phases' },
        { name: 'from_subscription', type: 'string', required: false, description: 'Create from existing subscription' },
      ],
    },
    list: { params: [{ name: 'customer', type: 'string', required: false, description: 'Filter by customer' }] },
    extra: [
      { name: 'subscriptionSchedules.cancel', description: 'Cancel a subscription schedule', operationType: 'delete', params: [ID_PARAM], returns: 'Canceled schedule' },
      { name: 'subscriptionSchedules.release', description: 'Release a schedule (keeps subscription)', operationType: 'write', params: [ID_PARAM], returns: 'Released schedule' },
    ],
  }),

  // Quotes
  ...crudMethods('quotes', 'quote', {
    create: {
      params: [
        { name: 'customer', type: 'string', required: false, description: 'Customer ID' },
        { name: 'line_items', type: 'array', required: false, description: '[{ price, quantity? }]' },
        { name: 'description', type: 'string', required: false, description: 'Description' },
      ],
    },
    list: { params: [{ name: 'customer', type: 'string', required: false, description: 'Filter by customer' }] },
    extra: [
      { name: 'quotes.accept', description: 'Accept a quote', operationType: 'write', params: [ID_PARAM], returns: 'Accepted quote' },
      { name: 'quotes.cancel', description: 'Cancel a quote', operationType: 'write', params: [ID_PARAM], returns: 'Canceled quote' },
      { name: 'quotes.finalizeQuote', description: 'Finalize a quote', operationType: 'write', params: [ID_PARAM], returns: 'Finalized quote' },
      { name: 'quotes.listLineItems', description: 'List quote line items', operationType: 'read', params: [ID_PARAM, ...LIST_PARAMS], returns: 'List of line items' },
      { name: 'quotes.listComputedUpfrontLineItems', description: 'List computed upfront line items', operationType: 'read', params: [ID_PARAM, ...LIST_PARAMS], returns: 'List of upfront line items' },
    ],
  }),

  // billing.alerts
  { name: 'billing.alerts.create', description: 'Create a billing alert', operationType: 'write', params: [{ name: 'alert_type', type: 'string', required: true, description: 'Alert type' }, { name: 'title', type: 'string', required: true, description: 'Title' }], returns: 'Billing alert' },
  { name: 'billing.alerts.retrieve', description: 'Retrieve a billing alert', operationType: 'read', params: [ID_PARAM], returns: 'Billing alert' },
  { name: 'billing.alerts.list', description: 'List billing alerts', operationType: 'read', params: LIST_PARAMS, returns: 'List of alerts' },
  { name: 'billing.alerts.activate', description: 'Reactivate an alert', operationType: 'write', params: [ID_PARAM], returns: 'Activated alert' },
  { name: 'billing.alerts.deactivate', description: 'Deactivate an alert', operationType: 'write', params: [ID_PARAM], returns: 'Deactivated alert' },
  { name: 'billing.alerts.archive', description: 'Archive an alert (non-reversible)', operationType: 'delete', params: [ID_PARAM], returns: 'Archived alert' },

  // billing.creditBalanceSummary
  { name: 'billing.creditBalanceSummary.retrieve', description: 'Retrieve credit balance summary for a customer', operationType: 'read', params: [{ name: 'customer', type: 'string', required: true, description: 'Customer ID' }, { name: 'filter', type: 'object', required: true, description: 'Filter criteria' }], returns: 'Credit balance summary' },

  // billing.creditBalanceTransactions
  { name: 'billing.creditBalanceTransactions.retrieve', description: 'Retrieve a credit balance transaction', operationType: 'read', params: [ID_PARAM], returns: 'Credit balance transaction' },
  { name: 'billing.creditBalanceTransactions.list', description: 'List credit balance transactions', operationType: 'read', params: [{ name: 'customer', type: 'string', required: true, description: 'Customer ID' }, ...LIST_PARAMS], returns: 'List of transactions' },

  // billing.creditGrants
  ...crudMethods('billing.creditGrants', 'credit grant', {
    create: { params: [{ name: 'customer', type: 'string', required: true, description: 'Customer ID' }, { name: 'amount', type: 'object', required: true, description: 'Amount' }, { name: 'category', type: 'string', required: true, description: 'Category' }] },
    list: { params: [{ name: 'customer', type: 'string', required: false, description: 'Filter by customer' }] },
    extra: [
      { name: 'billing.creditGrants.expire', description: 'Expire a credit grant', operationType: 'write', params: [ID_PARAM], returns: 'Expired credit grant' },
      { name: 'billing.creditGrants.voidGrant', description: 'Void a credit grant', operationType: 'delete', params: [ID_PARAM], returns: 'Voided credit grant' },
    ],
  }),

  // billing.meters
  ...crudMethods('billing.meters', 'billing meter', {
    create: { params: [{ name: 'display_name', type: 'string', required: true, description: 'Display name' }, { name: 'event_name', type: 'string', required: true, description: 'Event name' }] },
    list: {},
    extra: [
      { name: 'billing.meters.deactivate', description: 'Deactivate a meter', operationType: 'write', params: [ID_PARAM], returns: 'Deactivated meter' },
      { name: 'billing.meters.reactivate', description: 'Reactivate a meter', operationType: 'write', params: [ID_PARAM], returns: 'Reactivated meter' },
      { name: 'billing.meters.listEventSummaries', description: 'List meter event summaries', operationType: 'read', params: [ID_PARAM, { name: 'customer', type: 'string', required: true, description: 'Customer ID' }, { name: 'start_time', type: 'number', required: true, description: 'Start time (unix)' }, { name: 'end_time', type: 'number', required: true, description: 'End time (unix)' }, ...LIST_PARAMS], returns: 'List of event summaries' },
    ],
  }),

  // billing.meterEvents
  { name: 'billing.meterEvents.create', description: 'Report a meter event', operationType: 'write', params: [{ name: 'event_name', type: 'string', required: true, description: 'Event name' }, { name: 'payload', type: 'object', required: true, description: 'Event payload' }], returns: 'Meter event' },

  // billing.meterEventAdjustments
  { name: 'billing.meterEventAdjustments.create', description: 'Create a meter event adjustment', operationType: 'write', params: [{ name: 'event_name', type: 'string', required: true, description: 'Event name' }, { name: 'type', type: 'string', required: true, description: 'Adjustment type' }], returns: 'Meter event adjustment' },

  // billingPortal.configurations
  ...crudMethods('billingPortal.configurations', 'portal configuration', {
    create: { params: [{ name: 'business_profile', type: 'object', required: true, description: '{ headline?, privacy_policy_url?, terms_of_service_url? }' }, { name: 'features', type: 'object', required: true, description: 'Portal features config' }] },
    list: {},
  }),

  // billingPortal.sessions
  { name: 'billingPortal.sessions.create', description: 'Create a customer portal session', operationType: 'write', params: [{ name: 'customer', type: 'string', required: true, description: 'Customer ID' }, { name: 'return_url', type: 'string', required: false, description: 'Return URL' }, { name: 'configuration', type: 'string', required: false, description: 'Portal configuration ID' }], returns: 'Portal session with URL' },
];

// ===== CONNECT =====
const connectMethods: ConnectorMethod[] = [
  // Accounts
  ...crudMethods('accounts', 'account', {
    create: {
      params: [
        { name: 'type', type: 'string', required: false, description: 'standard, express, or custom' },
        { name: 'email', type: 'string', required: false, description: 'Email' },
        { name: 'country', type: 'string', required: false, description: 'Two-letter country code' },
        { name: 'business_type', type: 'string', required: false, description: 'individual, company, non_profit, government_entity' },
        { name: 'business_profile', type: 'object', required: false, description: '{ name, url, mcc, support_email }' },
        { name: 'capabilities', type: 'object', required: false, description: '{ card_payments: { requested: true } }' },
        { name: 'tos_acceptance', type: 'object', required: false, description: '{ date, ip }' },
      ],
    },
    list: {},
    del: { description: 'Delete a connected account' },
    extra: [
      { name: 'accounts.retrieveCurrent', description: 'Retrieve the current (own) account', operationType: 'read', params: [], returns: 'Account object' },
      { name: 'accounts.reject', description: 'Reject a suspicious connected account', operationType: 'write', params: [ID_PARAM, { name: 'reason', type: 'string', required: true, description: 'Rejection reason' }], returns: 'Rejected account' },
      { name: 'accounts.createExternalAccount', description: 'Add an external account (bank/card)', operationType: 'write', params: [ID_PARAM, { name: 'external_account', type: 'string', required: true, description: 'Token or bank account details' }], returns: 'External account' },
      { name: 'accounts.retrieveExternalAccount', description: 'Retrieve an external account', operationType: 'read', params: [ID_PARAM, { name: 'external_account', type: 'string', required: true, description: 'External account ID' }], returns: 'External account' },
      { name: 'accounts.updateExternalAccount', description: 'Update an external account', operationType: 'write', params: [ID_PARAM, { name: 'external_account', type: 'string', required: true, description: 'External account ID' }, METADATA_PARAM], returns: 'Updated external account' },
      { name: 'accounts.deleteExternalAccount', description: 'Delete an external account', operationType: 'delete', params: [ID_PARAM, { name: 'external_account', type: 'string', required: true, description: 'External account ID' }], returns: 'Deleted external account' },
      { name: 'accounts.listExternalAccounts', description: 'List external accounts', operationType: 'read', params: [ID_PARAM, ...LIST_PARAMS], returns: 'List of external accounts' },
      { name: 'accounts.createPerson', description: 'Create a person for a connected account', operationType: 'write', params: [ID_PARAM, { name: 'first_name', type: 'string', required: false, description: 'First name' }, { name: 'last_name', type: 'string', required: false, description: 'Last name' }, { name: 'relationship', type: 'object', required: false, description: 'Relationship to account' }], returns: 'Person object' },
      { name: 'accounts.retrievePerson', description: 'Retrieve a person', operationType: 'read', params: [ID_PARAM, { name: 'person', type: 'string', required: true, description: 'Person ID' }], returns: 'Person object' },
      { name: 'accounts.updatePerson', description: 'Update a person', operationType: 'write', params: [ID_PARAM, { name: 'person', type: 'string', required: true, description: 'Person ID' }], returns: 'Updated person' },
      { name: 'accounts.deletePerson', description: 'Delete a person', operationType: 'delete', params: [ID_PARAM, { name: 'person', type: 'string', required: true, description: 'Person ID' }], returns: 'Deleted person' },
      { name: 'accounts.listPersons', description: 'List persons for an account', operationType: 'read', params: [ID_PARAM, ...LIST_PARAMS], returns: 'List of persons' },
      { name: 'accounts.listCapabilities', description: 'List account capabilities', operationType: 'read', params: [ID_PARAM], returns: 'List of capabilities' },
      { name: 'accounts.retrieveCapability', description: 'Retrieve a capability', operationType: 'read', params: [ID_PARAM, { name: 'capability', type: 'string', required: true, description: 'Capability ID' }], returns: 'Capability' },
      { name: 'accounts.createLoginLink', description: 'Create Express Dashboard login link', operationType: 'write', params: [ID_PARAM], returns: 'Login link' },
    ],
  }),

  // AccountLinks
  { name: 'accountLinks.create', description: 'Create a Connect Onboarding URL', operationType: 'write', params: [{ name: 'account', type: 'string', required: true, description: 'Account ID' }, { name: 'refresh_url', type: 'string', required: true, description: 'URL if link expires' }, { name: 'return_url', type: 'string', required: true, description: 'URL after completion' }, { name: 'type', type: 'string', required: true, description: 'account_onboarding or account_update' }], returns: 'Account link with URL' },

  // AccountSessions
  { name: 'accountSessions.create', description: 'Create an AccountSession for client-side API access', operationType: 'write', params: [{ name: 'account', type: 'string', required: true, description: 'Account ID' }, { name: 'components', type: 'object', required: true, description: 'Embedded components config' }], returns: 'Account session' },

  // Transfers
  ...crudMethods('transfers', 'transfer', {
    create: {
      params: [
        { name: 'amount', type: 'number', required: true, description: 'Amount in smallest currency unit' },
        { name: 'currency', type: 'string', required: true, description: 'Currency' },
        { name: 'destination', type: 'string', required: true, description: 'Connected account ID' },
        { name: 'description', type: 'string', required: false, description: 'Description' },
        { name: 'source_transaction', type: 'string', required: false, description: 'Charge ID to pull from' },
      ],
    },
    list: { params: [{ name: 'destination', type: 'string', required: false, description: 'Filter by destination' }] },
    extra: [
      { name: 'transfers.createReversal', description: 'Reverse a transfer (full or partial)', operationType: 'write', params: [ID_PARAM, { name: 'amount', type: 'number', required: false, description: 'Amount to reverse' }], returns: 'Transfer reversal' },
      { name: 'transfers.retrieveReversal', description: 'Retrieve a transfer reversal', operationType: 'read', params: [ID_PARAM, { name: 'reversal', type: 'string', required: true, description: 'Reversal ID' }], returns: 'Transfer reversal' },
      { name: 'transfers.updateReversal', description: 'Update transfer reversal metadata', operationType: 'write', params: [ID_PARAM, { name: 'reversal', type: 'string', required: true, description: 'Reversal ID' }, METADATA_PARAM], returns: 'Updated reversal' },
      { name: 'transfers.listReversals', description: 'List transfer reversals', operationType: 'read', params: [ID_PARAM, ...LIST_PARAMS], returns: 'List of reversals' },
    ],
  }),

  // Payouts
  ...crudMethods('payouts', 'payout', {
    create: {
      params: [
        { name: 'amount', type: 'number', required: true, description: 'Amount' },
        { name: 'currency', type: 'string', required: true, description: 'Currency' },
        { name: 'destination', type: 'string', required: false, description: 'External account ID' },
        { name: 'method', type: 'string', required: false, description: 'standard or instant' },
        { name: 'description', type: 'string', required: false, description: 'Description' },
      ],
    },
    list: { params: [{ name: 'status', type: 'string', required: false, description: 'Filter by status' }] },
    extra: [
      { name: 'payouts.cancel', description: 'Cancel a pending payout', operationType: 'write', params: [ID_PARAM], returns: 'Canceled payout' },
      { name: 'payouts.reverse', description: 'Reverse a payout (US/CA only)', operationType: 'write', params: [ID_PARAM], returns: 'Reversed payout' },
    ],
  }),

  // Topups
  ...crudMethods('topups', 'top-up', {
    create: { params: [{ name: 'amount', type: 'number', required: true, description: 'Amount' }, { name: 'currency', type: 'string', required: true, description: 'Currency' }, { name: 'description', type: 'string', required: false, description: 'Description' }] },
    list: {},
    extra: [
      { name: 'topups.cancel', description: 'Cancel a pending top-up', operationType: 'write', params: [ID_PARAM], returns: 'Canceled top-up' },
    ],
  }),

  // ApplicationFees
  { name: 'applicationFees.retrieve', description: 'Retrieve an application fee', operationType: 'read', params: [ID_PARAM], returns: 'Application fee' },
  { name: 'applicationFees.list', description: 'List application fees', operationType: 'read', params: LIST_PARAMS, returns: 'List of fees' },
  { name: 'applicationFees.createRefund', description: 'Refund an application fee', operationType: 'write', params: [ID_PARAM, { name: 'amount', type: 'number', required: false, description: 'Amount to refund' }], returns: 'Fee refund' },
  { name: 'applicationFees.retrieveRefund', description: 'Retrieve a fee refund', operationType: 'read', params: [ID_PARAM, { name: 'refund', type: 'string', required: true, description: 'Refund ID' }], returns: 'Fee refund' },
  { name: 'applicationFees.updateRefund', description: 'Update fee refund metadata', operationType: 'write', params: [ID_PARAM, { name: 'refund', type: 'string', required: true, description: 'Refund ID' }, METADATA_PARAM], returns: 'Updated fee refund' },
  { name: 'applicationFees.listRefunds', description: 'List refunds for an application fee', operationType: 'read', params: [ID_PARAM, ...LIST_PARAMS], returns: 'List of fee refunds' },

  // Balance
  { name: 'balance.retrieve', description: 'Retrieve current account balance', operationType: 'read', params: [], returns: 'Balance object' },

  // BalanceSettings
  { name: 'balanceSettings.retrieve', description: 'Retrieve balance settings', operationType: 'read', params: [], returns: 'Balance settings' },
  { name: 'balanceSettings.update', description: 'Update balance settings', operationType: 'write', params: [], returns: 'Updated balance settings' },

  // BalanceTransactions
  { name: 'balanceTransactions.retrieve', description: 'Retrieve a balance transaction', operationType: 'read', params: [ID_PARAM], returns: 'Balance transaction' },
  { name: 'balanceTransactions.list', description: 'List balance transactions', operationType: 'read', params: [{ name: 'type', type: 'string', required: false, description: 'Filter by type (charge, refund, payout, etc.)' }, { name: 'created', type: 'object', required: false, description: 'Filter by date { gte, lte }' }, ...LIST_PARAMS], returns: 'List of balance transactions' },

  // CountrySpecs
  { name: 'countrySpecs.retrieve', description: 'Retrieve country spec', operationType: 'read', params: [ID_PARAM], returns: 'Country spec' },
  { name: 'countrySpecs.list', description: 'List country specs', operationType: 'read', params: LIST_PARAMS, returns: 'List of country specs' },

  // ExchangeRates
  { name: 'exchangeRates.retrieve', description: 'Retrieve exchange rates (deprecated)', operationType: 'read', params: [ID_PARAM], returns: 'Exchange rates' },
  { name: 'exchangeRates.list', description: 'List exchange rates (deprecated)', operationType: 'read', params: LIST_PARAMS, returns: 'List of exchange rates' },
];

// ===== CHECKOUT =====
const checkoutMethods: ConnectorMethod[] = [
  ...crudMethods('checkout.sessions', 'checkout session', {
    create: {
      params: [
        { name: 'mode', type: 'string', required: true, description: 'payment, subscription, or setup' },
        { name: 'success_url', type: 'string', required: true, description: 'Redirect URL on success' },
        { name: 'cancel_url', type: 'string', required: false, description: 'Redirect URL on cancel' },
        { name: 'line_items', type: 'array', required: false, description: '[{ price, quantity }]' },
        { name: 'customer', type: 'string', required: false, description: 'Customer ID' },
        { name: 'customer_email', type: 'string', required: false, description: 'Pre-fill email' },
        { name: 'payment_method_types', type: 'array', required: false, description: 'Accepted types' },
        { name: 'allow_promotion_codes', type: 'boolean', required: false, description: 'Allow promo codes' },
        { name: 'expires_at', type: 'number', required: false, description: 'Expiry (unix, 30min-24hr)' },
      ],
    },
    list: {},
    extra: [
      { name: 'checkout.sessions.expire', description: 'Expire an open checkout session', operationType: 'write', params: [ID_PARAM], returns: 'Expired session' },
      { name: 'checkout.sessions.listLineItems', description: 'List checkout session line items', operationType: 'read', params: [ID_PARAM, ...LIST_PARAMS], returns: 'List of line items' },
    ],
  }),

  // PaymentLinks
  ...crudMethods('paymentLinks', 'payment link', {
    create: {
      params: [
        { name: 'line_items', type: 'array', required: true, description: '[{ price, quantity }]' },
        { name: 'after_completion', type: 'object', required: false, description: '{ type, redirect? }' },
        { name: 'allow_promotion_codes', type: 'boolean', required: false, description: 'Allow promo codes' },
      ],
    },
    list: {},
    extra: [
      { name: 'paymentLinks.listLineItems', description: 'List payment link line items', operationType: 'read', params: [ID_PARAM, ...LIST_PARAMS], returns: 'List of line items' },
    ],
  }),
];

// ===== ISSUING =====
const issuingMethods: ConnectorMethod[] = [
  // Authorizations
  { name: 'issuing.authorizations.retrieve', description: 'Retrieve an issuing authorization', operationType: 'read', params: [ID_PARAM], returns: 'Authorization' },
  { name: 'issuing.authorizations.update', description: 'Update authorization metadata', operationType: 'write', params: [ID_PARAM, METADATA_PARAM], returns: 'Updated authorization' },
  { name: 'issuing.authorizations.list', description: 'List issuing authorizations', operationType: 'read', params: [{ name: 'card', type: 'string', required: false, description: 'Filter by card' }, { name: 'cardholder', type: 'string', required: false, description: 'Filter by cardholder' }, { name: 'status', type: 'string', required: false, description: 'Filter by status' }, ...LIST_PARAMS], returns: 'List of authorizations' },
  { name: 'issuing.authorizations.approve', description: 'Approve a pending authorization (deprecated)', operationType: 'write', params: [ID_PARAM], returns: 'Approved authorization' },

  // Cardholders
  ...crudMethods('issuing.cardholders', 'cardholder', {
    create: {
      params: [
        { name: 'name', type: 'string', required: true, description: 'Full name' },
        { name: 'type', type: 'string', required: true, description: 'individual or company' },
        { name: 'email', type: 'string', required: false, description: 'Email' },
        { name: 'phone_number', type: 'string', required: false, description: 'Phone' },
        { name: 'billing', type: 'object', required: true, description: '{ address: { line1, city, state, postal_code, country } }' },
        { name: 'spending_controls', type: 'object', required: false, description: 'Spending limits and categories' },
        { name: 'status', type: 'string', required: false, description: 'active or inactive' },
      ],
    },
    list: { params: [{ name: 'status', type: 'string', required: false, description: 'Filter by status' }] },
  }),

  // Cards
  ...crudMethods('issuing.cards', 'issuing card', {
    create: {
      params: [
        { name: 'cardholder', type: 'string', required: true, description: 'Cardholder ID' },
        { name: 'currency', type: 'string', required: true, description: 'Currency' },
        { name: 'type', type: 'string', required: true, description: 'virtual or physical' },
        { name: 'status', type: 'string', required: false, description: 'active or inactive' },
        { name: 'spending_controls', type: 'object', required: false, description: 'Spending limits' },
        { name: 'shipping', type: 'object', required: false, description: 'Shipping address (for physical)' },
      ],
    },
    list: { params: [{ name: 'cardholder', type: 'string', required: false, description: 'Filter by cardholder' }, { name: 'status', type: 'string', required: false, description: 'Filter by status' }, { name: 'type', type: 'string', required: false, description: 'Filter by type' }] },
  }),

  // Disputes
  ...crudMethods('issuing.disputes', 'issuing dispute', {
    create: { params: [{ name: 'transaction', type: 'string', required: true, description: 'Transaction ID' }, { name: 'evidence', type: 'object', required: false, description: 'Evidence' }] },
    list: { params: [{ name: 'transaction', type: 'string', required: false, description: 'Filter by transaction' }] },
    extra: [
      { name: 'issuing.disputes.submit', description: 'Submit dispute to card network', operationType: 'write', params: [ID_PARAM], returns: 'Submitted dispute' },
    ],
  }),

  // PersonalizationDesigns
  ...crudMethods('issuing.personalizationDesigns', 'personalization design', {
    create: { params: [{ name: 'physical_bundle', type: 'string', required: true, description: 'Physical bundle ID' }] },
    list: {},
  }),

  // PhysicalBundles
  { name: 'issuing.physicalBundles.retrieve', description: 'Retrieve a physical bundle', operationType: 'read', params: [ID_PARAM], returns: 'Physical bundle' },
  { name: 'issuing.physicalBundles.list', description: 'List physical bundles', operationType: 'read', params: LIST_PARAMS, returns: 'List of bundles' },

  // Tokens
  { name: 'issuing.tokens.retrieve', description: 'Retrieve an issuing token', operationType: 'read', params: [ID_PARAM], returns: 'Issuing token' },
  { name: 'issuing.tokens.update', description: 'Update issuing token status', operationType: 'write', params: [ID_PARAM, { name: 'status', type: 'string', required: true, description: 'New status' }], returns: 'Updated token' },
  { name: 'issuing.tokens.list', description: 'List issuing tokens for a card', operationType: 'read', params: [{ name: 'card', type: 'string', required: true, description: 'Card ID' }, ...LIST_PARAMS], returns: 'List of tokens' },

  // Transactions
  { name: 'issuing.transactions.retrieve', description: 'Retrieve an issuing transaction', operationType: 'read', params: [ID_PARAM], returns: 'Transaction' },
  { name: 'issuing.transactions.update', description: 'Update issuing transaction metadata', operationType: 'write', params: [ID_PARAM, METADATA_PARAM], returns: 'Updated transaction' },
  { name: 'issuing.transactions.list', description: 'List issuing transactions', operationType: 'read', params: [{ name: 'card', type: 'string', required: false, description: 'Filter by card' }, { name: 'cardholder', type: 'string', required: false, description: 'Filter by cardholder' }, ...LIST_PARAMS], returns: 'List of transactions' },
];

// ===== TREASURY =====
const treasuryMethods: ConnectorMethod[] = [
  // FinancialAccounts
  ...crudMethods('treasury.financialAccounts', 'financial account', {
    create: { params: [{ name: 'supported_currencies', type: 'array', required: true, description: 'Supported currencies' }, { name: 'features', type: 'object', required: false, description: 'Features config' }] },
    list: {},
    extra: [
      { name: 'treasury.financialAccounts.close', description: 'Close a financial account', operationType: 'write', params: [ID_PARAM], returns: 'Closed financial account' },
      { name: 'treasury.financialAccounts.retrieveFeatures', description: 'Retrieve financial account features', operationType: 'read', params: [ID_PARAM], returns: 'Features' },
      { name: 'treasury.financialAccounts.updateFeatures', description: 'Update financial account features', operationType: 'write', params: [ID_PARAM, { name: 'features', type: 'object', required: false, description: 'Features to update' }], returns: 'Updated features' },
    ],
  }),

  // InboundTransfers
  { name: 'treasury.inboundTransfers.create', description: 'Create an inbound transfer', operationType: 'write', params: [{ name: 'financial_account', type: 'string', required: true, description: 'Financial account ID' }, { name: 'amount', type: 'number', required: true, description: 'Amount' }, { name: 'currency', type: 'string', required: true, description: 'Currency' }, { name: 'origin_payment_method', type: 'string', required: true, description: 'Source payment method' }], returns: 'Inbound transfer' },
  { name: 'treasury.inboundTransfers.retrieve', description: 'Retrieve an inbound transfer', operationType: 'read', params: [ID_PARAM], returns: 'Inbound transfer' },
  { name: 'treasury.inboundTransfers.list', description: 'List inbound transfers', operationType: 'read', params: [{ name: 'financial_account', type: 'string', required: true, description: 'Financial account ID' }, ...LIST_PARAMS], returns: 'List of transfers' },
  { name: 'treasury.inboundTransfers.cancel', description: 'Cancel an inbound transfer', operationType: 'write', params: [ID_PARAM], returns: 'Canceled transfer' },

  // OutboundPayments
  { name: 'treasury.outboundPayments.create', description: 'Create an outbound payment', operationType: 'write', params: [{ name: 'financial_account', type: 'string', required: true, description: 'Financial account ID' }, { name: 'amount', type: 'number', required: true, description: 'Amount' }, { name: 'currency', type: 'string', required: true, description: 'Currency' }, { name: 'customer', type: 'string', required: false, description: 'Customer ID' }, { name: 'destination_payment_method', type: 'string', required: false, description: 'Destination PM' }], returns: 'Outbound payment' },
  { name: 'treasury.outboundPayments.retrieve', description: 'Retrieve an outbound payment', operationType: 'read', params: [ID_PARAM], returns: 'Outbound payment' },
  { name: 'treasury.outboundPayments.list', description: 'List outbound payments', operationType: 'read', params: [{ name: 'financial_account', type: 'string', required: true, description: 'Financial account ID' }, ...LIST_PARAMS], returns: 'List of payments' },
  { name: 'treasury.outboundPayments.cancel', description: 'Cancel an outbound payment', operationType: 'write', params: [ID_PARAM], returns: 'Canceled payment' },

  // OutboundTransfers
  { name: 'treasury.outboundTransfers.create', description: 'Create an outbound transfer', operationType: 'write', params: [{ name: 'financial_account', type: 'string', required: true, description: 'Financial account ID' }, { name: 'amount', type: 'number', required: true, description: 'Amount' }, { name: 'currency', type: 'string', required: true, description: 'Currency' }, { name: 'destination_payment_method', type: 'string', required: true, description: 'Destination PM' }], returns: 'Outbound transfer' },
  { name: 'treasury.outboundTransfers.retrieve', description: 'Retrieve an outbound transfer', operationType: 'read', params: [ID_PARAM], returns: 'Outbound transfer' },
  { name: 'treasury.outboundTransfers.list', description: 'List outbound transfers', operationType: 'read', params: [{ name: 'financial_account', type: 'string', required: true, description: 'Financial account ID' }, ...LIST_PARAMS], returns: 'List of transfers' },
  { name: 'treasury.outboundTransfers.cancel', description: 'Cancel an outbound transfer', operationType: 'write', params: [ID_PARAM], returns: 'Canceled transfer' },

  // CreditReversals
  { name: 'treasury.creditReversals.create', description: 'Reverse a received credit', operationType: 'write', params: [{ name: 'received_credit', type: 'string', required: true, description: 'ReceivedCredit ID' }], returns: 'Credit reversal' },
  { name: 'treasury.creditReversals.retrieve', description: 'Retrieve a credit reversal', operationType: 'read', params: [ID_PARAM], returns: 'Credit reversal' },
  { name: 'treasury.creditReversals.list', description: 'List credit reversals', operationType: 'read', params: [{ name: 'financial_account', type: 'string', required: true, description: 'Financial account ID' }, ...LIST_PARAMS], returns: 'List of credit reversals' },

  // DebitReversals
  { name: 'treasury.debitReversals.create', description: 'Reverse a received debit', operationType: 'write', params: [{ name: 'received_debit', type: 'string', required: true, description: 'ReceivedDebit ID' }], returns: 'Debit reversal' },
  { name: 'treasury.debitReversals.retrieve', description: 'Retrieve a debit reversal', operationType: 'read', params: [ID_PARAM], returns: 'Debit reversal' },
  { name: 'treasury.debitReversals.list', description: 'List debit reversals', operationType: 'read', params: [{ name: 'financial_account', type: 'string', required: true, description: 'Financial account ID' }, ...LIST_PARAMS], returns: 'List of debit reversals' },

  // ReceivedCredits
  { name: 'treasury.receivedCredits.retrieve', description: 'Retrieve a received credit', operationType: 'read', params: [ID_PARAM], returns: 'Received credit' },
  { name: 'treasury.receivedCredits.list', description: 'List received credits', operationType: 'read', params: [{ name: 'financial_account', type: 'string', required: true, description: 'Financial account ID' }, ...LIST_PARAMS], returns: 'List of received credits' },

  // ReceivedDebits
  { name: 'treasury.receivedDebits.retrieve', description: 'Retrieve a received debit', operationType: 'read', params: [ID_PARAM], returns: 'Received debit' },
  { name: 'treasury.receivedDebits.list', description: 'List received debits', operationType: 'read', params: [{ name: 'financial_account', type: 'string', required: true, description: 'Financial account ID' }, ...LIST_PARAMS], returns: 'List of received debits' },

  // TransactionEntries
  { name: 'treasury.transactionEntries.retrieve', description: 'Retrieve a transaction entry', operationType: 'read', params: [ID_PARAM], returns: 'Transaction entry' },
  { name: 'treasury.transactionEntries.list', description: 'List transaction entries', operationType: 'read', params: [{ name: 'financial_account', type: 'string', required: true, description: 'Financial account ID' }, ...LIST_PARAMS], returns: 'List of entries' },

  // Transactions
  { name: 'treasury.transactions.retrieve', description: 'Retrieve a treasury transaction', operationType: 'read', params: [ID_PARAM], returns: 'Treasury transaction' },
  { name: 'treasury.transactions.list', description: 'List treasury transactions', operationType: 'read', params: [{ name: 'financial_account', type: 'string', required: true, description: 'Financial account ID' }, ...LIST_PARAMS], returns: 'List of transactions' },
];

// ===== OTHER =====
const otherMethods: ConnectorMethod[] = [
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

// ---------------------------------------------------------------------------
// All methods & group registry
// ---------------------------------------------------------------------------

const allMethods: ConnectorMethod[] = [
  ...coreMethods,
  ...customerMethods,
  ...billingMethods,
  ...connectMethods,
  ...checkoutMethods,
  ...issuingMethods,
  ...treasuryMethods,
  ...otherMethods,
];


// ---------------------------------------------------------------------------
// Human-readable request descriptions
// ---------------------------------------------------------------------------

function formatAmount(amount: number | undefined, currency: string | undefined): string {
  if (!amount) return '(unknown amount)';
  const curr = (currency || 'usd').toUpperCase();
  return `${(amount / 100).toFixed(2)} ${curr}`;
}

function describeStripeRequest(method: string, params: Record<string, unknown>): string {
  switch (method) {
    case 'balance.retrieve': return 'Retrieve account balance';
    case 'customers.create': return `Create customer${params.email ? ` (${params.email})` : ''}`;
    case 'customers.delete': return `Delete customer ${params.id || '(unknown)'}`;
    case 'paymentIntents.create': return `Create payment intent for ${formatAmount(params.amount as number, params.currency as string)}`;
    case 'paymentIntents.confirm': return `Confirm payment ${params.id || '(unknown)'}`;
    case 'paymentIntents.capture': return `Capture payment ${params.id || '(unknown)'}`;
    case 'paymentIntents.cancel': return `Cancel payment ${params.id || '(unknown)'}`;
    case 'charges.create': return `Create charge for ${formatAmount(params.amount as number, params.currency as string)}`;
    case 'charges.capture': return `Capture charge ${params.id || '(unknown)'}`;
    case 'refunds.create': return `Create refund${params.payment_intent ? ` for ${params.payment_intent}` : params.charge ? ` for ${params.charge}` : ''}`;
    case 'invoices.create': return `Create invoice${params.customer ? ` for customer ${params.customer}` : ''}`;
    case 'invoices.finalizeInvoice': return `Finalize invoice ${params.id || '(unknown)'}`;
    case 'invoices.pay': return `Pay invoice ${params.id || '(unknown)'}`;
    case 'invoices.sendInvoice': return `Send invoice ${params.id || '(unknown)'}`;
    case 'invoices.voidInvoice': return `Void invoice ${params.id || '(unknown)'}`;
    case 'invoices.delete': return `Delete draft invoice ${params.id || '(unknown)'}`;
    case 'subscriptions.create': return `Create subscription for customer ${params.customer || '(unknown)'}`;
    case 'subscriptions.cancel': return `Cancel subscription ${params.id || '(unknown)'}`;
    case 'products.create': return `Create product "${params.name || ''}"`;
    case 'products.delete': return `Delete product ${params.id || '(unknown)'}`;
    case 'prices.create': return `Create price for product ${params.product || '(unknown)'}`;
    case 'transfers.create': return `Transfer ${formatAmount(params.amount as number, params.currency as string)} to ${params.destination || '(unknown)'}`;
    case 'payouts.create': return `Create payout for ${formatAmount(params.amount as number, params.currency as string)}`;
    case 'payouts.cancel': return `Cancel payout ${params.id || '(unknown)'}`;
    case 'payouts.reverse': return `Reverse payout ${params.id || '(unknown)'}`;
    case 'accounts.create': return `Create connected account${params.email ? ` (${params.email})` : ''}`;
    case 'accounts.delete': return `Delete connected account ${params.id || '(unknown)'}`;
    case 'checkout.sessions.create': return `Create checkout session (${params.mode || 'payment'})`;
    case 'webhookEndpoints.create': return `Create webhook endpoint: ${params.url || '(unknown)'}`;
    case 'webhookEndpoints.delete': return `Delete webhook endpoint ${params.id || '(unknown)'}`;
    default: {
      const parts = method.split('.');
      const action = parts[parts.length - 1];
      const resource = parts.slice(0, -1).join('.');
      if (params.id) return `${action} ${resource} ${params.id}`;
      return `${action} ${resource}`;
    }
  }
}

// ---------------------------------------------------------------------------
// Resource type extraction
// ---------------------------------------------------------------------------

function getResourceType(method: string): string | undefined {
  const parts = method.split('.');
  // For nested resources like 'billing.meters', return the full prefix
  return parts.length > 2 ? parts.slice(0, -1).join('.') : parts[0];
}

// ---------------------------------------------------------------------------
// Execute — generic dispatcher using Stripe SDK
// ---------------------------------------------------------------------------

/**
 * Navigate the Stripe SDK object tree and call the method.
 * Method names like 'paymentIntents.create' map to stripe.paymentIntents.create().
 * Nested names like 'billing.meters.create' map to stripe.billing.meters.create().
 * Sub-resource methods like 'customers.createTaxId' map to stripe.customers.createTaxId().
 */
async function execute(
  method: string,
  params: Record<string, unknown>,
  credentials: OAuthCredentials,
): Promise<unknown> {
  const stripe = getClient(credentials);
  const { id, ...rest } = params;

  // Split method into path segments: 'billing.meters.create' -> ['billing', 'meters', 'create']
  const parts = method.split('.');
  const action = parts.pop()!;
  const resourcePath = parts;

  // Navigate to the resource object on the stripe instance
  let resource: any = stripe;
  for (const part of resourcePath) {
    resource = resource[part];
    if (!resource) throw new Error(`Unknown Stripe resource path: ${resourcePath.join('.')}`);
  }

  const fn = resource[action];
  if (typeof fn !== 'function') {
    throw new Error(`Unknown Stripe method: ${method}`);
  }

  // Determine call pattern based on whether the method needs an ID
  // Sub-resource methods that need two IDs use specific param names
  const methodDef = allMethods.find((m) => m.name === method);
  if (!methodDef) throw new Error(`Unknown Stripe method: ${method}`);

  // Check for sub-resource patterns requiring two IDs
  // e.g., customers.retrieveBalanceTransaction(customerId, transactionId)
  // e.g., accounts.retrieveExternalAccount(accountId, externalAccountId)
  // e.g., transfers.retrieveReversal(transferId, reversalId)
  const subResourceKeys: Record<string, string> = {
    'customers.retrieveBalanceTransaction': 'transaction',
    'customers.updateBalanceTransaction': 'transaction',
    'customers.retrievePaymentMethod': 'payment_method',
    'customers.retrieveSource': 'source',
    'customers.updateSource': 'source',
    'customers.deleteSource': 'source',
    'customers.verifySource': 'source',
    'customers.retrieveTaxId': 'tax_id',
    'customers.deleteTaxId': 'tax_id',
    'accounts.retrieveExternalAccount': 'external_account',
    'accounts.updateExternalAccount': 'external_account',
    'accounts.deleteExternalAccount': 'external_account',
    'accounts.retrievePerson': 'person',
    'accounts.updatePerson': 'person',
    'accounts.deletePerson': 'person',
    'accounts.retrieveCapability': 'capability',
    'transfers.retrieveReversal': 'reversal',
    'transfers.updateReversal': 'reversal',
    'applicationFees.retrieveRefund': 'refund',
    'applicationFees.updateRefund': 'refund',
    'invoices.updateLineItem': 'invoice',
  };

  const subKey = subResourceKeys[method];
  if (subKey && id && params[subKey]) {
    const { [subKey]: subId, ...subRest } = rest;
    const hasBody = Object.keys(subRest).length > 0;
    return hasBody
      ? fn.call(resource, id, subId, subRest)
      : fn.call(resource, id, subId);
  }

  // Standard patterns
  const needsId = methodDef.params.some((p) => p.name === 'id' && p.required);
  const hasBody = Object.keys(rest).length > 0;

  if (needsId && id) {
    return hasBody ? fn.call(resource, id, rest) : fn.call(resource, id);
  }

  if (hasBody) {
    return fn.call(resource, rest);
  }

  return fn.call(resource);
}

// ---------------------------------------------------------------------------
// Connector export
// ---------------------------------------------------------------------------

export const stripeConnector: Connector = {
  service: 'stripe',
  name: 'Stripe',
  methods: allMethods,
  groupDescriptions: {
    paymentIntents: 'Create and manage payment intents',
    charges: 'Create and capture charges',
    refunds: 'Create and manage refunds',
    disputes: 'Retrieve, update, and close disputes',
    paymentMethods: 'Create, list, attach, detach payment methods',
    setupIntents: 'Set up payment methods for future use',
    tokens: 'Create single-use tokens',
    sources: 'Legacy payment sources',
    customers: 'Customer management and sub-resources',
    products: 'Product catalog',
    prices: 'Pricing for products',
    invoices: 'Invoice creation and management',
    invoiceItems: 'Individual invoice line items',
    creditNotes: 'Credit notes against invoices',
    subscriptions: 'Recurring billing subscriptions',
    subscriptionItems: 'Items within a subscription',
    subscriptionSchedules: 'Scheduled subscription changes',
    quotes: 'Price quotes for customers',
    billing: 'Billing meters, alerts, and credit grants',
    billingPortal: 'Customer self-service billing portal',
    accounts: 'Connected accounts (Stripe Connect)',
    transfers: 'Transfer funds to connected accounts',
    payouts: 'Pay out to bank accounts or cards',
    topups: 'Add funds to Stripe balance',
    applicationFees: 'Platform fees on Connect payments',
    balance: 'Account balance',
    balanceTransactions: 'Balance transaction history',
    checkout: 'Checkout sessions',
    paymentLinks: 'No-code payment links',
    issuing: 'Card issuing — cards, cardholders, authorizations',
    treasury: 'Treasury — financial accounts, transfers, reversals',
    terminal: 'In-person payments — readers, locations, configurations',
    identity: 'Identity verification sessions and reports',
    financialConnections: 'Bank account linking and data access',
    tax: 'Tax calculations, registrations, transactions',
    radar: 'Fraud detection — rules, value lists',
    reporting: 'Report runs and report types',
    events: 'Webhook event log',
    files: 'File uploads for disputes and identity',
    webhookEndpoints: 'Webhook endpoint management',
  },

  extractPermMetadata(
    method: string,
    params: Record<string, unknown>,
    accountId: string,
  ): PermissionMetadata {
    const methodDef = allMethods.find((m) => m.name === method);
    if (!methodDef) throw new Error(`Unknown Stripe method: ${method}`);
    return {
      service: 'stripe',
      accountId,
      method,
      operationType: methodDef.operationType,
      resourceType: getResourceType(method),
      description: describeStripeRequest(method, params),
    };
  },

  execute,

  help(method?: string): ServiceHelp {
    if (method) {
      const m = allMethods.find((md) => md.name === method);
      return { service: 'stripe', name: 'Stripe', methods: m ? [m] : [] };
    }
    return {
      service: 'stripe',
      name: 'Stripe',
      summary: 'Payment processing — charges, subscriptions, invoices, connect, issuing, treasury, and more',
      methods: allMethods,
    };
  },
};
