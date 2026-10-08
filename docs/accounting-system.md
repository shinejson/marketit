# Tenant accounting and procurement

## Product plan

The finance department has been promoted from a read-only KPI dashboard into an operational accounting workspace. The plan is intentionally workflow-first: tenant teams can invoice customers, collect and trace payments, capture payables, and control purchasing without leaving MarketHub.

### Delivered scope

1. **Finance command centre**
   - Cash position, receivables, payables, open bills, overdue invoices, marketplace settlements, and committed procurement spend.
   - Six-month cash-flow comparison, receivables aging, recent accounting activity, and quick-create actions.
2. **Accounts receivable**
   - Multi-line invoices with dates, tax per line, discounts, notes, draft/sent/partial/paid/overdue/void lifecycle, and customer balances.
   - Draft invoices can be edited or deleted; marking one sent locks the source entry. Partial and full payment recording prevents overpayment.
3. **Cash ledger**
   - One incoming/outgoing payment register linked back to invoices and supplier bills, with payment details for audit review.
   - Bank transfer, card, cash, mobile money, cheque, and other payment methods. Posted cash movements are immutable and corrections are recorded as separate entries.
4. **Accounts payable**
   - Supplier bills and expenses with category, base amount, tax, due date, receipt reference, notes, and draft/pending/overdue/paid state.
   - Draft bills can be edited or deleted; submission posts the payable. Paying a bill creates an immutable outgoing payment record.
5. **Procurement**
   - Reusable customers and vendors with tax and payment-term data; clean contacts can be deleted while contacts with history are archived.
   - Multi-line purchase orders with editable/deletable drafts and a controlled draft → pending approval → approved → ordered → received workflow.
   - Invalid workflow jumps are rejected by the API.
6. **General ledger and reporting**
   - Tenant-specific chart of accounts with protected system accounts and optional custom accounts; custom accounts can be edited, archived, or deleted when unused.
   - Automatic balanced postings for sent invoices, customer receipts, supplier bills, and supplier payments.
   - Manual draft journals can be edited or deleted before posting; posted journals are immutable and must balance.
   - Live profit and loss, balance sheet, and trial balance reports over selectable dates.
7. **Bank reconciliation**
   - Multiple bank-account register, imported/manual statement activity, statement balances, and reconciliation progress.
   - Unmatched statement lines can be edited or deleted; matched/excluded lines must be undone before editing or removal.
   - Exact signed-amount matching to incoming and outgoing payments, with excluded and undo workflows.
8. **Tenant controls**
   - All accounting records carry `tenant_id`, use the existing tenant global scope, and are covered by cross-tenant feature tests.
   - Accounting APIs and sidebar navigation are limited to tenant owners and finance-assigned staff.
   - Important records use the platform audit trail.
   - Totals are calculated on the server; the browser preview is informative only.

## Navigation and routes

The tenant sidebar exposes an expandable **Finance & accounts** workspace:

- `/tenant/departments/finance` — finance overview (the existing route is preserved and upgraded)
- `/tenant/accounting/invoices`
- `/tenant/accounting/payments`
- `/tenant/accounting/expenses`
- `/tenant/accounting/procurement`
- `/tenant/accounting/vendors`
- `/tenant/accounting/reconciliation`
- `/tenant/accounting/chart-of-accounts`
- `/tenant/accounting/journals`
- `/tenant/accounting/reports`

The legacy `/seller` console receives the same child routes; navigation moves users to the canonical `/tenant` URLs.

## API

All endpoints are under `auth:sanctum`, tenant context, and the built-in tenant role middleware.

```text
GET    /api/tenant/accounting/dashboard
GET    /api/tenant/accounting/invoices
POST   /api/tenant/accounting/invoices
GET    /api/tenant/accounting/invoices/{invoice}
PATCH  /api/tenant/accounting/invoices/{invoice}  (draft only)
DELETE /api/tenant/accounting/invoices/{invoice}  (draft only)
POST   /api/tenant/accounting/invoices/{invoice}/payments
GET    /api/tenant/accounting/payments
GET    /api/tenant/accounting/payments/{payment}  (read-only detail)
GET|POST /api/tenant/accounting/expenses
PATCH  /api/tenant/accounting/expenses/{expense}  (draft only)
DELETE /api/tenant/accounting/expenses/{expense}  (draft only)
POST   /api/tenant/accounting/expenses/{expense}/pay
GET|POST /api/tenant/accounting/contacts
PATCH  /api/tenant/accounting/contacts/{contact}
DELETE /api/tenant/accounting/contacts/{contact}
GET|POST /api/tenant/accounting/purchase-orders
PATCH  /api/tenant/accounting/purchase-orders/{purchaseOrder}
DELETE /api/tenant/accounting/purchase-orders/{purchaseOrder}  (draft only)
GET|POST /api/tenant/accounting/accounts
PATCH  /api/tenant/accounting/accounts/{account}
DELETE /api/tenant/accounting/accounts/{account}  (unused custom accounts only)
GET|POST /api/tenant/accounting/journals
PATCH  /api/tenant/accounting/journals/{journal}  (draft only)
DELETE /api/tenant/accounting/journals/{journal}  (draft only)
POST   /api/tenant/accounting/journals/{journal}/post
GET    /api/tenant/accounting/reports
GET|POST /api/tenant/accounting/bank-accounts
PATCH  /api/tenant/accounting/bank-accounts/{bankAccount}
DELETE /api/tenant/accounting/bank-accounts/{bankAccount}  (no statement history)
GET|POST /api/tenant/accounting/bank-transactions
PATCH  /api/tenant/accounting/bank-transactions/{bankTransaction}
DELETE /api/tenant/accounting/bank-transactions/{bankTransaction}  (unmatched only)
```

List endpoints accept `search`, `status`, `page`, and `per_page` where applicable.

## Data model

- `accounting_contacts`
- `accounting_invoices` and `accounting_invoice_items`
- `accounting_payments`
- `accounting_expenses`
- `purchase_orders` and `purchase_order_items`
- `accounting_accounts`
- `accounting_journal_entries` and `accounting_journal_lines`
- `accounting_bank_accounts` and `accounting_bank_transactions`

Amounts use fixed-precision database decimals. Invoice and purchase-order line totals are recalculated by the API in a database transaction. Recording an invoice payment or paying a supplier bill updates the source document and writes the cash movement atomically.

## Operational follow-ups

The delivered workspace now includes a double-entry ledger, core financial statements, and manual bank reconciliation. Before representing it as statutory/GAAP bookkeeping in a regulated production environment, schedule a separate compliance phase for jurisdiction-specific account mappings, period locking and close controls, direct bank-feed integrations, tax filing exports, credit notes, FX revaluation, depreciation, consolidation, and accountant-approved statement layouts. Those require country and reporting-policy decisions rather than generic defaults.

## Local demo

`AccountingSeeder` creates realistic invoices, partial payments, supplier bills, vendors, and purchase orders for each seeded tenant. The frontend-only mock server also implements the accounting APIs, including create and workflow actions.

```bash
# Laravel environment
cd backend
php artisan migrate:fresh --seed
php artisan test --filter=TenantAccountingTest

# Frontend-only environment
node tools/mock-api.mjs
cd frontend && npm start
```
