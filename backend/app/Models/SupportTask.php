<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Work item owned by the support team (`owner_type = support`) or handed to a
 * tenant to complete (`owner_type = tenant`, e.g. onboarding/compliance steps).
 */
class SupportTask extends Model
{
    public const STATUS_TODO = 'todo';
    public const STATUS_IN_PROGRESS = 'in_progress';
    public const STATUS_BLOCKED = 'blocked';
    public const STATUS_REVIEW = 'review';
    public const STATUS_DONE = 'done';

    public const STATUSES = [
        self::STATUS_TODO,
        self::STATUS_IN_PROGRESS,
        self::STATUS_BLOCKED,
        self::STATUS_REVIEW,
        self::STATUS_DONE,
    ];

    public const PRIORITIES = ['low', 'normal', 'high', 'urgent'];
    public const OWNER_TYPES = ['support', 'tenant'];

    protected $fillable = [
        'tenant_id',
        'ticket_id',
        'title',
        'description',
        'status',
        'priority',
        'owner_type',
        'assignee_id',
        'created_by',
        'due_at',
        'completed_at',
        'checklist',
        'labels',
        'position',
    ];

    protected function casts(): array
    {
        return [
            'due_at' => 'datetime',
            'completed_at' => 'datetime',
            'checklist' => 'array',
            'labels' => 'array',
            'position' => 'integer',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(SupportTicket::class, 'ticket_id');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assignee_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isOverdue(): bool
    {
        return $this->due_at !== null
            && $this->status !== self::STATUS_DONE
            && $this->due_at->isPast();
    }
}
