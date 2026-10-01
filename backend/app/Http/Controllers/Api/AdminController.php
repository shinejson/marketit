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

    /**
     * Paginated audit trail with full filtering (actor, action, subject, IP,
     * tenant, free-text search, date range). Always newest first.
     */
    public function auditLogs(Request $request): JsonResponse
    {
        $perPage = min(100, max(1, $request->integer('per_page', 30)));

        $page = $this->auditLogQuery($request)
            ->with([
                'actor' => fn ($q) => $q->select('id', 'name', 'email'),
                'tenant' => fn ($q) => $q->select('id', 'name', 'status'),
            ])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($perPage);

        $filtered = $this->auditLogQuery($request);

        return response()->json([
            'data' => $page->items(),
            'meta' => [
                'page' => $page->currentPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
                'last_page' => $page->lastPage(),
            ],
            'stats' => [
                'total' => (clone $filtered)->count(),
                'today' => (clone $filtered)->whereDate('created_at', now()->toDateString())->count(),
                'last_7_days' => (clone $filtered)->where('created_at', '>=', now()->subDays(7))->count(),
                'unique_actors' => (clone $filtered)->whereNotNull('actor_user_id')->distinct()->count('actor_user_id'),
                'unique_ips' => (clone $filtered)->whereNotNull('ip')->distinct()->count('ip'),
            ],
        ]);
    }

    /**
     * Filter option lists (actions, subjects, actors, IPs, tenants) used to
     * populate the audit log filter bar. Always reflects the full table so
     * dropdowns keep every available option while filters are active.
     */
    public function auditLogFacets(): JsonResponse
    {
        $actions = AuditLog::query()
            ->selectRaw('action as value, count(*) as count')
            ->whereNotNull('action')
            ->groupBy('action')
            ->orderByDesc('count')
            ->get();

        $subjectTypes = AuditLog::query()
            ->selectRaw('subject_type as value, count(*) as count')
            ->whereNotNull('subject_type')
            ->groupBy('subject_type')
            ->orderByDesc('count')
            ->get();

        $actors = AuditLog::query()
            ->join('users', 'users.id', '=', 'audit_logs.actor_user_id')
            ->selectRaw('users.id as id, users.name as name, users.email as email, count(*) as count')
            ->groupBy('users.id', 'users.name', 'users.email')
            ->orderByDesc('count')
            ->get();

        $ips = AuditLog::query()
            ->selectRaw('ip as value, count(*) as count')
            ->whereNotNull('ip')
            ->groupBy('ip')
            ->orderByDesc('count')
            ->limit(100)
            ->get();

        $tenants = AuditLog::query()
            ->join('tenants', 'tenants.id', '=', 'audit_logs.tenant_id')
            ->selectRaw('tenants.id as id, tenants.name as name, count(*) as count')
            ->groupBy('tenants.id', 'tenants.name')
            ->orderByDesc('count')
            ->get();

        return response()->json([
            'data' => [
                'actions' => $actions,
                'subject_types' => $subjectTypes,
                'actors' => $actors,
                'ips' => $ips,
                'tenants' => $tenants,
            ],
        ]);
    }

    /**
     * Shared filter builder for the audit endpoints so the listing and its
     * stats always agree on the same filtered set.
     */
    protected function auditLogQuery(Request $request): \Illuminate\Database\Eloquent\Builder
    {
        $q = AuditLog::query();

        if ($request->filled('tenant_id')) {
            $q->where('tenant_id', $request->integer('tenant_id'));
        }
        if ($request->filled('actor_id')) {
            $q->where('actor_user_id', $request->integer('actor_id'));
        }
        if ($request->filled('action')) {
            $q->where('action', $request->string('action')->toString());
        }
        if ($request->filled('subject_type')) {
            $q->where('subject_type', $request->string('subject_type')->toString());
        }
        if ($request->filled('ip')) {
            $q->where('ip', $request->string('ip')->toString());
        }
        if ($request->filled('from') && strtotime((string) $request->string('from')) !== false) {
            $q->whereDate('created_at', '>=', $request->string('from')->toString());
        }
        if ($request->filled('to') && strtotime((string) $request->string('to')) !== false) {
            $q->whereDate('created_at', '<=', $request->string('to')->toString());
        }
        if ($request->filled('q')) {
            $term = '%'.str_replace(['%', '_'], ['\\%', '\\_'], $request->string('q')->toString()).'%';
            $q->where(function ($inner) use ($term) {
                $inner->where('action', 'like', $term)
                    ->orWhere('subject_type', 'like', $term)
                    ->orWhere('ip', 'like', $term)
                    ->orWhereHas('actor', fn ($user) => $user
                        ->where('name', 'like', $term)
                        ->orWhere('email', 'like', $term));
            });
        }

        return $q;
    }
}
