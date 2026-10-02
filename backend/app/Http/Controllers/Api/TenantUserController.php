<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\TenantRole;
use App\Models\TenantSetting;
use App\Models\User;
use App\Models\UserRole;
use App\Support\TenantAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * System users — the people who sign into this tenant's console.
 *
 * Two orthogonal things are assigned here:
 *   - an access level (`tenant_owner` | `store_staff`) which decides portal
 *     entry and is what the routing middleware understands, and
 *   - a tenant role, which carries the permission checkboxes. A role can be
 *     overridden per user when someone needs one extra capability.
 *
 * Everything is scoped to the caller's tenant; the controller never trusts a
 * tenant id from the request.
 */
class TenantUserController extends Controller
{
    /** Access levels a tenant admin may hand out. */
    public const ACCESS_LEVELS = TenantAccess::ACCESS_LEVELS;

    // --------------------------------------------------------------- reading

    public function index(Request $request): JsonResponse
    {
        $this->authorizeAccess($request, 'team.view');
        $tenantId = (int) $request->user()->tenantId();

        $query = UserRole::query()
            ->with(['user', 'store', 'tenantRole'])
            ->where('tenant_id', $tenantId)
            ->whereIn('role', self::ACCESS_LEVELS);

        if ($search = trim((string) $request->string('search'))) {
            $query->whereHas('user', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        if ($role = $request->string('role')->toString()) {
            $query->whereHas('tenantRole', fn ($q) => $q->where('key', $role));
        }

        if ($department = $request->string('department')->toString()) {
            $query->where('department', $department);
        }

        if ($storeId = $request->integer('store_id')) {
            $query->where('store_id', $storeId);
        }

        $assignments = $query->orderByRaw("case when role = 'tenant_owner' then 0 else 1 end")
            ->orderBy('id')
            ->get();

        $all = UserRole::query()
            ->where('tenant_id', $tenantId)
            ->whereIn('role', self::ACCESS_LEVELS)
            ->get(['status', 'role', 'tenant_role_id', 'permissions']);

        return response()->json([
            'data' => $assignments->map(fn (UserRole $assignment) => $this->payload($assignment))->all(),
            'stats' => [
                'total' => $all->count(),
                'active' => $all->where('status', TenantAccess::STATUS_ACTIVE)->count(),
                'invited' => $all->where('status', TenantAccess::STATUS_INVITED)->count(),
                'suspended' => $all->where('status', TenantAccess::STATUS_SUSPENDED)->count(),
                'owners' => $all->where('role', 'tenant_owner')->count(),
                'customised' => $all->filter(fn ($row) => is_array($row->permissions))->count(),
            ],
            'meta' => [
                'departments' => TenantSetting::DEPARTMENTS,
                'roles' => self::ACCESS_LEVELS,
                'access_levels' => $this->accessLevels(),
                'statuses' => TenantAccess::STATUSES,
                'tenant_roles' => $this->rolesPayload($tenantId),
                'permission_groups' => TenantRole::permissionGroups(),
                'stores' => Store::query()->where('tenant_id', $tenantId)->orderBy('name')->get(['id', 'name']),
                'can_manage' => $request->user()->hasTenantPermission('team.manage', $tenantId),
            ],
        ]);
    }

    // --------------------------------------------------------------- writing

    public function store(Request $request): JsonResponse
    {
        $this->authorizeAccess($request, 'team.manage');
        $tenantId = (int) $request->user()->tenantId();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:32'],
            'title' => ['nullable', 'string', 'max:100'],
            'password' => ['nullable', 'string', 'min:8'],
            'role' => ['required', Rule::in(self::ACCESS_LEVELS)],
            'tenant_role_id' => ['nullable', 'integer'],
            'tenant_role' => ['nullable', 'string', 'max:50'],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', Rule::in(TenantRole::permissionKeys())],
            'department' => ['nullable', Rule::in(TenantSetting::DEPARTMENTS)],
            'store_id' => ['nullable', 'integer'],
            'status' => ['nullable', Rule::in(TenantAccess::STATUSES)],
        ]);

        $this->assertStoreBelongsToTenant($data['store_id'] ?? null, $tenantId);
        $role = $this->resolveTenantRole($tenantId, $data, $data['role']);

        $user = User::query()->where('email', $data['email'])->first();
        $generated = null;

        if (! $user) {
            $generated = $data['password'] ?? Str::password(12);
            $user = User::query()->create([
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
                'password' => $generated,
            ]);
        } else {
            $user->update(array_filter([
                'name' => $data['name'],
                'phone' => $data['phone'] ?? null,
            ], fn ($value) => $value !== null));

            $existing = UserRole::query()
                ->where('user_id', $user->id)
                ->whereIn('role', self::ACCESS_LEVELS)
                ->where('tenant_id', '!=', $tenantId)
                ->exists();

            if ($existing) {
                throw ValidationException::withMessages([
                    'email' => 'This account already works for another tenant.',
                ]);
            }
        }

        $status = $data['status'] ?? ($generated ? TenantAccess::STATUS_INVITED : TenantAccess::STATUS_ACTIVE);

        $assignment = UserRole::query()->updateOrCreate(
            ['user_id' => $user->id, 'role' => $data['role'], 'tenant_id' => $tenantId],
            [
                'department' => $data['department'] ?? $role?->department,
                'store_id' => $data['store_id'] ?? null,
                'tenant_role_id' => $role?->id,
                'permissions' => $this->overridesFor($data, $role),
                'title' => $data['title'] ?? null,
                'status' => $status,
                'invited_at' => now(),
            ]
        );

        return response()->json([
            'data' => $this->payload($assignment->load(['user', 'store', 'tenantRole'])),
            'meta' => ['temporary_password' => $generated],
        ], 201);
    }

