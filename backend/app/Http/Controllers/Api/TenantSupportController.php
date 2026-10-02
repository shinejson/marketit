<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HelpArticle;
use App\Models\HelpCategory;
use App\Models\SupportChat;
use App\Models\SupportChatMessage;
use App\Models\SupportMessage;
use App\Models\SupportTask;
use App\Models\SupportTicket;
use App\Support\SupportPresenter;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Tenant-facing help centre: raise and follow tickets, chat with the platform
 * support team, work through assigned tasks and read published guides.
 *
 * Every query is pinned to the authenticated tenant.
 */
class TenantSupportController extends Controller
{
    public function overview(Request $request): JsonResponse
    {
        $tenantId = $this->tenantId();

        TenantContext::bypass(true);

        try {
            $tickets = SupportTicket::query()->where('tenant_id', $tenantId)->get();
            $tasks = SupportTask::query()->where('tenant_id', $tenantId)->where('owner_type', 'tenant')->get();
            $chat = $this->currentChat($request, false);

            return response()->json(['data' => [
                'tickets' => [
                    'open' => $tickets->whereIn('status', SupportTicket::OPEN_STATUSES)->count(),
                    'awaiting_you' => $tickets->where('status', SupportTicket::STATUS_PENDING)->count(),
                    'resolved' => $tickets->whereIn('status', [SupportTicket::STATUS_RESOLVED, SupportTicket::STATUS_CLOSED])->count(),
                    'total' => $tickets->count(),
                ],
                'tasks' => [
                    'open' => $tasks->where('status', '!=', SupportTask::STATUS_DONE)->count(),
                    'overdue' => $tasks->filter(fn ($t) => $t->isOverdue())->count(),
                    'done' => $tasks->where('status', SupportTask::STATUS_DONE)->count(),
                    'total' => $tasks->count(),
                ],
                'chat' => [
                    'status' => $chat?->status ?? 'none',
                    'unread' => $chat?->unread_count ?? 0,
                ],
                'guides' => [
                    'published' => HelpArticle::query()->published()->whereIn('audience', ['tenant', 'all'])->count(),
                ],
            ]]);
        } finally {
            TenantContext::bypass(false);
        }
    }

    // -------------------------------------------------------------- tickets

    public function tickets(Request $request): JsonResponse
    {
        $tenantId = $this->tenantId();

        TenantContext::bypass(true);

        try {
            $query = SupportTicket::query()
                ->where('tenant_id', $tenantId)
                ->with(['assignee:id,name,email']);

            $status = $request->string('status')->toString();
            if ($status === 'open') {
                $query->open();
            } elseif ($status && $status !== 'all') {
                $query->where('status', $status);
            }

            if ($term = trim((string) $request->string('q'))) {
                $like = '%'.$term.'%';
                $query->where(fn ($q) => $q->where('subject', 'like', $like)->orWhere('reference', 'like', $like));
            }

            $tickets = $query->orderByDesc('last_reply_at')->orderByDesc('id')->limit(100)->get();

            return response()->json([
                'data' => $tickets->map(fn (SupportTicket $t) => SupportPresenter::ticket($t, false))->all(),
            ]);
        } finally {
            TenantContext::bypass(false);
        }
    }

    public function showTicket(SupportTicket $ticket): JsonResponse
    {
        $this->authorizeTicket($ticket);

        TenantContext::bypass(true);

        try {
            $ticket->load(['assignee:id,name,email', 'messages' => fn ($q) => $q->orderBy('created_at')]);

            return response()->json(['data' => SupportPresenter::ticket($ticket, false)]);
        } finally {
            TenantContext::bypass(false);
        }
    }

