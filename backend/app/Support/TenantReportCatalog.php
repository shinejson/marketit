<?php

namespace App\Support;

use App\Models\TenantRole;

/**
 * The tenant Report Center catalogue: every report the console can build, the
 * permission that unlocks it, and the generator that produces its rows.
 *
 * This is the single source of truth for /tenant/reports. Two invariants keep
 * it honest, and both are covered by TenantReportCenterTest:
 *
 *   1. `permission` must be a key from TenantRole::permissionGroups(), so a
 *      report can never be reachable by a staff member whose role does not
 *      carry it — the tenant admin stays in control of who sees what.
 *   2. `generator` must name a real method on TenantReportController. A report
 *      without one is advertised as unavailable and answers 501, instead of
 *      quietly returning another report's numbers under a different title.
 *
 * The decision helpers deliberately take a plain permission array rather than a
 * User, so the authorization rules can be reasoned about (and unit tested)
 * without a database.
 */
final class TenantReportCatalog
{
    /** Longest window one report may cover, so a stray date cannot fan out. */
    public const MAX_RANGE_DAYS = 366;

    /** Permission required to download a generated report (CSV / PDF). */
    public const PERMISSION_EXPORT = 'reports.export';

    /** @var array<string, array<string, mixed>>|null */
    protected static ?array $flat = null;

    /**
     * Every report, grouped the way the console sidebar shows them.
     *
     * @return array<int, array{name: string, icon: string, reports: array<int, array<string, mixed>>}>
     */
    public static function definitions(): array
    {
        return [
            [
                'name' => 'Sales & Orders Reports',
                'icon' => 'orders',
                'reports' => [
                    self::report('sales_summary', 'Sales Summary Report', 'orders.view', 'generateSalesSummary', true),
                    self::report('orders_master', 'Orders Master List', 'orders.view', 'generateOrdersMaster', true, [
                        // Buyer contact details only travel with the report when
                        // the caller may also open the customer directory.
                        'customer_email' => 'customers.view',
                    ]),
                    self::report('orders_by_status', 'Orders by Status Breakdown', 'orders.view'),
                    self::report('orders_cancelled', 'Cancelled & Refunded Orders', 'orders.view'),
                    self::report('fulfillment_delivery', 'Fulfillment & Delivery List', 'orders.view'),
                    self::report('discounts_coupons', 'Discounts & Coupon Redemptions', 'orders.view'),
                    self::report('geographic_sales', 'Geographic & Regional Sales', 'orders.view'),
                ],
            ],
            [
                'name' => 'Catalog & Inventory Reports',
                'icon' => 'inventory',
                'reports' => [
                    self::report('inventory_stock', 'Stock On Hand & Availability', 'inventory.view', 'generateInventoryStock', true),
                    self::report('low_stock_alerts', 'Low Stock & Reorder Alerts', 'inventory.view', null, true),
                    self::report('inventory_valuation', 'Inventory Valuation Report', 'inventory.view'),
                    self::report('best_sellers', 'Best-Selling Products', 'catalog.view'),
                    self::report('slow_moving_stock', 'Slow Moving & Aging Stock', 'inventory.view'),
                    self::report('category_performance', 'Category & Collection Performance', 'catalog.view'),
                ],
            ],
            [
                'name' => 'Finance & Accounting Reports',
                'icon' => 'finance',
                'reports' => [
                    self::report('invoices_breakdown', 'Customer Invoices Breakdown', 'finance.view', 'generateInvoicesBreakdown', true),
                    self::report('expenses_bills', 'Bills & Operating Expenses', 'finance.view', 'generateExpensesBills'),
                    self::report('payments_ledger', 'Payments & Cash Movement Ledger', 'finance.view', 'generatePaymentsLedger'),
                    self::report('pnl_statement', 'Profit & Loss Statement (P&L)', 'finance.view', null, true),
                    self::report('tax_summary', 'Tax Summary & Collected Liability', 'finance.view'),
                    self::report('settlements_payouts', 'Platform Settlements & Payouts', 'finance.view'),
                ],
            ],
            [
                'name' => 'Customers & Vendors Reports',
                'icon' => 'users',
                'reports' => [
                    self::report('customers_directory', 'Customer Directory & Spending', 'customers.view'),
                    self::report('repeat_buyers', 'Repeat Buyers & Customer Retention', 'customers.view'),
                    self::report('vendor_payables', 'Vendor & Supplier Directory', 'finance.view'),
                ],
            ],
            [
                'name' => 'Marketing & Advertising Reports',
                'icon' => 'ads',
                'reports' => [
                    self::report('ads_performance', 'Ad Campaign Performance & ROI', 'marketing.view'),
                    self::report('traffic_funnel', 'Storefront Traffic & Funnel', 'analytics.view'),
                    self::report('store_comparison', 'Multi-Store Performance Comparison', 'analytics.view'),
                ],
            ],
            [
                'name' => 'Audit & Operations Reports',
                'icon' => 'activity',
                'reports' => [
                    // Names, emails and IP addresses of everyone who touched the
                    // workspace: the same audience as the system-user directory.
                    self::report('audit_trail', 'Tenant Activity Audit Trail', 'team.view', 'generateAuditTrail'),
                ],
            ],
        ];
    }

