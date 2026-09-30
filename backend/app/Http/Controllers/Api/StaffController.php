<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\TenantSetting;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class StaffController extends Controller
{
    public const STAFF_ROLES = ['tenant_owner', 'store_staff'];

    public function index(Request $request): JsonResponse
    {
        $this->assertOwner($request);
        $tenantId = $request->user()->tenantId();

        $roles = UserRole::query()
            ->with(['user', 'store'])
            ->where('tenant_id', $tenantId)
            ->whereIn('role', self::STAFF_ROLES)
            ->orderBy('id')
            ->get();

        return response()->json([
            'data' => $roles->map(fn (UserRole $role) => $this->payload($role))->all(),
            'meta' => [
                'departments' => TenantSetting::DEPARTMENTS,
                'roles' => self::STAFF_ROLES,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->assertOwner($request);
        $tenantId = (int) $request->user()->tenantId();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['nullable', 'string', 'min:8'],
            'role' => ['required', Rule::in(self::STAFF_ROLES)],
            'department' => ['nullable', Rule::in(TenantSetting::DEPARTMENTS)],
            'store_id' => ['nullable', 'integer'],
        ]);

        if (! empty($data['store_id'])) {
            $store = Store::query()->where('tenant_id', $tenantId)->find($data['store_id']);
            if (! $store) {
                throw ValidationException::withMessages(['store_id' => 'Store not found for this tenant.']);
            }
        }

        $user = User::query()->where('email', $data['email'])->first();
        $generated = null;
        if (! $user) {
            $generated = $data['password'] ?? Str::password(12);
            $user = User::query()->create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $generated,
            ]);
        } else {
            $user->update(['name' => $data['name']]);
        }

        $role = UserRole::query()->updateOrCreate(
            [
                'user_id' => $user->id,
                'role' => $data['role'],
                'tenant_id' => $tenantId,
            ],
            [
                'department' => $data['department'] ?? null,
                'store_id' => $data['store_id'] ?? null,
            ]
        );

        return response()->json([
            'data' => $this->payload($role->load(['user', 'store'])),
            'meta' => [
                'temporary_password' => $generated,
            ],
        ], 201);
    }

    public function update(Request $request, UserRole $staff): JsonResponse
    {
        $this->assertOwner($request);
        $this->assertSameTenant($request, $staff);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'role' => ['sometimes', Rule::in(self::STAFF_ROLES)],
            'department' => ['nullable', Rule::in(TenantSetting::DEPARTMENTS)],
            'store_id' => ['nullable', 'integer'],
        ]);

        if (array_key_exists('store_id', $data) && $data['store_id']) {
            $ok = Store::query()->where('tenant_id', $staff->tenant_id)->whereKey($data['store_id'])->exists();
            if (! $ok) {
                throw ValidationException::withMessages(['store_id' => 'Store not found for this tenant.']);
            }
        }

        if (! empty($data['name'])) {
            $staff->user?->update(['name' => $data['name']]);
        }

        $staff->update(collect($data)->only(['role', 'department', 'store_id'])->all());

        return response()->json(['data' => $this->payload($staff->fresh(['user', 'store']))]);
    }

    public function destroy(Request $request, UserRole $staff): JsonResponse
    {
        $this->assertOwner($request);
        $this->assertSameTenant($request, $staff);

        if ((int) $staff->user_id === (int) $request->user()->id) {
            throw ValidationException::withMessages(['staff' => 'You cannot remove your own access.']);
        }

        $staff->delete();

        return response()->json(['data' => ['ok' => true]]);
    }

    protected function payload(UserRole $role): array
    {
        return [
            'id' => $role->id,
            'user_id' => $role->user_id,
            'name' => $role->user?->name,
            'email' => $role->user?->email,
            'role' => $role->role,
            'department' => $role->department,
            'store_id' => $role->store_id,
            'store' => $role->store ? ['id' => $role->store->id, 'name' => $role->store->name] : null,
            'created_at' => $role->created_at?->toIso8601String(),
        ];
    }

    protected function assertOwner(Request $request): void
    {
        abort_unless($request->user()?->isTenantOwner(), 403, 'Only the tenant owner can manage staff.');
    }

    protected function assertSameTenant(Request $request, UserRole $staff): void
    {
        abort_unless((int) $staff->tenant_id === (int) $request->user()->tenantId(), 404);
        abort_unless(in_array($staff->role, self::STAFF_ROLES, true), 404);
    }
}
