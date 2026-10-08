<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccountingContact;
use App\Models\AccountingExpense;
use App\Models\AccountingInvoice;
use App\Models\AccountingPayment;
use App\Models\PurchaseOrder;
use App\Models\SellerOrder;
use App\Models\SellerSettlement;
use App\Models\TenantSetting;
use App\Services\AccountingPostingService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** Tenant-scoped receivables, payables, cash ledger and procurement workspace. */
class AccountingController extends Controller
{
    public function __construct(private readonly AccountingPostingService $posting) {}

    public function dashboard(Request $request): JsonResponse
    {
        $this->refreshOverdue();
        $currency = TenantSetting::query()->value('currency') ?? 'USD';
        $invoices = AccountingInvoice::query()->where('status', '!=', 'void')->get();
        $expenses = AccountingExpense::query()->where('status', '!=', 'void')->get();
        $payments = AccountingPayment::query()->get();

        $receivables = round((float) $invoices->sum('balance_due'), 2);
        $payables = round((float) $expenses->whereNotIn('status', ['paid'])->sum('total'), 2);
        $cashIn = round((float) $payments->where('direction', 'incoming')->sum('amount'), 2);
        $cashOut = round((float) $payments->where('direction', 'outgoing')->sum('amount'), 2);
        $settlementPending = round((float) SellerSettlement::query()
            ->whereIn('seller_order_id', SellerOrder::query()->select('id'))
            ->where('status', SellerSettlement::STATUS_PENDING)
            ->sum('net'), 2);
        $committed = round((float) PurchaseOrder::query()
            ->whereIn('status', ['pending_approval', 'approved', 'ordered', 'partially_received'])
            ->sum('total'), 2);

        $months = collect(range(5, 0))->map(function (int $back) use ($payments) {
            $month = now()->subMonths($back);
            $monthPayments = $payments->filter(fn (AccountingPayment $payment) => $payment->paid_on?->isSameMonth($month));

            return [
                'label' => $month->format('M'),
                'month' => $month->format('Y-m'),
                'incoming' => round((float) $monthPayments->where('direction', 'incoming')->sum('amount'), 2),
                'outgoing' => round((float) $monthPayments->where('direction', 'outgoing')->sum('amount'), 2),
            ];
        })->values();

        $aging = ['current' => 0.0, '1_30' => 0.0, '31_60' => 0.0, '61_90' => 0.0, 'over_90' => 0.0];
        foreach ($invoices->where('balance_due', '>', 0) as $invoice) {
            $days = now()->startOfDay()->diffInDays($invoice->due_date, false);
            $pastDue = max(0, -$days);
            $bucket = match (true) {
                $pastDue === 0 => 'current',
                $pastDue <= 30 => '1_30',
                $pastDue <= 60 => '31_60',
                $pastDue <= 90 => '61_90',
                default => 'over_90',
            };
            $aging[$bucket] = round($aging[$bucket] + (float) $invoice->balance_due, 2);
        }

        $activity = collect()
            ->merge(AccountingInvoice::query()->latest()->limit(4)->get()->map(fn ($row) => [
                'type' => 'invoice', 'title' => $row->number.' · '.$row->customer_name,
                'amount' => (float) $row->total, 'status' => $row->status, 'at' => $row->updated_at,
            ]))
            ->merge(AccountingExpense::query()->latest()->limit(4)->get()->map(fn ($row) => [
                'type' => 'expense', 'title' => $row->description,
                'amount' => (float) $row->total, 'status' => $row->status, 'at' => $row->updated_at,
            ]))
            ->merge(PurchaseOrder::query()->latest()->limit(4)->get()->map(fn ($row) => [
                'type' => 'purchase_order', 'title' => $row->number.' · '.$row->vendor_name,
                'amount' => (float) $row->total, 'status' => $row->status, 'at' => $row->updated_at,
            ]))
            ->sortByDesc('at')->take(7)->values()->map(function (array $row) {
                $row['at'] = $row['at']?->toIso8601String();
                return $row;
            });

        return response()->json(['data' => [
            'currency' => $currency,
            'kpis' => [
                'cash_balance' => round($cashIn - $cashOut, 2),
                'receivables' => $receivables,
                'payables' => $payables,
                'net_cash_flow' => round($cashIn - $cashOut, 2),
                'cash_in' => $cashIn,
                'cash_out' => $cashOut,
                'overdue_invoices' => $invoices->where('status', 'overdue')->count(),
                'open_bills' => $expenses->whereNotIn('status', ['paid', 'void'])->count(),
                'pending_settlements' => $settlementPending,
                'committed_spend' => $committed,
            ],
            'cash_flow' => $months,
            'aging' => $aging,
            'invoice_statuses' => AccountingInvoice::query()->select('status', DB::raw('count(*) as total'))->groupBy('status')->pluck('total', 'status'),
            'purchase_statuses' => PurchaseOrder::query()->select('status', DB::raw('count(*) as total'))->groupBy('status')->pluck('total', 'status'),
            'recent_activity' => $activity,
        ]]);
    }

