<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use App\Models\UserRole;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

/** Platform-wide user administration for super admins. */
class AdminUserController extends Controller
{
    public const ROLES = ['super_admin', 'tenant_owner', 'store_staff', 'customer'];

    public function index(Request $request): JsonResponse
    {
        TenantContext::bypass(true);

        try {
            $query = User::query()->with(['roles.tenant:id,name,business_name']);

            if ($term = trim((string) $request->string('q'))) {
                $like = '%'.$term.'%';
                $query->where(fn ($q) => $q->where('name', 'like', $like)
                    ->orWhere('email', 'like', $like)
                    ->orWhere('phone', 'like', $like));
            }

            if ($role = $request->string('role')->toString()) {
                if ($role !== 'all') {
                    $query->whereHas('roles', fn ($q) => $q->where('role', $role));
                }
            }

            if ($status = $request->string('status')->toString()) {
                if ($status !== 'all') {
                    $query->where('status', $status);
                }
            }

            if ($request->filled('tenant_id')) {
                $tenantId = $request->integer('tenant_id');
                $query->whereHas('roles', fn ($q) => $q->where('tenant_id', $tenantId));
            }

            $page = $query->orderByDesc('id')->paginate($request->integer('per_page', 20));

            return response()->json([
                'data' => collect($page->items())->map(fn (User $user) => $this->payload($user))->all(),
                'meta' => [
                    'page' => $page->currentPage(),
                    'per_page' => $page->perPage(),
                    'total' => $page->total(),
                    'last_page' => $page->lastPage(),
                ],
                'summary' => $this->summary(),
            ]);
        } finally {
            TenantContext::bypass(false);
        }
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:32'],
            'password' => ['required', 'string', 'min:8'],
            'status' => ['nullable', Rule::in(['active', 'suspended'])],
            'role' => ['required', Rule::in(self::ROLES)],
            'tenant_id' => ['nullable', 'integer', 'exists:tenants,id'],
        ]);

        $this->guardTenantRole($data['role'], $data['tenant_id'] ?? null);

        $user = DB::transaction(function () use ($data) {
            $user = User::query()->create([
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
                'password' => $data['password'],
                'status' => $data['status'] ?? 'active',
                'email_verified_at' => now(),
            ]);

            UserRole::query()->create([
                'user_id' => $user->id,
                'role' => $data['role'],
                'tenant_id' => $data['tenant_id'] ?? null,
            ]);

            return $user;
        });

        return response()->json(['data' => $this->payload($user->load('roles.tenant'))], 201);
    }

    public function show(User $user): JsonResponse
    {
        TenantContext::bypass(true);

        try {
            $user->load(['roles.tenant:id,name,business_name', 'orders']);
            $data = $this->payload($user);
            $data['orders_count'] = $user->orders->count();
            $data['orders_total'] = round((float) $user->orders->sum('grand_total'), 2);

            return response()->json(['data' => $data]);
        } finally {
            TenantContext::bypass(false);
        }
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'email' => ['sometimes', 'email', 'max:190', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:32'],
            'status' => ['sometimes', Rule::in(['active', 'suspended'])],
            'password' => ['nullable', 'string', 'min:8'],
        ]);

        if (($data['status'] ?? null) === 'suspended' && $user->id === $request->user()->id) {
            abort(422, 'You cannot suspend your own account.');
        }

        if (empty($data['password'])) {
            unset($data['password']);
        }

        $user->update($data);

        // A suspended account should not keep working through an existing token.
        if ($user->status === 'suspended') {
            $user->tokens()->delete();
        }

        return response()->json(['data' => $this->payload($user->fresh('roles.tenant'))]);
    }

    /** Replace the role set of a user (roles are scoped to a tenant where relevant). */
    public function syncRoles(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'roles' => ['required', 'array', 'min:1'],
            'roles.*.role' => ['required', Rule::in(self::ROLES)],
            'roles.*.tenant_id' => ['nullable', 'integer', 'exists:tenants,id'],
        ]);

        foreach ($data['roles'] as $role) {
            $this->guardTenantRole($role['role'], $role['tenant_id'] ?? null);
        }

        if ($user->id === $request->user()->id
            && ! collect($data['roles'])->contains(fn ($r) => $r['role'] === 'super_admin')) {
            abort(422, 'You cannot remove your own super admin role.');
        }

        DB::transaction(function () use ($user, $data) {
            $user->roles()->delete();
            foreach ($data['roles'] as $role) {
                UserRole::query()->create([
                    'user_id' => $user->id,
                    'role' => $role['role'],
                    'tenant_id' => $role['tenant_id'] ?? null,
                ]);
            }
        });

        return response()->json(['data' => $this->payload($user->fresh('roles.tenant'))]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($user->id === $request->user()->id) {
            abort(422, 'You cannot delete your own account.');
        }

        TenantContext::bypass(true);

        try {
            if (Tenant::query()->where('owner_user_id', $user->id)->exists()) {
                abort(422, 'This user owns a tenant. Reassign or remove the tenant first.');
            }

            $user->tokens()->delete();
            $user->roles()->delete();
            $user->delete();

            return response()->json(['data' => ['deleted' => true]]);
        } finally {
            TenantContext::bypass(false);
        }
    }

    private function guardTenantRole(string $role, ?int $tenantId): void
    {
        if (in_array($role, ['tenant_owner', 'store_staff'], true) && ! $tenantId) {
            abort(422, 'A tenant must be selected for the '.$role.' role.');
        }
    }

    private function payload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'status' => $user->status ?? 'active',
            'primary_role' => $user->primaryRole(),
            'last_login_at' => $user->last_login_at,
            'created_at' => $user->created_at,
            'roles' => $user->roles->map(fn (UserRole $role) => [
                'id' => $role->id,
                'role' => $role->role,
                'tenant_id' => $role->tenant_id,
                'tenant' => $role->tenant?->business_name ?: $role->tenant?->name,
            ])->all(),
        ];
    }

    private function summary(): array
    {
        $byRole = UserRole::query()
            ->selectRaw('role, COUNT(DISTINCT user_id) as total')
            ->groupBy('role')
            ->pluck('total', 'role');

        return [
            'total' => User::query()->count(),
            'active' => User::query()->where('status', 'active')->count(),
            'suspended' => User::query()->where('status', 'suspended')->count(),
            'by_role' => collect(self::ROLES)->mapWithKeys(fn ($r) => [$r => (int) ($byRole[$r] ?? 0)])->all(),
        ];
    }
}
