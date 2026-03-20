import type { ConnectorMethod } from '@keepai/proto';
import { ID_PARAM, METADATA_PARAM, LIST_PARAMS, crudMethods } from './params.js';

// ===== CORE PAYMENTS =====
export const coreMethods: ConnectorMethod[] = [
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
