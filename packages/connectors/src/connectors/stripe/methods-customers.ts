import type { ConnectorMethod } from '@keepai/proto';
import { ID_PARAM, METADATA_PARAM, LIST_PARAMS, crudMethods } from './params.js';

// ===== CUSTOMERS & PRODUCTS =====
export const customerMethods: ConnectorMethod[] = [
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