    /**
     * @return array<string, array<string, mixed>> keyed by report key
     */
    public static function flat(): array
    {
        if (static::$flat !== null) {
            return static::$flat;
        }

        $flat = [];
        foreach (static::definitions() as $category) {
            foreach ($category['reports'] as $report) {
                $flat[$report['key']] = $report + ['category' => $category['name']];
            }
        }

        return static::$flat = $flat;
    }

    /** @return array<string, mixed>|null */
    public static function definition(string $key): ?array
    {
        return static::flat()[$key] ?? null;
    }

    /** The tenant permission that unlocks a report, or null when unknown. */
    public static function permissionFor(string $key): ?string
    {
        $permission = static::definition($key)['permission'] ?? null;

        return is_string($permission) ? $permission : null;
    }

    /** The controller method that builds a report, or null when not built yet. */
    public static function generatorFor(string $key): ?string
    {
        $generator = static::definition($key)['generator'] ?? null;

        return is_string($generator) ? $generator : null;
    }

    /** Columns that carry somebody else's personal data, and who may see them. */
    public static function restrictedColumns(string $key): array
    {
        $columns = static::definition($key)['restricted'] ?? [];

        return is_array($columns) ? $columns : [];
    }

    public static function isKnown(string $key): bool
    {
        return static::definition($key) !== null;
    }

    /** True when a generator exists, i.e. the report can actually be produced. */
    public static function isReady(string $key): bool
    {
        return static::generatorFor($key) !== null;
    }

    /**
     * May this permission set open this report?
     *
     * @param  string[]  $permissions
     */
    public static function canAccess(array $permissions, string $key): bool
    {
        $required = static::permissionFor($key);

        return $required !== null && in_array($required, $permissions, true);
    }

    /** @param  string[]  $permissions */
    public static function canExport(array $permissions): bool
    {
        return in_array(self::PERMISSION_EXPORT, $permissions, true);
    }

    /**
     * Every report key this permission set may open.
     *
     * @param  string[]  $permissions
     * @return string[]
     */
    public static function accessibleKeys(array $permissions): array
    {
        return array_values(array_filter(
            array_keys(static::flat()),
            fn (string $key) => static::canAccess($permissions, $key)
        ));
    }

    /**
     * The catalogue trimmed to what this person may open. Categories that end up
     * empty are dropped so the sidebar never advertises a locked section.
     *
     * @param  string[]  $permissions
     * @return array<int, array{name: string, icon: string, reports: array<int, array<string, mixed>>}>
     */
    public static function categoriesFor(array $permissions): array
    {
        $categories = [];

        foreach (static::definitions() as $category) {
            $reports = array_values(array_filter(
                $category['reports'],
                fn (array $report) => static::canAccess($permissions, $report['key'])
            ));

            if ($reports === []) {
                continue;
            }

            $categories[] = [
                'name' => $category['name'],
                'icon' => $category['icon'],
                'reports' => $reports,
            ];
        }

        return $categories;
    }

    /**
     * Shape one catalogue entry. `generator` stays null until the report is
     * actually implemented; `restricted` maps a column key to the permission
     * needed to see its contents.
     *
     * @param  array<string, string>  $restricted
     * @return array<string, mixed>
     */
    protected static function report(
        string $key,
        string $label,
        string $permission,
        ?string $generator = null,
        bool $favorite = false,
        array $restricted = [],
    ): array {
        return [
            'key' => $key,
            'label' => $label,
            'favorite' => $favorite,
            'permission' => $permission,
            'generator' => $generator,
            'available' => $generator !== null,
            'restricted' => $restricted,
        ];
    }

    /**
     * Sanity check used by the test suite: every permission the catalogue asks
     * for must exist in the tenant permission catalog, and every generator must
     * exist on the controller.
     *
     * @param  class-string  $controller
     * @return string[] list of problems (empty when the catalogue is sound)
     */
    public static function audit(string $controller): array
    {
        $problems = [];
        $known = TenantRole::permissionKeys();

        foreach (static::flat() as $key => $report) {
            if (! in_array($report['permission'], $known, true)) {
                $problems[] = "Report [{$key}] requires unknown permission [{$report['permission']}].";
            }

            foreach ($report['restricted'] as $permission) {
                if (! in_array($permission, $known, true)) {
                    $problems[] = "Report [{$key}] restricts a column with unknown permission [{$permission}].";
                }
            }

            if ($report['generator'] !== null && ! method_exists($controller, $report['generator'])) {
                $problems[] = "Report [{$key}] points at missing generator [{$report['generator']}].";
            }
        }

        return $problems;
    }
}
