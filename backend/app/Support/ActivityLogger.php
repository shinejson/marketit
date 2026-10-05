<?php

namespace App\Support;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

/**
 * Writes the non-model events — sign in, sign out, profile edits, currency
 * switches — into the same audit_logs stream the Auditable trait feeds, so a
 * person's profile timeline and the workspace activity log tell one story.
 */
class ActivityLogger
{
    public static function record(string $action, array $context = [], ?User $actor = null, ?int $tenantId = null): ?AuditLog
    {
        try {
            $actor ??= Auth::user();

            return AuditLog::query()->create([
                'actor_user_id' => $actor?->id,
                'tenant_id' => $tenantId ?? $actor?->tenantId() ?? TenantContext::id(),
                'action' => $action,
                'subject_type' => $context['subject_type'] ?? User::class,
                'subject_id' => $context['subject_id'] ?? $actor?->id,
                'diff' => [
                    'before' => $context['before'] ?? null,
                    'after' => $context['after'] ?? ($context['meta'] ?? null),
                ],
                'ip' => Request::ip(),
            ]);
        } catch (\Throwable) {
            // Activity tracking must never break the request it describes.
            return null;
        }
    }
}
