<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\PayoutBatch;
use App\Models\Plan;
use App\Models\PlatformCategory;
use App\Models\Product;
use App\Models\Review;
use App\Models\SellerOrder;
use App\Models\SellerSettlement;
use App\Models\Store;
use App\Models\Subscription;
use App\Models\SupportTicket;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Super Admin Report Center: Generates platform-wide enterprise reports,
 * multi-tenant rollups, SaaS metrics, commission realization, catalog compliance,
 * audit trails, and PDF/CSV export datasets.
 */
class AdminReportController extends Controller
{
    /** Catalog of all available super admin platform report types grouped by category. */
    public function catalog(): JsonResponse
    {
        return response()->json([
            'data' => [
                'categories' => $this->reportCategories(),
            ],
        ]);
    }

    /** Generates the requested platform report dataset with executive KPIs, columns, and data rows. */
    public function generate(Request $request): JsonResponse
    {
        TenantContext::bypass(true);

        $reportKey = $request->string('report', 'platform_sales_summary')->toString();
        $startDate = $request->filled('start_date') ? Carbon::parse($request->input('start_date'))->startOfDay() : now()->subDays(29)->startOfDay();
        $endDate = $request->filled('end_date') ? Carbon::parse($request->input('end_date'))->endOfDay() : now()->endOfDay();
        $tenantId = $request->filled('tenant_id') && is_numeric($request->input('tenant_id')) ? (int) $request->input('tenant_id') : null;
        $status = $request->string('status')->trim()->toString();
        $categoryId = $request->filled('category_id') && is_numeric($request->input('category_id')) ? (int) $request->input('category_id') : null;
        $amountMin = $request->filled('amount_min') ? (float) $request->input('amount_min') : null;
        $amountMax = $request->filled('amount_max') ? (float) $request->input('amount_max') : null;

        $scopeName = 'All Tenants (Platform-Wide)';
        if ($tenantId) {
            $t = Tenant::query()->find($tenantId);
            if ($t) {
                $scopeName = $t->name;
            }
        }

        $reportMeta = $this->findReportMeta($reportKey);
        $generatorMethod = 'generate' . str_replace(' ', '', ucwords(str_replace('_', ' ', $reportKey)));

        if (method_exists($this, $generatorMethod)) {
            $result = $this->$generatorMethod($startDate, $endDate, $tenantId, $status, $categoryId, $amountMin, $amountMax, $request);
        } else {
            $result = $this->generatePlatformSalesSummary($startDate, $endDate, $tenantId, $status, $categoryId, $amountMin, $amountMax, $request);
        }

        return response()->json([
            'data' => array_merge([
                'report_key' => $reportMeta['key'],
                'report_name' => $reportMeta['label'],
                'category' => $reportMeta['category'],
                'generated_at' => now()->toIso8601String(),
                'scope_name' => $scopeName,
                'currency' => 'USD',
                'range' => [
                    'start' => $startDate->toDateString(),
                    'end' => $endDate->toDateString(),
                    'days' => $startDate->diffInDays($endDate) + 1,
                ],
                'help' => $this->reportHelpGuide($reportMeta['key']),
            ], $result),
        ]);
    }

    // --------------------------------------------------------------------------
    // 1. Platform Sales & Orders Reports
    // --------------------------------------------------------------------------

    protected function generatePlatformSalesSummary(Carbon $start, Carbon $end, ?int $tenantId, string $status, ?int $categoryId, ?float $min, ?float $max, Request $request): array
    {
        $query = SellerOrder::withoutGlobalScopes()
            ->whereBetween('created_at', [$start, $end])
            ->when($tenantId, fn ($q) => $q->where('tenant_id', $tenantId))
            ->when($status, fn ($q) => $q->where('status', $status));

        if ($min !== null) $query->where('subtotal', '>=', $min);
        if ($max !== null) $query->where('subtotal', '<=', $max);

        $orders = $query->with(['tenant:id,name', 'store:id,name'])->get();

        $rows = [];
        $dayGroups = $orders->groupBy(fn ($o) => $o->created_at->toDateString());

        $curr = $start->copy();
        while ($curr->lte($end)) {
            $dateStr = $curr->toDateString();
            $dayOrders = $dayGroups->get($dateStr, collect());
            $ordersCount = $dayOrders->count();
            $gross = round((float) $dayOrders->sum('subtotal'), 2);
            $discounts = round((float) $dayOrders->sum('discount'), 2);
            $delivery = round((float) $dayOrders->sum('delivery_fee'), 2);
            $commission = round((float) $dayOrders->sum('commission'), 2);
            $netDisbursed = round((float) $dayOrders->sum('net_settlement'), 2);
            $activeTenants = $dayOrders->pluck('tenant_id')->unique()->count();

            $rows[] = [
                'id' => $dateStr,
                'date' => $curr->format('M d, Y'),
                'orders_count' => $ordersCount,
                'tenants_count' => $activeTenants,
                'gross_sales' => $gross,
                'discounts' => $discounts,
                'delivery_fees' => $delivery,
                'commission' => $commission,
                'net_settlement' => $netDisbursed,
                'avg_order_value' => $ordersCount > 0 ? round($gross / $ordersCount, 2) : 0,
            ];

            $curr->addDay();
        }

        $totalGross = round((float) $orders->sum('subtotal'), 2);
        $totalOrders = $orders->count();
        $totalCommission = round((float) $orders->sum('commission'), 2);
        $totalNet = round((float) $orders->sum('net_settlement'), 2);
        $uniqueTenants = $orders->pluck('tenant_id')->unique()->count();

        $columns = [
            ['key' => 'date', 'label' => 'Reporting Date', 'type' => 'date', 'selected' => true],
            ['key' => 'orders_count', 'label' => 'Total Orders', 'type' => 'number', 'selected' => true],
            ['key' => 'tenants_count', 'label' => 'Active Sellers', 'type' => 'number', 'selected' => false],
            ['key' => 'gross_sales', 'label' => 'Platform GMV', 'type' => 'money', 'selected' => true],
            ['key' => 'discounts', 'label' => 'Discounts', 'type' => 'money', 'selected' => false],
            ['key' => 'delivery_fees', 'label' => 'Shipping Fees', 'type' => 'money', 'selected' => false],
            ['key' => 'commission', 'label' => 'Marketplace Fee Earned', 'type' => 'money', 'selected' => true],
            ['key' => 'net_settlement', 'label' => 'Seller Payout Obligation', 'type' => 'money', 'selected' => true],
            ['key' => 'avg_order_value', 'label' => 'Avg Order Value', 'type' => 'money', 'selected' => true],
        ];

        return [
            'kpis' => [
                ['label' => 'Platform Gross GMV', 'value' => $totalGross, 'format' => 'money', 'tone' => 'gold'],
                ['label' => 'Marketplace Fees Realized', 'value' => $totalCommission, 'format' => 'money', 'tone' => 'green'],
                ['label' => 'Platform Orders Placed', 'value' => $totalOrders, 'format' => 'number', 'tone' => 'blue'],
                ['label' => 'Participating Tenants', 'value' => $uniqueTenants, 'format' => 'number', 'tone' => 'slate'],
            ],
            'columns' => $columns,
            'rows' => $rows,
            'totals' => [
                'date' => 'Grand Total (' . count($rows) . ' days)',
                'orders_count' => $totalOrders,
                'tenants_count' => $uniqueTenants,
                'gross_sales' => $totalGross,
                'discounts' => round((float) $orders->sum('discount'), 2),
                'delivery_fees' => round((float) $orders->sum('delivery_fee'), 2),
                'commission' => $totalCommission,
                'net_settlement' => $totalNet,
                'avg_order_value' => $totalOrders > 0 ? round($totalGross / $totalOrders, 2) : 0,
            ],
        ];
    }

