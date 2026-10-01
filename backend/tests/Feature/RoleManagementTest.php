<?php

namespace Tests\Feature;

use App\Models\RoleDefinition;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_super_admin_can_crud_a_role_with_catalog_permissions(): void
    {
        $admin = User::query()->where('email', 'admin@markethub.test')->firstOrFail();

        $catalog = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/roles')
            ->assertOk()
            ->assertJsonFragment(['key' => 'super_admin'])
            ->json('meta.permission_groups');
        $this->assertNotEmpty($catalog);

        $created = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/roles', [
                'key' => 'support_manager',
                'name' => 'Support manager',
                'description' => 'Handles customer support requests.',
                'permissions' => ['users.view', 'orders.manage'],
            ])
            ->assertCreated()
            ->assertJsonPath('data.key', 'support_manager')
            ->assertJsonPath('data.permissions', ['users.view', 'orders.manage'])
            ->json('data');

        $this->assertDatabaseHas('roles', ['key' => 'support_manager', 'name' => 'Support manager']);

        $this->actingAs($admin, 'sanctum')
            ->patchJson('/api/admin/roles/'.$created['id'], [
                'name' => 'Customer support manager',
                'permissions' => ['users.view', 'orders.manage', 'account.manage'],
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Customer support manager')
            ->assertJsonPath('data.permissions', ['users.view', 'orders.manage', 'account.manage']);

        $this->actingAs($admin, 'sanctum')
            ->deleteJson('/api/admin/roles/'.$created['id'])
            ->assertOk()
            ->assertJsonPath('data.deleted', true);
        $this->assertDatabaseMissing('roles', ['id' => $created['id']]);
    }

    public function test_user_can_be_created_with_multiple_managed_role_assignments(): void
    {
        $admin = User::query()->where('email', 'admin@markethub.test')->firstOrFail();
        $customRole = RoleDefinition::query()->create([
            'key' => 'support_manager',
            'name' => 'Support manager',
            'permissions' => ['users.view'],
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/users', [
                'name' => 'Naa Support',
                'email' => 'naa.support@markethub.test',
                'password' => 'password123',
                'roles' => [
                    ['role' => 'customer', 'tenant_id' => null],
                    ['role' => $customRole->key, 'tenant_id' => null],
                ],
            ])
            ->assertCreated()
            ->assertJsonCount(2, 'data.roles')
            ->assertJsonFragment(['role' => 'support_manager']);

        $this->assertDatabaseHas('user_roles', [
            'user_id' => $response->json('data.id'),
            'role' => 'support_manager',
        ]);
    }
}