    public function storeTicket(Request $request): JsonResponse
    {
        $data = $request->validate([
            'subject' => ['required', 'string', 'max:180'],
            'body' => ['required', 'string', 'max:8000'],
            'category' => ['nullable', Rule::in(SupportTicket::CATEGORIES)],
            'priority' => ['nullable', Rule::in(['low', 'normal', 'high', 'urgent'])],
        ]);

        $user = $request->user();
        $tenantId = $this->tenantId();

        TenantContext::bypass(true);

        try {
            $priority = $data['priority'] ?? 'normal';

            $ticket = SupportTicket::query()->create([
                'reference' => SupportTicket::nextReference(),
                'tenant_id' => $tenantId,
                'requester_id' => $user?->id,
                'requester_name' => $user?->name ?? 'Tenant',
                'requester_email' => $user?->email,
                'requester_type' => 'tenant',
                'subject' => $data['subject'],
                'summary' => Str::limit(strip_tags($data['body']), 160),
                'category' => $data['category'] ?? 'other',
                'channel' => 'portal',
                'status' => SupportTicket::STATUS_NEW,
                'priority' => $priority,
                'tags' => [],
                'last_reply_at' => now(),
                'sla_due_at' => now()->addMinutes(SupportTicket::SLA_MINUTES[$priority] ?? 480),
                'messages_count' => 1,
            ]);

            SupportMessage::query()->create([
                'ticket_id' => $ticket->id,
                'author_id' => $user?->id,
                'author_name' => $user?->name ?? 'Tenant',
                'author_role' => SupportMessage::ROLE_REQUESTER,
                'visibility' => SupportMessage::VISIBILITY_PUBLIC,
                'body' => $data['body'],
            ]);

            $ticket->load(['messages' => fn ($q) => $q->orderBy('created_at')]);

            return response()->json(['data' => SupportPresenter::ticket($ticket, false)], 201);
        } finally {
            TenantContext::bypass(false);
        }
    }

    public function replyTicket(Request $request, SupportTicket $ticket): JsonResponse
    {
        $this->authorizeTicket($ticket);

        $data = $request->validate([
            'body' => ['required', 'string', 'max:8000'],
        ]);

        $user = $request->user();

        TenantContext::bypass(true);

        try {
            SupportMessage::query()->create([
                'ticket_id' => $ticket->id,
                'author_id' => $user?->id,
                'author_name' => $user?->name ?? 'Tenant',
                'author_role' => SupportMessage::ROLE_REQUESTER,
                'visibility' => SupportMessage::VISIBILITY_PUBLIC,
                'body' => $data['body'],
            ]);

            $ticket->last_reply_at = now();
            $ticket->messages_count = $ticket->messages()->count();
            if (in_array($ticket->status, [SupportTicket::STATUS_RESOLVED, SupportTicket::STATUS_CLOSED, SupportTicket::STATUS_PENDING], true)) {
                $ticket->status = SupportTicket::STATUS_OPEN;
                $ticket->resolved_at = null;
                $ticket->closed_at = null;
            }
            $ticket->save();

            $ticket->load(['assignee:id,name,email', 'messages' => fn ($q) => $q->orderBy('created_at')]);

            return response()->json(['data' => SupportPresenter::ticket($ticket, false)], 201);
        } finally {
            TenantContext::bypass(false);
        }
    }

    public function rateTicket(Request $request, SupportTicket $ticket): JsonResponse
    {
        $this->authorizeTicket($ticket);

        $data = $request->validate([
            'satisfaction' => ['required', 'integer', 'min:1', 'max:5'],
            'satisfaction_comment' => ['nullable', 'string', 'max:300'],
        ]);

        TenantContext::bypass(true);

        try {
            $ticket->fill($data)->save();

            return response()->json(['data' => SupportPresenter::ticket($ticket, false)]);
        } finally {
            TenantContext::bypass(false);
        }
    }

    // ----------------------------------------------------------------- chat

    public function chat(Request $request): JsonResponse
    {
        TenantContext::bypass(true);

        try {
            $chat = $this->currentChat($request, true);
            $chat->load(['agent:id,name,email', 'messages' => fn ($q) => $q->orderBy('created_at')]);

            return response()->json(['data' => SupportPresenter::chat($chat)]);
        } finally {
            TenantContext::bypass(false);
        }
    }

    public function sendChatMessage(Request $request): JsonResponse
    {
        $data = $request->validate([
            'body' => ['required', 'string', 'max:4000'],
        ]);

        $user = $request->user();

        TenantContext::bypass(true);

        try {
            $chat = $this->currentChat($request, true);

            $message = SupportChatMessage::query()->create([
                'chat_id' => $chat->id,
                'author_id' => $user?->id,
                'author_name' => $user?->name ?? 'Tenant',
                'author_role' => SupportChatMessage::ROLE_VISITOR,
                'body' => $data['body'],
            ]);

            $chat->fill([
                'last_message_at' => now(),
                'unread_count' => $chat->unread_count + 1,
                'status' => $chat->status === SupportChat::STATUS_ENDED ? SupportChat::STATUS_QUEUED : $chat->status,
            ])->save();

            return response()->json(['data' => SupportPresenter::chatMessage($message)], 201);
        } finally {
            TenantContext::bypass(false);
        }
    }