    protected function generatePlatformOrdersMaster(Carbon $start, Carbon $end, ?int $tenantId, string $status, ?int $categoryId, ?float $min, ?float $max, Request $request): array
    {
        $orders = SellerOrder::withoutGlobalScopes()
            ->whereBetween('created_at', [$start, $end])
            ->when($tenantId, fn ($q) => $q->where('tenant_id', $tenantId))
            ->when($status, fn ($q) => $q->where('status', $status))
            ->when($min !== null, fn ($q) => $q->where('subtotal', '>=', $min))
            ->when($max !== null, fn ($q) => $q->where('subtotal', '<=', $max))
            ->with(['order.user:id,name,email', 'tenant:id,name', 'store:id,name', 'items'])
            ->latest('created_at')
            ->limit(250)
            ->get();

        $rows = $orders->map(function ($order) {
            $customerName = $order->order?->user?->name ?? 'Guest Buyer';
            $customerEmail = $order->order?->user?->email ?? '';
            $itemsCount = $order->items->sum('qty') ?: 1;

            return [
                'id' => $order->id,
                'order_number' => '#' . ($order->order?->order_number ?? 'ORD-' . $order->id),
                'date' => $order->created_at->format('M d, Y H:i'),
                'tenant' => $order->tenant?->name ?? 'Default Tenant',
                'store' => $order->store?->name ?? 'Storefront',
                'customer' => $customerName,
                'customer_email' => $customerEmail,
                'status' => $order->status,
                'items_count' => $itemsCount,
                'subtotal' => (float) $order->subtotal,
                'commission' => (float) $order->commission,
                'net_settlement' => (float) $order->net_settlement,
            ];
        })->values()->all();

        $totalSubtotal = round((float) $orders->sum('subtotal'), 2);
        $totalCommission = round((float) $orders->sum('commission'), 2);
        $totalNet = round((float) $orders->sum('net_settlement'), 2);

        $columns = [
            ['key' => 'order_number', 'label' => 'Order Ref', 'type' => 'text', 'selected' => true],
            ['key' => 'date', 'label' => 'Date & Time', 'type' => 'date', 'selected' => true],
            ['key' => 'tenant', 'label' => 'Tenant Merchant', 'type' => 'text', 'selected' => true],
            ['key' => 'store', 'label' => 'Storefront', 'type' => 'text', 'selected' => false],
            ['key' => 'customer', 'label' => 'Customer', 'type' => 'text', 'selected' => true],
            ['key' => 'status', 'label' => 'Fulfillment Status', 'type' => 'status', 'selected' => true],
            ['key' => 'items_count', 'label' => 'Units', 'type' => 'number', 'selected' => false],
            ['key' => 'subtotal', 'label' => 'Order GMV', 'type' => 'money', 'selected' => true],
            ['key' => 'commission', 'label' => 'Platform Fee', 'type' => 'money', 'selected' => true],
            ['key' => 'net_settlement', 'label' => 'Seller Net', 'type' => 'money', 'selected' => true],
        ];

        return [
            'kpis' => [
                ['label' => 'Master Orders Logged', 'value' => count($rows), 'format' => 'number', 'tone' => 'blue'],
                ['label' => 'Total GMV Transacted', 'value' => $totalSubtotal, 'format' => 'money', 'tone' => 'gold'],
                ['label' => 'Platform Commission Inflow', 'value' => $totalCommission, 'format' => 'money', 'tone' => 'green'],
                ['label' => 'Seller Net Obligations', 'value' => $totalNet, 'format' => 'money', 'tone' => 'slate'],
            ],
            'columns' => $columns,
            'rows' => $rows,
            'totals' => [
                'order_number' => 'Total (' . count($rows) . ' orders)',
                'subtotal' => $totalSubtotal,
                'commission' => $totalCommission,
                'net_settlement' => $totalNet,
            ],
        ];
    }

