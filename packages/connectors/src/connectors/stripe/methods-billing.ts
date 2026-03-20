import type { ConnectorMethod } from '@keepai/proto';
import { ID_PARAM, METADATA_PARAM, LIST_PARAMS, crudMethods } from './params.js';

// ===== BILLING =====
export const billingMethods: ConnectorMethod[] = [
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
