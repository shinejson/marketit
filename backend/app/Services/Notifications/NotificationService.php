<?php

namespace App\Services\Notifications;

use App\Models\AppNotification;
use App\Models\NotificationPreference;
use App\Models\Tenant;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Support\Collection;

/**
 * Writes rows into the in-app notification centre (§20 #12, §22 #20).
 *
 * Every call is best-effort: a notification must never be the reason an
 * order, payout or refund fails.
 */
class NotificationService
{
    /**
     * Notify a single user.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function notify(?int $userId, string $audience, string $category, string $title, array $attributes = []): ?AppNotification
    {
        if (! $userId) {
            return null;
        }

        if (! $this->wants($userId, $category)) {
            return null;
        }

        try {
            return AppNotification::query()->create([
                'user_id' => $userId,
                'tenant_id' => $attributes['tenant_id'] ?? null,
                'audience' => $audience,
                'category' => $category,
                'level' => $attributes['level'] ?? AppNotification::LEVEL_INFO,
                'title' => $title,
                'body' => $attributes['body'] ?? null,
                'action_url' => $attributes['action_url'] ?? null,
                'action_label' => $attributes['action_label'] ?? null,
                'subject_type' => $attributes['subject_type'] ?? null,
                'subject_id' => $attributes['subject_id'] ?? null,
                'data' => $attributes['data'] ?? null,
            ]);
        } catch (\Throwable) {
            return null;
        }
    }

    /** Notify the shopper who owns an order. */
    public function toCustomer(?int $userId, string $category, string $title, array $attributes = []): ?AppNotification
    {
        return $this->notify($userId, AppNotification::AUDIENCE_CUSTOMER, $category, $title, $attributes);
    }

    /**
     * Notify everyone who can act inside a tenant workspace (owner + staff).
     *
     * @return Collection<int, AppNotification>
     */
    public function toTenant(?int $tenantId, string $category, string $title, array $attributes = []): Collection
    {
        $sent = collect();
        if (! $tenantId) {
            return $sent;
        }

        foreach ($this->tenantRecipients($tenantId) as $userId) {
            $notification = $this->notify($userId, AppNotification::AUDIENCE_TENANT, $category, $title, [
                ...$attributes,
                'tenant_id' => $tenantId,
            ]);
            if ($notification) {
                $sent->push($notification);
            }
        }

        return $sent;
    }

    /**
     * Notify every super admin.
     *
     * @return Collection<int, AppNotification>
     */
    public function toAdmins(string $category, string $title, array $attributes = []): Collection
    {
        $sent = collect();
        foreach ($this->adminRecipients() as $userId) {
            $notification = $this->notify($userId, AppNotification::AUDIENCE_ADMIN, $category, $title, $attributes);
            if ($notification) {
                $sent->push($notification);
            }
        }

        return $sent;
    }

    /** Has this user muted the category? */
    public function wants(int $userId, string $category): bool
    {
        try {
            $preference = NotificationPreference::query()->where('user_id', $userId)->first();
        } catch (\Throwable) {
            return true;
        }

        if (! $preference) {
            return NotificationPreference::DEFAULTS[$category] ?? true;
        }

        $resolved = $preference->resolved();

        return (bool) ($resolved[$category] ?? true);
    }

    /** @return int[] */
    protected function tenantRecipients(int $tenantId): array
    {
        $ids = UserRole::query()
            ->where('tenant_id', $tenantId)
            ->whereIn('role', ['tenant_owner', 'store_staff'])
            ->pluck('user_id')
            ->all();

        $ownerId = Tenant::withoutGlobalScopes()->whereKey($tenantId)->value('owner_user_id');
        if ($ownerId) {
            $ids[] = (int) $ownerId;
        }

        return array_values(array_unique(array_map('intval', $ids)));
    }

    /** @return int[] */
    protected function adminRecipients(): array
    {
        return UserRole::query()
            ->where('role', 'super_admin')
            ->pluck('user_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();
    }

    /** Resolve the owning user of a tenant, used for payout notices. */
    public function tenantOwner(int $tenantId): ?User
    {
        $ownerId = Tenant::withoutGlobalScopes()->whereKey($tenantId)->value('owner_user_id');

        return $ownerId ? User::query()->find($ownerId) : null;
    }
}
