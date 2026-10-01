<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlatformBackup extends Model
{
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_FAILED = 'failed';

    protected $fillable = [
        'created_by',
        'filename',
        'path',
        'disk',
        'size_bytes',
        'status',
        'scope',
        'type',
        'tables',
        'records',
        'note',
        'error',
        'restored_at',
    ];

    protected function casts(): array
    {
        return [
            'tables' => 'array',
            'restored_at' => 'datetime',
            'size_bytes' => 'integer',
            'records' => 'integer',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
