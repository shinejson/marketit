<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * One row per supported currency. `rate` is quoted against the platform base
 * currency: 1 base = `rate` units of `code`.
 */
class CurrencyRate extends Model
{
    protected $fillable = [
        'code',
        'name',
        'symbol',
        'rate',
        'decimals',
        'is_active',
        'source',
        'rate_updated_at',
    ];

    protected function casts(): array
    {
        return [
            'rate' => 'float',
            'decimals' => 'integer',
            'is_active' => 'boolean',
            'rate_updated_at' => 'datetime',
        ];
    }
}
