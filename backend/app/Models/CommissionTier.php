<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommissionTier extends Model
{
    protected $fillable = [
        'commission_rule_id',
        'from_amount',
        'to_amount',
        'rate',
        'flat_fee',
    ];

    protected function casts(): array
    {
        return [
            'from_amount' => 'decimal:2',
            'to_amount' => 'decimal:2',
            'rate' => 'decimal:4',
            'flat_fee' => 'decimal:2',
        ];
    }

    public function rule(): BelongsTo
    {
        return $this->belongsTo(CommissionRule::class, 'commission_rule_id');
    }
}
