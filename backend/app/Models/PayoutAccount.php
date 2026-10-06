<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayoutAccount extends Model
{
    use BelongsToTenant;

    public const METHOD_BANK = 'bank';
    public const METHOD_MOBILE_MONEY = 'mobile_money';
    public const METHOD_PAYPAL = 'paypal';
    public const METHOD_WALLET = 'wallet';

    public const METHODS = [
        self::METHOD_BANK,
        self::METHOD_MOBILE_MONEY,
        self::METHOD_PAYPAL,
        self::METHOD_WALLET,
    ];

    public const STATUS_PENDING = 'pending';
    public const STATUS_VERIFIED = 'verified';
    public const STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'tenant_id',
        'label',
        'method',
        'account_name',
        'account_number',
        'bank_name',
        'branch',
        'swift_code',
        'mobile_network',
        'currency',
        'country',
        'is_default',
        'status',
        'verified_at',
    ];

    protected $appends = ['masked_account_number'];

    protected function casts(): array
    {
        return [
            'is_default' => 'boolean',
            'verified_at' => 'datetime',
        ];
    }

    /** Never echo a full account number back to a console. */
    public function getMaskedAccountNumberAttribute(): string
    {
        $value = (string) $this->account_number;
        if (strlen($value) <= 4) {
            return str_repeat('•', max(0, strlen($value)));
        }

        return str_repeat('•', strlen($value) - 4).substr($value, -4);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
