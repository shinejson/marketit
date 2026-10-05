<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Order;
use App\Models\Tenant;
use App\Models\User;
use App\Support\ActivityLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

/**
 * "My account" for anyone signed in — the person who registered the tenant,
 * the staff they invited, or a marketplace customer.
 *
 * Three things live here: who you are (editable profile), how you get in
 * (password + active sessions), and what you have been doing (your slice of
 * the audit trail, which the tenant console also surfaces workspace-wide).
 */
class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->load('roles', 'socialIdentities');

        return response()->json(['data' => $this->payload($user)]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', 'unique:users,email,'.$user->id],
            'phone' => ['nullable', 'string', 'max:32'],
            'job_title' => ['nullable', 'string', 'max:120'],
            'bio' => ['nullable', 'string', 'max:1000'],
            'timezone' => ['nullable', 'string', 'max:64'],
            'locale' => ['nullable', 'string', 'max:12'],
            'preferred_currency' => ['nullable', 'string', 'size:3'],
            'avatar_url' => ['nullable', 'string', 'max:2048'],
        ]);

        $before = collect($user->only(array_keys($data)))->all();
        $user->fill($data)->save();

        ActivityLogger::record('profile.updated', [
            'subject_type' => User::class,
            'subject_id' => $user->id,
            'before' => $before,
            'after' => $data,
        ], $user);

        return response()->json(['data' => $this->payload($user->fresh()->load('roles', 'socialIdentities'))]);
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        if (! Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages(['current_password' => 'That password does not match our records.']);
        }

        $user->forceFill(['password' => $data['password']])->save();

        // A password change invalidates every other session.
        $current = $user->currentAccessToken()?->id;
        $query = $user->tokens();
        if ($current) {
            $query->where('id', '!=', $current);
        }
        $revoked = $query->delete();

        ActivityLogger::record('profile.password_changed', [
            'subject_type' => User::class,
            'subject_id' => $user->id,
            'after' => ['sessions_revoked' => $revoked],
        ], $user);

        return response()->json(['data' => ['ok' => true, 'sessions_revoked' => $revoked]]);
    }

    public function uploadAvatar(Request $request): JsonResponse
    {
        $user = $request->user();
        $request->validate(['avatar' => ['required', 'image', 'max:2048']]);

        $path = $request->file('avatar')->store('avatars', 'public');
        $user->forceFill(['avatar_url' => Storage::url($path)])->save();

        ActivityLogger::record('profile.avatar_updated', [
            'subject_type' => User::class,
            'subject_id' => $user->id,
            'after' => ['avatar_url' => $user->avatar_url],
        ], $user);

        return response()->json(['data' => ['avatar_url' => $user->avatar_url]], 201);
    }

    /**
     * This person's own activity timeline, newest first, with the same shape
     * the workspace activity log uses so the UI can share components.
     */
    public function activity(Request $request): JsonResponse
    {
        $user = $request->user();
        $perPage = min(100, max(1, $request->integer('per_page', 20)));

        $base = fn (): Builder => AuditLog::query()->where('actor_user_id', $user->id);

        $query = $base();
        if ($request->filled('action')) {
            $query->where('action', 'like', $request->string('action').'%');
        }
        if ($request->filled('subject_type')) {
            $query->where('subject_type', $request->string('subject_type'));
        }
        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->date('from'));
        }
        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->date('to'));
        }
        if ($request->filled('q')) {
            $term = '%'.$request->string('q').'%';
            $query->where(fn (Builder $n) => $n->where('action', 'like', $term)->orWhere('subject_type', 'like', $term)->orWhere('ip', 'like', $term));
        }

        $page = $query->orderByDesc('created_at')->orderByDesc('id')->paginate($perPage);

        return response()->json([
            'data' => collect($page->items())->map(fn (AuditLog $log) => [
                'id' => $log->id,
                'action' => $log->action,
                'subject_type' => $log->subject_type,
                'subject_label' => class_basename((string) $log->subject_type),
                'subject_id' => $log->subject_id,
                'tenant_id' => $log->tenant_id,
                'ip' => $log->ip,
                'diff' => $log->diff,
                'created_at' => $log->created_at?->toIso8601String(),
            ])->all(),
            'meta' => [
                'page' => $page->currentPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
                'last_page' => $page->lastPage(),
            ],
            'stats' => $this->activityStats($user),
        ]);
    }

    /** Active bearer tokens for the "where you're signed in" card. */
    public function sessions(Request $request): JsonResponse
    {
        $current = $request->user()->currentAccessToken()?->id;

        $sessions = $request->user()->tokens()
            ->latest('last_used_at')
            ->latest('created_at')
            ->get()
            ->map(fn ($token) => [
                'id' => $token->id,
                'name' => str_replace('web:', '', (string) $token->name),
                'current' => (int) $token->id === (int) $current,
                'created_at' => $token->created_at,
                'last_used_at' => $token->last_used_at,
                'expires_at' => $token->expires_at,
            ])->values();

        return response()->json(['data' => $sessions]);
    }

    protected function activityStats(User $user): array
    {
        $base = fn (): Builder => AuditLog::query()->where('actor_user_id', $user->id);

        $byAction = $base()
            ->selectRaw('action, count(*) as count')
            ->groupBy('action')
            ->orderByDesc('count')
            ->limit(8)
            ->get()
            ->map(fn ($row) => ['action' => $row->action, 'count' => (int) $row->count])
            ->all();

        // 14-day sparkline of "things I did".
        $days = [];
        for ($i = 13; $i >= 0; $i--) {
            $day = now()->subDays($i)->toDateString();
            $days[] = [
                'day' => $day,
                'count' => (int) $base()->whereDate('created_at', $day)->count(),
            ];
        }

        return [
            'total' => (int) $base()->count(),
            'today' => (int) $base()->whereDate('created_at', now()->toDateString())->count(),
            'last_7_days' => (int) $base()->where('created_at', '>=', now()->subDays(7))->count(),
            'last_30_days' => (int) $base()->where('created_at', '>=', now()->subDays(30))->count(),
            'first_event_at' => $base()->min('created_at'),
            'last_event_at' => $base()->max('created_at'),
            'by_action' => $byAction,
            'trend' => $days,
        ];
    }

    protected function payload(User $user): array
    {
        $tenantId = $user->tenantId();
        $tenant = $tenantId ? Tenant::query()->find($tenantId) : null;

        return [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'avatar_url' => $user->avatar_url,
                'job_title' => $user->job_title,
                'bio' => $user->bio,
                'timezone' => $user->timezone,
                'locale' => $user->locale,
                'preferred_currency' => $user->preferred_currency,
                'status' => $user->status,
                'role' => $user->primaryRole(),
                'email_verified_at' => $user->email_verified_at,
                'last_login_at' => $user->last_login_at,
                'last_seen_at' => $user->last_seen_at,
                'created_at' => $user->created_at,
            ],
            'tenant' => $tenant ? [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'status' => $tenant->status,
                'currency' => $tenant->settings?->currency,
                'joined_at' => $user->roles->firstWhere('tenant_id', $tenant->id)?->created_at,
                'is_owner' => (int) $tenant->owner_user_id === (int) $user->id,
            ] : null,
            'roles' => $user->roles->map(fn ($role) => [
                'role' => $role->role,
                'tenant_id' => $role->tenant_id,
                'store_id' => $role->store_id,
                'department' => $role->department,
            ])->all(),
            'permissions' => $tenant ? $user->tenantPermissions($tenant->id) : [],
            'social_accounts' => $user->socialIdentities->map(fn ($identity) => [
                'provider' => $identity->provider,
                'linked_at' => $identity->created_at,
            ])->all(),
            'stats' => $this->profileStats($user, $tenant),
        ];
    }

    /** Headline numbers for the profile hero. */
    protected function profileStats(User $user, ?Tenant $tenant): array
    {
        $stats = [
            'activity_total' => (int) AuditLog::query()->where('actor_user_id', $user->id)->count(),
            'activity_last_7_days' => (int) AuditLog::query()->where('actor_user_id', $user->id)->where('created_at', '>=', now()->subDays(7))->count(),
            'active_sessions' => (int) $user->tokens()->count(),
            'member_since' => $user->created_at?->toIso8601String(),
        ];

        if ($tenant) {
            foreach (['products' => 'products', 'stores' => 'stores'] as $key => $table) {
                if (Schema::hasTable($table)) {
                    $stats[$key.'_in_workspace'] = (int) DB::table($table)->where('tenant_id', $tenant->id)->count();
                }
            }
        } elseif (Schema::hasTable('orders')) {
            $stats['orders_placed'] = (int) Order::query()->where('user_id', $user->id)->count();
        }

        return $stats;
    }
}
