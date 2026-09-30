<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantSetting extends Model
{
    use BelongsToTenant;

    public const DEPARTMENTS = ['finance', 'sales', 'operations', 'marketing'];

    public const DEFAULT_GOALS = [
        'finance' => ['monthly_gmv' => 8000, 'released_settlements' => 70],
        'sales' => ['monthly_orders' => 40, 'avg_order_value' => 80],
        'operations' => ['fulfillment_rate' => 85, 'in_stock_rate' => 90],
        'marketing' => ['ad_ctr' => 2.5, 'campaigns_active' => 2],
    ];

    protected $fillable = [
        'tenant_id',
        'timezone',
        'currency',
        'fiscal_year_start_month',
        'notify_low_stock',
        'notify_orders',
        'notify_payouts',
        'backup_retention_days',
        'payout_email',
        'tax_id',
        'support_email',
        'support_phone',
        'goals',
    ];

    protected function casts(): array
    {
        return [
            'notify_low_stock' => 'boolean',
            'notify_orders' => 'boolean',
            'notify_payouts' => 'boolean',
            'goals' => 'array',
            'fiscal_year_start_month' => 'integer',
            'backup_retention_days' => 'integer',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function goalsFor(string $department): array
    {
        $defaults = self::DEFAULT_GOALS[$department] ?? [];
        $custom = $this->goals[$department] ?? [];

        return array_merge($defaults, is_array($custom) ? $custom : []);
    }
}
