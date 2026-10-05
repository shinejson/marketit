<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\TenantSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

class TenantSettingsController extends Controller
{
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
        ]);

        $tenantFields = collect($data)->only(['name', 'business_name', 'country', 'business_details'])->all();
        if ($tenantFields) {
            $tenant->update($tenantFields);
        }

        $settings = $this->ensure($tenant);
        $settingFields = collect($data)->except(['name', 'business_name', 'country', 'business_details'])->all();
        if ($settingFields) {
            if (isset($settingFields['goals'])) {
                $settingFields['goals'] = array_replace_recursive(
                    TenantSetting::DEFAULT_GOALS,
                    $settings->goals ?? [],
                    $settingFields['goals']
                );
            }
            $settings->update($settingFields);
        }

        return response()->json(['data' => $this->payload($tenant->fresh(), $settings->fresh())]);
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
            ],
            'departments' => TenantSetting::DEPARTMENTS,
            'documents' => collect($tenant->documents ?? [])->map(fn (array $doc) => collect($doc)->except('path')->all())->values()->all(),
        ];
    }
}
