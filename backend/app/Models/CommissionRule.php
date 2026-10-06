<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * One configurable marketplace commission rule (§14).
 *
 * Specificity ranks the scopes: a product rule beats a category rule, which
 * beats a store rule, which beats a tenant rule, which beats a plan rule,
 * which beats the global default.
 */
class CommissionRule extends Model
{
    public const SCOPE_GLOBAL = 'global';
    public const SCOPE_PLAN = 'plan';
    public const SCOPE_TENANT = 'tenant';
    public const SCOPE_STORE = 'store';
    public const SCOPE_CATEGORY = 'category';
    public const SCOPE_PRODUCT = 'product';

    public const SCOPES = [
        self::SCOPE_GLOBAL,
        self::SCOPE_PLAN,
        self::SCOPE_TENANT,
        self::SCOPE_STORE,
        self::SCOPE_CATEGORY,
        self::SCOPE_PRODUCT,
    ];

    /** Higher wins when two rules both match. */
    public const SPECIFICITY = [
        self::SCOPE_GLOBAL => 10,
        self::SCOPE_PLAN => 20,
        self::SCOPE_TENANT => 30,
        self::SCOPE_STORE => 40,
        self::SCOPE_CATEGORY => 50,
        self::SCOPE_PRODUCT => 60,
    ];

    public const CALC_PERCENTAGE = 'percentage';
    public const CALC_FLAT = 'flat';
    public const CALC_PERCENTAGE_PLUS_FLAT = 'percentage_plus_flat';
    public const CALC_TIERED = 'tiered';

    public const CALCULATIONS = [
        self::CALC_PERCENTAGE,
        self::CALC_FLAT,
        self::CALC_PERCENTAGE_PLUS_FLAT,
        self::CALC_TIERED,
    ];

    public const STATUS_ACTIVE = 'active';
    public const STATUS_INACTIVE = 'inactive';

    protected $fillable = [
        'name',
        'description',
        'scope_type',
        'scope_id',
        'calculation',
        'rate',
        'flat_fee',
        'min_fee',
        'max_fee',
        'min_order_amount',
        'include_delivery',
        'priority',
        'status',
        'effective_from',
        'effective_to',
        'created_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'scope_id' => 'integer',
            'rate' => 'decimal:4',
            'flat_fee' => 'decimal:2',
            'min_fee' => 'decimal:2',
            'max_fee' => 'decimal:2',
            'min_order_amount' => 'decimal:2',
            'include_delivery' => 'boolean',
            'priority' => 'integer',
            'effective_from' => 'date',
            'effective_to' => 'date',
        ];
    }

    public function tiers(): HasMany
    {
        return $this->hasMany(CommissionTier::class)->orderBy('from_amount');
    }

    public function scopeActive(Builder $query): Builder
    {
        $today = now()->toDateString();

        return $query->where('status', self::STATUS_ACTIVE)
            ->where(fn ($q) => $q->whereNull('effective_from')->orWhere('effective_from', '<=', $today))
            ->where(fn ($q) => $q->whereNull('effective_to')->orWhere('effective_to', '>=', $today));
    }

    public function specificity(): int
    {
        return self::SPECIFICITY[$this->scope_type] ?? 0;
    }

    public function isLive(): bool
    {
        if ($this->status !== self::STATUS_ACTIVE) {
            return false;
        }
        $today = now()->startOfDay();
        if ($this->effective_from && $this->effective_from->gt($today)) {
            return false;
        }
        if ($this->effective_to && $this->effective_to->lt($today)) {
            return false;
        }

        return true;
    }

    /** Human label for what this rule is pinned to, for the admin table. */
    public function scopeLabel(): string
    {
        if ($this->scope_type === self::SCOPE_GLOBAL) {
            return 'All marketplace sales';
        }

        $name = match ($this->scope_type) {
            self::SCOPE_PLAN => Plan::query()->whereKey($this->scope_id)->value('name'),
            self::SCOPE_TENANT => Tenant::withoutGlobalScopes()->whereKey($this->scope_id)->value('name'),
            self::SCOPE_STORE => Store::withoutGlobalScopes()->whereKey($this->scope_id)->value('name'),
            self::SCOPE_CATEGORY => Category::withoutGlobalScopes()->whereKey($this->scope_id)->value('name'),
            self::SCOPE_PRODUCT => Product::withoutGlobalScopes()->whereKey($this->scope_id)->value('name'),
            default => null,
        };

        return ucfirst($this->scope_type).': '.($name ?: '#'.$this->scope_id);
    }

    /** One-line description of the maths, e.g. "8% + 1.50 (min 2.00)". */
    public function summaryLine(): string
    {
        $rate = rtrim(rtrim(number_format((float) $this->rate, 2, '.', ''), '0'), '.');
        $flat = number_format((float) $this->flat_fee, 2, '.', '');

        $core = match ($this->calculation) {
            self::CALC_FLAT => $flat.' per order',
            self::CALC_PERCENTAGE_PLUS_FLAT => $rate.'% + '.$flat,
            self::CALC_TIERED => $this->tiers()->count().' tier band(s)',
            default => $rate.'%',
        };

        $bounds = [];
        if ($this->min_fee !== null) {
            $bounds[] = 'min '.number_format((float) $this->min_fee, 2, '.', '');
        }
        if ($this->max_fee !== null) {
            $bounds[] = 'max '.number_format((float) $this->max_fee, 2, '.', '');
        }

        return $core.($bounds ? ' ('.implode(', ', $bounds).')' : '');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }
}
