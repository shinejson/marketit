# Users, roles & customer social login

The `/tenant/users` workspace is the access-control centre for a tenant. It
answers three questions in one place:

| Tab | Question | Backed by |
| --- | --- | --- |
| **System users** | Who can sign into this console, and what may each person do? | `user_roles` + `tenant_roles` |
| **Customers** | Who buys from my stores, and how do they sign in? | `users` + `tenant_customer_profiles` + `social_identities` |
| **Roles & permissions** | Which reusable permission sets exist? | `tenant_roles` |

---

## 1. The access model

Access is deliberately split into **two layers** so that an existing login
routing rule never depends on a permission checkbox.

```
user_roles.role            →  portal access level: tenant_owner | store_staff
user_roles.tenant_role_id  →  permission profile (tenant_roles row)
user_roles.permissions     →  per-user override (JSON, NULL = inherit the role)
```

* **Access level** decides *where* a person lands and is what `EnsureRole`
  middleware and `User::isStoreStaff()` check. It never changes meaning.
* **Tenant role** is the permission profile the admin assigns — "Finance
  officer", "Operations lead", a custom "Warehouse lead"…
* **Per-user overrides** are the checkboxes an admin ticks on top of the role.
  Saving a set identical to the role clears the override, so the person keeps
  inheriting future role changes. The UI shows a `Customised` flag when an
  override exists and offers **Reset to role defaults**.

Resolution happens in exactly one place, `App\Support\TenantAccess`:

1. `tenant_owner` → every permission, always. Owners cannot be narrowed.
2. `status = suspended` → no permissions at all.
3. otherwise → `permissions` override if present, else the role's permissions.

```php
$user->hasTenantPermission('inventory.manage', $tenantId);
```

### Statuses

`active` · `invited` · `suspended`. Suspension keeps every record (orders,
audit history, assignments) but removes all permissions, which is why we
suspend instead of deleting.

---

## 2. The permission catalog

Permissions are declared **server-side only**, in
`TenantRole::permissionGroups()`. The frontend renders whatever the API sends,
so adding a permission is a one-file change:

| Group | Example keys |
| --- | --- |
| Workspace | `dashboard.view`, `analytics.view`, `reports.export` |
| Catalog & inventory | `catalog.manage`, `inventory.manage` |
| Orders & fulfillment | `orders.manage`, `fulfillment.manage`, `orders.refund` |
| Customers | `customers.view`, `customers.manage`, `customers.message` |
| Finance | `finance.manage`, `payouts.manage` |
| Sales | `sales.view`, `sales.manage` |
| Marketing & ads | `marketing.manage`, `ads.manage` |
| Support | `support.view`, `support.manage` |
| Administration | `team.manage`, `roles.manage`, `settings.manage`, … |

`TenantRole::permissionKeys()` is the validation whitelist;
`TenantAccess::sanitize()` silently drops anything outside it, so a stale
client can never persist an unknown permission.

### Built-in roles

Seeded per tenant by `TenantRole::seedDefaultsFor()` (and backfilled by the
migration): `owner`, `manager`, `finance`, `sales`, `operations`, `marketing`,
`support`, `store_staff`, `viewer`.

They are marked `is_system`: editable (so a tenant can tighten "Support") but
not deletable, and `owner` is locked entirely because it is by definition
unrestricted. Any role can be **duplicated** into a custom one.

---

## 3. API surface

| Method | Endpoint | Permission |
| --- | --- | --- |
| GET | `/api/tenant/users` | `team.view` |
| POST | `/api/tenant/users` | `team.manage` |
| PATCH/DELETE | `/api/tenant/users/{assignment}` | `team.manage` |
| POST | `/api/tenant/users/{assignment}/password` | `team.manage` |
| GET | `/api/tenant/roles` | `team.view` |
| POST/PATCH/DELETE | `/api/tenant/roles[/{role}]` | `roles.manage` |
| GET | `/api/tenant/customers[/{customer}]` | `customers.view` |
| PATCH | `/api/tenant/customers/{customer}` | `customers.manage` |

