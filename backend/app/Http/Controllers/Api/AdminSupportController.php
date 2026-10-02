<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HelpArticle;
use App\Models\HelpCategory;
use App\Models\SupportCannedReply;
use App\Models\SupportChat;
use App\Models\SupportChatMessage;
use App\Models\SupportMessage;
use App\Models\SupportTask;
use App\Models\SupportTicket;
use App\Models\Tenant;
use App\Models\User;
use App\Support\SupportPresenter;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Super-admin service desk: tickets, live chat, service tasks and the tenant
 * help centre (guides). Everything here is platform-wide — tenant isolation is
 * bypassed on purpose so one team can run support across every tenant.
 */
class AdminSupportController extends Controller
{
    // ------------------------------------------------------------- overview

    public function overview(Request $request): JsonResponse
    {
        TenantContext::bypass(true);

        try {
            $days = max(7, min(90, $request->integer('days', 30)));
            $since = now()->subDays($days)->startOfDay();

            $tickets = SupportTicket::query()->get();
            $open = $tickets->whereIn('status', SupportTicket::OPEN_STATUSES);
            $recent = $tickets->filter(fn ($t) => $t->created_at && $t->created_at->gte($since));

            $resolved = $tickets->whereNotNull('resolved_at');
            $responded = $tickets->whereNotNull('first_response_at');

            $avgFirstResponse = $responded->count()
                ? round($responded->avg(fn ($t) => $t->created_at->diffInMinutes($t->first_response_at)))
                : 0;
            $avgResolution = $resolved->count()
                ? round($resolved->avg(fn ($t) => $t->created_at->diffInMinutes($t->resolved_at)) / 60, 1)
                : 0;

            $rated = $tickets->whereNotNull('satisfaction');
            $csat = $rated->count() ? round($rated->avg('satisfaction'), 2) : null;

            // Daily volume series for the sparkline charts.
            $volume = [];
            for ($i = $days - 1; $i >= 0; $i--) {
                $day = now()->subDays($i)->startOfDay();
                $label = $day->format('M j');
                $volume[] = [
                    'label' => $label,
                    'date' => $day->toDateString(),
                    'created' => $tickets->filter(fn ($t) => $t->created_at && $t->created_at->isSameDay($day))->count(),
                    'resolved' => $tickets->filter(fn ($t) => $t->resolved_at && $t->resolved_at->isSameDay($day))->count(),
                ];
            }

            $agents = $this->agentWorkload();
            $chats = SupportChat::query()->get();
            $tasks = SupportTask::query()->get();

            return response()->json(['data' => [
                'range_days' => $days,
                'kpis' => [
                    'open_tickets' => $open->count(),
                    'unassigned' => $open->whereNull('assignee_id')->count(),
                    'urgent' => $open->where('priority', 'urgent')->count(),
                    'breached' => $open->where('sla_breached', true)->count(),
                    'created_in_range' => $recent->count(),
                    'resolved_in_range' => $tickets->filter(fn ($t) => $t->resolved_at && $t->resolved_at->gte($since))->count(),
                    'avg_first_response_minutes' => $avgFirstResponse,
                    'avg_resolution_hours' => $avgResolution,
                    'csat' => $csat,
                    'active_chats' => $chats->where('status', SupportChat::STATUS_ACTIVE)->count(),
                    'queued_chats' => $chats->where('status', SupportChat::STATUS_QUEUED)->count(),
                    'open_tasks' => $tasks->where('status', '!=', SupportTask::STATUS_DONE)->count(),
                    'overdue_tasks' => $tasks->filter(fn ($t) => $t->isOverdue())->count(),
                    'published_guides' => HelpArticle::query()->published()->count(),
                    'guide_views' => (int) HelpArticle::query()->sum('views'),
                ],
                'by_status' => collect(SupportTicket::STATUSES)
                    ->map(fn ($s) => ['status' => $s, 'count' => $tickets->where('status', $s)->count()])
                    ->values(),
                'by_priority' => collect(SupportTicket::PRIORITIES)
                    ->map(fn ($p) => ['priority' => $p, 'count' => $open->where('priority', $p)->count()])
                    ->values(),
                'by_category' => collect(SupportTicket::CATEGORIES)
                    ->map(fn ($c) => ['category' => $c, 'count' => $tickets->where('category', $c)->count()])
                    ->filter(fn ($row) => $row['count'] > 0)
                    ->sortByDesc('count')
                    ->values(),
                'by_channel' => collect(SupportTicket::CHANNELS)
                    ->map(fn ($c) => ['channel' => $c, 'count' => $tickets->where('channel', $c)->count()])
                    ->filter(fn ($row) => $row['count'] > 0)
                    ->values(),
                'volume' => $volume,
                'agents' => $agents,
                'top_tenants' => $this->topTenants($tickets),
                'recent_tickets' => SupportTicket::query()
                    ->with(['tenant:id,name,business_name,status', 'assignee:id,name,email'])
                    ->orderByDesc('created_at')
                    ->limit(6)
                    ->get()
                    ->map(fn (SupportTicket $t) => SupportPresenter::ticket($t))
                    ->all(),
                'top_guides' => HelpArticle::query()
                    ->with('category')
                    ->published()
                    ->orderByDesc('views')
                    ->limit(5)
                    ->get()
                    ->map(fn (HelpArticle $a) => SupportPresenter::article($a, false))
                    ->all(),
            ]]);
        } finally {
            TenantContext::bypass(false);
        }
    }

