import type { ConnectorMethod } from '@keepai/proto';
import { ID_PARAM, LIST_PARAMS, crudMethods } from './params.js';

// ===== CHECKOUT =====
export const checkoutMethods: ConnectorMethod[] = [
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
