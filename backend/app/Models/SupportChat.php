<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A live chat session started from the in-product widget. Sessions sit in the
 * `queued` state until an agent claims them, then `active`, then `ended`.
 */
class SupportChat extends Model
{
    public const STATUS_QUEUED = 'queued';
    public const STATUS_ACTIVE = 'active';
    public const STATUS_ENDED = 'ended';

    public const STATUSES = [self::STATUS_QUEUED, self::STATUS_ACTIVE, self::STATUS_ENDED];

    protected $fillable = [
        'tenant_id',
        'visitor_id',
        'visitor_name',
        'visitor_email',
        'visitor_type',
        'topic',
        'status',
        'priority',
        'agent_id',
        'ticket_id',
        'started_at',
        'answered_at',
        'ended_at',
        'last_message_at',
        'unread_count',
        'rating',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'answered_at' => 'datetime',
            'ended_at' => 'datetime',
            'last_message_at' => 'datetime',
            'unread_count' => 'integer',
            'rating' => 'integer',
        ];
    }

    public function messages(): HasMany
    {
        return $this->hasMany(SupportChatMessage::class, 'chat_id');
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'agent_id');
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(SupportTicket::class, 'ticket_id');
    }

    /** Seconds the visitor waited before an agent answered (null while queued). */
    public function waitSeconds(): ?int
    {
        if (! $this->started_at) {
            return null;
        }

        $end = $this->answered_at ?? now();

        return (int) $this->started_at->diffInSeconds($end);
    }
}
