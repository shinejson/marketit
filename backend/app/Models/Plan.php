<?php

namespace App\Models;

use App\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
    use Auditable;

    public const INTERVALS = ['monthly', 'yearly'];

    protected $fillable = [
        'name', 'slug', 'description', 'price', 'currency', 'interval', 'trial_days',
        'commission_rate', 'max_products', 'max_stores', 'max_staff', 'features',
        'is_active', 'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'features' => 'array',
            'is_active' => 'boolean',
            'price' => 'decimal:2',
            'commission_rate' => 'decimal:2',
        ];
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    /** Normalised monthly value, so mixed intervals can be summed into MRR. */
    public function monthlyPrice(): float
    {
        return $this->interval === 'yearly' ? round((float) $this->price / 12, 2) : (float) $this->price;
    }
}
