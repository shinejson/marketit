<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\Tenant;
use App\Models\UserRole;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class TenantController extends Controller
{
    /** Business fields collected from an applicant and copied onto the tenant. */
    protected const APPLICATION_FIELDS = [
        'business_name', 'trading_name', 'business_type', 'registration_number', 'tax_id', 'year_established',
        'website', 'permit_number', 'permit_expires_at', 'product_summary', 'categories_offered',
        'country', 'address_line1', 'address_line2', 'city', 'region', 'postal_code', 'latitude', 'longitude',
        'social_links', 'owner_name', 'owner_email', 'owner_phone', 'owner_id_type', 'owner_id_number',
        'payout_method', 'payout_account_name', 'payout_account_number', 'bank_name',
        'mobile_money_provider', 'card_brand', 'card_last4',
    ];

    /**
     * Store application. Creates a pending tenant plus an optional draft store;
     * nothing goes live until a super admin approves it.
     */
    public function register(Request $request): JsonResponse
    {
        $user = $request->user();

        if (Tenant::query()->where('owner_user_id', $user->id)->exists()) {
            return response()->json([
                'error' => [
                    'code' => 'application_exists',
                    'message' => 'This account already has a store application.',
                    'fields' => null,
                ],
            ], 422);
        }

        $data = $request->validate($this->applicationRules());
        $slug = $this->uniqueSlug($data['business_name']);

        $tenant = Tenant::query()->create([
            ...$this->applicationAttributes($data),
            'name' => $data['business_name'],
            'slug' => $slug,
            'status' => Tenant::STATUS_PENDING,
            'owner_user_id' => $user->id,
            'business_details' => $data['product_summary'],
            'documents' => $this->storeDocuments($request, $slug),
            'submitted_at' => now(),
        ]);

        UserRole::query()->firstOrCreate([
            'user_id' => $user->id,
            'role' => 'tenant_owner',
            'tenant_id' => $tenant->id,
        ]);

        if (! empty($data['preferred_store_name'])) {
            Store::withoutGlobalScopes()->create([
                'tenant_id' => $tenant->id,
                'name' => $data['preferred_store_name'],
                'slug' => Str::slug($data['preferred_store_name']),
                'status' => Store::STATUS_DRAFT,
            ]);
        }

        return response()->json([
            'data' => $tenant->fresh(['stores', 'owner']),
            'message' => 'Application submitted. You can access the tenant console now to prepare draft stores and products; publishing unlocks after approval.',
        ], 201);
    }

    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->load('roles');
        $tenantId = $user->tenantId();
        abort_unless($tenantId, 404, 'No tenant associated.');

        $tenant = Tenant::query()->with('stores')->findOrFail($tenantId);
        $this->authorize('view', $tenant);

        return response()->json(['data' => $tenant]);
    }

    /**
     * Store application lookup for the applicant themselves. Returns null when the
     * account has not applied yet, so the "sell" page can show its form without
     * having to handle a 403 from the tenant-scoped endpoints.
     */
    public function mine(Request $request): JsonResponse
    {
        $user = $request->user()->load('roles');
        $tenantId = $user->tenantId();

        if (! $tenantId) {
            return response()->json(['data' => null]);
        }

        return response()->json(['data' => Tenant::query()->with('stores')->find($tenantId)]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user()->load('roles');
        $tenant = Tenant::query()->findOrFail($user->tenantId());
        $this->authorize('update', $tenant);

        if ($tenant->isActive()) {
            return response()->json([
                'error' => [
                    'code' => 'application_locked',
                    'message' => 'Approved business details can only be changed by the platform team.',
                    'fields' => null,
                ],
            ], 422);
        }

        $data = $request->validate($this->relaxRules($this->applicationRules()));

        $documents = $tenant->documents ?? [];
        if ($request->hasFile('business_certificate') || $request->hasFile('operating_permit') || $request->hasFile('additional_documents')) {
            $documents = $this->storeDocuments($request, $tenant->slug, $documents);
        }

        $tenant->update([
            ...$this->applicationAttributes($data),
            'business_details' => $data['product_summary'] ?? $tenant->business_details,
            'documents' => $documents,
        ]);

        $resubmitted = false;
        if ($tenant->isRejected() && $request->boolean('resubmit')) {
            $tenant->update([
                'status' => Tenant::STATUS_PENDING,
                'rejection_reason' => null,
                'review_notes' => null,
                'reviewed_at' => null,
                'reviewed_by' => null,
                'submitted_at' => now(),
            ]);
            $resubmitted = true;
        }

        return response()->json([
            'data' => $tenant->fresh(['stores']),
            'resubmitted' => $resubmitted,
        ]);
    }

    public function stores(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Store::class);
        $stores = Store::query()->withCount('products')->orderBy('name')->paginate($request->integer('per_page', 15));

        return response()->json($this->paginate($stores));
    }

    public function storeStore(Request $request): JsonResponse
    {
        $user = $request->user()->load('roles');

        // Checked before authorize() so applicants get an actionable message.
        $tenant = Tenant::query()->find($user->tenantId());
        if ($tenant && ! $tenant->canCreateStore()) {
            return response()->json([
                'error' => [
                    'code' => 'tenant_not_ready',
                    'message' => 'This tenant cannot create stores right now. Check the seller application for details.',
                    'fields' => null,
                ],
            ], 403);
        }

        $this->authorize('create', Store::class);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'currency' => ['nullable', 'string', 'size:3'],
            'delivery_fee' => ['nullable', 'numeric', 'min:0'],
            'delivery_days' => ['nullable', 'integer', 'min:0'],
            'contact_email' => ['nullable', 'email'],
            'contact_phone' => ['nullable', 'string', 'max:32'],
            'city' => ['nullable', 'string'],
            'country' => ['nullable', 'string', 'size:2'],
        ]);

        $tenantId = (int) $user->tenantId();
        $slug = $this->uniqueStoreSlug($data['slug'] ?? $data['name'], $tenantId);
        $store = Store::query()->create([
            ...$data,
            'slug' => $slug,
            'tenant_id' => $tenantId,
            'status' => Store::STATUS_DRAFT,
        ]);

        return response()->json(['data' => $store], 201);
    }

    public function updateStore(Request $request, Store $store): JsonResponse
    {
        $this->authorize('update', $store);
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'slug' => ['sometimes', 'string', 'max:255', Rule::unique('stores', 'slug')->ignore($store->id)->where('tenant_id', $store->tenant_id)],
            'description' => ['nullable', 'string'],
            'status' => ['sometimes', Rule::in(['draft', 'active', 'suspended'])],
            'currency' => ['nullable', 'string', 'size:3'],
            'tax_inclusive' => ['sometimes', 'boolean'],
            'delivery_fee' => ['nullable', 'numeric', 'min:0'],
            'delivery_days' => ['nullable', 'integer', 'min:0'],
            'contact_email' => ['nullable', 'email'],
            'contact_phone' => ['nullable', 'string'],
            'city' => ['nullable', 'string'],
            'country' => ['nullable', 'string', 'size:2'],
        ]);
        if (($data['status'] ?? null) === Store::STATUS_ACTIVE) {
            $tenant = Tenant::query()->find($store->tenant_id);
            if (! $tenant?->canPublishStore()) {
                return response()->json([
                    'error' => [
                        'code' => 'tenant_not_approved',
                        'message' => 'Only approved tenants can publish active stores. Keep this store in draft until approval.',
                        'fields' => null,
                    ],
                ], 403);
            }
        }

        $store->update($data);

        return response()->json(['data' => $store->fresh()->loadCount('products')]);
    }

    public function destroyStore(Store $store): JsonResponse
    {
        $this->authorize('delete', $store);
        $store->delete();

        return response()->json(['data' => ['ok' => true]]);
    }

    /** Everything a store applicant must provide. */
    protected function applicationRules(): array
    {
        $method = (string) $this->currentPayoutMethod();

        return [
            'business_name' => ['required', 'string', 'max:255'],
            'trading_name' => ['nullable', 'string', 'max:255'],
            'business_type' => ['required', Rule::in(Tenant::BUSINESS_TYPES)],
            'registration_number' => ['required', 'string', 'max:64'],
            'tax_id' => ['nullable', 'string', 'max:64'],
            'year_established' => ['nullable', 'integer', 'min:1800', 'max:'.date('Y')],
            'website' => ['nullable', 'url', 'max:255'],
            'product_summary' => ['required', 'string', 'min:20', 'max:2000'],
            'categories_offered' => ['nullable', 'array', 'max:12'],
            'categories_offered.*' => ['string', 'max:64'],
            'country' => ['required', 'string', 'size:2'],
            'address_line1' => ['required', 'string', 'max:255'],
            'address_line2' => ['nullable', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:120'],
            'region' => ['nullable', 'string', 'max:120'],
            'postal_code' => ['nullable', 'string', 'max:32'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'social_links' => ['nullable', 'array'],
            'social_links.*' => ['nullable', 'string', 'max:255'],
            'owner_name' => ['required', 'string', 'max:255'],
            'owner_email' => ['required', 'email', 'max:255'],
            'owner_phone' => ['required', 'string', 'max:32'],
            'owner_id_type' => ['required', Rule::in(Tenant::ID_TYPES)],
            'owner_id_number' => ['required', 'string', 'max:64'],
            'permit_number' => ['nullable', 'string', 'max:64'],
            'permit_expires_at' => ['nullable', 'date'],
            'preferred_store_name' => ['nullable', 'string', 'max:255'],
            'business_certificate' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
            'operating_permit' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
            'additional_documents' => ['nullable', 'array', 'max:6'],
            'additional_documents.*' => ['file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
            'payout_method' => ['required', Rule::in(Tenant::PAYOUT_METHODS)],
            'payout_account_name' => [Rule::requiredIf($method !== 'card'), 'nullable', 'string', 'max:255'],
            'payout_account_number' => [
                Rule::requiredIf(in_array($method, ['bank', 'mobile_money'], true)),
                'nullable', 'string', 'max:64', 'regex:/^[0-9+\s-]{6,24}$/',
            ],
            'bank_name' => [Rule::requiredIf($method === 'bank'), 'nullable', 'string', 'max:120'],
            'mobile_money_provider' => [Rule::requiredIf($method === 'mobile_money'), 'nullable', 'string', 'max:64'],
            'card_brand' => [Rule::requiredIf($method === 'card'), 'nullable', 'string', 'max:32'],
            'card_last4' => [Rule::requiredIf($method === 'card'), 'nullable', 'digits:4'],
            'resubmit' => ['nullable', 'boolean'],
        ];
    }

    protected function currentPayoutMethod(): ?string
    {
        $method = request()->input('payout_method');

        return is_string($method) && in_array($method, Tenant::PAYOUT_METHODS, true) ? $method : null;
    }

    /** Turn "required" rules into "sometimes" so applicants can save partial edits. */
    protected function relaxRules(array $rules): array
    {
        $relaxed = [];

        foreach ($rules as $field => $fieldRules) {
            $fieldRules = array_values(array_filter(
                $fieldRules,
                fn ($rule) => ! ($rule instanceof \Illuminate\Validation\Rules\RequiredIf),
            ));
            $relaxed[$field] = array_map(
                fn ($rule) => $rule === 'required' ? 'sometimes' : $rule,
                $fieldRules,
            );
        }

        return $relaxed;
    }

    /** Copy only whitelisted business fields out of the validated payload. */
    protected function applicationAttributes(array $data): array
    {
        $attributes = [];

        foreach (self::APPLICATION_FIELDS as $field) {
            if (array_key_exists($field, $data)) {
                $attributes[$field] = $data[$field];
            }
        }

        return $attributes;
    }

    /**
     * Certificates and permits stay private: files are written to the local disk
     * (outside public/) and only streamed to super admins via an authenticated
     * endpoint, so they are never publicly reachable.
     *
     * @return array<int, array<string, mixed>>
     */
    protected function storeDocuments(Request $request, string $slug, array $existing = []): array
    {
        $labelled = [
            'business_certificate' => 'Business certificate',
            'operating_permit' => 'Operating permit',
        ];

        foreach ($labelled as $field => $label) {
            if ($request->hasFile($field)) {
                $existing = $this->appendDocument($existing, $request->file($field), $label, $slug);
            }
        }

        foreach ((array) $request->file('additional_documents', []) as $file) {
            if ($file instanceof UploadedFile) {
                $existing = $this->appendDocument($existing, $file, $file->getClientOriginalName() ?: 'Supporting document', $slug);
            }
        }

        return array_values($existing);
    }

    protected function appendDocument(array $documents, UploadedFile $file, string $label, string $slug): array
    {
        $documents[] = [
            'key' => Str::lower(Str::random(10)),
            'label' => $label,
            'path' => $file->store('tenant-documents/'.$slug, 'local'),
            'original_name' => $file->getClientOriginalName(),
            'mime' => $file->getClientMimeType(),
            'size' => $file->getSize(),
            'uploaded_at' => now()->toIso8601String(),
        ];

        return $documents;
    }

    protected function uniqueStoreSlug(string $name, int $tenantId): string
    {
        $slug = Str::slug($name) ?: 'store';
        $base = $slug;
        $i = 1;

        while (Store::withoutGlobalScopes()->where('tenant_id', $tenantId)->where('slug', $slug)->exists()) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }

    protected function uniqueSlug(string $name): string
    {
        $slug = Str::slug($name) ?: 'store';
        $base = $slug;
        $i = 1;

        while (Tenant::query()->where('slug', $slug)->exists()) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }

    protected function paginate($paginator): array
    {
        return [
            'data' => $paginator->items(),
            'meta' => [
                'page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ];
    }
}
