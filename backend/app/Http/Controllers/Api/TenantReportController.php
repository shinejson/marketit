<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccountingExpense;
use App\Models\AccountingInvoice;
use App\Models\AccountingPayment;
use App\Models\AdCampaign;
use App\Models\AuditLog;
use App\Models\Category;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\SellerOrder;
use App\Models\Store;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Tenant Report Center: Handles enterprise report generation, multi-category catalogs,
 * dynamic column selections, filtering, and PDF/CSV export rollups.
 */
class TenantReportController extends Controller
{
    /** Catalog of all available tenant report types grouped by category. */
    public function catalog(): JsonResponse
    {
        return response()->json([
            'data' => [
                'categories' => $this->reportCategories(),
            ],
        ]);
    }

    /** Generates the requested report dataset with summary KPIs, columns, and data rows. */
    public function generate(Request $request): JsonResponse
    {
        $tenantId = (int) ($request->user()?->tenantId() ?? 0);
        if ($tenantId <= 0) {
            $tenantId = (int) ($request->user()?->ownedTenants()->value('id') ?? 1);
        }
        $reportKey = $request->string('report', 'sales_summary')->toString();
        $startDate = $request->filled('start_date') ? Carbon::parse($request->input('start_date'))->startOfDay() : now()->subDays(29)->startOfDay();
        $endDate = $request->filled('end_date') ? Carbon::parse($request->input('end_date'))->endOfDay() : now()->endOfDay();
        $storeId = $request->filled('store_id') && is_numeric($request->input('store_id')) ? (int) $request->input('store_id') : null;
        $status = $request->string('status')->trim()->toString();
        $categoryId = $request->filled('category_id') && is_numeric($request->input('category_id')) ? (int) $request->input('category_id') : null;
        $amountMin = $request->filled('amount_min') ? (float) $request->input('amount_min') : null;
        $amountMax = $request->filled('amount_max') ? (float) $request->input('amount_max') : null;

        $tenant = Tenant::query()->find($tenantId);
        $tenantName = $tenant?->name ?? 'Tenant Workspace';
        $storeName = 'All Stores';
        if ($storeId) {
            $store = Store::query()->where('tenant_id', $tenantId)->find($storeId);
            if ($store) {
                $storeName = $store->name;
            }
        }

        $reportMeta = $this->findReportMeta($reportKey);
        $generatorMethod = 'generate' . str_replace(' ', '', ucwords(str_replace('_', ' ', $reportKey)));

        if (method_exists($this, $generatorMethod)) {
            $result = $this->$generatorMethod($tenantId, $startDate, $endDate, $storeId, $status, $categoryId, $amountMin, $amountMax, $request);
        } else {
            $result = $this->generateSalesSummary($tenantId, $startDate, $endDate, $storeId, $status, $categoryId, $amountMin, $amountMax, $request);
        }

        return response()->json([
            'data' => array_merge([
                'report_key' => $reportMeta['key'],
                'report_name' => $reportMeta['label'],
                'category' => $reportMeta['category'],
                'generated_at' => now()->toIso8601String(),
                'tenant_name' => $tenantName,
                'store_name' => $storeName,
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
    // Report Data Generators
    // --------------------------------------------------------------------------

    protected function generateSalesSummary(int $tenantId, Carbon $start, Carbon $end, ?int $storeId, string $status, ?int $categoryId, ?float $min, ?float $max, Request $request): array
    {
        $query = SellerOrder::query()
            ->where('tenant_id', $tenantId)
            ->whereBetween('created_at', [$start, $end])
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->when($status, fn ($q) => $q->where('status', $status));

        if ($min !== null) $query->where('subtotal', '>=', $min);
        if ($max !== null) $query->where('subtotal', '<=', $max);

        $orders = $query->with('store:id,name')->get();

        $rows = [];
        $dayGroups = $orders->groupBy(fn ($o) => $o->created_at->toDateString());

        // Generate day-by-day rows
        $curr = $start->copy();
        while ($curr->lte($end)) {
            $dateStr = $curr->toDateString();
            $dayOrders = $dayGroups->get($dateStr, collect());
            $ordersCount = $dayOrders->count();
            $gross = round((float) $dayOrders->sum('subtotal'), 2);
            $discounts = round((float) $dayOrders->sum('discount'), 2);
            $delivery = round((float) $dayOrders->sum('delivery_fee'), 2);
            $commission = round((float) $dayOrders->sum('commission'), 2);
            $net = round((float) $dayOrders->sum('net_settlement'), 2);

            $rows[] = [
                'id' => $dateStr,
                'date' => $curr->format('M d, Y'),
                'orders_count' => $ordersCount,
                'gross_sales' => $gross,
                'discounts' => $discounts,
                'delivery_fees' => $delivery,
                'commission' => $commission,
                'net_settlement' => $net,
                'avg_order_value' => $ordersCount > 0 ? round($gross / $ordersCount, 2) : 0,
            ];

            $curr->addDay();
        }

        $totalGross = round((float) $orders->sum('subtotal'), 2);
        $totalOrders = $orders->count();
        $totalNet = round((float) $orders->sum('net_settlement'), 2);
        $totalDiscounts = round((float) $orders->sum('discount'), 2);

        $columns = [
            ['key' => 'date', 'label' => 'Reporting Date', 'type' => 'date', 'selected' => true],
            ['key' => 'orders_count', 'label' => 'Orders', 'type' => 'number', 'selected' => true],
            ['key' => 'gross_sales', 'label' => 'Gross Sales', 'type' => 'money', 'selected' => true],
            ['key' => 'discounts', 'label' => 'Discounts', 'type' => 'money', 'selected' => true],
            ['key' => 'delivery_fees', 'label' => 'Delivery Fees', 'type' => 'money', 'selected' => false],
            ['key' => 'commission', 'label' => 'Marketplace Fee', 'type' => 'money', 'selected' => false],
            ['key' => 'net_settlement', 'label' => 'Net Payout', 'type' => 'money', 'selected' => true],
            ['key' => 'avg_order_value', 'label' => 'Avg Order Value', 'type' => 'money', 'selected' => true],
        ];

        return [
            'kpis' => [
                ['label' => 'Total Gross Sales', 'value' => $totalGross, 'format' => 'money', 'tone' => 'gold'],
                ['label' => 'Total Orders', 'value' => $totalOrders, 'format' => 'number', 'tone' => 'blue'],
                ['label' => 'Average Order Value', 'value' => $totalOrders > 0 ? round($totalGross / $totalOrders, 2) : 0, 'format' => 'money', 'tone' => 'slate'],
                ['label' => 'Net Settlement', 'value' => $totalNet, 'format' => 'money', 'tone' => 'green'],
            ],
            'columns' => $columns,
            'rows' => $rows,
            'totals' => [
                'date' => 'Total (' . count($rows) . ' days)',
                'orders_count' => $totalOrders,
                'gross_sales' => $totalGross,
                'discounts' => $totalDiscounts,
                'delivery_fees' => round((float) $orders->sum('delivery_fee'), 2),
                'commission' => round((float) $orders->sum('commission'), 2),
                'net_settlement' => $totalNet,
                'avg_order_value' => $totalOrders > 0 ? round($totalGross / $totalOrders, 2) : 0,
            ],
        ];
    }

    protected function generateOrdersMaster(int $tenantId, Carbon $start, Carbon $end, ?int $storeId, string $status, ?int $categoryId, ?float $min, ?float $max, Request $request): array
    {
        $orders = SellerOrder::query()
            ->where('seller_orders.tenant_id', $tenantId)
            ->whereBetween('seller_orders.created_at', [$start, $end])
            ->when($storeId, fn ($q) => $q->where('seller_orders.store_id', $storeId))
            ->when($status, fn ($q) => $q->where('seller_orders.status', $status))
            ->when($min !== null, fn ($q) => $q->where('seller_orders.subtotal', '>=', $min))
            ->when($max !== null, fn ($q) => $q->where('seller_orders.subtotal', '<=', $max))
            ->with(['order.user:id,name,email', 'store:id,name', 'items'])
            ->latest('seller_orders.created_at')
            ->limit(200)
            ->get();

        $rows = $orders->map(function ($order) {
            $customerName = $order->order?->user?->name ?? 'Guest Buyer';
            $customerEmail = $order->order?->user?->email ?? '';
            $itemsCount = $order->items->sum('qty') ?: 1;

            return [
                'id' => $order->id,
                'order_number' => '#' . ($order->order?->order_number ?? 'ORD-' . $order->id),
                'date' => $order->created_at->format('M d, Y H:i'),
                'customer' => $customerName,
                'customer_email' => $customerEmail,
                'store' => $order->store?->name ?? 'Default Store',
                'status' => $order->status,
                'items_count' => $itemsCount,
                'subtotal' => (float) $order->subtotal,
                'discount' => (float) $order->discount,
                'delivery_fee' => (float) $order->delivery_fee,
                'net_settlement' => (float) $order->net_settlement,
            ];
        })->values()->all();

        $totalSubtotal = round((float) $orders->sum('subtotal'), 2);
        $totalNet = round((float) $orders->sum('net_settlement'), 2);

        $columns = [
            ['key' => 'order_number', 'label' => 'Order Ref', 'type' => 'text', 'selected' => true],
            ['key' => 'date', 'label' => 'Date & Time', 'type' => 'date', 'selected' => true],
            ['key' => 'customer', 'label' => 'Customer', 'type' => 'text', 'selected' => true],
            ['key' => 'store', 'label' => 'Storefront', 'type' => 'text', 'selected' => true],
            ['key' => 'status', 'label' => 'Fulfillment Status', 'type' => 'status', 'selected' => true],
            ['key' => 'items_count', 'label' => 'Units', 'type' => 'number', 'selected' => false],
            ['key' => 'subtotal', 'label' => 'Subtotal', 'type' => 'money', 'selected' => true],
            ['key' => 'delivery_fee', 'label' => 'Delivery', 'type' => 'money', 'selected' => false],
            ['key' => 'net_settlement', 'label' => 'Net Payout', 'type' => 'money', 'selected' => true],
        ];

        return [
            'kpis' => [
                ['label' => 'Total Orders Found', 'value' => count($rows), 'format' => 'number', 'tone' => 'blue'],
                ['label' => 'Total Revenue', 'value' => $totalSubtotal, 'format' => 'money', 'tone' => 'gold'],
                ['label' => 'Net Payout Amount', 'value' => $totalNet, 'format' => 'money', 'tone' => 'green'],
                ['label' => 'Average Order', 'value' => count($rows) ? round($totalSubtotal / count($rows), 2) : 0, 'format' => 'money', 'tone' => 'slate'],
            ],
            'columns' => $columns,
            'rows' => $rows,
            'totals' => [
                'order_number' => 'Total (' . count($rows) . ' orders)',
                'subtotal' => $totalSubtotal,
                'net_settlement' => $totalNet,
                'delivery_fee' => round((float) $orders->sum('delivery_fee'), 2),
                'items_count' => (int) $orders->sum(fn ($o) => $o->items->sum('qty')),
            ],
        ];
    }

    protected function generateInventoryStock(int $tenantId, Carbon $start, Carbon $end, ?int $storeId, string $status, ?int $categoryId, ?float $min, ?float $max, Request $request): array
    {
        $products = Product::query()
            ->where('tenant_id', $tenantId)
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->when($categoryId, fn ($q) => $q->where('category_id', $categoryId))
            ->with(['category:id,name', 'store:id,name', 'variants.inventory'])
            ->get();

        $rows = $products->map(function ($p) {
            $stock = (int) $p->stock;
            $stockStatus = $stock <= 0 ? 'out_of_stock' : ($stock <= 5 ? 'low_stock' : 'in_stock');
            $costEst = round((float) $p->price * 0.65, 2);
            $totalVal = round($stock * (float) $p->price, 2);

            return [
                'id' => $p->id,
                'name' => $p->name,
                'sku' => $p->sku ?: 'SKU-' . $p->id,
                'category' => $p->category?->name ?? 'General',
                'store' => $p->store?->name ?? 'Default Store',
                'stock' => $stock,
                'status' => $stockStatus,
                'price' => (float) $p->price,
                'cost_estimate' => $costEst,
                'total_valuation' => $totalVal,
            ];
        })->values()->all();

        $totalValuation = array_sum(array_column($rows, 'total_valuation'));
        $totalUnits = array_sum(array_column($rows, 'stock'));
        $lowStockCount = count(array_filter($rows, fn ($r) => $r['status'] === 'low_stock'));
        $outOfStockCount = count(array_filter($rows, fn ($r) => $r['status'] === 'out_of_stock'));

        $columns = [
            ['key' => 'name', 'label' => 'Product Name', 'type' => 'text', 'selected' => true],
            ['key' => 'sku', 'label' => 'SKU', 'type' => 'text', 'selected' => true],
            ['key' => 'category', 'label' => 'Category', 'type' => 'text', 'selected' => true],
            ['key' => 'store', 'label' => 'Storefront', 'type' => 'text', 'selected' => false],
            ['key' => 'stock', 'label' => 'Stock Quantity', 'type' => 'number', 'selected' => true],
            ['key' => 'status', 'label' => 'Stock Status', 'type' => 'status', 'selected' => true],
            ['key' => 'price', 'label' => 'Retail Price', 'type' => 'money', 'selected' => true],
            ['key' => 'cost_estimate', 'label' => 'Est. Cost', 'type' => 'money', 'selected' => false],
            ['key' => 'total_valuation', 'label' => 'Total Asset Value', 'type' => 'money', 'selected' => true],
        ];

        return [
            'kpis' => [
                ['label' => 'Total SKUs / Products', 'value' => count($rows), 'format' => 'number', 'tone' => 'blue'],
                ['label' => 'Total Units on Hand', 'value' => $totalUnits, 'format' => 'number', 'tone' => 'slate'],
                ['label' => 'Inventory Asset Value', 'value' => $totalValuation, 'format' => 'money', 'tone' => 'gold'],
                ['label' => 'Low / Out of Stock', 'value' => $lowStockCount + $outOfStockCount, 'format' => 'number', 'tone' => $lowStockCount > 0 ? 'danger' : 'green'],
            ],
            'columns' => $columns,
            'rows' => $rows,
            'totals' => [
                'name' => 'Total (' . count($rows) . ' products)',
                'stock' => $totalUnits,
                'total_valuation' => $totalValuation,
            ],
        ];
    }

    protected function generateInvoicesBreakdown(int $tenantId, Carbon $start, Carbon $end, ?int $storeId, string $status, ?int $categoryId, ?float $min, ?float $max, Request $request): array
    {
        $invoices = AccountingInvoice::query()
            ->where('tenant_id', $tenantId)
            ->whereBetween('issue_date', [$start->toDateString(), $end->toDateString()])
            ->when($status, fn ($q) => $q->where('status', $status))
            ->when($min !== null, fn ($q) => $q->where('total', '>=', $min))
            ->when($max !== null, fn ($q) => $q->where('total', '<=', $max))
            ->with(['contact:id,name', 'items'])
            ->latest('issue_date')
            ->get();

        $rows = $invoices->map(fn ($inv) => [
            'id' => $inv->id,
            'number' => $inv->number,
            'issue_date' => Carbon::parse($inv->issue_date)->format('M d, Y'),
            'due_date' => Carbon::parse($inv->due_date)->format('M d, Y'),
            'customer_name' => $inv->customer_name,
            'status' => $inv->status,
            'subtotal' => (float) $inv->subtotal,
            'tax_total' => (float) $inv->tax_total,
            'total' => (float) $inv->total,
            'amount_paid' => (float) $inv->amount_paid,
            'balance_due' => (float) $inv->balance_due,
        ])->values()->all();

        $totalAmount = array_sum(array_column($rows, 'total'));
        $totalPaid = array_sum(array_column($rows, 'amount_paid'));
        $totalDue = array_sum(array_column($rows, 'balance_due'));

        $columns = [
            ['key' => 'number', 'label' => 'Invoice #', 'type' => 'text', 'selected' => true],
            ['key' => 'issue_date', 'label' => 'Issue Date', 'type' => 'date', 'selected' => true],
            ['key' => 'customer_name', 'label' => 'Client / Customer', 'type' => 'text', 'selected' => true],
            ['key' => 'due_date', 'label' => 'Due Date', 'type' => 'date', 'selected' => true],
            ['key' => 'status', 'label' => 'Payment Status', 'type' => 'status', 'selected' => true],
            ['key' => 'subtotal', 'label' => 'Subtotal', 'type' => 'money', 'selected' => false],
            ['key' => 'tax_total', 'label' => 'Tax', 'type' => 'money', 'selected' => false],
            ['key' => 'total', 'label' => 'Total Invoiced', 'type' => 'money', 'selected' => true],
            ['key' => 'amount_paid', 'label' => 'Paid', 'type' => 'money', 'selected' => true],
            ['key' => 'balance_due', 'label' => 'Outstanding Due', 'type' => 'money', 'selected' => true],
        ];

        return [
            'kpis' => [
                ['label' => 'Total Invoices', 'value' => count($rows), 'format' => 'number', 'tone' => 'blue'],
                ['label' => 'Gross Invoiced', 'value' => $totalAmount, 'format' => 'money', 'tone' => 'gold'],
                ['label' => 'Cash Collected', 'value' => $totalPaid, 'format' => 'money', 'tone' => 'green'],
                ['label' => 'Receivables (Due)', 'value' => $totalDue, 'format' => 'money', 'tone' => $totalDue > 0 ? 'gold' : 'slate'],
            ],
            'columns' => $columns,
            'rows' => $rows,
            'totals' => [
                'number' => 'Total (' . count($rows) . ' invoices)',
                'total' => $totalAmount,
                'amount_paid' => $totalPaid,
                'balance_due' => $totalDue,
            ],
        ];
    }

    protected function generateExpensesBills(int $tenantId, Carbon $start, Carbon $end, ?int $storeId, string $status, ?int $categoryId, ?float $min, ?float $max, Request $request): array
    {
        $expenses = AccountingExpense::query()
            ->where('tenant_id', $tenantId)
            ->whereBetween('expense_date', [$start->toDateString(), $end->toDateString()])
            ->when($status, fn ($q) => $q->where('status', $status))
            ->when($min !== null, fn ($q) => $q->where('total', '>=', $min))
            ->when($max !== null, fn ($q) => $q->where('total', '<=', $max))
            ->latest('expense_date')
            ->get();

        $rows = $expenses->map(fn ($exp) => [
            'id' => $exp->id,
            'number' => $exp->number,
            'expense_date' => Carbon::parse($exp->expense_date)->format('M d, Y'),
            'vendor_name' => $exp->vendor_name ?: 'Vendor',
            'category' => $exp->category,
            'description' => $exp->description ?: 'Operating Expense',
            'status' => $exp->status,
            'amount' => (float) $exp->amount,
            'tax_amount' => (float) $exp->tax_amount,
            'total' => (float) $exp->total,
        ])->values()->all();

        $totalExpenses = array_sum(array_column($rows, 'total'));
        $totalTax = array_sum(array_column($rows, 'tax_amount'));

        $columns = [
            ['key' => 'number', 'label' => 'Bill #', 'type' => 'text', 'selected' => true],
            ['key' => 'expense_date', 'label' => 'Bill Date', 'type' => 'date', 'selected' => true],
            ['key' => 'vendor_name', 'label' => 'Vendor / Supplier', 'type' => 'text', 'selected' => true],
            ['key' => 'category', 'label' => 'Expense Category', 'type' => 'text', 'selected' => true],
            ['key' => 'description', 'label' => 'Memo / Details', 'type' => 'text', 'selected' => true],
            ['key' => 'status', 'label' => 'Payment Status', 'type' => 'status', 'selected' => true],
            ['key' => 'amount', 'label' => 'Net Amount', 'type' => 'money', 'selected' => false],
            ['key' => 'tax_amount', 'label' => 'Tax Paid', 'type' => 'money', 'selected' => false],
            ['key' => 'total', 'label' => 'Total Cost', 'type' => 'money', 'selected' => true],
        ];

        return [
            'kpis' => [
                ['label' => 'Total Bills', 'value' => count($rows), 'format' => 'number', 'tone' => 'blue'],
                ['label' => 'Total Operating Cost', 'value' => $totalExpenses, 'format' => 'money', 'tone' => 'danger'],
                ['label' => 'Input Tax Paid', 'value' => $totalTax, 'format' => 'money', 'tone' => 'slate'],
            ],
            'columns' => $columns,
            'rows' => $rows,
            'totals' => [
                'number' => 'Total (' . count($rows) . ' bills)',
                'amount' => array_sum(array_column($rows, 'amount')),
                'tax_amount' => $totalTax,
                'total' => $totalExpenses,
            ],
        ];
    }

    protected function generatePaymentsLedger(int $tenantId, Carbon $start, Carbon $end, ?int $storeId, string $status, ?int $categoryId, ?float $min, ?float $max, Request $request): array
    {
        $payments = AccountingPayment::query()
            ->where('tenant_id', $tenantId)
            ->whereBetween('paid_on', [$start->toDateString(), $end->toDateString()])
            ->when($status, fn ($q) => $q->where('direction', $status))
            ->with(['invoice:id,number,customer_name', 'expense:id,number,vendor_name'])
            ->latest('paid_on')
            ->get();

        $rows = $payments->map(fn ($p) => [
            'id' => $p->id,
            'paid_on' => Carbon::parse($p->paid_on)->format('M d, Y'),
            'reference' => $p->reference ?: 'PAY-' . $p->id,
            'related' => $p->invoice ? ('Invoice ' . $p->invoice->number . ' (' . $p->invoice->customer_name . ')') : ($p->expense ? ('Bill ' . $p->expense->number) : 'Direct Entry'),
            'method' => ucwords(str_replace('_', ' ', $p->method)),
            'direction' => $p->direction === 'incoming' ? 'Money In' : 'Money Out',
            'amount' => (float) $p->amount,
            'currency' => $p->currency,
        ])->values()->all();

        $moneyIn = (float) $payments->where('direction', 'incoming')->sum('amount');
        $moneyOut = (float) $payments->where('direction', 'outgoing')->sum('amount');

        $columns = [
            ['key' => 'paid_on', 'label' => 'Date', 'type' => 'date', 'selected' => true],
            ['key' => 'reference', 'label' => 'Reference', 'type' => 'text', 'selected' => true],
            ['key' => 'related', 'label' => 'Source Document', 'type' => 'text', 'selected' => true],
            ['key' => 'method', 'label' => 'Payment Method', 'type' => 'text', 'selected' => true],
            ['key' => 'direction', 'label' => 'Direction', 'type' => 'status', 'selected' => true],
            ['key' => 'amount', 'label' => 'Amount', 'type' => 'money', 'selected' => true],
        ];

        return [
            'kpis' => [
                ['label' => 'Cash Collected (In)', 'value' => $moneyIn, 'format' => 'money', 'tone' => 'green'],
                ['label' => 'Cash Disbursed (Out)', 'value' => $moneyOut, 'format' => 'money', 'tone' => 'danger'],
                ['label' => 'Net Cash Movement', 'value' => $moneyIn - $moneyOut, 'format' => 'money', 'tone' => ($moneyIn >= $moneyOut ? 'green' : 'danger')],
            ],
            'columns' => $columns,
            'rows' => $rows,
            'totals' => [
                'paid_on' => 'Total (' . count($rows) . ' movements)',
                'amount' => $moneyIn - $moneyOut,
            ],
        ];
    }

    protected function generateAuditTrail(int $tenantId, Carbon $start, Carbon $end, ?int $storeId, string $status, ?int $categoryId, ?float $min, ?float $max, Request $request): array
    {
        $logs = AuditLog::query()
            ->where('tenant_id', $tenantId)
            ->whereBetween('created_at', [$start, $end])
            ->with('actor:id,name,email')
            ->latest('created_at')
            ->limit(150)
            ->get();

        $rows = $logs->map(fn ($log) => [
            'id' => $log->id,
            'date' => $log->created_at->format('M d, Y H:i:s'),
            'actor' => $log->actor?->name ?? 'System',
            'action' => ucwords(str_replace(['.', '_'], ' ', $log->action)),
            'subject' => class_basename($log->subject_type) . ' #' . $log->subject_id,
            'ip' => $log->ip ?: '127.0.0.1',
        ])->values()->all();

        $columns = [
            ['key' => 'date', 'label' => 'Timestamp', 'type' => 'date', 'selected' => true],
            ['key' => 'actor', 'label' => 'Staff / User', 'type' => 'text', 'selected' => true],
            ['key' => 'action', 'label' => 'Action Performed', 'type' => 'text', 'selected' => true],
            ['key' => 'subject', 'label' => 'Target Record', 'type' => 'text', 'selected' => true],
            ['key' => 'ip', 'label' => 'IP Address', 'type' => 'text', 'selected' => false],
        ];

        return [
            'kpis' => [
                ['label' => 'Total Audited Events', 'value' => count($rows), 'format' => 'number', 'tone' => 'blue'],
                ['label' => 'Unique Staff Actors', 'value' => count(array_unique(array_column($rows, 'actor'))), 'format' => 'number', 'tone' => 'slate'],
            ],
            'columns' => $columns,
            'rows' => $rows,
            'totals' => [
                'date' => 'Total (' . count($rows) . ' events)',
            ],
        ];
    }

    // --------------------------------------------------------------------------
    // Metadata & Definitions
    // --------------------------------------------------------------------------

    protected function reportCategories(): array
    {
        return [
            [
                'name' => 'Sales & Orders Reports',
                'icon' => 'orders',
                'reports' => [
                    ['key' => 'sales_summary', 'label' => 'Sales Summary Report', 'favorite' => true],
                    ['key' => 'orders_master', 'label' => 'Orders Master List', 'favorite' => true],
                    ['key' => 'orders_by_status', 'label' => 'Orders by Status Breakdown', 'favorite' => false],
                    ['key' => 'orders_cancelled', 'label' => 'Cancelled & Refunded Orders', 'favorite' => false],
                    ['key' => 'fulfillment_delivery', 'label' => 'Fulfillment & Delivery List', 'favorite' => false],
                    ['key' => 'discounts_coupons', 'label' => 'Discounts & Coupon Redemptions', 'favorite' => false],
                    ['key' => 'geographic_sales', 'label' => 'Geographic & Regional Sales', 'favorite' => false],
                ],
            ],
            [
                'name' => 'Catalog & Inventory Reports',
                'icon' => 'inventory',
                'reports' => [
                    ['key' => 'inventory_stock', 'label' => 'Stock On Hand & Availability', 'favorite' => true],
                    ['key' => 'low_stock_alerts', 'label' => 'Low Stock & Reorder Alerts', 'favorite' => true],
                    ['key' => 'inventory_valuation', 'label' => 'Inventory Valuation Report', 'favorite' => false],
                    ['key' => 'best_sellers', 'label' => 'Best-Selling Products', 'favorite' => false],
                    ['key' => 'slow_moving_stock', 'label' => 'Slow Moving & Aging Stock', 'favorite' => false],
                    ['key' => 'category_performance', 'label' => 'Category & Collection Performance', 'favorite' => false],
                ],
            ],
            [
                'name' => 'Finance & Accounting Reports',
                'icon' => 'finance',
                'reports' => [
                    ['key' => 'invoices_breakdown', 'label' => 'Customer Invoices Breakdown', 'favorite' => true],
                    ['key' => 'expenses_bills', 'label' => 'Bills & Operating Expenses', 'favorite' => false],
                    ['key' => 'payments_ledger', 'label' => 'Payments & Cash Movement Ledger', 'favorite' => false],
                    ['key' => 'pnl_statement', 'label' => 'Profit & Loss Statement (P&L)', 'favorite' => true],
                    ['key' => 'tax_summary', 'label' => 'Tax Summary & Collected Liability', 'favorite' => false],
                    ['key' => 'settlements_payouts', 'label' => 'Platform Settlements & Payouts', 'favorite' => false],
                ],
            ],
            [
                'name' => 'Customers & Vendors Reports',
                'icon' => 'users',
                'reports' => [
                    ['key' => 'customers_directory', 'label' => 'Customer Directory & Spending', 'favorite' => false],
                    ['key' => 'repeat_buyers', 'label' => 'Repeat Buyers & Customer Retention', 'favorite' => false],
                    ['key' => 'vendor_payables', 'label' => 'Vendor & Supplier Directory', 'favorite' => false],
                ],
            ],
            [
                'name' => 'Marketing & Advertising Reports',
                'icon' => 'ads',
                'reports' => [
                    ['key' => 'ads_performance', 'label' => 'Ad Campaign Performance & ROI', 'favorite' => false],
                    ['key' => 'traffic_funnel', 'label' => 'Storefront Traffic & Funnel', 'favorite' => false],
                    ['key' => 'store_comparison', 'label' => 'Multi-Store Performance Comparison', 'favorite' => false],
                ],
            ],
            [
                'name' => 'Audit & Operations Reports',
                'icon' => 'activity',
                'reports' => [
                    ['key' => 'audit_trail', 'label' => 'Tenant Activity Audit Trail', 'favorite' => false],
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
            'key' => 'sales_summary',
            'label' => 'Sales Summary Report',
            'category' => 'Sales & Orders Reports',
        ];
    }

    protected function reportHelpGuide(string $key): array
    {
        $guides = [
            'sales_summary' => [
                'summary' => 'A Sales Summary Report captures all gross and net transactions processed across your tenant storefronts. It captures all the information about orders, revenue, customer discounts, and net settlements so you can review sales trajectory and cash realization.',
                'compare_heading' => 'How can you compare the report data with other reports?',
                'points' => [
                    'Sales Summary can be matched with the Cash & Payments Ledger report for the same date window to verify deposited funds versus recorded order totals.',
                    'Match gross sales against the Invoices Breakdown report to ensure offline or B2B sales reconcile with direct checkout orders.',
                    'Compare sales volume with Ad Campaign Performance to calculate true Return on Ad Spend (ROAS) and Customer Acquisition Cost (CAC).',
                ],
            ],
            'orders_master' => [
                'summary' => 'The Orders Master List captures every order placed by customers, including fulfillment progress, carrier details, customer identity, and payment settlement statuses. It serves as your primary operational registry for dispatch and logistics.',
                'compare_heading' => 'How can you compare the report data with other reports?',
                'points' => [
                    'Cross-reference with the Fulfillment & Delivery List to confirm all orders marked "Shipped" have tracking numbers assigned.',
                    'Match cancelled orders with the Cancelled & Refunded Orders report to audit refund reasons and stock return confirmations.',
                ],
            ],
            'inventory_stock' => [
                'summary' => 'The Stock On Hand report is used to monitor real-time available quantities, out-of-stock items, and total capital tied up in inventory across your warehouses and store channels.',
                'compare_heading' => 'How can you compare the report data with other reports?',
                'points' => [
                    'Match low-stock items with the Best-Selling Products report to prioritize purchase orders and prevent stockouts on high-velocity items.',
                    'Compare total inventory valuation against your Balance Sheet or Accounting Ledger for accurate asset reporting.',
                ],
            ],
            'invoices_breakdown' => [
                'summary' => 'The Customer Invoices Breakdown provides a transparent view of all B2B and sales invoices issued, payments received against them, and outstanding accounts receivable balances.',
                'compare_heading' => 'How can you compare the report data with other reports?',
                'points' => [
                    'Compare with the Accounts Receivable Aging report in Accounting to target overdue payments beyond 30 and 60 days.',
                    'Match recorded invoice payments against the Bank Reconciliation ledger to confirm bank clearance.',
                ],
            ],
            'expenses_bills' => [
                'summary' => 'The Bills & Operating Expenses report tracks all procurement commitments, vendor bills, software subscriptions, shipping charges, and tenant operating costs.',
                'compare_heading' => 'How can you compare the report data with other reports?',
                'points' => [
                    'Compare with your Profit & Loss Statement (P&L) to assess operating expense ratios relative to gross revenue.',
                    'Verify input tax paid against your Tax Summary report to maximize tax credits and deductions.',
                ],
            ],
        ];

        return $guides[$key] ?? [
            'summary' => 'This report provides a structured overview of ' . ucwords(str_replace('_', ' ', $key)) . ' across your tenant workspace for the selected reporting period.',
            'compare_heading' => 'How can you compare the report data with other reports?',
            'points' => [
                'Cross-reference the date range with your main Finance Overview to ensure consistency.',
                'Export to PDF or CSV for auditing, offline records, or sharing with external accountants.',
            ],
        ];
    }
}