    protected function generateOrdersByTenant(Carbon $start, Carbon $end, ?int $tenantId, string $status, ?int $categoryId, ?float $min, ?float $max, Request $request): array
    {
        $orders = SellerOrder::withoutGlobalScopes()
            ->whereBetween('created_at', [$start, $end])
            ->when($tenantId, fn ($q) => $q->where('tenant_id', $tenantId))
            ->when($status, fn ($q) => $q->where('status', $status))
            ->with('tenant:id,name,status')
            ->get();

        $grouped = $orders->groupBy('tenant_id');

        $rows = [];
        foreach ($grouped as $tId => $tOrders) {
            $tenant = $tOrders->first()->tenant;
            $gmv = round((float) $tOrders->sum('subtotal'), 2);
            $comm = round((float) $tOrders->sum('commission'), 2);
            $net = round((float) $tOrders->sum('net_settlement'), 2);
            $count = $tOrders->count();

            $rows[] = [
                'id' => $tId,
                'tenant_name' => $tenant?->name ?? 'Tenant #' . $tId,
                'tenant_status' => $tenant?->status ?? 'active',
                'orders_count' => $count,
                'total_gmv' => $gmv,
                'commission_earned' => $comm,
                'net_payout' => $net,
                'take_rate' => $gmv > 0 ? round(($comm / $gmv) * 100, 2) : 0,
                'avg_ticket' => $count > 0 ? round($gmv / $count, 2) : 0,
            ];
        }

        usort($rows, fn ($a, $b) => $b['total_gmv'] <=> $a['total_gmv']);

        $totalGmv = array_sum(array_column($rows, 'total_gmv'));
        $totalComm = array_sum(array_column($rows, 'commission_earned'));
        $totalOrders = array_sum(array_column($rows, 'orders_count'));

        $columns = [
            ['key' => 'tenant_name', 'label' => 'Tenant Business', 'type' => 'text', 'selected' => true],
            ['key' => 'tenant_status', 'label' => 'Account Status', 'type' => 'status', 'selected' => true],
            ['key' => 'orders_count', 'label' => 'Total Orders', 'type' => 'number', 'selected' => true],
            ['key' => 'total_gmv', 'label' => 'Gross GMV', 'type' => 'money', 'selected' => true],
            ['key' => 'commission_earned', 'label' => 'Commission Retained', 'type' => 'money', 'selected' => true],
            ['key' => 'take_rate', 'label' => 'Effective Take Rate (%)', 'type' => 'number', 'selected' => true],
            ['key' => 'net_payout', 'label' => 'Seller Payout', 'type' => 'money', 'selected' => true],
            ['key' => 'avg_ticket', 'label' => 'Avg Basket Size', 'type' => 'money', 'selected' => false],
        ];

        return [
            'kpis' => [
                ['label' => 'Generating Tenants', 'value' => count($rows), 'format' => 'number', 'tone' => 'blue'],
                ['label' => 'Marketplace GMV Volume', 'value' => $totalGmv, 'format' => 'money', 'tone' => 'gold'],
                ['label' => 'Total Commissions', 'value' => $totalComm, 'format' => 'money', 'tone' => 'green'],
                ['label' => 'Platform Take Rate', 'value' => $totalGmv > 0 ? round(($totalComm / $totalGmv) * 100, 1) : 0, 'format' => 'percent', 'tone' => 'slate'],
            ],
            'columns' => $columns,
            'rows' => $rows,
            'totals' => [
                'tenant_name' => 'Total (' . count($rows) . ' tenants)',
                'orders_count' => $totalOrders,
                'total_gmv' => $totalGmv,
                'commission_earned' => $totalComm,
                'net_payout' => array_sum(array_column($rows, 'net_payout')),
            ],
        ];
    }

    protected function generatePlatformRefundsCancelled(Carbon $start, Carbon $end, ?int $tenantId, string $status, ?int $categoryId, ?float $min, ?float $max, Request $request): array
    {
        $orders = SellerOrder::withoutGlobalScopes()
            ->whereBetween('created_at', [$start, $end])
            ->whereIn('status', ['cancelled', 'refunded', 'disputed'])
            ->when($tenantId, fn ($q) => $q->where('tenant_id', $tenantId))
            ->with(['order.user:id,name,email', 'tenant:id,name'])
            ->latest('created_at')
            ->get();

        $rows = $orders->map(fn ($o) => [
            'id' => $o->id,
            'order_ref' => '#' . ($o->order?->order_number ?? 'ORD-' . $o->id),
            'date' => $o->created_at->format('M d, Y'),
            'tenant' => $o->tenant?->name ?? 'Tenant',
            'customer' => $o->order?->user?->name ?? 'Customer',
            'status' => $o->status,
            'gross_amount' => (float) $o->subtotal,
            'commission_reversed' => (float) $o->commission,
            'reason' => 'Customer cancellation / Return request',
        ])->values()->all();

        $totalLostGmv = array_sum(array_column($rows, 'gross_amount'));
        $totalReversedFee = array_sum(array_column($rows, 'commission_reversed'));

        $columns = [
            ['key' => 'order_ref', 'label' => 'Order Ref', 'type' => 'text', 'selected' => true],
            ['key' => 'date', 'label' => 'Incident Date', 'type' => 'date', 'selected' => true],
            ['key' => 'tenant', 'label' => 'Tenant Merchant', 'type' => 'text', 'selected' => true],
            ['key' => 'customer', 'label' => 'Customer', 'type' => 'text', 'selected' => true],
            ['key' => 'status', 'label' => 'Resolution Status', 'type' => 'status', 'selected' => true],
            ['key' => 'gross_amount', 'label' => 'Refunded GMV', 'type' => 'money', 'selected' => true],
            ['key' => 'commission_reversed', 'label' => 'Fee Clawback', 'type' => 'money', 'selected' => true],
            ['key' => 'reason', 'label' => 'Incident Category', 'type' => 'text', 'selected' => false],
        ];

        return [
            'kpis' => [
                ['label' => 'Reversed Orders', 'value' => count($rows), 'format' => 'number', 'tone' => 'danger'],
                ['label' => 'Clawed Back GMV', 'value' => $totalLostGmv, 'format' => 'money', 'tone' => 'gold'],
                ['label' => 'Reversed Commission', 'value' => $totalReversedFee, 'format' => 'money', 'tone' => 'slate'],
            ],
            'columns' => $columns,
            'rows' => $rows,
            'totals' => [
                'order_ref' => 'Total (' . count($rows) . ' cancelled)',
                'gross_amount' => $totalLostGmv,
                'commission_reversed' => $totalReversedFee,
            ],
        ];
    }

    protected function generatePlatformCommissions(Carbon $start, Carbon $end, ?int $tenantId, string $status, ?int $categoryId, ?float $min, ?float $max, Request $request): array
    {
        return $this->generateOrdersByTenant($start, $end, $tenantId, $status, $categoryId, $min, $max, $request);
    }

    // --------------------------------------------------------------------------
    // 2. Tenants & Subscriptions Reports
    // --------------------------------------------------------------------------

