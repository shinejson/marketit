<?php

namespace App\Services\Currency;

use App\Models\Tenant;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Re-prices a whole workspace when its settings currency changes.
 *
 * Switching the tenant currency from USD to GHS without touching the data
 * would simply relabel "$120" as "GH₵120" — the number is now a lie. This
 * service multiplies every stored money column by the USD→GHS factor so the
 * catalog, invoices, pipeline and budgets all read as real cedi amounts, and
 * stamps the new code onto the per-record `currency` columns so downstream
 * formatting agrees with the settings page.
 *
 * Every table is guarded by Schema::hasTable/hasColumn: modules a deployment
 * has not migrated yet are skipped instead of exploding mid-conversion.
 */
class TenantCurrencyConverter
{
    public function __construct(private CurrencyService $currency)
    {
    }

    /**
     * Tenant-scoped tables that hold money, with the columns to scale and the
     * optional per-row currency column to restamp.
     *
     * @return array<string, array{columns: string[], currency?: string, parent?: array{table: string, key: string}}>
     */
    protected function map(): array
    {
        return [
            'products' => ['columns' => ['price', 'compare_at_price', 'cost_price']],
            'product_variants' => [
                'columns' => ['price_override', 'cost_price'],
                'parent' => ['table' => 'products', 'key' => 'product_id'],
            ],
            'stores' => ['columns' => [], 'currency' => 'currency'],
            'ad_campaigns' => ['columns' => ['daily_budget', 'total_budget', 'bid_cpc', 'spent_today', 'spent_total']],

            'accounting_contacts' => ['columns' => ['opening_balance'], 'currency' => 'currency'],
            'accounting_invoices' => [
                'columns' => ['subtotal', 'tax_total', 'discount_total', 'total', 'amount_paid', 'balance_due'],
                'currency' => 'currency',
            ],
            'accounting_invoice_items' => [
                'columns' => ['unit_price', 'line_subtotal', 'line_tax', 'line_total'],
                'parent' => ['table' => 'accounting_invoices', 'key' => 'invoice_id'],
            ],
            'accounting_expenses' => ['columns' => ['amount', 'tax_amount', 'total'], 'currency' => 'currency'],
            'accounting_payments' => ['columns' => ['amount'], 'currency' => 'currency'],
            'purchase_orders' => ['columns' => ['subtotal', 'tax_total', 'total'], 'currency' => 'currency'],
            'purchase_order_items' => [
                'columns' => ['unit_cost', 'line_subtotal', 'line_tax', 'line_total'],
                'parent' => ['table' => 'purchase_orders', 'key' => 'purchase_order_id'],
            ],
            'accounting_journal_entries' => ['columns' => ['total_debit', 'total_credit']],
            'accounting_journal_lines' => [
                'columns' => ['debit', 'credit'],
                'parent' => ['table' => 'accounting_journal_entries', 'key' => 'journal_entry_id'],
            ],
            'accounting_bank_accounts' => ['columns' => ['opening_balance'], 'currency' => 'currency'],
            'accounting_bank_transactions' => ['columns' => ['amount']],

            'sales_customers' => ['columns' => [], 'currency' => 'currency'],
            'sales_leads' => ['columns' => ['estimated_value'], 'currency' => 'currency'],
            'sales_opportunities' => ['columns' => ['expected_value'], 'currency' => 'currency'],
            'sales_quotes' => [
                'columns' => ['subtotal', 'tax_total', 'discount_total', 'total'],
                'currency' => 'currency',
            ],
            'sales_quote_items' => [
                'columns' => ['unit_price', 'line_subtotal', 'line_tax', 'line_total'],
                'parent' => ['table' => 'sales_quotes', 'key' => 'quote_id'],
            ],
        ];
    }

    /**
     * What a conversion would touch, without writing anything. Used by the
     * settings screen to preview "1 USD = 12.45 GHS, 48 products re-priced".
     */
    public function preview(Tenant $tenant, string $from, string $to): array
    {
        $from = strtoupper($from);
        $to = strtoupper($to);
        $factor = $this->currency->factor($from, $to);

        $sample = [];
        if (Schema::hasTable('products')) {
            $sample = DB::table('products')
                ->where('tenant_id', $tenant->id)
                ->orderBy('id')
                ->limit(3)
                ->get(['id', 'name', 'price'])
                ->map(fn ($row) => [
                    'id' => $row->id,
                    'name' => $row->name,
                    'before' => round((float) $row->price, 2),
                    'after' => round((float) $row->price * $factor, $this->currency->decimals($to)),
                ])->all();
        }

        return [
            'from' => $from,
            'to' => $to,
            'factor' => round($factor, 8),
            'from_symbol' => $this->currency->symbol($from),
            'to_symbol' => $this->currency->symbol($to),
            'records' => $this->countRecords($tenant),
            'sample' => $sample,
        ];
    }

