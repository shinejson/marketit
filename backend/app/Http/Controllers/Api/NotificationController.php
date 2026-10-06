<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppNotification;
use App\Models\NotificationPreference;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * §20 #12 / §22 #20 — the in-app notification centre.
 *
 * One endpoint serves all three consoles; `audience` narrows the feed to the
 * surface the caller is looking at.
 */
class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = $this->scoped($request);

        if ($request->filled('audience')) {
            $query->where('audience', $request->string('audience'));
        }
        if ($request->filled('category')) {
            $query->where('category', $request->string('category'));
        }
        if ($request->boolean('unread_only')) {
            $query->whereNull('read_at');
        }
        if ($request->filled('q')) {
            $term = '%'.$request->string('q').'%';
            $query->where(fn ($q) => $q->where('title', 'like', $term)->orWhere('body', 'like', $term));
        }

        $page = $query->orderByDesc('id')->paginate($request->integer('per_page', 20));

        return response()->json([
            'data' => collect($page->items())->map(fn (AppNotification $n) => $this->present($n))->all(),
            'summary' => $this->summaryFor($request),
            'meta' => [
                'page' => $page->currentPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
                'last_page' => $page->lastPage(),
            ],
        ]);
    }

    /** Small payload for the navbar bell. */
    public function summary(Request $request): JsonResponse
    {
        $recent = $this->scoped($request)
            ->when($request->filled('audience'), fn ($q) => $q->where('audience', $request->string('audience')))
            ->orderByDesc('id')
            ->limit(8)
            ->get()
            ->map(fn (AppNotification $n) => $this->present($n));

        return response()->json([
            'data' => [
                'recent' => $recent,
                ...$this->summaryFor($request),
            ],
        ]);
    }

    public function markRead(Request $request, AppNotification $notification): JsonResponse
    {
        $this->assertOwner($request, $notification);
        $notification->update(['read_at' => $notification->read_at ?? now()]);

        return response()->json(['data' => $this->present($notification->fresh())]);
    }

    public function markUnread(Request $request, AppNotification $notification): JsonResponse
    {
        $this->assertOwner($request, $notification);
        $notification->update(['read_at' => null]);

        return response()->json(['data' => $this->present($notification->fresh())]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $query = $this->scoped($request)->whereNull('read_at');
        if ($request->filled('audience')) {
            $query->where('audience', $request->string('audience'));
        }
        $updated = $query->update(['read_at' => now()]);

        return response()->json(['data' => ['updated' => $updated]]);
    }

    public function destroy(Request $request, AppNotification $notification): JsonResponse
    {
        $this->assertOwner($request, $notification);
        $notification->update(['archived_at' => now()]);

        return response()->json(['data' => ['archived' => true]]);
    }

    public function clear(Request $request): JsonResponse
    {
        $archived = $this->scoped($request)->whereNotNull('read_at')->update(['archived_at' => now()]);

        return response()->json(['data' => ['archived' => $archived]]);
    }

    public function preferences(Request $request): JsonResponse
    {
        $preference = NotificationPreference::query()->firstOrCreate(
            ['user_id' => $request->user()->id],
            ['preferences' => NotificationPreference::DEFAULTS],
        );

        return response()->json(['data' => $preference->resolved()]);
    }

    public function updatePreferences(Request $request): JsonResponse
    {
        $rules = [];
        foreach (array_keys(NotificationPreference::DEFAULTS) as $key) {
            $rules[$key] = ['nullable', 'boolean'];
        }
        $data = $request->validate($rules);

        $preference = NotificationPreference::query()->firstOrCreate(
            ['user_id' => $request->user()->id],
            ['preferences' => NotificationPreference::DEFAULTS],
        );

        $preference->update([
            'preferences' => array_merge($preference->resolved(), array_map(
                fn ($value) => (bool) $value,
                array_filter($data, fn ($value) => $value !== null),
            )),
        ]);

        return response()->json(['data' => $preference->fresh()->resolved()]);
    }

    // ----------------------------------------------------------- internals

    protected function scoped(Request $request)
    {
        return AppNotification::query()
            ->where('user_id', $request->user()->id)
            ->whereNull('archived_at');
    }

    protected function summaryFor(Request $request): array
    {
        $base = $this->scoped($request);

        $byCategory = (clone $base)
            ->whereNull('read_at')
            ->selectRaw('category, COUNT(*) as entries')
            ->groupBy('category')
            ->pluck('entries', 'category');

        return [
            'unread' => (clone $base)->whereNull('read_at')->count(),
            'total' => (clone $base)->count(),
            'today' => (clone $base)->whereDate('created_at', now()->toDateString())->count(),
            'by_category' => $byCategory,
        ];
    }

    protected function assertOwner(Request $request, AppNotification $notification): void
    {
        abort_unless((int) $notification->user_id === (int) $request->user()->id, 403, 'Not your notification.');
    }

    protected function present(AppNotification $n): array
    {
        return [
            'id' => $n->id,
            'audience' => $n->audience,
            'category' => $n->category,
            'level' => $n->level,
            'title' => $n->title,
            'body' => $n->body,
            'action_url' => $n->action_url,
            'action_label' => $n->action_label,
            'data' => $n->data,
            'read' => $n->read_at !== null,
            'read_at' => $n->read_at,
            'created_at' => $n->created_at,
        ];
    }
}
