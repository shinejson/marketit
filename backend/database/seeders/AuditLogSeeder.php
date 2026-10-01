<?php

namespace Database\Seeders;

use App\Models\AuditLog;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Curated audit history for the super-admin audit console.
 *
 * The model-event audit writes produced while seeding run from the CLI with no
 * authenticated user, so they carry a null actor and null IP. This seeder
 * replaces them with a realistic 30-day platform trail: real seeded users as
 * actors, plausible client IPs, and before/after diffs — newest events landing
 * a few minutes ago.
 */
class AuditLogSeeder extends Seeder
{
    /** Deterministic seed so the demo trail is stable across reseeds. */
    private const RAND_SEED = 20261001;

    /** @var int[] First two tenants, ordered by id: [northstar, kente]. */
    private array $tenantIds = [1, 2];

    public function run(): void
    {
        $actors = $this->actors();
        if ($actors === []) {
            return;
        }

        $ids = Tenant::query()->orderBy('id')->limit(2)->pluck('id')->all();
        $this->tenantIds = [(int) ($ids[0] ?? 1), (int) ($ids[1] ?? 2)];

        AuditLog::query()->delete();
        mt_srand(self::RAND_SEED);

        $rows = [];
        $at = fn (int $daysAgo, int $hour, int $minute) => now()->subDays($daysAgo)->setTime($hour, $minute, mt_rand(0, 59));

        // ------------------------------------------------------------- history
        for ($daysAgo = 29; $daysAgo >= 1; $daysAgo--) {
            $count = mt_rand(4, 7);
            $hours = range(8, 19);
            shuffle($hours);
            $hours = array_slice($hours, 0, $count);
            sort($hours);

            foreach ($hours as $i => $hour) {
                $rows[] = $this->event($at($daysAgo, $hour, mt_rand(0, 59)), $actors, $daysAgo);
            }
        }

        // ------------------------------------------------- today: busiest day
        $todayPlan = [
            [8, 41], [9, 12], [10, 33], [11, 5], [13, 48], [15, 26], [16, 58], [18, 3],
        ];
        foreach ($todayPlan as [$hour, $minute]) {
            $rows[] = $this->event(now()->today()->setTime($hour, $minute, mt_rand(0, 59)), $actors, 0);
        }
        // A fresh burst so the newest entries read "minutes ago".
        foreach ([46, 31, 22, 11, 6] as $minutesAgo) {
            $rows[] = $this->event(now()->subMinutes($minutesAgo), $actors, 0, recent: true);
        }

        foreach (array_chunk($rows, 50) as $chunk) {
            AuditLog::query()->insert($chunk);
        }
    }

    /**
     * Build one audit row at a given moment. Recent events lean towards
     * day-to-day catalog work; older history includes more administrative
     * actions (tenant approval, settings, backups).
     */
    private function event(\DateTimeInterface $at, array $actors, int $daysAgo, bool $recent = false): array
    {
        $actorKey = $this->pickActor($recent);
        $actor = $actors[$actorKey];

        [$tenantId, $action, $subjectType, $subjectId, $diff] = $this->pickSubject($actorKey, $daysAgo, $recent);

        return [
            'actor_user_id' => $actor['id'],
            'tenant_id' => $tenantId,
            'action' => $action,
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'diff' => json_encode($diff),
            'ip' => $this->pickIp($actorKey, $actorKey === 'system'),
            'created_at' => $at,
            'updated_at' => $at,
        ];
    }

    /** Weighted actor choice: day-to-day work is mostly tenant staff. */
    private function pickActor(bool $recent): string
    {
        $weights = $recent
            ? ['seller1' => 30, 'seller2' => 25, 'ops' => 15, 'marketing' => 10, 'finance' => 8, 'sales' => 7, 'admin' => 5]
            : ['seller1' => 22, 'seller2' => 18, 'ops' => 14, 'marketing' => 11, 'finance' => 10, 'sales' => 10, 'admin' => 10, 'system' => 5];

        return $this->weighted($weights);
    }

