<?php

namespace App\Services;

use App\Models\AccountingAccount;
use App\Models\AccountingExpense;
use App\Models\AccountingInvoice;
use App\Models\AccountingJournalEntry;
use App\Models\AccountingPayment;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/** Creates balanced, posted journal entries for operational accounting events. */
class AccountingPostingService
{
    public const DEFAULT_ACCOUNTS = [
        ['1000', 'Cash and bank', 'asset', 'cash', 'Cash and cash equivalents'],
        ['1100', 'Accounts receivable', 'asset', 'accounts_receivable', 'Customer balances due'],
        ['1200', 'Inventory', 'asset', 'inventory', 'Inventory held for sale'],
        ['1300', 'Recoverable input tax', 'asset', 'input_tax', 'Tax paid on business purchases'],
        ['2000', 'Accounts payable', 'liability', 'accounts_payable', 'Supplier balances due'],
        ['2100', 'Sales tax payable', 'liability', 'tax_payable', 'Tax collected on sales'],
        ['3000', 'Owner equity', 'equity', 'owner_equity', 'Owner capital and retained earnings'],
        ['4000', 'Sales revenue', 'income', 'sales_revenue', 'Product and service sales'],
        ['4100', 'Shipping income', 'income', 'shipping_income', 'Delivery revenue'],
        ['5000', 'Cost of goods sold', 'expense', 'cost_of_goods_sold', 'Direct product cost'],
        ['6000', 'Inventory purchases', 'expense', 'inventory_expense', 'Inventory and packaging purchases'],
        ['6100', 'Shipping and delivery', 'expense', 'shipping_expense', 'Freight and fulfilment costs'],
        ['6200', 'Marketing and advertising', 'expense', 'marketing_expense', 'Campaign and creative costs'],
        ['6300', 'Software and subscriptions', 'expense', 'software_expense', 'Software services'],
        ['6400', 'Rent and occupancy', 'expense', 'rent_expense', 'Premises and occupancy costs'],
        ['6500', 'Payroll', 'expense', 'payroll_expense', 'Payroll and contractor costs'],
        ['6600', 'Utilities', 'expense', 'utilities_expense', 'Utilities and connectivity'],
        ['6700', 'Professional services', 'expense', 'professional_expense', 'Legal, accounting and consulting'],
        ['6800', 'Tax expense', 'expense', 'tax_expense', 'Non-recoverable business tax'],
        ['6900', 'Other operating expense', 'expense', 'other_expense', 'Other operating costs'],
    ];

    public function ensureDefaultAccounts(int $tenantId): void
    {
        foreach (self::DEFAULT_ACCOUNTS as [$code, $name, $type, $key, $description]) {
            AccountingAccount::withoutGlobalScopes()->updateOrCreate(
                ['tenant_id' => $tenantId, 'code' => $code],
                [
                    'name' => $name,
                    'type' => $type,
                    'subtype' => $key,
                    'system_key' => $key,
                    'description' => $description,
                    'is_system' => true,
                    'is_active' => true,
                ],
            );
        }
    }

    public function postInvoice(AccountingInvoice $invoice, ?int $userId = null): ?AccountingJournalEntry
    {
        if (in_array($invoice->status, ['draft', 'void'], true)) {
            return null;
        }

        $revenue = round((float) $invoice->subtotal - (float) $invoice->discount_total, 2);
        $lines = [
            ['accounts_receivable', (float) $invoice->total, 0, $invoice->customer_name],
            ['sales_revenue', 0, $revenue, 'Net sales'],
        ];
        if ((float) $invoice->tax_total > 0) {
            $lines[] = ['tax_payable', 0, (float) $invoice->tax_total, 'Sales tax'];
        }

        return $this->postSource(
            $invoice->tenant_id,
            'invoice',
            $invoice->id,
            $invoice->issue_date->toDateString(),
            $invoice->number,
            'Sales invoice '.$invoice->number,
            $lines,
            $userId ?? $invoice->created_by,
        );
    }

    public function postInvoicePayment(AccountingPayment $payment, AccountingInvoice $invoice, ?int $userId = null): AccountingJournalEntry
    {
        return $this->postSource(
            $payment->tenant_id,
            'invoice_payment',
            $payment->id,
            $payment->paid_on->toDateString(),
            $payment->reference,
            'Customer payment for '.$invoice->number,
            [
                ['cash', (float) $payment->amount, 0, $payment->method],
                ['accounts_receivable', 0, (float) $payment->amount, $invoice->customer_name],
            ],
            $userId ?? $payment->created_by,
        );
    }

