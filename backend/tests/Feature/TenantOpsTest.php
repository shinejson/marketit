<?php

namespace Tests\Feature;

use App\Models\TenantBackup;
use App\Models\User;
use App\Models\UserRole;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantOpsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        TenantContext::clear();
    }

    public function test_seller_department_dashboards_include_charts_and_progress(): void
    {
        $seller = User::query()->where('email', 'seller1@markethub.test')->first();

        $overview = $this->actingAs($seller, 'sanctum')
            ->getJson('/api/tenant/dashboard/departments')
            ->assertOk()
            ->json('data.departments');

        $this->assertCount(4, $overview);
        $this->assertSame(['finance', 'sales', 'operations', 'marketing'], array_column($overview, 'key'));

        foreach (['finance', 'sales', 'operations', 'marketing'] as $dept) {
            $payload = $this->actingAs($seller, 'sanctum')
                ->getJson('/api/tenant/dashboard/departments/'.$dept)
                ->assertOk()
                ->json('data');

            $this->assertSame($dept, $payload['department']);
            $this->assertNotEmpty($payload['kpis']);
            $this->assertNotEmpty($payload['progress']);
            $this->assertNotEmpty($payload['charts']);
            $this->assertContains($payload['charts'][0]['type'], ['line', 'bar', 'donut']);
        }
    }

    public function test_owner_can_manage_staff_and_staff_cannot(): void
    {
        $seller = User::query()->where('email', 'seller1@markethub.test')->first();
        $ops = User::query()->where('email', 'ops@markethub.test')->first();

        $created = $this->actingAs($seller, 'sanctum')
            ->postJson('/api/tenant/staff', [
                'name' => 'New Clerk',
                'email' => 'clerk@markethub.test',
                'role' => 'store_staff',
                'department' => 'sales',
            ])
            ->assertCreated()
            ->json('data');

        $this->assertSame('sales', $created['department']);
        $this->assertNotEmpty($this->actingAs($seller, 'sanctum')->postJson('/api/tenant/staff', [
            'name' => 'Temp',
            'email' => 'tempclerk@markethub.test',
            'role' => 'store_staff',
        ])->json('meta.temporary_password'));

        $this->actingAs($ops, 'sanctum')
            ->postJson('/api/tenant/staff', [
                'name' => 'Nope',
                'email' => 'nope@markethub.test',
                'role' => 'store_staff',
            ])
            ->assertForbidden();
    }

    public function test_settings_and_backups_are_tenant_scoped(): void
    {
        $seller = User::query()->where('email', 'seller1@markethub.test')->first();
        $other = User::query()->where('email', 'seller2@markethub.test')->first();

        $this->actingAs($seller, 'sanctum')
            ->patchJson('/api/tenant/settings', [
                'timezone' => 'UTC',
                'goals' => ['sales' => ['monthly_orders' => 99]],
            ])
            ->assertOk()
            ->assertJsonPath('data.settings.timezone', 'UTC')
            ->assertJsonPath('data.settings.goals.sales.monthly_orders', 99);

        $backup = $this->actingAs($seller, 'sanctum')
            ->postJson('/api/tenant/backups')
            ->assertCreated()
            ->json('data');

        $this->assertSame('completed', $backup['status']);
        $this->assertDatabaseHas('tenant_backups', ['id' => $backup['id'], 'tenant_id' => $seller->fresh()->load('roles')->tenantId()]);

        $foreign = TenantBackup::query()->find($backup['id']);
        $this->actingAs($other, 'sanctum')
            ->postJson('/api/tenant/backups/'.$foreign->id.'/restore')
            ->assertNotFound();
    }

    public function test_staff_list_does_not_leak_other_tenant(): void
    {
        $seller1 = User::query()->where('email', 'seller1@markethub.test')->first();
        $seller2 = User::query()->where('email', 'seller2@markethub.test')->first();

        $emails = collect($this->actingAs($seller1, 'sanctum')
            ->getJson('/api/tenant/staff')
            ->assertOk()
            ->json('data'))->pluck('email');

        $this->assertTrue($emails->contains('finance@markethub.test'));
        $this->assertFalse($emails->contains($seller2->email));
        $this->assertTrue(UserRole::query()->where('user_id', $seller1->id)->where('role', 'tenant_owner')->exists());
    }
}
