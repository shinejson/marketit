<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\SellerOrder;
use App\Models\SocialIdentity;
use App\Models\TenantCustomerProfile;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Customer users of a tenant.
 *
 * A "customer" here is a marketplace account that has bought from this tenant
 * (or that the tenant has recorded a profile for). The platform account is
 * shared across the marketplace, so this endpoint is read-only about the
 * account itself and only writes tenant-scoped facts — notes, tags, segment,
 * marketing consent and whether the shopper is blocked from this tenant.
 *
 * Login method matters to merchants and support, so every row carries the
 * social identities (Google, Facebook, Apple…) the customer signs in with.
 */
class TenantCustomerController extends Controller
{
    protected const SORTS = [
        'spend_desc' => ['tenant_spend', 'desc'],
        'spend_asc' => ['tenant_spend', 'asc'],
        'orders_desc' => ['tenant_orders_count', 'desc'],
        'recent_desc' => ['tenant_last_order_at', 'desc'],
        'name_asc' => ['users.name', 'asc'],
        'joined_desc' => ['users.created_at', 'desc'],
    ];

    public function index(Request $request): JsonResponse
    {
        $tenantId = $this->tenantId($request);

        $query = $this->baseQuery($tenantId);

        if ($search = trim((string) $request->string('search'))) {
            $query->where(function (Builder $q) use ($search) {
                $q->where('users.name', 'like', "%{$search}%")
                    ->orWhere('users.email', 'like', "%{$search}%")
                    ->orWhere('users.phone', 'like', "%{$search}%");
            });
        }

        $filter = $request->string('status')->toString();
        if ($filter === 'blocked') {
            $query->whereIn('users.id', $this->profileIds($tenantId, TenantCustomerProfile::STATUS_BLOCKED));
        } elseif ($filter === 'active') {
            $query->whereNotIn('users.id', $this->profileIds($tenantId, TenantCustomerProfile::STATUS_BLOCKED));
        } elseif ($filter === 'repeat') {
            $query->having('tenant_orders_count', '>', 1);
        } elseif ($filter === 'social') {
            $query->whereHas('socialIdentities');
        } elseif ($filter === 'password') {
            $query->whereDoesntHave('socialIdentities');
        }

        if ($provider = $request->string('provider')->toString()) {
            $query->whereHas('socialIdentities', fn ($q) => $q->where('provider', $provider));
        }

        [$column, $direction] = self::SORTS[$request->string('sort', 'spend_desc')->toString()] ?? self::SORTS['spend_desc'];
        $query->orderBy($column, $direction)->orderBy('users.id');

        $perPage = min(100, max(5, $request->integer('per_page', 20)));
        $page = $query->paginate($perPage);

        $profiles = TenantCustomerProfile::query()
            ->where('tenant_id', $tenantId)
            ->whereIn('user_id', collect($page->items())->pluck('id'))
            ->get()
            ->keyBy('user_id');

        return response()->json([
            'data' => collect($page->items())
                ->map(fn (User $user) => $this->payload($user, $profiles->get($user->id)))
                ->all(),
            'meta' => [
                'page' => $page->currentPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
                'last_page' => $page->lastPage(),
                'providers' => $this->providerBreakdown($tenantId),
                'segments' => TenantCustomerProfile::SEGMENTS,
                'can_manage' => $request->user()->isTenantOwner()
                    || $request->user()->hasTenantPermission('customers.manage', $tenantId),
            ],
            'stats' => $this->stats($tenantId),
        ]);
    }

    public function show(Request $request, User $customer): JsonResponse
    {
        $tenantId = $this->tenantId($request);
        $this->assertCustomerOfTenant($customer, $tenantId);

        $row = $this->baseQuery($tenantId)->where('users.id', $customer->id)->firstOrFail();
        $profile = TenantCustomerProfile::query()
            ->where('tenant_id', $tenantId)
            ->where('user_id', $customer->id)
            ->first();

        return response()->json([
            'data' => $this->payload($row, $profile) + [
                'orders' => $this->recentOrders($tenantId, $customer->id),
            ],
        ]);
    }