    /**
     * Pick a plausible (tenant, action, subject, diff) combination for an
     * actor. Only actions the platform actually writes are used.
     */
    private function pickSubject(string $actorKey, int $daysAgo, bool $recent): array
    {
        $north = $this->tenantIds[0];
        $kente = $this->tenantIds[1];

        $products = [
            $north => [
                ['id' => 1, 'name' => 'Pulse Wireless Headphones', 'price' => '89.00'],
                ['id' => 2, 'name' => 'Orbit Smartwatch', 'price' => '149.00'],
                ['id' => 3, 'name' => 'Nimbus Bluetooth Speaker', 'price' => '59.00'],
                ['id' => 4, 'name' => 'Aero USB-C Hub', 'price' => '39.00'],
            ],
            $kente => [
                ['id' => 5, 'name' => 'Handwoven Throw Blanket', 'price' => '72.00'],
                ['id' => 6, 'name' => 'Ceramic Pour-Over Set', 'price' => '48.00'],
                ['id' => 7, 'name' => 'Shea Body Butter 200ml', 'price' => '16.00'],
                ['id' => 8, 'name' => 'Woven Market Tote', 'price' => '28.00'],
            ],
        ];

        $orderStatuses = ['awaiting_fulfilment', 'processing', 'shipped', 'delivered', 'completed'];

        switch ($actorKey) {
            case 'admin':
                $choice = $this->weighted(
                    $daysAgo > 20
                        ? ['tenant' => 35, 'user' => 20, 'settings' => 20, 'backup' => 15, 'subscription' => 10]
                        : ['user' => 30, 'settings' => 25, 'backup' => 20, 'subscription' => 15, 'tenant' => 10]
                );

                return match ($choice) {
                    'tenant' => [
                        mt_rand(1, 2) === 1 ? $north : $kente,
                        'updated',
                        'App\\Models\\Tenant',
                        mt_rand(1, 2),
                        ['before' => ['status' => 'pending'], 'after' => ['status' => 'active']],
                    ],
                    'user' => [
                        null,
                        'updated',
                        'App\\Models\\User',
                        mt_rand(2, 8),
                        ['before' => ['status' => 'active'], 'after' => ['status' => mt_rand(0, 3) === 0 ? 'suspended' : 'active']],
                    ],
                    'subscription' => [
                        mt_rand(1, 2) === 1 ? $north : $kente,
                        'updated',
                        'App\\Models\\Subscription',
                        mt_rand(1, 2),
                        ['before' => ['status' => 'trialing', 'plan_id' => 1], 'after' => ['status' => 'active', 'plan_id' => 2]],
                    ],
                    'backup' => $this->backupEvent(),
                    default => $this->settingsEvent(),
                };

            case 'seller1':
            case 'seller2':
                $tenantId = $actorKey === 'seller1' ? $north : $kente;
                $product = $products[$tenantId][mt_rand(0, 3)];
                $choice = $this->weighted(['product_updated' => 42, 'product_created' => 15, 'inventory' => 18, 'variant' => 9, 'store' => 9, 'product_deleted' => 7]);

                return match ($choice) {
                    'product_created' => [$tenantId, 'created', 'App\\Models\\Product', $product['id'], [
                        'before' => null,
                        'after' => ['name' => $product['name'], 'price' => $product['price'], 'qty' => mt_rand(5, 60), 'status' => 'draft'],
                    ]],
                    'product_deleted' => [$tenantId, 'deleted', 'App\\Models\\Product', $product['id'], [
                        'before' => ['name' => $product['name'], 'status' => 'active'], 'after' => null,
                    ]],
                    'inventory' => [$tenantId, 'updated', 'App\\Models\\Inventory', $product['id'], [
                        'before' => ['qty' => mt_rand(1, 6)], 'after' => ['qty' => mt_rand(10, 50)],
                    ]],
                    'variant' => [$tenantId, 'updated', 'App\\Models\\ProductVariant', $product['id'], [
                        'before' => ['price' => $product['price']], 'after' => ['price' => number_format((float) $product['price'] - mt_rand(3, 12), 2)],
                    ]],
                    'store' => [$tenantId, 'updated', 'App\\Models\\Store', $tenantId, [
                        'before' => ['delivery_fee' => '5.00'], 'after' => ['delivery_fee' => mt_rand(0, 1) === 0 ? '4.00' : '6.00'],
                    ]],
                    default => [$tenantId, 'updated', 'App\\Models\\Product', $product['id'], [
                        'before' => ['price' => $product['price']],
                        'after' => ['price' => number_format(max(5, (float) $product['price'] + mt_rand(-10, 6)), 2)],
                    ]],
                };

            case 'ops':
                $tenantId = mt_rand(0, 1) === 0 ? $north : $kente;
                $from = $orderStatuses[mt_rand(0, 3)];
                $to = $orderStatuses[array_search($from, $orderStatuses, true) + 1];

                return [$tenantId, 'updated', 'App\\Models\\SellerOrder', mt_rand(10, 99), [
                    'before' => ['status' => $from], 'after' => ['status' => $to],
                ]];

            case 'finance':
                $tenantId = mt_rand(0, 1) === 0 ? $north : $kente;

                return [$tenantId, 'updated', 'App\\Models\\Subscription', mt_rand(1, 2), [
                    'before' => ['status' => 'past_due'], 'after' => ['status' => 'active'],
                ]];

            case 'marketing':
            case 'sales':
                $tenantId = mt_rand(0, 1) === 0 ? $north : $kente;
                $product = $products[$tenantId][mt_rand(0, 3)];

                return mt_rand(0, 2) === 0
                    ? [$tenantId, 'created', 'App\\Models\\Category', mt_rand(5, 12), ['before' => null, 'after' => ['name' => 'New Arrivals', 'slug' => 'new-arrivals']]]
                    : [$tenantId, 'updated', 'App\\Models\\Product', $product['id'], [
                        'before' => ['status' => 'draft'], 'after' => ['status' => 'active'],
                    ]];

            default: // system (scheduler / webhooks)
                return $this->backupEvent(scheduled: true);
        }
    }

