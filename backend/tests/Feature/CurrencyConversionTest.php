<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Store;
use App\Models\TenantSetting;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CurrencyConversionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        TenantContext::clear();
    }

    public function test_currency_catalog_is_public(): void
    {
        $data = $this->getJson('/api/currency')->assertOk()->json('data');

        $this->assertSame('USD', $data['base']);
        $this->assertContains('GHS', array_column($data['currencies'], 'code'));
    }

    public function test_preview_reports_the_factor_without_touching_prices(): void
    {
        $seller = User::query()->where('email', 'seller1@markethub.test')->first();
        $product = Product::query()->where('tenant_id', $seller->tenantId())->firstOrFail();
        $before = (float) $product->price;

        $preview = $this->actingAs($seller, 'sanctum')
            ->postJson('/api/tenant/currency/preview', ['to' => 'GHS'])
            ->assertOk()
            ->json('data');

        $this->assertSame('GHS', $preview['to']);
        $this->assertGreaterThan(1, $preview['factor']);
        $this->assertSame($before, (float) $product->fresh()->price, 'Preview must not write anything.');
    }

    public function test_changing_the_workspace_currency_reprices_the_catalog(): void
    {
        $seller = User::query()->where('email', 'seller1@markethub.test')->first();
        $tenantId = $seller->tenantId();
        $product = Product::query()->where('tenant_id', $tenantId)->firstOrFail();
        $before = (float) $product->price;

        $response = $this->actingAs($seller, 'sanctum')
            ->patchJson('/api/tenant/settings', ['currency' => 'GHS'])
            ->assertOk()
            ->json('data');

        $factor = $response['conversion']['factor'];
        $this->assertSame('GHS', $response['settings']['currency']);
        $this->assertSame('GH₵', $response['settings']['currency_symbol']);
        $this->assertGreaterThan(0, $response['conversion']['rows']);

        $this->assertEqualsWithDelta($before * $factor, (float) $product->fresh()->price, 0.02);
        $this->assertSame('GHS', Store::query()->where('tenant_id', $tenantId)->first()->currency);
        $this->assertSame('GHS', TenantSetting::query()->where('tenant_id', $tenantId)->first()->currency);
    }

    public function test_conversion_can_be_declined(): void
    {
        $seller = User::query()->where('email', 'seller1@markethub.test')->first();
        $product = Product::query()->where('tenant_id', $seller->tenantId())->firstOrFail();
        $before = (float) $product->price;

        $data = $this->actingAs($seller, 'sanctum')
            ->patchJson('/api/tenant/settings', ['currency' => 'NGN', 'convert_existing_prices' => false])
            ->assertOk()
            ->json('data');

        $this->assertNull($data['conversion']);
        $this->assertSame('NGN', $data['settings']['currency']);
        $this->assertSame($before, (float) $product->fresh()->price);
    }

    public function test_unsupported_currency_is_rejected(): void
    {
        $seller = User::query()->where('email', 'seller1@markethub.test')->first();

        $this->actingAs($seller, 'sanctum')
            ->patchJson('/api/tenant/settings', ['currency' => 'ZZZ'])
            ->assertStatus(422);
    }

    public function test_ad_hoc_conversion_endpoint(): void
    {
        $data = $this->getJson('/api/currency/convert?amount=100&from=USD&to=GHS')
            ->assertOk()
            ->json('data');

        $this->assertSame(100.0, $data['amount']);
        $this->assertEqualsWithDelta(100 * $data['rate'], $data['value'], 0.01);
    }
}
