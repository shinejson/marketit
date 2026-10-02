<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Reusable agent reply ("macro") offered in the ticket and chat composers. */
class SupportCannedReply extends Model
{
    protected $fillable = [
        'title',
        'shortcut',
        'category',
        'body',
        'uses',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'uses' => 'integer',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
