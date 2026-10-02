<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupportMessage extends Model
{
    public const ROLE_AGENT = 'agent';
    public const ROLE_REQUESTER = 'requester';
    public const ROLE_SYSTEM = 'system';

    public const VISIBILITY_PUBLIC = 'public';
    public const VISIBILITY_INTERNAL = 'internal';

    protected $fillable = [
        'ticket_id',
        'author_id',
        'author_name',
        'author_role',
        'visibility',
        'body',
        'attachments',
    ];

    protected function casts(): array
    {
        return [
            'attachments' => 'array',
        ];
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(SupportTicket::class, 'ticket_id');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}
