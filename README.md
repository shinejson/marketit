# MarketHub — Phase 1

Multi-tenant marketplace SaaS: Laravel API + Angular storefront, seller console, and super-admin.

## Stack

- Backend: Laravel 12, Sanctum, SQLite (swap to MySQL in `.env`)
- Frontend: Angular 19 standalone components
- Payments: `PaymentGateway` interface with a mock driver

## Demo accounts

Password for all: `password`

- Customer: `customer@markethub.test`
- Seller (Northstar): `seller1@markethub.test`
- Seller (Kente Home): `seller2@markethub.test`
- Super admin: `admin@markethub.test`
- Finance (Northstar staff): `finance@markethub.test`
- Sales: `sales@markethub.test`
- Operations: `ops@markethub.test`
- Marketing: `marketing@markethub.test`

## Run locally

```bash
# Backend (port 8001 — the Angular proxy targets 8001; 8000 may be taken by another local project)
cd backend
php artisan migrate:fresh --seed
php artisan storage:link          # required: serves /storage/* (seeded product images)
php artisan serve --host=127.0.0.1 --port=8001

# Frontend
cd frontend
npm install
npm start
```

The Angular dev server (port 4201) proxies `/api` and `/storage` to the Laravel app on port 8001.

## Super admin console

Sign in as `admin@markethub.test` and open `/admin`.

| Screen | What it does |
| --- | --- |
| Dashboard | KPI cards with period-over-period deltas, daily revenue/orders/tenant/user charts, tenant status donut, MRR by plan, top tenants, activity feed. Range switch: 7 / 30 / 90 days. |
| Tenants | Seller application review, approval, suspension (existing). |
| Users | Platform-wide user CRUD, role assignment (scoped to a tenant where relevant), suspend/activate, delete. |
| Subscriptions | Plans CRUD, tenant subscriptions (assign, change plan, change status, renew) and invoices (mark paid / void), with MRR, ARR, ARPA, churn and collected-revenue charts. |
| Settings | Grouped platform configuration: general, commerce, billing, notifications, security — with per-group reset to defaults. |

New API (all under `auth:sanctum` + `role:super_admin`):

```
GET    /api/admin/overview?days=30
GET    /api/admin/users            POST /api/admin/users
GET|PATCH|DELETE /api/admin/users/{user}      PUT /api/admin/users/{user}/roles
GET|POST /api/admin/plans          PATCH|DELETE /api/admin/plans/{plan}
GET|POST /api/admin/subscriptions  GET /api/admin/subscriptions/stats
PATCH  /api/admin/subscriptions/{subscription}   POST .../renew
GET    /api/admin/invoices         PATCH /api/admin/invoices/{invoice}
GET|PUT /api/admin/settings        POST /api/admin/settings/reset
```

Run `php artisan migrate --seed` (or `migrate:fresh --seed`) to pick up the `plans`,
`subscriptions`, `subscription_invoices` and `platform_settings` tables plus demo
tenants, subscriptions and six months of invoice history.

## Phase 1 coverage

- Tenant registration, stores, categories, products, variants, images, inventory
- Marketplace search/filter, multi-store cart, checkout split (master + seller orders)
- Mock payment intent + signed webhook + inventory reservation
- Seller fulfilment state machine and dashboard
- Super admin tenant approval, metrics, audit log
- Row-level `tenant_id` isolation (Eloquent global scope + policies)
- Tenant department dashboards (finance, sales, operations, marketing) with charts and goal progress
- Staff users, tenant settings, and JSON backups
