<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupportChatMessage extends Model
{
    public const ROLE_AGENT = 'agent';
    public const ROLE_VISITOR = 'visitor';
    public const ROLE_BOT = 'bot';
    public const ROLE_SYSTEM = 'system';

    protected $fillable = [
        'chat_id',
        'author_id',
        'author_name',
        'author_role',
        'body',
        'read_at',
    ];

    protected function casts(): array
    {
        return [
            'read_at' => 'datetime',
        ];
    }

    public function chat(): BelongsTo
    {
        return $this->belongsTo(SupportChat::class, 'chat_id');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}
