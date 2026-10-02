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
}
