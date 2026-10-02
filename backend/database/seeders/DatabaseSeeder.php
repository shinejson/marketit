<?php

namespace Database\Seeders;

use App\Models\Address;
use App\Models\AdBalance;
use App\Models\AdCampaign;
use App\Models\AdTarget;
use App\Models\Category;
use App\Models\Inventory;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use App\Models\SellerOrder;
use App\Models\SellerSettlement;
use App\Models\Store;
use App\Models\Tenant;
use App\Models\TenantAiSetting;
use App\Models\TenantDomain;
use App\Models\TenantSetting;
use App\Models\User;
use App\Models\UserRole;
use App\Support\PlaceholderImage;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::query()->create([
            'name' => 'Super Admin',
            'email' => 'admin@markethub.test',
            'password' => Hash::make('password'),
            'phone' => '+10000000000',
            'email_verified_at' => now(),
        ]);
        UserRole::query()->create(['user_id' => $admin->id, 'role' => 'super_admin']);

        $customer = User::query()->create([
            'name' => 'Ama Mensah',
            'email' => 'customer@markethub.test',
            'password' => Hash::make('password'),
            'phone' => '+233201111111',
            'email_verified_at' => now(),
        ]);
        UserRole::query()->create(['user_id' => $customer->id, 'role' => 'customer']);
        Address::query()->create([
            'user_id' => $customer->id,
            'label' => 'Home',
            'full_name' => 'Ama Mensah',
            'phone' => '+233201111111',
            'line1' => '14 Independence Ave',
            'city' => 'Accra',
            'state' => 'Greater Accra',
            'postal_code' => 'GA-000',
            'country' => 'GH',
            'is_default' => true,
        ]);

        $this->seedSeller(
            email: 'seller1@markethub.test',
            tenantName: 'Northstar Gadgets',
            storeName: 'Northstar Electronics',
            storeSlug: 'northstar',
            country: 'GH',
            products: [
                ['name' => 'Pulse Wireless Headphones', 'price' => 89.00, 'qty' => 40, 'cat' => 'Audio', 'brand' => 'Pulse'],
                ['name' => 'Orbit Smartwatch', 'price' => 149.00, 'qty' => 25, 'cat' => 'Wearables', 'brand' => 'Orbit'],
                ['name' => 'Nimbus Bluetooth Speaker', 'price' => 59.00, 'qty' => 8, 'cat' => 'Audio', 'brand' => 'Nimbus'],
                ['name' => 'Aero USB-C Hub', 'price' => 39.00, 'qty' => 60, 'cat' => 'Accessories', 'brand' => 'Aero'],
            ],
        );

        $this->seedSeller(
            email: 'seller2@markethub.test',
            tenantName: 'Kente & Co',
            storeName: 'Kente Home',
            storeSlug: 'kente-home',
            country: 'GH',
            products: [
                ['name' => 'Handwoven Throw Blanket', 'price' => 72.00, 'qty' => 18, 'cat' => 'Home', 'brand' => 'Kente'],
                ['name' => 'Ceramic Pour-Over Set', 'price' => 48.00, 'qty' => 22, 'cat' => 'Kitchen', 'brand' => 'Clayhouse'],
                ['name' => 'Shea Body Butter 200ml', 'price' => 16.00, 'qty' => 80, 'cat' => 'Beauty', 'brand' => 'SheaGold'],
                ['name' => 'Woven Market Tote', 'price' => 28.00, 'qty' => 4, 'cat' => 'Home', 'brand' => 'Kente'],
            ],
        );

        $this->seedPhase3();
        $this->seedTenantOps();
        $this->call(BillingSeeder::class);
        $this->call(AccountingSeeder::class);
        $this->call(SalesSeeder::class);
        $this->call(MarketingSeeder::class);
        $this->call(SupportSeeder::class);
        $this->call(AuditLogSeeder::class);
    }

    protected function seedPhase3(): void
    {
        $north = Tenant::query()->where('slug', 'northstar-gadgets')->first();
        $store = Store::withoutGlobalScopes()->where('slug', 'northstar')->first();
        $product = Product::withoutGlobalScopes()->where('slug', 'pulse-wireless-headphones')->first();
        if (! $north || ! $store || ! $product) {
            return;
        }

        AdBalance::query()->firstOrCreate(
            ['tenant_id' => $north->id],
            ['balance' => 50.00],
        );
        $campaign = AdCampaign::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $north->id, 'name' => 'Pulse launch'],
            [
                'store_id' => $store->id,
                'status' => AdCampaign::STATUS_ACTIVE,
                'daily_budget' => 20,
                'total_budget' => 200,
                'bid_cpc' => 0.35,
                'start_date' => now()->toDateString(),
            ],
        );
        AdTarget::query()->firstOrCreate([
            'campaign_id' => $campaign->id,
            'product_id' => $product->id,
        ], ['match_type' => 'exact']);
        TenantAiSetting::query()->firstOrCreate(
            ['tenant_id' => $north->id],
            ['tone' => 'warm', 'length' => 'medium', 'language' => 'en', 'monthly_token_budget' => 50000],
        );
        TenantDomain::withoutGlobalScopes()->firstOrCreate(
            ['domain' => 'shop.northstar.test'],
            [
                'tenant_id' => $north->id,
                'status' => TenantDomain::STATUS_DNS_PENDING,
                'verification_token' => 'demo-verify-token-northstar',
                'cert_status' => 'none',
            ],
        );
    }

    protected function seedSeller(string $email, string $tenantName, string $storeName, string $storeSlug, string $country, array $products): void
    {
        $owner = User::query()->create([
            'name' => $tenantName.' Owner',
            'email' => $email,
            'password' => Hash::make('password'),
            'phone' => '+233200000000',
            'email_verified_at' => now(),
        ]);

        $tenant = Tenant::query()->create([
            'name' => $tenantName,
            'slug' => Str::slug($tenantName),
            'status' => Tenant::STATUS_ACTIVE,
            'owner_user_id' => $owner->id,
            'country' => $country,
            'business_name' => $tenantName,
        ]);

        UserRole::query()->create([
            'user_id' => $owner->id,
            'role' => 'tenant_owner',
            'tenant_id' => $tenant->id,
        ]);

        $store = Store::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => $storeName,
            'slug' => $storeSlug,
            'status' => Store::STATUS_ACTIVE,
            'currency' => 'USD',
            'delivery_fee' => 5.00,
            'delivery_days' => 4,
            'description' => $storeName.' — curated goods for everyday life.',
            'contact_email' => $email,
            'city' => 'Accra',
            'country' => $country,
            'is_featured' => true,
        ]);

        $cats = [];
        foreach (collect($products)->pluck('cat')->unique() as $catName) {
            $cats[$catName] = Category::withoutGlobalScopes()->create([
                'tenant_id' => $tenant->id,
                'name' => $catName,
                'slug' => Str::slug($catName),
                'position' => count($cats),
            ]);
        }

        foreach ($products as $p) {
            $product = Product::withoutGlobalScopes()->create([
                'tenant_id' => $tenant->id,
                'store_id' => $store->id,
                'category_id' => $cats[$p['cat']]->id,
                'name' => $p['name'],
                'slug' => Str::slug($p['name']),
                'description' => $p['name'].' from '.$storeName.'. Quality marketplace listing with tracked inventory.',
                'status' => Product::STATUS_ACTIVE,
                'price' => $p['price'],
                'brand' => $p['brand'],
                'has_variants' => false,
                'is_featured' => true,
            ]);

            $variant = ProductVariant::withoutGlobalScopes()->create([
                'tenant_id' => $tenant->id,
                'product_id' => $product->id,
                'sku' => strtoupper(Str::slug($p['name'], '-')).'-001',
                'options' => ['default' => 'standard'],
                'status' => ProductVariant::STATUS_ACTIVE,
            ]);

            Inventory::withoutGlobalScopes()->create([
                'tenant_id' => $tenant->id,
                'variant_id' => $variant->id,
                'quantity' => $p['qty'],
                'reserved' => 0,
                'low_stock_threshold' => 5,
            ]);

            PlaceholderImage::make($product->slug, $product->name);

            ProductImage::withoutGlobalScopes()->create([
                'tenant_id' => $tenant->id,
                'product_id' => $product->id,
                'path' => 'placeholders/'.$product->slug.'.svg',
                'position' => 0,
                'is_primary' => true,
            ]);
        }
    }

    protected function seedTenantOps(): void
    {
        $customer = User::query()->where('email', 'customer@markethub.test')->first();
        $address = Address::query()->where('user_id', $customer?->id)->first();
        if (! $customer || ! $address) {
            return;
        }

        foreach (Tenant::query()->get() as $tenant) {
            TenantSetting::query()->firstOrCreate(
                ['tenant_id' => $tenant->id],
                [
                    'timezone' => 'Africa/Accra',
                    'currency' => 'USD',
                    'support_email' => $tenant->owner?->email,
                    'payout_email' => $tenant->owner?->email,
                    'goals' => TenantSetting::DEFAULT_GOALS,
                ]
            );
        }

        $north = Tenant::query()->where('slug', 'northstar-gadgets')->first();
        $store = Store::withoutGlobalScopes()->where('slug', 'northstar')->first();
        if ($north && $store) {
            $staff = [
                ['email' => 'finance@markethub.test', 'name' => 'Kwame Finance', 'department' => 'finance'],
                ['email' => 'sales@markethub.test', 'name' => 'Abena Sales', 'department' => 'sales'],
                ['email' => 'ops@markethub.test', 'name' => 'Yaw Operations', 'department' => 'operations'],
                ['email' => 'marketing@markethub.test', 'name' => 'Efua Marketing', 'department' => 'marketing'],
            ];
            foreach ($staff as $row) {
                $user = User::query()->firstOrCreate(
                    ['email' => $row['email']],
                    [
                        'name' => $row['name'],
                        'password' => Hash::make('password'),
                        'phone' => '+233200000111',
                        'email_verified_at' => now(),
                    ]
                );
                UserRole::query()->firstOrCreate(
                    [
                        'user_id' => $user->id,
                        'role' => 'store_staff',
                        'tenant_id' => $north->id,
                    ],
                    [
                        'department' => $row['department'],
                        'store_id' => $store->id,
                    ]
                );
            }
        }

        $this->seedHistory($customer, $address);
    }

    protected function seedHistory(User $customer, Address $address): void
    {
        $catalog = Product::withoutGlobalScopes()
            ->with(['variants.inventory', 'store'])
            ->where('status', Product::STATUS_ACTIVE)
            ->get();
        if ($catalog->isEmpty()) {
            return;
        }

        $statuses = [
            SellerOrder::STATUS_AWAITING_FULFILLMENT,
            SellerOrder::STATUS_PROCESSING,
            SellerOrder::STATUS_SHIPPED,
            SellerOrder::STATUS_DELIVERED,
            SellerOrder::STATUS_COMPLETED,
            SellerOrder::STATUS_COMPLETED,
        ];

        for ($day = 13; $day >= 0; $day--) {
            $at = now()->subDays($day)->setTime(10 + ($day % 6), 15);
            $batch = 1 + ($day % 3);
            for ($n = 0; $n < $batch; $n++) {
                $product = $catalog[($day + $n) % $catalog->count()];
                $variant = $product->variants->first();
                if (! $variant) {
                    continue;
                }
                $qty = 1 + (($day + $n) % 3);
                $price = (float) $product->price;
                $subtotal = round($price * $qty, 2);
                $delivery = (float) ($product->store?->delivery_fee ?? 5);
                $commission = round($subtotal * 0.08, 2);
                $net = round($subtotal + $delivery - $commission, 2);
                $status = $statuses[($day + $n) % count($statuses)];

                $order = Order::query()->create([
                    'user_id' => $customer->id,
                    'subtotal' => $subtotal,
                    'delivery_total' => $delivery,
                    'tax_total' => 0,
                    'grand_total' => round($subtotal + $delivery, 2),
                    'currency' => 'USD',
                    'status' => in_array($status, [SellerOrder::STATUS_DELIVERED, SellerOrder::STATUS_COMPLETED], true)
                        ? Order::STATUS_COMPLETED
                        : Order::STATUS_PAID,
                    'shipping_address_id' => $address->id,
                    'placed_at' => $at,
                ]);
                $order->forceFill(['created_at' => $at, 'updated_at' => $at])->save();

                $sellerOrder = SellerOrder::withoutGlobalScopes()->create([
                    'order_id' => $order->id,
                    'tenant_id' => $product->tenant_id,
                    'store_id' => $product->store_id,
                    'subtotal' => $subtotal,
                    'delivery_fee' => $delivery,
                    'commission' => $commission,
                    'net_settlement' => $net,
                    'status' => $status,
                ]);
                $sellerOrder->forceFill(['created_at' => $at, 'updated_at' => $at])->save();

                OrderItem::query()->create([
                    'seller_order_id' => $sellerOrder->id,
                    'variant_id' => $variant->id,
                    'product_name' => $product->name,
                    'sku' => $variant->sku,
                    'unit_price' => $price,
                    'qty' => $qty,
                    'line_tax' => 0,
                    'options' => $variant->options,
                ]);

                $settlement = SellerSettlement::query()->create([
                    'seller_order_id' => $sellerOrder->id,
                    'gross' => $subtotal,
                    'commission' => $commission,
                    'delivery_fee' => $delivery,
                    'refund_amount' => 0,
                    'net' => $net,
                    'status' => in_array($status, [SellerOrder::STATUS_DELIVERED, SellerOrder::STATUS_COMPLETED], true)
                        ? SellerSettlement::STATUS_RELEASED
                        : SellerSettlement::STATUS_PENDING,
                ]);
                $settlement->forceFill(['created_at' => $at, 'updated_at' => $at])->save();
            }
        }
    }

}