    // -------------------------------------------------------------- tickets

    public function tickets(Request $request): JsonResponse
    {
        TenantContext::bypass(true);

        try {
            $query = SupportTicket::query()->with(['tenant:id,name,business_name,status', 'assignee:id,name,email']);

            if ($term = trim((string) $request->string('q'))) {
                $like = '%'.$term.'%';
                $query->where(fn ($q) => $q->where('subject', 'like', $like)
                    ->orWhere('reference', 'like', $like)
                    ->orWhere('requester_name', 'like', $like)
                    ->orWhere('requester_email', 'like', $like));
            }

            $status = $request->string('status')->toString();
            if ($status && $status !== 'all') {
                $status === 'open'
                    ? $query->open()
                    : $query->where('status', $status);
            }

            foreach (['priority', 'category', 'channel'] as $field) {
                $value = $request->string($field)->toString();
                if ($value && $value !== 'all') {
                    $query->where($field, $value);
                }
            }

            if ($request->filled('tenant_id')) {
                $query->where('tenant_id', $request->integer('tenant_id'));
            }

            $assignee = $request->string('assignee')->toString();
            if ($assignee === 'unassigned') {
                $query->whereNull('assignee_id');
            } elseif ($assignee && $assignee !== 'all') {
                $query->where('assignee_id', (int) $assignee);
            }

            if ($request->boolean('breached')) {
                $query->where('sla_breached', true);
            }

            $page = $query->orderByRaw("CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END")
                ->orderByDesc('last_reply_at')
                ->orderByDesc('id')
                ->paginate(min(100, $request->integer('per_page', 25)));

            $all = SupportTicket::query()->get();

            return response()->json([
                'data' => collect($page->items())->map(fn (SupportTicket $t) => SupportPresenter::ticket($t))->all(),
                'meta' => [
                    'page' => $page->currentPage(),
                    'per_page' => $page->perPage(),
                    'total' => $page->total(),
                    'last_page' => $page->lastPage(),
                ],
                'summary' => [
                    'all' => $all->count(),
                    'open' => $all->whereIn('status', SupportTicket::OPEN_STATUSES)->count(),
                    'unassigned' => $all->whereIn('status', SupportTicket::OPEN_STATUSES)->whereNull('assignee_id')->count(),
                    'breached' => $all->whereIn('status', SupportTicket::OPEN_STATUSES)->where('sla_breached', true)->count(),
                    'resolved' => $all->where('status', SupportTicket::STATUS_RESOLVED)->count(),
                    'closed' => $all->where('status', SupportTicket::STATUS_CLOSED)->count(),
                ],
            ]);
        } finally {
            TenantContext::bypass(false);
        }
    }

    public function showTicket(SupportTicket $ticket): JsonResponse
    {
        TenantContext::bypass(true);

        try {
            $ticket->load([
                'tenant:id,name,business_name,status',
                'assignee:id,name,email',
                'messages' => fn ($q) => $q->orderBy('created_at'),
                'tasks.assignee:id,name,email',
            ]);

            return response()->json(['data' => SupportPresenter::ticket($ticket)]);
        } finally {
            TenantContext::bypass(false);
        }
    }