    protected function generateTenantsDirectory(Carbon $start, Carbon $end, ?int $tenantId, string $status, ?int $categoryId, ?float $min, ?float $max, Request $request): array
    {
        $tenants = Tenant::query()
            ->when($tenantId, fn ($q) => $q->where('id', $tenantId))
            ->when($status, fn ($q) => $q->where('status', $status))
            ->with(['owner:id,name,email', 'stores', 'products'])
            ->get();

        $rows = $tenants->map(function ($t) {
            $storesCount = $t->stores->count();
            $productsCount = $t->products->count();
            $gmv = (float) SellerOrder::withoutGlobalScopes()->where('tenant_id', $t->id)->sum('subtotal');

            return [
                'id' => $t->id,
                'name' => $t->name,
                'slug' => $t->slug,
                'status' => $t->status,
                'owner_name' => $t->owner?->name ?? 'Owner',
                'owner_email' => $t->owner?->email ?? '',
                'country' => $t->country ?? 'GH',
                'stores_count' => $storesCount,
                'products_count' => $productsCount,
                'created_at' => $t->created_at ? $t->created_at->format('M d, Y') : '—',
                'lifetime_gmv' => $gmv,
            ];
        })->values()->all();

        $totalGmv = array_sum(array_column($rows, 'lifetime_gmv'));
        $totalStores = array_sum(array_column($rows, 'stores_count'));
        $totalProducts = array_sum(array_column($rows, 'products_count'));

        $columns = [
            ['key' => 'name', 'label' => 'Tenant Name', 'type' => 'text', 'selected' => true],
            ['key' => 'status', 'label' => 'Account Status', 'type' => 'status', 'selected' => true],
            ['key' => 'owner_name', 'label' => 'Owner', 'type' => 'text', 'selected' => true],
            ['key' => 'owner_email', 'label' => 'Contact Email', 'type' => 'text', 'selected' => true],
            ['key' => 'country', 'label' => 'Country', 'type' => 'text', 'selected' => false],
            ['key' => 'stores_count', 'label' => 'Storefronts', 'type' => 'number', 'selected' => true],
            ['key' => 'products_count', 'label' => 'Live Catalog', 'type' => 'number', 'selected' => true],
            ['key' => 'created_at', 'label' => 'Onboarding Date', 'type' => 'date', 'selected' => true],
            ['key' => 'lifetime_gmv', 'label' => 'Lifetime GMV', 'type' => 'money', 'selected' => true],
        ];

        return [
            'kpis' => [
                ['label' => 'Total Enrolled Tenants', 'value' => count($rows), 'format' => 'number', 'tone' => 'blue'],
                ['label' => 'Active Storefronts', 'value' => $totalStores, 'format' => 'number', 'tone' => 'slate'],
                ['label' => 'Total Catalog SKUs', 'value' => $totalProducts, 'format' => 'number', 'tone' => 'green'],
                ['label' => 'Lifetime Marketplace GMV', 'value' => $totalGmv, 'format' => 'money', 'tone' => 'gold'],
            ],
            'columns' => $columns,
            'rows' => $rows,
            'totals' => [
                'name' => 'Total (' . count($rows) . ' tenants)',
                'stores_count' => $totalStores,
                'products_count' => $totalProducts,
                'lifetime_gmv' => $totalGmv,
            ],
        ];
    }

    protected function generateSubscriptionsMrr(Carbon $start, Carbon $end, ?int $tenantId, string $status, ?int $categoryId, ?float $min, ?float $max, Request $request): array
    {
        $subscriptions = Subscription::query()
            ->when($tenantId, fn ($q) => $q->where('tenant_id', $tenantId))
            ->when($status, fn ($q) => $q->where('status', $status))
            ->with(['tenant:id,name', 'plan:id,name,price,interval,currency'])
            ->get();

        $rows = $subscriptions->map(function ($s) {
            $monthlyRate = (float) ($s->plan?->price ?? 0);
            if (($s->plan?->interval ?? 'month') === 'year') {
                $monthlyRate = round($monthlyRate / 12, 2);
            }

            return [
                'id' => $s->id,
                'tenant' => $s->tenant?->name ?? 'Tenant #' . $s->tenant_id,
                'plan_name' => $s->plan?->name ?? 'Custom Plan',
                'status' => $s->status,
                'interval' => ucfirst($s->plan?->interval ?? 'month'),
                'rate' => (float) ($s->plan?->price ?? 0),
                'mrr_contribution' => $monthlyRate,
                'starts_at' => $s->created_at ? $s->created_at->format('M d, Y') : '—',
                'renews_at' => $s->current_period_end ? Carbon::parse($s->current_period_end)->format('M d, Y') : 'Active',
            ];
        })->values()->all();

        $totalMrr = array_sum(array_column($rows, 'mrr_contribution'));
        $activeSubs = count(array_filter($rows, fn ($r) => in_array($r['status'], ['active', 'trialing'])));

        $columns = [
            ['key' => 'tenant', 'label' => 'Tenant Business', 'type' => 'text', 'selected' => true],
            ['key' => 'plan_name', 'label' => 'Subscription Plan', 'type' => 'text', 'selected' => true],
            ['key' => 'status', 'label' => 'Plan Status', 'type' => 'status', 'selected' => true],
            ['key' => 'interval', 'label' => 'Billing Cycle', 'type' => 'text', 'selected' => true],
            ['key' => 'rate', 'label' => 'Contract Price', 'type' => 'money', 'selected' => true],
            ['key' => 'mrr_contribution', 'label' => 'Monthly Recurring (MRR)', 'type' => 'money', 'selected' => true],
            ['key' => 'starts_at', 'label' => 'Subscription Date', 'type' => 'date', 'selected' => false],
            ['key' => 'renews_at', 'label' => 'Next Renewal', 'type' => 'date', 'selected' => true],
        ];

        return [
            'kpis' => [
                ['label' => 'Active Subscriptions', 'value' => $activeSubs, 'format' => 'number', 'tone' => 'blue'],
                ['label' => 'Monthly Recurring Revenue (MRR)', 'value' => $totalMrr, 'format' => 'money', 'tone' => 'green'],
                ['label' => 'Annual Run Rate (ARR)', 'value' => round($totalMrr * 12, 2), 'format' => 'money', 'tone' => 'gold'],
            ],
            'columns' => $columns,
            'rows' => $rows,
            'totals' => [
                'tenant' => 'Total (' . count($rows) . ' subscriptions)',
                'rate' => array_sum(array_column($rows, 'rate')),
                'mrr_contribution' => $totalMrr,
            ],
        ];
    }

    protected function generateTenantGrowthChurn(Carbon $start, Carbon $end, ?int $tenantId, string $status, ?int $categoryId, ?float $min, ?float $max, Request $request): array
    {
        return $this->generateTenantsDirectory($start, $end, $tenantId, $status, $categoryId, $min, $max, $request);
    }

