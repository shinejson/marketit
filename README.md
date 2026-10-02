# MarketHub — Phase 1

Multi-tenant marketplace SaaS: Laravel API + Angular storefront, tenant console, and super-admin.

## Stack

- Backend: Laravel 12, Sanctum, SQLite (swap to MySQL in `.env`)
- Frontend: Angular 19 standalone components
- Payments: `PaymentGateway` interface with a mock driver plus hosted Stripe Checkout, Paystack and Flutterwave adapters configured from the admin console

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

### Running the UI without PHP

If you only want to work on the Angular side, `tools/mock-api.mjs` serves the same
endpoints from in-memory fixtures on the port the proxy already targets — no PHP,
no database, no dependencies:

```bash
node tools/mock-api.mjs          # 127.0.0.1:8001
cd frontend && npm start         # 4201
```

Log in at `/admin/login` with any credentials to get a `super_admin` session. The
service-desk fixtures live in `tools/support-mock.mjs` and mirror the JSON that
`App\Support\SupportPresenter` produces, so the components behave the same against
either backend. State is in memory: restart the process to reset the demo data.

## Dashboard access and subdomains

The app now separates public marketplace, tenant, and super-admin access points. The path routes still work on a single local host, but production should point different subdomains at the same Angular/Laravel deployment.

| Portal | Preferred subdomain | Local path fallback | Login UI | Demo account |
| --- | --- | --- | --- | --- |
| Public marketplace | `www.<your-domain>` | `/` and `/login` | Customer marketplace login | `customer@markethub.test` |
| Tenant console | `tenants.<your-domain>` or `{tenant-slug}.<your-domain>` | `/tenant/login` then `/tenant` (`/seller` remains as a legacy alias) | Tenant-branded login | `seller1@markethub.test` |
| Super admin console | `admin.<your-domain>` | `/admin/login` then `/admin` | Platform-admin login | `admin@markethub.test` |

Tenant owners and store staff cannot sign in on the super-admin login, and customer/admin accounts cannot sign in on the tenant login. The Angular app also redirects `admin.*` hosts to the super-admin UI and `tenant.*`, `seller.*`, or `{tenant-slug}.*` hosts to the tenant UI. Locally, use `admin.localhost:4201` and `tenants.localhost:4201` if your browser resolves wildcard localhost; otherwise use the path fallbacks.

Tenant onboarding flow:

1. A user registers a customer account, then submits the seller application at `/sell`.
2. The account immediately receives a `tenant_owner` role and can open `/tenant` to prepare draft stores and products.
3. Draft stores/products remain private. A super admin reviews the application in `/admin/tenants` and activates the tenant.
4. Once activated, stores can be published and their active products appear in the marketplace.

## Super admin console

Sign in as `admin@markethub.test` at `/admin/login` (or `admin.<your-domain>`) and open `/admin`.

| Screen | What it does |
| --- | --- |
| Dashboard | KPI cards with period-over-period deltas, daily revenue/orders/tenant/user charts, tenant status donut, MRR by plan, top tenants, activity feed. Range switch: 7 / 30 / 90 days. |
| Tenants | Seller application review, approval, suspension (existing). |
| Users | Platform-wide user CRUD, role assignment (scoped to a tenant where relevant), suspend/activate, delete. |
| Subscriptions | Plans CRUD, tenant subscriptions (assign, change plan, change status, renew) and invoices (mark paid / void), with MRR, ARR, ARPA, churn and collected-revenue charts. |
| Audit log | Full platform activity trail, newest first: who performed each action (with avatar + email), the action and subject (with before/after diff detail), the tenant, the client IP, and the exact date/time. Filter by search, action, subject, user, IP, tenant and date range; KPI cards (total, today, last 7 days, users, unique IPs); a fixed-height timeline that shows ~10 rows and lazily loads older events as you scroll; CSV export. |
| Support overview | Service-desk command centre: six KPI cards (open / unassigned / urgent / SLA-breached / first-response / CSAT), a created-vs-resolved area chart, priority donut, channel & topic breakdowns, agent workload with presence, busiest tenants, the latest requests and the top-read guides. Range switch: 7 / 30 / 90 days. |
| Tickets | Three-pane support desk: filterable queue (search, all / open / unassigned / breached / resolved, priority / topic / assignee), the conversation thread with SLA banner and internal notes, a composer with canned replies and "send & resolve", and a context rail for inline status / priority / assignee / topic changes, requester and tenant facts and linked tasks. |
| Live chat | Real-time-feeling chat inbox: waiting / live / ended queues with unread counts and wait timers, the live conversation with typing indicator and quick replies, claim / assign / end / reopen / escalate-to-ticket actions, and a visitor + session context rail. Auto-refreshes every 10s (pausable). |
| Service tasks | Kanban board over To do / In progress / Blocked / Review / Done with HTML5 drag-and-drop, checklists you can tick from the card, overdue highlighting, owner filter (support team vs tenant actions), and a create/edit drawer. |
| Help & guides | Knowledge base manager: collection sidebar, article cards with reads and helpful scores, one-click publish / unpublish / pin, and a split-screen Markdown editor with live preview. |
| Settings | Configuration workspace for general, owner & company, branding (logo / dark logo / favicon / social image uploads, brand colours), commerce, billing, payments (Stripe Checkout, Paystack or Flutterwave hosted checkout, cards, mobile money, bank transfer and cash on delivery), email (SMTP + test send), SMS (gateway, sender ID, encrypted credentials + test send), notifications, security, and backup & recovery (snapshot, download, restore, retention). Provider secrets are encrypted and write-only; every section resets to schema defaults. |
| Security centre | Active bearer sessions, one-click revocation for individual devices or all other sessions, session lifetime / login-throttling posture, admin 2FA reminder and a hardening checklist. |

