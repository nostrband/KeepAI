# Stripe Methods — Customers & Products

Sub-spec of [stripe-connector.md](./stripe-connector.md). Covers customer management, catalog, and pricing.

## Customers (27 methods)

Core customer objects with sub-resources for payment methods, balance, sources, and tax IDs.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `customers.create` | write | `stripe.customers.create(params)` | Create a new customer. |
| `customers.retrieve` | read | `stripe.customers.retrieve(id)` | Retrieve a customer. |
| `customers.update` | write | `stripe.customers.update(id, params)` | Update a customer. When setting a new card source, retries past_due subscription invoices. |
| `customers.list` | read | `stripe.customers.list(params)` | List customers, sorted by creation date. |
| `customers.delete` | delete | `stripe.customers.del(id)` | Permanently delete a customer. Immediately cancels active subscriptions. |
| `customers.search` | read | `stripe.customers.search(params)` | Search customers using Stripe Search Query Language. |
| `customers.createBalanceTransaction` | write | `stripe.customers.createBalanceTransaction(id, params)` | Create an immutable transaction on the customer's credit balance. |
| `customers.retrieveBalanceTransaction` | read | `stripe.customers.retrieveBalanceTransaction(custId, txnId)` | Retrieve a specific balance transaction. |
| `customers.updateBalanceTransaction` | write | `stripe.customers.updateBalanceTransaction(custId, txnId, params)` | Update balance transaction description/metadata. |
| `customers.listBalanceTransactions` | read | `stripe.customers.listBalanceTransactions(id, params)` | List transactions that updated the customer's balance. |
| `customers.retrieveCashBalance` | read | `stripe.customers.retrieveCashBalance(id)` | Retrieve the customer's cash balance. |
| `customers.updateCashBalance` | write | `stripe.customers.updateCashBalance(id, params)` | Update cash balance settings. |
| `customers.listCashBalanceTransactions` | read | `stripe.customers.listCashBalanceTransactions(id, params)` | List cash balance transactions. |
| `customers.createFundingInstructions` | write | `stripe.customers.createFundingInstructions(id, params)` | Retrieve (or create) funding instructions for customer cash balance. |
| `customers.listPaymentMethods` | read | `stripe.customers.listPaymentMethods(id, params)` | List PaymentMethods for a customer. |
| `customers.retrievePaymentMethod` | read | `stripe.customers.retrievePaymentMethod(custId, pmId)` | Retrieve a PaymentMethod for a customer. |
| `customers.createSource` | write | `stripe.customers.createSource(id, params)` | Add a payment source (card/bank) to a customer. |
| `customers.retrieveSource` | read | `stripe.customers.retrieveSource(custId, srcId)` | Retrieve a customer's payment source. |
| `customers.updateSource` | write | `stripe.customers.updateSource(custId, srcId, params)` | Update a customer's payment source. |
| `customers.deleteSource` | delete | `stripe.customers.deleteSource(custId, srcId)` | Delete a customer's payment source. |
| `customers.listSources` | read | `stripe.customers.listSources(id, params)` | List a customer's payment sources. |
| `customers.verifySource` | write | `stripe.customers.verifySource(custId, srcId, params)` | Verify a bank account source via microdeposits. |
| `customers.createTaxId` | write | `stripe.customers.createTaxId(id, params)` | Create a tax ID for a customer. |
| `customers.retrieveTaxId` | read | `stripe.customers.retrieveTaxId(custId, taxId)` | Retrieve a customer's tax ID. |
| `customers.listTaxIds` | read | `stripe.customers.listTaxIds(id, params)` | List a customer's tax IDs. |
| `customers.deleteTaxId` | delete | `stripe.customers.deleteTaxId(custId, taxId)` | Delete a customer's tax ID. |
| `customers.deleteDiscount` | delete | `stripe.customers.deleteDiscount(id)` | Remove the currently applied discount from a customer. |

