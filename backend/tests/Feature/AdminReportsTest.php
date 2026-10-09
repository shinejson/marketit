<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Covers the super-admin report workspace (/admin/reports) backed by
 * GET /api/admin/reports.
 */
class AdminReportsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        TenantContext::clear();
    }

    protected function admin(): User
    {
        return User::query()->where('email', 'admin@markethub.test')->firstOrFail();
    }

    public function test_super_admin_gets_platform_wide_report(): void
    {
        $payload = $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/admin/reports?days=14')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'range' => ['days', 'start', 'end', 'previous_start', 'previous_end'],
                    'scope' => ['tenant_id', 'tenant_name'],
                    'kpis' => ['gmv' => ['value', 'previous', 'delta_percent', 'direction'], 'active_tenants', 'new_tenants', 'buyers'],
                    'series',
                    'funnel' => ['steps', 'cart_abandonment'],
                    'status_mix',
                    'top_products',
                    'tenants',
                    'customers' => ['buyers', 'repeat_buyers', 'repeat_rate', 'revenue_per_buyer'],
                    'ads' => ['impressions', 'clicks', 'spend', 'ctr', 'avg_cpc'],
                    'billing' => ['mrr', 'active_subscriptions', 'open_invoices', 'open_amount'],
                    'payouts' => ['by_status', 'on_hold' => ['count', 'net']],
                    'tenant_status',
                    'tenant_options',
                    'highlights',
                ],
            ])
            ->json('data');

        $this->assertSame(14, $payload['range']['days']);
        $this->assertCount(14, $payload['series']);
        $this->assertNull($payload['scope']['tenant_id']);
        $this->assertNotEmpty($payload['tenant_options']);
    }

    public function test_report_can_be_scoped_to_a_single_tenant(): void
    {
        $seller = User::query()->where('email', 'seller1@markethub.test')->firstOrFail();
        $tenantId = $seller->tenantId();

        $payload = $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/admin/reports?days=30&tenant_id='.$tenantId)
            ->assertOk()
            ->json('data');

        $this->assertSame($tenantId, $payload['scope']['tenant_id']);
        $this->assertNotNull($payload['scope']['tenant_name']);
        foreach ($payload['tenants'] as $row) {
            $this->assertSame($tenantId, $row['id']);
        }
    }

    public function test_unknown_tenant_scope_returns_not_found(): void
    {
        $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/admin/reports?tenant_id=999999')
            ->assertNotFound();
    }

    public function test_tenant_owners_cannot_open_the_platform_report(): void
    {
        $seller = User::query()->where('email', 'seller1@markethub.test')->firstOrFail();

        $this->actingAs($seller, 'sanctum')
            ->getJson('/api/admin/reports?days=30')
            ->assertForbidden();
    }
}
