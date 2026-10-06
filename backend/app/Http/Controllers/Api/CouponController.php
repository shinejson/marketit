<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\CouponRedemption;
use App\Models\CouponTarget;
use App\Models\Product;
use App\Models\Store;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * §18 / §22 #18 — seller-owned coupons.
 *
 * A tenant can only create, see and edit coupons scoped to their own
 * workspace; platform-wide promotions live in the admin console.
 */
class CouponController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = TenantContext::id();

        $query = Coupon::query()->where('tenant_id', $tenantId)->with('targets');

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('q')) {
            $term = '%'.$request->string('q').'%';
            $query->where(fn ($q) => $q->where('code', 'like', $term)->orWhere('name', 'like', $term));
        }

        $page = $query->orderByDesc('id')->paginate($request->integer('per_page', 15));

        return response()->json([
            'data' => collect($page->items())->map(fn (Coupon $c) => $this->present($c))->all(),
            'summary' => $this->summary($tenantId),
            'meta' => [
                'page' => $page->currentPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
                'last_page' => $page->lastPage(),
            ],
        ]);
    }

    public function show(Request $request, Coupon $coupon): JsonResponse
    {
        $this->assertOwned($coupon);

        return response()->json(['data' => $this->present($coupon->load('targets'), true)]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatePayload($request);
        $tenantId = TenantContext::id();

        if (! empty($data['store_id'])) {
            Store::query()->where('tenant_id', $tenantId)->findOrFail($data['store_id']);
        }

        $coupon = Coupon::query()->create([
            ...$this->attributes($data),
            'tenant_id' => $tenantId,
            'created_by_user_id' => $request->user()->id,
        ]);

        $this->syncTargets($coupon, $data['targets'] ?? []);

        return response()->json(['data' => $this->present($coupon->fresh('targets'), true)], 201);
    }

    public function update(Request $request, Coupon $coupon): JsonResponse
    {
        $this->assertOwned($coupon);
        $data = $this->validatePayload($request, $coupon);

        $coupon->update($this->attributes($data, $coupon));

        if (array_key_exists('targets', $data)) {
            $this->syncTargets($coupon, $data['targets'] ?? []);
        }

        return response()->json(['data' => $this->present($coupon->fresh('targets'), true)]);
    }

    public function destroy(Coupon $coupon): JsonResponse
    {
        $this->assertOwned($coupon);
        $coupon->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    /** Products / categories / stores a seller can point a coupon at. */
    public function meta(): JsonResponse
    {
        $tenantId = TenantContext::id();

        return response()->json([
            'data' => [
                'stores' => Store::query()->where('tenant_id', $tenantId)->get(['id', 'name', 'slug']),
                'categories' => Category::query()->where('tenant_id', $tenantId)->get(['id', 'name']),
                'products' => Product::query()->where('tenant_id', $tenantId)->orderBy('name')->limit(300)->get(['id', 'name', 'price']),
                'discount_types' => Coupon::TYPES,
                'statuses' => Coupon::STATUSES,
            ],
        ]);
    }

    public function redemptions(Request $request, Coupon $coupon): JsonResponse
    {
        $this->assertOwned($coupon);

        $page = CouponRedemption::query()
            ->with(['user:id,name,email', 'order:id,grand_total,currency,placed_at'])
            ->where('coupon_id', $coupon->id)
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 20));

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

    // ----------------------------------------------------------- internals

    protected function assertOwned(Coupon $coupon): void
    {
        abort_unless((int) $coupon->tenant_id === (int) TenantContext::id(), 403, 'This coupon belongs to another workspace.');
    }

    protected function validatePayload(Request $request, ?Coupon $coupon = null): array
    {
        $codeRule = ['nullable', 'string', 'max:48', 'regex:/^[A-Za-z0-9_-]+$/'];

        return $request->validate([
            'code' => $codeRule,
            'name' => [$coupon ? 'sometimes' : 'required', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:500'],
            'discount_type' => ['nullable', 'in:'.implode(',', Coupon::TYPES)],
            'value' => ['nullable', 'numeric', 'min:0'],
            'min_subtotal' => ['nullable', 'numeric', 'min:0'],
            'max_discount' => ['nullable', 'numeric', 'min:0'],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
            'per_user_limit' => ['nullable', 'integer', 'min:1'],
            'applies_to' => ['nullable', 'in:all,products,categories,stores'],
            'store_id' => ['nullable', 'integer', 'exists:stores,id'],
            'is_stackable' => ['nullable', 'boolean'],
            'first_order_only' => ['nullable', 'boolean'],
            'auto_apply' => ['nullable', 'boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'status' => ['nullable', 'in:'.implode(',', Coupon::STATUSES)],
            'targets' => ['nullable', 'array'],
            'targets.*.target_type' => ['required_with:targets', 'in:product,category,store'],
            'targets.*.target_id' => ['required_with:targets', 'integer'],
        ]);
    }

    protected function attributes(array $data, ?Coupon $coupon = null): array
    {
        $attributes = collect($data)->except('targets')->filter(fn ($value, $key) => $value !== null || in_array($key, [
            'max_discount', 'usage_limit', 'per_user_limit', 'starts_at', 'ends_at', 'store_id', 'description',
        ], true))->all();

        if (empty($attributes['code'])) {
            $attributes['code'] = $coupon?->code ?? $this->generateCode();
        }
        $attributes['code'] = strtoupper($attributes['code']);

        if (! $coupon && $this->codeTaken($attributes['code'])) {
            throw ValidationException::withMessages(['code' => 'That code is already in use.']);
        }
        if ($coupon && $attributes['code'] !== $coupon->code && $this->codeTaken($attributes['code'])) {
            throw ValidationException::withMessages(['code' => 'That code is already in use.']);
        }

        if (($attributes['discount_type'] ?? $coupon?->discount_type) === Coupon::TYPE_PERCENTAGE
            && isset($attributes['value']) && (float) $attributes['value'] > 100) {
            throw ValidationException::withMessages(['value' => 'A percentage discount cannot exceed 100%.']);
        }

        return $attributes;
    }

    protected function codeTaken(string $code): bool
    {
        return Coupon::query()->whereRaw('UPPER(code) = ?', [strtoupper($code)])->exists();
    }

    protected function generateCode(): string
    {
        do {
            $code = strtoupper(Str::random(8));
        } while ($this->codeTaken($code));

        return $code;
    }

    protected function syncTargets(Coupon $coupon, array $targets): void
    {
        $coupon->targets()->delete();
        foreach ($targets as $target) {
            CouponTarget::query()->create([
                'coupon_id' => $coupon->id,
                'target_type' => $target['target_type'],
                'target_id' => (int) $target['target_id'],
            ]);
        }
    }

    protected function summary(?int $tenantId): array
    {
        $base = Coupon::query()->when($tenantId, fn ($q) => $q->where('tenant_id', $tenantId));

        return [
            'total' => (clone $base)->count(),
            'active' => (clone $base)->where('status', Coupon::STATUS_ACTIVE)->count(),
            'redemptions' => (int) (clone $base)->sum('used_count'),
            'discount_given' => number_format((float) (clone $base)->sum('redeemed_value'), 2, '.', ''),
        ];
    }

    protected function present(Coupon $coupon, bool $detailed = false): array
    {
        $payload = [
            'id' => $coupon->id,
            'tenant_id' => $coupon->tenant_id,
            'store_id' => $coupon->store_id,
            'code' => $coupon->code,
            'name' => $coupon->name,
            'description' => $coupon->description,
            'discount_type' => $coupon->discount_type,
            'value' => (string) $coupon->value,
            'min_subtotal' => (string) $coupon->min_subtotal,
            'max_discount' => $coupon->max_discount !== null ? (string) $coupon->max_discount : null,
            'usage_limit' => $coupon->usage_limit,
            'per_user_limit' => $coupon->per_user_limit,
            'used_count' => (int) $coupon->used_count,
            'redeemed_value' => (string) $coupon->redeemed_value,
            'applies_to' => $coupon->applies_to,
            'is_stackable' => (bool) $coupon->is_stackable,
            'first_order_only' => (bool) $coupon->first_order_only,
            'auto_apply' => (bool) $coupon->auto_apply,
            'starts_at' => $coupon->starts_at,
            'ends_at' => $coupon->ends_at,
            'status' => $coupon->status,
            'is_live' => $coupon->is_live,
            'remaining_uses' => $coupon->remaining_uses,
            'scope' => $coupon->tenant_id === null ? 'platform' : 'seller',
            'created_at' => $coupon->created_at,
        ];

        if ($detailed || $coupon->relationLoaded('targets')) {
            $payload['targets'] = $coupon->targets->map(fn (CouponTarget $t) => [
                'target_type' => $t->target_type,
                'target_id' => $t->target_id,
            ])->values();
        }

        return $payload;
    }
}
