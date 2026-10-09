# Tenant Report Center

`/tenant/reports` (also served under `/tenants/reports` and `/seller/reports`) is
the tenant-facing reporting workspace: pick a report, set a window and filters,
choose columns, then read it on screen or take it away as CSV or PDF.

* Page: `frontend/src/app/features/seller/analytics.component.ts`
* API: `GET /api/tenant/reports/catalog`, `GET /api/tenant/reports/generate`
* Controller: `backend/app/Http/Controllers/Api/TenantReportController.php`
* Access rules: `backend/app/Support/TenantReportCatalog.php`

---

## 1. The access model

Three layers decide what a person sees, and only the last one is a security
boundary:

1. **Route group** (`tenant` + `role:tenant`) proves the caller belongs to a
   tenant workspace, resolves the tenant context and refuses suspended
   assignments.
2. **Report permission.** Every report in `TenantReportCatalog::definitions()`
   names the tenant permission it requires. `generate()` answers `403` unless
   the caller's permission list contains it, and `catalog()` leaves the report
   out of the response entirely, so the sidebar never advertises data the person
   is not entitled to.
3. **Column restriction.** A report may also declare columns that belong to a
   *different* permission. `orders_master` returns buyer email addresses, and
   those are masked to `Restricted` unless the caller holds `customers.view`.

Permission lists come from `TenantAccess` — tenant owners resolve to the whole
catalogue, staff resolve to their assigned tenant role plus any per-user
override, and a suspended assignment resolves to nothing at all.

### Report → permission map

| Category | Report | Permission | Implemented |
| --- | --- | --- | --- |
| Sales & Orders | `sales_summary`, `orders_master`, `orders_by_status`, `orders_cancelled`, `fulfillment_delivery`, `discounts_coupons`, `geographic_sales` | `orders.view` | first two |
| Catalog & Inventory | `inventory_stock`, `low_stock_alerts`, `inventory_valuation`, `slow_moving_stock` | `inventory.view` | `inventory_stock` |
| Catalog & Inventory | `best_sellers`, `category_performance` | `catalog.view` | — |
| Finance & Accounting | `invoices_breakdown`, `expenses_bills`, `payments_ledger`, `pnl_statement`, `tax_summary`, `settlements_payouts`, `vendor_payables` | `finance.view` | first three |
| Customers | `customers_directory`, `repeat_buyers` | `customers.view` | — |
| Marketing | `ads_performance` | `marketing.view` | — |
| Marketing | `traffic_funnel`, `store_comparison` | `analytics.view` | — |
| Audit & Operations | `audit_trail` | `team.view` | yes |

Downloading a report (`Export CSV` / `Generate PDF`) additionally requires
`reports.export`. Both downloads are built in the browser from rows the caller
has already been allowed to read, so the permission hides the controls rather
than guarding a separate endpoint.

Add a report by adding one entry to `TenantReportCatalog::definitions()` with a
`generator` that names a controller method. `TenantReportCatalog::audit()` fails
the test suite if a permission key is not published in `TenantRole` or if a
generator does not exist.

---

## 2. Request guards on `generate()`

* `report` must be a key in the catalogue → `422` otherwise. Method-shaped keys
  (`__construct`, `permissionsFor`, …) are simply unknown keys: the generator is
  looked up in the server-side map, never derived from the request, so the
  dynamic call cannot be steered by a caller.
* A report without a generator answers `501` instead of quietly returning
  another report's rows under the wrong title.
* `start_date` / `end_date` must parse, must not be inverted, and are capped at
  `TenantReportCatalog::MAX_RANGE_DAYS` (366) — an unbounded window used to fan
  the day-by-day sales rollup out to tens of thousands of rows.
* `store_id` / `category_id` must be integers, `amount_min` / `amount_max`
  non-negative numbers.
* The tenant id is taken from the caller's own assignment only. There is no
  fallback tenant, so an unresolvable workspace returns `403` and no rows.
* Every query stays inside `tenant_id`; `AuditLog` is scoped explicitly because
  it does not use the `BelongsToTenant` global scope.

---

## 3. Console behaviour

* The sidebar is rendered from `catalog()`, never from a hardcoded list, and the
  first report the caller may open is generated on arrival.
* Reports with no generator yet are listed but disabled, so a tenant can see
  what is coming without being handed the wrong numbers.
* `Export CSV` and `Generate PDF` are hidden without `reports.export`, and both
  handlers refuse to run without it.
* The `Reports` sidebar entry, its two command-palette entries and the route
  itself are hidden from roles that carry none of the report permissions
  (`core/tenant-permissions.ts`). Hiding is convenience: the API re-checks every
  permission on every request, so a hand-edited URL never widens access.

---

## 4. Local development without PHP

`tools/reports-mock.mjs` (mounted by `tools/mock-api.mjs`) serves the catalogue,
the generated datasets, the `403` / `422` / `501` paths and the column masking,
mirroring `TenantReportCatalog`. Keep the two in sync when a report ships.

---

## 5. Tests

* `backend/tests/Feature/TenantReportCenterTest.php` — catalogue filtering per
  role, per-report `403`s, `501` for unimplemented reports, unknown and
  method-shaped keys, window validation, buyer-email masking, tenant scoping,
  suspended staff and customers, and catalogue integrity.

---

## 6. Known gaps

* **19 of the 26 catalogue reports have no generator.** They are advertised as
  unavailable and answer `501`; each needs a real query before it can be turned
  on by adding its `generator` to the catalogue.
* `GET /api/tenant/audit-logs` and `/facets` are still open to any tenant staff
  member. The report version of the same data is gated behind `team.view`; the
  list endpoints should match.
* `GET /api/tenant/analytics` has no permission check either. It feeds the
  dashboard KPIs, so `dashboard.view` or `analytics.view` would be the natural
  gate.