    /**
     * Apply the conversion. Returns a per-table summary of the rows updated.
     */
    public function convert(Tenant $tenant, string $from, string $to): array
    {
        $from = strtoupper($from);
        $to = strtoupper($to);

        if ($from === $to) {
            return ['factor' => 1.0, 'from' => $from, 'to' => $to, 'tables' => [], 'rows' => 0];
        }

        $factor = $this->currency->factor($from, $to);
        $decimals = $this->currency->decimals($to);
        $tables = [];
        $total = 0;

        DB::transaction(function () use ($tenant, $from, $to, $factor, $decimals, &$tables, &$total) {
            foreach ($this->map() as $table => $spec) {
                if (! Schema::hasTable($table)) {
                    continue;
                }

                $scope = fn () => $this->scope($table, $spec, $tenant);

                // %F avoids scientific notation sneaking into the SQL for very
                // large or small rates (NGN, XOF…).
                $multiplier = sprintf('%.10F', $factor);

                $updates = [];
                foreach ($spec['columns'] as $column) {
                    if (Schema::hasColumn($table, $column)) {
                        // NULL stays NULL (an unset compare-at price is not 0),
                        // and ROUND() keeps SQLite and MySQL in agreement.
                        $updates[$column] = DB::raw(
                            "CASE WHEN $column IS NULL THEN NULL ELSE ROUND($column * $multiplier, $decimals) END"
                        );
                    }
                }

                $rows = 0;
                if ($updates) {
                    $rows = $scope()->update($updates);
                }

                $currencyColumn = $spec['currency'] ?? null;
                if ($currencyColumn && Schema::hasColumn($table, $currencyColumn)) {
                    $stamped = $scope()->update([$currencyColumn => $to]);
                    $rows = max($rows, $stamped);
                }

                if ($rows > 0) {
                    $tables[$table] = $rows;
                    $total += $rows;
                }
            }

            // Money-denominated goals on the settings record itself.
            $this->convertGoals($tenant, $factor);
        });

        return [
            'from' => $from,
            'to' => $to,
            'factor' => round($factor, 8),
            'from_symbol' => $this->currency->symbol($from),
            'to_symbol' => $this->currency->symbol($to),
            'tables' => $tables,
            'rows' => $total,
        ];
    }

    /** Builder restricted to one tenant, directly or through a parent table. */
    protected function scope(string $table, array $spec, Tenant $tenant)
    {
        $query = DB::table($table);

        if (Schema::hasColumn($table, 'tenant_id')) {
            return $query->where('tenant_id', $tenant->id);
        }

        if (isset($spec['parent']) && Schema::hasTable($spec['parent']['table'])) {
            return $query->whereIn($spec['parent']['key'], function ($sub) use ($spec, $tenant) {
                $sub->select('id')->from($spec['parent']['table'])->where('tenant_id', $tenant->id);
            });
        }

        // No safe tenant scope — touch nothing rather than everything.
        return $query->whereRaw('1 = 0');
    }

    /** @return array<string, int> */
    protected function countRecords(Tenant $tenant): array
    {
        $counts = [];
        foreach (['products', 'accounting_invoices', 'accounting_expenses', 'sales_quotes', 'sales_opportunities', 'ad_campaigns'] as $table) {
            if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'tenant_id')) {
                continue;
            }
            $count = DB::table($table)->where('tenant_id', $tenant->id)->count();
            if ($count > 0) {
                $counts[$table] = $count;
            }
        }

        return $counts;
    }

    /** Scale the money-shaped department goals (GMV, average order value). */
    protected function convertGoals(Tenant $tenant, float $factor): void
    {
        if (! Schema::hasTable('tenant_settings')) {
            return;
        }

        $row = DB::table('tenant_settings')->where('tenant_id', $tenant->id)->first();
        if (! $row || ! isset($row->goals) || ! $row->goals) {
            return;
        }

        $goals = json_decode((string) $row->goals, true);
        if (! is_array($goals)) {
            return;
        }

        $moneyGoals = ['finance' => ['monthly_gmv'], 'sales' => ['avg_order_value']];
        foreach ($moneyGoals as $department => $keys) {
            foreach ($keys as $key) {
                if (isset($goals[$department][$key]) && is_numeric($goals[$department][$key])) {
                    $goals[$department][$key] = round(((float) $goals[$department][$key]) * $factor, 2);
                }
            }
        }

        DB::table('tenant_settings')->where('tenant_id', $tenant->id)->update(['goals' => json_encode($goals)]);
    }
}
