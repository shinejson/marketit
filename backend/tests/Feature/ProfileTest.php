<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        TenantContext::clear();
    }

    public function test_profile_returns_identity_roles_and_stats(): void
    {
        $seller = User::query()->where('email', 'seller1@markethub.test')->first();

        $data = $this->actingAs($seller, 'sanctum')->getJson('/api/profile')->assertOk()->json('data');

        $this->assertSame($seller->email, $data['user']['email']);
        $this->assertSame('tenant_owner', $data['user']['role']);
        $this->assertNotNull($data['tenant']);
        $this->assertTrue($data['tenant']['is_owner']);
        $this->assertArrayHasKey('activity_total', $data['stats']);
    }

    public function test_updating_the_profile_is_recorded_as_activity(): void
    {
        $seller = User::query()->where('email', 'seller1@markethub.test')->first();

        $this->actingAs($seller, 'sanctum')
            ->patchJson('/api/profile', ['name' => 'Ama M.', 'job_title' => 'Founder'])
            ->assertOk()
            ->assertJsonPath('data.user.job_title', 'Founder');

        $this->assertSame('Ama M.', $seller->fresh()->name);
        $this->assertTrue(
            AuditLog::query()->where('actor_user_id', $seller->id)->where('action', 'profile.updated')->exists()
        );
    }

    public function test_activity_feed_only_returns_my_own_events(): void
    {
        $seller = User::query()->where('email', 'seller1@markethub.test')->first();
        $other = User::query()->where('email', 'seller2@markethub.test')->first();

        AuditLog::query()->create([
            'actor_user_id' => $other->id,
            'tenant_id' => $other->tenantId(),
            'action' => 'updated',
            'subject_type' => User::class,
            'subject_id' => $other->id,
            'diff' => ['before' => null, 'after' => null],
            'ip' => '127.0.0.1',
        ]);

        $this->actingAs($seller, 'sanctum')->patchJson('/api/profile', ['job_title' => 'Owner'])->assertOk();

        $payload = $this->actingAs($seller, 'sanctum')->getJson('/api/profile/activity')->assertOk()->json();

        $this->assertNotEmpty($payload['data']);
        $this->assertArrayHasKey('trend', $payload['stats']);
        foreach ($payload['data'] as $row) {
            $this->assertNotSame($other->id, $row['subject_id'] ?? null);
        }
    }

    public function test_password_change_requires_the_current_password(): void
    {
        $seller = User::query()->where('email', 'seller1@markethub.test')->first();

        $this->actingAs($seller, 'sanctum')
            ->postJson('/api/profile/password', [
                'current_password' => 'wrong-password',
                'password' => 'new-password-123',
                'password_confirmation' => 'new-password-123',
            ])
            ->assertStatus(422);

        $this->actingAs($seller, 'sanctum')
            ->postJson('/api/profile/password', [
                'current_password' => 'password',
                'password' => 'new-password-123',
                'password_confirmation' => 'new-password-123',
            ])
            ->assertOk()
            ->assertJsonPath('data.ok', true);

        $this->assertTrue(
            AuditLog::query()->where('actor_user_id', $seller->id)->where('action', 'profile.password_changed')->exists()
        );
    }

    public function test_login_is_tracked(): void
    {
        $this->postJson('/api/auth/login', [
            'email' => 'seller1@markethub.test',
            'password' => 'password',
            'portal' => 'tenant',
        ])->assertOk();

        $seller = User::query()->where('email', 'seller1@markethub.test')->first();
        $this->assertNotNull($seller->last_login_at);
        $this->assertTrue(
            AuditLog::query()->where('actor_user_id', $seller->id)->where('action', 'auth.login')->exists()
        );
    }
}