### Key Params — customers.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | no | Customer's email (up to 512 chars) |
| `name` | string | no | Full name or business name |
| `phone` | string | no | Phone number |
| `description` | string | no | Arbitrary description |
| `address` | object | no | `{ line1, line2, city, state, postal_code, country }` |
| `metadata` | object | no | Key-value metadata |
| `payment_method` | string | no | Default payment method ID |
| `invoice_settings` | object | no | Default invoice settings |

### Key Params — customers.search

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | yes | Search query: `email:"alice@example.com"`, `name~"Alice"`, `metadata["key"]:"value"` |

**seeAlso**: `paymentMethods.list`, `subscriptions.create`, `invoices.create`

---

## Products (10 methods)

Items and services you sell. Each product can have one or more prices.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `products.create` | write | `stripe.products.create(params)` | Create a new product. |
| `products.retrieve` | read | `stripe.products.retrieve(id)` | Retrieve a product. |
| `products.update` | write | `stripe.products.update(id, params)` | Update a product. |
| `products.list` | read | `stripe.products.list(params)` | List products, most recent first. |
| `products.delete` | delete | `stripe.products.del(id)` | Delete a product (only if it has no prices/SKUs). |
| `products.search` | read | `stripe.products.search(params)` | Search products using Stripe Search Query Language. |
| `products.createFeature` | write | `stripe.products.createFeature(id, params)` | Attach a feature to a product. |
| `products.retrieveFeature` | read | `stripe.products.retrieveFeature(prodId, featId)` | Retrieve a product feature. |
| `products.listFeatures` | read | `stripe.products.listFeatures(id, params)` | List features attached to a product. |
| `products.deleteFeature` | delete | `stripe.products.deleteFeature(prodId, featId)` | Remove a feature from a product. |

### Key Params — products.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Product name |
| `description` | string | no | Product description |
| `active` | boolean | no | Whether the product is available for purchase (default: true) |
| `default_price_data` | object | no | `{ unit_amount, currency, recurring? }` — create a default price |
| `images` | array | no | Up to 8 image URLs |
| `metadata` | object | no | Key-value metadata |
| `url` | string | no | URL of the product page |

**seeAlso**: `prices.create`, `subscriptions.create`

---

## Prices (5 methods)

Pricing for products — can be one-time or recurring.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `prices.create` | write | `stripe.prices.create(params)` | Create a new price for a product. Can be recurring or one-time. |
| `prices.retrieve` | read | `stripe.prices.retrieve(id)` | Retrieve a price. |
| `prices.update` | write | `stripe.prices.update(id, params)` | Update a price. |
| `prices.list` | read | `stripe.prices.list(params)` | List active prices (set `active: false` for inactive). |
| `prices.search` | read | `stripe.prices.search(params)` | Search prices using Stripe Search Query Language. |

### Key Params — prices.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `product` | string | yes | Product ID this price belongs to |
| `currency` | string | yes | Three-letter ISO currency code |
| `unit_amount` | number | no | Amount in smallest currency unit |
| `recurring` | object | no | `{ interval: 'month'|'year'|'week'|'day', interval_count? }` |
| `billing_scheme` | string | no | `per_unit` (default) or `tiered` |
| `tiers` | array | no | Tier definitions for tiered pricing |
| `metadata` | object | no | Key-value metadata |

**seeAlso**: `products.create`, `subscriptions.create`

---

## Plans (5 methods)

Legacy pricing API, replaced by Prices. Backwards compatible.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `plans.create` | write | `stripe.plans.create(params)` | Create a plan (legacy — use Prices API instead). |
| `plans.retrieve` | read | `stripe.plans.retrieve(id)` | Retrieve a plan. |
| `plans.update` | write | `stripe.plans.update(id, params)` | Update a plan. Cannot change ID, amount, currency, or billing cycle. |
| `plans.list` | read | `stripe.plans.list(params)` | List plans. |
| `plans.delete` | delete | `stripe.plans.del(id)` | Delete a plan. Existing subscribers are not affected. |

