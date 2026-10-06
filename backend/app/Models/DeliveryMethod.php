<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A fulfilment option a shopper can pick at checkout (§16):
 * customer pickup, store delivery, third-party courier, or
 * platform-managed delivery.
 */
class DeliveryMethod extends Model
{
    use BelongsToTenant;

    public const TYPE_PICKUP = 'pickup';
    public const TYPE_STORE_DELIVERY = 'store_delivery';
    public const TYPE_COURIER = 'courier';
    public const TYPE_PLATFORM = 'platform';

    public const TYPES = [
        self::TYPE_PICKUP,
        self::TYPE_STORE_DELIVERY,
        self::TYPE_COURIER,
        self::TYPE_PLATFORM,
    ];

    public const STATUS_ACTIVE = 'active';
    public const STATUS_INACTIVE = 'inactive';

    protected $fillable = [
        'tenant_id',
        'store_id',
        'delivery_zone_id',
        'name',
        'type',
        'carrier',
        'service_level',
        'fee',
        'free_over',
        'min_days',
        'max_days',
        'pickup_address',
        'pickup_hours',
        'instructions',
        'tracking_url_template',
        'is_default',
        'status',
        'position',
    ];

    protected function casts(): array
    {
        return [
            'fee' => 'decimal:2',
            'free_over' => 'decimal:2',
            'min_days' => 'integer',
            'max_days' => 'integer',
            'is_default' => 'boolean',
            'position' => 'integer',
        ];
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(DeliveryZone::class, 'delivery_zone_id');
    }

    public function isPickup(): bool
    {
        return $this->type === self::TYPE_PICKUP;
    }

    public function trackingUrlFor(?string $trackingNumber): ?string
    {
        if (! $trackingNumber || ! $this->tracking_url_template) {
            return null;
        }

        return str_replace(['{tracking}', '{tracking_number}'], $trackingNumber, $this->tracking_url_template);
    }
}
