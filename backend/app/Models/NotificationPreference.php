<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationPreference extends Model
{
    /** Categories a user can mute, and their default state. */
    public const DEFAULTS = [
        'order' => true,
        'payment' => true,
        'payout' => true,
        'review' => true,
        'dispute' => true,
        'catalog' => true,
        'inventory' => true,
        'security' => true,
        'system' => true,
        'promotion' => false,
    ];

    protected $fillable = [
        'user_id',
        'preferences',
    ];

    protected function casts(): array
    {
        return ['preferences' => 'array'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** Merge stored values over the defaults so new categories appear. */
    public function resolved(): array
    {
        return array_merge(self::DEFAULTS, $this->preferences ?? []);
    }
}
