<?php

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantTemplate extends Model
{
    use Auditable, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'store_id',
        'template_id',
        'template_version',
        'customized_data',
        'status',
        'installed_at',
    ];

    protected function casts(): array
    {
        return [
            'customized_data' => 'array',
            'installed_at' => 'datetime',
        ];
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(PageTemplate::class, 'template_id');
    }
}