    protected function generateStoresPortfolio(Carbon $start, Carbon $end, ?int $tenantId, string $status, ?int $categoryId, ?float $min, ?float $max, Request $request): array
    {
        $stores = Store::withoutGlobalScopes()
            ->when($tenantId, fn ($q) => $q->where('tenant_id', $tenantId))
            ->when($status, fn ($q) => $q->where('status', $status))
            ->with(['tenant:id,name', 'products'])
            ->get();

        $rows = $stores->map(fn ($s) => [
            'id' => $s->id,
            'name' => $s->name,
            'slug' => $s->slug,
            'tenant' => $s->tenant?->name ?? 'Tenant',
            'status' => $s->status,
            'currency' => $s->currency ?? 'USD',
            'products_count' => $s->products->count(),
            'city' => $s->city ?? 'Accra',
            'created_at' => $s->created_at ? $s->created_at->format('M d, Y') : '—',
        ])->values()->all();

        $columns = [
            ['key' => 'name', 'label' => 'Storefront Name', 'type' => 'text', 'selected' => true],
            ['key' => 'tenant', 'label' => 'Tenant Owner', 'type' => 'text', 'selected' => true],
            ['key' => 'status', 'label' => 'Store Status', 'type' => 'status', 'selected' => true],
            ['key' => 'products_count', 'label' => 'Active Products', 'type' => 'number', 'selected' => true],
            ['key' => 'currency', 'label' => 'Currency', 'type' => 'text', 'selected' => false],
            ['key' => 'city', 'label' => 'Primary Market', 'type' => 'text', 'selected' => true],
            ['key' => 'created_at', 'label' => 'Created Date', 'type' => 'date', 'selected' => true],
        ];

        return [
            'kpis' => [
                ['label' => 'Total Stores Online', 'value' => count($rows), 'format' => 'number', 'tone' => 'blue'],
                ['label' => 'Aggregated Catalog SKUs', 'value' => array_sum(array_column($rows, 'products_count')), 'format' => 'number', 'tone' => 'green'],
            ],
            'columns' => $columns,
            'rows' => $rows,
            'totals' => [
                'name' => 'Total (' . count($rows) . ' stores)',
                'products_count' => array_sum(array_column($rows, 'products_count')),
            ],
        ];
    }

    // --------------------------------------------------------------------------
    // 3. Financials & Settlements Reports
    // --------------------------------------------------------------------------

    protected function generatePayoutsSettlements(Carbon $start, Carbon $end, ?int $tenantId, string $status, ?int $categoryId, ?float $min, ?float $max, Request $request): array
    {
        $settlements = SellerSettlement::query()
            ->whereBetween('created_at', [$start, $end])
            ->when($status, fn ($q) => $q->where('status', $status))
            ->with(['sellerOrder.tenant:id,name', 'sellerOrder.store:id,name'])
            ->latest('created_at')
            ->get();

        $rows = $settlements->map(fn ($s) => [
            'id' => $s->id,
            'reference' => 'SETTLE-#' . $s->id,
            'date' => $s->created_at->format('M d, Y'),
            'tenant' => $s->sellerOrder?->tenant?->name ?? 'Tenant',
            'status' => $s->status,
            'gross' => (float) $s->gross,
            'commission' => (float) $s->commission,
            'delivery_fee' => (float) $s->delivery_fee,
            'net' => (float) $s->net,
        ])->values()->all();

        $totalGross = array_sum(array_column($rows, 'gross'));
        $totalCommission = array_sum(array_column($rows, 'commission'));
        $totalNet = array_sum(array_column($rows, 'net'));

        $columns = [
            ['key' => 'reference', 'label' => 'Settlement Ref', 'type' => 'text', 'selected' => true],
            ['key' => 'date', 'label' => 'Settlement Date', 'type' => 'date', 'selected' => true],
            ['key' => 'tenant', 'label' => 'Beneficiary Tenant', 'type' => 'text', 'selected' => true],
            ['key' => 'status', 'label' => 'Disbursement Status', 'type' => 'status', 'selected' => true],
            ['key' => 'gross', 'label' => 'Gross Traded', 'type' => 'money', 'selected' => true],
            ['key' => 'commission', 'label' => 'Platform Fee Deducted', 'type' => 'money', 'selected' => true],
            ['key' => 'net', 'label' => 'Net Disbursed', 'type' => 'money', 'selected' => true],
        ];

        return [
            'kpis' => [
                ['label' => 'Settlement Items', 'value' => count($rows), 'format' => 'number', 'tone' => 'blue'],
                ['label' => 'Gross Volume Settled', 'value' => $totalGross, 'format' => 'money', 'tone' => 'gold'],
                ['label' => 'Platform Fee Withheld', 'value' => $totalCommission, 'format' => 'money', 'tone' => 'green'],
                ['label' => 'Seller Net Paid', 'value' => $totalNet, 'format' => 'money', 'tone' => 'slate'],
            ],
            'columns' => $columns,
            'rows' => $rows,
            'totals' => [
                'reference' => 'Total (' . count($rows) . ' settlements)',
                'gross' => $totalGross,
                'commission' => $totalCommission,
                'net' => $totalNet,
            ],
        ];
    }

    protected function generatePlatformCashflow(Carbon $start, Carbon $end, ?int $tenantId, string $status, ?int $categoryId, ?float $min, ?float $max, Request $request): array
    {
        return $this->generatePlatformSalesSummary($start, $end, $tenantId, $status, $categoryId, $min, $max, $request);
    }

    protected function generatePlatformTaxSummary(Carbon $start, Carbon $end, ?int $tenantId, string $status, ?int $categoryId, ?float $min, ?float $max, Request $request): array
    {
        return $this->generatePlatformSalesSummary($start, $end, $tenantId, $status, $categoryId, $min, $max, $request);
    }

    // --------------------------------------------------------------------------
    // 4. Customers & Users Reports
    // --------------------------------------------------------------------------

    protected function generateCustomersPlatformDirectory(Carbon $start, Carbon $end, ?int $tenantId, string $status, ?int $categoryId, ?float $min, ?float $max, Request $request): array
    {
        $users = User::query()
            ->whereHas('roles', fn ($q) => $q->where('role', 'customer'))
            ->with(['orders'])
            ->get();

        $rows = $users->map(function ($u) {
            $ordersCount = $u->orders->count();
            $spent = (float) $u->orders->sum('grand_total');

            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'phone' => $u->phone ?: '—',
                'orders_count' => $ordersCount,
                'lifetime_spent' => $spent,
                'created_at' => $u->created_at ? $u->created_at->format('M d, Y') : '—',
            ];
        })->values()->all();

        $totalSpent = array_sum(array_column($rows, 'lifetime_spent'));
        $totalOrders = array_sum(array_column($rows, 'orders_count'));

