/**
 * Stripe connector — ~390 methods covering core payments, customers, products,
 * billing, connect, checkout, issuing, treasury, terminal, identity,
 * financial connections, tax, radar, reporting, sigma, and more.
 *
 * Uses the official `stripe` npm package. Auth is via API key (manual entry).
 */

import Stripe from 'stripe';
import { AuthError, NetworkError, PermissionError, LogicError } from '@keepai/proto';
import type {
  Connector,
  ConnectorMethod,
  PermissionMetadata,
  ServiceHelp,
  OAuthCredentials,
  ResolveResult,
  ResolvableType,
} from '@keepai/proto';

import { coreMethods } from './methods-core.js';
import { customerMethods } from './methods-customers.js';
import { billingMethods } from './methods-billing.js';
import { connectMethods } from './methods-connect.js';
import { checkoutMethods } from './methods-checkout.js';
import { issuingMethods } from './methods-issuing.js';
import { treasuryMethods } from './methods-treasury.js';
import { otherMethods } from './methods-other.js';

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

/**
 * Build a resolvable [type:id] reference for a Stripe method's id param.
 * Maps method prefix to the correct resolvable type.
 */
function stripeRef(method: string, id: unknown): string {
  if (!id) return '(unknown)';
  const group = method.split('.')[0];
  const typeMap: Record<string, string> = {
    customers: 'customer_id',
    subscriptions: 'subscription_id',
    paymentIntents: 'payment_intent_id',
    invoices: 'invoice_id',
    products: 'product_id',
    prices: 'price_id',
  };
  const refType = typeMap[group];
  return refType ? `[${refType}:${id}]` : String(id);
}

