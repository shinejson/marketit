<?php

namespace Database\Seeders;

use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Models\Tenant;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/** Plans, tenant subscriptions, invoice history and a few demo accounts. */
class BillingSeeder extends Seeder
{
    public function run(): void
    {
        $plans = $this->seedPlans();
        $this->seedDemoTenants();
        $this->seedSubscriptions($plans);
        $this->seedStaff();
    }

    /** @return array<string, Plan> */
    protected function seedPlans(): array
    {
        $definitions = [
            [
                'name' => 'Starter', 'slug' => 'starter', 'price' => 0, 'interval' => 'monthly',
                'description' => 'For new sellers finding their first customers.',
                'trial_days' => 0, 'commission_rate' => 12, 'max_products' => 25, 'max_stores' => 1, 'max_staff' => 1,
                'features' => ['1 store', '25 products', 'Standard support'], 'sort_order' => 1,
            ],
            [
                'name' => 'Growth', 'slug' => 'growth', 'price' => 49, 'interval' => 'monthly',
                'description' => 'Scaling shops that need analytics and ads.',
                'trial_days' => 14, 'commission_rate' => 9, 'max_products' => 500, 'max_stores' => 3, 'max_staff' => 5,
                'features' => ['3 stores', '500 products', 'Ads manager', 'Analytics'], 'sort_order' => 2,
            ],
            [
                'name' => 'Pro', 'slug' => 'pro', 'price' => 149, 'interval' => 'monthly',
                'description' => 'High-volume merchants with custom domains.',
                'trial_days' => 14, 'commission_rate' => 6, 'max_products' => 5000, 'max_stores' => 10, 'max_staff' => 20,
                'features' => ['10 stores', 'Custom domains', 'API access', 'AI copywriting'], 'sort_order' => 3,
            ],
            [
                'name' => 'Enterprise', 'slug' => 'enterprise', 'price' => 1490, 'interval' => 'yearly',
                'description' => 'Dedicated support and negotiated commission.',
                'trial_days' => 30, 'commission_rate' => 4, 'max_products' => null, 'max_stores' => null, 'max_staff' => null,
                'features' => ['Unlimited everything', 'Dedicated CSM', 'SLA', 'SSO'], 'sort_order' => 4,
            ],
        ];

        $plans = [];
        foreach ($definitions as $definition) {
            $plans[$definition['slug']] = Plan::query()->updateOrCreate(
                ['slug' => $definition['slug']],
                $definition + ['currency' => 'USD', 'is_active' => true],
            );
        }

        return $plans;
    }

    /** Extra tenants so the admin charts have a believable shape. */
    protected function seedDemoTenants(): void
    {
        $demo = [
            ['Accra Fresh Foods', 'active', 52],
            ['Volta Textiles', 'active', 41],
            ['Kumasi Tech Hub', 'active', 30],
            ['Cape Coast Crafts', 'pending', 18],
            ['Tamale Organics', 'pending', 9],
            ['Sunyani Supplies', 'suspended', 25],
            ['Takoradi Marine Gear', 'rejected', 34],
        ];

        foreach ($demo as [$name, $status, $daysAgo]) {
            $slug = Str::slug($name);
            if (Tenant::query()->where('slug', $slug)->exists()) {
                continue;
            }

            $email = $slug.'@markethub.test';
            $owner = User::query()->firstOrCreate(
                ['email' => $email],
                [
                    'name' => Str::before($name, ' ').' Owner',
                    'password' => Hash::make('password'),
                    'phone' => '+2332'.random_int(10000000, 99999999),
                    'status' => $status === 'suspended' ? 'suspended' : 'active',
                    'email_verified_at' => now(),
                ],
            );
            $owner->forceFill(['created_at' => now()->subDays($daysAgo), 'updated_at' => now()->subDays($daysAgo)])->saveQuietly();

            UserRole::query()->firstOrCreate(['user_id' => $owner->id, 'role' => 'tenant_owner', 'tenant_id' => null]);

            $tenant = Tenant::query()->create([
                'name' => $name,
                'slug' => $slug,
                'status' => $status,
                'owner_user_id' => $owner->id,
                'country' => 'GH',
                'business_name' => $name,
                'business_type' => 'limited_company',
                'registration_number' => 'RC-'.random_int(100000, 999999),
                'owner_name' => $owner->name,
                'owner_email' => $email,
                'city' => Str::before($name, ' '),
                'submitted_at' => now()->subDays($daysAgo),
            ]);
            $tenant->forceFill(['created_at' => now()->subDays($daysAgo), 'updated_at' => now()->subDays($daysAgo)])->saveQuietly();

            UserRole::query()->where('user_id', $owner->id)->whereNull('tenant_id')->update(['tenant_id' => $tenant->id]);
        }
    }

