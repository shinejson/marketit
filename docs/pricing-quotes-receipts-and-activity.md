# Pricing, quotes, receipts & activity trail

Covers the commerce upgrade landed on top of the existing marketplace,
tenant console and admin console: product discount + tax pricing that
flows end to end, a two-way request-for-quote (RFQ) channel, the receipt
builder in workspace settings, full invoice CRUD and per-workspace
activity logs.

## Product pricing: discount + tax

**Schema** (migration `2026_10_05_140000`): `products.tax_rate`
(`decimal(5,2)`, nullable). It pairs with the existing
`products.compare_at_price` (the strikethrough "was" price) and
`products.tax_class`.

Tax resolution order for one line:

1. `tax_class` of `zero-rated`, `zero_rated`, `zero`, `exempt` or
   `out_of_scope` → 0 %.
2. `products.tax_rate` when set.
3. `tenant_settings.tax_rate` (the workspace default from Settings → Commerce).

The same rule is applied by `CartService::groupedPayload` and by
`QuoteRequestController`, so cart, checkout (line tax is persisted on
`order_items.line_tax`) and quotes always agree. Cart payloads now expose
`line_tax`/`tax_rate` per item and `tax_total` per store group; the cart
and checkout pages render the tax line when it is non-zero.

**Market payloads** (`MarketController::productCard`) now include
`compare_at_price`, `on_sale`, `discount_percent`, `tax_class`,
`tax_rate`, `unit`, `unit_amount`, `min_order_qty`, the store
`delivery_fee`, and — on the detail view — `short_description`, `tags`,
`condition`, `warranty_months`. The storefront product page shows the
strikethrough price, a "Save n%" badge, the tax note and a unit price;
catalog/home cards show the sale flag and struck compare-at price.

The product editor (`/tenant/products`) gained a **Tax rate override**
field beside Tax class.

## Request for quote (RFQ)

Customers can ask for a quote straight from a product page — the
"Request a quote" dialog posts `store_id`, a quantity and an optional
message to:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/quotes` | The signed-in customer's requests (paginated). |
| POST | `/api/quotes` | Create an RFQ. Prices/tax are derived server-side from the live catalogue (throttled 12/min). |
| GET | `/api/quotes/{quote}` | One owned quote with items. |
| POST | `/api/quotes/{quote}/respond` | `action: accept\|decline` on a sent quote. |

Schema (migration `2026_10_05_140200`): `sales_quotes` gains
`customer_user_id` (FK users), `source` (`staff` | `customer_request`)
and `request_message`.

RFQs arrive in the tenant sales workspace as normal `SalesQuote` drafts
numbered `RFQ-YYYY-00001`, linked to the CRM customer by email when one
exists. The quotes board (`/tenant/sales/quotes`) shows an
orange **Customer request** badge, a *Customer requests* origin filter
and a **Review & price** action that reopens the draft in the quote
drawer — `PATCH /api/tenant/sales/quotes/{quote}` now accepts the full
draft payload (customer, dates, notes, discount, items) for draft
quotes and recomputes totals; adding `status: sent` prices + sends in
one call. Sent quotes appear on the customer's **My quotes** page
(`/quotes`, linked in the marketplace header) with accept/decline.

## Receipt builder

Settings → **Receipt builder** (`/tenant/settings`) edits the template
used by invoice/receipt printouts, with a live preview (A4 / A5 /
80 mm till roll).

**Schema** (migration `2026_10_05_140100`): `tenant_settings.receipt`
(JSON), merged onto `TenantSetting::DEFAULT_RECEIPT`:

| Key | Default | Notes |
| --- | --- | --- |
| `header_line`, `address_line`, `footer_note` | text | printed lines |
| `tax_label` | `Tax` | label on tax rows |
| `show_tax_breakdown`, `show_discounts`, `show_sku`, `show_logo` | booleans | line toggles |
| `paper_size` | `a4` | `a4` / `a5` / `80mm` |
| `accent_color` | `#1f4b3a` | hex colour |

The accounting invoices table gained **View** (printable invoice drawn
with the tenant's receipt template, `window.print()` with print CSS for
PDF export) and **Delete** for drafts.

## Invoice CRUD

`AccountingController` completes the set:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/tenant/accounting/invoices/{invoice}` | One invoice with contact, items and payments (print view). |
| DELETE | `/api/tenant/accounting/invoices/{invoice}` | Delete a draft without payments; sent invoices are voided instead. |

## Logs & activity trail

The platform-wide audit log stays on the admin console
(`/admin/audit`, also reachable as `/admin/logs`) and is unchanged.

New tenant equivalent — `TenantAuditController`:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/tenant/audit-logs` | The workspace's own create/update/delete events with stats. Filters: `q`, `action`, `subject_type`, `actor_id`, `ip`, `from`, `to`, pagination. |
| GET | `/api/tenant/audit-logs/facets` | Filter dropdown options (actions, subjects, actors, IPs). |

The console page is **Workspace → Activity log** (`/tenant/activity`,
alias `/tenant/logs`, nav entry under Admin): KPI cards, facet filters,
expandable before/after diffs and CSV export.