    public function update(Request $request, User $customer): JsonResponse
    {
        $tenantId = $this->tenantId($request, 'customers.manage');
        $this->assertCustomerOfTenant($customer, $tenantId);

        $data = $request->validate([
            'status' => ['sometimes', Rule::in(TenantCustomerProfile::STATUSES)],
            'segment' => ['sometimes', 'nullable', Rule::in(TenantCustomerProfile::SEGMENTS)],
            'tags' => ['sometimes', 'nullable', 'array'],
            'tags.*' => ['string', 'max:32'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'marketing_opt_in' => ['sometimes', 'boolean'],
        ]);

        $profile = TenantCustomerProfile::query()->updateOrCreate(
            ['tenant_id' => $tenantId, 'user_id' => $customer->id],
            $data + ['status' => $data['status'] ?? TenantCustomerProfile::STATUS_ACTIVE]
        );

        $row = $this->baseQuery($tenantId)->where('users.id', $customer->id)->firstOrFail();

        return response()->json(['data' => $this->payload($row, $profile)]);
    }

    // --------------------------------------------------------------- queries

    /** Customers of this tenant, with tenant-scoped order aggregates attached. */
    protected function baseQuery(int $tenantId): Builder
    {
        $spend = SellerOrder::query()
            ->withoutGlobalScopes()
            ->join('orders', 'orders.id', '=', 'seller_orders.order_id')
            ->whereColumn('orders.user_id', 'users.id')
            ->where('seller_orders.tenant_id', $tenantId)
            ->whereNotIn('seller_orders.status', [SellerOrder::STATUS_CANCELLED])
            ->selectRaw('coalesce(sum(seller_orders.subtotal + seller_orders.delivery_fee), 0)');

        $orders = Order::query()
            ->whereColumn('orders.user_id', 'users.id')
            ->whereIn('orders.id', $this->tenantOrderIds($tenantId));

        return User::query()
            ->select('users.*')
            ->whereIn('users.id', $this->customerIds($tenantId))
            ->addSelect(['tenant_spend' => $spend])
            ->addSelect(['tenant_orders_count' => (clone $orders)->selectRaw('count(*)')])
            ->addSelect(['tenant_last_order_at' => (clone $orders)->selectRaw('max(orders.placed_at)')])
            ->addSelect(['tenant_first_order_at' => (clone $orders)->selectRaw('min(orders.placed_at)')])
            ->with(['socialIdentities' => fn ($q) => $q->orderBy('provider')]);
    }

    /** Order ids that contain a line fulfilled by this tenant. */
    protected function tenantOrderIds(int $tenantId): \Illuminate\Database\Query\Builder
    {
        return DB::table('seller_orders')->select('order_id')->where('tenant_id', $tenantId);
    }

    /** @return \Illuminate\Support\Collection<int, int> */
    protected function customerIds(int $tenantId)
    {
        $buyers = DB::table('orders')
            ->whereIn('orders.id', $this->tenantOrderIds($tenantId))
            ->pluck('user_id');

        $profiled = DB::table('tenant_customer_profiles')
            ->where('tenant_id', $tenantId)
            ->pluck('user_id');

        return $buyers->merge($profiled)->filter()->unique()->values();
    }

    protected function profileIds(int $tenantId, string $status)
    {
        return DB::table('tenant_customer_profiles')
            ->where('tenant_id', $tenantId)
            ->where('status', $status)
            ->pluck('user_id');
    }

    protected function recentOrders(int $tenantId, int $userId): array
    {
        return SellerOrder::query()
            ->withoutGlobalScopes()
            ->where('seller_orders.tenant_id', $tenantId)
            ->join('orders', 'orders.id', '=', 'seller_orders.order_id')
            ->where('orders.user_id', $userId)
            ->orderByDesc('orders.placed_at')
            ->limit(10)
            ->get([
                'seller_orders.id',
                'seller_orders.order_id',
                'seller_orders.status',
                'seller_orders.subtotal',
                'seller_orders.delivery_fee',
                'orders.placed_at',
                'orders.currency',
            ])
            ->map(fn ($row) => [
                'id' => $row->id,
                'order_id' => $row->order_id,
                'status' => $row->status,
                'total' => round((float) $row->subtotal + (float) $row->delivery_fee, 2),
                'currency' => $row->currency,
                'placed_at' => $row->placed_at,
            ])->all();
    }

    protected function stats(int $tenantId): array
    {
        $ids = $this->customerIds($tenantId);
        $blocked = $this->profileIds($tenantId, TenantCustomerProfile::STATUS_BLOCKED)->count();

        $orderIds = $this->tenantOrderIds($tenantId);

        $revenue = (float) DB::table('seller_orders')
            ->where('tenant_id', $tenantId)
            ->whereNot('status', SellerOrder::STATUS_CANCELLED)
            ->sum(DB::raw('subtotal + delivery_fee'));

        $repeat = DB::table('orders')
            ->whereIn('id', $orderIds)
            ->whereNotNull('user_id')
            ->groupBy('user_id')
            ->havingRaw('count(*) > 1')
            ->pluck('user_id')
            ->count();

        $social = DB::table('social_identities')->whereIn('user_id', $ids)->distinct()->count('user_id');

        $newThisMonth = DB::table('orders')
            ->whereIn('id', $orderIds)
            ->whereNotNull('user_id')
            ->groupBy('user_id')
            ->havingRaw('min(placed_at) >= ?', [now()->startOfMonth()])
            ->pluck('user_id')
            ->count();

        $total = $ids->count();

        return [
            'total' => $total,
            'blocked' => $blocked,
            'repeat' => $repeat,
            'new_this_month' => $newThisMonth,
            'social_logins' => $social,
            'revenue' => round($revenue, 2),
            'average_spend' => $total ? round($revenue / $total, 2) : 0.0,
        ];
    }

    protected function providerBreakdown(int $tenantId): array
    {
        $counts = DB::table('social_identities')
            ->whereIn('user_id', $this->customerIds($tenantId))
            ->selectRaw('provider, count(*) as total')
            ->groupBy('provider')
            ->pluck('total', 'provider');

        return collect(SocialIdentity::PROVIDERS)
            ->map(fn (string $provider) => [
                'key' => $provider,
                'label' => SocialIdentity::label($provider),
                'count' => (int) ($counts[$provider] ?? 0),
            ])->all();
    }

    protected function payload(User $user, ?TenantCustomerProfile $profile): array
    {
        $orders = (int) ($user->tenant_orders_count ?? 0);
        $spend = round((float) ($user->tenant_spend ?? 0), 2);

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'avatar_url' => $user->avatar_url,
            'account_status' => $user->status ?? 'active',
            'status' => $profile?->status ?? TenantCustomerProfile::STATUS_ACTIVE,
            'segment' => $profile?->segment ?? ($orders > 1 ? 'returning' : 'new'),
            'tags' => $profile?->tags ?? [],
            'notes' => $profile?->notes,
            'marketing_opt_in' => (bool) ($profile?->marketing_opt_in ?? false),
            'orders_count' => $orders,
            'total_spent' => $spend,
            'average_order_value' => $orders ? round($spend / $orders, 2) : 0.0,
            'first_order_at' => $user->tenant_first_order_at,
            'last_order_at' => $user->tenant_last_order_at,
            'joined_at' => $user->created_at?->toIso8601String(),
            'last_login_at' => $user->last_login_at?->toIso8601String(),
            'login_methods' => $this->loginMethods($user),
            'social_accounts' => $user->relationLoaded('socialIdentities')
                ? $user->socialIdentities->map(fn (SocialIdentity $identity) => [
                    'provider' => $identity->provider,
                    'label' => SocialIdentity::label($identity->provider),
                    'email' => $identity->email,
                    'nickname' => $identity->nickname,
                    'avatar_url' => $identity->avatar_url,
                    'last_login_at' => $identity->last_login_at?->toIso8601String(),
                ])->all()
                : [],
        ];
    }

    /** @return string[] */
    protected function loginMethods(User $user): array
    {
        $methods = $user->relationLoaded('socialIdentities')
            ? $user->socialIdentities->pluck('provider')->all()
            : [];

        if ($user->password) {
            array_unshift($methods, 'password');
        }

        return array_values(array_unique($methods));
    }

    protected function tenantId(Request $request, string $permission = 'customers.view'): int
    {
        $user = $request->user();
        $tenantId = (int) $user->tenantId();
        abort_unless($tenantId, 404, 'No tenant associated.');
        abort_unless(
            $user->isTenantOwner() || $user->hasTenantPermission($permission, $tenantId),
            403,
            'You do not have permission to view customers.'
        );

        return $tenantId;
    }

    protected function assertCustomerOfTenant(User $customer, int $tenantId): void
    {
        abort_unless($this->customerIds($tenantId)->contains($customer->id), 404, 'Customer not found for this tenant.');
    }
}