        $columns = [
            ['key' => 'name', 'label' => 'Customer Name', 'type' => 'text', 'selected' => true],
            ['key' => 'email', 'label' => 'Email Address', 'type' => 'text', 'selected' => true],
            ['key' => 'phone', 'label' => 'Phone', 'type' => 'text', 'selected' => false],
            ['key' => 'orders_count', 'label' => 'Orders Placed', 'type' => 'number', 'selected' => true],
            ['key' => 'lifetime_spent', 'label' => 'Lifetime GMV Spent', 'type' => 'money', 'selected' => true],
            ['key' => 'created_at', 'label' => 'Registered Date', 'type' => 'date', 'selected' => true],
        ];

        return [
            'kpis' => [
                ['label' => 'Registered Buyers', 'value' => count($rows), 'format' => 'number', 'tone' => 'blue'],
                ['label' => 'Buyer Total Spend', 'value' => $totalSpent, 'format' => 'money', 'tone' => 'gold'],
                ['label' => 'Total Marketplace Orders', 'value' => $totalOrders, 'format' => 'number', 'tone' => 'green'],
            ],
            'columns' => $columns,
            'rows' => $rows,
            'totals' => [
                'name' => 'Total (' . count($rows) . ' customers)',
                'orders_count' => $totalOrders,
                'lifetime_spent' => $totalSpent,
            ],
        ];
    }

    protected function generateUsersRegistry(Carbon $start, Carbon $end, ?int $tenantId, string $status, ?int $categoryId, ?float $min, ?float $max, Request $request): array
    {
        $users = User::query()->with('roles')->get();

        $rows = $users->map(fn ($u) => [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'roles' => $u->roles->pluck('role')->implode(', ') ?: 'customer',
            'email_verified' => $u->email_verified_at ? 'Verified' : 'Unverified',
            'created_at' => $u->created_at ? $u->created_at->format('M d, Y') : '—',
        ])->values()->all();

        $columns = [
            ['key' => 'name', 'label' => 'User Name', 'type' => 'text', 'selected' => true],
            ['key' => 'email', 'label' => 'Email', 'type' => 'text', 'selected' => true],
            ['key' => 'roles', 'label' => 'Assigned Roles', 'type' => 'text', 'selected' => true],
            ['key' => 'email_verified', 'label' => 'Status', 'type' => 'status', 'selected' => true],
            ['key' => 'created_at', 'label' => 'Enrolled On', 'type' => 'date', 'selected' => true],
        ];

        return [
            'kpis' => [
                ['label' => 'Total Platform Users', 'value' => count($rows), 'format' => 'number', 'tone' => 'blue'],
            ],
            'columns' => $columns,
            'rows' => $rows,
            'totals' => [
                'name' => 'Total (' . count($rows) . ' users)',
            ],
        ];
    }

    // --------------------------------------------------------------------------
    // 5. Catalog & Moderation Reports
    // --------------------------------------------------------------------------

    protected function generatePlatformCatalogInventory(Carbon $start, Carbon $end, ?int $tenantId, string $status, ?int $categoryId, ?float $min, ?float $max, Request $request): array
    {
        $products = Product::withoutGlobalScopes()
            ->when($tenantId, fn ($q) => $q->where('tenant_id', $tenantId))
            ->when($categoryId, fn ($q) => $q->where('category_id', $categoryId))
            ->with(['tenant:id,name', 'store:id,name', 'category:id,name', 'variants.inventory'])
            ->get();

        $rows = $products->map(function ($p) {
            $stock = (int) $p->stock;
            $stockStatus = $stock <= 0 ? 'out_of_stock' : ($stock <= 5 ? 'low_stock' : 'in_stock');
            $valuation = round($stock * (float) $p->price, 2);

            return [
                'id' => $p->id,
                'name' => $p->name,
                'sku' => $p->sku ?: 'SKU-' . $p->id,
                'tenant' => $p->tenant?->name ?? 'Tenant',
                'category' => $p->category?->name ?? 'General',
                'stock' => $stock,
                'stock_status' => $stockStatus,
                'price' => (float) $p->price,
                'total_valuation' => $valuation,
            ];
        })->values()->all();

        $totalValuation = array_sum(array_column($rows, 'total_valuation'));
        $totalStock = array_sum(array_column($rows, 'stock'));

        $columns = [
            ['key' => 'name', 'label' => 'Product Name', 'type' => 'text', 'selected' => true],
            ['key' => 'sku', 'label' => 'SKU', 'type' => 'text', 'selected' => true],
            ['key' => 'tenant', 'label' => 'Tenant Merchant', 'type' => 'text', 'selected' => true],
            ['key' => 'category', 'label' => 'Category', 'type' => 'text', 'selected' => true],
            ['key' => 'stock', 'label' => 'Stock Quantity', 'type' => 'number', 'selected' => true],
            ['key' => 'stock_status', 'label' => 'Inventory Status', 'type' => 'status', 'selected' => true],
            ['key' => 'price', 'label' => 'Price', 'type' => 'money', 'selected' => true],
            ['key' => 'total_valuation', 'label' => 'Total Valuation', 'type' => 'money', 'selected' => true],
        ];

        return [
            'kpis' => [
                ['label' => 'Catalog SKUs', 'value' => count($rows), 'format' => 'number', 'tone' => 'blue'],
                ['label' => 'Units in Warehouse', 'value' => $totalStock, 'format' => 'number', 'tone' => 'slate'],
                ['label' => 'Total Asset Valuation', 'value' => $totalValuation, 'format' => 'money', 'tone' => 'gold'],
            ],
            'columns' => $columns,
            'rows' => $rows,
            'totals' => [
                'name' => 'Total (' . count($rows) . ' items)',
                'stock' => $totalStock,
                'total_valuation' => $totalValuation,
            ],
        ];
    }

    protected function generateModerationCompliance(Carbon $start, Carbon $end, ?int $tenantId, string $status, ?int $categoryId, ?float $min, ?float $max, Request $request): array
    {
        $reviews = Review::withoutGlobalScopes()
            ->with(['product:id,name,tenant_id', 'user:id,name'])
            ->latest('created_at')
            ->get();

        $rows = $reviews->map(fn ($r) => [
            'id' => $r->id,
            'title' => $r->title,
            'product' => $r->product?->name ?? 'Product',
            'author' => $r->user?->name ?? 'Anonymous',
            'rating' => $r->rating . ' ★',
            'status' => $r->status,
            'date' => $r->created_at ? $r->created_at->format('M d, Y') : '—',
        ])->values()->all();

        $columns = [
            ['key' => 'title', 'label' => 'Review Heading', 'type' => 'text', 'selected' => true],
            ['key' => 'product', 'label' => 'Product Name', 'type' => 'text', 'selected' => true],
            ['key' => 'author', 'label' => 'Customer Author', 'type' => 'text', 'selected' => true],
            ['key' => 'rating', 'label' => 'Star Rating', 'type' => 'text', 'selected' => true],
            ['key' => 'status', 'label' => 'Moderation Status', 'type' => 'status', 'selected' => true],
            ['key' => 'date', 'label' => 'Submission Date', 'type' => 'date', 'selected' => true],
        ];

        return [
            'kpis' => [
                ['label' => 'Reviews Monitored', 'value' => count($rows), 'format' => 'number', 'tone' => 'blue'],
                ['label' => 'Approved Listings', 'value' => count(array_filter($rows, fn ($r) => $r['status'] === 'approved')), 'format' => 'number', 'tone' => 'green'],
            ],
            'columns' => $columns,
            'rows' => $rows,
            'totals' => [
                'title' => 'Total (' . count($rows) . ' reviews)',
            ],
        ];
    }

    protected function generatePlatformCategoryPerformance(Carbon $start, Carbon $end, ?int $tenantId, string $status, ?int $categoryId, ?float $min, ?float $max, Request $request): array
    {
        return $this->generatePlatformCatalogInventory($start, $end, $tenantId, $status, $categoryId, $min, $max, $request);
    }

    // --------------------------------------------------------------------------
    // 6. Platform Audit & Support Reports
    // --------------------------------------------------------------------------

    protected function generatePlatformAuditTrail(Carbon $start, Carbon $end, ?int $tenantId, string $status, ?int $categoryId, ?float $min, ?float $max, Request $request): array
    {
        $logs = AuditLog::query()
            ->whereBetween('created_at', [$start, $end])
            ->latest('created_at')
            ->limit(300)
            ->get();

        $rows = $logs->map(fn ($l) => [
            'id' => $l->id,
            'date' => $l->created_at->format('M d, Y H:i:s'),
            'actor' => $l->actor_email ?: 'System Admin',
            'role' => $l->actor_role ?: 'super_admin',
            'action' => $l->action,
            'target' => ($l->target_type ? class_basename($l->target_type) . ' #' . $l->target_id : 'System Resource'),
            'ip' => $l->ip_address ?: '127.0.0.1',
        ])->values()->all();

        $columns = [
            ['key' => 'date', 'label' => 'Timestamp', 'type' => 'date', 'selected' => true],
            ['key' => 'actor', 'label' => 'Staff / Admin Actor', 'type' => 'text', 'selected' => true],
            ['key' => 'role', 'label' => 'Security Role', 'type' => 'text', 'selected' => true],
            ['key' => 'action', 'label' => 'Action Performed', 'type' => 'text', 'selected' => true],
            ['key' => 'target', 'label' => 'Target Record', 'type' => 'text', 'selected' => true],
            ['key' => 'ip', 'label' => 'IP Address', 'type' => 'text', 'selected' => false],
        ];

        return [
            'kpis' => [
                ['label' => 'Audited Admin Events', 'value' => count($rows), 'format' => 'number', 'tone' => 'blue'],
                ['label' => 'Unique Admin Actors', 'value' => count(array_unique(array_column($rows, 'actor'))), 'format' => 'number', 'tone' => 'slate'],
            ],
            'columns' => $columns,
            'rows' => $rows,
            'totals' => [
                'date' => 'Total (' . count($rows) . ' events)',
            ],
        ];
    }

    protected function generatePlatformSupportMetrics(Carbon $start, Carbon $end, ?int $tenantId, string $status, ?int $categoryId, ?float $min, ?float $max, Request $request): array
    {
        $tickets = SupportTicket::query()
            ->whereBetween('created_at', [$start, $end])
            ->with(['tenant:id,name', 'user:id,name'])
            ->latest('created_at')
            ->get();

        $rows = $tickets->map(fn ($t) => [
            'id' => $t->id,
            'ticket_num' => '#' . $t->ticket_number,
            'date' => $t->created_at->format('M d, Y'),
            'tenant' => $t->tenant?->name ?? 'General Inquiry',
            'subject' => $t->subject,
            'priority' => ucfirst($t->priority),
            'status' => $t->status,
        ])->values()->all();

        $columns = [
            ['key' => 'ticket_num', 'label' => 'Ticket #', 'type' => 'text', 'selected' => true],
            ['key' => 'date', 'label' => 'Logged Date', 'type' => 'date', 'selected' => true],
            ['key' => 'tenant', 'label' => 'Tenant', 'type' => 'text', 'selected' => true],
            ['key' => 'subject', 'label' => 'Issue Summary', 'type' => 'text', 'selected' => true],
            ['key' => 'priority', 'label' => 'Priority', 'type' => 'status', 'selected' => true],
            ['key' => 'status', 'label' => 'Resolution Status', 'type' => 'status', 'selected' => true],
        ];

        return [
            'kpis' => [
                ['label' => 'Logged Support Cases', 'value' => count($rows), 'format' => 'number', 'tone' => 'blue'],
                ['label' => 'Open / In-Progress', 'value' => count(array_filter($rows, fn ($r) => in_array($r['status'], ['open', 'in_progress']))), 'format' => 'number', 'tone' => 'gold'],
            ],
            'columns' => $columns,
            'rows' => $rows,
            'totals' => [
                'ticket_num' => 'Total (' . count($rows) . ' tickets)',
            ],
        ];
    }

    // --------------------------------------------------------------------------
    // Metadata Catalog & Help Guides
    // --------------------------------------------------------------------------

    protected function reportCategories(): array
    {
        return [
            [
                'name' => 'Platform GMV & Orders Reports',
                'icon' => 'orders',
                'reports' => [
                    ['key' => 'platform_sales_summary', 'label' => 'Platform Sales & GMV Summary', 'favorite' => true],
                    ['key' => 'platform_orders_master', 'label' => 'Platform Master Orders Registry', 'favorite' => true],
                    ['key' => 'orders_by_tenant', 'label' => 'Orders by Tenant Breakdown', 'favorite' => false],
                    ['key' => 'platform_refunds_cancelled', 'label' => 'Cancelled & Disputed Orders', 'favorite' => false],
                    ['key' => 'platform_commissions', 'label' => 'Marketplace Commission Realization', 'favorite' => true],
                ],
            ],
            [
                'name' => 'Tenants & Subscriptions Reports',
                'icon' => 'tenants',
                'reports' => [
                    ['key' => 'tenants_directory', 'label' => 'Tenants Directory & Operating Status', 'favorite' => true],
                    ['key' => 'subscriptions_mrr', 'label' => 'SaaS Subscriptions & MRR Breakdown', 'favorite' => true],
                    ['key' => 'tenant_growth_churn', 'label' => 'Tenant Acquisition & Churn Velocity', 'favorite' => false],
                    ['key' => 'stores_portfolio', 'label' => 'Multi-Storefronts Portfolio', 'favorite' => false],
                ],
            ],
            [
                'name' => 'Financials & Settlements Reports',
                'icon' => 'finance',
                'reports' => [
                    ['key' => 'payouts_settlements', 'label' => 'Seller Payouts & Settlement Batches', 'favorite' => true],
                    ['key' => 'platform_cashflow', 'label' => 'Marketplace Inflow vs Disbursements', 'favorite' => false],
                    ['key' => 'platform_tax_summary', 'label' => 'Platform Sales Tax Collection', 'favorite' => false],
                ],
            ],
            [
                'name' => 'Customers & Platform Users Reports',
                'icon' => 'users',
                'reports' => [
                    ['key' => 'customers_platform_directory', 'label' => 'Global Platform Customers & Spending', 'favorite' => false],
                    ['key' => 'users_registry', 'label' => 'System Users, Roles & Staff Directory', 'favorite' => false],
                ],
            ],
            [
                'name' => 'Catalog & Moderation Reports',
                'icon' => 'inventory',
                'reports' => [
                    ['key' => 'platform_catalog_inventory', 'label' => 'Platform Catalog & Stock On Hand', 'favorite' => true],
                    ['key' => 'moderation_compliance', 'label' => 'Listing Moderation & Flagged Content', 'favorite' => false],
                    ['key' => 'platform_category_performance', 'label' => 'Category & Marketplace Demand', 'favorite' => false],
                ],
            ],
            [
                'name' => 'Platform Audit & Service Desk Reports',
                'icon' => 'activity',
                'reports' => [
                    ['key' => 'platform_audit_trail', 'label' => 'Super Admin Activity Audit Trail', 'favorite' => false],
                    ['key' => 'platform_support_metrics', 'label' => 'Platform Support Tickets & SLAs', 'favorite' => false],
                ],
            ],
        ];
    }

    protected function findReportMeta(string $key): array
    {
        foreach ($this->reportCategories() as $cat) {
            foreach ($cat['reports'] as $rep) {
                if ($rep['key'] === $key) {
                    return [
                        'key' => $rep['key'],
                        'label' => $rep['label'],
                        'category' => $cat['name'],
                    ];
                }
            }
        }

        return [
            'key' => 'platform_sales_summary',
            'label' => 'Platform Sales & GMV Summary',
            'category' => 'Platform GMV & Orders Reports',
        ];
    }

    protected function reportHelpGuide(string $key): array
    {
        $guides = [
            'platform_sales_summary' => [
                'summary' => 'The Platform Sales & GMV Summary provides an executive, top-level audit of all customer transactions executed across MarketHub storefronts. It captures GMV, orders count, discounts, delivery totals, platform commissions retained, and seller payout liabilities.',
                'compare_heading' => 'How can you compare this data across platform features?',
                'points' => [
                    'Reconcile total Platform Fee Earned against the Marketplace Commissions report to ensure calculated take rates match policy tiers.',
                    'Cross-reference Seller Payout Obligations with the Seller Payouts & Settlement Batches report before approving disbursement batches.',
                    'Compare Gross GMV growth with SaaS MRR Subscription revenue to determine the balance between transaction-fee monetization and recurring software billing.',
                ],
            ],
            'platform_orders_master' => [
                'summary' => 'The Platform Master Orders Registry tracks every individual customer order across all enrolled tenants, capturing merchant tenant IDs, buyer credentials, order statuses, and fee breakdowns.',
                'compare_heading' => 'How can you compare this data across platform features?',
                'points' => [
                    'Filter by specific tenant merchants to audit disputed customer complaints or SLA breaches.',
                    'Match cancelled orders with the Cancelled & Disputed Orders report to identify merchant fraud or out-of-stock cancellation patterns.',
                ],
            ],
            'orders_by_tenant' => [
                'summary' => 'Aggregates sales performance by merchant tenant, ranking top revenue-generating sellers, effective take rates, and customer basket sizes.',
                'compare_heading' => 'How can you compare this data across platform features?',
                'points' => [
                    'Identify high-volume sellers eligible for negotiated commission tiers or enterprise subscription plans.',
                    'Compare tenant GMV against active catalog size in the Catalog & Inventory report to analyze merchant inventory turnover.',
                ],
            ],
            'tenants_directory' => [
                'summary' => 'Comprehensive directory of all merchant tenant organizations on MarketHub, documenting compliance status, storefront count, total listed products, and lifetime gross sales.',
                'compare_heading' => 'How can you compare this data across platform features?',
                'points' => [
                    'Review pending vs active tenants against onboarding audit logs in the Super Admin Audit Trail.',
                    'Cross-reference tenant count with SaaS Subscriptions & MRR Breakdown to spot tenants on unpaid or overdue plans.',
                ],
            ],
            'subscriptions_mrr' => [
                'summary' => 'Monitors SaaS recurring revenue streams across all merchant subscription tiers (Starter, Growth, Scale, Enterprise), tracking contract values, billing frequencies, and renewal dates.',
                'compare_heading' => 'How can you compare this data across platform features?',
                'points' => [
                    'Compare MRR and ARR growth rates with historical platform GMV growth.',
                    'Check upcoming renewals against tenant support ticket volume to proactively mitigate churn risk.',
                ],
            ],
            'payouts_settlements' => [
                'summary' => 'Audits all seller settlement transactions and escrow release disbursements, ensuring marketplace reserves match bank ledger outflows.',
                'compare_heading' => 'How can you compare this data across platform features?',
                'points' => [
                    'Cross-check net disbursement figures with the Platform Cashflow overview before authorizing bank batch releases.',
                    'Ensure commission fees withheld match platform income ledgers in Platform Accounting.',
                ],
            ],
        ];

        return $guides[$key] ?? [
            'summary' => 'This report provides a platform-wide governance summary of ' . ucwords(str_replace('_', ' ', $key)) . ' across all MarketHub tenants for the selected window.',
            'compare_heading' => 'How can you compare this data across platform features?',
            'points' => [
                'Cross-reference with Platform Analytics and Audit Logs to verify data integrity.',
                'Export to CSV or PDF for board reporting, tax filing, and administrative compliance.',
            ],
        ];
    }
}
