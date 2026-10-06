<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * The physical half of a seller order (§16): who is carrying it, under which
 * tracking number, and where it has been seen.
 */
class Shipment extends Model
{
    use BelongsToTenant;

    public const STATUS_PENDING = 'pending';
    public const STATUS_READY_FOR_PICKUP = 'ready_for_pickup';
    public const STATUS_PICKED_UP = 'picked_up';
    public const STATUS_IN_TRANSIT = 'in_transit';
    public const STATUS_OUT_FOR_DELIVERY = 'out_for_delivery';
    public const STATUS_DELIVERED = 'delivered';
    public const STATUS_FAILED = 'failed';
    public const STATUS_RETURNED = 'returned';
    public const STATUS_CANCELLED = 'cancelled';

    public const STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_READY_FOR_PICKUP,
        self::STATUS_PICKED_UP,
        self::STATUS_IN_TRANSIT,
        self::STATUS_OUT_FOR_DELIVERY,
        self::STATUS_DELIVERED,
        self::STATUS_FAILED,
        self::STATUS_RETURNED,
        self::STATUS_CANCELLED,
    ];

    public const STATUS_LABELS = [
        self::STATUS_PENDING => 'Awaiting dispatch',
        self::STATUS_READY_FOR_PICKUP => 'Ready for pickup',
        self::STATUS_PICKED_UP => 'Picked up',
        self::STATUS_IN_TRANSIT => 'In transit',
        self::STATUS_OUT_FOR_DELIVERY => 'Out for delivery',
        self::STATUS_DELIVERED => 'Delivered',
        self::STATUS_FAILED => 'Delivery failed',
        self::STATUS_RETURNED => 'Returned to seller',
        self::STATUS_CANCELLED => 'Cancelled',
    ];

    protected $fillable = [
        'tenant_id',
        'store_id',
        'seller_order_id',
        'delivery_method_id',
        'delivery_zone_id',
        'reference',
        'type',
        'carrier',
        'service_level',
        'tracking_number',
        'tracking_url',
        'status',
        'cost',
        'weight',
        'recipient_name',
        'recipient_phone',
        'destination',
        'notes',
        'dispatched_at',
        'estimated_delivery_from',
        'estimated_delivery_to',
        'delivered_at',
    ];

    protected $appends = ['status_label'];

    protected function casts(): array
    {
        return [
            'cost' => 'decimal:2',
            'weight' => 'decimal:3',
            'dispatched_at' => 'datetime',
            'estimated_delivery_from' => 'date',
            'estimated_delivery_to' => 'date',
            'delivered_at' => 'datetime',
        ];
    }

    public function sellerOrder(): BelongsTo
    {
        return $this->belongsTo(SellerOrder::class);
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function method(): BelongsTo
    {
        return $this->belongsTo(DeliveryMethod::class, 'delivery_method_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(ShipmentEvent::class)->orderByDesc('happened_at');
    }

    public function getStatusLabelAttribute(): string
    {
        return self::STATUS_LABELS[$this->status] ?? ucfirst(str_replace('_', ' ', (string) $this->status));
    }
}