    private function settingsEvent(): array
    {
        $keys = [
            ['general.platform_name', 'general.support_email'],
            ['commerce.commission_rate'],
            ['security.session_lifetime', 'security.force_2fa'],
            ['email.from_address', 'email.from_name'],
        ][mt_rand(0, 3)];

        $action = match (mt_rand(0, 5)) {
            0 => 'settings.reset',
            1 => 'settings.asset_uploaded',
            2 => 'settings.email_test_sent',
            3 => 'settings.email_test_failed',
            4 => 'settings.sms_test_sent',
            default => 'settings.updated',
        };

        $after = match ($action) {
            'settings.reset' => ['group' => 'commerce'],
            'settings.asset_uploaded' => ['asset' => 'brand_logo', 'path' => 'branding/logo-'.mt_rand(2, 9).'.svg'],
            'settings.email_test_sent' => ['to' => 'ops@markethub.test', 'transport' => 'smtp'],
            'settings.email_test_failed' => ['to' => 'finance@markethub.test', 'error' => 'SMTP connect() failed: connection timed out'],
            'settings.sms_test_sent' => ['to' => '+233200000111', 'sender' => 'MarketHub'],
            default => ['keys' => $keys],
        };

        return [null, $action, 'App\\Models\\PlatformSetting', null, ['before' => null, 'after' => $after]];
    }

    private function backupEvent(bool $scheduled = false): array
    {
        $scope = mt_rand(0, 1) === 0 ? 'full' : 'settings';
        $action = match (mt_rand(0, 6)) {
            0 => 'backup.restored',
            1 => 'backup.deleted',
            2 => 'backup.failed',
            default => 'backup.created',
        };

        $after = match ($action) {
            'backup.restored' => ['id' => mt_rand(1, 12), 'scope' => $scope, 'settings_restored' => 41],
            'backup.deleted' => ['id' => mt_rand(1, 12)],
            'backup.failed' => ['scope' => $scope, 'error' => 'disk quota exceeded while writing snapshot'],
            default => ['scope' => $scope, 'filename' => 'markethub-'.now()->format('Y-m-d').'-0300.json'],
        };

        return [null, $action, 'App\\Models\\PlatformBackup', null, ['before' => null, 'after' => $after]];
    }

    /** Stable client IPs per actor, with the occasional roam. */
    private function pickIp(string $actorKey, bool $isSystem): ?string
    {
        if ($isSystem) {
            return mt_rand(0, 1) === 0 ? '127.0.0.1' : null;
        }
        if (mt_rand(1, 12) === 1) {
            return '41.210.'.mt_rand(14, 30).'.'.mt_rand(20, 240); // mobile network
        }

        return [
            'admin' => '41.210.14.7',
            'seller1' => '197.251.12.88',
            'seller2' => '197.251.12.140',
            'finance' => '41.210.14.52',
            'sales' => '41.210.14.61',
            'ops' => '102.176.65.12',
            'marketing' => '102.176.65.45',
        ][$actorKey] ?? '41.210.14.7';
    }

    /** Map seeded accounts to audit actors. */
    private function actors(): array
    {
        $byEmail = User::query()->pluck('id', 'email');

        $wanted = [
            'admin' => 'admin@markethub.test',
            'seller1' => 'seller1@markethub.test',
            'seller2' => 'seller2@markethub.test',
            'finance' => 'finance@markethub.test',
            'sales' => 'sales@markethub.test',
            'ops' => 'ops@markethub.test',
            'marketing' => 'marketing@markethub.test',
        ];

        $actors = [];
        foreach ($wanted as $key => $email) {
            if ($id = $byEmail->get($email)) {
                $actors[$key] = ['id' => $id];
            }
        }
        $actors['system'] = ['id' => null];

        return $actors;
    }

    private function weighted(array $weights): string
    {
        $total = array_sum($weights);
        $roll = mt_rand(1, max(1, $total));
        foreach ($weights as $key => $weight) {
            $roll -= $weight;
            if ($roll <= 0) {
                return $key;
            }
        }

        return array_key_first($weights);
    }
}
