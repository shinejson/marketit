<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\UserRole;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * GET /api/tenant/analytics is gated on analytics.view. Tenant owners always
 * pass; store staff pass only when their assignment carries the permission.
 */
class TenantAnalyticsPermissionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        TenantContext::clear();
    }

    /** Gives a seeded staff member an explicit permission list for this test. */
    protected function staffWith(array $permissions): User
    {
        $staff = User::query()->where('email', 'finance@markethub.test')->firstOrFail();
        $assignment = UserRole::query()->withoutGlobalScopes()
            ->where('user_id', $staff->id)
            ->where('role', 'store_staff')
            ->firstOrFail();
        $assignment->forceFill(['permissions' => $permissions])->save();

        return $staff->fresh();
    }

    public function test_owner_can_view_the_report_and_it_names_the_base_currency(): void
    {
        $owner = User::query()->where('email', 'seller1@markethub.test')->firstOrFail();

        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/tenant/analytics?days=14')
            ->assertOk()
            ->assertJsonPath('data.currency', 'USD')
            ->assertJsonStructure(['data' => ['kpis', 'series', 'stores', 'customers']]);
    }

    public function test_staff_without_analytics_view_are_refused(): void
    {
        $this->actingAs($this->staffWith(['orders.manage']), 'sanctum')
            ->getJson('/api/tenant/analytics?days=14')
            ->assertForbidden();
    }

    public function test_staff_with_analytics_view_can_read_the_report(): void
    {
        $this->actingAs($this->staffWith(['analytics.view']), 'sanctum')
            ->getJson('/api/tenant/analytics?days=14')
            ->assertOk()
            ->assertJsonStructure(['data' => ['kpis', 'currency']]);
    }
}
