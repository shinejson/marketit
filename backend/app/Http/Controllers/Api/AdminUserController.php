<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RoleDefinition;
use App\Models\Tenant;
use App\Models\User;
use App\Models\UserRole;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** Platform-wide user administration for super admins. */
class AdminUserController extends Controller
{
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
            $definitions = $this->roleDefinitions();

            return response()->json([
                'data' => collect($page->items())->map(fn (User $user) => $this->payload($user, $definitions))->all(),
                'meta' => [
                    'page' => $page->currentPage(),
                    'per_page' => $page->perPage(),
                    'total' => $page->total(),
                    'last_page' => $page->lastPage(),
                ],
                'summary' => $this->summary($definitions),
            ]);
        } finally {
            TenantContext::bypass(false);
        }
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatedUser($request, true);
        $assignments = $this->roleAssignments($data);

        $user = DB::transaction(function () use ($data, $assignments) {
            $user = User::query()->create([
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
                'password' => $data['password'],
                'status' => $data['status'] ?? 'active',
                'email_verified_at' => now(),
            ]);

            $this->createRoleAssignments($user, $assignments);

            return $user;
        });

        return response()->json([
            'data' => $this->payload($user->load('roles.tenant'), $this->roleDefinitions()),
        ], 201);
    }

    public function show(User $user): JsonResponse
    {
        TenantContext::bypass(true);

        try {
            $user->load(['roles.tenant:id,name,business_name', 'orders']);
            $data = $this->payload($user, $this->roleDefinitions());
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

        return response()->json([
            'data' => $this->payload($user->fresh('roles.tenant'), $this->roleDefinitions()),
        ]);
    }

    /** Replace the complete role set of a user (roles can be tenant scoped). */
    public function syncRoles(Request $request, User $user): JsonResponse
    {
        $data = $this->validatedUser($request, false, true);
        $assignments = $this->roleAssignments($data);

        if ($user->id === $request->user()->id
            && ! collect($assignments)->contains(fn (array $role) => $role['role'] === 'super_admin')) {
            abort(422, 'You cannot remove your own super admin role.');
        }

        DB::transaction(function () use ($user, $assignments) {
            $user->roles()->delete();
            $this->createRoleAssignments($user, $assignments);
        });

        return response()->json([
            'data' => $this->payload($user->fresh('roles.tenant'), $this->roleDefinitions()),
        ]);
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

    private function validatedUser(Request $request, bool $creating, bool $rolesOnly = false): array
    {
        $keys = $this->roleDefinitions()->keys()->all();
        $rules = [
            'role' => ['nullable', Rule::in($keys)], // Legacy single-role payloads remain supported.
            'tenant_id' => ['nullable', 'integer', 'exists:tenants,id'],
            'roles' => [$rolesOnly ? 'required' : 'nullable', 'array', 'min:1'],
            'roles.*.role' => ['required', Rule::in($keys)],
            'roles.*.tenant_id' => ['nullable', 'integer', 'exists:tenants,id'],
            'roles.*.store_id' => ['nullable', 'integer', 'exists:stores,id'],
            'roles.*.department' => ['nullable', 'string', 'max:32'],
        ];

        if (! $rolesOnly) {
            $rules['name'] = [$creating ? 'required' : 'sometimes', 'string', 'max:120'];
            $rules['email'] = [$creating ? 'required' : 'sometimes', 'email', 'max:190'];
            if ($creating) {
                $rules['email'][] = 'unique:users,email';
            }
            $rules['phone'] = ['nullable', 'string', 'max:32'];
            $rules['password'] = [$creating ? 'required' : 'nullable', 'string', 'min:8'];
            $rules['status'] = ['nullable', Rule::in(['active', 'suspended'])];
        }

        return $request->validate($rules);
    }

    /**
     * Normalize both the new multi-role payload and the original single-role
     * request. A user can hold the same role in more than one tenant.
     */
    private function roleAssignments(array $data): array
    {
        $roles = $data['roles'] ?? [];
        if (empty($roles) && ! empty($data['role'])) {
            $roles = [[
                'role' => $data['role'],
                'tenant_id' => $data['tenant_id'] ?? null,
                'store_id' => null,
                'department' => null,
            ]];
        }

        if (empty($roles)) {
            throw ValidationException::withMessages([
                'roles' => ['Select at least one role for this user.'],
            ]);
        }

        $assignments = [];
        $seen = [];
        foreach ($roles as $role) {
            $tenantId = ! empty($role['tenant_id']) ? (int) $role['tenant_id'] : null;
            $storeId = ! empty($role['store_id']) ? (int) $role['store_id'] : null;
            $this->guardTenantRole($role['role'], $tenantId);

            $signature = $role['role'].'|'.($tenantId ?? 'global');
            if (isset($seen[$signature])) {
                continue;
            }
            $seen[$signature] = true;
            $assignments[] = [
                'role' => $role['role'],
                'tenant_id' => $tenantId,
                'store_id' => $storeId,
                'department' => $role['department'] ?? null,
            ];
        }

        return $assignments;
    }

    private function createRoleAssignments(User $user, array $assignments): void
    {
        foreach ($assignments as $assignment) {
            UserRole::query()->create([
                'user_id' => $user->id,
                'role' => $assignment['role'],
                'tenant_id' => $assignment['tenant_id'],
                'store_id' => $assignment['store_id'],
                'department' => $assignment['department'],
            ]);
        }
    }

    private function guardTenantRole(string $role, ?int $tenantId): void
    {
        if (in_array($role, ['tenant_owner', 'store_staff'], true) && ! $tenantId) {
            abort(422, 'A tenant must be selected for the '.$role.' role.');
        }
    }

    private function payload(User $user, ?Collection $definitions = null): array
    {
        $definitions ??= $this->roleDefinitions();

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'status' => $user->status ?? 'active',
            'primary_role' => $user->primaryRole(),
            'last_login_at' => $user->last_login_at,
            'created_at' => $user->created_at,
            'roles' => $user->roles->map(function (UserRole $role) use ($definitions) {
                /** @var RoleDefinition|null $definition */
                $definition = $definitions->get($role->role);

                return [
                    'id' => $role->id,
                    'role' => $role->role,
                    'role_name' => $definition?->name ?? $this->label($role->role),
                    'permissions' => $definition?->permissions ?? [],
                    'tenant_id' => $role->tenant_id,
                    'store_id' => $role->store_id,
                    'department' => $role->department,
                    'tenant' => $role->tenant?->business_name ?: $role->tenant?->name,
                ];
            })->all(),
        ];
    }

    private function summary(Collection $definitions): array
    {
        $byRole = UserRole::query()
            ->selectRaw('role, COUNT(DISTINCT user_id) as total')
            ->groupBy('role')
            ->pluck('total', 'role');

        $keys = array_values(array_unique([
            ...$definitions->keys()->all(),
            ...$byRole->keys()->all(),
        ]));

        return [
            'total' => User::query()->count(),
            'active' => User::query()->where('status', 'active')->count(),
            'suspended' => User::query()->where('status', 'suspended')->count(),
            'by_role' => collect($keys)->mapWithKeys(fn ($key) => [$key => (int) ($byRole[$key] ?? 0)])->all(),
        ];
    }

    /** @return Collection<string, RoleDefinition> */
    private function roleDefinitions(): Collection
    {
        return RoleDefinition::query()->get()->keyBy('key');
    }

    private function label(string $role): string
    {
        return ucwords(str_replace('_', ' ', $role));
    }
}
