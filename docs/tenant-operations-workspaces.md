# Tenant operations workspaces

Covers the three tenant console pages rebuilt on top of the shared workspace
design language already used by `/tenant/products` and `/tenant/orders`:

| Page | Route | Component | Styles |
| --- | --- | --- | --- |
| Inventory | `/tenant/inventory` | `SellerInventoryComponent` | `inventory.workspace.scss` |
| Sponsored ads | `/tenant/ads` | `SellerAdsComponent` | `ads.workspace.scss` |
| Analytics | `/tenant/analytics` | `SellerAnalyticsComponent` | `analytics.workspace.scss` |

All three share `_workspace-kit.scss`, a mixin with the common page chrome
(header, KPI cards, filter tabs, tables, drawers, toasts, skeletons). The
stylesheets are global — imported from `src/styles.scss` — so each component
stays inside Angular's per-component CSS budget and dark mode works for free.

## Inventory — stock control

Previously a flat "low stock" list. It is now the screen used to actually run
stock, backed by an append-only ledger.

**Schema.** `stock_movements` (migration `2026_10_02_150000`) records every
receipt, adjustment, count, write-off, transfer or return with the balance
before and after, the actor, a reference and an optional note.

**API** (`InventoryController`):

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/tenant/inventory` | Paginated rows + stats + filter options. Supports `q`, `store_id`, `location`, `state`, `sort`, `per_page`. |
| GET | `/api/tenant/inventory/meta` | Stores, known locations, movement types. |
| GET | `/api/tenant/inventory/movements` | Ledger feed, optionally for one `variant_id`. |
| GET | `/api/tenant/inventory/low-stock` | Unchanged route, now returns the enriched row shape. |
| POST | `/api/tenant/inventory/{inventory}/adjust` | One movement: `receipt`, `count`, `adjustment`, `damage`, `return`, `transfer`. |
| POST | `/api/tenant/inventory/bulk` | `receive`, `adjust`, `restock_to`, `set_threshold`, `relocate`. |

Semantics worth knowing: a `count` takes the **counted quantity** and books the
difference; `damage` always subtracts; `receipt`/`return` always add. Balances
never go below zero. Every write goes through `applyMovement()` in a
transaction, so the ledger always explains the current balance.

The UI adds derived state per row (`in_stock`, `low_stock`, `out_of_stock`,
`backorder`, `untracked`), a reorder suggestion, stock value at retail and
cost, and expiry countdowns for perishables.

## Ads — campaign performance

`GET /api/tenant/ads?days=30` now returns campaigns already joined to measured
delivery for the window: impressions, clicks, CTR, spend, average CPC and CPM,
plus budget pacing (daily and total), a `summary` block with wallet runway, a
daily `series` for the trend chart, `top_products` by clicks and the recent
wallet `ledger`. `GET /api/tenant/ads/meta` feeds the campaign composer.

Campaigns can be created and edited with objectives, start/end dates and a
product multi-select; `DELETE /api/tenant/ads/{campaign}` removes a campaign
once it is not active. Activating a campaign is rejected with 422 when the ad
wallet is empty, which is what the low-balance banner in the UI warns about.

## Analytics — reporting

`TenantAnalyticsService::report()` computes a window **and** the immediately
preceding window of the same length, so every KPI ships with `previous`,
`delta_percent` and `direction`. The payload also carries a daily series,
conversion funnel with cart abandonment, order status mix, best sellers, store
breakdown, customer loyalty, ad spend and plain-language highlights.

`GET /api/tenant/analytics?days=30&store_id=1`. Cancelled and refunded seller
orders are excluded from revenue everywhere. The legacy all-time numbers are
still available under `data.lifetime`, and `gmv`/`orders`/`views` remain at the
top level for older clients.

## Tests

`tests/Feature/TenantOperationsWorkspacesTest.php` covers tenant scoping, the
ledger semantics (receipt, count, damage), bulk threshold updates, the ads
payload shape, campaign creation, the empty-wallet activation guard, wallet
funding and the analytics report structure.
