<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlatformSetting;
use App\Models\SocialIdentity;
use App\Models\User;
use App\Models\UserRole;
use App\Services\Social\SocialProviderManager;
use App\Services\Social\SocialUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;

/**
 * Social login for marketplace customers (Google, Facebook, Apple, GitHub).
 *
 * The SPA owns the browser redirect, so the flow is:
 *
 *   1. POST /api/auth/social/{provider}/redirect  → { url, state }
 *      The state is stored server-side (cache, 10 minutes) bound to the
 *      provider and redirect URI; it is the CSRF defence for the callback.
 *   2. The browser visits the provider and comes back to the SPA callback
 *      route with ?code&state.
 *   3. POST /api/auth/social/{provider}/callback  → { token, user }
 *      The code is exchanged server-side (the client secret never leaves the
 *      API), the identity is linked or created, and a Sanctum token is issued.
 *
 * Social sign-in only ever produces *customer* accounts. Console access stays
 * behind the tenant and admin logins, which require an explicit role.
 */
class SocialAuthController extends Controller
{
    protected const STATE_TTL = 600; // seconds
    protected const STATE_PREFIX = 'social_login_state:';

    public function __construct(protected SocialProviderManager $providers)
    {
    }

    /** Which buttons the login and register screens should render. */
    public function index(): JsonResponse
    {
        return response()->json(['data' => $this->providers->catalog()]);
    }

    public function redirect(Request $request, string $provider): JsonResponse
    {
        $this->assertProvider($provider);

        $data = $request->validate([
            'redirect_uri' => ['required', 'url', 'max:500'],
            'intent' => ['nullable', 'in:login,register,link'],
        ]);

        $state = Str::random(40);

        Cache::put(self::STATE_PREFIX.$state, [
            'provider' => $provider,
            'redirect_uri' => $data['redirect_uri'],
            'intent' => $data['intent'] ?? 'login',
            'user_id' => $request->user()?->id,
        ], self::STATE_TTL);

        try {
            $authorize = $this->providers->authorizeUrl($provider, $data['redirect_uri'], $state);
        } catch (RuntimeException $e) {
            throw ValidationException::withMessages(['provider' => $e->getMessage()]);
        }

        return response()->json([
            'data' => [
                'provider' => $provider,
                'state' => $state,
                'mode' => $authorize['mode'],
                'url' => $authorize['url'],
                'expires_in' => self::STATE_TTL,
            ],
        ]);
    }

    public function callback(Request $request, string $provider): JsonResponse
    {
        $this->assertProvider($provider);

        $data = $request->validate([
            'code' => ['required', 'string', 'max:2000'],
            'state' => ['required', 'string', 'max:100'],
        ]);

        $stored = Cache::pull(self::STATE_PREFIX.$data['state']);
        if (! $stored || $stored['provider'] !== $provider) {
            throw ValidationException::withMessages([
                'state' => 'This sign-in attempt expired or was already used. Please try again.',
            ]);
        }

        try {
            $profile = $this->providers->profile($provider, $data['code'], $stored['redirect_uri']);
        } catch (RuntimeException $e) {
            throw ValidationException::withMessages(['provider' => $e->getMessage()]);
        }

        if ($profile->id === '') {
            throw ValidationException::withMessages(['provider' => 'The sign-in provider did not return an account id.']);
        }

        [$user, $created] = $this->resolveUser($provider, $profile);

        if ($user->isSuspended()) {
            throw ValidationException::withMessages([
                'email' => 'This account has been suspended. Contact support.',
            ]);
        }

        $user->forceFill(['last_login_at' => now()])->saveQuietly();
        $user->load('roles', 'socialIdentities');

        return response()->json([
            'data' => [
                'token' => $this->issueToken($user),
                'user' => $this->userPayload($user),
            ],
            'meta' => [
                'provider' => $provider,
                'created' => $created,
                'demo' => $profile->demo,
            ],
        ], $created ? 201 : 200);
    }

