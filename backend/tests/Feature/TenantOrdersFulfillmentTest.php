<?php

namespace Tests\Feature;

use App\Models\SellerOrder;
use App\Models\Store;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantOrdersFulfillmentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        TenantContext::clear();
    }

    /** Scope raw Eloquent assertions to the seller's own tenant, bypassing the ambient request-scoped global scope. */
    protected function tenantOrders(User $seller)
    {
        return SellerOrder::query()->withoutGlobalScopes()->where('tenant_id', $seller->tenantId());
    }

    public function test_orders_index_returns_fulfillment_stats_and_paginated_orders(): void
    {
        $seller = User::query()->where('email', 'seller1@markethub.test')->firstOrFail();

        $response = $this->actingAs($seller, 'sanctum')
            ->getJson('/api/tenant/orders?per_page=5')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [['id', 'order_id', 'status', 'subtotal', 'net_settlement', 'items', 'store', 'order', 'settlement']],
                'meta' => ['page', 'per_page', 'total', 'last_page'],
                'stats' => [
                    'total_count',
                    'awaiting_fulfillment_count',
                    'processing_count',
                    'shipped_count',
                    'delivered_count',
                    'completed_count',
                    'cancelled_count',
                    'total_net_payout',
                ],
            ]);

        $stats = $response->json('stats');
        $expectedTotal = $this->tenantOrders($seller)->count();
        $this->assertGreaterThan(0, $expectedTotal);
        $this->assertSame($expectedTotal, $stats['total_count']);
        $this->assertLessThanOrEqual(5, count($response->json('data')));

        // Every nested order carries the shipping address and the master order reference.
        $first = $response->json('data.0');
        $this->assertArrayHasKey('shipping_address', $first['order']);
        $this->assertArrayHasKey('user', $first['order']);
    }

    public function test_orders_index_filters_by_status_search_store_and_sorts(): void
    {
        $seller = User::query()->where('email', 'seller1@markethub.test')->firstOrFail();

        // Status filter: every row must match.
        $byStatus = $this->actingAs($seller, 'sanctum')
            ->getJson('/api/tenant/orders?status=awaiting_fulfillment&per_page=50')
            ->assertOk()
            ->json('data');
        $this->assertNotEmpty($byStatus);
        foreach ($byStatus as $row) {
            $this->assertSame('awaiting_fulfillment', $row['status']);
        }

        // Search by customer email should surface seeded orders for that shopper.
        $bySearch = $this->actingAs($seller, 'sanctum')
            ->getJson('/api/tenant/orders?q=customer@markethub.test&per_page=50')
            ->assertOk()
            ->json('data');
        $this->assertNotEmpty($bySearch);

        // Store filter: only orders for that store should return.
        $store = Store::withoutGlobalScopes()->where('slug', 'northstar')->firstOrFail();
        $byStore = $this->actingAs($seller, 'sanctum')
            ->getJson("/api/tenant/orders?store_id={$store->id}&per_page=50")
            ->assertOk()
            ->json('data');
        $this->assertNotEmpty($byStore);
        foreach ($byStore as $row) {
            $this->assertSame($store->id, $row['store_id']);
        }

        // Sorting by net settlement ascending.
        $sorted = $this->actingAs($seller, 'sanctum')
            ->getJson('/api/tenant/orders?sort_by=net_settlement&sort_dir=asc&per_page=50')
            ->assertOk()
            ->json('data');
        $values = array_map(fn ($row) => (float) $row['net_settlement'], $sorted);
        $sortedValues = $values;
        sort($sortedValues);
        $this->assertSame($sortedValues, $values);
    }

    public function test_orders_show_returns_full_relations(): void
    {
        $seller = User::query()->where('email', 'seller1@markethub.test')->firstOrFail();
        $order = $this->tenantOrders($seller)->firstOrFail();

        $this->actingAs($seller, 'sanctum')
            ->getJson("/api/tenant/orders/{$order->id}")
            ->assertOk()
            ->assertJsonStructure([
                'data' => ['id', 'items', 'store', 'order' => ['user', 'shipping_address'], 'settlement'],
            ]);
    }

    public function test_tenant_can_transition_an_order_through_fulfillment(): void
    {
        $seller = User::query()->where('email', 'seller1@markethub.test')->firstOrFail();
        $order = $this->tenantOrders($seller)->where('status', SellerOrder::STATUS_AWAITING_FULFILLMENT)->firstOrFail();

        $this->actingAs($seller, 'sanctum')
            ->patchJson("/api/tenant/orders/{$order->id}/status", ['status' => 'processing'])
            ->assertOk()
            ->assertJsonPath('data.status', 'processing');

        $this->assertDatabaseHas('seller_orders', ['id' => $order->id, 'status' => 'processing']);

        // Illegal transition (skips shipped) is rejected.
        $this->actingAs($seller, 'sanctum')
            ->patchJson("/api/tenant/orders/{$order->id}/status", ['status' => 'delivered'])
            ->assertStatus(422);
    }

    public function test_orders_workspace_is_restricted_to_non_tenant_users(): void
    {
        $customer = User::query()->where('email', 'customer@markethub.test')->firstOrFail();

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/tenant/orders')
            ->assertForbidden();
    }

    public function test_tenant_cannot_view_or_update_another_tenants_order(): void
    {
        $seller1 = User::query()->where('email', 'seller1@markethub.test')->firstOrFail();
        $seller2 = User::query()->where('email', 'seller2@markethub.test')->firstOrFail();
        $foreignOrder = $this->tenantOrders($seller2)->firstOrFail();

        // The tenant global scope keeps another tenant's order invisible to route-model
        // binding entirely, so it resolves as "not found" rather than merely forbidden.
        $this->actingAs($seller1, 'sanctum')
            ->getJson("/api/tenant/orders/{$foreignOrder->id}")
            ->assertNotFound();

        $this->actingAs($seller1, 'sanctum')
            ->patchJson("/api/tenant/orders/{$foreignOrder->id}/status", ['status' => 'processing'])
            ->assertNotFound();
    }
}