    // ---------------------------------------------------------------- tasks

    public function tasks(Request $request): JsonResponse
    {
        $tenantId = $this->tenantId();

        TenantContext::bypass(true);

        try {
            $tasks = SupportTask::query()
                ->where('tenant_id', $tenantId)
                ->where('owner_type', 'tenant')
                ->with(['ticket:id,reference', 'assignee:id,name,email'])
                ->orderBy('position')
                ->get();

            return response()->json(['data' => $tasks->map(fn (SupportTask $t) => SupportPresenter::task($t))->all()]);
        } finally {
            TenantContext::bypass(false);
        }
    }

    public function updateTask(Request $request, SupportTask $task): JsonResponse
    {
        if ($task->tenant_id !== $this->tenantId() || $task->owner_type !== 'tenant') {
            throw new NotFoundHttpException('Task not found.');
        }

        $data = $request->validate([
            'status' => ['nullable', Rule::in(SupportTask::STATUSES)],
            'checklist' => ['nullable', 'array'],
        ]);

        TenantContext::bypass(true);

        try {
            if (($data['status'] ?? null) === SupportTask::STATUS_DONE) {
                $task->completed_at = now();
            } elseif (! empty($data['status'])) {
                $task->completed_at = null;
            }

            $task->fill($data)->save();
            $task->load(['ticket:id,reference', 'assignee:id,name,email']);

            return response()->json(['data' => SupportPresenter::task($task)]);
        } finally {
            TenantContext::bypass(false);
        }
    }

    // --------------------------------------------------------------- guides

    public function guides(Request $request): JsonResponse
    {
        $query = HelpArticle::query()
            ->published()
            ->whereIn('audience', ['tenant', 'all'])
            ->with('category');

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->integer('category_id'));
        }

        if ($term = trim((string) $request->string('q'))) {
            $like = '%'.$term.'%';
            $query->where(fn ($q) => $q->where('title', 'like', $like)
                ->orWhere('excerpt', 'like', $like)
                ->orWhere('body', 'like', $like));
        }

        $articles = $query->orderByDesc('is_pinned')->orderByDesc('views')->get();

        return response()->json(['data' => [
            'categories' => HelpCategory::query()->orderBy('position')->get(),
            'articles' => $articles->map(fn (HelpArticle $a) => SupportPresenter::article($a))->all(),
        ]]);
    }

    public function readGuide(HelpArticle $guide): JsonResponse
    {
        $guide->increment('views');
        $guide->load('category');

        return response()->json(['data' => SupportPresenter::article($guide)]);
    }

    public function rateGuide(Request $request, HelpArticle $guide): JsonResponse
    {
        $data = $request->validate([
            'helpful' => ['required', 'boolean'],
        ]);

        $guide->increment($data['helpful'] ? 'helpful_yes' : 'helpful_no');

        return response()->json(['data' => SupportPresenter::article($guide->fresh(), false)]);
    }

    // -------------------------------------------------------------- helpers

    protected function tenantId(): int
    {
        $id = TenantContext::id();

        if (! $id) {
            throw new NotFoundHttpException('No tenant context.');
        }

        return $id;
    }

    protected function authorizeTicket(SupportTicket $ticket): void
    {
        if ($ticket->tenant_id !== $this->tenantId()) {
            throw new NotFoundHttpException('Ticket not found.');
        }
    }

    /** The tenant's live chat session, creating one on demand. */
    protected function currentChat(Request $request, bool $create): ?SupportChat
    {
        $tenantId = TenantContext::id();
        $user = $request->user();

        $chat = SupportChat::query()
            ->where('tenant_id', $tenantId)
            ->whereIn('status', [SupportChat::STATUS_QUEUED, SupportChat::STATUS_ACTIVE])
            ->orderByDesc('id')
            ->first();

        if ($chat || ! $create) {
            return $chat;
        }

        return SupportChat::query()->create([
            'tenant_id' => $tenantId,
            'visitor_id' => $user?->id,
            'visitor_name' => $user?->name ?? 'Tenant',
            'visitor_email' => $user?->email,
            'visitor_type' => 'tenant',
            'topic' => 'Tenant console chat',
            'status' => SupportChat::STATUS_QUEUED,
            'priority' => 'normal',
            'started_at' => now(),
            'last_message_at' => now(),
        ]);
    }
}
