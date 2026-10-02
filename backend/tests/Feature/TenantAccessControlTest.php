<?php

namespace Tests\Feature;

use App\Models\SocialIdentity;
use App\Models\TenantCustomerProfile;
use App\Models\TenantRole;
use App\Models\User;
use App\Models\UserRole;
use App\Support\TenantAccess;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Covers /tenant/users: system users, the tenant role catalog with its
 * permission checkboxes, and the customer directory.
 */
class TenantAccessControlTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        TenantContext::clear();
    }

    protected function owner(string $email = 'seller1@markethub.test'): User
    {
        return User::query()->where('email', $email)->firstOrFail();
    }

    protected function staff(string $email): User
    {
        return User::query()->where('email', $email)->firstOrFail();
    }

    // ---------------------------------------------------------- system users

    public function test_owner_sees_system_users_with_roles_permissions_and_meta(): void
    {
        $response = $this->actingAs($this->owner(), 'sanctum')
            ->getJson('/api/tenant/users')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [['id', 'name', 'email', 'role', 'status', 'tenant_role', 'permissions', 'custom_permissions']],
                'stats' => ['total', 'active', 'invited', 'suspended', 'owners'],
                'meta' => ['departments', 'access_levels', 'statuses', 'tenant_roles', 'permission_groups', 'stores', 'can_manage'],
            ]);

        $emails = collect($response->json('data'))->pluck('email');
        $this->assertTrue($emails->contains('finance@markethub.test'));
        $this->assertFalse($emails->contains('seller2@markethub.test'));

        $owner = collect($response->json('data'))->firstWhere('email', 'seller1@markethub.test');
        $this->assertSame('tenant_owner', $owner['role']);
        $this->assertEqualsCanonicalizing(TenantRole::permissionKeys(), $owner['permissions']);
        $this->assertTrue($response->json('meta.can_manage'));
    }

    public function test_invite_creates_a_staff_account_with_the_assigned_role(): void
    {
        $owner = $this->owner();
        $roleId = TenantRole::query()->withoutGlobalScopes()
            ->where('tenant_id', $owner->tenantId())
            ->where('key', 'operations')
            ->value('id');

        $response = $this->actingAs($owner, 'sanctum')
            ->postJson('/api/tenant/users', [
                'name' => 'New Clerk',
                'email' => 'clerk@markethub.test',
                'role' => 'store_staff',
                'tenant_role_id' => $roleId,
                'department' => 'operations',
            ])
            ->assertCreated();

        $this->assertNotEmpty($response->json('meta.temporary_password'));
        $this->assertSame('operations', $response->json('data.department'));
        $this->assertSame('invited', $response->json('data.status'));
        $this->assertContains('inventory.manage', $response->json('data.permissions'));
        $this->assertFalse($response->json('data.custom_permissions'));
        $this->assertDatabaseHas('users', ['email' => 'clerk@markethub.test']);
    }

    public function test_permission_overrides_are_only_stored_when_they_differ_from_the_role(): void
    {
        $owner = $this->owner();
        $assignment = UserRole::query()
            ->where('tenant_id', $owner->tenantId())
            ->whereHas('user', fn ($q) => $q->where('email', 'finance@markethub.test'))
            ->firstOrFail();

        $role = TenantRole::query()->withoutGlobalScopes()->findOrFail($assignment->tenant_role_id);

        // Same list as the role → no override is recorded.
        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/tenant/users/{$assignment->id}", ['permissions' => $role->permissions])
            ->assertOk()
            ->assertJsonPath('data.custom_permissions', false);

        // One extra capability → stored as an override.
        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/tenant/users/{$assignment->id}", [
                'permissions' => array_values(array_unique([...$role->permissions, 'support.manage'])),
            ])
            ->assertOk()
            ->assertJsonPath('data.custom_permissions', true);

        $this->assertContains('support.manage', $assignment->fresh()->effectivePermissions());
    }

    public function test_unknown_permissions_are_rejected(): void
    {
        $owner = $this->owner();
        $assignment = UserRole::query()
            ->where('tenant_id', $owner->tenantId())
            ->whereHas('user', fn ($q) => $q->where('email', 'sales@markethub.test'))
            ->firstOrFail();

        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/tenant/users/{$assignment->id}", ['permissions' => ['platform.takeover']])
            ->assertStatus(422);
    }

    public function test_staff_without_team_permission_cannot_manage_users(): void
    {
        $this->actingAs($this->staff('ops@markethub.test'), 'sanctum')
            ->postJson('/api/tenant/users', [
                'name' => 'Nope',
                'email' => 'nope@markethub.test',
                'role' => 'store_staff',
            ])
            ->assertForbidden();
    }

    public function test_suspending_access_locks_the_console_without_deleting_the_account(): void
    {
        $owner = $this->owner();
        $marketing = $this->staff('marketing@markethub.test');
        $assignment = UserRole::query()
            ->where('tenant_id', $owner->tenantId())
            ->where('user_id', $marketing->id)
            ->firstOrFail();

        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/tenant/users/{$assignment->id}", ['status' => TenantAccess::STATUS_SUSPENDED])
            ->assertOk()
            ->assertJsonPath('data.status', 'suspended');

        TenantContext::clear();

        $this->assertSame([], $marketing->fresh()->load('roles')->tenantPermissions());
        $this->actingAs($marketing->fresh(), 'sanctum')->getJson('/api/tenant/orders')->assertForbidden();
        $this->assertDatabaseHas('users', ['email' => 'marketing@markethub.test']);
    }

    public function test_owner_cannot_suspend_or_remove_their_own_access(): void
    {
        $owner = $this->owner();
        $assignment = UserRole::query()
            ->where('tenant_id', $owner->tenantId())
            ->where('user_id', $owner->id)
            ->firstOrFail();

        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/tenant/users/{$assignment->id}", ['status' => TenantAccess::STATUS_SUSPENDED])
            ->assertStatus(422);

        $this->actingAs($owner, 'sanctum')
            ->deleteJson("/api/tenant/users/{$assignment->id}")
            ->assertStatus(422);
    }

    public function test_staff_from_another_tenant_is_not_reachable(): void
    {
        $other = $this->owner('seller2@markethub.test');
        $assignment = UserRole::query()
            ->where('tenant_id', $this->owner()->tenantId())
            ->whereHas('user', fn ($q) => $q->where('email', 'finance@markethub.test'))
            ->firstOrFail();

        $this->actingAs($other, 'sanctum')
            ->patchJson("/api/tenant/users/{$assignment->id}", ['status' => TenantAccess::STATUS_SUSPENDED])
            ->assertNotFound();
    }

    // ------------------------------------------------------- roles catalogue

    public function test_roles_endpoint_exposes_the_permission_catalog(): void
    {
        $this->actingAs($this->owner(), 'sanctum')
            ->getJson('/api/tenant/roles')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [['id', 'key', 'name', 'permissions', 'is_system', 'users_count']],
                'meta' => ['permission_groups' => [['key', 'label', 'permissions' => [['key', 'label', 'description']]]]],
            ]);
    }

    public function test_owner_can_create_and_edit_a_custom_role(): void
    {
        $owner = $this->owner();

        $role = $this->actingAs($owner, 'sanctum')
            ->postJson('/api/tenant/roles', [
                'name' => 'Returns desk',
                'description' => 'Handles refunds only.',
                'permissions' => ['orders.view', 'orders.refund'],
            ])
            ->assertCreated()
            ->json('data');

        $this->assertSame('returns_desk', $role['key']);
        $this->assertFalse($role['is_system']);

        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/tenant/roles/{$role['id']}", ['permissions' => ['orders.view']])
            ->assertOk()
            ->assertJsonPath('data.permissions', ['orders.view']);

        $this->actingAs($owner, 'sanctum')
            ->deleteJson("/api/tenant/roles/{$role['id']}")
            ->assertOk();
    }

    public function test_owner_role_and_system_roles_are_protected(): void
    {
        $owner = $this->owner();
        $ownerRole = TenantRole::query()->withoutGlobalScopes()
            ->where('tenant_id', $owner->tenantId())
            ->where('key', TenantRole::KEY_OWNER)
            ->firstOrFail();

        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/tenant/roles/{$ownerRole->id}", ['permissions' => []])
            ->assertStatus(422);

        $this->actingAs($owner, 'sanctum')
            ->deleteJson("/api/tenant/roles/{$ownerRole->id}")
            ->assertStatus(422);
    }

    public function test_a_role_in_use_cannot_be_deleted(): void
    {
        $owner = $this->owner();
        $role = $this->actingAs($owner, 'sanctum')
            ->postJson('/api/tenant/roles', ['name' => 'Temp role', 'permissions' => ['orders.view']])
            ->assertCreated()
            ->json('data');

        $this->actingAs($owner, 'sanctum')
            ->postJson('/api/tenant/users', [
                'name' => 'Temp Person',
                'email' => 'temp.person@markethub.test',
                'role' => 'store_staff',
                'tenant_role_id' => $role['id'],
            ])
            ->assertCreated();

        $this->actingAs($owner, 'sanctum')
            ->deleteJson("/api/tenant/roles/{$role['id']}")
            ->assertStatus(422);
    }

    // ------------------------------------------------------------- customers

    public function test_customer_directory_lists_buyers_with_spend_and_login_methods(): void
    {
        $response = $this->actingAs($this->owner(), 'sanctum')
            ->getJson('/api/tenant/customers?per_page=50')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [['id', 'name', 'email', 'status', 'orders_count', 'total_spent', 'login_methods', 'social_accounts']],
                'meta' => ['page', 'per_page', 'total', 'providers', 'can_manage'],
                'stats' => ['total', 'blocked', 'repeat', 'social_logins', 'revenue'],
            ]);

        $this->assertGreaterThan(0, $response->json('stats.total'));
        $this->assertGreaterThan(0, $response->json('stats.social_logins'));
    }

    public function test_customers_are_scoped_to_the_tenant(): void
    {
        $tenantId = $this->owner()->tenantId();
        $stranger = User::query()->create([
            'name' => 'Never Bought Here',
            'email' => 'stranger@markethub.test',
            'password' => 'password',
        ]);
        UserRole::query()->create(['user_id' => $stranger->id, 'role' => 'customer']);

        $emails = collect($this->actingAs($this->owner(), 'sanctum')
            ->getJson('/api/tenant/customers?per_page=100')
            ->assertOk()
            ->json('data.*.email'));

        $this->assertFalse($emails->contains('stranger@markethub.test'));
        $this->assertDatabaseMissing('tenant_customer_profiles', ['user_id' => $stranger->id, 'tenant_id' => $tenantId]);

        $this->actingAs($this->owner(), 'sanctum')
            ->getJson("/api/tenant/customers/{$stranger->id}")
            ->assertNotFound();
    }

    public function test_blocking_a_customer_is_tenant_scoped_and_never_touches_the_account(): void
    {
        $owner = $this->owner();
        $customerId = $this->actingAs($owner, 'sanctum')
            ->getJson('/api/tenant/customers?per_page=1')
            ->assertOk()
            ->json('data.0.id');

        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/tenant/customers/{$customerId}", [
                'status' => TenantCustomerProfile::STATUS_BLOCKED,
                'segment' => 'vip',
                'tags' => ['watchlist'],
                'notes' => 'Chargeback review.',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'blocked')
            ->assertJsonPath('data.segment', 'vip');

        $this->assertDatabaseHas('tenant_customer_profiles', [
            'tenant_id' => $owner->tenantId(),
            'user_id' => $customerId,
            'status' => 'blocked',
        ]);
        $this->assertDatabaseHas('users', ['id' => $customerId, 'status' => 'active']);
    }

    public function test_social_identities_are_reported_for_customers(): void
    {
        $google = SocialIdentity::query()->where('provider', 'google')->firstOrFail();

        $rows = collect($this->actingAs($this->owner(), 'sanctum')
            ->getJson('/api/tenant/customers?provider=google&per_page=50')
            ->assertOk()
            ->json('data'));

        $this->assertTrue($rows->isNotEmpty());
        $rows->each(fn ($row) => $this->assertContains('google', collect($row['social_accounts'])->pluck('provider')->all()));
        $this->assertNotNull($google->user_id);
    }
}
