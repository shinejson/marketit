<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use App\Models\CouponRedemption;
use App\Models\CouponTarget;
use App\Models\PlatformCategory;
use App\Models\Store;
use App\Models\Tenant;
use App\Services\Commerce\CouponService;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * §18 / §22 #18 — platform-wide promotions.
 *
 * A coupon with a null tenant_id is funded by the marketplace and works in
 * every store; the same table also lets an admin audit seller coupons.
 */
class AdminCouponController extends Controller
{
    public function __construct(protected CouponService $coupons) {}

    public function index(Request $request): JsonResponse
    {
        TenantContext::bypass(true);

        $query = Coupon::query()->with(['targets', 'tenant:id,name', 'store:id,name']);

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('scope')) {
            $request->string('scope')->toString() === 'platform'
                ? $query->whereNull('tenant_id')
                : $query->whereNotNull('tenant_id');
        }
        if ($request->filled('tenant_id')) {
            $query->where('tenant_id', $request->integer('tenant_id'));
        }
        if ($request->filled('q')) {
            $term = '%'.$request->string('q').'%';
            $query->where(fn ($q) => $q->where('code', 'like', $term)->orWhere('name', 'like', $term));
        }

        $page = $query->orderByDesc('id')->paginate($request->integer('per_page', 20));

