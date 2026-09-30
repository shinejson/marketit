<?php

namespace App\Services\Domains;

use App\Models\Tenant;
use App\Models\TenantDomain;
use Illuminate\Support\Str;

class DomainService
{
    protected const RESERVED_SUBDOMAINS = [
        'admin', 'superadmin', 'platform', 'tenant', 'tenants', 'seller', 'sellers', 'console',
        'api', 'app', 'www', 'market', 'marketplace',
    ];

    public function request(int $tenantId, string $domain): TenantDomain
    {
        $domain = strtolower(trim($domain));

        return TenantDomain::query()->create([
            'tenant_id' => $tenantId,
            'domain' => $domain,
            'status' => TenantDomain::STATUS_DNS_PENDING,
            'verification_token' => Str::lower(Str::random(32)),
            'cert_status' => 'none',
        ]);
    }

    public function verify(TenantDomain $domain, bool $force = false): TenantDomain
    {
        $domain->check_attempts = (int) $domain->check_attempts + 1;
        $domain->last_check_at = now();

        $ok = $force || $this->txtMatches($domain);
        if ($ok) {
            $domain->status = TenantDomain::STATUS_ACTIVE;
            $domain->dns_verified_at = now();
            $domain->cert_status = 'issued';
        } elseif ($domain->check_attempts >= 8 || ($domain->created_at && $domain->created_at->lt(now()->subHours(72)))) {
            $domain->status = TenantDomain::STATUS_FAILED;
        } else {
            $domain->status = TenantDomain::STATUS_DNS_PENDING;
        }
        $domain->save();

        return $domain;
    }

    public function resolveHost(?string $host): ?TenantDomain
    {
        $host = $this->normalizeHost($host);
        if (! $host) {
            return null;
        }

        return TenantDomain::withoutGlobalScopes()
            ->where('domain', $host)
            ->where('status', TenantDomain::STATUS_ACTIVE)
            ->first();
    }

    /** Resolve either a verified custom domain or the Phase 1 tenant slug subdomain fallback. */
    public function resolveHostToTenant(?string $host): ?Tenant
    {
        $domain = $this->resolveHost($host);
        if ($domain) {
            return $domain->tenant()->withoutGlobalScopes()->first();
        }

        $slug = $this->subdomainSlug($host);
        if (! $slug) {
            return null;
        }

        return Tenant::query()->where('slug', $slug)->first();
    }

    protected function normalizeHost(?string $host): ?string
    {
        if (! $host) {
            return null;
        }

        $host = strtolower(trim($host));
        $host = preg_replace('/:\d+$/', '', $host) ?? $host;

        return $host ?: null;
    }

    protected function subdomainSlug(?string $host): ?string
    {
        $host = $this->normalizeHost($host);
        if (! $host || $host === 'localhost') {
            return null;
        }

        // Sandbox/preview infrastructure hosts must not be treated as tenant slugs.
        if (str_ends_with($host, '.e2b.app') || str_ends_with($host, '.monkeycode-ai.live')) {
            return null;
        }

        $labels = explode('.', $host);
        $first = $labels[0] ?? null;
        if (! $first || in_array($first, self::RESERVED_SUBDOMAINS, true)) {
            return null;
        }

        if (str_ends_with($host, '.localhost') || count($labels) >= 3) {
            return Str::slug($first);
        }

        return null;
    }

    protected function txtMatches(TenantDomain $domain): bool
    {
        $expected = $domain->verification_token;
        $name = '_markethub-verify.'.$domain->domain;
        if (function_exists('dns_get_record')) {
            $records = @dns_get_record($name, DNS_TXT) ?: [];
            foreach ($records as $record) {
                $txt = $record['txt'] ?? ($record['entries'][0] ?? '');
                if ($txt === $expected) {
                    return true;
                }
            }
        }

        return false;
    }
}
