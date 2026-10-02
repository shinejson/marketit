<?php

namespace Tests\Feature;

use App\Models\PlatformBackup;
use App\Models\PlatformSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PlatformSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    protected function admin(): User
    {
        return User::query()->where('email', 'admin@markethub.test')->firstOrFail();
    }

    public function test_settings_index_exposes_every_group_with_presentation_metadata(): void
    {
        $response = $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/admin/settings')
            ->assertOk();

        foreach (['general', 'owner', 'branding', 'billing', 'payments', 'email', 'sms', 'security', 'backup'] as $group) {
            $this->assertNotEmpty($response->json("data.$group"), "Group $group should expose fields.");
        }

        $this->assertSame('Owner & company', collect($response->json('meta.groups'))->firstWhere('key', 'owner')['label']);
        $this->assertContains('brand_favicon', $response->json('meta.assets'));
    }

    public function test_owner_and_sms_settings_are_saved_and_secrets_are_write_only(): void
    {
        $this->actingAs($this->admin(), 'sanctum')
            ->putJson('/api/admin/settings', [
                'settings' => [
                    ['key' => 'owner_name', 'value' => 'Ama Serwaa Mensah'],
                    ['key' => 'owner_email', 'value' => 'ama@markethub.test'],
                    ['key' => 'sms_provider', 'value' => 'twilio'],
                    ['key' => 'sms_api_key', 'value' => 'super-secret-key'],
                ],
            ])
            ->assertOk();

        $owner = collect($this->getSettings('owner'))->firstWhere('key', 'owner_name');
        $this->assertSame('Ama Serwaa Mensah', $owner['value']);

        $secret = collect($this->getSettings('sms'))->firstWhere('key', 'sms_api_key');
        $this->assertSame('', $secret['value'], 'Secrets must never be returned to the client.');
        $this->assertTrue($secret['has_value']);

        $this->assertNotSame('super-secret-key', PlatformSetting::query()->where('key', 'sms_api_key')->value('value'));
        $this->assertSame('super-secret-key', PlatformSetting::get('sms_api_key'));
    }

    public function test_blank_secret_keeps_the_stored_value_and_the_sentinel_clears_it(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin, 'sanctum')
            ->putJson('/api/admin/settings', ['settings' => [['key' => 'mail_password', 'value' => 'relay-password']]])
            ->assertOk();

        $this->actingAs($admin, 'sanctum')
            ->putJson('/api/admin/settings', ['settings' => [['key' => 'mail_password', 'value' => '']]])
            ->assertOk();
        $this->assertSame('relay-password', PlatformSetting::get('mail_password'));

        $this->actingAs($admin, 'sanctum')
            ->putJson('/api/admin/settings', ['settings' => [['key' => 'mail_password', 'value' => '__clear__']]])
            ->assertOk();
        $this->assertDatabaseMissing('platform_settings', ['key' => 'mail_password']);
    }

    public function test_payment_configuration_exposes_safe_methods_without_credentials(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin, 'sanctum')
            ->putJson('/api/admin/settings', [
                'settings' => [
                    ['key' => 'payment_provider', 'value' => 'paystack'],
                    ['key' => 'payment_methods_card', 'value' => true],
                    ['key' => 'payment_methods_mobile_money', 'value' => true],
                ],
            ])
            ->assertOk();

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/settings/payment-status')
            ->assertOk()
            ->assertJsonPath('data.provider', 'paystack')
            ->assertJsonPath('data.provider_configured', false);

        $this->getJson('/api/payments/methods')
            ->assertOk()
            ->assertJsonPath('data.methods', []);
    }

    public function test_invalid_values_are_rejected_per_field_type(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin, 'sanctum')
            ->putJson('/api/admin/settings', ['settings' => [['key' => 'owner_email', 'value' => 'not-an-email']]])
            ->assertStatus(422);

        $this->actingAs($admin, 'sanctum')
            ->putJson('/api/admin/settings', ['settings' => [['key' => 'brand_primary_color', 'value' => 'tangerine']]])
            ->assertStatus(422);

        $this->actingAs($admin, 'sanctum')
            ->putJson('/api/admin/settings', ['settings' => [['key' => 'backup_frequency', 'value' => 'fortnightly']]])
            ->assertStatus(422);
    }

    public function test_branding_assets_can_be_uploaded_and_removed(): void
    {
        Storage::fake('public');
        $admin = $this->admin();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/settings/assets/brand_logo', [
                'file' => UploadedFile::fake()->image('logo.png', 240, 60),
            ])
            ->assertOk()
            ->assertJsonPath('meta.asset', 'brand_logo');

        $logo = collect($this->getSettings('branding'))->firstWhere('key', 'brand_logo');
        $this->assertStringStartsWith('/storage/platform/branding/', $logo['value']);
        Storage::disk('public')->assertExists(str_replace('/storage/', '', $logo['value']));

        $this->actingAs($admin, 'sanctum')
            ->deleteJson('/api/admin/settings/assets/brand_logo')
            ->assertOk();

        $this->assertNull(collect($this->getSettings('branding'))->firstWhere('key', 'brand_logo')['value']);
    }

    public function test_resetting_a_group_restores_schema_defaults(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin, 'sanctum')
            ->putJson('/api/admin/settings', ['settings' => [['key' => 'platform_name', 'value' => 'Renamed Hub']]])
            ->assertOk();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/settings/reset', ['group' => 'general'])
            ->assertOk();

        $this->assertSame('MarketHub', collect($this->getSettings('general'))->firstWhere('key', 'platform_name')['value']);
    }

    public function test_sms_test_endpoint_reports_when_sms_is_disabled(): void
    {
        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/admin/settings/sms/test', ['to' => '+233201184420'])
            ->assertStatus(422)
            ->assertJsonPath('data.ok', false);
    }

    public function test_email_test_endpoint_sends_through_the_configured_transport(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin, 'sanctum')
            ->putJson('/api/admin/settings', ['settings' => [['key' => 'mail_driver', 'value' => 'log']]])
            ->assertOk();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/settings/email/test', ['to' => 'ops@markethub.test'])
            ->assertOk()
            ->assertJsonPath('data.ok', true);
    }

    public function test_a_settings_snapshot_can_be_created_downloaded_and_restored(): void
    {
        Storage::fake('local');
        $admin = $this->admin();

        $this->actingAs($admin, 'sanctum')
            ->putJson('/api/admin/settings', ['settings' => [['key' => 'platform_name', 'value' => 'Snapshot Hub']]])
            ->assertOk();

        $backup = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/backups', ['scope' => 'settings', 'note' => 'before release'])
            ->assertCreated()
            ->assertJsonPath('data.scope', 'settings')
            ->json('data');

        $this->assertGreaterThan(0, $backup['size_bytes']);
        Storage::disk('local')->assertExists('platform-backups/'.$backup['filename']);

        $this->actingAs($admin, 'sanctum')
            ->get('/api/admin/backups/'.$backup['id'].'/download')
            ->assertOk();

        // Change the value, then roll it back from the snapshot.
        $this->actingAs($admin, 'sanctum')
            ->putJson('/api/admin/settings', ['settings' => [['key' => 'platform_name', 'value' => 'Oops Hub']]])
            ->assertOk();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/backups/'.$backup['id'].'/restore')
            ->assertOk()
            ->assertJsonPath('data.ok', true);

        $this->assertSame('Snapshot Hub', collect($this->getSettings('general'))->firstWhere('key', 'platform_name')['value']);

        $this->actingAs($admin, 'sanctum')
            ->deleteJson('/api/admin/backups/'.$backup['id'])
            ->assertOk();
        $this->assertSame(0, PlatformBackup::query()->count());
    }

    public function test_non_admins_cannot_read_or_change_platform_settings(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')->getJson('/api/admin/settings')->assertForbidden();
        $this->actingAs($user, 'sanctum')->getJson('/api/admin/backups')->assertForbidden();
    }

    /** @return array<int, array<string, mixed>> */
    protected function getSettings(string $group): array
    {
        return $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/admin/settings')
            ->assertOk()
            ->json("data.$group");
    }
}
