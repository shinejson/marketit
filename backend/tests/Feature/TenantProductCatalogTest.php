<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Store;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantProductCatalogTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        TenantContext::clear();
    }

    protected function seller(string $email = 'seller1@markethub.test'): User
    {
        return User::query()->where('email', $email)->firstOrFail();
    }

    protected function storeFor(User $seller): Store
    {
        return Store::query()->withoutGlobalScopes()->where('tenant_id', $seller->tenantId())->firstOrFail();
    }

    public function test_index_returns_catalog_stats_and_enriched_products(): void
    {
        $seller = $this->seller();

        $response = $this->actingAs($seller, 'sanctum')
            ->getJson('/api/tenant/products?per_page=5')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [['id', 'name', 'status', 'price', 'catalog_preset', 'product_type', 'unit',
                    'available_stock', 'stock_state', 'variants', 'images', 'store']],
                'meta' => ['page', 'per_page', 'total', 'last_page'],
                'stats' => ['total_count', 'active_count', 'draft_count', 'archived_count',
                    'low_stock_count', 'out_of_stock_count', 'total_units', 'retail_value',
                    'inventory_cost', 'featured_count'],
            ]);

        $expected = Product::query()->withoutGlobalScopes()->where('tenant_id', $seller->tenantId())->count();
        $this->assertSame($expected, $response->json('stats.total_count'));
        $this->assertGreaterThan(0, $response->json('stats.total_units'));
    }

    public function test_meta_endpoint_exposes_presets_for_every_vertical(): void
    {
        $presets = $this->actingAs($this->seller(), 'sanctum')
            ->getJson('/api/tenant/products/meta')
            ->assertOk()
            ->json('data.presets');

        $keys = array_column($presets, 'key');
        foreach (['fashion', 'grocery', 'electronics', 'digital', 'service', 'general'] as $expected) {
            $this->assertContains($expected, $keys);
        }

        $fashion = collect($presets)->firstWhere('key', 'fashion');
        $this->assertSame('Size', $fashion['options'][0]['name']);
        $this->assertNotEmpty($fashion['specs']);
    }

    public function test_creating_an_apparel_product_builds_the_variant_matrix(): void
    {
        $seller = $this->seller('seller2@markethub.test');
        $store = $this->storeFor($seller);

        $payload = [
            'store_id' => $store->id,
            'name' => 'Linen Summer Dress',
            'catalog_preset' => 'fashion',
            'status' => 'active',
            'price' => 120,
            'cost_price' => 54,
            'specs' => ['material' => 'Linen', 'fit' => 'Relaxed', 'gender' => 'Women'],
            'tags' => ['new-in'],
            'option_schema' => [['name' => 'Size', 'values' => ['S', 'M']], ['name' => 'Colour', 'values' => ['Sand']]],
            'variants' => [
                ['options' => ['Size' => 'S', 'Colour' => 'Sand'], 'quantity' => 5],
                ['options' => ['Size' => 'M', 'Colour' => 'Sand'], 'quantity' => 7, 'price_override' => 125],
            ],
        ];

        $data = $this->actingAs($seller, 'sanctum')
            ->postJson('/api/tenant/products', $payload)
            ->assertCreated()
            ->json('data');

        $this->assertTrue($data['has_variants']);
        $this->assertCount(2, $data['variants']);
        $this->assertSame(12, $data['available_stock']);
        $this->assertSame('in_stock', $data['stock_state']);
        $this->assertSame('S / Sand', $data['variants'][0]['name']);
        $this->assertSame('Linen', $data['specs']['material']);
        $this->assertTrue((bool) $data['requires_shipping']);
        $this->assertNotNull($data['published_at']);
    }

    public function test_grocery_products_keep_perishable_defaults_and_sell_by_weight(): void
    {
        $seller = $this->seller('seller2@markethub.test');
        $store = $this->storeFor($seller);

        $data = $this->actingAs($seller, 'sanctum')
            ->postJson('/api/tenant/products', [
                'store_id' => $store->id,
                'name' => 'Sweet Watermelon',
                'catalog_preset' => 'grocery',
                'price' => 2.75,
                'quantity' => 40,
            ])
            ->assertCreated()
            ->json('data');

        $this->assertSame('kg', $data['unit']);
        $this->assertTrue((bool) $data['is_perishable']);
        $this->assertSame(7, $data['shelf_life_days']);
        $this->assertSame('chilled', $data['storage_requirement']);
        $this->assertSame(40, $data['available_stock']);
    }

    public function test_service_products_skip_shipping_and_stock_tracking(): void
    {
        $seller = $this->seller();
        $store = $this->storeFor($seller);

        $data = $this->actingAs($seller, 'sanctum')
            ->postJson('/api/tenant/products', [
                'store_id' => $store->id,
                'name' => 'On-site Device Repair',
                'catalog_preset' => 'service',
                'price' => 60,
            ])
            ->assertCreated()
            ->json('data');

        $this->assertSame('service', $data['product_type']);
        $this->assertFalse((bool) $data['requires_shipping']);
        $this->assertFalse((bool) $data['track_inventory']);
        $this->assertSame('untracked', $data['stock_state']);
    }

    public function test_search_and_stock_filters_narrow_the_catalog(): void
    {
        $seller = $this->seller();

        $byName = $this->actingAs($seller, 'sanctum')
            ->getJson('/api/tenant/products?q=Pulse')
            ->assertOk()
            ->json('data');
        $this->assertNotEmpty($byName);
        $this->assertStringContainsString('Pulse', $byName[0]['name']);

        // SKU search hits the variant table.
        $sku = ProductVariant::query()->withoutGlobalScopes()
            ->where('tenant_id', $seller->tenantId())->value('sku');
        $bySku = $this->actingAs($seller, 'sanctum')
            ->getJson('/api/tenant/products?q='.$sku)
            ->assertOk()
            ->json('data');
        $this->assertNotEmpty($bySku);

        $lowStock = $this->actingAs($seller, 'sanctum')
            ->getJson('/api/tenant/products?stock=low_stock')
            ->assertOk()
            ->json('data');
        foreach ($lowStock as $row) {
            $this->assertSame('low_stock', $row['stock_state']);
        }
    }

    public function test_updating_a_product_syncs_variant_inventory(): void
    {
        $seller = $this->seller();
        $product = Product::query()->withoutGlobalScopes()
            ->with('variants')
            ->where('tenant_id', $seller->tenantId())
            ->where('slug', 'nimbus-bluetooth-speaker')
            ->firstOrFail();

        $data = $this->actingAs($seller, 'sanctum')
            ->patchJson('/api/tenant/products/'.$product->id, [
                'price' => 65,
                'variants' => [[
                    'id' => $product->variants->first()->id,
                    'options' => ['Colour' => 'Slate'],
                    'quantity' => 2,
                ]],
            ])
            ->assertOk()
            ->json('data');

        $this->assertSame('65.00', (string) $data['price']);
        $this->assertSame(2, $data['available_stock']);
        $this->assertSame('low_stock', $data['stock_state']);
        $this->assertSame('Slate', $data['variants'][0]['options']['Colour']);
    }

    public function test_duplicate_creates_an_independent_draft_copy(): void
    {
        $seller = $this->seller();
        $product = Product::query()->withoutGlobalScopes()
            ->where('tenant_id', $seller->tenantId())->firstOrFail();

        $copy = $this->actingAs($seller, 'sanctum')
            ->postJson('/api/tenant/products/'.$product->id.'/duplicate')
            ->assertCreated()
            ->json('data');

        $this->assertNotSame($product->id, $copy['id']);
        $this->assertSame('draft', $copy['status']);
        $this->assertNotSame($product->slug, $copy['slug']);
        $this->assertNotEmpty($copy['variants']);
        $this->assertNotSame(
            $product->variants()->withoutGlobalScopes()->first()->sku,
            $copy['variants'][0]['sku']
        );
    }

    public function test_bulk_actions_apply_to_the_selection_only(): void
    {
        $seller = $this->seller();
        $ids = Product::query()->withoutGlobalScopes()
            ->where('tenant_id', $seller->tenantId())
            ->pluck('id')->take(2)->all();

        $this->actingAs($seller, 'sanctum')
            ->postJson('/api/tenant/products/bulk', ['ids' => $ids, 'action' => 'archive'])
            ->assertOk()
            ->assertJsonPath('data.affected', 2);

        foreach ($ids as $id) {
            $this->assertSame('archived', Product::query()->withoutGlobalScopes()->find($id)->status);
        }

        $this->actingAs($seller, 'sanctum')
            ->postJson('/api/tenant/products/bulk', ['ids' => $ids, 'action' => 'price_adjust', 'percent' => 10])
            ->assertOk();
    }

    public function test_products_with_order_history_are_archived_instead_of_deleted(): void
    {
        $seller = $this->seller();
        $soldVariantIds = DB::table('order_items')->pluck('variant_id')->all();
        $sold = Product::query()->withoutGlobalScopes()
            ->where('tenant_id', $seller->tenantId())
            ->whereHas('variants', fn ($q) => $q->whereIn('product_variants.id', $soldVariantIds))
            ->first();

        if (! $sold) {
            $this->markTestSkipped('Seed data has no sold products.');
        }

        $this->actingAs($seller, 'sanctum')
            ->deleteJson('/api/tenant/products/'.$sold->id)
            ->assertOk()
            ->assertJsonPath('data.archived', true);

        $this->assertSame('archived', $sold->fresh()->status);
    }

    public function test_a_tenant_cannot_touch_another_tenants_product(): void
    {
        $seller = $this->seller();
        $other = Product::query()->withoutGlobalScopes()
            ->where('tenant_id', '!=', $seller->tenantId())
            ->firstOrFail();

        $this->actingAs($seller, 'sanctum')
            ->patchJson('/api/tenant/products/'.$other->id, ['price' => 1])
            ->assertNotFound();

        $this->actingAs($seller, 'sanctum')
            ->getJson('/api/tenant/products')
            ->assertOk()
            ->assertJsonMissing(['id' => $other->id]);
    }

    public function test_store_id_must_belong_to_the_signed_in_tenant(): void
    {
        $seller = $this->seller();
        $foreignStore = Store::query()->withoutGlobalScopes()
            ->where('tenant_id', '!=', $seller->tenantId())
            ->firstOrFail();

        $this->actingAs($seller, 'sanctum')
            ->postJson('/api/tenant/products', [
                'store_id' => $foreignStore->id,
                'name' => 'Sneaky listing',
                'price' => 10,
            ])
            ->assertStatus(422);
    }
}
