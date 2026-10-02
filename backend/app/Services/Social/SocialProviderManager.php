<?php

namespace App\Services\Social;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * A small, dependency-free OAuth 2.0 client for customer social login.
 *
 * Laravel Socialite would be the obvious choice, but the platform ships
 * without it and the flow we need is narrow: build an authorize URL, exchange
 * an authorization code, normalise the profile. Everything provider-specific
 * lives in {@see PROVIDERS} so adding one is a config change plus an entry
 * here.
 *
 * When a provider has no credentials configured the manager can run in demo
 * mode (non-production only). That keeps the customer login page fully
 * clickable on seed data and in review apps, and it is refused outright in
 * production so a real deployment can never mint accounts without OAuth.
 */
class SocialProviderManager
{
    public const PROVIDERS = [
        'google' => [
            'label' => 'Google',
            'authorize_url' => 'https://accounts.google.com/o/oauth2/v2/auth',
            'token_url' => 'https://oauth2.googleapis.com/token',
            'userinfo_url' => 'https://openidconnect.googleapis.com/v1/userinfo',
            'scopes' => ['openid', 'profile', 'email'],
            'params' => ['access_type' => 'offline', 'prompt' => 'select_account'],
            'color' => '#ffffff',
        ],
        'facebook' => [
            'label' => 'Facebook',
            'authorize_url' => 'https://www.facebook.com/v19.0/dialog/oauth',
            'token_url' => 'https://graph.facebook.com/v19.0/oauth/access_token',
            'userinfo_url' => 'https://graph.facebook.com/v19.0/me?fields=id,name,email,picture.type(large)',
            'scopes' => ['email', 'public_profile'],
            'params' => [],
            'color' => '#1877f2',
        ],
        'apple' => [
            'label' => 'Apple',
            'authorize_url' => 'https://appleid.apple.com/auth/authorize',
            'token_url' => 'https://appleid.apple.com/auth/token',
            'userinfo_url' => null, // Apple returns the profile inside the id_token.
            'scopes' => ['name', 'email'],
            'params' => ['response_mode' => 'form_post'],
            'color' => '#000000',
        ],
        'github' => [
            'label' => 'GitHub',
            'authorize_url' => 'https://github.com/login/oauth/authorize',
            'token_url' => 'https://github.com/login/oauth/access_token',
            'userinfo_url' => 'https://api.github.com/user',
            'scopes' => ['read:user', 'user:email'],
            'params' => [],
            'color' => '#24292f',
        ],
    ];

    public function supports(string $provider): bool
    {
        return array_key_exists($provider, self::PROVIDERS);
    }

    public function configured(string $provider): bool
    {
        $config = config("services.{$provider}");

        return ! empty($config['client_id']) && ! empty($config['client_secret']);
    }

    /** Demo mode never runs in production, and never overrides real credentials. */
    public function demoMode(string $provider): bool
    {
        return ! $this->configured($provider)
            && (bool) config('services.social.demo', false)
            && ! app()->isProduction();
    }

    public function enabled(string $provider): bool
    {
        if (! $this->supports($provider)) {
            return false;
        }

        $enabled = config("services.{$provider}.enabled");
        if ($enabled === false) {
            return false;
        }

        return $this->configured($provider) || $this->demoMode($provider);
    }

    /** Providers the login page should render, in display order. */
    public function catalog(): array
    {
        $out = [];

        foreach (self::PROVIDERS as $key => $meta) {
            if (! $this->enabled($key)) {
                continue;
            }

            $out[] = [
                'key' => $key,
                'label' => $meta['label'],
                'color' => $meta['color'],
                'mode' => $this->demoMode($key) ? 'demo' : 'oauth',
            ];
        }

        return $out;
    }

    /**
     * Build the provider authorize URL (or, in demo mode, a callback URL that
     * loops straight back into the SPA with a demo code).
     */
    public function authorizeUrl(string $provider, string $redirectUri, string $state): array
    {
        $this->assertEnabled($provider);

        if ($this->demoMode($provider)) {
            return [
                'mode' => 'demo',
                'url' => $redirectUri.(str_contains($redirectUri, '?') ? '&' : '?').http_build_query([
                    'code' => 'demo.'.$provider.'.'.Str::lower(Str::random(12)),
                    'state' => $state,
                ]),
            ];
        }

        $meta = self::PROVIDERS[$provider];
        $query = array_merge($meta['params'], [
            'client_id' => config("services.{$provider}.client_id"),
            'redirect_uri' => $redirectUri,
            'response_type' => 'code',
            'scope' => implode(' ', $meta['scopes']),
            'state' => $state,
        ]);

        return [
            'mode' => 'oauth',
            'url' => $meta['authorize_url'].'?'.http_build_query($query),
        ];
    }

