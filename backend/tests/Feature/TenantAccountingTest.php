<?php

namespace Tests\Feature;

use App\Models\AccountingContact;
use App\Models\AccountingInvoice;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantAccountingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        TenantContext::clear();
    }

    public function test_accounting_is_restricted_to_owners_and_finance_staff(): void
    {
        $finance = User::query()->where('email', 'finance@markethub.test')->firstOrFail();
        $sales = User::query()->where('email', 'sales@markethub.test')->firstOrFail();

        $this->actingAs($finance, 'sanctum')->getJson('/api/tenant/accounting/dashboard')->assertOk();
        $this->actingAs($sales, 'sanctum')->getJson('/api/tenant/accounting/dashboard')->assertForbidden();
    }

    public function test_finance_dashboard_and_lists_are_populated(): void
    {
        $seller = User::query()->where('email', 'seller1@markethub.test')->firstOrFail();

        $this->actingAs($seller, 'sanctum')
            ->getJson('/api/tenant/accounting/dashboard')
            ->assertOk()
            ->assertJsonStructure(['data' => [
                'currency', 'kpis' => ['cash_balance', 'receivables', 'payables', 'committed_spend'],
                'cash_flow', 'aging', 'recent_activity',
            ]]);

        $this->actingAs($seller, 'sanctum')
            ->getJson('/api/tenant/accounting/invoices')
            ->assertOk()
            ->assertJsonCount(6, 'data');

        $this->actingAs($seller, 'sanctum')
            ->getJson('/api/tenant/accounting/purchase-orders')
            ->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_tenant_can_create_send_and_pay_an_invoice(): void
    {
        $seller = User::query()->where('email', 'seller1@markethub.test')->firstOrFail();
        $contact = AccountingContact::withoutGlobalScopes()
            ->where('tenant_id', $seller->load('roles')->tenantId())
            ->whereIn('type', ['customer', 'both'])
            ->firstOrFail();

        $invoice = $this->actingAs($seller, 'sanctum')
            ->postJson('/api/tenant/accounting/invoices', [
                'contact_id' => $contact->id,
                'customer_name' => $contact->name,
                'customer_email' => $contact->email,
                'issue_date' => now()->toDateString(),
                'due_date' => now()->addDays(30)->toDateString(),
                'send_now' => true,
                'items' => [[
                    'description' => 'Wholesale inventory',
                    'quantity' => 2,
                    'unit_price' => 100,
                    'tax_rate' => 5,
                ]],
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'sent')
            ->assertJsonPath('data.total', '210.00')
            ->json('data');

        $this->actingAs($seller, 'sanctum')
            ->postJson('/api/tenant/accounting/invoices/'.$invoice['id'].'/payments', [
                'amount' => 80,
                'paid_on' => now()->toDateString(),
                'method' => 'bank_transfer',
                'reference' => 'BANK-TEST-001',
            ])
            ->assertCreated()
            ->assertJsonPath('data.invoice.status', 'partial')
            ->assertJsonPath('data.invoice.balance_due', '130.00');

        $this->assertDatabaseHas('accounting_payments', [
            'invoice_id' => $invoice['id'], 'direction' => 'incoming', 'amount' => 80,
        ]);
    }

    public function test_accounting_records_cannot_be_read_or_mutated_across_tenants(): void
    {
        $north = User::query()->where('email', 'seller1@markethub.test')->firstOrFail();
        $kente = User::query()->where('email', 'seller2@markethub.test')->firstOrFail();
        $foreignInvoice = AccountingInvoice::withoutGlobalScopes()
            ->where('tenant_id', $north->load('roles')->tenantId())
            ->firstOrFail();

        $ids = collect($this->actingAs($kente, 'sanctum')
            ->getJson('/api/tenant/accounting/invoices?per_page=100')
            ->assertOk()
            ->json('data'))->pluck('id');
        $this->assertFalse($ids->contains($foreignInvoice->id));

        $this->actingAs($kente, 'sanctum')
            ->patchJson('/api/tenant/accounting/invoices/'.$foreignInvoice->id, ['status' => 'sent'])
            ->assertNotFound();
    }

    public function test_general_ledger_is_balanced_and_reports_are_available(): void
    {
        $seller = User::query()->where('email', 'seller1@markethub.test')->firstOrFail();

        $journals = $this->actingAs($seller, 'sanctum')
            ->getJson('/api/tenant/accounting/journals?per_page=100')
            ->assertOk()
            ->json('data');
        $this->assertNotEmpty($journals);
        foreach ($journals as $journal) {
            $this->assertEqualsWithDelta((float) $journal['total_debit'], (float) $journal['total_credit'], 0.001);
        }

        $report = $this->actingAs($seller, 'sanctum')
            ->getJson('/api/tenant/accounting/reports?report=trial_balance')
            ->assertOk()
            ->json('data');
        $this->assertEqualsWithDelta((float) $report['total_debit'], (float) $report['total_credit'], 0.001);

        $this->actingAs($seller, 'sanctum')
            ->getJson('/api/tenant/accounting/reports?report=profit_loss')
            ->assertOk()
            ->assertJsonStructure(['data' => ['income', 'expenses', 'total_income', 'total_expenses', 'net_income']]);
    }

    public function test_bank_statement_can_be_reconciled_against_equal_payment(): void
    {
        $seller = User::query()->where('email', 'seller1@markethub.test')->firstOrFail();
        $rows = $this->actingAs($seller, 'sanctum')
            ->getJson('/api/tenant/accounting/bank-transactions?status=unmatched')
            ->assertOk()->json('data');
        $this->assertCount(3, $rows);

        $this->actingAs($seller, 'sanctum')
            ->patchJson('/api/tenant/accounting/bank-transactions/'.$rows[0]['id'], ['status' => 'excluded'])
            ->assertOk()
            ->assertJsonPath('data.status', 'excluded');
    }

    public function test_manual_journal_must_balance_before_it_can_post(): void
    {
        $seller = User::query()->where('email', 'seller1@markethub.test')->firstOrFail();
        $accounts = $this->actingAs($seller, 'sanctum')->getJson('/api/tenant/accounting/accounts')->assertOk()->json('data');

        $this->actingAs($seller, 'sanctum')->postJson('/api/tenant/accounting/journals', [
            'entry_date' => now()->toDateString(),
            'memo' => 'Invalid unbalanced entry',
            'post_now' => true,
            'lines' => [
                ['account_id' => $accounts[0]['id'], 'debit' => 100, 'credit' => 0],
                ['account_id' => $accounts[1]['id'], 'debit' => 0, 'credit' => 90],
            ],
        ])->assertUnprocessable();
    }

    public function test_procurement_follows_approval_workflow(): void
    {
        $seller = User::query()->where('email', 'seller1@markethub.test')->firstOrFail();
        $vendor = AccountingContact::withoutGlobalScopes()
            ->where('tenant_id', $seller->load('roles')->tenantId())
            ->whereIn('type', ['vendor', 'both'])
            ->firstOrFail();

        $po = $this->actingAs($seller, 'sanctum')
            ->postJson('/api/tenant/accounting/purchase-orders', [
                'vendor_id' => $vendor->id,
                'vendor_name' => $vendor->name,
                'order_date' => now()->toDateString(),
                'expected_date' => now()->addDays(14)->toDateString(),
                'submit_for_approval' => true,
                'items' => [[
                    'description' => 'Packaging cartons',
                    'sku' => 'PKG-100',
                    'quantity' => 10,
                    'unit_cost' => 12,
                    'tax_rate' => 5,
                ]],
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending_approval')
            ->json('data');

        $this->actingAs($seller, 'sanctum')
            ->patchJson('/api/tenant/accounting/purchase-orders/'.$po['id'], ['status' => 'approved'])
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');

        $this->actingAs($seller, 'sanctum')
            ->patchJson('/api/tenant/accounting/purchase-orders/'.$po['id'], ['status' => 'received'])
            ->assertUnprocessable();
    }

    public function test_contacts_can_be_created_updated_and_deleted(): void
    {
        $seller = User::query()->where('email', 'seller1@markethub.test')->firstOrFail();

        $contact = $this->actingAs($seller, 'sanctum')
            ->postJson('/api/tenant/accounting/contacts', [
                'type' => 'vendor',
                'name' => 'Blue Ridge Supplies',
                'email' => 'billing@blueridge.test',
                'payment_terms' => 14,
            ])
            ->assertCreated()
            ->assertJsonPath('data.type', 'vendor')
            ->assertJsonPath('data.is_active', true)
            ->json('data');

        $this->actingAs($seller, 'sanctum')
            ->patchJson('/api/tenant/accounting/contacts/'.$contact['id'], [
                'name' => 'Blue Ridge Supply Co',
                'payment_terms' => 45,
                'is_active' => false,
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Blue Ridge Supply Co')
            ->assertJsonPath('data.payment_terms', 45)
            ->assertJsonPath('data.is_active', false);

        $this->assertDatabaseHas('accounting_contacts', [
            'id' => $contact['id'], 'name' => 'Blue Ridge Supply Co', 'is_active' => false,
        ]);

        $this->actingAs($seller, 'sanctum')
            ->deleteJson('/api/tenant/accounting/contacts/'.$contact['id'])
            ->assertOk()
            ->assertJsonPath('data.deleted', true);

        $this->assertDatabaseMissing('accounting_contacts', ['id' => $contact['id']]);
    }

    public function test_contacts_with_history_are_protected_and_scoped_to_their_tenant(): void
    {
        $north = User::query()->where('email', 'seller1@markethub.test')->firstOrFail();
        $kente = User::query()->where('email', 'seller2@markethub.test')->firstOrFail();

        // Pick a seeded contact that already carries invoices.
        $used = collect($this->actingAs($north, 'sanctum')
            ->getJson('/api/tenant/accounting/contacts?per_page=100')
            ->assertOk()
            ->json('data'))->first(fn (array $row) => ($row['invoices_count'] ?? 0) > 0);
        $this->assertNotNull($used);

        // History keeps the row: delete is refused until it is archived instead.
        $this->actingAs($north, 'sanctum')
            ->deleteJson('/api/tenant/accounting/contacts/'.$used['id'])
            ->assertUnprocessable();

        $this->actingAs($north, 'sanctum')
            ->patchJson('/api/tenant/accounting/contacts/'.$used['id'], ['is_active' => false])
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        // Another tenant cannot see or mutate the contact at all (404 scope).
        $this->actingAs($kente, 'sanctum')
            ->patchJson('/api/tenant/accounting/contacts/'.$used['id'], ['name' => 'Hijacked Ltd'])
            ->assertNotFound();

        $this->actingAs($kente, 'sanctum')
            ->deleteJson('/api/tenant/accounting/contacts/'.$used['id'])
            ->assertNotFound();
    }

    public function test_draft_invoices_can_be_edited_and_deleted_but_sent_invoices_are_locked(): void
    {
        $seller = User::query()->where('email', 'seller1@markethub.test')->firstOrFail();
        $payload = [
            'customer_name' => 'North Shore Retail',
            'customer_email' => 'billing@northshore.test',
            'issue_date' => now()->toDateString(),
            'due_date' => now()->addDays(30)->toDateString(),
            'items' => [['description' => 'Initial item', 'quantity' => 1, 'unit_price' => 40, 'tax_rate' => 0]],
        ];
        $draft = $this->actingAs($seller, 'sanctum')->postJson('/api/tenant/accounting/invoices', $payload)
            ->assertCreated()->assertJsonPath('data.status', 'draft')->json('data');

        $this->actingAs($seller, 'sanctum')->patchJson('/api/tenant/accounting/invoices/'.$draft['id'], [
            'customer_name' => 'North Shore Retail Ltd',
            'items' => [['description' => 'Updated item', 'quantity' => 2, 'unit_price' => 50, 'tax_rate' => 10]],
        ])->assertOk()->assertJsonPath('data.customer_name', 'North Shore Retail Ltd')
            ->assertJsonPath('data.total', '110.00');

        $this->actingAs($seller, 'sanctum')->deleteJson('/api/tenant/accounting/invoices/'.$draft['id'])
            ->assertOk()->assertJsonPath('data.deleted', true);
        $this->assertDatabaseMissing('accounting_invoices', ['id' => $draft['id']]);

        $sent = $this->actingAs($seller, 'sanctum')->postJson('/api/tenant/accounting/invoices', [...$payload, 'send_now' => true])
            ->assertCreated()->json('data');
        $this->actingAs($seller, 'sanctum')->patchJson('/api/tenant/accounting/invoices/'.$sent['id'], ['customer_name' => 'Changed after send'])
            ->assertUnprocessable();
        $this->actingAs($seller, 'sanctum')->deleteJson('/api/tenant/accounting/invoices/'.$sent['id'])
            ->assertUnprocessable();
    }

    public function test_draft_expenses_can_be_edited_submitted_and_paid_with_a_read_only_payment_detail(): void
    {
        $seller = User::query()->where('email', 'seller1@markethub.test')->firstOrFail();
        $payload = [
            'vendor_name' => 'Blue Ridge Supplies', 'category' => 'Software', 'description' => 'Monthly service',
            'expense_date' => now()->toDateString(), 'due_date' => now()->addDays(14)->toDateString(),
            'amount' => 100, 'tax_amount' => 10, 'currency' => 'USD', 'status' => 'draft', 'notes' => 'Initial note',
        ];
        $draft = $this->actingAs($seller, 'sanctum')->postJson('/api/tenant/accounting/expenses', $payload)
            ->assertCreated()->assertJsonPath('data.status', 'draft')->json('data');
        $this->actingAs($seller, 'sanctum')->patchJson('/api/tenant/accounting/expenses/'.$draft['id'], [
            'description' => 'Updated monthly service', 'amount' => 120, 'notes' => 'Updated note',
        ])->assertOk()->assertJsonPath('data.description', 'Updated monthly service')
            ->assertJsonPath('data.total', '132.00');
        $this->actingAs($seller, 'sanctum')->patchJson('/api/tenant/accounting/expenses/'.$draft['id'], ['status' => 'pending'])
            ->assertOk()->assertJsonPath('data.status', 'pending');
        $this->actingAs($seller, 'sanctum')->patchJson('/api/tenant/accounting/expenses/'.$draft['id'], ['description' => 'Not editable now'])
            ->assertUnprocessable();

        $payment = $this->actingAs($seller, 'sanctum')->postJson('/api/tenant/accounting/expenses/'.$draft['id'].'/pay', [
            'paid_on' => now()->toDateString(), 'method' => 'bank_transfer', 'reference' => 'BR-TEST-001',
        ])->assertCreated()->json('data.payment');
        $this->actingAs($seller, 'sanctum')->getJson('/api/tenant/accounting/payments/'.$payment['id'])
            ->assertOk()->assertJsonPath('data.expense.id', $draft['id'])
            ->assertJsonPath('data.direction', 'outgoing');
        $this->actingAs($seller, 'sanctum')->deleteJson('/api/tenant/accounting/expenses/'.$draft['id'])
            ->assertUnprocessable();

        $deleteDraft = $this->actingAs($seller, 'sanctum')->postJson('/api/tenant/accounting/expenses', $payload)
            ->assertCreated()->json('data');
        $this->actingAs($seller, 'sanctum')->deleteJson('/api/tenant/accounting/expenses/'.$deleteDraft['id'])
            ->assertOk()->assertJsonPath('data.deleted', true);
    }

    public function test_draft_purchase_orders_can_be_edited_and_deleted(): void
    {
        $seller = User::query()->where('email', 'seller1@markethub.test')->firstOrFail();
        $vendor = AccountingContact::withoutGlobalScopes()->where('tenant_id', $seller->load('roles')->tenantId())
            ->whereIn('type', ['vendor', 'both'])->firstOrFail();
        $payload = [
            'vendor_id' => $vendor->id, 'vendor_name' => $vendor->name, 'order_date' => now()->toDateString(),
            'expected_date' => now()->addDays(14)->toDateString(), 'items' => [['description' => 'Packing boxes', 'quantity' => 2, 'unit_cost' => 10, 'tax_rate' => 0]],
        ];
        $order = $this->actingAs($seller, 'sanctum')->postJson('/api/tenant/accounting/purchase-orders', $payload)
            ->assertCreated()->assertJsonPath('data.status', 'draft')->json('data');
        $this->actingAs($seller, 'sanctum')->patchJson('/api/tenant/accounting/purchase-orders/'.$order['id'], [
            'notes' => 'Priority order', 'items' => [['description' => 'Packing boxes, large', 'quantity' => 3, 'unit_cost' => 20, 'tax_rate' => 0]],
        ])->assertOk()->assertJsonPath('data.notes', 'Priority order')->assertJsonPath('data.total', '60.00');
        $this->actingAs($seller, 'sanctum')->deleteJson('/api/tenant/accounting/purchase-orders/'.$order['id'])
            ->assertOk()->assertJsonPath('data.deleted', true);
    }

    public function test_custom_accounts_and_draft_journals_support_safe_crud(): void
    {
        $seller = User::query()->where('email', 'seller1@markethub.test')->firstOrFail();
        $accounts = $this->actingAs($seller, 'sanctum')->getJson('/api/tenant/accounting/accounts')->assertOk()->json('data');
        $account = $this->actingAs($seller, 'sanctum')->postJson('/api/tenant/accounting/accounts', [
            'code' => '6998', 'name' => 'Temporary ledger account', 'type' => 'expense', 'description' => 'For CRUD coverage',
        ])->assertCreated()->json('data');
        $this->actingAs($seller, 'sanctum')->patchJson('/api/tenant/accounting/accounts/'.$account['id'], ['name' => 'Temporary expense account'])
            ->assertOk()->assertJsonPath('data.name', 'Temporary expense account');
        $this->actingAs($seller, 'sanctum')->deleteJson('/api/tenant/accounting/accounts/'.$account['id'])
            ->assertOk()->assertJsonPath('data.deleted', true);

        $journalPayload = [
            'entry_date' => now()->toDateString(), 'reference' => 'CRUD-TEST-01', 'memo' => 'Draft adjustment', 'post_now' => false,
            'lines' => [
                ['account_id' => $accounts[0]['id'], 'description' => 'Debit', 'debit' => 25, 'credit' => 0],
                ['account_id' => $accounts[1]['id'], 'description' => 'Credit', 'debit' => 0, 'credit' => 25],
            ],
        ];
        $journal = $this->actingAs($seller, 'sanctum')->postJson('/api/tenant/accounting/journals', $journalPayload)
            ->assertCreated()->assertJsonPath('data.status', 'draft')->json('data');
        $this->actingAs($seller, 'sanctum')->patchJson('/api/tenant/accounting/journals/'.$journal['id'], ['memo' => 'Reviewed adjustment'])
            ->assertOk()->assertJsonPath('data.memo', 'Reviewed adjustment');
        $this->actingAs($seller, 'sanctum')->deleteJson('/api/tenant/accounting/journals/'.$journal['id'])
            ->assertOk()->assertJsonPath('data.deleted', true);

        $posted = $this->actingAs($seller, 'sanctum')->postJson('/api/tenant/accounting/journals', [...$journalPayload, 'memo' => 'Posted adjustment', 'post_now' => true])
            ->assertCreated()->json('data');
        $this->actingAs($seller, 'sanctum')->patchJson('/api/tenant/accounting/journals/'.$posted['id'], ['memo' => 'Cannot edit'])
            ->assertUnprocessable();
        $this->actingAs($seller, 'sanctum')->deleteJson('/api/tenant/accounting/journals/'.$posted['id'])
            ->assertUnprocessable();
    }

    public function test_bank_accounts_and_unmatched_statement_lines_support_safe_crud(): void
    {
        $seller = User::query()->where('email', 'seller1@markethub.test')->firstOrFail();
        $bank = $this->actingAs($seller, 'sanctum')->postJson('/api/tenant/accounting/bank-accounts', [
            'name' => 'CRUD operating account', 'bank_name' => 'Test Bank', 'account_number_last4' => '9988',
            'currency' => 'USD', 'opening_balance' => 100,
        ])->assertCreated()->json('data');
        $this->actingAs($seller, 'sanctum')->patchJson('/api/tenant/accounting/bank-accounts/'.$bank['id'], [
            'name' => 'Updated CRUD operating account', 'is_active' => false,
        ])->assertOk()->assertJsonPath('data.name', 'Updated CRUD operating account')
            ->assertJsonPath('data.is_active', false);
        $this->actingAs($seller, 'sanctum')->patchJson('/api/tenant/accounting/bank-accounts/'.$bank['id'], ['is_active' => true])
            ->assertOk()->assertJsonPath('data.is_active', true);

        $transaction = $this->actingAs($seller, 'sanctum')->postJson('/api/tenant/accounting/bank-transactions', [
            'bank_account_id' => $bank['id'], 'transaction_date' => now()->toDateString(),
            'description' => 'Statement line for CRUD test', 'reference' => 'STM-CRUD-01', 'amount' => -15,
        ])->assertCreated()->assertJsonPath('data.status', 'unmatched')->json('data');
        $this->actingAs($seller, 'sanctum')->patchJson('/api/tenant/accounting/bank-transactions/'.$transaction['id'], [
            'description' => 'Updated statement line', 'amount' => -18,
        ])->assertOk()->assertJsonPath('data.description', 'Updated statement line')
            ->assertJsonPath('data.amount', '-18.00');
        $this->actingAs($seller, 'sanctum')->patchJson('/api/tenant/accounting/bank-accounts/'.$bank['id'], ['opening_balance' => 120])
            ->assertUnprocessable();
        $this->actingAs($seller, 'sanctum')->deleteJson('/api/tenant/accounting/bank-accounts/'.$bank['id'])
            ->assertUnprocessable();
        $this->actingAs($seller, 'sanctum')->deleteJson('/api/tenant/accounting/bank-transactions/'.$transaction['id'])
            ->assertOk()->assertJsonPath('data.deleted', true);
        $this->actingAs($seller, 'sanctum')->deleteJson('/api/tenant/accounting/bank-accounts/'.$bank['id'])
            ->assertOk()->assertJsonPath('data.deleted', true);
    }

    public function test_payment_direction_filter_uses_the_direction_query_parameter(): void
    {
        $seller = User::query()->where('email', 'seller1@markethub.test')->firstOrFail();
        $expense = $this->actingAs($seller, 'sanctum')->postJson('/api/tenant/accounting/expenses', [
            'vendor_name' => 'Filter test supplier', 'category' => 'Software', 'description' => 'Filter test payment',
            'expense_date' => now()->toDateString(), 'amount' => 20, 'status' => 'pending',
        ])->assertCreated()->json('data');
        $this->actingAs($seller, 'sanctum')->postJson('/api/tenant/accounting/expenses/'.$expense['id'].'/pay', [
            'paid_on' => now()->toDateString(), 'method' => 'cash',
        ])->assertCreated();

        $outgoing = $this->actingAs($seller, 'sanctum')->getJson('/api/tenant/accounting/payments?direction=outgoing&per_page=100')
            ->assertOk()->json('data');
        $this->assertNotEmpty($outgoing);
        foreach ($outgoing as $payment) {
            $this->assertSame('outgoing', $payment['direction']);
        }
    }

}
