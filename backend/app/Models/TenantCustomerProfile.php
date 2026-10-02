<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Tenant-scoped facts about a marketplace customer.
 *
 * A tenant must never be able to edit (or suspend) the shared platform
 * account, so everything a merchant decides about a shopper — notes, tags,
 * segment, marketing consent, and whether they are blocked from this tenant's
 * stores — is recorded here instead.
 */
class TenantCustomerProfile extends Model
{
    use BelongsToTenant;

    public const STATUS_ACTIVE = 'active';
    public const STATUS_BLOCKED = 'blocked';

    public const STATUSES = [self::STATUS_ACTIVE, self::STATUS_BLOCKED];
    public const SEGMENTS = ['new', 'returning', 'vip', 'wholesale'];

    protected $fillable = [
        'tenant_id',
        'user_id',
        'status',
        'segment',
        'tags',
        'notes',
        'marketing_opt_in',
    ];

    protected function casts(): array
    {
        return [
            'tags' => 'array',
            'marketing_opt_in' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