    public function postExpense(AccountingExpense $expense, ?int $userId = null): ?AccountingJournalEntry
    {
        if (in_array($expense->status, ['draft', 'void'], true)) {
            return null;
        }
        $expenseKey = $this->expenseAccountKey($expense->category);
        $lines = [[$expenseKey, (float) $expense->amount, 0, $expense->description]];
        if ((float) $expense->tax_amount > 0) {
            $lines[] = ['input_tax', (float) $expense->tax_amount, 0, 'Recoverable purchase tax'];
        }
        $lines[] = ['accounts_payable', 0, (float) $expense->total, $expense->vendor_name ?: 'Supplier bill'];

        return $this->postSource(
            $expense->tenant_id,
            'expense',
            $expense->id,
            $expense->expense_date->toDateString(),
            $expense->number,
            'Supplier bill '.$expense->number,
            $lines,
            $userId ?? $expense->created_by,
        );
    }

    public function postExpensePayment(AccountingPayment $payment, AccountingExpense $expense, ?int $userId = null): AccountingJournalEntry
    {
        return $this->postSource(
            $payment->tenant_id,
            'expense_payment',
            $payment->id,
            $payment->paid_on->toDateString(),
            $payment->reference,
            'Supplier payment for '.$expense->number,
            [
                ['accounts_payable', (float) $payment->amount, 0, $expense->vendor_name ?: 'Supplier'],
                ['cash', 0, (float) $payment->amount, $payment->method],
            ],
            $userId ?? $payment->created_by,
        );
    }

    /** @param array<int, array{0:string,1:float,2:float,3:string}> $lines */
    private function postSource(
        int $tenantId,
        string $sourceType,
        int $sourceId,
        string $date,
        string $reference,
        string $memo,
        array $lines,
        ?int $userId,
    ): AccountingJournalEntry {
        $existing = AccountingJournalEntry::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('source_type', $sourceType)
            ->where('source_id', $sourceId)
            ->first();
        if ($existing) {
            return $existing;
        }

        $this->ensureDefaultAccounts($tenantId);
        $totalDebit = round(array_sum(array_column($lines, 1)), 2);
        $totalCredit = round(array_sum(array_column($lines, 2)), 2);
        if ($totalDebit <= 0 || abs($totalDebit - $totalCredit) > 0.001) {
            throw new RuntimeException('Accounting entry is not balanced.');
        }

        return DB::transaction(function () use ($tenantId, $sourceType, $sourceId, $date, $reference, $memo, $lines, $totalDebit, $totalCredit, $userId) {
            $entry = AccountingJournalEntry::withoutGlobalScopes()->create([
                'tenant_id' => $tenantId,
                'created_by' => $userId,
                'posted_by' => $userId,
                'number' => $this->nextNumber($tenantId),
                'entry_date' => $date,
                'reference' => $reference,
                'memo' => $memo,
                'status' => 'posted',
                'source_type' => $sourceType,
                'source_id' => $sourceId,
                'total_debit' => $totalDebit,
                'total_credit' => $totalCredit,
                'posted_at' => now(),
            ]);
            foreach ($lines as [$key, $debit, $credit, $description]) {
                $account = $this->account($tenantId, $key);
                $entry->lines()->create([
                    'account_id' => $account->id,
                    'description' => $description,
                    'debit' => round($debit, 2),
                    'credit' => round($credit, 2),
                ]);
            }

            return $entry->load('lines.account:id,code,name,type');
        });
    }

    private function account(int $tenantId, string $key): AccountingAccount
    {
        return AccountingAccount::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('system_key', $key)
            ->firstOrFail();
    }

    private function nextNumber(int $tenantId): string
    {
        $next = ((int) AccountingJournalEntry::withoutGlobalScopes()->where('tenant_id', $tenantId)->max('id')) + 1;
        return sprintf('JRN-%s-%05d', now()->format('Y'), $next);
    }

    private function expenseAccountKey(string $category): string
    {
        return match (strtolower($category)) {
            'inventory' => 'inventory_expense',
            'shipping' => 'shipping_expense',
            'marketing' => 'marketing_expense',
            'software' => 'software_expense',
            'rent' => 'rent_expense',
            'payroll' => 'payroll_expense',
            'utilities' => 'utilities_expense',
            'professional services' => 'professional_expense',
            'tax' => 'tax_expense',
            default => 'other_expense',
        };
    }
}
