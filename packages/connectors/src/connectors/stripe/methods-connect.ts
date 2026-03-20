import type { ConnectorMethod } from '@keepai/proto';
import { ID_PARAM, METADATA_PARAM, LIST_PARAMS, crudMethods } from './params.js';

// ===== CONNECT =====
export const connectMethods: ConnectorMethod[] = [
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
