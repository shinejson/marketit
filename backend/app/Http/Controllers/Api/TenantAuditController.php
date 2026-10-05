<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Tenant-scoped activity trail. The platform-wide audit stream lives on
 * the admin console; this controller gives each workspace the same power
 * over its own slice — every create/update/delete its team performs.
 */
class TenantAuditController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = min(100, max(1, $request->integer('per_page', 30)));

        $page = $this->query($request)
            ->with(['actor' => fn ($q) => $q->select('id', 'name', 'email')])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($perPage);

        $filtered = $this->query($request);

        return response()->json([
            'data' => $page->items(),
            'meta' => [
                'page' => $page->currentPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
                'last_page' => $page->lastPage(),
            ],
            'stats' => [
                'total' => (clone $filtered)->count(),
                'today' => (clone $filtered)->whereDate('created_at', now()->toDateString())->count(),
                'last_7_days' => (clone $filtered)->where('created_at', '>=', now()->subDays(7))->count(),
                'unique_actors' => (clone $filtered)->whereNotNull('actor_user_id')->distinct()->count('actor_user_id'),
                'unique_ips' => (clone $filtered)->whereNotNull('ip')->distinct()->count('ip'),
            ],
        ]);
    }

    /** Filter dropdowns — always computed without filters so options persist. */
    public function facets(Request $request): JsonResponse
    {
        $tenantId = (int) $request->user()->tenantId();

        $actions = AuditLog::query()->where('tenant_id', $tenantId)
            ->selectRaw('action as value, count(*) as count')->whereNotNull('action')
            ->groupBy('action')->orderByDesc('count')->get();

        $subjectTypes = AuditLog::query()->where('tenant_id', $tenantId)
            ->selectRaw('subject_type as value, count(*) as count')->whereNotNull('subject_type')
            ->groupBy('subject_type')->orderByDesc('count')->get();

        $actors = AuditLog::query()->where('audit_logs.tenant_id', $tenantId)
            ->join('users', 'users.id', '=', 'audit_logs.actor_user_id')
            ->selectRaw('users.id as id, users.name as name, users.email as email, count(*) as count')
            ->groupBy('users.id', 'users.name', 'users.email')->orderByDesc('count')->get();

        $ips = AuditLog::query()->where('tenant_id', $tenantId)
            ->selectRaw('ip as value, count(*) as count')->whereNotNull('ip')
            ->groupBy('ip')->orderByDesc('count')->limit(100)->get();

        return response()->json([
            'data' => [
                'actions' => $actions,
                'subject_types' => $subjectTypes,
                'actors' => $actors,
                'ips' => $ips,
            ],
        ]);
    }

    protected function query(Request $request): Builder
    {
        $q = AuditLog::query()->where('tenant_id', (int) $request->user()->tenantId());

        if ($request->filled('action')) {
            $q->where('action', $request->string('action'));
        }
        if ($request->filled('subject_type')) {
            $q->where('subject_type', $request->string('subject_type'));
        }
        if ($request->filled('actor_id')) {
            $q->where('actor_user_id', $request->integer('actor_id'));
        }
        if ($request->filled('ip')) {
            $q->where('ip', $request->string('ip'));
        }
        if ($request->filled('from')) {
            $q->whereDate('created_at', '>=', $request->date('from'));
        }
        if ($request->filled('to')) {
            $q->whereDate('created_at', '<=', $request->date('to'));
        }
        if ($request->filled('q')) {
            $term = '%'.$request->string('q').'%';
            $q->where(function (Builder $nested) use ($term) {
                $nested->where('subject_type', 'like', $term)
                    ->orWhere('ip', 'like', $term)
                    ->orWhereHas('actor', fn (Builder $actor) => $actor
                        ->where('name', 'like', $term)
                        ->orWhere('email', 'like', $term));
            });
        }

        return $q;
    }
}
