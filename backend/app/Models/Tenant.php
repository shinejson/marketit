<?php

namespace App\Models;

use App\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Tenant extends Model
{
    use Auditable;

    public const STATUS_PENDING = 'pending';
    public const STATUS_ACTIVE = 'active';
    public const STATUS_SUSPENDED = 'suspended';
    public const STATUS_REJECTED = 'rejected';

    public const BUSINESS_TYPES = [
        'sole_proprietor',
        'partnership',
        'limited_company',
        'cooperative',
        'individual',
        'non_profit',
    ];

    public const ID_TYPES = [
        'ghana_card',
        'national_id',
        'passport',
        'drivers_license',
        'other',
    ];

    public const PAYOUT_METHODS = ['bank', 'mobile_money', 'card'];

    protected $fillable = [
        'name',
        'slug',
        'status',
        'owner_user_id',
        'country',
        'business_name',
        'business_details',
        'payout_details_id',
        'trading_name',
        'business_type',
        'registration_number',
        'tax_id',
        'year_established',
        'website',
        'permit_number',
        'permit_expires_at',
        'product_summary',
        'categories_offered',
        'address_line1',
        'address_line2',
        'city',
        'region',
        'postal_code',
        'latitude',
        'longitude',
        'social_links',
        'owner_name',
        'owner_email',
        'owner_phone',
        'owner_id_type',
        'owner_id_number',
        'documents',
        'payout_method',
        'payout_account_name',
        'payout_account_number',
        'bank_name',
        'mobile_money_provider',
        'card_brand',
        'card_last4',
        'submitted_at',
        'reviewed_by',
        'reviewed_at',
        'review_notes',
        'rejection_reason',
    ];

    /** Never serialised in list/audit payloads — the admin detail endpoint opts in explicitly. */
    protected $hidden = [
        'owner_id_number',
        'payout_account_number',
    ];

    protected function casts(): array
    {
        return [
            'categories_offered' => 'array',
            'social_links' => 'array',
            'documents' => 'array',
            'latitude' => 'float',
            'longitude' => 'float',
            'year_established' => 'integer',
            'permit_expires_at' => 'datetime',
            'submitted_at' => 'datetime',
            'reviewed_at' => 'datetime',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function stores(): HasMany
    {
        return $this->hasMany(Store::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function categories(): HasMany
    {
        return $this->hasMany(Category::class);
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    /** The subscription the billing screens care about. */
    public function subscription(): HasOne
    {
        return $this->hasOne(Subscription::class)->latestOfMany();
    }

    public function settings(): HasOne
    {
        return $this->hasOne(TenantSetting::class);
    }

    public function backups(): HasMany
    {
        return $this->hasMany(TenantBackup::class);
    }

    public function staffRoles(): HasMany
    {
        return $this->hasMany(UserRole::class);
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    public function isRejected(): bool
    {
        return $this->status === self::STATUS_REJECTED;
    }

    /** Stores only become visible on the marketplace once the tenant is approved. */
    public function canCreateStore(): bool
    {
        return $this->isActive();
    }
}
