import type { ConnectorMethod } from '@keepai/proto';
import { ID_PARAM, METADATA_PARAM, LIST_PARAMS, crudMethods } from './params.js';

// ===== ISSUING =====
export const issuingMethods: ConnectorMethod[] = [
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
