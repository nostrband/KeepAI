import type { ConnectorMethod } from '@keepai/proto';
import { ID_PARAM, LIST_PARAMS, crudMethods } from './params.js';

// ===== TREASURY =====
export const treasuryMethods: ConnectorMethod[] = [
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
