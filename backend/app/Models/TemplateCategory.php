<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TemplateCategory extends Model
{
    protected $fillable = ['name', 'slug', 'description', 'icon', 'position', 'is_active'];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'position' => 'integer',
        ];
    }

    public function templates(): HasMany
    {
        return $this->hasMany(PageTemplate::class, 'category_id');
    }
}
