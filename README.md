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

## Phase 1 coverage

- Tenant registration, stores, categories, products, variants, images, inventory
- Marketplace search/filter, multi-store cart, checkout split (master + seller orders)
- Mock payment intent + signed webhook + inventory reservation
- Seller fulfilment state machine and dashboard
- Super admin tenant approval, metrics, audit log
- Row-level `tenant_id` isolation (Eloquent global scope + policies)
