<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A delivery zone (§16). Matching is evaluated most-specific first:
 * postcode → city → region → country, then the default zone.
 */
class DeliveryZone extends Model
{
    use BelongsToTenant;

    public const MATCH_COUNTRY = 'country';
    public const MATCH_REGION = 'region';
    public const MATCH_CITY = 'city';
    public const MATCH_POSTCODE = 'postcode';
    public const MATCH_ANY = 'any';

    public const MATCH_TYPES = [
        self::MATCH_COUNTRY,
        self::MATCH_REGION,
        self::MATCH_CITY,
        self::MATCH_POSTCODE,
        self::MATCH_ANY,
    ];

    public const STATUS_ACTIVE = 'active';
    public const STATUS_INACTIVE = 'inactive';

    protected $fillable = [
        'tenant_id',
        'store_id',
        'name',
        'description',
        'match_type',
        'countries',
        'regions',
        'cities',
        'postcodes',
        'base_fee',
        'per_item_fee',
        'per_kg_fee',
        'free_over',
        'min_days',
        'max_days',
        'priority',
        'is_default',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'countries' => 'array',
            'regions' => 'array',
            'cities' => 'array',
            'postcodes' => 'array',
            'base_fee' => 'decimal:2',
            'per_item_fee' => 'decimal:2',
            'per_kg_fee' => 'decimal:2',
            'free_over' => 'decimal:2',
            'min_days' => 'integer',
            'max_days' => 'integer',
            'priority' => 'integer',
            'is_default' => 'boolean',
        ];
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function methods(): HasMany
    {
        return $this->hasMany(DeliveryMethod::class);
    }

    /** Does this zone cover the given address? */
    public function covers(?string $country, ?string $region, ?string $city, ?string $postcode): bool
    {
        if ($this->is_default || $this->match_type === self::MATCH_ANY) {
            return true;
        }

        return match ($this->match_type) {
            self::MATCH_COUNTRY => $this->listContains($this->countries, $country),
            self::MATCH_REGION => $this->listContains($this->regions, $region),
            self::MATCH_CITY => $this->listContains($this->cities, $city),
            self::MATCH_POSTCODE => $this->listContains($this->postcodes, $postcode),
            default => false,
        };
    }

    /** How specific this zone is — used to break ties between matches. */
    public function specificity(): int
    {
        return match ($this->match_type) {
            self::MATCH_POSTCODE => 40,
            self::MATCH_CITY => 30,
            self::MATCH_REGION => 20,
            self::MATCH_COUNTRY => 10,
            default => 0,
        };
    }

    protected function listContains(?array $values, ?string $needle): bool
    {
        if (! $values || $needle === null || $needle === '') {
            return false;
        }

        $needle = strtolower(trim($needle));
        foreach ($values as $value) {
            if (strtolower(trim((string) $value)) === $needle) {
                return true;
            }
        }

        return false;
    }
}