Tenant owners bypass the permission checks. `/api/tenant/staff` is kept as an
alias of the users endpoints so existing clients keep working.

`GET /api/tenant/users` returns everything the page needs in one round trip:
`data` (assignments), `stats` (counters for the KPI cards) and `meta`
(`tenant_roles`, `permission_groups`, `access_levels`, `departments`, `stores`,
`can_manage`).

### Safety rails

The controllers refuse to:

* suspend or remove your own access,
* demote or delete the **last** `tenant_owner`,
* attach an account that already belongs to another tenant,
* delete a role that still has people assigned,
* unlink a customer's last remaining sign-in method.

Creating a user without a password returns a one-time
`meta.temporary_password`; the UI shows it in a dismissible banner with a copy
button and never stores it.

---

## 4. Customers

Tenants must not be able to edit platform user accounts, so every tenant-level
decision lives in `tenant_customer_profiles` (`status`, `segment`, `tags`,
`notes`, `marketing_opt_in`). The customer list is

> users who placed an order with this tenant **∪** users with a profile row,

enriched with `orders_count`, `total_spent`, `average_order_value`,
first/last order dates and their sign-in methods. Blocking a customer is a
tenant-scoped decision; the shopper keeps their marketplace account.

---

## 5. Social login

Customers can sign in with Google, Facebook, Apple or GitHub. No Socialite
dependency — `App\Services\Social\SocialProviderManager` drives the flow with
Laravel's HTTP client.

```
POST /api/auth/social/{provider}/redirect   → { url, state, mode }
GET  /api/auth/social/providers             → enabled providers
POST /api/auth/social/{provider}/callback   → { token, user }
```

1. The SPA asks for an authorize URL and passes
   `redirect_uri = <origin>/auth/callback/<provider>`.
2. The API stores an opaque `state` in the cache for 10 minutes
   (`social_login_state:<40 random chars>`) and returns the provider URL. The
   client secret never leaves the server.
3. The provider redirects to `/auth/callback/:provider`, handled by
   `SocialCallbackComponent`, which posts `code` + `state` back.
4. The API consumes the state once (`Cache::pull`), exchanges the code, then
   links or creates the account:
   * a matching `social_identities` row → sign in,
   * a matching verified email → link the provider to that account,
   * otherwise → create a `customer` account with a random password.

Social sign-in only ever grants the `customer` role — staff and owners must use
the console login.

### Configuration

```dotenv
GOOGLE_CLIENT_ID=…
GOOGLE_CLIENT_SECRET=…
FACEBOOK_CLIENT_ID=…
FACEBOOK_CLIENT_SECRET=…
APPLE_CLIENT_ID=…
APPLE_CLIENT_SECRET=…
GITHUB_CLIENT_ID=…
GITHUB_CLIENT_SECRET=…
```

A provider with no credentials is hidden in production. Outside production it
is advertised with `mode: 'demo'` and signs in a fixed
`<provider>.customer@markethub.test` account, so the flow can be exercised end
to end without registering an OAuth app. The buttons render through the shared
`app-social-login` component on both `/login` and `/register`.

---

## 6. Local development without PHP

`tools/access-mock.mjs` (mounted by `tools/mock-api.mjs`) reproduces every
endpoint above — users, roles, customers and the three social endpoints — with
the same JSON shape, so the workspace and the login buttons can be developed
against `npm start` alone.

---

## 7. Tests

* `backend/tests/Feature/TenantAccessControlTest.php` — permission resolution,
  role CRUD, overrides, the safety rails and customer profiles.
* `backend/tests/Feature/SocialLoginTest.php` — state handling, account
  linking, account creation and the customer-only role rule.
* `backend/tests/Feature/TenantOpsTest.php` — the legacy `/api/tenant/staff`
  contract still passes unchanged.
