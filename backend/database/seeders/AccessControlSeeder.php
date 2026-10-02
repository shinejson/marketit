<?php

namespace Database\Seeders;

use App\Models\Address;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\SellerOrder;
use App\Models\SellerSettlement;
use App\Models\SocialIdentity;
use App\Models\Store;
use App\Models\Tenant;
use App\Models\TenantCustomerProfile;
use App\Models\TenantRole;
use App\Models\User;
use App\Models\UserRole;
use App\Support\TenantAccess;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Demo data for the tenant access-control workspace (/tenant/users):
 * the built-in role set, system users in every state, and customers who sign
 * in with a password or a social provider.
 */
class AccessControlSeeder extends Seeder
{
    /** Staff added on top of the department demo accounts. */
    protected const STAFF = [
        [
            'email' => 'support@markethub.test', 'name' => 'Afia Boadu', 'title' => 'Support agent',
            'role' => 'support', 'department' => null, 'status' => TenantAccess::STATUS_ACTIVE,
        ],
        [
            'email' => 'warehouse@markethub.test', 'name' => 'Kojo Asante', 'title' => 'Warehouse lead',
            'role' => 'operations', 'department' => 'operations', 'status' => TenantAccess::STATUS_INVITED,
        ],
        [
            'email' => 'auditor@markethub.test', 'name' => 'Linda Owusu', 'title' => 'External auditor',
            'role' => 'viewer', 'department' => null, 'status' => TenantAccess::STATUS_ACTIVE,
        ],
        [
            'email' => 'former.staff@markethub.test', 'name' => 'Daniel Tetteh', 'title' => 'Sales assistant',
            'role' => 'sales', 'department' => 'sales', 'status' => TenantAccess::STATUS_SUSPENDED,
        ],
    ];

    /** Customers, including the ones that authenticate through a provider. */
    protected const CUSTOMERS = [
        ['name' => 'Akosua Boateng', 'email' => 'google.customer@markethub.test', 'provider' => 'google', 'orders' => 4, 'segment' => 'vip'],
        ['name' => 'Kofi Adjei', 'email' => 'facebook.customer@markethub.test', 'provider' => 'facebook', 'orders' => 2, 'segment' => 'returning'],
        ['name' => 'Naa Adoley', 'email' => 'apple.customer@markethub.test', 'provider' => 'apple', 'orders' => 1, 'segment' => 'new'],
        ['name' => 'Selorm Dzifa', 'email' => 'selorm@markethub.test', 'provider' => null, 'orders' => 3, 'segment' => 'returning'],
        ['name' => 'Yaa Serwaa', 'email' => 'yaa@markethub.test', 'provider' => 'google', 'orders' => 2, 'segment' => null],
        ['name' => 'Ibrahim Musah', 'email' => 'ibrahim@markethub.test', 'provider' => null, 'orders' => 1, 'segment' => null, 'blocked' => true],
    ];

    public function run(): void
    {
        foreach (Tenant::query()->get() as $tenant) {
            TenantRole::seedDefaultsFor($tenant->id);
        }

        $this->alignExistingAssignments();
        $this->seedStaff();
        $this->seedCustomers();
    }

    /** Point the seeded owners and department staff at their tenant role. */
    protected function alignExistingAssignments(): void
    {
        $titles = [
            'finance' => 'Finance officer',
            'sales' => 'Sales representative',
            'operations' => 'Operations lead',
            'marketing' => 'Marketing manager',
        ];

        UserRole::query()
            ->whereIn('role', TenantAccess::ACCESS_LEVELS)
            ->whereNotNull('tenant_id')
            ->get()
            ->each(function (UserRole $assignment) use ($titles) {
                $key = $assignment->role === 'tenant_owner'
                    ? TenantRole::KEY_OWNER
                    : ($assignment->department ?: 'store_staff');

                $assignment->forceFill([
                    'tenant_role_id' => $this->roleId($assignment->tenant_id, $key),
                    'status' => TenantAccess::STATUS_ACTIVE,
                    'title' => $assignment->title ?? ($assignment->role === 'tenant_owner'
                        ? 'Owner'
                        : ($titles[$assignment->department] ?? 'Store staff')),
                ])->save();
            });
    }

    protected function seedStaff(): void
    {
        $tenant = Tenant::query()->where('slug', 'northstar-gadgets')->first();
        $store = $tenant ? Store::withoutGlobalScopes()->where('tenant_id', $tenant->id)->first() : null;
        if (! $tenant) {
            return;
        }

        foreach (self::STAFF as $row) {
            $user = User::query()->firstOrCreate(
                ['email' => $row['email']],
                [
                    'name' => $row['name'],
                    'password' => Hash::make('password'),
                    'phone' => '+233200000222',
                    'email_verified_at' => now(),
                ]
            );

            UserRole::query()->updateOrCreate(
                ['user_id' => $user->id, 'role' => 'store_staff', 'tenant_id' => $tenant->id],
                [
                    'department' => $row['department'],
                    'store_id' => $store?->id,
                    'tenant_role_id' => $this->roleId($tenant->id, $row['role']),
                    'title' => $row['title'],
                    'status' => $row['status'],
                    'invited_at' => now()->subDays(12),
                ]
            );
        }

        // One person with a bespoke permission set, so the console always has
        // an example of an override on screen.
        $custom = User::query()->where('email', 'support@markethub.test')->first();
        if ($custom) {
            UserRole::query()
                ->where('user_id', $custom->id)
                ->where('tenant_id', $tenant->id)
                ->update([
                    'permissions' => json_encode([
                        'dashboard.view', 'orders.view', 'orders.manage', 'customers.view',
                        'customers.message', 'support.view', 'support.manage', 'reports.export',
                    ]),
                ]);
        }
    }

