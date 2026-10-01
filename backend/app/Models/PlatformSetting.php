<?php

namespace App\Models;

use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;

class PlatformSetting extends Model
{
    protected $fillable = ['key', 'group', 'value', 'type', 'updated_by'];

    protected static function booted(): void
    {
        static::saved(fn () => Cache::forget('platform_settings'));
        static::deleted(fn () => Cache::forget('platform_settings'));
    }

    /** All settings as a key => typed-value map. */
    public static function map(): array
    {
        return Cache::rememberForever('platform_settings', function () {
            return static::query()->get()->mapWithKeys(fn (self $s) => [$s->key => $s->typedValue()])->all();
        });
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        return static::map()[$key] ?? $default;
    }

    public function typedValue(): mixed
    {
        return match ($this->type) {
            'number' => is_numeric($this->value) ? (float) $this->value : null,
            'bool' => filter_var($this->value, FILTER_VALIDATE_BOOL),
            'json' => json_decode((string) $this->value, true),
            'secret' => static::decrypt($this->value),
            default => $this->value,
        };
    }

    public static function cast(mixed $value, string $type): ?string
    {
        return match ($type) {
            'bool' => $value ? '1' : '0',
            'json' => json_encode($value),
            'secret' => $value === null || $value === '' ? null : Crypt::encryptString((string) $value),
            default => $value === null ? null : (string) $value,
        };
    }

    /** Secrets written before encryption existed (or by a seeder) are returned as-is. */
    protected static function decrypt(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        try {
            return Crypt::decryptString($value);
        } catch (DecryptException) {
            return $value;
        }
    }
}
