<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\PlatformSetting;
use App\Services\Sms\SmsGateway;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * Platform configuration. The schema below is the source of truth: it drives both
 * validation and the form the admin UI renders, so adding a setting is a one-liner.
 *
 * Field types
 *  - string | text | number | bool | email | url | color | select | time
 *  - secret: stored encrypted, never returned to the client (only `has_value`)
 *  - image:  uploaded through the asset endpoints, the stored value is a public URL
 */
class AdminSettingController extends Controller
{
    /** Sentinel the UI sends to wipe a stored secret (blank means "leave it alone"). */
    public const CLEAR_SECRET = '__clear__';

    /** Branding assets are uploaded, not typed, so they get their own whitelist. */
    public const ASSETS = [
        'brand_logo' => ['label' => 'Primary logo', 'mimes' => 'png,jpg,jpeg,webp,svg', 'max' => 2048],
        'brand_logo_dark' => ['label' => 'Dark-mode logo', 'mimes' => 'png,jpg,jpeg,webp,svg', 'max' => 2048],
        'brand_favicon' => ['label' => 'Favicon', 'mimes' => 'png,ico,svg', 'max' => 512],
        'brand_og_image' => ['label' => 'Social share image', 'mimes' => 'png,jpg,jpeg,webp', 'max' => 3072],
    ];

    /** Group presentation metadata for the settings navigation. */
    public const GROUPS = [
        'general' => ['label' => 'General', 'icon' => 'sliders', 'description' => 'Platform identity, locale and availability.'],
        'owner' => ['label' => 'Owner & company', 'icon' => 'building', 'description' => 'Legal entity and the people legally responsible for the platform.'],
        'branding' => ['label' => 'Branding & assets', 'icon' => 'palette', 'description' => 'Logo, favicon, colours and social preview artwork.'],
        'commerce' => ['label' => 'Commerce', 'icon' => 'cart', 'description' => 'Commission, payouts and tax defaults applied to sellers.'],
        'billing' => ['label' => 'Billing', 'icon' => 'card', 'description' => 'Trials, dunning and invoice numbering.'],
        'payments' => ['label' => 'Payments', 'icon' => 'card', 'description' => 'Online providers, payment methods and webhook safety.'],
        'email' => ['label' => 'Email', 'icon' => 'mail', 'description' => 'Outgoing mail transport and sender identity.'],
        'sms' => ['label' => 'SMS', 'icon' => 'chat', 'description' => 'Text message gateway, sender ID and delivery rules.'],
        'notifications' => ['label' => 'Notifications', 'icon' => 'bell', 'description' => 'What the platform tells admins, sellers and buyers.'],
        'security' => ['label' => 'Security', 'icon' => 'shield', 'description' => 'Authentication hardening and upload limits.'],
        'backup' => ['label' => 'Backup & recovery', 'icon' => 'database', 'description' => 'Snapshot schedule, retention and restore points.'],
    ];

