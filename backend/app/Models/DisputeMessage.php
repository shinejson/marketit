<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DisputeMessage extends Model
{
    public const ROLE_CUSTOMER = 'customer';
    public const ROLE_SELLER = 'seller';
    public const ROLE_ADMIN = 'admin';
    public const ROLE_SYSTEM = 'system';

    protected $fillable = [
        'dispute_id',
        'user_id',
        'author_role',
        'author_name',
        'body',
        'attachments',
        'is_internal',
    ];

    protected function casts(): array
    {
        return [
            'attachments' => 'array',
            'is_internal' => 'boolean',
        ];
    }

    public function dispute(): BelongsTo
    {
        return $this->belongsTo(Dispute::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
