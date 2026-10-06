<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A row in the in-app notification centre (§20 #12).
 */
class AppNotification extends Model
{
    public const AUDIENCE_CUSTOMER = 'customer';
    public const AUDIENCE_TENANT = 'tenant';
    public const AUDIENCE_ADMIN = 'admin';

    public const AUDIENCES = [self::AUDIENCE_CUSTOMER, self::AUDIENCE_TENANT, self::AUDIENCE_ADMIN];

    public const CATEGORIES = [
        'order', 'payment', 'payout', 'review', 'dispute',
        'catalog', 'inventory', 'security', 'system', 'promotion',
    ];

    public const LEVEL_INFO = 'info';
    public const LEVEL_SUCCESS = 'success';
    public const LEVEL_WARNING = 'warning';
    public const LEVEL_CRITICAL = 'critical';

    protected $fillable = [
        'user_id',
        'tenant_id',
        'audience',
        'category',
        'level',
        'title',
        'body',
        'action_url',
        'action_label',
        'subject_type',
        'subject_id',
        'data',
        'read_at',
        'archived_at',
    ];

    protected function casts(): array
    {
        return [
            'data' => 'array',
            'read_at' => 'datetime',
            'archived_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function scopeUnread(Builder $query): Builder
    {
        return $query->whereNull('read_at');
    }

    public function scopeVisible(Builder $query): Builder
    {
        return $query->whereNull('archived_at');
    }

    public function isRead(): bool
    {
        return $this->read_at !== null;
    }
}