**notes**: Plans are deprecated — use `prices.create` with `recurring` instead.

**seeAlso**: `prices.create`, `subscriptions.create`

---

## Coupons (5 methods)

Discounts that can be applied to customers or subscriptions.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `coupons.create` | write | `stripe.coupons.create(params)` | Create a coupon with `percent_off` or `amount_off`. |
| `coupons.retrieve` | read | `stripe.coupons.retrieve(id)` | Retrieve a coupon. |
| `coupons.update` | write | `stripe.coupons.update(id, params)` | Update coupon metadata. Amount/duration not editable. |
| `coupons.list` | read | `stripe.coupons.list(params)` | List coupons. |
| `coupons.delete` | delete | `stripe.coupons.del(id)` | Delete a coupon. Existing applications are not affected. |

### Key Params — coupons.create

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `percent_off` | number | no* | Percentage discount (1-100). *One of `percent_off` or `amount_off` required. |
| `amount_off` | number | no* | Fixed amount discount in smallest currency unit. |
| `currency` | string | no | Required if `amount_off` is set. |
| `duration` | string | yes | `once`, `repeating`, or `forever` |
| `duration_in_months` | number | no | Required if duration is `repeating`. |
| `max_redemptions` | number | no | Max times coupon can be redeemed. |
| `redeem_by` | number | no | Unix timestamp — coupon expires after this date. |

**seeAlso**: `promotionCodes.create`, `subscriptions.create`

---

## PromotionCodes (4 methods)

Customer-facing codes that apply coupons.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `promotionCodes.create` | write | `stripe.promotionCodes.create(params)` | Create a promotion code pointing to a coupon. |
| `promotionCodes.retrieve` | read | `stripe.promotionCodes.retrieve(id)` | Retrieve a promotion code. Use `list` with `code` param to look up by customer-facing code. |
| `promotionCodes.update` | write | `stripe.promotionCodes.update(id, params)` | Update a promotion code (limited fields editable). |
| `promotionCodes.list` | read | `stripe.promotionCodes.list(params)` | List promotion codes. |

**seeAlso**: `coupons.create`

---

## ShippingRates (4 methods)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `shippingRates.create` | write | `stripe.shippingRates.create(params)` | Create a shipping rate. |
| `shippingRates.retrieve` | read | `stripe.shippingRates.retrieve(id)` | Retrieve a shipping rate. |
| `shippingRates.update` | write | `stripe.shippingRates.update(id, params)` | Update a shipping rate. |
| `shippingRates.list` | read | `stripe.shippingRates.list(params)` | List shipping rates. |

---

## TaxCodes (2 methods)

Stripe's catalog of tax codes for products.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `taxCodes.retrieve` | read | `stripe.taxCodes.retrieve(id)` | Retrieve a tax code. |
| `taxCodes.list` | read | `stripe.taxCodes.list(params)` | List all available tax codes. |

---

## TaxRates (4 methods)

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `taxRates.create` | write | `stripe.taxRates.create(params)` | Create a new tax rate. |
| `taxRates.retrieve` | read | `stripe.taxRates.retrieve(id)` | Retrieve a tax rate. |
| `taxRates.update` | write | `stripe.taxRates.update(id, params)` | Update a tax rate. |
| `taxRates.list` | read | `stripe.taxRates.list(params)` | List tax rates, most recent first. |

---

## TaxIds (4 methods)

Tax identification numbers for accounts or customers.

| Method | Op Type | SDK Call | Description |
|--------|---------|----------|-------------|
| `taxIds.create` | write | `stripe.taxIds.create(params)` | Create a tax ID for an account or customer. |
| `taxIds.retrieve` | read | `stripe.taxIds.retrieve(id)` | Retrieve a tax ID. |
| `taxIds.list` | read | `stripe.taxIds.list(params)` | List tax IDs. |
| `taxIds.delete` | delete | `stripe.taxIds.del(id)` | Delete a tax ID. |

---

**Total: 70 methods**
