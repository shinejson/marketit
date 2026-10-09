<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\TenantReportController;
use App\Models\Product;
use App\Models\User;
use App\Support\TenantContext;
use App\Support\TenantReportCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Covers /tenant/reports: the permission-filtered catalogue, per-report
 * authorization, column-level privacy and the reporting-window guards.
 *
 * Seeded fixtures this file leans on (see AccessControlSeeder):
 *   seller1@markethub.test   tenant owner, NorthStar Gadgets — every permission
 *   seller2@markethub.test   tenant owner, Kente & Co — a different workspace
 *   finance@markethub.test   finance officer  — finance.view, orders.view, no inventory
 *   warehouse@markethub.test operations lead — orders.view, no customers.view
 *   support@markethub.test   support agent with a per-user permission override
 *   former.staff@markethub.test suspended assignment
 *   customer@markethub.test  shopper, no console access
 */
class TenantReportCenterTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        TenantContext::clear();
    }

    protected function user(string $email): User
    {
        return User::query()->where('email', $email)->firstOrFail();
    }

    // ------------------------------------------------------------------ catalogue

    public function test_owner_sees_the_whole_catalogue(): void
    {
        $this->actingAs($this->user('seller1@markethub.test'), 'sanctum')
            ->getJson('/api/tenant/reports/catalog')
            ->assertOk()
            ->assertJsonStructure(['data' => ['categories' => [['name', 'icon', 'reports' => [['key', 'label', 'favorite', 'permission', 'available']]]]], 'meta' => ['total', 'accessible', 'permissions' => ['can_export']]])
            ->assertJsonPath('meta.total', count(TenantReportCatalog::flat()))
            ->assertJsonPath('meta.accessible', count(TenantReportCatalog::flat()))
            ->assertJsonPath('meta.permissions.can_export', true)
            ->assertJsonCount(6, 'data.categories');
    }

    public function test_catalogue_is_trimmed_to_the_callers_permissions(): void
    {
        $response = $this->actingAs($this->user('support@markethub.test'), 'sanctum')
            ->getJson('/api/tenant/reports/catalog')
            ->assertOk();

        $categories = collect($response->json('data.categories'))->pluck('name');
        $this->assertTrue($categories->contains('Sales & Orders Reports'), 'support holds orders.view');
        $this->assertFalse($categories->contains('Finance & Accounting Reports'), 'support must not see finance reports');
        $this->assertFalse($categories->contains('Audit & Operations Reports'), 'support must not see the audit trail');

        $keys = collect($response->json('data.categories'))->flatMap(fn ($c) => collect($c['reports'])->pluck('key'));
        $this->assertFalse($keys->contains('invoices_breakdown'));
        $this->assertFalse($keys->contains('audit_trail'));
        $this->assertLessThan($response->json('meta.total'), $response->json('meta.accessible'));
    }

    public function test_finance_staff_catalogue_excludes_inventory_and_audit(): void
    {
        $response = $this->actingAs($this->user('finance@markethub.test'), 'sanctum')
            ->getJson('/api/tenant/reports/catalog')
            ->assertOk();

        $keys = collect($response->json('data.categories'))->flatMap(fn ($c) => collect($c['reports'])->pluck('key'));
        $this->assertTrue($keys->contains('invoices_breakdown'));
        $this->assertFalse($keys->contains('inventory_stock'), 'finance officers do not hold inventory.view');
        $this->assertFalse($keys->contains('audit_trail'), 'finance officers do not hold team.view');
    }

    // ---------------------------------------------------------------- authorization

    public function test_staff_cannot_generate_reports_outside_their_permissions(): void
    {
        $support = $this->user('support@markethub.test');

        foreach (['invoices_breakdown', 'pnl_statement', 'audit_trail', 'inventory_stock'] as $report) {
            $this->actingAs($support, 'sanctum')
                ->getJson("/api/tenant/reports/generate?report={$report}")
                ->assertForbidden();
        }

        $this->actingAs($this->user('finance@markethub.test'), 'sanctum')
            ->getJson('/api/tenant/reports/generate?report=inventory_stock')
            ->assertForbidden();

        $this->actingAs($this->user('warehouse@markethub.test'), 'sanctum')
            ->getJson('/api/tenant/reports/generate?report=payments_ledger')
            ->assertForbidden();
    }

    public function test_permitted_reports_generate_for_their_role(): void
    {
        $this->actingAs($this->user('finance@markethub.test'), 'sanctum')
            ->getJson('/api/tenant/reports/generate?report=invoices_breakdown')
            ->assertOk()
            ->assertJsonPath('data.report_key', 'invoices_breakdown')
            ->assertJsonStructure(['data' => ['kpis', 'columns', 'rows', 'totals', 'help', 'permissions' => ['can_export']]]);

        $this->actingAs($this->user('warehouse@markethub.test'), 'sanctum')
            ->getJson('/api/tenant/reports/generate?report=inventory_stock')
            ->assertOk()
            ->assertJsonPath('data.report_key', 'inventory_stock');

        $this->actingAs($this->user('support@markethub.test'), 'sanctum')
            ->getJson('/api/tenant/reports/generate?report=sales_summary')
            ->assertOk()
            ->assertJsonPath('data.report_key', 'sales_summary');
    }

    public function test_owner_can_generate_every_ready_report(): void
    {
        $owner = $this->user('seller1@markethub.test');

        foreach (array_keys(TenantReportCatalog::flat()) as $key) {
            if (! TenantReportCatalog::isReady($key)) {
                continue;
            }

            $this->actingAs($owner, 'sanctum')
                ->getJson("/api/tenant/reports/generate?report={$key}")
                ->assertOk()
                ->assertJsonPath('data.report_key', $key);
        }
    }

    // ------------------------------------------------------------------- edge cases

    public function test_reports_without_a_generator_answer_501_rather_than_other_data(): void
    {
        $response = $this->actingAs($this->user('seller1@markethub.test'), 'sanctum')
            ->getJson('/api/tenant/reports/generate?report=pnl_statement')
            ->assertStatus(501);

        $this->assertNull($response->json('data.rows'), 'A stub must never return another report\'s rows.');
        $this->assertFalse(TenantReportCatalog::isReady('pnl_statement'));
    }

    public function test_unknown_and_method_shaped_report_keys_are_rejected(): void
    {
        $owner = $this->user('seller1@markethub.test');

        foreach (['__construct', 'catalog', 'report_categories', 'salesSummary', 'permissionsFor'] as $key) {
            $this->actingAs($owner, 'sanctum')
                ->getJson('/api/tenant/reports/generate?report='.rawurlencode($key))
                ->assertStatus(422);
        }
    }

    public function test_reporting_window_is_validated_and_bounded(): void
    {
        $owner = $this->user('seller1@markethub.test');

        // A window wider than the cap must not fan a day-by-day query out.
        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/tenant/reports/generate?report=sales_summary&start_date=1900-01-01&end_date=2100-01-01')
            ->assertStatus(422);

        // Inverted range.
        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/tenant/reports/generate?report=sales_summary&start_date=2026-05-10&end_date=2026-05-01')
            ->assertStatus(422);

        // Unparseable dates are a validation error, not a 500.
        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/tenant/reports/generate?report=sales_summary&start_date=not-a-date')
            ->assertStatus(422);

        // Filters must be typed.
        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/tenant/reports/generate?report=sales_summary&store_id=abc&amount_min=-5')
            ->assertStatus(422);

        // A legal window still works.
        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/tenant/reports/generate?report=sales_summary&start_date='.now()->subDays(7)->toDateString().'&end_date='.now()->toDateString())
            ->assertOk()
            ->assertJsonPath('data.range.days', 8);
    }

    // ----------------------------------------------------------------------- privacy

    public function test_buyer_email_is_masked_without_the_customers_permission(): void
    {
        $response = $this->actingAs($this->user('warehouse@markethub.test'), 'sanctum')
            ->getJson('/api/tenant/reports/generate?report=orders_master')
            ->assertOk();

        $rows = $response->json('data.rows') ?? [];
        foreach ($rows as $row) {
            $this->assertSame('Restricted', $row['customer_email'], 'Buyer contact details need customers.view.');
        }

        $column = collect($response->json('data.columns'))->firstWhere('key', 'customer_email');
        $this->assertTrue((bool) ($column['restricted'] ?? false));
        $this->assertFalse((bool) $column['selected']);
    }

    public function test_buyer_email_is_visible_to_a_caller_with_customers_permission(): void
    {
        $response = $this->actingAs($this->user('seller1@markethub.test'), 'sanctum')
            ->getJson('/api/tenant/reports/generate?report=orders_master')
            ->assertOk();

        $rows = $response->json('data.rows') ?? [];
        foreach ($rows as $row) {
            $this->assertNotSame('Restricted', $row['customer_email']);
        }

        $column = collect($response->json('data.columns'))->firstWhere('key', 'customer_email');
        $this->assertArrayNotHasKey('restricted', $column);
    }

    // ------------------------------------------------------------------ tenant scoping

    public function test_reports_only_return_the_callers_own_tenant(): void
    {
        $kente = $this->user('seller2@markethub.test');

        $response = $this->actingAs($kente, 'sanctum')
            ->getJson('/api/tenant/reports/generate?report=inventory_stock')
            ->assertOk()
            ->assertJsonPath('data.tenant_name', 'Kente & Co');

        $tenantId = $kente->load('roles')->tenantId();
        $own = Product::withoutGlobalScopes()->where('tenant_id', $tenantId)->pluck('name');

        foreach ($response->json('data.rows') ?? [] as $row) {
            $this->assertTrue($own->contains($row['name']), "Report leaked [{$row['name']}] from another tenant.");
        }
    }

    // ------------------------------------------------------------------- access levels

    public function test_suspended_staff_and_customers_cannot_reach_the_report_center(): void
    {
        $this->actingAs($this->user('former.staff@markethub.test'), 'sanctum')
            ->getJson('/api/tenant/reports/catalog')
            ->assertForbidden();

        $this->actingAs($this->user('former.staff@markethub.test'), 'sanctum')
            ->getJson('/api/tenant/reports/generate?report=sales_summary')
            ->assertForbidden();

        $this->actingAs($this->user('customer@markethub.test'), 'sanctum')
            ->getJson('/api/tenant/reports/catalog')
            ->assertForbidden();

        $this->getJson('/api/tenant/reports/catalog')->assertUnauthorized();
    }

    // ------------------------------------------------------------------ catalogue integrity

    public function test_catalogue_only_references_published_permissions_and_real_generators(): void
    {
        $this->assertSame([], TenantReportCatalog::audit(TenantReportController::class));
    }

    public function test_catalogue_never_grants_access_to_an_empty_permission_set(): void
    {
        $this->assertSame([], TenantReportCatalog::accessibleKeys([]));
        $this->assertSame([], TenantReportCatalog::categoriesFor([]));
        $this->assertFalse(TenantReportCatalog::canExport([]));
        $this->assertFalse(TenantReportCatalog::canAccess([], 'sales_summary'));
    }
}