    public function storeTicket(Request $request): JsonResponse
    {
        $data = $request->validate([
            'subject' => ['required', 'string', 'max:180'],
            'body' => ['required', 'string', 'max:8000'],
            'tenant_id' => ['nullable', 'integer', 'exists:tenants,id'],
            'requester_name' => ['required', 'string', 'max:120'],
            'requester_email' => ['nullable', 'email', 'max:160'],
            'requester_type' => ['nullable', Rule::in(['tenant', 'customer', 'internal'])],
            'category' => ['nullable', Rule::in(SupportTicket::CATEGORIES)],
            'channel' => ['nullable', Rule::in(SupportTicket::CHANNELS)],
            'priority' => ['nullable', Rule::in(SupportTicket::PRIORITIES)],
            'assignee_id' => ['nullable', 'integer', 'exists:users,id'],
            'tags' => ['nullable', 'array'],
        ]);

        TenantContext::bypass(true);

        try {
            $priority = $data['priority'] ?? 'normal';
            $ticket = SupportTicket::query()->create([
                'reference' => SupportTicket::nextReference(),
                'tenant_id' => $data['tenant_id'] ?? null,
                'requester_name' => $data['requester_name'],
                'requester_email' => $data['requester_email'] ?? null,
                'requester_type' => $data['requester_type'] ?? 'tenant',
                'subject' => $data['subject'],
                'summary' => Str::limit(strip_tags($data['body']), 160),
                'category' => $data['category'] ?? 'other',
                'channel' => $data['channel'] ?? 'portal',
                'status' => SupportTicket::STATUS_NEW,
                'priority' => $priority,
                'assignee_id' => $data['assignee_id'] ?? null,
                'tags' => $data['tags'] ?? [],
                'last_reply_at' => now(),
                'sla_due_at' => now()->addMinutes(SupportTicket::SLA_MINUTES[$priority] ?? 480),
                'messages_count' => 1,
            ]);

            SupportMessage::query()->create([
                'ticket_id' => $ticket->id,
                'author_id' => $request->user()?->id,
                'author_name' => $data['requester_name'],
                'author_role' => SupportMessage::ROLE_REQUESTER,
                'visibility' => SupportMessage::VISIBILITY_PUBLIC,
                'body' => $data['body'],
            ]);

            $ticket->load(['tenant:id,name,business_name,status', 'assignee:id,name,email', 'messages']);

            return response()->json(['data' => SupportPresenter::ticket($ticket)], 201);
        } finally {
            TenantContext::bypass(false);
        }
    }

    public function updateTicket(Request $request, SupportTicket $ticket): JsonResponse
    {
        $data = $request->validate([
            'status' => ['nullable', Rule::in(SupportTicket::STATUSES)],
            'priority' => ['nullable', Rule::in(SupportTicket::PRIORITIES)],
            'category' => ['nullable', Rule::in(SupportTicket::CATEGORIES)],
            'assignee_id' => ['nullable', 'integer', 'exists:users,id'],
            'tags' => ['nullable', 'array'],
            'subject' => ['nullable', 'string', 'max:180'],
        ]);

        TenantContext::bypass(true);

        try {
            if (array_key_exists('priority', $data) && $data['priority'] && $data['priority'] !== $ticket->priority && ! $ticket->first_response_at) {
                // Re-base the SLA clock when priority changes before first reply.
                $ticket->sla_due_at = $ticket->created_at->copy()->addMinutes(SupportTicket::SLA_MINUTES[$data['priority']] ?? 480);
            }

            if (array_key_exists('status', $data) && $data['status']) {
                if ($data['status'] === SupportTicket::STATUS_RESOLVED && ! $ticket->resolved_at) {
                    $ticket->resolved_at = now();
                }
                if ($data['status'] === SupportTicket::STATUS_CLOSED) {
                    $ticket->closed_at = now();
                    $ticket->resolved_at = $ticket->resolved_at ?? now();
                }
                if (in_array($data['status'], SupportTicket::OPEN_STATUSES, true)) {
                    $ticket->resolved_at = null;
                    $ticket->closed_at = null;
                }
            }

            $ticket->fill(array_filter($data, fn ($v, $k) => $v !== null || $k === 'assignee_id', ARRAY_FILTER_USE_BOTH));
            $ticket->sla_breached = $ticket->isOpen() && ! $ticket->first_response_at && $ticket->sla_due_at && $ticket->sla_due_at->isPast();
            $ticket->save();

            $ticket->load(['tenant:id,name,business_name,status', 'assignee:id,name,email', 'messages' => fn ($q) => $q->orderBy('created_at')]);

            return response()->json(['data' => SupportPresenter::ticket($ticket)]);
        } finally {
            TenantContext::bypass(false);
        }
    }