    public function update(Request $request, UserRole $staff): JsonResponse
    {
        $this->authorizeAccess($request, 'team.manage');
        $this->assertSameTenant($request, $staff);
        $tenantId = (int) $staff->tenant_id;

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:32'],
            'title' => ['sometimes', 'nullable', 'string', 'max:100'],
            'role' => ['sometimes', Rule::in(self::ACCESS_LEVELS)],
            'tenant_role_id' => ['sometimes', 'nullable', 'integer'],
            'tenant_role' => ['sometimes', 'nullable', 'string', 'max:50'],
            'permissions' => ['sometimes', 'nullable', 'array'],
            'permissions.*' => ['string', Rule::in(TenantRole::permissionKeys())],
            'department' => ['sometimes', 'nullable', Rule::in(TenantSetting::DEPARTMENTS)],
            'store_id' => ['sometimes', 'nullable', 'integer'],
            'status' => ['sometimes', Rule::in(TenantAccess::STATUSES)],
        ]);

        if (array_key_exists('store_id', $data)) {
            $this->assertStoreBelongsToTenant($data['store_id'], $tenantId);
        }

        $isSelf = (int) $staff->user_id === (int) $request->user()->id;
        if ($isSelf && (($data['status'] ?? null) === TenantAccess::STATUS_SUSPENDED)) {
            throw ValidationException::withMessages(['status' => 'You cannot suspend your own access.']);
        }

        if ($staff->role === 'tenant_owner' && ($data['role'] ?? 'tenant_owner') !== 'tenant_owner') {
            $this->assertNotLastOwner($staff);
        }

        if (! empty($data['name']) || array_key_exists('phone', $data)) {
            $staff->user?->update(array_filter([
                'name' => $data['name'] ?? null,
                'phone' => $data['phone'] ?? null,
            ], fn ($value) => $value !== null));
        }

        $attributes = collect($data)->only(['role', 'department', 'store_id', 'status', 'title'])->all();

        if (array_key_exists('tenant_role_id', $data) || array_key_exists('tenant_role', $data)) {
            $role = $this->resolveTenantRole($tenantId, $data, $data['role'] ?? $staff->role);
            $attributes['tenant_role_id'] = $role?->id;
            if (! array_key_exists('department', $attributes) && $role?->department) {
                $attributes['department'] = $role->department;
            }
            // Switching role resets per-user overrides unless the same request
            // also sends an explicit permission list.
            $attributes['permissions'] = array_key_exists('permissions', $data)
                ? $this->overridesFor($data, $role)
                : null;
        } elseif (array_key_exists('permissions', $data)) {
            $role = $staff->tenantRole;
            $attributes['permissions'] = $this->overridesFor($data, $role);
        }

        $staff->update($attributes);

        return response()->json(['data' => $this->payload($staff->fresh(['user', 'store', 'tenantRole']))]);
    }

    public function destroy(Request $request, UserRole $staff): JsonResponse
    {
        $this->authorizeAccess($request, 'team.manage');
        $this->assertSameTenant($request, $staff);

        if ((int) $staff->user_id === (int) $request->user()->id) {
            throw ValidationException::withMessages(['staff' => 'You cannot remove your own access.']);
        }

        if ($staff->role === 'tenant_owner') {
            $this->assertNotLastOwner($staff);
        }

        $staff->delete();

        return response()->json(['data' => ['ok' => true]]);
    }

    /** Issue a fresh temporary password for a staff account. */
    public function resetPassword(Request $request, UserRole $staff): JsonResponse
    {
        $this->authorizeAccess($request, 'team.manage');
        $this->assertSameTenant($request, $staff);

        $password = Str::password(12);
        $staff->user?->update(['password' => $password]);
        $staff->user?->tokens()->delete();

        return response()->json(['data' => ['ok' => true], 'meta' => ['temporary_password' => $password]]);
    }

    // --------------------------------------------------------------- helpers

    protected function accessLevels(): array
    {
        return [
            [
                'key' => 'tenant_owner',
                'label' => 'Owner',
                'description' => 'Unrestricted access, including access control and billing. Permissions cannot be narrowed.',
            ],
            [
                'key' => 'store_staff',
                'label' => 'Staff',
                'description' => 'Signs into the console with exactly the permissions ticked below.',
            ],
        ];
    }

    protected function rolesPayload(int $tenantId): array
    {
        TenantRole::seedDefaultsFor($tenantId);

        return TenantRole::query()
            ->withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->withCount('assignments')
            ->orderByDesc('is_system')
            ->orderBy('name')
            ->get()
            ->map(fn (TenantRole $role) => [
                'id' => $role->id,
                'key' => $role->key,
                'name' => $role->name,
                'description' => $role->description,
                'department' => $role->department,
                'permissions' => $role->permissions ?? [],
                'is_system' => $role->is_system,
                'users_count' => $role->assignments_count,
            ])->all();
    }

    /** Resolve the tenant role from an id or key, falling back to a sane default. */
    protected function resolveTenantRole(int $tenantId, array $data, string $accessLevel): ?TenantRole
    {
        TenantRole::seedDefaultsFor($tenantId);

        $query = TenantRole::query()->withoutGlobalScopes()->where('tenant_id', $tenantId);

        if (! empty($data['tenant_role_id'])) {
            $role = (clone $query)->whereKey($data['tenant_role_id'])->first();
            if (! $role) {
                throw ValidationException::withMessages(['tenant_role_id' => 'Role not found for this tenant.']);
            }

            return $role;
        }

        if (! empty($data['tenant_role'])) {
            $role = (clone $query)->where('key', $data['tenant_role'])->first();
            if (! $role) {
                throw ValidationException::withMessages(['tenant_role' => 'Role not found for this tenant.']);
            }

            return $role;
        }

        $fallback = $accessLevel === 'tenant_owner' ? TenantRole::KEY_OWNER : 'store_staff';

        return (clone $query)->where('key', $fallback)->first();
    }

    /**
     * An override list is only stored when it actually differs from the role,
     * which keeps "inherits <role>" meaningful in the UI.
     */
    protected function overridesFor(array $data, ?TenantRole $role): ?array
    {
        if (! array_key_exists('permissions', $data) || $data['permissions'] === null) {
            return null;
        }

        $requested = TenantAccess::sanitize($data['permissions']);
        $inherited = TenantAccess::sanitize($role?->permissions ?? []);

        sort($requested);
        sort($inherited);

        return $requested === $inherited ? null : $requested;
    }

    protected function payload(UserRole $assignment): array
    {
        $user = $assignment->user;
        $role = $assignment->tenantRole;

        return [
            'id' => $assignment->id,
            'user_id' => $assignment->user_id,
            'name' => $user?->name,
            'email' => $user?->email,
            'phone' => $user?->phone,
            'avatar_url' => $user?->avatar_url,
            'title' => $assignment->title,
            'role' => $assignment->role,
            'access_level' => $assignment->role,
            'status' => $assignment->status ?? TenantAccess::STATUS_ACTIVE,
            'department' => $assignment->department,
            'store_id' => $assignment->store_id,
            'store' => $assignment->store ? ['id' => $assignment->store->id, 'name' => $assignment->store->name] : null,
            'tenant_role_id' => $assignment->tenant_role_id,
            'tenant_role' => $role ? [
                'id' => $role->id,
                'key' => $role->key,
                'name' => $role->name,
                'department' => $role->department,
                'permissions' => $role->permissions ?? [],
            ] : null,
            'permissions' => $assignment->effectivePermissions(),
            'custom_permissions' => $assignment->hasCustomPermissions(),
            'is_owner' => $assignment->role === 'tenant_owner',
            'last_login_at' => $user?->last_login_at?->toIso8601String(),
            'invited_at' => $assignment->invited_at?->toIso8601String(),
            'created_at' => $assignment->created_at?->toIso8601String(),
        ];
    }

    protected function assertStoreBelongsToTenant(?int $storeId, int $tenantId): void
    {
        if (! $storeId) {
            return;
        }

        $exists = Store::query()->where('tenant_id', $tenantId)->whereKey($storeId)->exists();
        if (! $exists) {
            throw ValidationException::withMessages(['store_id' => 'Store not found for this tenant.']);
        }
    }

    protected function assertNotLastOwner(UserRole $staff): void
    {
        $owners = UserRole::query()
            ->where('tenant_id', $staff->tenant_id)
            ->where('role', 'tenant_owner')
            ->count();

        if ($owners <= 1) {
            throw ValidationException::withMessages([
                'role' => 'A tenant must keep at least one owner. Promote someone else first.',
            ]);
        }
    }

    protected function authorizeAccess(Request $request, string $permission): void
    {
        $user = $request->user();
        abort_unless(
            $user?->isTenantOwner() || $user?->hasTenantPermission($permission),
            403,
            'You do not have permission to manage system users.'
        );
    }

    protected function assertSameTenant(Request $request, UserRole $staff): void
    {
        abort_unless((int) $staff->tenant_id === (int) $request->user()->tenantId(), 404);
        abort_unless(in_array($staff->role, self::ACCESS_LEVELS, true), 404);
    }
}