function describeStripeRequest(method: string, params: Record<string, unknown>): string {
  switch (method) {
    case 'balance.retrieve': return 'Retrieve account balance';
    case 'customers.create': return `Create customer${params.email ? ` (${params.email})` : ''}`;
    case 'customers.delete': return `Delete ${stripeRef(method, params.id)}`;
    case 'paymentIntents.create': return `Create payment intent for ${formatAmount(params.amount as number, params.currency as string)}`;
    case 'paymentIntents.confirm': return `Confirm ${stripeRef(method, params.id)}`;
    case 'paymentIntents.capture': return `Capture ${stripeRef(method, params.id)}`;
    case 'paymentIntents.cancel': return `Cancel ${stripeRef(method, params.id)}`;
    case 'charges.create': return `Create charge for ${formatAmount(params.amount as number, params.currency as string)}`;
    case 'charges.capture': return `Capture charge ${params.id || '(unknown)'}`;
    case 'refunds.create': return `Create refund${params.payment_intent ? ` for ${params.payment_intent}` : params.charge ? ` for ${params.charge}` : ''}`;
    case 'invoices.create': return `Create invoice${params.customer ? ` for ${stripeRef('customers.x', params.customer)}` : ''}`;
    case 'invoices.finalizeInvoice': return `Finalize ${stripeRef(method, params.id)}`;
    case 'invoices.pay': return `Pay ${stripeRef(method, params.id)}`;
    case 'invoices.sendInvoice': return `Send ${stripeRef(method, params.id)}`;
    case 'invoices.voidInvoice': return `Void ${stripeRef(method, params.id)}`;
    case 'invoices.delete': return `Delete draft ${stripeRef(method, params.id)}`;
    case 'subscriptions.create': return `Create subscription for ${stripeRef('customers.x', params.customer)}`;
    case 'subscriptions.cancel': return `Cancel ${stripeRef(method, params.id)}`;
    case 'products.create': return `Create product "${params.name || ''}"`;
    case 'products.delete': return `Delete ${stripeRef(method, params.id)}`;
    case 'prices.create': return `Create price for ${stripeRef('products.x', params.product)}`;
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
      if (params.id) return `${action} ${resource} ${stripeRef(method, params.id)}`;
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

async function executeWithClassification(
  method: string,
  params: Record<string, unknown>,
  credentials: OAuthCredentials,
): Promise<unknown> {
  try {
    return await execute(method, params, credentials);
  } catch (err) {
    throw classifyStripeError(err);
  }
}

function classifyStripeError(err: unknown): Error {
  if (err instanceof Stripe.errors.StripeAuthenticationError
      || err instanceof Stripe.errors.StripeInvalidGrantError) {
    return new AuthError('Stripe API key is invalid or expired', {
      cause: err as Error, source: 'stripe', serviceId: 'stripe', accountId: '',
    });
  }
  if (err instanceof Stripe.errors.StripePermissionError) {
    return new PermissionError((err as Error).message, { cause: err as Error, source: 'stripe' });
  }
  if (err instanceof Stripe.errors.StripeRateLimitError) {
    return new NetworkError((err as Error).message, { cause: err as Error, source: 'stripe', statusCode: 429 });
  }
  if (err instanceof Stripe.errors.StripeConnectionError) {
    return new NetworkError((err as Error).message, { cause: err as Error, source: 'stripe' });
  }
  if (err instanceof Stripe.errors.StripeAPIError) {
    const status = (err as any).statusCode;
    if (status && status >= 500) {
      return new NetworkError((err as Error).message, { cause: err as Error, source: 'stripe', statusCode: status });
    }
    return new LogicError((err as Error).message, { cause: err as Error, source: 'stripe' });
  }
  if (err instanceof Stripe.errors.StripeError) {
    return new LogicError((err as Error).message, { cause: err as Error, source: 'stripe' });
  }
  return err instanceof Error ? err : new Error(String(err));
}

// ---------------------------------------------------------------------------
// Connector export
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Resolvable ID types & resolver
// ---------------------------------------------------------------------------

const stripeResolvableTypes: Record<string, ResolvableType> = {
  customer_id: {
    label: 'Customer',
    params: { 'customers.retrieve': 'id', 'customers.update': 'id', 'customers.delete': 'id' },
  },
  subscription_id: {
    label: 'Subscription',
    params: { 'subscriptions.retrieve': 'id', 'subscriptions.update': 'id', 'subscriptions.cancel': 'id' },
  },
  payment_intent_id: {
    label: 'Payment',
    params: { 'paymentIntents.retrieve': 'id', 'paymentIntents.update': 'id', 'paymentIntents.confirm': 'id', 'paymentIntents.cancel': 'id', 'paymentIntents.capture': 'id' },
  },
  invoice_id: {
    label: 'Invoice',
    params: { 'invoices.retrieve': 'id', 'invoices.update': 'id', 'invoices.delete': 'id', 'invoices.pay': 'id', 'invoices.finalizeInvoice': 'id', 'invoices.sendInvoice': 'id', 'invoices.voidInvoice': 'id' },
  },
  product_id: {
    label: 'Product',
    params: { 'products.retrieve': 'id', 'products.update': 'id', 'products.delete': 'id' },
  },
  price_id: {
    label: 'Price',
    params: { 'prices.retrieve': 'id', 'prices.update': 'id' },
  },
};

async function resolveStripeId(
  type: string,
  id: string,
  credentials: OAuthCredentials,
): Promise<ResolveResult | null> {
  const stripe = getClient(credentials);
  try {
    switch (type) {
      case 'customer_id': {
        const customer: any = await stripe.customers.retrieve(id);
        if (customer.deleted) return { title: '(deleted customer)' };
        return {
          title: customer.name || customer.email || id,
          url: `https://dashboard.stripe.com/customers/${id}`,
        };
      }
      case 'subscription_id': {
        const sub: any = await stripe.subscriptions.retrieve(id);
        return {
          title: `Subscription (${sub.status})`,
          url: `https://dashboard.stripe.com/subscriptions/${id}`,
        };
      }
      case 'payment_intent_id': {
        const pi: any = await stripe.paymentIntents.retrieve(id);
        const amount = formatAmount(pi.amount, pi.currency);
        return {
          title: `${amount} (${pi.status})`,
          url: `https://dashboard.stripe.com/payments/${id}`,
        };
      }
      case 'invoice_id': {
        const inv: any = await stripe.invoices.retrieve(id);
        const amount = inv.amount_due ? formatAmount(inv.amount_due, inv.currency || 'usd') : '';
        return {
          title: [amount, inv.status].filter(Boolean).join(' — '),
          url: `https://dashboard.stripe.com/invoices/${id}`,
        };
      }
      case 'product_id': {
        const product: any = await stripe.products.retrieve(id);
        return {
          title: product.name || id,
          url: `https://dashboard.stripe.com/products/${id}`,
        };
      }
      case 'price_id': {
        const price: any = await stripe.prices.retrieve(id);
        const amount = formatAmount(price.unit_amount || 0, price.currency);
        const interval = price.recurring ? `/${price.recurring.interval}` : '';
        return {
          title: `${amount}${interval}`,
          url: `https://dashboard.stripe.com/prices/${id}`,
        };
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Connector export
// ---------------------------------------------------------------------------

export const stripeConnector: Connector = {
  service: 'stripe',
  name: 'Stripe',
  methods: allMethods,
  resolvableTypes: stripeResolvableTypes,
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

  execute: executeWithClassification,
  resolveId: resolveStripeId,

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
