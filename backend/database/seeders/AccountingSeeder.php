<?php

namespace Database\Seeders;

use App\Models\AccountingAccount;
use App\Models\AccountingBankAccount;
use App\Models\AccountingBankTransaction;
use App\Models\AccountingContact;
use App\Models\AccountingExpense;
use App\Models\AccountingInvoice;
use App\Models\AccountingPayment;
use App\Models\PurchaseOrder;
use App\Models\Tenant;
use App\Services\AccountingPostingService;
use Illuminate\Database\Seeder;

/** Realistic tenant accounting fixtures for the finance and procurement workspace. */
class AccountingSeeder extends Seeder
{
    public function run(): void
    {
        foreach (Tenant::query()->with('owner')->get() as $tenant) {
            $ownerId = $tenant->owner_user_id;
            $currency = 'USD';
            $suffix = strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $tenant->name), 0, 3));

            $customer = AccountingContact::withoutGlobalScopes()->create([
                'tenant_id' => $tenant->id,
                'type' => 'customer',
                'name' => 'Atlas Retail Group',
                'email' => 'accounts@atlas-retail.test',
                'phone' => '+233 20 555 0140',
                'tax_id' => 'TIN-ATLAS-2201',
                'address' => '18 Liberation Road, Accra',
                'currency' => $currency,
                'payment_terms' => 30,
            ]);
            $vendor = AccountingContact::withoutGlobalScopes()->create([
                'tenant_id' => $tenant->id,
                'type' => 'vendor',
                'name' => 'Meridian Supply Co.',
                'email' => 'orders@meridian-supply.test',
                'phone' => '+233 30 255 0194',
                'tax_id' => 'TIN-MER-8912',
                'address' => '4 Harbour Link, Tema',
                'currency' => $currency,
                'payment_terms' => 30,
            ]);
            AccountingContact::withoutGlobalScopes()->create([
                'tenant_id' => $tenant->id,
                'type' => 'vendor',
                'name' => 'Swiftline Logistics',
                'email' => 'billing@swiftline.test',
                'currency' => $currency,
                'payment_terms' => 14,
            ]);

            $invoiceBlueprints = [
                ['days' => 75, 'due' => 45, 'status' => 'paid', 'total' => 1860.00, 'paid' => 1860.00, 'name' => 'Quarterly wholesale order'],
                ['days' => 42, 'due' => 12, 'status' => 'paid', 'total' => 1248.50, 'paid' => 1248.50, 'name' => 'Store replenishment'],
                ['days' => 24, 'due' => -6, 'status' => 'overdue', 'total' => 2160.00, 'paid' => 0, 'name' => 'Corporate equipment order'],
                ['days' => 14, 'due' => 16, 'status' => 'partial', 'total' => 980.00, 'paid' => 400.00, 'name' => 'Monthly supply contract'],
                ['days' => 5, 'due' => 25, 'status' => 'sent', 'total' => 1540.00, 'paid' => 0, 'name' => 'Retail stock allocation'],
                ['days' => 1, 'due' => 29, 'status' => 'draft', 'total' => 675.00, 'paid' => 0, 'name' => 'Special product bundle'],
            ];

            foreach ($invoiceBlueprints as $i => $row) {
                $subtotal = round($row['total'] / 1.05, 2);
                $tax = round($row['total'] - $subtotal, 2);
                $issueDate = now()->subDays($row['days'])->toDateString();
                $dueDate = now()->addDays($row['due'])->toDateString();
                $number = sprintf('INV-%s-%s-%04d', now()->format('Y'), $suffix, $i + 1);
                $invoice = AccountingInvoice::withoutGlobalScopes()->create([
                    'tenant_id' => $tenant->id,
                    'contact_id' => $customer->id,
                    'created_by' => $ownerId,
                    'number' => $number,
                    'customer_name' => $customer->name,
                    'customer_email' => $customer->email,
                    'issue_date' => $issueDate,
                    'due_date' => $dueDate,
                    'status' => $row['status'],
                    'subtotal' => $subtotal,
                    'tax_total' => $tax,
                    'total' => $row['total'],
                    'amount_paid' => $row['paid'],
                    'balance_due' => round($row['total'] - $row['paid'], 2),
                    'currency' => $currency,
                    'notes' => 'Thank you for your business. Payment reference: '.$number,
                    'sent_at' => $row['status'] !== 'draft' ? now()->subDays($row['days']) : null,
                    'paid_at' => $row['status'] === 'paid' ? now()->subDays(max(1, $row['days'] - 8)) : null,
                ]);
                $invoice->items()->create([
                    'description' => $row['name'],
                    'quantity' => 1,
                    'unit_price' => $subtotal,
                    'tax_rate' => 5,
                    'line_subtotal' => $subtotal,
                    'line_tax' => $tax,
                    'line_total' => $row['total'],
                ]);
                if ($row['paid'] > 0) {
                    AccountingPayment::withoutGlobalScopes()->create([
                        'tenant_id' => $tenant->id,
                        'invoice_id' => $invoice->id,
                        'created_by' => $ownerId,
                        'reference' => sprintf('PAY-%s-%s-I%03d', now()->format('Y'), $suffix, $i + 1),
                        'direction' => 'incoming',
                        'method' => $i % 2 === 0 ? 'bank_transfer' : 'card',
                        'amount' => $row['paid'],
                        'currency' => $currency,
                        'paid_on' => now()->subDays(max(1, $row['days'] - 8))->toDateString(),
                    ]);
                }
            }

            $expenseRows = [
                ['description' => 'Inventory freight and handling', 'category' => 'Shipping', 'days' => 52, 'amount' => 430, 'tax' => 21.50, 'status' => 'paid'],
                ['description' => 'Commerce platform software', 'category' => 'Software', 'days' => 32, 'amount' => 149, 'tax' => 0, 'status' => 'paid'],
                ['description' => 'Performance marketing creative', 'category' => 'Marketing', 'days' => 18, 'amount' => 620, 'tax' => 31, 'status' => 'paid'],
                ['description' => 'Warehouse utilities', 'category' => 'Utilities', 'days' => 12, 'amount' => 285, 'tax' => 14.25, 'status' => 'overdue'],
                ['description' => 'Incoming inventory deposit', 'category' => 'Inventory', 'days' => 4, 'amount' => 1450, 'tax' => 72.50, 'status' => 'pending'],
            ];
            foreach ($expenseRows as $i => $row) {
                $total = $row['amount'] + $row['tax'];
                $expense = AccountingExpense::withoutGlobalScopes()->create([
                    'tenant_id' => $tenant->id,
                    'vendor_id' => $vendor->id,
                    'created_by' => $ownerId,
                    'number' => sprintf('BILL-%s-%s-%04d', now()->format('Y'), $suffix, $i + 1),
                    'vendor_name' => $vendor->name,
                    'category' => $row['category'],
                    'description' => $row['description'],
                    'expense_date' => now()->subDays($row['days'])->toDateString(),
                    'due_date' => now()->subDays($row['days'])->addDays(10)->toDateString(),
                    'amount' => $row['amount'],
                    'tax_amount' => $row['tax'],
                    'total' => $total,
                    'currency' => $currency,
                    'status' => $row['status'],
                    'receipt_reference' => 'REC-'.($tenant->id * 1000 + $i + 1),
                    'paid_at' => $row['status'] === 'paid' ? now()->subDays(max(1, $row['days'] - 5)) : null,
                ]);
                if ($row['status'] === 'paid') {
                    AccountingPayment::withoutGlobalScopes()->create([
                        'tenant_id' => $tenant->id,
                        'expense_id' => $expense->id,
                        'created_by' => $ownerId,
                        'reference' => sprintf('PAY-%s-%s-E%03d', now()->format('Y'), $suffix, $i + 1),
                        'direction' => 'outgoing',
                        'method' => 'bank_transfer',
                        'amount' => $total,
                        'currency' => $currency,
                        'paid_on' => now()->subDays(max(1, $row['days'] - 5))->toDateString(),
                    ]);
                }
            }

            $purchaseRows = [
                ['status' => 'received', 'days' => 65, 'total' => 2750.00, 'label' => 'Core inventory restock'],
                ['status' => 'ordered', 'days' => 9, 'total' => 1860.00, 'label' => 'Holiday inventory batch'],
                ['status' => 'pending_approval', 'days' => 2, 'total' => 920.00, 'label' => 'Packaging and fulfilment supplies'],
            ];
            foreach ($purchaseRows as $i => $row) {
                $subtotal = round($row['total'] / 1.05, 2);
                $tax = round($row['total'] - $subtotal, 2);
                $po = PurchaseOrder::withoutGlobalScopes()->create([
                    'tenant_id' => $tenant->id,
                    'vendor_id' => $vendor->id,
                    'created_by' => $ownerId,
                    'approved_by' => in_array($row['status'], ['ordered', 'received'], true) ? $ownerId : null,
                    'number' => sprintf('PO-%s-%s-%04d', now()->format('Y'), $suffix, $i + 1),
                    'vendor_name' => $vendor->name,
                    'order_date' => now()->subDays($row['days'])->toDateString(),
                    'expected_date' => now()->subDays($row['days'])->addDays(18)->toDateString(),
                    'status' => $row['status'],
                    'subtotal' => $subtotal,
                    'tax_total' => $tax,
                    'total' => $row['total'],
                    'currency' => $currency,
                    'notes' => 'Procurement request: '.$row['label'],
                    'approved_at' => in_array($row['status'], ['ordered', 'received'], true) ? now()->subDays(max(1, $row['days'] - 2)) : null,
                    'received_at' => $row['status'] === 'received' ? now()->subDays(max(1, $row['days'] - 16)) : null,
                ]);
                $po->items()->create([
                    'description' => $row['label'],
                    'sku' => 'SUP-'.($i + 101),
                    'quantity' => 20 + ($i * 10),
                    'received_quantity' => $row['status'] === 'received' ? 20 + ($i * 10) : 0,
                    'unit_cost' => round($subtotal / (20 + ($i * 10)), 2),
                    'tax_rate' => 5,
                    'line_subtotal' => $subtotal,
                    'line_tax' => $tax,
                    'line_total' => $row['total'],
                ]);
            }

            // Build the double-entry ledger from the operational documents.
            $posting = app(AccountingPostingService::class);
            $posting->ensureDefaultAccounts($tenant->id);
            foreach (AccountingInvoice::withoutGlobalScopes()->where('tenant_id', $tenant->id)->get() as $invoice) {
                $posting->postInvoice($invoice, $ownerId);
            }
            foreach (AccountingExpense::withoutGlobalScopes()->where('tenant_id', $tenant->id)->get() as $expense) {
                $posting->postExpense($expense, $ownerId);
            }
            $tenantPayments = AccountingPayment::withoutGlobalScopes()
                ->where('tenant_id', $tenant->id)->with(['invoice', 'expense'])->get();
            foreach ($tenantPayments as $payment) {
                if ($payment->invoice) {
                    $posting->postInvoicePayment($payment, $payment->invoice, $ownerId);
                } elseif ($payment->expense) {
                    $posting->postExpensePayment($payment, $payment->expense, $ownerId);
                }
            }

            // Statement rows include matched entries plus two exceptions for the reconciliation queue.
            $cash = AccountingAccount::withoutGlobalScopes()->where('tenant_id', $tenant->id)->where('system_key', 'cash')->firstOrFail();
            $bank = AccountingBankAccount::withoutGlobalScopes()->create([
                'tenant_id' => $tenant->id,
                'ledger_account_id' => $cash->id,
                'name' => 'Primary operating account',
                'bank_name' => 'MarketHub Demo Bank',
                'account_number_last4' => str_pad((string) (4100 + $tenant->id), 4, '0', STR_PAD_LEFT),
                'currency' => $currency,
                'opening_balance' => 0,
            ]);
            foreach ($tenantPayments as $index => $payment) {
                $matched = $index < $tenantPayments->count() - 1;
                AccountingBankTransaction::withoutGlobalScopes()->create([
                    'tenant_id' => $tenant->id,
                    'bank_account_id' => $bank->id,
                    'payment_id' => $matched ? $payment->id : null,
                    'transaction_date' => $payment->paid_on,
                    'description' => $payment->direction === 'incoming' ? 'Customer receipt' : 'Supplier payment',
                    'reference' => 'STM-'.$payment->reference,
                    'amount' => $payment->direction === 'incoming' ? $payment->amount : -(float) $payment->amount,
                    'status' => $matched ? 'matched' : 'unmatched',
                    'reconciled_at' => $matched ? now() : null,
                ]);
            }
            AccountingBankTransaction::withoutGlobalScopes()->create([
                'tenant_id' => $tenant->id,
                'bank_account_id' => $bank->id,
                'transaction_date' => now()->subDay()->toDateString(),
                'description' => 'Bank service charge',
                'reference' => 'STM-'.$suffix.'-FEE',
                'amount' => -18.50,
                'status' => 'unmatched',
            ]);
            AccountingBankTransaction::withoutGlobalScopes()->create([
                'tenant_id' => $tenant->id,
                'bank_account_id' => $bank->id,
                'transaction_date' => now()->toDateString(),
                'description' => 'Unidentified customer transfer',
                'reference' => 'STM-'.$suffix.'-UNIDENTIFIED',
                'amount' => 275.00,
                'status' => 'unmatched',
            ]);
        }
    }
}