    /**
     * Exchange the authorization code and return a normalised profile:
     * id, email, name, nickname, avatar, verified.
     */
    public function profile(string $provider, string $code, string $redirectUri): SocialUser
    {
        $this->assertEnabled($provider);

        if ($this->demoMode($provider)) {
            return $this->demoProfile($provider);
        }

        $meta = self::PROVIDERS[$provider];

        $response = Http::asForm()
            ->withHeaders(['Accept' => 'application/json'])
            ->timeout(15)
            ->post($meta['token_url'], [
                'client_id' => config("services.{$provider}.client_id"),
                'client_secret' => config("services.{$provider}.client_secret"),
                'code' => $code,
                'redirect_uri' => $redirectUri,
                'grant_type' => 'authorization_code',
            ]);

        if ($response->failed()) {
            throw new RuntimeException('The sign-in provider rejected this request. Please try again.');
        }

        $token = $response->json();
        $accessToken = $token['access_token'] ?? null;
        $idToken = $token['id_token'] ?? null;

        if (! $accessToken && ! $idToken) {
            throw new RuntimeException('The sign-in provider did not return an access token.');
        }

        $claims = $idToken ? $this->decodeIdToken($idToken) : [];

        if (! $meta['userinfo_url']) {
            return $this->fromClaims($provider, $claims);
        }

        $profile = Http::withToken($accessToken)
            ->withHeaders(['Accept' => 'application/json'])
            ->timeout(15)
            ->get($meta['userinfo_url']);

        if ($profile->failed()) {
            return $this->fromClaims($provider, $claims);
        }

        return $this->normalise($provider, array_merge($claims, $profile->json() ?? []));
    }

    // --------------------------------------------------------------- mapping

    protected function normalise(string $provider, array $raw): SocialUser
    {
        return match ($provider) {
            'facebook' => new SocialUser(
                id: (string) ($raw['id'] ?? ''),
                email: $raw['email'] ?? null,
                name: $raw['name'] ?? null,
                nickname: $raw['name'] ?? null,
                avatar: $raw['picture']['data']['url'] ?? null,
                verified: isset($raw['email']),
            ),
            'github' => new SocialUser(
                id: (string) ($raw['id'] ?? ''),
                email: $raw['email'] ?? null,
                name: $raw['name'] ?? $raw['login'] ?? null,
                nickname: $raw['login'] ?? null,
                avatar: $raw['avatar_url'] ?? null,
                verified: isset($raw['email']),
            ),
            default => new SocialUser(
                id: (string) ($raw['sub'] ?? $raw['id'] ?? ''),
                email: $raw['email'] ?? null,
                name: $raw['name'] ?? trim(($raw['given_name'] ?? '').' '.($raw['family_name'] ?? '')) ?: null,
                nickname: $raw['nickname'] ?? $raw['given_name'] ?? null,
                avatar: $raw['picture'] ?? null,
                verified: (bool) ($raw['email_verified'] ?? false),
            ),
        };
    }

    protected function fromClaims(string $provider, array $claims): SocialUser
    {
        if (empty($claims)) {
            throw new RuntimeException('The sign-in provider did not return a profile.');
        }

        return $this->normalise($provider, $claims);
    }

    /**
     * Read the (already provider-signed) id_token payload. The token arrives
     * over a TLS back-channel straight from the provider's token endpoint, so
     * the signature does not need re-verifying here.
     */
    protected function decodeIdToken(string $idToken): array
    {
        $parts = explode('.', $idToken);
        if (count($parts) < 2) {
            return [];
        }

        $payload = base64_decode(strtr($parts[1], '-_', '+/'), true);

        return is_string($payload) ? (json_decode($payload, true) ?: []) : [];
    }

    protected function demoProfile(string $provider): SocialUser
    {
        $label = self::PROVIDERS[$provider]['label'];
        $names = [
            'google' => 'Akosua Boateng',
            'facebook' => 'Kofi Adjei',
            'apple' => 'Naa Adoley',
            'github' => 'Yaw Mensah',
        ];

        return new SocialUser(
            id: 'demo-'.$provider.'-1',
            email: $provider.'.customer@markethub.test',
            name: $names[$provider] ?? $label.' Customer',
            nickname: $names[$provider] ?? null,
            avatar: null,
            verified: true,
            demo: true,
        );
    }

    protected function assertEnabled(string $provider): void
    {
        if (! $this->enabled($provider)) {
            throw new RuntimeException('This sign-in option is not available.');
        }
    }
}