    protected function seedSubscriptions(array $plans): void
    {
        $order = ['growth', 'pro', 'starter', 'enterprise'];
        $statuses = [
            Subscription::STATUS_ACTIVE,
            Subscription::STATUS_ACTIVE,
            Subscription::STATUS_TRIALING,
            Subscription::STATUS_PAST_DUE,
            Subscription::STATUS_ACTIVE,
            Subscription::STATUS_CANCELED,
        ];

        foreach (Tenant::query()->orderBy('id')->get() as $index => $tenant) {
            if (Subscription::query()->where('tenant_id', $tenant->id)->exists()) {
                continue;
            }

            $plan = $plans[$order[$index % count($order)]];
            $status = $statuses[$index % count($statuses)];
            $start = now()->subMonths(6)->addDays($index * 3);

            $subscription = Subscription::query()->create([
                'tenant_id' => $tenant->id,
                'plan_id' => $plan->id,
                'status' => $status,
                'amount' => $plan->price,
                'currency' => $plan->currency,
                'interval' => $plan->interval,
                'trial_ends_at' => $status === Subscription::STATUS_TRIALING ? now()->addDays(7) : null,
                'started_at' => $start,
                'current_period_start' => now()->startOfMonth(),
                'current_period_end' => $plan->interval === 'yearly' ? now()->startOfMonth()->addYear() : now()->startOfMonth()->addMonth(),
                'canceled_at' => $status === Subscription::STATUS_CANCELED ? now()->subDays(12) : null,
            ]);

            if ((float) $plan->price <= 0) {
                continue;
            }

            // Six months of history so the billing chart has a trend line.
            for ($back = 5; $back >= 0; $back--) {
                $issued = now()->startOfMonth()->subMonths($back);
                if ($issued->lt($start->copy()->startOfMonth())) {
                    continue;
                }

                $paid = $back > 0 || $status === Subscription::STATUS_ACTIVE;

                SubscriptionInvoice::query()->create([
                    'subscription_id' => $subscription->id,
                    'tenant_id' => $tenant->id,
                    'number' => 'INV-'.$issued->format('Ym').'-'.Str::upper(Str::random(6)),
                    'amount' => $plan->price,
                    'currency' => $plan->currency,
                    'status' => $paid ? SubscriptionInvoice::STATUS_PAID : ($status === Subscription::STATUS_PAST_DUE ? SubscriptionInvoice::STATUS_FAILED : SubscriptionInvoice::STATUS_OPEN),
                    'period_start' => $issued,
                    'period_end' => $issued->copy()->addMonth(),
                    'issued_at' => $issued,
                    'paid_at' => $paid ? $issued->copy()->addDays(1) : null,
                ]);
            }
        }
    }

    /** A second super admin and a support agent to populate the users screen. */
    protected function seedStaff(): void
    {
        $ops = User::query()->firstOrCreate(
            ['email' => 'ops@markethub.test'],
            [
                'name' => 'Kofi Boateng',
                'password' => Hash::make('password'),
                'phone' => '+233209999999',
                'status' => 'active',
                'email_verified_at' => now(),
            ],
        );
        UserRole::query()->firstOrCreate(['user_id' => $ops->id, 'role' => 'super_admin', 'tenant_id' => null]);

        foreach ([['Akosua Danso', 'akosua@markethub.test'], ['Yaw Owusu', 'yaw@markethub.test']] as [$name, $email]) {
            $user = User::query()->firstOrCreate(
                ['email' => $email],
                [
                    'name' => $name,
                    'password' => Hash::make('password'),
                    'status' => 'active',
                    'email_verified_at' => now(),
                ],
            );
            UserRole::query()->firstOrCreate(['user_id' => $user->id, 'role' => 'customer', 'tenant_id' => null]);
        }
    }
}