    public function replyTicket(Request $request, SupportTicket $ticket): JsonResponse
    {
        $data = $request->validate([
            'body' => ['required', 'string', 'max:8000'],
            'visibility' => ['nullable', Rule::in([SupportMessage::VISIBILITY_PUBLIC, SupportMessage::VISIBILITY_INTERNAL])],
            'status' => ['nullable', Rule::in(SupportTicket::STATUSES)],
            'canned_reply_id' => ['nullable', 'integer', 'exists:support_canned_replies,id'],
        ]);

        TenantContext::bypass(true);

        try {
            $user = $request->user();
            $visibility = $data['visibility'] ?? SupportMessage::VISIBILITY_PUBLIC;

            $message = SupportMessage::query()->create([
                'ticket_id' => $ticket->id,
                'author_id' => $user?->id,
                'author_name' => $user?->name ?? 'Support',
                'author_role' => SupportMessage::ROLE_AGENT,
                'visibility' => $visibility,
                'body' => $data['body'],
            ]);

            if ($visibility === SupportMessage::VISIBILITY_PUBLIC) {
                $ticket->first_response_at = $ticket->first_response_at ?? now();
                $ticket->last_reply_at = now();
                if ($ticket->status === SupportTicket::STATUS_NEW) {
                    $ticket->status = SupportTicket::STATUS_PENDING;
                }
            }

            if (! empty($data['status'])) {
                $ticket->status = $data['status'];
                if ($data['status'] === SupportTicket::STATUS_RESOLVED) {
                    $ticket->resolved_at = now();
                }
                if ($data['status'] === SupportTicket::STATUS_CLOSED) {
                    $ticket->closed_at = now();
                    $ticket->resolved_at = $ticket->resolved_at ?? now();
                }
            }

            $ticket->assignee_id = $ticket->assignee_id ?? $user?->id;
            $ticket->messages_count = $ticket->messages()->count();
            $ticket->sla_breached = $ticket->isOpen() && ! $ticket->first_response_at && $ticket->sla_due_at && $ticket->sla_due_at->isPast();
            $ticket->save();

            if (! empty($data['canned_reply_id'])) {
                SupportCannedReply::query()->whereKey($data['canned_reply_id'])->increment('uses');
            }

            $ticket->load(['tenant:id,name,business_name,status', 'assignee:id,name,email', 'messages' => fn ($q) => $q->orderBy('created_at')]);

            return response()->json([
                'data' => SupportPresenter::ticket($ticket),
                'message' => SupportPresenter::message($message),
            ], 201);
        } finally {
            TenantContext::bypass(false);
        }
    }

    // ----------------------------------------------------------- live chats

    public function chats(Request $request): JsonResponse
    {
        TenantContext::bypass(true);

        try {
            $query = SupportChat::query()->with(['tenant:id,name,business_name,status', 'agent:id,name,email']);

            $status = $request->string('status')->toString();
            if ($status && $status !== 'all') {
                $query->where('status', $status);
            }

            if ($term = trim((string) $request->string('q'))) {
                $like = '%'.$term.'%';
                $query->where(fn ($q) => $q->where('visitor_name', 'like', $like)
                    ->orWhere('visitor_email', 'like', $like)
                    ->orWhere('topic', 'like', $like));
            }

            $chats = $query->orderByRaw("CASE status WHEN 'queued' THEN 0 WHEN 'active' THEN 1 ELSE 2 END")
                ->orderByDesc('last_message_at')
                ->limit(100)
                ->get();

            $all = SupportChat::query()->get();

            return response()->json([
                'data' => $chats->map(fn (SupportChat $c) => SupportPresenter::chat($c))->all(),
                'summary' => [
                    'queued' => $all->where('status', SupportChat::STATUS_QUEUED)->count(),
                    'active' => $all->where('status', SupportChat::STATUS_ACTIVE)->count(),
                    'ended_today' => $all->filter(fn ($c) => $c->ended_at && $c->ended_at->isToday())->count(),
                    'avg_wait_seconds' => (int) round($all->filter(fn ($c) => $c->answered_at)->avg(fn ($c) => $c->waitSeconds()) ?? 0),
                    'unread' => (int) $all->sum('unread_count'),
                ],
            ]);
        } finally {
            TenantContext::bypass(false);
        }
    }

    public function showChat(SupportChat $chat): JsonResponse
    {
        TenantContext::bypass(true);

        try {
            $chat->load(['tenant:id,name,business_name,status', 'agent:id,name,email', 'messages' => fn ($q) => $q->orderBy('created_at')]);
            $chat->messages()->whereNull('read_at')->update(['read_at' => now()]);
            $chat->update(['unread_count' => 0]);

            return response()->json(['data' => SupportPresenter::chat($chat->fresh([
                'tenant', 'agent', 'messages',
            ]))]);
        } finally {
            TenantContext::bypass(false);
        }
    }

