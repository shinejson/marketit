<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class TenantAiSetting extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'provider',
        'endpoint',
        'model',
        'api_key',
        'tone',
        'length',
        'banned_words',
        'language',
        'monthly_token_budget',
        'opted_out',
    ];

    protected function casts(): array
    {
        return [
            'api_key' => 'encrypted',
            'banned_words' => 'array',
            'opted_out' => 'boolean',
        ];
    }
}
