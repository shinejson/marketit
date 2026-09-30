<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use App\Models\UserRole;
use App\Services\Domains\DomainService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', Password::min(8)],
            'phone' => ['nullable', 'string', 'max:32'],
        ]);

        $user = User::query()->create($data);
        UserRole::query()->create([
            'user_id' => $user->id,
            'role' => 'customer',
            'tenant_id' => null,
        ]);

        if ($user->isSuspended()) {
            throw ValidationException::withMessages([
                'email' => 'This account has been suspended. Contact support.',
            ]);
        }

        $token = $user->createToken('web')->plainTextToken;
        $user->forceFill(['last_login_at' => now()])->saveQuietly();
        $user->load('roles');

        return response()->json([
            'data' => [
                'token' => $token,
                'user' => $this->userPayload($user),
            ],
        ], 201);
    }

    public function login(Request $request, DomainService $domains): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'portal' => ['nullable', Rule::in(['marketplace', 'tenant', 'admin'])],
        ]);

        $user = User::query()->where('email', $data['email'])->first();
        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => 'Invalid credentials.',
            ]);
        }

        if ($user->isSuspended()) {
            throw ValidationException::withMessages([
                'email' => 'This account has been suspended. Contact support.',
            ]);
        }

        $user->load('roles');
        $this->assertPortalAccess($request, $domains, $user, $data['portal'] ?? 'marketplace');

        $token = $user->createToken('web')->plainTextToken;
        $user->forceFill(['last_login_at' => now()])->saveQuietly();

        return response()->json([
            'data' => [
                'token' => $token,
                'user' => $this->userPayload($user),
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['data' => ['ok' => true]]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('roles');

        return response()->json(['data' => $this->userPayload($user)]);
    }

    protected function assertPortalAccess(Request $request, DomainService $domains, User $user, string $portal): void
    {
        if ($portal === 'admin') {
            if (! $user->isSuperAdmin()) {
                throw ValidationException::withMessages([
                    'email' => 'This login is only for super admins. Use the tenant or marketplace login for this account.',
                ]);
            }

            return;
        }

        if ($portal !== 'tenant') {
            return;
        }

        if (! ($user->isTenantOwner() || $user->isStoreStaff())) {
            throw ValidationException::withMessages([
                'email' => 'This login is only for tenant owners and store staff. Apply to sell before opening the tenant dashboard.',
            ]);
        }

        $tenant = $this->tenantForUser($user);
        if (! $tenant) {
            throw ValidationException::withMessages([
                'email' => 'No tenant is attached to this account yet.',
            ]);
        }

        if (in_array($tenant->status, [Tenant::STATUS_REJECTED, Tenant::STATUS_SUSPENDED], true)) {
            throw ValidationException::withMessages([
                'email' => 'This tenant cannot access the dashboard right now. Check the seller application for details.',
            ]);
        }

        $hostTenant = $domains->resolveHostToTenant($request->getHost());
        if ($hostTenant && ! ($user->isTenantOwner($hostTenant->id) || $user->isStoreStaff($hostTenant->id))) {
            throw ValidationException::withMessages([
                'email' => 'This account is not attached to the tenant for this subdomain.',
            ]);
        }
    }

    protected function userPayload(User $user): array
    {
        $tenant = $this->tenantForUser($user);

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'role' => $user->primaryRole(),
            'tenant_id' => $tenant?->id,
            'tenant_slug' => $tenant?->slug,
            'tenant_name' => $tenant?->name,
            'tenant_status' => $tenant?->status,
            'department' => $user->roles->first(fn ($r) => in_array($r->role, ['tenant_owner', 'store_staff'], true))?->department,
            'roles' => $user->roles->map(fn ($r) => [
                'role' => $r->role,
                'tenant_id' => $r->tenant_id,
                'store_id' => $r->store_id,
                'department' => $r->department,
            ])->all(),
        ];
    }

    protected function tenantForUser(User $user): ?Tenant
    {
        $tenantId = $user->tenantId();

        return $tenantId ? Tenant::query()->find($tenantId) : null;
    }
}