        return response()->json([
            'data' => collect($page->items())->map(fn (Coupon $c) => $this->present($c))->all(),
            'summary' => $this->summary(),
            'meta' => $this->meta($page),
        ]);
    }

    public function show(Coupon $coupon): JsonResponse
    {
        TenantContext::bypass(true);

        return response()->json(['data' => $this->present($coupon->load(['targets', 'tenant', 'store']), true)]);
    }

    public function store(Request $request): JsonResponse
    {
        TenantContext::bypass(true);
        $data = $this->rules($request);

        $attributes = collect($data)->except('targets')->all();
        $attributes['code'] = strtoupper($attributes['code'] ?? $this->generateCode());
        $this->assertCodeFree($attributes['code']);
        $attributes['created_by_user_id'] = $request->user()->id;

        $coupon = Coupon::query()->create($attributes);
        $this->syncTargets($coupon, $data['targets'] ?? []);

        return response()->json(['data' => $this->present($coupon->fresh('targets'), true)], 201);
    }

    public function update(Request $request, Coupon $coupon): JsonResponse
    {
        TenantContext::bypass(true);
        $data = $this->rules($request, $coupon);

        $attributes = collect($data)->except('targets')->all();
        if (! empty($attributes['code'])) {
            $attributes['code'] = strtoupper($attributes['code']);
            if ($attributes['code'] !== $coupon->code) {
                $this->assertCodeFree($attributes['code']);
            }
        }

        $coupon->update($attributes);
        if (array_key_exists('targets', $data)) {
            $this->syncTargets($coupon, $data['targets'] ?? []);
        }

        return response()->json(['data' => $this->present($coupon->fresh('targets'), true)]);
    }

    public function destroy(Coupon $coupon): JsonResponse
    {
        TenantContext::bypass(true);
        $coupon->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    /** Pause / resume without losing the configuration. */
    public function toggle(Coupon $coupon): JsonResponse
    {
        TenantContext::bypass(true);
        $coupon->update([
            'status' => $coupon->status === Coupon::STATUS_ACTIVE
                ? Coupon::STATUS_PAUSED
                : Coupon::STATUS_ACTIVE,
        ]);

        return response()->json(['data' => $this->present($coupon->fresh('targets'))]);
    }

    public function redemptions(Request $request, Coupon $coupon): JsonResponse
    {
        TenantContext::bypass(true);

        $page = CouponRedemption::query()
            ->with(['user:id,name,email', 'order:id,grand_total,currency,placed_at'])
            ->where('coupon_id', $coupon->id)
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 25));

        return response()->json([
            'data' => collect($page->items())->map(fn (CouponRedemption $r) => [
                'id' => $r->id,
                'order_id' => $r->order_id,
                'seller_order_id' => $r->seller_order_id,
                'code' => $r->code,
                'amount' => (string) $r->amount,
                'currency' => $r->currency,
                'status' => $r->status,
                'created_at' => $r->created_at,
                'customer' => $r->user ? ['id' => $r->user->id, 'name' => $r->user->name, 'email' => $r->user->email] : null,
                'order_total' => $r->order ? (string) $r->order->grand_total : null,
            ])->all(),
            'meta' => $this->meta($page),
        ]);
    }

    public function options(): JsonResponse
    {
        TenantContext::bypass(true);

        return response()->json([
            'data' => [
                'discount_types' => Coupon::TYPES,
                'statuses' => Coupon::STATUSES,
                'applies_to' => [Coupon::APPLIES_ALL, Coupon::APPLIES_PRODUCTS, Coupon::APPLIES_CATEGORIES, Coupon::APPLIES_STORES],
                'tenants' => Tenant::query()->orderBy('name')->limit(500)->get(['id', 'name']),
                'stores' => Store::query()->orderBy('name')->limit(500)->get(['id', 'tenant_id', 'name']),
                'platform_categories' => PlatformCategory::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']),
            ],
        ]);
    }

    // ----------------------------------------------------------- internals

    protected function rules(Request $request, ?Coupon $coupon = null): array
    {
        $data = $request->validate([
            'tenant_id' => ['nullable', 'integer', 'exists:tenants,id'],
            'store_id' => ['nullable', 'integer', 'exists:stores,id'],
            'code' => ['nullable', 'string', 'max:48', 'regex:/^[A-Za-z0-9_-]+$/'],
            'name' => [$coupon ? 'sometimes' : 'required', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:500'],
            'discount_type' => ['nullable', 'in:'.implode(',', Coupon::TYPES)],
            'value' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'min_subtotal' => ['nullable', 'numeric', 'min:0'],
            'max_discount' => ['nullable', 'numeric', 'min:0'],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
            'per_user_limit' => ['nullable', 'integer', 'min:1'],
            'applies_to' => ['nullable', 'in:all,products,categories,stores'],
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

        $type = $data['discount_type'] ?? $coupon?->discount_type;
        if ($type === Coupon::TYPE_PERCENTAGE && isset($data['value']) && (float) $data['value'] > 100) {
            throw ValidationException::withMessages(['value' => 'A percentage discount cannot exceed 100%.']);
        }

        return $data;
    }

    protected function assertCodeFree(string $code): void
    {
        if (Coupon::query()->whereRaw('UPPER(code) = ?', [strtoupper($code)])->exists()) {
            throw ValidationException::withMessages(['code' => 'That code is already in use.']);
        }
    }

    protected function generateCode(): string
    {
        do {
            $code = strtoupper(Str::random(8));
        } while (Coupon::query()->where('code', $code)->exists());

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

    protected function summary(): array
    {
        $base = Coupon::query();

        return [
            'total' => (clone $base)->count(),
            'active' => (clone $base)->where('status', Coupon::STATUS_ACTIVE)->count(),
            'platform' => (clone $base)->whereNull('tenant_id')->count(),
            'seller' => (clone $base)->whereNotNull('tenant_id')->count(),
            'redemptions' => (int) (clone $base)->sum('used_count'),
            'discount_given' => number_format((float) (clone $base)->sum('redeemed_value'), 2, '.', ''),
        ];
    }

    protected function present(Coupon $coupon, bool $detailed = false): array
    {
        $payload = [
            'id' => $coupon->id,
            'tenant_id' => $coupon->tenant_id,
            'tenant' => $coupon->relationLoaded('tenant') ? $coupon->tenant?->name : null,
            'store_id' => $coupon->store_id,
            'store' => $coupon->relationLoaded('store') ? $coupon->store?->name : null,
            'code' => $coupon->code,
            'name' => $coupon->name,
            'description' => $coupon->description,
            'discount_type' => $coupon->discount_type,
            'value' => (string) $coupon->value,
            'currency' => $coupon->currency,
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
            'scope' => $coupon->isPlatformWide() ? 'platform' : 'seller',
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

    protected function meta($page): array
    {
        return [
            'page' => $page->currentPage(),
            'per_page' => $page->perPage(),
            'total' => $page->total(),
            'last_page' => $page->lastPage(),
        ];
    }
}
