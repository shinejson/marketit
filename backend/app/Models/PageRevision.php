<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PageRevision extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'store_id',
        'page_id',
        'created_by',
        'page_type',
        'version',
        'content',
    ];

    protected function casts(): array
    {
        return [
            'content' => 'array',
            'version' => 'integer',
        ];
    }

    public function page(): BelongsTo
    {
        return $this->belongsTo(Page::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}
