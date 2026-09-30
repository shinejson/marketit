<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlatformSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Platform configuration. The schema below is the source of truth: it drives both
 * validation and the form the admin UI renders, so adding a setting is a one-liner.
 */
class AdminSettingController extends Controller
{
    /** key => [group, type, label, help, default, options?] */
    public const SCHEMA = [
        'platform_name' => ['general', 'string', 'Platform name', 'Shown in emails and the storefront header.', 'MarketHub'],
        'support_email' => ['general', 'string', 'Support email', 'Where sellers and buyers are told to write.', 'support@markethub.test'],
        'default_currency' => ['general', 'string', 'Default currency', 'ISO 4217 code used for new stores.', 'USD'],
        'timezone' => ['general', 'string', 'Timezone', 'Used for reporting windows.', 'UTC'],
        'maintenance_mode' => ['general', 'bool', 'Maintenance mode', 'Shows a maintenance notice on the storefront.', false],

        'commission_rate' => ['commerce', 'number', 'Default commission (%)', 'Applied to sellers without a plan override.', 10],
        'payout_delay_days' => ['commerce', 'number', 'Payout delay (days)', 'Days a settlement is held after delivery.', 7],
        'min_payout_amount' => ['commerce', 'number', 'Minimum payout', 'Settlements below this roll over.', 50],
        'tax_rate' => ['commerce', 'number', 'Default tax rate (%)', 'Fallback when a store has no tax profile.', 0],
        'auto_approve_tenants' => ['commerce', 'bool', 'Auto-approve sellers', 'Skip manual review of new applications.', false],

        'trial_days' => ['billing', 'number', 'Default trial length (days)', 'Used when a plan has no trial of its own.', 14],
        'grace_period_days' => ['billing', 'number', 'Past-due grace period (days)', 'How long a failed payment keeps access.', 5],
        'invoice_prefix' => ['billing', 'string', 'Invoice prefix', 'Prefix for generated invoice numbers.', 'INV'],
        'dunning_enabled' => ['billing', 'bool', 'Dunning emails', 'Retry reminders for unpaid invoices.', true],

        'email_notifications' => ['notifications', 'bool', 'Email notifications', 'Order and application emails.', true],
        'push_notifications' => ['notifications', 'bool', 'Push notifications', 'Mobile push for sellers.', true],
        'new_tenant_alert' => ['notifications', 'bool', 'Alert on new seller application', 'Notify super admins on submission.', true],
        'weekly_digest' => ['notifications', 'bool', 'Weekly digest', 'Weekly platform performance summary.', false],

        'require_2fa_admins' => ['security', 'bool', 'Require 2FA for admins', 'Enforce two-factor for super admins.', false],
        'session_timeout_minutes' => ['security', 'number', 'Session timeout (minutes)', 'Idle time before re-authentication.', 120],
        'max_login_attempts' => ['security', 'number', 'Max login attempts', 'Before an account is throttled.', 5],
        'allowed_upload_mb' => ['security', 'number', 'Max upload size (MB)', 'Applies to product and document uploads.', 10],
    ];

    public function index(): JsonResponse
    {
        $stored = PlatformSetting::query()->get()->keyBy('key');

        $groups = collect(self::SCHEMA)
            ->map(function (array $meta, string $key) use ($stored) {
                [$group, $type, $label, $help, $default] = $meta;
                $row = $stored->get($key);

                return [
                    'key' => $key,
                    'group' => $group,
                    'type' => $type,
                    'label' => $label,
                    'help' => $help,
                    'value' => $row ? $row->typedValue() : $default,
                    'default' => $default,
                    'updated_at' => $row?->updated_at,
                ];
            })
            ->groupBy('group')
            ->map(fn ($items) => $items->values());

        return response()->json(['data' => $groups]);
    }

    public function update(Request $request): JsonResponse
    {
        $request->validate([
            'settings' => ['required', 'array', 'min:1'],
            'settings.*.key' => ['required', 'string', Rule::in(array_keys(self::SCHEMA))],
            'settings.*.value' => ['present'],
        ]);

        DB::transaction(function () use ($request) {
            foreach ($request->input('settings') as $setting) {
                [$group, $type] = self::SCHEMA[$setting['key']];

                PlatformSetting::query()->updateOrCreate(
                    ['key' => $setting['key']],
                    [
                        'group' => $group,
                        'type' => $type,
                        'value' => PlatformSetting::cast($setting['value'], $type),
                        'updated_by' => $request->user()->id,
                    ],
                );
            }
        });

        return $this->index();
    }

    /** Restore one group (or everything) to the schema defaults. */
    public function reset(Request $request): JsonResponse
    {
        $group = $request->string('group')->toString();

        $keys = collect(self::SCHEMA)
            ->filter(fn (array $meta) => $group === '' || $group === 'all' || $meta[0] === $group)
            ->keys();

        PlatformSetting::query()->whereIn('key', $keys)->delete();

        return $this->index();
    }
}