    public function updateChat(Request $request, SupportChat $chat): JsonResponse
    {
        $data = $request->validate([
            'action' => ['required', Rule::in(['claim', 'end', 'reopen', 'assign', 'escalate'])],
            'agent_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        TenantContext::bypass(true);

        try {
            $user = $request->user();

            switch ($data['action']) {
                case 'claim':
                    $chat->agent_id = $user?->id;
                    $chat->status = SupportChat::STATUS_ACTIVE;
                    $chat->answered_at = $chat->answered_at ?? now();
                    break;
                case 'assign':
                    $chat->agent_id = $data['agent_id'] ?? null;
                    $chat->status = $chat->agent_id ? SupportChat::STATUS_ACTIVE : SupportChat::STATUS_QUEUED;
                    $chat->answered_at = $chat->answered_at ?? ($chat->agent_id ? now() : null);
                    break;
                case 'end':
                    $chat->status = SupportChat::STATUS_ENDED;
                    $chat->ended_at = now();
                    break;
                case 'reopen':
                    $chat->status = SupportChat::STATUS_ACTIVE;
                    $chat->ended_at = null;
                    break;
                case 'escalate':
                    $chat = $this->escalateChat($chat, $user);
                    break;
            }

            $chat->save();
            $chat->load(['tenant:id,name,business_name,status', 'agent:id,name,email', 'messages' => fn ($q) => $q->orderBy('created_at')]);

            return response()->json(['data' => SupportPresenter::chat($chat)]);
        } finally {
            TenantContext::bypass(false);
        }
    }

    public function replyChat(Request $request, SupportChat $chat): JsonResponse
    {
        $data = $request->validate([
            'body' => ['required', 'string', 'max:4000'],
        ]);

        TenantContext::bypass(true);

        try {
            $user = $request->user();

            $message = SupportChatMessage::query()->create([
                'chat_id' => $chat->id,
                'author_id' => $user?->id,
                'author_name' => $user?->name ?? 'Support',
                'author_role' => SupportChatMessage::ROLE_AGENT,
                'body' => $data['body'],
                'read_at' => now(),
            ]);

            $chat->fill([
                'status' => $chat->status === SupportChat::STATUS_ENDED ? SupportChat::STATUS_ACTIVE : SupportChat::STATUS_ACTIVE,
                'agent_id' => $chat->agent_id ?? $user?->id,
                'answered_at' => $chat->answered_at ?? now(),
                'last_message_at' => now(),
                'unread_count' => 0,
            ])->save();

            return response()->json([
                'data' => SupportPresenter::chatMessage($message),
            ], 201);
        } finally {
            TenantContext::bypass(false);
        }
    }

    /** Promote a chat into a tracked ticket so it survives the session. */
    protected function escalateChat(SupportChat $chat, ?User $user): SupportChat
    {
        if ($chat->ticket_id) {
            return $chat;
        }

        $transcript = $chat->messages()->orderBy('created_at')->get()
            ->map(fn (SupportChatMessage $m) => '**'.$m->author_name.'**: '.$m->body)
            ->implode("\n\n");

        $ticket = SupportTicket::query()->create([
            'reference' => SupportTicket::nextReference(),
            'tenant_id' => $chat->tenant_id,
            'requester_id' => $chat->visitor_id,
            'requester_name' => $chat->visitor_name,
            'requester_email' => $chat->visitor_email,
            'requester_type' => $chat->visitor_type === 'customer' ? 'customer' : 'tenant',
            'subject' => $chat->topic ?: 'Escalated live chat',
            'summary' => Str::limit(strip_tags($transcript), 160),
            'category' => 'other',
            'channel' => 'chat',
            'status' => SupportTicket::STATUS_OPEN,
            'priority' => $chat->priority ?: 'normal',
            'assignee_id' => $chat->agent_id ?? $user?->id,
            'tags' => ['escalated-chat'],
            'last_reply_at' => now(),
            'sla_due_at' => now()->addMinutes(SupportTicket::SLA_MINUTES[$chat->priority] ?? 480),
            'messages_count' => 1,
        ]);

        SupportMessage::query()->create([
            'ticket_id' => $ticket->id,
            'author_id' => $chat->visitor_id,
            'author_name' => $chat->visitor_name,
            'author_role' => SupportMessage::ROLE_REQUESTER,
            'visibility' => SupportMessage::VISIBILITY_PUBLIC,
            'body' => "Escalated from live chat.\n\n".$transcript,
        ]);

        $chat->ticket_id = $ticket->id;

        return $chat;
    }

    // ---------------------------------------------------------------- tasks

    public function tasks(Request $request): JsonResponse
    {
        TenantContext::bypass(true);

        try {
            $query = SupportTask::query()->with([
                'tenant:id,name,business_name,status',
                'assignee:id,name,email',
                'ticket:id,reference',
            ]);

            foreach (['status', 'priority', 'owner_type'] as $field) {
                $value = $request->string($field)->toString();
                if ($value && $value !== 'all') {
                    $query->where($field, $value);
                }
            }

            if ($request->filled('tenant_id')) {
                $query->where('tenant_id', $request->integer('tenant_id'));
            }

            $assignee = $request->string('assignee')->toString();
            if ($assignee === 'unassigned') {
                $query->whereNull('assignee_id');
            } elseif ($assignee && $assignee !== 'all') {
                $query->where('assignee_id', (int) $assignee);
            }

            if ($term = trim((string) $request->string('q'))) {
                $like = '%'.$term.'%';
                $query->where(fn ($q) => $q->where('title', 'like', $like)->orWhere('description', 'like', $like));
            }

            $tasks = $query->orderBy('position')->orderByDesc('id')->get();
            $all = SupportTask::query()->get();

            return response()->json([
                'data' => $tasks->map(fn (SupportTask $t) => SupportPresenter::task($t))->all(),
                'summary' => [
                    'total' => $all->count(),
                    'open' => $all->where('status', '!=', SupportTask::STATUS_DONE)->count(),
                    'overdue' => $all->filter(fn ($t) => $t->isOverdue())->count(),
                    'due_today' => $all->filter(fn ($t) => $t->due_at && $t->due_at->isToday() && $t->status !== SupportTask::STATUS_DONE)->count(),
                    'done_this_week' => $all->filter(fn ($t) => $t->completed_at && $t->completed_at->gte(now()->startOfWeek()))->count(),
                    'by_status' => collect(SupportTask::STATUSES)
                        ->mapWithKeys(fn ($s) => [$s => $all->where('status', $s)->count()]),
                ],
            ]);
        } finally {
            TenantContext::bypass(false);
        }
    }

    public function storeTask(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:180'],
            'description' => ['nullable', 'string', 'max:4000'],
            'status' => ['nullable', Rule::in(SupportTask::STATUSES)],
            'priority' => ['nullable', Rule::in(SupportTask::PRIORITIES)],
            'owner_type' => ['nullable', Rule::in(SupportTask::OWNER_TYPES)],
            'tenant_id' => ['nullable', 'integer', 'exists:tenants,id'],
            'ticket_id' => ['nullable', 'integer', 'exists:support_tickets,id'],
            'assignee_id' => ['nullable', 'integer', 'exists:users,id'],
            'due_at' => ['nullable', 'date'],
            'checklist' => ['nullable', 'array'],
            'labels' => ['nullable', 'array'],
        ]);

        TenantContext::bypass(true);

        try {
            $task = SupportTask::query()->create(array_merge($data, [
                'status' => $data['status'] ?? SupportTask::STATUS_TODO,
                'priority' => $data['priority'] ?? 'normal',
                'owner_type' => $data['owner_type'] ?? 'support',
                'created_by' => $request->user()?->id,
                'position' => (int) SupportTask::query()->max('position') + 1,
            ]));

            $task->load(['tenant:id,name,business_name,status', 'assignee:id,name,email', 'ticket:id,reference']);

            return response()->json(['data' => SupportPresenter::task($task)], 201);
        } finally {
            TenantContext::bypass(false);
        }
    }

