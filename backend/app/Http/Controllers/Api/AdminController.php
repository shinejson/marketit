<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Models\Product;
use App\Models\SellerOrder;
use App\Models\Store;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    public function tenants(Request $request): JsonResponse
    {
        TenantContext::bypass(true);
        $q = Tenant::query()->with('owner');
        if ($request->filled('status')) {
            $q->where('status', $request->string('status'));
        }
        if ($request->filled('q')) {
            $term = '%'.$request->string('q').'%';
            $q->where(function ($inner) use ($term) {
                $inner->where('name', 'like', $term)
                    ->orWhere('business_name', 'like', $term)
                    ->orWhere('trading_name', 'like', $term)
                    ->orWhere('registration_number', 'like', $term)
                    ->orWhere('owner_email', 'like', $term);
            });
        }
        $page = $q->orderByDesc('id')->paginate($request->integer('per_page', 15));

        return response()->json([
            'data' => collect($page->items())->map(fn (Tenant $tenant) => $this->tenantSummary($tenant))->all(),
            'meta' => [
                'page' => $page->currentPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
                'last_page' => $page->lastPage(),
            ],
        ]);
    }

    /** Full application for review — includes the fields hidden from normal payloads. */
    public function showTenant(Tenant $tenant): JsonResponse
    {
        TenantContext::bypass(true);

        $tenant->load(['owner', 'reviewer', 'stores']);
        $data = $tenant->toArray();
        $data['owner_id_number'] = $tenant->owner_id_number;
        $data['payout_account_number'] = $tenant->payout_account_number;
        $data['checklist'] = $this->tenantChecklist($tenant);

        return response()->json(['data' => $data]);
    }

    /** Streams a private certificate/permit to a super admin only. */
    public function tenantDocument(Tenant $tenant, string $document)
    {
        TenantContext::bypass(true);

        $match = collect($tenant->documents ?? [])
            ->first(fn (array $doc) => ($doc['key'] ?? null) === $document);

        abort_if($match === null, 404, 'Document not found.');

        $disk = Storage::disk('local');
        abort_unless($disk->exists($match['path']), 404, 'Document file is missing.');

        return $disk->download($match['path'], $match['original_name'] ?? basename($match['path']));
    }

    public function updateTenant(Request $request, Tenant $tenant): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in([Tenant::STATUS_PENDING, Tenant::STATUS_ACTIVE, Tenant::STATUS_SUSPENDED, Tenant::STATUS_REJECTED])],
            'review_notes' => ['nullable', 'string', 'max:2000'],
            'rejection_reason' => [
                Rule::requiredIf($request->input('status') === Tenant::STATUS_REJECTED),
                'nullable', 'string', 'max:2000',
            ],
        ]);

        $status = $data['status'];
        $tenant->update([
            'status' => $status,
            'review_notes' => $data['review_notes'] ?? $tenant->review_notes,
            'rejection_reason' => $status === Tenant::STATUS_REJECTED
                ? $data['rejection_reason']
                : null,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        if ($status === Tenant::STATUS_ACTIVE) {
            Store::withoutGlobalScopes()
                ->where('tenant_id', $tenant->id)
                ->where('status', Store::STATUS_DRAFT)
                ->update(['status' => Store::STATUS_ACTIVE]);
        }

        return response()->json(['data' => $this->tenantSummary($tenant->fresh(['owner']))]);
    }

    protected function tenantSummary(Tenant $tenant): array
    {
        $data = $tenant->toArray();
        $data['documents_count'] = count($tenant->documents ?? []);
        $data['checklist_complete'] = $this->tenantChecklist($tenant)['complete'];

        return $data;
    }

    /** What the reviewer still needs before approving. */
    protected function tenantChecklist(Tenant $tenant): array
    {
        $documents = collect($tenant->documents ?? []);
        $has = fn (string $label) => $documents->contains(
            fn (array $doc) => strcasecmp((string) ($doc['label'] ?? ''), $label) === 0
        );

        $items = [
            'business_name' => (bool) $tenant->business_name,
            'business_type' => (bool) $tenant->business_type,
            'registration_number' => (bool) $tenant->registration_number,
            'product_summary' => (bool) $tenant->product_summary,
            'address' => (bool) $tenant->address_line1 && (bool) $tenant->city,
            'gps' => $tenant->latitude !== null && $tenant->longitude !== null,
            'owner_details' => (bool) $tenant->owner_name && (bool) $tenant->owner_id_number,
            'business_certificate' => $has('Business certificate'),
            'operating_permit' => $has('Operating permit'),
            'payout_details' => (bool) $tenant->payout_method,
        ];

        return [
            'items' => $items,
            'complete' => ! in_array(false, $items, true),
            'missing' => array_keys(array_filter($items, fn ($ok) => ! $ok)),
        ];
    }

    public function orders(Request $request): JsonResponse
    {
        $q = Order::query()->with(['user', 'sellerOrders']);
        if ($request->filled('status')) {
            $q->where('status', $request->string('status'));
        }
        $page = $q->orderByDesc('id')->paginate($request->integer('per_page', 15));

        return response()->json([
            'data' => $page->items(),
            'meta' => [
                'page' => $page->currentPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
                'last_page' => $page->lastPage(),
            ],
        ]);
    }

    public function metrics(): JsonResponse
    {
        TenantContext::bypass(true);
        try {
            return response()->json([
                'data' => [
                    'tenants' => Tenant::query()->count(),
                    'active_stores' => Store::query()->where('status', Store::STATUS_ACTIVE)->count(),
                    'customers' => User::query()->whereHas('roles', fn ($q) => $q->where('role', 'customer'))->count(),
                    'products' => Product::query()->count(),
                    'orders' => Order::query()->count(),
                    'gmv' => (string) Order::query()->whereIn('status', [Order::STATUS_PAID, Order::STATUS_FULFILLED, Order::STATUS_COMPLETED, Order::STATUS_PARTIALLY_FULFILLED])->sum('grand_total'),
                    'commission' => (string) SellerOrder::withoutGlobalScopes()->sum('commission'),
                    'payments_succeeded' => PaymentTransaction::query()->where('status', PaymentTransaction::STATUS_SUCCEEDED)->count(),
                ],
            ]);
        } finally {
            TenantContext::bypass(false);
        }
    }

    public function auditLogs(Request $request): JsonResponse
    {
        $q = AuditLog::query()->with('actor')->orderByDesc('id');
        if ($request->filled('tenant_id')) {
            $q->where('tenant_id', $request->integer('tenant_id'));
        }
        $page = $q->paginate($request->integer('per_page', 30));

        return response()->json([
            'data' => $page->items(),
            'meta' => [
                'page' => $page->currentPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
                'last_page' => $page->lastPage(),
            ],
        ]);
    }
}