New API (all under `auth:sanctum` + `role:super_admin`):

```
GET    /api/admin/overview?days=30
GET    /api/admin/audit-logs?search|action|subject_type|actor_id|ip|tenant_id|from|to&page&per_page
GET    /api/admin/audit-logs/facets
GET    /api/admin/users            POST /api/admin/users
GET|PATCH|DELETE /api/admin/users/{user}      PUT /api/admin/users/{user}/roles
GET|POST /api/admin/plans          PATCH|DELETE /api/admin/plans/{plan}
GET|POST /api/admin/subscriptions  GET /api/admin/subscriptions/stats
PATCH  /api/admin/subscriptions/{subscription}   POST .../renew
GET    /api/admin/invoices         PATCH /api/admin/invoices/{invoice}
GET|PUT /api/admin/settings        POST /api/admin/settings/reset
POST|DELETE /api/admin/settings/assets/{asset}   (brand_logo, brand_logo_dark, brand_favicon, brand_og_image)
GET    /api/admin/settings/payment-status
POST   /api/admin/settings/email/test            POST /api/admin/settings/sms/test
GET    /api/payments/methods                     (public checkout capabilities)
GET    /api/auth/sessions                        DELETE /api/auth/sessions
DELETE /api/auth/sessions/{token}
GET|POST /api/admin/backups        GET /api/admin/backups/{backup}/download
POST   /api/admin/backups/{backup}/restore       DELETE /api/admin/backups/{backup}

GET    /api/admin/support/overview?days=30       GET /api/admin/support/agents
GET|POST /api/admin/support/tickets              GET|PATCH /api/admin/support/tickets/{ticket}
POST   /api/admin/support/tickets/{ticket}/messages
GET    /api/admin/support/chats                  GET|PATCH /api/admin/support/chats/{chat}
POST   /api/admin/support/chats/{chat}/messages
GET|POST /api/admin/support/tasks                PATCH|DELETE /api/admin/support/tasks/{task}
GET|POST /api/admin/support/guides               PATCH|DELETE /api/admin/support/guides/{guide}
POST   /api/admin/support/guide-categories       GET|POST /api/admin/support/canned-replies
```

The tenant side of the service desk lives under `auth:sanctum` + `tenant` + `role:tenant`
and backs the **Help centre** screen in the tenant console (`/seller/support`):

```
GET    /api/tenant/support/overview
GET|POST /api/tenant/support/tickets             GET /api/tenant/support/tickets/{ticket}
POST   /api/tenant/support/tickets/{ticket}/messages
POST   /api/tenant/support/tickets/{ticket}/rate
GET    /api/tenant/support/chat                  POST /api/tenant/support/chat/messages
GET    /api/tenant/support/tasks                 PATCH /api/tenant/support/tasks/{task}
GET    /api/tenant/support/guides                GET /api/tenant/support/guides/{guide}
POST   /api/tenant/support/guides/{guide}/feedback
```

Tenants only ever see their own tickets, tasks and chats; internal notes are stripped
from every tenant payload, and a tenant reply reopens a resolved or closed ticket.

Branding uploads are written to the `public` disk, so run `php artisan storage:link`
once. Email and SMS credentials are stored encrypted in `platform_settings` and are
never returned by the API — the UI only learns whether a value is set.

Run `php artisan migrate --seed` (or `migrate:fresh --seed`) to pick up the `plans`,
`subscriptions`, `subscription_invoices`, `platform_settings` and `platform_backups`
tables plus demo tenants, subscriptions and six months of invoice history. Seeding also
installs a curated 30-day `audit_logs` trail (real demo users as actors, plausible client
IPs, before/after diffs) so the admin audit console has meaningful data out of the box.

`SupportSeeder` fills the eight service-desk tables (`support_tickets`,
`support_messages`, `support_chats`, `support_chat_messages`, `support_tasks`,
`help_categories`, `help_articles`, `support_canned_replies`) with a realistic
queue: tickets across every status, priority and channel with threaded replies and
internal notes, live and queued chats, a task board, canned replies and a published
help centre.

## Phase 1 coverage

- Tenant registration, stores, categories, products, variants, images, inventory
- Marketplace search/filter, multi-store cart, checkout split (master + seller orders)
- Mock payment intent + signed webhook + inventory reservation
- Seller fulfilment state machine and dashboard
- Super admin tenant approval, metrics, audit log
- Row-level `tenant_id` isolation (Eloquent global scope + policies)
- Tenant department dashboards (finance, sales, operations, marketing) with charts and goal progress
- Full tenant accounting workspace: receivables, invoices, partial payments, payables, expenses, procurement, double-entry general ledger, chart of accounts, bank reconciliation, profit & loss, balance sheet, trial balance, cash flow and aging
- Staff users, tenant settings, and JSON backups
- Service desk: support tickets with SLAs, live chat, service tasks and a tenant-facing help centre
