<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A support request raised through any channel (portal, email, chat, phone).
 *
 * Tickets are deliberately *not* scoped with BelongsToTenant: the super-admin
 * service desk must see every tenant's queue. Tenant-facing endpoints filter
 * by tenant explicitly.
 */
class SupportTicket extends Model
{
    public const STATUS_NEW = 'new';
    public const STATUS_OPEN = 'open';
    public const STATUS_PENDING = 'pending';
    public const STATUS_ON_HOLD = 'on_hold';
    public const STATUS_RESOLVED = 'resolved';
    public const STATUS_CLOSED = 'closed';

    public const STATUSES = [
        self::STATUS_NEW,
        self::STATUS_OPEN,
        self::STATUS_PENDING,
        self::STATUS_ON_HOLD,
        self::STATUS_RESOLVED,
        self::STATUS_CLOSED,
    ];

    /** Statuses that still need an agent. */
    public const OPEN_STATUSES = [
        self::STATUS_NEW,
        self::STATUS_OPEN,
        self::STATUS_PENDING,
        self::STATUS_ON_HOLD,
    ];

    public const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

    public const CATEGORIES = [
        'billing',
        'payouts',
        'orders',
        'catalog',
        'technical',
        'account',
        'onboarding',
        'other',
    ];

    public const CHANNELS = ['portal', 'email', 'chat', 'phone', 'whatsapp'];

    /** First-response SLA target, in minutes, per priority. */
    public const SLA_MINUTES = [
        'urgent' => 60,
        'high' => 240,
        'normal' => 480,
        'low' => 1440,
    ];

    protected $fillable = [
        'reference',
        'tenant_id',
        'requester_id',
        'requester_name',
        'requester_email',
        'requester_type',
        'subject',
        'summary',
        'category',
        'channel',
        'status',
        'priority',
        'assignee_id',
        'tags',
        'first_response_at',
        'last_reply_at',
        'resolved_at',
        'closed_at',
        'sla_due_at',
        'sla_breached',
        'satisfaction',
        'satisfaction_comment',
        'messages_count',
    ];

    protected function casts(): array
    {
        return [
            'tags' => 'array',
            'first_response_at' => 'datetime',
            'last_reply_at' => 'datetime',
            'resolved_at' => 'datetime',
            'closed_at' => 'datetime',
            'sla_due_at' => 'datetime',
            'sla_breached' => 'boolean',
            'satisfaction' => 'integer',
            'messages_count' => 'integer',
        ];
    }

    public function messages(): HasMany
    {
        return $this->hasMany(SupportMessage::class, 'ticket_id');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(SupportTask::class, 'ticket_id');
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requester_id');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assignee_id');
    }

    public function scopeOpen(Builder $query): Builder
    {
        return $query->whereIn('status', self::OPEN_STATUSES);
    }

    public function isOpen(): bool
    {
        return in_array($this->status, self::OPEN_STATUSES, true);
    }

    /** Minutes remaining before the first-response SLA expires (negative = breached). */
    public function slaMinutesRemaining(): ?int
    {
        if (! $this->sla_due_at || $this->first_response_at) {
            return null;
        }

        return (int) round(now()->diffInSeconds($this->sla_due_at, false) / 60);
    }

    public static function nextReference(): string
    {
        $last = static::query()->max('id');

        return 'TKT-'.str_pad((string) (10000 + (int) $last + 1), 5, '0', STR_PAD_LEFT);
    }
}
