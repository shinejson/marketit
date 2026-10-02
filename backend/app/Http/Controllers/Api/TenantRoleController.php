<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TenantRole;
use App\Models\TenantSetting;
use App\Models\UserRole;
use App\Support\TenantAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Tenant-owned roles: the permission checkboxes an admin assigns to staff.
 *
 * Built-in roles ship with every tenant and may be re-tuned, but not deleted
 * or re-keyed; the owner role is immutable because it must always mean "all
 * permissions".
 */
class TenantRoleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = $this->tenantId($request, 'team.view');
        TenantRole::seedDefaultsFor($tenantId);

        return response()->json([
            'data' => $this->roles($tenantId),
            'meta' => [
                'permission_groups' => TenantRole::permissionGroups(),
                'departments' => TenantSetting::DEPARTMENTS,
                'can_manage' => $request->user()->isTenantOwner()
                    || $request->user()->hasTenantPermission('roles.manage', $tenantId),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = $this->tenantId($request, 'roles.manage');
        $data = $this->validated($request, true);

        $key = $data['key'] ?? Str::slug($data['name'], '_');
        $key = Str::of($key)->lower()->replace('-', '_')->toString();

        if (TenantRole::query()->withoutGlobalScopes()->where('tenant_id', $tenantId)->where('key', $key)->exists()) {
            throw ValidationException::withMessages(['key' => 'A role with this key already exists.']);
        }

        $role = TenantRole::query()->create([
            'tenant_id' => $tenantId,
            'key' => $key,
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'department' => $data['department'] ?? null,
            'permissions' => TenantAccess::sanitize($data['permissions'] ?? []),
            'is_system' => false,
        ]);

        return response()->json(['data' => $this->payload($role->loadCount('assignments'))], 201);
    }

    public function update(Request $request, TenantRole $role): JsonResponse
    {
        $tenantId = $this->tenantId($request, 'roles.manage');
        $this->assertSameTenant($role, $tenantId);

        if ($role->key === TenantRole::KEY_OWNER) {
            throw ValidationException::withMessages([
                'role' => 'The owner role always holds every permission and cannot be edited.',
            ]);
        }

        $data = $this->validated($request, false);
        // The key is an immutable identifier that assignments and defaults rely on.
        unset($data['key']);

        if (array_key_exists('permissions', $data)) {
            $data['permissions'] = TenantAccess::sanitize($data['permissions'] ?? []);
        }

        $role->update($data);

        return response()->json(['data' => $this->payload($role->fresh()->loadCount('assignments'))]);
    }

    public function destroy(Request $request, TenantRole $role): JsonResponse
    {
        $tenantId = $this->tenantId($request, 'roles.manage');
        $this->assertSameTenant($role, $tenantId);

        if ($role->is_system) {
            throw ValidationException::withMessages([
                'role' => 'Built-in roles cannot be deleted. Edit its permissions instead.',
            ]);
        }

        $assigned = UserRole::query()->where('tenant_role_id', $role->id)->count();
        if ($assigned > 0) {
            throw ValidationException::withMessages([
                'role' => "{$role->name} is assigned to {$assigned} user(s). Move them to another role first.",
            ]);
        }

        $role->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    // --------------------------------------------------------------- helpers

    protected function roles(int $tenantId): array
    {
        return TenantRole::query()
            ->withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->withCount('assignments')
            ->orderByDesc('is_system')
            ->orderBy('name')
            ->get()
            ->map(fn (TenantRole $role) => $this->payload($role))
            ->all();
    }

    protected function payload(TenantRole $role): array
    {
        return [
            'id' => $role->id,
            'key' => $role->key,
            'name' => $role->name,
            'description' => $role->description,
            'department' => $role->department,
            'permissions' => $role->permissions ?? [],
            'is_system' => $role->is_system,
            'is_owner_role' => $role->key === TenantRole::KEY_OWNER,
            'users_count' => $role->assignments_count ?? 0,
            'updated_at' => $role->updated_at?->toIso8601String(),
        ];
    }

    protected function validated(Request $request, bool $creating): array
    {
        return $request->validate([
            'key' => [$creating ? 'nullable' : 'prohibited', 'string', 'max:50', 'regex:/^[a-z][a-z0-9_]*$/'],
            'name' => [$creating ? 'required' : 'sometimes', 'string', 'max:100'],
            'description' => ['sometimes', 'nullable', 'string', 'max:500'],
            'department' => ['sometimes', 'nullable', Rule::in(TenantSetting::DEPARTMENTS)],
            'permissions' => [$creating ? 'required' : 'sometimes', 'array'],
            'permissions.*' => ['string', Rule::in(TenantRole::permissionKeys())],
        ]);
    }

    protected function tenantId(Request $request, string $permission): int
    {
        $user = $request->user();
        $tenantId = (int) $user->tenantId();
        abort_unless($tenantId, 404, 'No tenant associated.');
        abort_unless(
            $user->isTenantOwner() || $user->hasTenantPermission($permission, $tenantId),
            403,
            'You do not have permission to manage roles.'
        );

        return $tenantId;
    }

    protected function assertSameTenant(TenantRole $role, int $tenantId): void
    {
        abort_unless((int) $role->tenant_id === $tenantId, 404);
    }
}
