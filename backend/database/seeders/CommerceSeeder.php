<?php

namespace Database\Seeders;

use App\Models\AppNotification;
use App\Models\CommissionRule;
use App\Models\Coupon;
use App\Models\DeliveryMethod;
use App\Models\DeliveryZone;
use App\Models\Dispute;
use App\Models\DisputeMessage;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\PlatformCategory;
use App\Models\Product;
use App\Models\Review;
use App\Models\SellerOrder;
use App\Models\Store;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CommerceSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::query()->where('email', 'admin@markethub.test')->first();
        $customer = User::query()->where('email', 'customer@markethub.test')->first();
        $sellerTenant = Tenant::query()->first();
        $sellerStore = Store::query()->first();

        // 1. Curate Platform Categories (§7)
        $categoriesData = [
            [
                'name' => 'Electronics & Gadgets',
                'slug' => 'electronics',
                'description' => 'Phones, audio, smart devices, and computing essentials.',
                'icon' => 'cpu',
                'position' => 1,
                'is_featured' => true,
            ],
            [
                'name' => 'Fashion & Apparel',
                'slug' => 'fashion',
                'description' => 'Designer clothing, footwear, leather goods, and bags.',
                'icon' => 'shirt',
                'position' => 2,
                'is_featured' => true,
            ],
            [
                'name' => 'Home & Living',
                'slug' => 'home-living',
                'description' => 'Furniture, decor, kitchenware, and textiles.',
                'icon' => 'home',
                'position' => 3,
                'is_featured' => true,
            ],
            [
                'name' => 'Beauty & Personal Care',
                'slug' => 'beauty-personal-care',
                'description' => 'Skincare, organic cosmetics, fragrances, and grooming.',
                'icon' => 'sparkles',
                'position' => 4,
                'is_featured' => true,
            ],
            [
                'name' => 'Artisanal & Crafts',
                'slug' => 'artisanal-crafts',
                'description' => 'Handcrafted goods, cultural artifacts, and heritage creations.',
                'icon' => 'gift',
                'position' => 5,
                'is_featured' => true,
            ],
            [
                'name' => 'Sports & Outdoors',
                'slug' => 'sports-outdoors',
                'description' => 'Fitness equipment, athletic wear, and outdoor essentials.',
                'icon' => 'activity',
                'position' => 6,
                'is_featured' => false,
            ],
        ];

        $categoryMap = [];
        foreach ($categoriesData as $cat) {
            $model = PlatformCategory::query()->firstOrCreate(
                ['slug' => $cat['slug']],
                $cat
            );
            $categoryMap[$cat['slug']] = $model;
        }

        // Link existing products to platform categories
        if (isset($categoryMap['electronics'])) {
            Product::withoutGlobalScopes()
                ->where('name', 'like', '%Headphones%')
                ->orWhere('name', 'like', '%Smartwatch%')
                ->orWhere('name', 'like', '%Speaker%')
                ->update(['platform_category_id' => $categoryMap['electronics']->id]);
        }
        if (isset($categoryMap['home-living'])) {
            Product::withoutGlobalScopes()
                ->where('name', 'like', '%Throw Blanket%')
                ->orWhere('name', 'like', '%Ceramic%')
                ->update(['platform_category_id' => $categoryMap['home-living']->id]);
        }
        if (isset($categoryMap['beauty-personal-care'])) {
            Product::withoutGlobalScopes()
                ->where('name', 'like', '%Shea%')
                ->orWhere('name', 'like', '%Butter%')
                ->update(['platform_category_id' => $categoryMap['beauty-personal-care']->id]);
        }
        if (isset($categoryMap['fashion'])) {
            Product::withoutGlobalScopes()
                ->where('name', 'like', '%Tote%')
                ->update(['platform_category_id' => $categoryMap['fashion']->id]);
        }

        // 2. Configurable Commission Rules (§14)
        CommissionRule::query()->firstOrCreate(
            ['name' => 'Global Marketplace Base Fee'],
            [
                'description' => 'Standard platform fee applied across all global categories.',
                'scope_type' => CommissionRule::SCOPE_GLOBAL,
                'scope_id' => null,
                'calculation' => CommissionRule::CALC_PERCENTAGE,
                'rate' => 8.0000,
                'flat_fee' => 0.00,
                'min_fee' => 0.50,
                'max_fee' => null,
                'priority' => 10,
                'status' => CommissionRule::STATUS_ACTIVE,
                'created_by_user_id' => $admin?->id,
            ]
        );

        if (isset($categoryMap['electronics'])) {
            CommissionRule::query()->firstOrCreate(
                ['name' => 'Electronics Competitive Tier'],
                [
                    'description' => 'Reduced fee for competitive electronics hardware.',
                    'scope_type' => CommissionRule::SCOPE_CATEGORY,
                    'scope_id' => $categoryMap['electronics']->id,
                    'calculation' => CommissionRule::CALC_PERCENTAGE,
                    'rate' => 6.0000,
                    'flat_fee' => 0.00,
                    'min_fee' => 1.00,
                    'priority' => 50,
                    'status' => CommissionRule::STATUS_ACTIVE,
                    'created_by_user_id' => $admin?->id,
                ]
            );
        }

        // 3. Coupons & Promotion Engine (§18)
        Coupon::query()->firstOrCreate(
            ['code' => 'WELCOME10'],
            [
                'tenant_id' => null,
                'store_id' => null,
                'name' => 'MarketHub Welcome Discount',
                'description' => '10% off your first market order of $20 or more.',
                'discount_type' => Coupon::TYPE_PERCENTAGE,
                'value' => 10.00,
                'currency' => 'USD',
                'min_subtotal' => 20.00,
                'max_discount' => 50.00,
                'usage_limit' => 1000,
                'per_user_limit' => 1,
                'used_count' => 5,
                'redeemed_value' => 28.50,
                'applies_to' => Coupon::APPLIES_ALL,
                'status' => Coupon::STATUS_ACTIVE,
                'starts_at' => now()->subDays(30),
                'ends_at' => now()->addMonths(6),
                'created_by_user_id' => $admin?->id,
            ]
        );

        if ($sellerTenant && $sellerStore) {
            Coupon::query()->firstOrCreate(
                ['code' => 'NORTHSTAR15'],
                [
                    'tenant_id' => $sellerTenant->id,
                    'store_id' => $sellerStore->id,
                    'name' => 'Northstar Gadgets Flash Sale',
                    'description' => '15% storewide discount for gadget enthusiasts.',
                    'discount_type' => Coupon::TYPE_PERCENTAGE,
                    'value' => 15.00,
                    'currency' => 'USD',
                    'min_subtotal' => 45.00,
                    'usage_limit' => 200,
                    'per_user_limit' => 2,
                    'used_count' => 12,
                    'redeemed_value' => 142.20,
                    'applies_to' => Coupon::APPLIES_ALL,
                    'status' => Coupon::STATUS_ACTIVE,
                    'starts_at' => now()->subDays(14),
                    'ends_at' => now()->addMonths(3),
                    'created_by_user_id' => $sellerTenant->owner_user_id ?? $admin?->id,
                ]
            );
        }

        // 4. Reviews & Ratings Moderation (§17)
        $headphones = Product::withoutGlobalScopes()->where('name', 'like', '%Headphones%')->first();
        if ($headphones && $customer) {
            Review::withoutGlobalScopes()->firstOrCreate(
                [
                    'product_id' => $headphones->id,
                    'user_id' => $customer->id,
                ],
                [
                    'tenant_id' => $headphones->tenant_id,
                    'store_id' => $headphones->store_id,
                    'rating' => 5,
                    'title' => 'Superb sound isolation and premium build',
                    'body' => 'I have been using these for two weeks now. The battery lasts well past 35 hours and the ANC is crisp on commutes. Truly impressed!',
                    'status' => Review::STATUS_APPROVED,
                    'is_verified_purchase' => true,
                    'helpful_count' => 7,
                    'published_at' => now()->subDays(5),
                    'moderated_by_user_id' => $admin?->id,
                    'moderated_at' => now()->subDays(5),
                ]
            );
        }

        $watch = Product::withoutGlobalScopes()->where('name', 'like', '%Smartwatch%')->first();
        if ($watch && $customer) {
            Review::withoutGlobalScopes()->firstOrCreate(
                [
                    'product_id' => $watch->id,
                    'user_id' => $customer->id,
                ],
                [
                    'tenant_id' => $watch->tenant_id,
                    'store_id' => $watch->store_id,
                    'rating' => 4,
                    'title' => 'Crisp AMOLED display and reliable notifications',
                    'body' => 'Great watch for the price. Tracks steps accurately and battery easily lasts 6 days before needing a dock.',
                    'status' => Review::STATUS_APPROVED,
                    'is_verified_purchase' => true,
                    'helpful_count' => 3,
                    'published_at' => now()->subDays(2),
                    'moderated_by_user_id' => $admin?->id,
                    'moderated_at' => now()->subDays(2),
                ]
            );
        }

        // 5. Delivery Zones & Methods (§16)
        if ($sellerTenant) {
            $zone = DeliveryZone::withoutGlobalScopes()->firstOrCreate(
                [
                    'tenant_id' => $sellerTenant->id,
                    'name' => 'Domestic Standard Shipping',
                ],
                [
                    'store_id' => $sellerStore?->id,
                    'description' => 'Fast ground delivery nationwide.',
                    'match_type' => DeliveryZone::MATCH_COUNTRY,
                    'countries' => ['GH', 'NG', 'KE', 'US'],
                    'base_fee' => 5.00,
                    'per_item_fee' => 1.00,
                    'per_kg_fee' => 0.50,
                    'free_over' => 100.00,
                    'min_days' => 2,
                    'max_days' => 4,
                    'priority' => 1,
                    'is_default' => true,
                    'status' => DeliveryZone::STATUS_ACTIVE,
                ]
            );

            DeliveryMethod::withoutGlobalScopes()->firstOrCreate(
                [
                    'tenant_id' => $sellerTenant->id,
                    'name' => 'Standard Ground Courier',
                ],
                [
                    'store_id' => $sellerStore?->id,
                    'delivery_zone_id' => $zone->id,
                    'type' => 'courier',
                    'carrier' => 'DHL Express',
                    'service_level' => 'Standard',
                    'fee' => 5.00,
                    'free_over' => 100.00,
                    'min_days' => 2,
                    'max_days' => 4,
                    'status' => 'active',
                ]
            );

            DeliveryMethod::withoutGlobalScopes()->firstOrCreate(
                [
                    'tenant_id' => $sellerTenant->id,
                    'name' => 'Express Priority Courier',
                ],
                [
                    'store_id' => $sellerStore?->id,
                    'delivery_zone_id' => $zone->id,
                    'type' => 'courier',
                    'carrier' => 'FedEx',
                    'service_level' => 'Next Day',
                    'fee' => 15.00,
                    'min_days' => 1,
                    'max_days' => 2,
                    'status' => 'active',
                ]
            );
        }

        // 6. In-App Notifications (§20)
        if ($customer) {
            AppNotification::query()->firstOrCreate(
                [
                    'user_id' => $customer->id,
                    'title' => 'Welcome to MarketHub!',
                ],
                [
                    'audience' => AppNotification::AUDIENCE_CUSTOMER,
                    'category' => 'system',
                    'level' => AppNotification::LEVEL_SUCCESS,
                    'body' => 'Your account is verified and ready. Explore thousands of unique products across top verified sellers.',
                    'action_url' => '/market',
                    'action_label' => 'Explore Marketplace',
                    'read_at' => now()->subDay(),
                ]
            );
        }

        if ($sellerTenant) {
            $sellerOwner = $sellerTenant->owner;
            if ($sellerOwner) {
                AppNotification::query()->firstOrCreate(
                    [
                        'user_id' => $sellerOwner->id,
                        'title' => 'Store Performance Update',
                    ],
                    [
                        'tenant_id' => $sellerTenant->id,
                        'audience' => AppNotification::AUDIENCE_TENANT,
                        'category' => 'order',
                        'level' => AppNotification::LEVEL_INFO,
                        'body' => 'Your storefront received 14 new orders in the last 7 days. Fulfilment rate is at 98%.',
                        'action_url' => '/seller/orders',
                        'action_label' => 'View Orders',
                        'read_at' => null,
                    ]
                );
            }
        }

        // 7. Disputes & Customer Mediation (§18 / §27)
        $pastOrder = Order::query()->first();
        $pastSellerOrder = SellerOrder::query()->first();
        if ($pastOrder && $pastSellerOrder && $customer && $sellerTenant) {
            $dispute = Dispute::query()->firstOrCreate(
                ['reference' => 'DSP-' . Str::upper(substr(md5((string) $pastOrder->id), 0, 8))],
                [
                    'order_id' => $pastOrder->id,
                    'seller_order_id' => $pastSellerOrder->id,
                    'tenant_id' => $sellerTenant->id,
                    'store_id' => $pastSellerOrder->store_id,
                    'raised_by_user_id' => $customer->id,
                    'type' => 'damaged',
                    'status' => Dispute::STATUS_RESOLVED,
                    'priority' => 'normal',
                    'subject' => 'Outer packaging slightly crushed on delivery',
                    'description' => 'The shipping package arrived with a dented corner. Item was inspected and is working, but requested a goodwill check.',
                    'amount_claimed' => 15.00,
                    'currency' => 'USD',
                    'outcome' => 'no_action',
                    'resolution' => 'Seller reached out and confirmed device was unharmed. Buyer acknowledged satisfaction.',
                    'assigned_admin_id' => $admin?->id,
                    'resolved_at' => now()->subDays(3),
                    'last_activity_at' => now()->subDays(3),
                ]
            );

            DisputeMessage::query()->firstOrCreate(
                [
                    'dispute_id' => $dispute->id,
                    'body' => 'Notice: package box was compressed during transit.',
                ],
                [
                    'user_id' => $customer->id,
                    'author_role' => 'customer',
                    'author_name' => $customer->name,
                    'created_at' => now()->subDays(4),
                ]
            );

            DisputeMessage::query()->firstOrCreate(
                [
                    'dispute_id' => $dispute->id,
                    'body' => 'Hi Ama, we verified your warranty covers any transit damage. Glad to hear the headphones work perfectly!',
                ],
                [
                    'user_id' => $admin?->id,
                    'author_role' => 'seller',
                    'author_name' => 'Northstar Support',
                    'created_at' => now()->subDays(3),
                ]
            );
        }
    }
}
