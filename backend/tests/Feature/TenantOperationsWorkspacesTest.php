<?php

namespace Tests\Feature;

use App\Models\AdBalance;
use App\Models\AdCampaign;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\Store;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Covers the three tenant console workspaces that were rebuilt:
 * /tenant/inventory, /tenant/ads and /tenant/analytics.
 */
class TenantOperationsWorkspacesTest extends TestCase
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

    protected function inventoryFor(User $seller): Inventory
    {
        return Inventory::query()
            ->withoutGlobalScopes()
            ->where('tenant_id', $seller->tenantId())
            ->firstOrFail();
    }

    // ------------------------------------------------------------ inventory

    public function test_inventory_index_returns_rows_stats_and_filters(): void
    {
        $response = $this->actingAs($this->seller(), 'sanctum')
            ->getJson('/api/tenant/inventory?per_page=5')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [['id', 'variant_id', 'quantity', 'reserved', 'available', 'state',
                    'low_stock_threshold', 'retail_value', 'variant', 'product', 'store']],
                'meta' => ['page', 'per_page', 'total', 'last_page'],
                'stats' => ['sku_count', 'units_on_hand', 'units_available', 'retail_value',
                    'cost_value', 'low_stock_count', 'out_of_stock_count', 'expiring_count'],
                'filters' => ['stores', 'locations'],
            ]);

        $this->assertGreaterThan(0, $response->json('stats.sku_count'));
    }

    public function test_inventory_is_scoped_to_the_signed_in_tenant(): void
    {
        $seller = $this->seller();
        $ids = $this->actingAs($seller, 'sanctum')
            ->getJson('/api/tenant/inventory?per_page=100')
            ->assertOk()
            ->json('data.*.id');

        $foreign = Inventory::query()
            ->withoutGlobalScopes()
            ->where('tenant_id', '!=', $seller->tenantId())
            ->pluck('id')
            ->all();

        $this->assertEmpty(array_intersect($ids, $foreign));
    }

    public function test_receiving_stock_writes_a_ledger_entry(): void
    {
        $seller = $this->seller();
        $inventory = $this->inventoryFor($seller);
        $before = (int) $inventory->quantity;

        $this->actingAs($seller, 'sanctum')
            ->postJson("/api/tenant/inventory/{$inventory->id}/adjust", [
                'type' => 'receipt',
                'quantity' => 12,
                'reference' => 'PO-77',
                'note' => 'Supplier delivery',
            ])
            ->assertOk()
            ->assertJsonPath('data.quantity', $before + 12);

        $movement = StockMovement::query()->withoutGlobalScopes()->latest('id')->first();
        $this->assertSame('receipt', $movement->type);
        $this->assertSame(12, $movement->quantity);
        $this->assertSame($before, $movement->quantity_before);
        $this->assertSame($before + 12, $movement->quantity_after);
    }

    public function test_stock_count_books_the_difference_and_damage_always_reduces(): void
    {
        $seller = $this->seller();
        $inventory = $this->inventoryFor($seller);

        $this->actingAs($seller, 'sanctum')
            ->postJson("/api/tenant/inventory/{$inventory->id}/adjust", ['type' => 'count', 'quantity' => 40])
            ->assertOk()
            ->assertJsonPath('data.quantity', 40);

        $this->actingAs($seller, 'sanctum')
            ->postJson("/api/tenant/inventory/{$inventory->id}/adjust", ['type' => 'damage', 'quantity' => 5])
            ->assertOk()
            ->assertJsonPath('data.quantity', 35);
    }

    public function test_bulk_threshold_update_affects_every_selected_line(): void
    {
        $seller = $this->seller();
        $ids = Inventory::query()->withoutGlobalScopes()
            ->where('tenant_id', $seller->tenantId())
            ->limit(2)
            ->pluck('id')
            ->all();

        $this->actingAs($seller, 'sanctum')
            ->postJson('/api/tenant/inventory/bulk', ['ids' => $ids, 'action' => 'set_threshold', 'quantity' => 17])
            ->assertOk()
            ->assertJsonPath('data.affected', count($ids));

        foreach ($ids as $id) {
            $this->assertSame(17, (int) Inventory::query()->withoutGlobalScopes()->find($id)->low_stock_threshold);
        }
    }

    // ----------------------------------------------------------------- ads

    public function test_ads_index_returns_metrics_summary_and_series(): void
    {
        $seller = $this->seller();

        $this->actingAs($seller, 'sanctum')
            ->getJson('/api/tenant/ads?days=30')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'balance',
                    'campaigns',
                    'summary' => ['campaign_count', 'active_count', 'impressions', 'clicks', 'spend', 'ctr', 'wallet_balance'],
                    'series',
                    'top_products',
                    'ledger',
                ],
            ])
            ->assertJsonCount(30, 'data.series');
    }

    public function test_campaign_can_be_created_with_products(): void
    {
        $seller = $this->seller();
        TenantContext::set($seller->tenantId());
        $store = Store::query()->firstOrFail();
        $product = Product::query()->where('store_id', $store->id)->firstOrFail();
        TenantContext::clear();

        $this->actingAs($seller, 'sanctum')
            ->postJson('/api/tenant/ads', [
                'store_id' => $store->id,
                'name' => 'Spring push',
                'daily_budget' => 10,
                'total_budget' => 100,
                'bid_cpc' => 0.3,
                'product_ids' => [$product->id],
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', AdCampaign::STATUS_DRAFT);
    }

    public function test_campaign_cannot_be_activated_without_wallet_credit(): void
    {
        $seller = $this->seller();
        AdBalance::query()->withoutGlobalScopes()->where('tenant_id', $seller->tenantId())->update(['balance' => 0]);

        TenantContext::set($seller->tenantId());
        $campaign = AdCampaign::query()->first();
        TenantContext::clear();

        if (! $campaign) {
            $this->markTestSkipped('No seeded campaign for this tenant.');
        }

        $this->actingAs($seller, 'sanctum')
            ->patchJson("/api/tenant/ads/{$campaign->id}", ['status' => 'active'])
            ->assertStatus(422);
    }

    public function test_funding_the_wallet_increases_the_balance(): void
    {
        $seller = $this->seller();

        $this->actingAs($seller, 'sanctum')
            ->postJson('/api/tenant/ads/fund', ['amount' => 40])
            ->assertOk();

        $balance = AdBalance::query()->withoutGlobalScopes()->where('tenant_id', $seller->tenantId())->firstOrFail();
        $this->assertGreaterThanOrEqual(40, (float) $balance->balance);
    }

    // ----------------------------------------------------------- analytics

    public function test_analytics_report_exposes_kpis_with_comparisons(): void
    {
        $payload = $this->actingAs($this->seller(), 'sanctum')
            ->getJson('/api/tenant/analytics?days=14')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'range' => ['days', 'start', 'end', 'previous_start', 'previous_end'],
                    'kpis' => ['gmv' => ['value', 'previous', 'delta_percent', 'direction']],
                    'series',
                    'funnel' => ['steps', 'cart_abandonment'],
                    'status_mix',
                    'top_products',
                    'stores',
                    'customers' => ['buyers', 'repeat_buyers', 'repeat_rate', 'revenue_per_buyer'],
                    'ads' => ['impressions', 'clicks', 'spend', 'ctr'],
                    'highlights',
                    'lifetime',
                ],
            ])
            ->json('data');

        $this->assertSame(14, $payload['range']['days']);
        $this->assertCount(14, $payload['series']);
    }
}