    /**
     * key => [group, type, label, help, default, extras]
     * extras: options (select), placeholder, unit, columns ('full' spans the row)
     */
    public const SCHEMA = [
        // ------------------------------------------------------------ general
        'platform_name' => ['general', 'string', 'Platform name', 'Shown in emails and the storefront header.', 'MarketHub'],
        'platform_tagline' => ['general', 'string', 'Tagline', 'One line used on the marketing header and meta description.', 'A curated multi-vendor marketplace'],
        'platform_url' => ['general', 'url', 'Platform URL', 'Canonical address used in emails and webhooks.', 'https://markethub.test'],
        'support_email' => ['general', 'email', 'Support email', 'Where sellers and buyers are told to write.', 'support@markethub.test'],
        'default_currency' => ['general', 'string', 'Default currency', 'ISO 4217 code used for new stores.', 'USD'],
        'timezone' => ['general', 'string', 'Timezone', 'Used for reporting windows.', 'UTC'],
        'default_language' => ['general', 'select', 'Default language', 'Fallback locale for the storefront and emails.', 'en', [
            'options' => [
                ['value' => 'en', 'label' => 'English'],
                ['value' => 'fr', 'label' => 'French'],
                ['value' => 'es', 'label' => 'Spanish'],
                ['value' => 'ar', 'label' => 'Arabic'],
                ['value' => 'pt', 'label' => 'Portuguese'],
            ],
        ]],
        'maintenance_mode' => ['general', 'bool', 'Maintenance mode', 'Shows a maintenance notice on the storefront.', false],

        // -------------------------------------------------------------- owner
        'owner_name' => ['owner', 'string', 'Owner full name', 'The natural person who owns or represents the platform.', ''],
        'owner_title' => ['owner', 'string', 'Role / title', 'Printed on legal notices and invoices.', 'Founder & CEO'],
        'owner_email' => ['owner', 'email', 'Owner email', 'Receives escalations, legal notices and billing alerts.', ''],
        'owner_phone' => ['owner', 'string', 'Owner phone', 'Include the country code, e.g. +233 20 000 0000.', '', ['placeholder' => '+233 20 000 0000']],
        'company_legal_name' => ['owner', 'string', 'Registered company name', 'Exactly as it appears on the certificate of incorporation.', ''],
        'company_registration_no' => ['owner', 'string', 'Registration number', 'Company or business registration number.', ''],
        'company_tax_id' => ['owner', 'string', 'Tax / VAT ID', 'Shown on platform invoices issued to sellers.', ''],
        'company_address' => ['owner', 'text', 'Registered address', 'Street, building and any suite number.', '', ['columns' => 'full']],
        'company_city' => ['owner', 'string', 'City', 'City of the registered office.', ''],
        'company_state' => ['owner', 'string', 'State / region', 'State, region or province.', ''],
        'company_postal_code' => ['owner', 'string', 'Postal code', 'ZIP or postal code.', ''],
        'company_country' => ['owner', 'string', 'Country', 'Country of incorporation.', ''],
        'company_website' => ['owner', 'url', 'Company website', 'Public corporate site, if different from the marketplace.', ''],

        // ----------------------------------------------------------- branding
        'brand_logo' => ['branding', 'image', 'Primary logo', 'SVG or PNG with transparency. Displayed on light backgrounds — 240×60 works best.', null],
        'brand_logo_dark' => ['branding', 'image', 'Dark-mode logo', 'Optional. Used when the console or storefront is in dark mode.', null],
        'brand_favicon' => ['branding', 'image', 'Favicon', 'Square ICO, PNG or SVG. 32×32 or 64×64 renders crisply in browser tabs.', null],
        'brand_og_image' => ['branding', 'image', 'Social share image', 'Shown when a link is pasted into social apps. 1200×630 recommended.', null],
        'brand_primary_color' => ['branding', 'color', 'Primary colour', 'Buttons, links and highlights across the platform.', '#c45c26'],
        'brand_accent_color' => ['branding', 'color', 'Accent colour', 'Secondary emphasis — badges, charts and success states.', '#1f4b3a'],
        'brand_email_footer' => ['branding', 'text', 'Email footer', 'Appended to every transactional email, usually the legal address.', '', ['columns' => 'full']],

        // ----------------------------------------------------------- commerce
        'commission_rate' => ['commerce', 'number', 'Default commission (%)', 'Applied to sellers without a plan override.', 10, ['unit' => '%']],
        'payout_delay_days' => ['commerce', 'number', 'Payout delay (days)', 'Days a settlement is held after delivery.', 7, ['unit' => 'days']],
        'min_payout_amount' => ['commerce', 'number', 'Minimum payout', 'Settlements below this roll over.', 50],
        'tax_rate' => ['commerce', 'number', 'Default tax rate (%)', 'Fallback when a store has no tax profile.', 0, ['unit' => '%']],
        'auto_approve_tenants' => ['commerce', 'bool', 'Auto-approve sellers', 'Skip manual review of new applications.', false],

        // ------------------------------------------------------------ billing
        'trial_days' => ['billing', 'number', 'Default trial length (days)', 'Used when a plan has no trial of its own.', 14, ['unit' => 'days']],
        'grace_period_days' => ['billing', 'number', 'Past-due grace period (days)', 'How long a failed payment keeps access.', 5, ['unit' => 'days']],
        'invoice_prefix' => ['billing', 'string', 'Invoice prefix', 'Prefix for generated invoice numbers.', 'INV'],
        'dunning_enabled' => ['billing', 'bool', 'Dunning emails', 'Retry reminders for unpaid invoices.', true],

        // ----------------------------------------------------------- payments
        'payments_enabled' => ['payments', 'bool', 'Accept online payments', 'Master switch for checkout payment collection.', true],
        'payment_mode' => ['payments', 'select', 'Environment', 'Use test mode while validating provider credentials. Never use test credentials in live mode.', 'test', [
            'options' => [
                ['value' => 'test', 'label' => 'Test / sandbox'],
                ['value' => 'live', 'label' => 'Live'],
            ],
        ]],
        'payment_provider' => ['payments', 'select', 'Primary provider', 'Hosted checkout provider used for online card and mobile-money payments.', 'mock', [
            'options' => [
                ['value' => 'mock', 'label' => 'Mock (local development)'],
                ['value' => 'stripe', 'label' => 'Stripe Checkout'],
                ['value' => 'paystack', 'label' => 'Paystack'],
                ['value' => 'flutterwave', 'label' => 'Flutterwave'],
            ],
        ]],
        'payment_currency' => ['payments', 'select', 'Payment currency', 'Currency sent to the provider. It must match the currency configured in your provider account.', 'USD', [
            'options' => [
                ['value' => 'USD', 'label' => 'USD — US dollar'],
                ['value' => 'GHS', 'label' => 'GHS — Ghana cedi'],
                ['value' => 'NGN', 'label' => 'NGN — Nigerian naira'],
                ['value' => 'KES', 'label' => 'KES — Kenyan shilling'],
                ['value' => 'ZAR', 'label' => 'ZAR — South African rand'],
            ],
        ]],
        'payment_methods_card' => ['payments', 'bool', 'Cards', 'Show card checkout when the selected provider supports it.', true],
        'payment_methods_mobile_money' => ['payments', 'bool', 'Mobile money', 'Show mobile-money checkout for supported regional providers.', true],
        'payment_methods_bank_transfer' => ['payments', 'bool', 'Bank transfer', 'Show bank-transfer instructions for manually reconciled orders.', false],
        'payment_methods_cash_on_delivery' => ['payments', 'bool', 'Cash on delivery', 'Allow buyers to place an order without an online charge.', false],
        'payment_auto_capture' => ['payments', 'bool', 'Auto-capture payments', 'Capture successful provider authorizations automatically.', true],
        'payment_webhook_tolerance' => ['payments', 'number', 'Webhook tolerance (seconds)', 'Reject signed webhook requests older than this window.', 300, ['unit' => 'sec']],
        'stripe_publishable_key' => ['payments', 'string', 'Stripe publishable key', 'Public key used by Stripe.js when you add an embedded card form.', '', ['placeholder' => 'pk_live_… or pk_test_…']],
        'stripe_secret_key' => ['payments', 'secret', 'Stripe secret key', 'Encrypted at rest and never returned to the browser.', ''],
        'stripe_webhook_secret' => ['payments', 'secret', 'Stripe webhook signing secret', 'Encrypted webhook secret used to verify checkout events.', ''],
        'paystack_public_key' => ['payments', 'string', 'Paystack public key', 'Public key for Paystack inline checkout.', '', ['placeholder' => 'pk_live_… or pk_test_…']],
        'paystack_secret_key' => ['payments', 'secret', 'Paystack secret key', 'Encrypted at rest and never returned to the browser.', ''],
        'paystack_webhook_secret' => ['payments', 'secret', 'Paystack webhook secret', 'Optional separate secret; defaults to the Paystack secret key.', ''],
        'flutterwave_public_key' => ['payments', 'string', 'Flutterwave public key', 'Public key for Flutterwave checkout.', '', ['placeholder' => 'FLWPUBK_…']],
        'flutterwave_secret_key' => ['payments', 'secret', 'Flutterwave secret key', 'Encrypted at rest and never returned to the browser.', ''],
        'flutterwave_encryption_key' => ['payments', 'secret', 'Flutterwave encryption key', 'Required for some Flutterwave payment flows; encrypted at rest.', ''],
        'flutterwave_webhook_hash' => ['payments', 'secret', 'Flutterwave webhook hash', 'Secret hash sent by Flutterwave in webhook headers.', ''],
        'bank_transfer_instructions' => ['payments', 'text', 'Bank transfer instructions', 'Shown to buyers when bank transfer is enabled. Never put card or secret credentials here.', '', ['columns' => 'full']],

        // -------------------------------------------------------------- email
        'mail_driver' => ['email', 'select', 'Transport', 'How outgoing mail leaves the platform.', 'smtp', [
            'options' => [
                ['value' => 'smtp', 'label' => 'SMTP'],
                ['value' => 'ses', 'label' => 'Amazon SES'],
                ['value' => 'postmark', 'label' => 'Postmark'],
                ['value' => 'mailgun', 'label' => 'Mailgun'],
                ['value' => 'sendmail', 'label' => 'Sendmail'],
                ['value' => 'log', 'label' => 'Log only (no delivery)'],
            ],
        ]],
        'mail_host' => ['email', 'string', 'SMTP host', 'Hostname of the mail relay.', 'smtp.mailgun.org', ['placeholder' => 'smtp.provider.com']],
        'mail_port' => ['email', 'number', 'SMTP port', 'Usually 587 for TLS or 465 for SSL.', 587],
        'mail_encryption' => ['email', 'select', 'Encryption', 'Transport security used for the SMTP session.', 'tls', [
            'options' => [
                ['value' => 'tls', 'label' => 'STARTTLS'],
                ['value' => 'ssl', 'label' => 'SSL'],
                ['value' => 'none', 'label' => 'None'],
            ],
        ]],
        'mail_username' => ['email', 'string', 'SMTP username', 'Login for the relay. Often the full sending address.', ''],
        'mail_password' => ['email', 'secret', 'SMTP password', 'Stored encrypted. Leave blank to keep the saved value.', ''],
        'mail_from_address' => ['email', 'email', 'From address', 'Appears in the From header of every email.', 'no-reply@markethub.test'],
        'mail_from_name' => ['email', 'string', 'From name', 'Display name shown next to the from address.', 'MarketHub'],
        'mail_reply_to' => ['email', 'email', 'Reply-to address', 'Where replies are routed. Usually your support inbox.', ''],
        'mail_queue_enabled' => ['email', 'bool', 'Queue outgoing mail', 'Send through the worker instead of the web request.', true],

        // ---------------------------------------------------------------- sms
        'sms_enabled' => ['sms', 'bool', 'Enable SMS', 'Master switch for every outgoing text message.', false],
        'sms_provider' => ['sms', 'select', 'Provider', 'Gateway used to deliver messages.', 'log', [
            'options' => [
                ['value' => 'twilio', 'label' => 'Twilio'],
                ['value' => 'vonage', 'label' => 'Vonage (Nexmo)'],
                ['value' => 'africastalking', 'label' => "Africa's Talking"],
                ['value' => 'termii', 'label' => 'Termii'],
                ['value' => 'mnotify', 'label' => 'mNotify'],
                ['value' => 'custom', 'label' => 'Custom HTTP endpoint'],
                ['value' => 'log', 'label' => 'Log only (no delivery)'],
            ],
        ]],
        'sms_sender_id' => ['sms', 'string', 'Sender ID', 'Alphanumeric name shown as the sender, max 11 characters.', 'MarketHub'],
        'sms_api_key' => ['sms', 'secret', 'API key / SID', 'Stored encrypted. Leave blank to keep the saved value.', ''],
        'sms_api_secret' => ['sms', 'secret', 'API secret / auth token', 'Stored encrypted. Leave blank to keep the saved value.', ''],
        'sms_endpoint' => ['sms', 'url', 'Custom endpoint', 'Only used when the provider is a custom HTTP endpoint.', '', ['placeholder' => 'https://api.provider.com/v1/send']],
        'sms_otp_enabled' => ['sms', 'bool', 'Login & checkout OTP', 'Send one-time codes for verification.', true],
        'sms_order_updates' => ['sms', 'bool', 'Order status updates', 'Text buyers when an order ships or is delivered.', true],
        'sms_seller_alerts' => ['sms', 'bool', 'Seller alerts', 'Notify sellers of new orders and low stock.', false],
        'sms_daily_cap' => ['sms', 'number', 'Daily send cap', 'Hard stop to protect against runaway spend. 0 means unlimited.', 2000],

        // ------------------------------------------------------ notifications
        'email_notifications' => ['notifications', 'bool', 'Email notifications', 'Order and application emails.', true],
        'push_notifications' => ['notifications', 'bool', 'Push notifications', 'Mobile push for sellers.', true],
        'new_tenant_alert' => ['notifications', 'bool', 'Alert on new seller application', 'Notify super admins on submission.', true],
        'weekly_digest' => ['notifications', 'bool', 'Weekly digest', 'Weekly platform performance summary.', false],

        // ----------------------------------------------------------- security
        'require_2fa_admins' => ['security', 'bool', 'Require 2FA for admins', 'Enforce two-factor for super admins.', false],
        'session_timeout_minutes' => ['security', 'number', 'Session lifetime (minutes)', 'Maximum lifetime of a bearer session before the user must sign in again.', 120, ['unit' => 'min']],
        'max_login_attempts' => ['security', 'number', 'Max login attempts', 'Before an account is throttled.', 5],
        'allowed_upload_mb' => ['security', 'number', 'Max upload size (MB)', 'Applies to product and document uploads.', 10, ['unit' => 'MB']],

        // ------------------------------------------------------------- backup
        'backup_enabled' => ['backup', 'bool', 'Scheduled backups', 'Run automatic snapshots on the schedule below.', true],
        'backup_frequency' => ['backup', 'select', 'Frequency', 'How often an automatic snapshot is taken.', 'daily', [
            'options' => [
                ['value' => 'hourly', 'label' => 'Hourly'],
                ['value' => 'daily', 'label' => 'Daily'],
                ['value' => 'weekly', 'label' => 'Weekly'],
                ['value' => 'monthly', 'label' => 'Monthly'],
            ],
        ]],
        'backup_time' => ['backup', 'time', 'Run at', 'Server time the daily or weekly snapshot starts.', '02:00'],
        'backup_retention_days' => ['backup', 'number', 'Retention (days)', 'Snapshots older than this are pruned automatically.', 30, ['unit' => 'days']],
        'backup_destination' => ['backup', 'select', 'Destination', 'Where snapshot archives are written.', 'local', [
            'options' => [
                ['value' => 'local', 'label' => 'Local storage'],
                ['value' => 's3', 'label' => 'Amazon S3'],
                ['value' => 'spaces', 'label' => 'DigitalOcean Spaces'],
                ['value' => 'gcs', 'label' => 'Google Cloud Storage'],
            ],
        ]],
        'backup_include_media' => ['backup', 'bool', 'Include uploaded media', 'Adds product images and documents to the archive.', false],
        'backup_notify_email' => ['backup', 'email', 'Notify on failure', 'Address alerted when a scheduled snapshot fails.', ''],
    ];

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => $this->groups(),
            'meta' => [
                'groups' => collect(self::GROUPS)
                    ->map(fn (array $meta, string $key) => ['key' => $key] + $meta)
                    ->values(),
                'assets' => array_keys(self::ASSETS),
            ],
        ]);
    }

    /** Safe, non-secret payment health summary for the checkout and settings UI. */
    public function paymentStatus(): JsonResponse
    {
        $values = $this->values();
        $provider = (string) ($values['payment_provider'] ?: 'mock');
        $credentials = match ($provider) {
            'stripe' => filled($values['stripe_secret_key']),
            'paystack' => filled($values['paystack_secret_key']),
            'flutterwave' => filled($values['flutterwave_secret_key']),
            default => true,
        };

        $methods = collect([
            ['key' => 'card', 'label' => 'Cards', 'enabled' => (bool) $values['payment_methods_card']],
            ['key' => 'mobile_money', 'label' => 'Mobile money', 'enabled' => (bool) $values['payment_methods_mobile_money']],
            ['key' => 'bank_transfer', 'label' => 'Bank transfer', 'enabled' => (bool) $values['payment_methods_bank_transfer']],
            ['key' => 'cash_on_delivery', 'label' => 'Cash on delivery', 'enabled' => (bool) $values['payment_methods_cash_on_delivery']],
        ])->values();

        return response()->json(['data' => [
            'enabled' => (bool) $values['payments_enabled'],
            'mode' => $values['payment_mode'],
            'provider' => $provider,
            'provider_configured' => $credentials,
            'currency' => $values['payment_currency'] ?: $values['default_currency'],
            'methods' => $methods,
            'webhook_tolerance' => (int) $values['payment_webhook_tolerance'],
        ]]);
    }

    public function update(Request $request): JsonResponse
    {
        $request->validate([
            'settings' => ['required', 'array', 'min:1'],
            'settings.*.key' => ['required', 'string', Rule::in($this->writableKeys())],
            'settings.*.value' => ['present'],
        ]);

        $changes = [];

        DB::transaction(function () use ($request, &$changes) {
            foreach ($request->input('settings') as $setting) {
                $key = $setting['key'];
                [$group, $type] = self::SCHEMA[$key];

                // Secrets are write-only: blank keeps the stored value, the sentinel clears it.
                if ($type === 'secret') {
                    $incoming = is_string($setting['value']) ? trim($setting['value']) : '';
                    if ($incoming === '') {
                        continue;
                    }
                    if ($incoming === self::CLEAR_SECRET) {
                        PlatformSetting::query()->where('key', $key)->delete();
                        $changes[] = $key;
                        continue;
                    }
                }

                $value = $this->validateValue($key, $setting['value']);

                $changes[] = $key;

                PlatformSetting::query()->updateOrCreate(
                    ['key' => $key],
                    [
                        'group' => $group,
                        'type' => $type,
                        'value' => PlatformSetting::cast($value, $type),
                        'updated_by' => $request->user()->id,
                    ],
                );
            }
        });

        $this->audit($request, 'settings.updated', ['keys' => $changes]);

        return $this->index();
    }

    /** Restore one group (or everything) to the schema defaults. */
    public function reset(Request $request): JsonResponse
    {
        $group = $request->string('group')->toString();

        $keys = collect(self::SCHEMA)
            ->filter(fn (array $meta) => $group === '' || $group === 'all' || $meta[0] === $group)
            ->keys();

        foreach ($keys as $key) {
            if (self::SCHEMA[$key][1] === 'image') {
                $this->deleteAssetFile($key);
            }
        }

        PlatformSetting::query()->whereIn('key', $keys)->delete();

        $this->audit($request, 'settings.reset', ['group' => $group ?: 'all']);

        return $this->index();
    }

    /** Upload a branding asset (logo, dark logo, favicon, social image). */
    public function uploadAsset(Request $request, string $asset): JsonResponse
    {
        abort_unless(isset(self::ASSETS[$asset]), 404, 'Unknown branding asset.');
        $rules = self::ASSETS[$asset];

        $request->validate([
            'file' => ['required', 'file', 'mimes:'.$rules['mimes'], 'max:'.$rules['max']],
        ], [], ['file' => strtolower($rules['label'])]);

        $this->deleteAssetFile($asset);

        $path = $request->file('file')->store('platform/branding', 'public');

        PlatformSetting::query()->updateOrCreate(
            ['key' => $asset],
            [
                'group' => 'branding',
                'type' => 'image',
                'value' => $path,
                'updated_by' => $request->user()->id,
            ],
        );

        $this->audit($request, 'settings.asset_uploaded', ['asset' => $asset, 'path' => $path]);

        return response()->json([
            'data' => $this->groups(),
            'meta' => ['asset' => $asset, 'url' => $this->assetUrl($path)],
        ]);
    }

    public function destroyAsset(Request $request, string $asset): JsonResponse
    {
        abort_unless(isset(self::ASSETS[$asset]), 404, 'Unknown branding asset.');

        $this->deleteAssetFile($asset);
        PlatformSetting::query()->where('key', $asset)->delete();

        $this->audit($request, 'settings.asset_removed', ['asset' => $asset]);

        return response()->json(['data' => $this->groups()]);
    }

    /** Fire a test email through the saved transport so the admin can verify SMTP. */
    public function testEmail(Request $request): JsonResponse
    {
        $data = $request->validate([
            'to' => ['required', 'email'],
        ]);

        $values = $this->values();
        $driver = $values['mail_driver'] ?: 'smtp';
        $from = $values['mail_from_address'] ?: config('mail.from.address');

        if (! $from) {
            throw ValidationException::withMessages(['to' => 'Set a from address before sending a test.']);
        }

        $mailer = 'platform_test';
        config([
            "mail.mailers.$mailer" => $driver === 'smtp'
                ? [
                    'transport' => 'smtp',
                    'host' => $values['mail_host'] ?: '127.0.0.1',
                    'port' => (int) ($values['mail_port'] ?: 587),
                    'encryption' => in_array($values['mail_encryption'], ['tls', 'ssl'], true) ? $values['mail_encryption'] : null,
                    'username' => $values['mail_username'] ?: null,
                    'password' => $values['mail_password'] ?: null,
                    'timeout' => 10,
                ]
                : config("mail.mailers.$driver", ['transport' => 'log']),
        ]);

        $platform = $values['platform_name'] ?: config('app.name');

        try {
            Mail::mailer($mailer)->raw(
                "This is a test message from $platform.\n\n".
                "If you can read this, outgoing email is configured correctly.\n".
                'Sent at '.now()->toDayDateTimeString()." (server time).\n",
                function ($message) use ($data, $from, $values, $platform) {
                    $message->to($data['to'])
                        ->subject("[$platform] Test email")
                        ->from($from, $values['mail_from_name'] ?: $platform);

                    if ($values['mail_reply_to']) {
                        $message->replyTo($values['mail_reply_to']);
                    }
                },
            );
        } catch (Throwable $e) {
            $this->audit($request, 'settings.email_test_failed', ['to' => $data['to'], 'error' => $e->getMessage()]);

            return response()->json([
                'data' => [
                    'ok' => false,
                    'transport' => $driver,
                    'message' => 'Delivery failed: '.$e->getMessage(),
                ],
            ], 422);
        }

        $this->audit($request, 'settings.email_test_sent', ['to' => $data['to'], 'transport' => $driver]);

        return response()->json([
            'data' => [
                'ok' => true,
                'transport' => $driver,
                'message' => $driver === 'log'
                    ? "Transport is set to log — the message was written to the application log instead of being delivered to {$data['to']}."
                    : "Test email sent to {$data['to']}.",
                'sent_at' => now()->toIso8601String(),
            ],
        ]);
    }

    /** Fire a test SMS through the saved gateway. */
    public function testSms(Request $request, SmsGateway $gateway): JsonResponse
    {
        $data = $request->validate([
            'to' => ['required', 'string', 'min:6', 'max:24'],
        ]);

        $values = $this->values();
        $platform = $values['platform_name'] ?: config('app.name');
        $result = $gateway->send($data['to'], "$platform: your SMS gateway is wired up correctly. Code 123456.");

        $this->audit($request, $result['ok'] ? 'settings.sms_test_sent' : 'settings.sms_test_failed', [
            'to' => $data['to'],
            'provider' => $result['provider'],
        ]);

        return response()->json(['data' => $result], $result['ok'] ? 200 : 422);
    }

    // ------------------------------------------------------------- internals

    /** The rendered form payload, grouped and ordered the way the UI shows it. */
    protected function groups(): array
    {
        $stored = PlatformSetting::query()->get()->keyBy('key');

        $fields = collect(self::SCHEMA)->map(function (array $meta, string $key) use ($stored) {
            [$group, $type, $label, $help, $default] = $meta;
            $extras = $meta[5] ?? [];
            $row = $stored->get($key);
            $raw = $row ? $row->typedValue() : $default;

            $field = [
                'key' => $key,
                'group' => $group,
                'type' => $type,
                'label' => $label,
                'help' => $help,
                'value' => $raw,
                'default' => $default,
                'updated_at' => $row?->updated_at,
                'options' => $extras['options'] ?? null,
                'placeholder' => $extras['placeholder'] ?? null,
                'unit' => $extras['unit'] ?? null,
                'columns' => $extras['columns'] ?? null,
                'has_value' => filled($raw),
            ];

            if ($type === 'secret') {
                $field['value'] = '';
                $field['default'] = '';
            }

            if ($type === 'image') {
                $field['value'] = $raw ? $this->assetUrl($raw) : null;
            }

            return $field;
        });

        // Preserve the group order declared in GROUPS, not insertion order.
        return collect(self::GROUPS)
            ->map(fn ($meta, string $group) => $fields->where('group', $group)->values()->all())
            ->filter(fn (array $items) => count($items) > 0)
            ->all();
    }

    /** Current typed values for every schema key (secrets decrypted). */
    protected function values(): array
    {
        $stored = PlatformSetting::query()->get()->keyBy('key');

        return collect(self::SCHEMA)
            ->mapWithKeys(function (array $meta, string $key) use ($stored) {
                $row = $stored->get($key);

                return [$key => $row ? $row->typedValue() : $meta[4]];
            })
            ->all();
    }

    /** Images are managed through the upload endpoints, so they are not writable here. */
    protected function writableKeys(): array
    {
        return collect(self::SCHEMA)
            ->reject(fn (array $meta) => $meta[1] === 'image')
            ->keys()
            ->all();
    }

    /** Per-type validation so a bad colour or select value never reaches the database. */
    protected function validateValue(string $key, mixed $value): mixed
    {
        [, $type, $label] = self::SCHEMA[$key];
        $extras = self::SCHEMA[$key][5] ?? [];
        $fail = fn (string $message) => throw ValidationException::withMessages([$key => $message]);

        if ($type === 'bool') {
            return filter_var($value, FILTER_VALIDATE_BOOL);
        }

        if (is_array($value)) {
            $fail("$label must be a single value.");
        }

        $value = $value === null ? '' : trim((string) $value);

        switch ($type) {
            case 'number':
                if ($value === '') {
                    return 0;
                }
                if (! is_numeric($value)) {
                    $fail("$label must be a number.");
                }
                $number = 0 + $value;
                $limits = [
                    'commission_rate' => [0, 100],
                    'tax_rate' => [0, 100],
                    'payment_webhook_tolerance' => [30, 3600],
                    'session_timeout_minutes' => [15, 43200],
                    'max_login_attempts' => [3, 20],
                    'allowed_upload_mb' => [1, 100],
                ];
                if (isset($limits[$key]) && ($number < $limits[$key][0] || $number > $limits[$key][1])) {
                    $fail("$label must be between {$limits[$key][0]} and {$limits[$key][1]}.");
                }

                return $number;

            case 'email':
                if ($value !== '' && ! filter_var($value, FILTER_VALIDATE_EMAIL)) {
                    $fail("$label must be a valid email address.");
                }
                break;

            case 'url':
                if ($value !== '' && ! filter_var($value, FILTER_VALIDATE_URL)) {
                    $fail("$label must be a valid URL, including https://.");
                }
                break;

            case 'color':
                if ($value !== '' && ! preg_match('/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/', $value)) {
                    $fail("$label must be a hex colour such as #c45c26.");
                }
                break;

            case 'time':
                if ($value !== '' && ! preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/', $value)) {
                    $fail("$label must be a 24-hour time such as 02:00.");
                }
                break;

            case 'select':
                $allowed = collect($extras['options'] ?? [])->pluck('value')->all();
                if ($value !== '' && ! in_array($value, $allowed, true)) {
                    $fail("$label is not one of the supported options.");
                }
                break;

            case 'string':
            case 'secret':
                if (mb_strlen($value) > 255) {
                    $fail("$label must be 255 characters or fewer.");
                }
                break;

            case 'text':
                if (mb_strlen($value) > 2000) {
                    $fail("$label must be 2000 characters or fewer.");
                }
                break;
        }

        return $value;
    }

    protected function deleteAssetFile(string $key): void
    {
        $row = PlatformSetting::query()->where('key', $key)->first();
        if ($row && $row->value && Storage::disk('public')->exists($row->value)) {
            Storage::disk('public')->delete($row->value);
        }
    }

    protected function assetUrl(string $path): string
    {
        return str_starts_with($path, 'http') ? $path : '/storage/'.ltrim($path, '/');
    }

    protected function audit(Request $request, string $action, array $diff): void
    {
        try {
            AuditLog::query()->create([
                'actor_user_id' => $request->user()?->id,
                'action' => $action,
                'subject_type' => PlatformSetting::class,
                'diff' => ['after' => $diff],
                'ip' => $request->ip(),
            ]);
        } catch (Throwable) {
            // Audit must never block a settings change.
        }
    }
}
