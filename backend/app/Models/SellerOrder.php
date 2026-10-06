<?php

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class SellerOrder extends Model
{
    use Auditable, BelongsToTenant;

    public const STATUS_AWAITING_FULFILLMENT = 'awaiting_fulfillment';
    public const STATUS_PROCESSING = 'processing';
    public const STATUS_SHIPPED = 'shipped';
    public const STATUS_DELIVERED = 'delivered';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_CANCELLED = 'cancelled';
    public const STATUS_REFUNDED = 'refunded';

    public const TRANSITIONS = [
        self::STATUS_AWAITING_FULFILLMENT => [self::STATUS_PROCESSING, self::STATUS_CANCELLED],
        self::STATUS_PROCESSING => [self::STATUS_SHIPPED, self::STATUS_CANCELLED],
        self::STATUS_SHIPPED => [self::STATUS_DELIVERED],
        self::STATUS_DELIVERED => [self::STATUS_COMPLETED],
        self::STATUS_COMPLETED => [],
        self::STATUS_CANCELLED => [],
        self::STATUS_REFUNDED => [],
    ];

    protected $fillable = [
        'order_id',
        'tenant_id',
        'store_id',
        'subtotal',
        'discount',
        'delivery_fee',
        'delivery_method_id',
        'delivery_zone_id',
        'delivery_type',
        'commission',
        'commission_rate',
        'commission_rule_id',
        'net_settlement',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'subtotal' => 'decimal:2',
            'discount' => 'decimal:2',
            'delivery_fee' => 'decimal:2',
            'commission' => 'decimal:2',
            'commission_rate' => 'decimal:4',
            'net_settlement' => 'decimal:2',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function settlement(): HasOne
    {
        return $this->hasOne(SellerSettlement::class);
    }

    public function shipment(): HasOne
    {
        return $this->hasOne(Shipment::class);
    }

    public function deliveryMethod(): BelongsTo
    {
        return $this->belongsTo(DeliveryMethod::class, 'delivery_method_id');
    }

    public function refunds(): HasMany
    {
        return $this->hasMany(Refund::class);
    }

    public function disputes(): HasMany
    {
        return $this->hasMany(Dispute::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    /** Amount already refunded against this seller order. */
    public function refundedTotal(): string
    {
        return bcadd((string) $this->refunds()->where('status', Refund::STATUS_COMPLETED)->sum('amount'), '0', 2);
    }

    /** What is still refundable: the charge minus everything sent back. */
    public function refundableTotal(): string
    {
        $charged = bcadd(bcsub((string) $this->subtotal, (string) ($this->discount ?? '0'), 2), (string) $this->delivery_fee, 2);

        return max('0.00', bcsub($charged, $this->refundedTotal(), 2));
    }

    public function canTransitionTo(string $status): bool
    {
        return in_array($status, self::TRANSITIONS[$this->status] ?? [], true);
    }
}