    protected function seedCustomers(): void
    {
        $catalog = Product::withoutGlobalScopes()
            ->with(['variants.inventory', 'store'])
            ->where('status', Product::STATUS_ACTIVE)
            ->get();

        if ($catalog->isEmpty()) {
            return;
        }

        // The demo shopper from the base seeder also signs in with Google.
        $existing = User::query()->where('email', 'customer@markethub.test')->first();
        if ($existing) {
            $this->linkIdentity($existing, 'google');
        }

        foreach (self::CUSTOMERS as $index => $row) {
            $user = User::query()->firstOrCreate(
                ['email' => $row['email']],
                [
                    'name' => $row['name'],
                    'password' => Hash::make('password'),
                    'phone' => '+2332012345'.str_pad((string) $index, 2, '0', STR_PAD_LEFT),
                    'email_verified_at' => now(),
                    'last_login_at' => now()->subDays($index + 1),
                ]
            );

            UserRole::query()->firstOrCreate(['user_id' => $user->id, 'role' => 'customer', 'tenant_id' => null]);

            if ($row['provider']) {
                $this->linkIdentity($user, $row['provider']);
            }

            $address = Address::query()->firstOrCreate(
                ['user_id' => $user->id, 'label' => 'Home'],
                [
                    'full_name' => $row['name'],
                    'phone' => $user->phone,
                    'line1' => (10 + $index).' Oxford Street',
                    'city' => 'Accra',
                    'state' => 'Greater Accra',
                    'postal_code' => 'GA-00'.$index,
                    'country' => 'GH',
                    'is_default' => true,
                ]
            );

            $tenantIds = [];
            for ($n = 0; $n < $row['orders']; $n++) {
                $product = $catalog[($index * 3 + $n) % $catalog->count()];
                $tenantIds[] = $this->placeOrder($user, $address, $product, $index + $n);
            }

            foreach (array_unique(array_filter($tenantIds)) as $tenantId) {
                TenantCustomerProfile::query()->updateOrCreate(
                    ['tenant_id' => $tenantId, 'user_id' => $user->id],
                    [
                        'status' => ! empty($row['blocked'])
                            ? TenantCustomerProfile::STATUS_BLOCKED
                            : TenantCustomerProfile::STATUS_ACTIVE,
                        'segment' => $row['segment'],
                        'tags' => $row['segment'] === 'vip' ? ['high-value', 'newsletter'] : [],
                        'notes' => ! empty($row['blocked'])
                            ? 'Repeated chargebacks — blocked from checkout pending review.'
                            : null,
                        'marketing_opt_in' => $row['provider'] !== null,
                    ]
                );
            }
        }
    }

    protected function linkIdentity(User $user, string $provider): void
    {
        SocialIdentity::query()->updateOrCreate(
            ['provider' => $provider, 'provider_user_id' => $provider.'-'.$user->id],
            [
                'user_id' => $user->id,
                'email' => $user->email,
                'nickname' => $user->name,
                'avatar_url' => null,
                'last_login_at' => now()->subDays(random_int(0, 9)),
                'meta' => ['demo' => true],
            ]
        );
    }

    /** Minimal paid order so the customer shows real spend for a tenant. */
    protected function placeOrder(User $user, Address $address, Product $product, int $seed): ?int
    {
        $variant = $product->variants->first();
        if (! $variant) {
            return null;
        }

        $at = now()->subDays(($seed * 3) % 45)->setTime(9 + ($seed % 8), 30);
        $qty = 1 + ($seed % 2);
        $price = (float) $product->price;
        $subtotal = round($price * $qty, 2);
        $delivery = (float) ($product->store?->delivery_fee ?? 5);
        $commission = round($subtotal * 0.08, 2);
        $net = round($subtotal + $delivery - $commission, 2);

        $order = Order::query()->create([
            'user_id' => $user->id,
            'subtotal' => $subtotal,
            'delivery_total' => $delivery,
            'tax_total' => 0,
            'grand_total' => round($subtotal + $delivery, 2),
            'currency' => 'USD',
            'status' => Order::STATUS_COMPLETED,
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
            'status' => SellerOrder::STATUS_COMPLETED,
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

        SellerSettlement::query()->create([
            'seller_order_id' => $sellerOrder->id,
            'gross' => $subtotal,
            'commission' => $commission,
            'delivery_fee' => $delivery,
            'refund_amount' => 0,
            'net' => $net,
            'status' => SellerSettlement::STATUS_RELEASED,
        ])->forceFill(['created_at' => $at, 'updated_at' => $at])->save();

        return (int) $product->tenant_id;
    }

    protected function roleId(?int $tenantId, string $key): ?int
    {
        if (! $tenantId) {
            return null;
        }

        return TenantRole::query()->withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('key', $key)
            ->value('id');
    }
}