    public function invoices(Request $request): JsonResponse
    {
        $this->refreshOverdue();
        $query = AccountingInvoice::query()->with(['contact:id,name', 'items', 'payments:id,invoice_id,reference,amount,method,paid_on'])->latest('issue_date');
        $this->applySearchAndStatus($query, $request, ['number', 'customer_name', 'customer_email']);

        return $this->paginated($query, $request);
    }

    /** Read one invoice with everything a detail or print view needs. */
    public function showInvoice(AccountingInvoice $invoice): JsonResponse
    {
        return response()->json([
            'data' => $invoice->load([
                'contact:id,name,email,address,tax_id,currency',
                'items',
                'payments:id,invoice_id,reference,amount,method,paid_on',
            ]),
        ]);
    }

    /**
     * Delete handles the end of the CRUD set. Only unpaid drafts can be
     * removed — once an invoice is sent the audit-safe path is to void it,
     * which updateInvoice already covers.
     */
    public function destroyInvoice(AccountingInvoice $invoice): JsonResponse
    {
        if ($invoice->status !== 'draft') {
            throw ValidationException::withMessages(['invoice' => 'Only draft invoices can be deleted. Void a sent invoice instead.']);
        }
        if ($invoice->payments()->exists() || (float) $invoice->amount_paid > 0) {
            throw ValidationException::withMessages(['invoice' => 'An invoice with recorded payments cannot be deleted.']);
        }

        $invoice->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    public function storeInvoice(Request $request): JsonResponse
    {
        $tenantId = (int) $request->user()->tenantId();
        $data = $request->validate([
            'contact_id' => ['nullable', Rule::exists('accounting_contacts', 'id')->where('tenant_id', $tenantId)],
            'customer_name' => ['required', 'string', 'max:180'],
            'customer_email' => ['nullable', 'email', 'max:180'],
            'issue_date' => ['required', 'date'],
            'due_date' => ['required', 'date', 'after_or_equal:issue_date'],
            'currency' => ['nullable', 'string', 'size:3'],
            'discount_total' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:3000'],
            'send_now' => ['nullable', 'boolean'],
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.description' => ['required', 'string', 'max:255'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ]);

        $invoice = DB::transaction(function () use ($data, $request, $tenantId) {
            [$subtotal, $tax, $items] = $this->lineTotals($data['items'], 'unit_price');
            $discount = min((float) ($data['discount_total'] ?? 0), $subtotal + $tax);
            $total = round($subtotal + $tax - $discount, 2);
            $status = ! empty($data['send_now']) ? 'sent' : 'draft';

            $invoice = AccountingInvoice::query()->create([
                'tenant_id' => $tenantId,
                'contact_id' => $data['contact_id'] ?? null,
                'created_by' => $request->user()->id,
                'number' => $this->nextNumber(AccountingInvoice::class, 'INV'),
                'customer_name' => $data['customer_name'],
                'customer_email' => $data['customer_email'] ?? null,
                'issue_date' => $data['issue_date'],
                'due_date' => $data['due_date'],
                'status' => $status,
                'subtotal' => $subtotal,
                'tax_total' => $tax,
                'discount_total' => $discount,
                'total' => $total,
                'amount_paid' => 0,
                'balance_due' => $total,
                'currency' => strtoupper($data['currency'] ?? 'USD'),
                'notes' => $data['notes'] ?? null,
                'sent_at' => $status === 'sent' ? now() : null,
            ]);
            $invoice->items()->createMany($items);

            return $invoice;
        });

        if ($invoice->status === 'sent') {
            $this->posting->postInvoice($invoice, $request->user()->id);
        }

        return response()->json(['data' => $invoice->load(['contact:id,name', 'items', 'payments'])], 201);
    }

    public function updateInvoice(Request $request, AccountingInvoice $invoice): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['draft', 'sent', 'void'])],
        ]);
        if ($invoice->status !== 'draft' && $data['status'] !== $invoice->status) {
            throw ValidationException::withMessages(['status' => 'A sent invoice cannot be changed without a credit-note workflow.']);
        }
        if ($data['status'] === 'void' && (float) $invoice->amount_paid > 0) {
            throw ValidationException::withMessages(['status' => 'An invoice with payments cannot be voided.']);
        }

        $invoice->update([
            'status' => $data['status'],
            'sent_at' => $data['status'] === 'sent' ? ($invoice->sent_at ?? now()) : $invoice->sent_at,
        ]);
        if ($data['status'] === 'sent') {
            $this->posting->postInvoice($invoice->fresh(), $request->user()->id);
        }

        return response()->json(['data' => $invoice->fresh()->load(['contact:id,name', 'items', 'payments'])]);
    }

    public function recordInvoicePayment(Request $request, AccountingInvoice $invoice): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'gt:0'],
            'paid_on' => ['required', 'date'],
            'method' => ['required', Rule::in(AccountingPayment::METHODS)],
            'reference' => ['nullable', 'string', 'max:60'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);
        if (in_array($invoice->status, ['void', 'draft'], true)) {
            throw ValidationException::withMessages(['invoice' => 'Send the invoice before recording payment.']);
        }
        if ((float) $data['amount'] > (float) $invoice->balance_due + 0.001) {
            throw ValidationException::withMessages(['amount' => 'Payment cannot exceed the outstanding balance.']);
        }

        $payment = DB::transaction(function () use ($data, $request, $invoice) {
            $payment = AccountingPayment::query()->create([
                'tenant_id' => $request->user()->tenantId(),
                'invoice_id' => $invoice->id,
                'created_by' => $request->user()->id,
                'reference' => $data['reference'] ?: $this->nextNumber(AccountingPayment::class, 'PAY'),
                'direction' => 'incoming',
                'method' => $data['method'],
                'amount' => $data['amount'],
                'currency' => $invoice->currency,
                'paid_on' => $data['paid_on'],
                'notes' => $data['notes'] ?? null,
            ]);
            $paid = round((float) $invoice->amount_paid + (float) $data['amount'], 2);
            $balance = max(0, round((float) $invoice->total - $paid, 2));
            $invoice->update([
                'amount_paid' => $paid,
                'balance_due' => $balance,
                'status' => $balance <= 0 ? 'paid' : 'partial',
                'paid_at' => $balance <= 0 ? now() : null,
            ]);

            return $payment;
        });

        $this->posting->postInvoicePayment($payment, $invoice->fresh(), $request->user()->id);

        return response()->json(['data' => [
            'payment' => $payment,
            'invoice' => $invoice->fresh()->load(['items', 'payments']),
        ]], 201);
    }

    public function payments(Request $request): JsonResponse
    {
        $query = AccountingPayment::query()
            ->with(['invoice:id,number,customer_name', 'expense:id,number,vendor_name,description'])
            ->latest('paid_on');
        $this->applySearchAndStatus($query, $request, ['reference', 'method'], 'direction');

        return $this->paginated($query, $request);
    }

    public function expenses(Request $request): JsonResponse
    {
        $this->refreshOverdue();
        $query = AccountingExpense::query()->with('vendor:id,name')->latest('expense_date');
        $this->applySearchAndStatus($query, $request, ['number', 'vendor_name', 'category', 'description']);

        return $this->paginated($query, $request);
    }

    public function storeExpense(Request $request): JsonResponse
    {
        $tenantId = (int) $request->user()->tenantId();
        $data = $request->validate([
            'vendor_id' => ['nullable', Rule::exists('accounting_contacts', 'id')->where('tenant_id', $tenantId)],
            'vendor_name' => ['nullable', 'string', 'max:180'],
            'category' => ['required', Rule::in(AccountingExpense::CATEGORIES)],
            'description' => ['required', 'string', 'max:255'],
            'expense_date' => ['required', 'date'],
            'due_date' => ['nullable', 'date', 'after_or_equal:expense_date'],
            'amount' => ['required', 'numeric', 'gt:0'],
            'tax_amount' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'status' => ['nullable', Rule::in(['draft', 'pending', 'paid'])],
            'receipt_reference' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);
        $tax = round((float) ($data['tax_amount'] ?? 0), 2);
        $total = round((float) $data['amount'] + $tax, 2);
        $status = $data['status'] ?? 'pending';

        $expense = DB::transaction(function () use ($data, $tax, $total, $status, $request, $tenantId) {
            $expense = AccountingExpense::query()->create([
                ...$data,
                'tenant_id' => $tenantId,
                'created_by' => $request->user()->id,
                'number' => $this->nextNumber(AccountingExpense::class, 'BILL'),
                'tax_amount' => $tax,
                'total' => $total,
                'currency' => strtoupper($data['currency'] ?? 'USD'),
                'status' => $status,
                'paid_at' => $status === 'paid' ? now() : null,
            ]);
            if ($status === 'paid') {
                $this->createExpensePayment($expense, $request->user()->id, 'bank_transfer', $expense->expense_date->toDateString());
            }
            return $expense;
        });

        $this->posting->postExpense($expense, $request->user()->id);
        if ($status === 'paid' && ($payment = $expense->payments()->latest()->first())) {
            $this->posting->postExpensePayment($payment, $expense, $request->user()->id);
        }

        return response()->json(['data' => $expense->load('vendor:id,name')], 201);
    }

    public function payExpense(Request $request, AccountingExpense $expense): JsonResponse
    {
        if (in_array($expense->status, ['paid', 'void'], true)) {
            throw ValidationException::withMessages(['expense' => 'This bill cannot be paid.']);
        }
        $data = $request->validate([
            'paid_on' => ['required', 'date'],
            'method' => ['required', Rule::in(AccountingPayment::METHODS)],
            'reference' => ['nullable', 'string', 'max:60'],
        ]);

        $payment = DB::transaction(function () use ($expense, $data, $request) {
            $expense->update(['status' => 'paid', 'paid_at' => now()]);
            return $this->createExpensePayment($expense, $request->user()->id, $data['method'], $data['paid_on'], $data['reference'] ?? null);
        });

        $this->posting->postExpense($expense->fresh(), $request->user()->id);
        $this->posting->postExpensePayment($payment, $expense->fresh(), $request->user()->id);

        return response()->json(['data' => ['expense' => $expense->fresh(), 'payment' => $payment]], 201);
    }

    public function contacts(Request $request): JsonResponse
    {
        $query = AccountingContact::query()->withCount(['invoices', 'purchaseOrders'])->orderBy('name');
        if ($type = $request->string('type')->trim()->toString()) {
            $query->where(fn (Builder $q) => $q->where('type', $type)->orWhere('type', 'both'));
        }
        $this->applySearchAndStatus($query, $request, ['name', 'email', 'phone'], 'type', false);

        return $this->paginated($query, $request, 100);
    }

    public function storeContact(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(AccountingContact::TYPES)],
            'name' => ['required', 'string', 'max:180'],
            'email' => ['nullable', 'email', 'max:180'],
            'phone' => ['nullable', 'string', 'max:40'],
            'tax_id' => ['nullable', 'string', 'max:80'],
            'address' => ['nullable', 'string', 'max:1000'],
            'currency' => ['nullable', 'string', 'size:3'],
            'payment_terms' => ['nullable', 'integer', 'min:0', 'max:365'],
            'opening_balance' => ['nullable', 'numeric'],
        ]);
        $contact = AccountingContact::query()->create([
            ...$data,
            'tenant_id' => $request->user()->tenantId(),
            'currency' => strtoupper($data['currency'] ?? 'USD'),
            'payment_terms' => $data['payment_terms'] ?? 30,
            'is_active' => true,
        ]);

        return response()->json(['data' => $contact], 201);
    }

    /**
     * Full profile edit for a contact. The active flag rides along so a
     * contact that carries history (and therefore cannot be deleted) can be
     * archived instead of removed.
     */
    public function updateContact(Request $request, AccountingContact $contact): JsonResponse
    {
        $data = $request->validate([
            'type' => ['sometimes', Rule::in(AccountingContact::TYPES)],
            'name' => ['sometimes', 'required', 'string', 'max:180'],
            'email' => ['nullable', 'email', 'max:180'],
            'phone' => ['nullable', 'string', 'max:40'],
            'tax_id' => ['nullable', 'string', 'max:80'],
            'address' => ['nullable', 'string', 'max:1000'],
            'currency' => ['nullable', 'string', 'size:3'],
            'payment_terms' => ['nullable', 'integer', 'min:0', 'max:365'],
            'opening_balance' => ['nullable', 'numeric'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if (! empty($data['currency'])) {
            $data['currency'] = strtoupper($data['currency']);
        }
        $contact->update($data);

        return response()->json(['data' => $contact->fresh()]);
    }

    /**
     * Invoices, bills and purchase orders reference contacts with a
     * nullOnDelete FK — removing the row would silently orphan that audit
     * trail, so a contact with history must be archived (is_active = false)
     * instead. Clean contacts delete outright.
     */
    public function destroyContact(AccountingContact $contact): JsonResponse
    {
        $inUse = $contact->invoices()->exists()
            || $contact->purchaseOrders()->exists()
            || $contact->expenses()->exists();

        if ($inUse) {
            throw ValidationException::withMessages([
                'contact' => 'This contact already has invoices, bills or purchase orders. Mark it inactive instead of deleting so the history stays intact.',
            ]);
        }

        $contact->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    public function purchaseOrders(Request $request): JsonResponse
    {
        $query = PurchaseOrder::query()->with(['vendor:id,name,email', 'items'])->latest('order_date');
        $this->applySearchAndStatus($query, $request, ['number', 'vendor_name']);

        return $this->paginated($query, $request);
    }

    public function storePurchaseOrder(Request $request): JsonResponse
    {
        $tenantId = (int) $request->user()->tenantId();
        $data = $request->validate([
            'vendor_id' => ['nullable', Rule::exists('accounting_contacts', 'id')->where('tenant_id', $tenantId)],
            'vendor_name' => ['required', 'string', 'max:180'],
            'order_date' => ['required', 'date'],
            'expected_date' => ['nullable', 'date', 'after_or_equal:order_date'],
            'currency' => ['nullable', 'string', 'size:3'],
            'notes' => ['nullable', 'string', 'max:3000'],
            'submit_for_approval' => ['nullable', 'boolean'],
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.description' => ['required', 'string', 'max:255'],
            'items.*.sku' => ['nullable', 'string', 'max:100'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0'],
            'items.*.unit_cost' => ['required', 'numeric', 'min:0'],
            'items.*.tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ]);

        $order = DB::transaction(function () use ($data, $request, $tenantId) {
            [$subtotal, $tax, $items] = $this->lineTotals($data['items'], 'unit_cost');
            $order = PurchaseOrder::query()->create([
                'tenant_id' => $tenantId,
                'vendor_id' => $data['vendor_id'] ?? null,
                'created_by' => $request->user()->id,
                'number' => $this->nextNumber(PurchaseOrder::class, 'PO'),
                'vendor_name' => $data['vendor_name'],
                'order_date' => $data['order_date'],
                'expected_date' => $data['expected_date'] ?? null,
                'status' => ! empty($data['submit_for_approval']) ? 'pending_approval' : 'draft',
                'subtotal' => $subtotal,
                'tax_total' => $tax,
                'total' => round($subtotal + $tax, 2),
                'currency' => strtoupper($data['currency'] ?? 'USD'),
                'notes' => $data['notes'] ?? null,
            ]);
            $order->items()->createMany($items);
            return $order;
        });

        return response()->json(['data' => $order->load(['vendor:id,name,email', 'items'])], 201);
    }

    public function updatePurchaseOrder(Request $request, PurchaseOrder $purchaseOrder): JsonResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in(PurchaseOrder::STATUSES)]]);
        if (! $purchaseOrder->canTransitionTo($data['status'])) {
            throw ValidationException::withMessages(['status' => "Cannot move {$purchaseOrder->status} purchase order to {$data['status']}."]);
        }
        $updates = ['status' => $data['status']];
        if ($data['status'] === 'approved') {
            $updates += ['approved_by' => $request->user()->id, 'approved_at' => now()];
        }
        if ($data['status'] === 'received') {
            $updates += ['received_at' => now()];
        }
        $purchaseOrder->update($updates);

        return response()->json(['data' => $purchaseOrder->fresh()->load(['vendor:id,name,email', 'items'])]);
    }

    private function lineTotals(array $rows, string $priceKey): array
    {
        $subtotal = 0.0;
        $tax = 0.0;
        $items = [];
        foreach ($rows as $row) {
            $lineSubtotal = round((float) $row['quantity'] * (float) $row[$priceKey], 2);
            $lineTax = round($lineSubtotal * ((float) ($row['tax_rate'] ?? 0) / 100), 2);
            $subtotal += $lineSubtotal;
            $tax += $lineTax;
            $items[] = [
                ...$row,
                'tax_rate' => $row['tax_rate'] ?? 0,
                'line_subtotal' => $lineSubtotal,
                'line_tax' => $lineTax,
                'line_total' => round($lineSubtotal + $lineTax, 2),
            ];
        }

        return [round($subtotal, 2), round($tax, 2), $items];
    }

    private function createExpensePayment(AccountingExpense $expense, int $userId, string $method, string $paidOn, ?string $reference = null): AccountingPayment
    {
        return AccountingPayment::query()->create([
            'tenant_id' => $expense->tenant_id,
            'expense_id' => $expense->id,
            'created_by' => $userId,
            'reference' => $reference ?: $this->nextNumber(AccountingPayment::class, 'PAY'),
            'direction' => 'outgoing',
            'method' => $method,
            'amount' => $expense->total,
            'currency' => $expense->currency,
            'paid_on' => $paidOn,
        ]);
    }

    private function nextNumber(string $model, string $prefix): string
    {
        $field = $model === AccountingPayment::class ? 'reference' : 'number';
        $next = ((int) $model::query()->max('id')) + 1;
        $candidate = sprintf('%s-%s-%05d', $prefix, now()->format('Y'), $next);
        while ($model::query()->where($field, $candidate)->exists()) {
            $candidate = sprintf('%s-%s-%05d', $prefix, now()->format('Y'), ++$next);
        }
        return $candidate;
    }

    private function refreshOverdue(): void
    {
        AccountingInvoice::query()->whereIn('status', ['sent', 'partial'])->whereDate('due_date', '<', today())->update(['status' => 'overdue']);
        AccountingExpense::query()->where('status', 'pending')->whereNotNull('due_date')->whereDate('due_date', '<', today())->update(['status' => 'overdue']);
    }

    private function applySearchAndStatus(Builder $query, Request $request, array $columns, string $statusColumn = 'status', bool $applyStatus = true): void
    {
        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function (Builder $nested) use ($search, $columns) {
                foreach ($columns as $i => $column) {
                    $method = $i === 0 ? 'where' : 'orWhere';
                    $nested->{$method}($column, 'like', '%'.$search.'%');
                }
            });
        }
        if ($applyStatus && ($status = $request->string('status')->trim()->toString())) {
            $query->where($statusColumn, $status);
        }
    }

    private function paginated(Builder $query, Request $request, int $default = 25): JsonResponse
    {
        $perPage = min(100, max(1, $request->integer('per_page', $default)));
        $result = $query->paginate($perPage);

        return response()->json([
            'data' => $result->items(),
            'meta' => [
                'page' => $result->currentPage(),
                'per_page' => $result->perPage(),
                'total' => $result->total(),
                'last_page' => $result->lastPage(),
            ],
        ]);
    }
}