    /** Providers linked to the signed-in account. */
    public function identities(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $request->user()->socialIdentities()->orderBy('provider')->get()
                ->map(fn (SocialIdentity $identity) => [
                    'id' => $identity->id,
                    'provider' => $identity->provider,
                    'label' => SocialIdentity::label($identity->provider),
                    'email' => $identity->email,
                    'nickname' => $identity->nickname,
                    'avatar_url' => $identity->avatar_url,
                    'last_login_at' => $identity->last_login_at?->toIso8601String(),
                ])->all(),
            'meta' => ['has_password' => (bool) $request->user()->password],
        ]);
    }

    /** Unlink a provider — never the last way in to the account. */
    public function unlink(Request $request, SocialIdentity $identity): JsonResponse
    {
        abort_unless((int) $identity->user_id === (int) $request->user()->id, 404);

        $remaining = $request->user()->socialIdentities()->count() - 1;
        if ($remaining < 1 && ! $request->user()->password) {
            throw ValidationException::withMessages([
                'provider' => 'Set a password before removing your last sign-in method.',
            ]);
        }

        $identity->delete();

        return response()->json(['data' => ['unlinked' => true]]);
    }

    // --------------------------------------------------------------- helpers

    /**
     * Find the identity, link it to an existing account with the same verified
     * email, or create a fresh customer. Wrapped in a transaction so a
     * half-linked identity can never be left behind.
     *
     * @return array{0: User, 1: bool}
     */
    protected function resolveUser(string $provider, SocialUser $profile): array
    {
        return DB::transaction(function () use ($provider, $profile) {
            $identity = SocialIdentity::query()
                ->where('provider', $provider)
                ->where('provider_user_id', $profile->id)
                ->first();

            $created = false;

            if ($identity) {
                $user = $identity->user;
            } else {
                $user = $profile->email
                    ? User::query()->where('email', $profile->email)->first()
                    : null;

                if ($user?->isSuspended()) {
                    // Thrown inside the transaction so no identity is linked
                    // to an account that is not allowed to sign in.
                    throw ValidationException::withMessages([
                        'email' => 'This account has been suspended. Contact support.',
                    ]);
                }

                if (! $user) {
                    $user = User::query()->create([
                        'name' => $profile->displayName(),
                        'email' => $profile->email ?: $provider.'_'.Str::lower(Str::random(10)).'@users.noreply.markethub',
                        'password' => Str::password(32),
                        'avatar_url' => $profile->avatar,
                        'email_verified_at' => $profile->verified ? now() : null,
                    ]);
                    $created = true;
                }

                $identity = new SocialIdentity([
                    'provider' => $provider,
                    'provider_user_id' => $profile->id,
                ]);
                $identity->user_id = $user->id;
            }

            $identity->fill([
                'email' => $profile->email,
                'nickname' => $profile->nickname,
                'avatar_url' => $profile->avatar,
                'last_login_at' => now(),
                'meta' => ['demo' => $profile->demo],
            ])->save();

            // Social sign-in grants the customer role and nothing else.
            UserRole::query()->firstOrCreate([
                'user_id' => $user->id,
                'role' => 'customer',
                'tenant_id' => null,
            ]);

            $updates = [];
            if (! $user->avatar_url && $profile->avatar) {
                $updates['avatar_url'] = $profile->avatar;
            }
            if (! $user->email_verified_at && $profile->verified) {
                $updates['email_verified_at'] = now();
            }
            if ($updates) {
                $user->forceFill($updates)->saveQuietly();
            }

            return [$user->fresh(), $created];
        });
    }

    protected function issueToken(User $user): string
    {
        $minutes = (int) PlatformSetting::get('session_timeout_minutes', 120);
        $minutes = max(15, min(43200, $minutes));

        return $user->createToken('web:marketplace', ['*'], now()->addMinutes($minutes))->plainTextToken;
    }

    /** Mirrors AuthController@userPayload so the SPA can reuse one shape. */
    protected function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'avatar_url' => $user->avatar_url,
            'role' => $user->primaryRole(),
            'tenant_id' => null,
            'tenant_slug' => null,
            'tenant_name' => null,
            'tenant_status' => null,
            'department' => null,
            'roles' => $user->roles->map(fn (UserRole $role) => [
                'role' => $role->role,
                'tenant_id' => $role->tenant_id,
                'store_id' => $role->store_id,
                'department' => $role->department,
            ])->all(),
            'social_accounts' => $user->socialIdentities->map(fn (SocialIdentity $identity) => [
                'provider' => $identity->provider,
                'label' => SocialIdentity::label($identity->provider),
            ])->all(),
        ];
    }

    protected function assertProvider(string $provider): void
    {
        abort_unless($this->providers->supports($provider), 404, 'Unknown sign-in provider.');

        if (! $this->providers->enabled($provider)) {
            throw ValidationException::withMessages([
                'provider' => 'This sign-in option is not enabled.',
            ]);
        }
    }
}