    public function updateTask(Request $request, SupportTask $task): JsonResponse
    {
        $data = $request->validate([
            'title' => ['nullable', 'string', 'max:180'],
            'description' => ['nullable', 'string', 'max:4000'],
            'status' => ['nullable', Rule::in(SupportTask::STATUSES)],
            'priority' => ['nullable', Rule::in(SupportTask::PRIORITIES)],
            'owner_type' => ['nullable', Rule::in(SupportTask::OWNER_TYPES)],
            'tenant_id' => ['nullable', 'integer', 'exists:tenants,id'],
            'assignee_id' => ['nullable', 'integer', 'exists:users,id'],
            'due_at' => ['nullable', 'date'],
            'checklist' => ['nullable', 'array'],
            'labels' => ['nullable', 'array'],
            'position' => ['nullable', 'integer'],
        ]);

        TenantContext::bypass(true);

        try {
            if (($data['status'] ?? null) === SupportTask::STATUS_DONE) {
                $task->completed_at = now();
            } elseif (! empty($data['status'])) {
                $task->completed_at = null;
            }

            $task->fill($data)->save();
            $task->load(['tenant:id,name,business_name,status', 'assignee:id,name,email', 'ticket:id,reference']);

            return response()->json(['data' => SupportPresenter::task($task)]);
        } finally {
            TenantContext::bypass(false);
        }
    }

