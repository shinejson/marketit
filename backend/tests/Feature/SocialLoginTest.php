<?php

namespace Tests\Feature;

use App\Models\SocialIdentity;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Customer social login: provider discovery, the state-protected callback and
 * account linking. The demo driver stands in for a real OAuth app, which is
 * also what non-production environments use.
 */
class SocialLoginTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('services.social.demo', true);
        config()->set('services.google.client_id', null);
        config()->set('services.google.client_secret', null);
    }

    protected function startFlow(string $provider = 'google'): array
    {
        return $this->postJson("/api/auth/social/{$provider}/redirect", [
            'redirect_uri' => 'http://localhost:4201/auth/callback/'.$provider,
        ])->assertOk()->json('data');
    }

    public function test_provider_catalog_lists_enabled_providers(): void
    {
        $providers = $this->getJson('/api/auth/social/providers')
            ->assertOk()
            ->assertJsonStructure(['data' => [['key', 'label', 'mode']]])
            ->json('data');

        $this->assertContains('google', collect($providers)->pluck('key')->all());
    }

    public function test_redirect_returns_a_single_use_state(): void
    {
        $flow = $this->startFlow();

        $this->assertSame('demo', $flow['mode']);
        $this->assertNotEmpty($flow['state']);
        $this->assertStringContainsString('state='.$flow['state'], $flow['url']);
    }

    public function test_callback_creates_a_customer_and_links_the_identity(): void
    {
        $flow = $this->startFlow();

        $response = $this->postJson('/api/auth/social/google/callback', [
            'code' => 'demo.google.abc123',
            'state' => $flow['state'],
        ])->assertCreated();

        $this->assertNotEmpty($response->json('data.token'));
        $this->assertSame('customer', $response->json('data.user.role'));

        $user = User::query()->where('email', 'google.customer@markethub.test')->firstOrFail();
        $this->assertTrue($user->hasRole('customer'));
        $this->assertDatabaseHas('social_identities', ['user_id' => $user->id, 'provider' => 'google']);
    }

    public function test_second_sign_in_reuses_the_same_account(): void
    {
        $first = $this->startFlow();
        $this->postJson('/api/auth/social/google/callback', ['code' => 'demo.google.a', 'state' => $first['state']])
            ->assertCreated();

        $second = $this->startFlow();
        $this->postJson('/api/auth/social/google/callback', ['code' => 'demo.google.b', 'state' => $second['state']])
            ->assertOk();

        $this->assertSame(1, User::query()->where('email', 'google.customer@markethub.test')->count());
        $this->assertSame(1, SocialIdentity::query()->where('provider', 'google')->count());
    }

    public function test_an_existing_account_with_the_same_email_is_linked_not_duplicated(): void
    {
        $existing = User::query()->create([
            'name' => 'Existing Shopper',
            'email' => 'google.customer@markethub.test',
            'password' => 'password',
        ]);
        UserRole::query()->create(['user_id' => $existing->id, 'role' => 'customer']);

        $flow = $this->startFlow();
        $this->postJson('/api/auth/social/google/callback', ['code' => 'demo.google.c', 'state' => $flow['state']])
            ->assertOk();

        $this->assertSame(1, User::query()->where('email', 'google.customer@markethub.test')->count());
        $this->assertDatabaseHas('social_identities', ['user_id' => $existing->id, 'provider' => 'google']);
    }

    public function test_callback_rejects_a_missing_or_reused_state(): void
    {
        $this->postJson('/api/auth/social/google/callback', ['code' => 'demo.google.x', 'state' => 'not-a-state'])
            ->assertStatus(422);

        $flow = $this->startFlow();
        $this->postJson('/api/auth/social/google/callback', ['code' => 'demo.google.y', 'state' => $flow['state']])
            ->assertCreated();

        // The state is pulled from the cache on first use.
        $this->postJson('/api/auth/social/google/callback', ['code' => 'demo.google.y', 'state' => $flow['state']])
            ->assertStatus(422);
    }

    public function test_unknown_provider_is_a_404_and_disabled_provider_is_rejected(): void
    {
        $this->postJson('/api/auth/social/myspace/redirect', ['redirect_uri' => 'http://localhost:4201/auth/callback/myspace'])
            ->assertNotFound();

        config()->set('services.github.enabled', false);
        $this->postJson('/api/auth/social/github/redirect', ['redirect_uri' => 'http://localhost:4201/auth/callback/github'])
            ->assertStatus(422);
    }

    public function test_suspended_accounts_cannot_sign_in_socially(): void
    {
        $user = User::query()->create([
            'name' => 'Blocked Shopper',
            'email' => 'google.customer@markethub.test',
            'password' => 'password',
            'status' => 'suspended',
        ]);
        UserRole::query()->create(['user_id' => $user->id, 'role' => 'customer']);

        $flow = $this->startFlow();
        $this->postJson('/api/auth/social/google/callback', ['code' => 'demo.google.z', 'state' => $flow['state']])
            ->assertStatus(422);
    }

    public function test_demo_mode_is_unavailable_when_credentials_exist(): void
    {
        config()->set('services.google.client_id', 'client-id');
        config()->set('services.google.client_secret', 'secret');

        $flow = $this->startFlow();

        $this->assertSame('oauth', $flow['mode']);
        $this->assertStringStartsWith('https://accounts.google.com/o/oauth2/v2/auth', $flow['url']);
    }

    public function test_a_customer_can_list_and_unlink_providers(): void
    {
        $flow = $this->startFlow();
        $this->postJson('/api/auth/social/google/callback', ['code' => 'demo.google.q', 'state' => $flow['state']])
            ->assertCreated();

        $user = User::query()->where('email', 'google.customer@markethub.test')->firstOrFail();
        $identity = SocialIdentity::query()->where('user_id', $user->id)->firstOrFail();

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/auth/social/identities')
            ->assertOk()
            ->assertJsonPath('data.0.provider', 'google');

        $this->actingAs($user, 'sanctum')
            ->deleteJson("/api/auth/social/identities/{$identity->id}")
            ->assertOk();

        $this->assertDatabaseMissing('social_identities', ['id' => $identity->id]);
    }
}
