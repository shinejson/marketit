<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\TenantSetting;
use App\Services\Currency\CurrencyService;
use App\Services\Currency\TenantCurrencyConverter;
use App\Support\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class TenantSettingsController extends Controller
{
    public function __construct(
        private CurrencyService $currency,
        private TenantCurrencyConverter $converter,
    ) {
    }

    public function show(Request $request): JsonResponse
    {
        $tenant = $this->tenant($request);
        $this->authorize('view', $tenant);
        $settings = $this->ensure($tenant);

        return response()->json(['data' => $this->payload($tenant, $settings)]);
    }

    public function update(Request $request): JsonResponse
    {
        $tenant = $this->tenant($request);
        $this->authorize('update', $tenant);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'business_name' => ['nullable', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'size:2'],
            'business_details' => ['nullable', 'string'],
            'timezone' => ['sometimes', 'string', 'max:64'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'convert_existing_prices' => ['sometimes', 'boolean'],
            'auto_convert_prices' => ['sometimes', 'boolean'],
            'fiscal_year_start_month' => ['sometimes', 'integer', 'min:1', 'max:12'],
            'notify_low_stock' => ['sometimes', 'boolean'],
            'notify_orders' => ['sometimes', 'boolean'],
            'notify_payouts' => ['sometimes', 'boolean'],
            'backup_retention_days' => ['sometimes', 'integer', 'min:7', 'max:365'],
            'payout_email' => ['nullable', 'email'],
            'tax_id' => ['nullable', 'string', 'max:64'],
            'support_email' => ['nullable', 'email'],
            'support_phone' => ['nullable', 'string', 'max:32'],
            'default_markup_percent' => ['sometimes', 'numeric', 'min:0', 'max:1000'],
            'default_discount_percent' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'tax_rate' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'goals' => ['sometimes', 'array'],
            'goals.finance' => ['sometimes', 'array'],
            'goals.sales' => ['sometimes', 'array'],
            'goals.operations' => ['sometimes', 'array'],
            'goals.marketing' => ['sometimes', 'array'],
            'goals.*.*' => ['numeric', 'min:0'],
            'receipt' => ['sometimes', 'array'],
            'receipt.header_line' => ['nullable', 'string', 'max:120'],
            'receipt.address_line' => ['nullable', 'string', 'max:160'],
            'receipt.footer_note' => ['nullable', 'string', 'max:240'],
            'receipt.tax_label' => ['nullable', 'string', 'max:40'],
            'receipt.show_tax_breakdown' => ['sometimes', 'boolean'],
            'receipt.show_discounts' => ['sometimes', 'boolean'],
            'receipt.show_sku' => ['sometimes', 'boolean'],
            'receipt.show_logo' => ['sometimes', 'boolean'],
            'receipt.paper_size' => ['nullable', Rule::in(['a4', 'a5', '80mm'])],
            'receipt.accent_color' => ['nullable', 'string', 'regex:/^#(?:[0-9a-fA-F]{3}){1,2}$/'],
        ]);

        $tenantFields = collect($data)->only(['name', 'business_name', 'country', 'business_details'])->all();
        if ($tenantFields) {
            $tenant->update($tenantFields);
        }

        $settings = $this->ensure($tenant);

        // Currency switch: re-price the workspace before saving the new code so
        // the money in the database always matches the label on top of it.
        $conversion = null;
        $requested = isset($data['currency']) ? strtoupper((string) $data['currency']) : null;
        $previous = strtoupper((string) ($settings->currency ?: $this->currency->base()));
        if ($requested && $requested !== $previous) {
            abort_unless($this->currency->supports($requested), 422, 'Unsupported currency.');

            $shouldConvert = $request->has('convert_existing_prices')
                ? $request->boolean('convert_existing_prices')
                : (bool) ($settings->auto_convert_prices ?? true);

            if ($shouldConvert) {
                $conversion = $this->converter->convert($tenant, $previous, $requested);
                $settings->forceFill([
                    'currency_converted_at' => now(),
                    'currency_rate' => $this->currency->rate($requested),
                ])->save();
                $settings->refresh();
            }

            ActivityLogger::record('currency.changed', [
                'subject_type' => Tenant::class,
                'subject_id' => $tenant->id,
                'before' => ['currency' => $previous],
                'after' => [
                    'currency' => $requested,
                    'converted' => (bool) $conversion,
                    'factor' => $conversion['factor'] ?? null,
                    'rows' => $conversion['rows'] ?? 0,
                ],
            ], $request->user(), $tenant->id);
        }

        $settingFields = collect($data)->except(['name', 'business_name', 'country', 'business_details', 'convert_existing_prices'])->all();

        // The converter already re-scaled the money-shaped goals. Goals posted
        // with this request were read before the switch, so they would write
        // the old amounts straight back.
        if ($conversion) {
            unset($settingFields['goals']);
        }

        if ($settingFields) {
            if (isset($settingFields['goals'])) {
                $settingFields['goals'] = array_replace_recursive(
                    TenantSetting::DEFAULT_GOALS,
                    $settings->goals ?? [],
                    $settingFields['goals']
                );
            }
            if (isset($settingFields['receipt'])) {
                $settingFields['receipt'] = array_merge(
                    TenantSetting::DEFAULT_RECEIPT,
                    $settings->receipt ?? [],
                    $settingFields['receipt']
                );
            }
            $settings->update($settingFields);
        }

        $payload = $this->payload($tenant->fresh(), $settings->fresh());
        $payload['conversion'] = $conversion;

        return response()->json(['data' => $payload]);
    }

    public function uploadDocument(Request $request): JsonResponse
    {
        $tenant = $this->tenant($request);
        $this->authorize('update', $tenant);
        $data = $request->validate(['document' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120']]);
        $documents = $tenant->documents ?? [];
        /** @var UploadedFile $file */
        $file = $data['document'];
        $documents[] = [
            'key' => Str::lower(Str::random(10)),
            'label' => 'Supporting document',
            'path' => $file->store('tenant-documents/'.$tenant->slug, 'local'),
            'original_name' => $file->getClientOriginalName(),
            'mime' => $file->getClientMimeType(),
            'size' => $file->getSize(),
            'uploaded_at' => now()->toIso8601String(),
        ];
        $tenant->update(['documents' => $documents]);
        return response()->json(['data' => ['documents' => $tenant->fresh()->documents ?? []]], 201);
    }

    protected function tenant(Request $request): Tenant
    {
        $id = $request->user()->tenantId();
        abort_unless($id, 404, 'No tenant associated.');

        return Tenant::query()->findOrFail($id);
    }

    protected function ensure(Tenant $tenant): TenantSetting
    {
        return TenantSetting::query()->firstOrCreate(
            ['tenant_id' => $tenant->id],
            [
                'support_email' => $tenant->owner?->email,
                'goals' => TenantSetting::DEFAULT_GOALS,
            ]
        );
    }

    protected function payload(Tenant $tenant, TenantSetting $settings): array
    {
        return [
            'tenant' => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'status' => $tenant->status,
                'business_name' => $tenant->business_name,
                'country' => $tenant->country,
                'business_details' => $tenant->business_details,
            ],
            'settings' => [
                'timezone' => $settings->timezone,
                'currency' => $settings->currency,
                'currency_symbol' => $this->currency->symbol($settings->currency),
                'currency_name' => $this->currency->name($settings->currency),
                'currency_rate' => $this->currency->rate($settings->currency),
                'currency_decimals' => $this->currency->decimals($settings->currency),
                'currency_converted_at' => $settings->currency_converted_at?->toIso8601String(),
                'auto_convert_prices' => (bool) ($settings->auto_convert_prices ?? true),
                'fiscal_year_start_month' => $settings->fiscal_year_start_month,
                'notify_low_stock' => $settings->notify_low_stock,
                'notify_orders' => $settings->notify_orders,
                'notify_payouts' => $settings->notify_payouts,
                'backup_retention_days' => $settings->backup_retention_days,
                'payout_email' => $settings->payout_email,
                'tax_id' => $settings->tax_id,
                'support_email' => $settings->support_email,
                'support_phone' => $settings->support_phone,
                'default_markup_percent' => $settings->default_markup_percent,
                'default_discount_percent' => $settings->default_discount_percent,
                'tax_rate' => $settings->tax_rate,
                'goals' => array_replace_recursive(TenantSetting::DEFAULT_GOALS, $settings->goals ?? []),
                'receipt' => $settings->receiptTemplate(),
            ],
            'departments' => TenantSetting::DEPARTMENTS,
            'currencies' => $this->currency->payload(),
            'documents' => collect($tenant->documents ?? [])->map(fn (array $doc) => collect($doc)->except('path')->all())->values()->all(),
        ];
    }
}
