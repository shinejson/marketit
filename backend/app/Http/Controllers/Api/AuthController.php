<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlatformSetting;
use App\Models\SocialIdentity;
use App\Models\Tenant;
use App\Models\User;
use App\Models\UserRole;
use App\Services\Domains\DomainService;
use App\Support\ActivityLogger;
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

        $token = $this->issueToken($user, 'marketplace');
        $user->forceFill(['last_login_at' => now(), 'last_seen_at' => now()])->saveQuietly();
        $user->load('roles', 'socialIdentities');
        ActivityLogger::record('auth.registered', [
            'subject_type' => User::class,
            'subject_id' => $user->id,
            'after' => ['portal' => 'marketplace', 'user_agent' => $request->userAgent()],
        ], $user);

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

        $user->load('roles', 'socialIdentities');
        $this->assertPortalAccess($request, $domains, $user, $data['portal'] ?? 'marketplace');

        $token = $this->issueToken($user, $data['portal'] ?? 'marketplace');
        $user->forceFill(['last_login_at' => now(), 'last_seen_at' => now()])->saveQuietly();
        ActivityLogger::record('auth.login', [
            'subject_type' => User::class,
            'subject_id' => $user->id,
            'after' => ['portal' => $data['portal'] ?? 'marketplace', 'user_agent' => $request->userAgent()],
        ], $user);

        return response()->json([
            'data' => [
                'token' => $token,
                'user' => $this->userPayload($user),
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->validate(['all_sessions' => ['sometimes', 'boolean']]);
        $user = $request->user();
        if ($request->boolean('all_sessions')) {
            $user->tokens()->delete();
        } else {
            $user->currentAccessToken()?->delete();
        }

        ActivityLogger::record('auth.logout', [
            'subject_type' => User::class,
            'subject_id' => $user->id,
            'after' => ['all_sessions' => $request->boolean('all_sessions')],
        ], $user);

        return response()->json(['data' => ['ok' => true]]);
    }

    /** Active bearer sessions without exposing token hashes or plain tokens. */
    public function sessions(Request $request): JsonResponse
    {
        $current = $request->user()->currentAccessToken()?->id;
        $sessions = $request->user()->tokens()
            ->latest('last_used_at')
            ->latest('created_at')
            ->get()
            ->map(fn ($token) => [
                'id' => $token->id,
                'name' => str_starts_with((string) $token->name, 'web:') ? str_replace('web:', '', (string) $token->name) : $token->name,
                'current' => (int) $token->id === (int) $current,
                'created_at' => $token->created_at,
                'last_used_at' => $token->last_used_at,
                'expires_at' => $token->expires_at,
            ])->values();

        return response()->json(['data' => $sessions]);
    }

    public function revokeSession(Request $request, int $token): JsonResponse
    {
        $deleted = $request->user()->tokens()->whereKey($token)->delete();

        return response()->json(['data' => ['revoked' => $deleted > 0]]);
    }

    public function revokeOtherSessions(Request $request): JsonResponse
    {
        $current = $request->user()->currentAccessToken()?->id;
        $query = $request->user()->tokens();
        if ($current) {
            $query->where($request->user()->tokens()->getModel()->getKeyName(), '!=', $current);
        }
        $deleted = $query->delete();

        return response()->json(['data' => ['revoked' => $deleted]]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('roles', 'socialIdentities');

        return response()->json(['data' => $this->userPayload($user)]);
    }

    protected function issueToken(User $user, string $portal): string
    {
        $minutes = (int) PlatformSetting::get('session_timeout_minutes', 120);
        $minutes = max(15, min(43200, $minutes));

        return $user->createToken('web:'.$portal, ['*'], now()->addMinutes($minutes))->plainTextToken;
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

        if ($user->tenantAccessSuspended()) {
            throw ValidationException::withMessages([
                'email' => 'Your access to this workspace has been suspended by an administrator.',
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
            'avatar_url' => $user->avatar_url,
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
            // What this person may do inside the tenant console. Empty for
            // customers and platform admins.
            'permissions' => $tenant ? $user->tenantPermissions($tenant->id) : [],
            'social_accounts' => $user->relationLoaded('socialIdentities')
                ? $user->socialIdentities->map(fn (SocialIdentity $identity) => [
                    'provider' => $identity->provider,
                    'label' => SocialIdentity::label($identity->provider),
                ])->all()
                : [],
        ];
    }

    protected function tenantForUser(User $user): ?Tenant
    {
        $tenantId = $user->tenantId();

        return $tenantId ? Tenant::query()->find($tenantId) : null;
    }
}
