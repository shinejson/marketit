<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * An OAuth identity (Google, Facebook, Apple…) linked to a marketplace account.
 *
 * Customers may sign in with a password, with one or more social providers, or
 * both. The tenant console surfaces the providers so support can answer "how
 * does this person log in?" without exposing any token material.
 */
class SocialIdentity extends Model
{
    public const PROVIDERS = ['google', 'facebook', 'apple', 'github'];

    public const LABELS = [
        'google' => 'Google',
        'facebook' => 'Facebook',
        'apple' => 'Apple',
        'github' => 'GitHub',
    ];

    protected $fillable = [
        'user_id',
        'provider',
        'provider_user_id',
        'email',
        'nickname',
        'avatar_url',
        'meta',
        'last_login_at',
    ];

    protected $hidden = ['meta'];

    protected function casts(): array
    {
        return [
            'meta' => 'array',
            'last_login_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function label(string $provider): string
    {
        return self::LABELS[$provider] ?? ucfirst($provider);
    }
}