    public function destroyTask(SupportTask $task): JsonResponse
    {
        TenantContext::bypass(true);

        try {
            $task->delete();

            return response()->json(['data' => ['deleted' => true]]);
        } finally {
            TenantContext::bypass(false);
        }
    }

    // --------------------------------------------------------------- guides

    public function guides(Request $request): JsonResponse
    {
        $query = HelpArticle::query()->with(['category', 'author:id,name']);

        foreach (['status', 'audience'] as $field) {
            $value = $request->string($field)->toString();
            if ($value && $value !== 'all') {
                $query->where($field, $value);
            }
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->integer('category_id'));
        }

        if ($term = trim((string) $request->string('q'))) {
            $like = '%'.$term.'%';
            $query->where(fn ($q) => $q->where('title', 'like', $like)
                ->orWhere('excerpt', 'like', $like)
                ->orWhere('body', 'like', $like));
        }

        $articles = $query->orderByDesc('is_pinned')->orderByDesc('updated_at')->get();
        $all = HelpArticle::query()->get();

        return response()->json([
            'data' => [
                'categories' => HelpCategory::query()
                    ->withCount('articles')
                    ->orderBy('position')
                    ->get()
                    ->map(fn (HelpCategory $c) => [
                        'id' => $c->id,
                        'name' => $c->name,
                        'slug' => $c->slug,
                        'description' => $c->description,
                        'icon' => $c->icon,
                        'position' => $c->position,
                        'articles_count' => $c->articles_count,
                    ])->all(),
                'articles' => $articles->map(fn (HelpArticle $a) => SupportPresenter::article($a))->all(),
            ],
            'summary' => [
                'total' => $all->count(),
                'published' => $all->where('status', HelpArticle::STATUS_PUBLISHED)->count(),
                'draft' => $all->where('status', HelpArticle::STATUS_DRAFT)->count(),
                'review' => $all->where('status', HelpArticle::STATUS_REVIEW)->count(),
                'views' => (int) $all->sum('views'),
                'avg_helpful' => (int) round($all->filter(fn ($a) => $a->helpfulScore() !== null)->avg(fn ($a) => $a->helpfulScore()) ?? 0),
            ],
        ]);
    }

    public function storeGuide(Request $request): JsonResponse
    {
        $data = $this->validateGuide($request, true);

        $article = HelpArticle::query()->create(array_merge($data, [
            'slug' => $this->uniqueSlug($data['title']),
            'author_id' => $request->user()?->id,
            'published_at' => ($data['status'] ?? 'draft') === HelpArticle::STATUS_PUBLISHED ? now() : null,
            'read_minutes' => $this->readMinutes($data['body'] ?? ''),
        ]));

        $article->load(['category', 'author:id,name']);

        return response()->json(['data' => SupportPresenter::article($article)], 201);
    }

    public function updateGuide(Request $request, HelpArticle $guide): JsonResponse
    {
        $data = $this->validateGuide($request, false);

        if (! empty($data['status']) && $data['status'] === HelpArticle::STATUS_PUBLISHED && ! $guide->published_at) {
            $data['published_at'] = now();
        }

        if (array_key_exists('body', $data)) {
            $data['read_minutes'] = $this->readMinutes((string) $data['body']);
        }

        $guide->fill($data)->save();
        $guide->load(['category', 'author:id,name']);

        return response()->json(['data' => SupportPresenter::article($guide)]);
    }

    public function destroyGuide(HelpArticle $guide): JsonResponse
    {
        $guide->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    public function storeGuideCategory(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:240'],
            'icon' => ['nullable', 'string', 'max:40'],
        ]);

        $category = HelpCategory::query()->create([
            'name' => $data['name'],
            'slug' => Str::slug($data['name']).'-'.Str::lower(Str::random(4)),
            'description' => $data['description'] ?? null,
            'icon' => $data['icon'] ?? 'book',
            'position' => (int) HelpCategory::query()->max('position') + 1,
        ]);

        return response()->json(['data' => $category], 201);
    }

    // ------------------------------------------------------- canned replies

    public function cannedReplies(): JsonResponse
    {
        return response()->json([
            'data' => SupportCannedReply::query()->orderByDesc('uses')->get(),
        ]);
    }

    public function storeCannedReply(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:140'],
            'shortcut' => ['nullable', 'string', 'max:40'],
            'category' => ['nullable', 'string', 'max:60'],
            'body' => ['required', 'string', 'max:4000'],
        ]);

        $reply = SupportCannedReply::query()->create(array_merge($data, [
            'category' => $data['category'] ?? 'general',
            'created_by' => $request->user()?->id,
        ]));

        return response()->json(['data' => $reply], 201);
    }

    // --------------------------------------------------------------- agents

    public function agents(): JsonResponse
    {
        return response()->json(['data' => $this->agentWorkload()]);
    }

    /** Super admins + platform staff, with their current ticket load. */
    protected function agentWorkload(): array
    {
        TenantContext::bypass(true);

        try {
            $agents = User::query()
                ->whereHas('roles', fn ($q) => $q->whereIn('role', ['super_admin', 'support_agent']))
                ->get();

            if ($agents->isEmpty()) {
                $agents = User::query()->whereHas('roles', fn ($q) => $q->where('role', 'super_admin'))->get();
            }

            $tickets = SupportTicket::query()->whereIn('status', SupportTicket::OPEN_STATUSES)->get()->groupBy('assignee_id');
            $chats = SupportChat::query()->where('status', SupportChat::STATUS_ACTIVE)->get()->groupBy('agent_id');
            $tasks = SupportTask::query()->where('status', '!=', SupportTask::STATUS_DONE)->get()->groupBy('assignee_id');
            $rated = SupportTicket::query()->whereNotNull('satisfaction')->get()->groupBy('assignee_id');

            return $agents->map(function (User $user) use ($tickets, $chats, $tasks, $rated) {
                $theirRatings = $rated->get($user->id);

                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'open_tickets' => $tickets->get($user->id)?->count() ?? 0,
                    'active_chats' => $chats->get($user->id)?->count() ?? 0,
                    'open_tasks' => $tasks->get($user->id)?->count() ?? 0,
                    'csat' => $theirRatings && $theirRatings->count() ? round($theirRatings->avg('satisfaction'), 2) : null,
                    'status' => 'online',
                ];
            })->values()->all();
        } finally {
            TenantContext::bypass(false);
        }
    }

    protected function topTenants($tickets): array
    {
        $ids = $tickets->whereNotNull('tenant_id')->groupBy('tenant_id')
            ->map->count()
            ->sortDesc()
            ->take(5);

        if ($ids->isEmpty()) {
            return [];
        }

        $tenants = Tenant::query()->whereIn('id', $ids->keys())->get()->keyBy('id');

        return $ids->map(fn ($count, $id) => [
            'id' => (int) $id,
            'name' => $tenants[$id]->business_name ?? $tenants[$id]->name ?? 'Tenant #'.$id,
            'tickets' => $count,
            'open' => $tickets->where('tenant_id', (int) $id)->whereIn('status', SupportTicket::OPEN_STATUSES)->count(),
        ])->values()->all();
    }

    protected function validateGuide(Request $request, bool $creating): array
    {
        return $request->validate([
            'title' => [$creating ? 'required' : 'nullable', 'string', 'max:180'],
            'excerpt' => ['nullable', 'string', 'max:300'],
            'body' => [$creating ? 'required' : 'nullable', 'string', 'max:40000'],
            'category_id' => ['nullable', 'integer', 'exists:help_categories,id'],
            'status' => ['nullable', Rule::in(HelpArticle::STATUSES)],
            'audience' => ['nullable', Rule::in(HelpArticle::AUDIENCES)],
            'tags' => ['nullable', 'array'],
            'is_pinned' => ['nullable', 'boolean'],
        ]);
    }

    protected function uniqueSlug(string $title): string
    {
        $base = Str::slug($title) ?: 'guide';
        $slug = $base;
        $i = 2;
        while (HelpArticle::query()->where('slug', $slug)->exists()) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }

    protected function readMinutes(string $body): int
    {
        return max(1, (int) ceil(str_word_count(strip_tags($body)) / 200));
    }
}
