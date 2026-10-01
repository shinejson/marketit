<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RoleDefinition;
use App\Models\UserRole;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** Super-admin CRUD for reusable roles and their permissions. */
class AdminRoleController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => RoleDefinition::query()->orderByDesc('is_system')->orderBy('name')->get()->map(
                fn (RoleDefinition $role) => $this->payload($role)
            )->all(),
            'meta' => [
                'permission_groups' => RoleDefinition::permissionGroups(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request, true);

        $role = RoleDefinition::query()->create([
            'key' => $data['key'],
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'permissions' => $data['permissions'],
            'is_system' => false,
        ]);

        return response()->json(['data' => $this->payload($role)], 201);
    }

    public function update(Request $request, RoleDefinition $role): JsonResponse
    {
        $data = $this->validated($request, false);

        // A role key is an immutable identifier: user_roles uses it as its
        // reference and authorization still relies on the built-in keys.
        unset($data['key']);
        $role->update($data);

        return response()->json(['data' => $this->payload($role->fresh())]);
    }

    public function destroy(RoleDefinition $role): JsonResponse
    {
        $assigned = UserRole::query()->where('role', $role->key)->count();
        if ($assigned > 0) {
            throw ValidationException::withMessages([
                'role' => ["{$role->name} is assigned to {$assigned} user(s). Reassign those users before deleting the role."],
            ]);
        }

        $role->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    private function validated(Request $request, bool $creating): array
    {
        $rules = [
            'name' => [$creating ? 'required' : 'sometimes', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:1000'],
            'permissions' => [$creating ? 'required' : 'sometimes', 'array'],
            'permissions.*' => ['string', Rule::in(RoleDefinition::permissionKeys())],
        ];

        if ($creating) {
            $rules['key'] = ['required', 'string', 'max:50', 'regex:/^[a-z][a-z0-9_]*$/', Rule::unique('roles', 'key')];
        }

        $data = $request->validate($rules);

        if (array_key_exists('key', $data)) {
            $data['key'] = Str::lower($data['key']);
        }
        if (array_key_exists('permissions', $data)) {
            $data['permissions'] = array_values(array_unique($data['permissions']));
        }

        return $data;
    }

    private function payload(RoleDefinition $role): array
    {
        return [
            'id' => $role->id,
            'key' => $role->key,
            'name' => $role->name,
            'description' => $role->description,
            'permissions' => $role->permissions ?? [],
            'is_system' => $role->is_system,
            'users_count' => UserRole::query()->where('role', $role->key)->count(),
            'created_at' => $role->created_at,
            'updated_at' => $role->updated_at,
        ];
    }
}
