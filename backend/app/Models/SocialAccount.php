<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SocialAccount extends Model
{
    public const STATUS_CONNECTED = 'connected';
    public const STATUS_DISCONNECTED = 'disconnected';

    public const PLATFORMS = ['facebook', 'instagram', 'x', 'linkedin', 'tiktok', 'youtube'];

    protected $fillable = [
        'platform',
        'handle',
        'display_name',
        'status',
        'followers',
        'connected_at',
        'connected_by',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'followers' => 'integer',
            'connected_at' => 'datetime',
            'meta' => 'array',
        ];
    }
}
