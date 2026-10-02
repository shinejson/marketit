<?php

namespace App\Support;

use App\Models\HelpArticle;
use App\Models\SupportChat;
use App\Models\SupportChatMessage;
use App\Models\SupportMessage;
use App\Models\SupportTask;
use App\Models\SupportTicket;

/**
 * Shared JSON shapes for the service-desk API so the super-admin console and
 * the tenant help centre render from identical payloads.
 */
class SupportPresenter
{
    public static function ticket(SupportTicket $ticket, bool $includeInternal = true): array
    {
        return [
            'id' => $ticket->id,
            'reference' => $ticket->reference,
            'subject' => $ticket->subject,
            'summary' => $ticket->summary,
            'category' => $ticket->category,
            'channel' => $ticket->channel,
            'status' => $ticket->status,
            'priority' => $ticket->priority,
            'tags' => $ticket->tags ?? [],
            'tenant' => $ticket->relationLoaded('tenant') && $ticket->tenant
                ? ['id' => $ticket->tenant->id, 'name' => $ticket->tenant->business_name ?: $ticket->tenant->name, 'status' => $ticket->tenant->status]
                : null,
            'requester' => [
                'id' => $ticket->requester_id,
                'name' => $ticket->requester_name,
                'email' => $ticket->requester_email,
                'type' => $ticket->requester_type,
            ],
            'assignee' => $ticket->relationLoaded('assignee') && $ticket->assignee
                ? ['id' => $ticket->assignee->id, 'name' => $ticket->assignee->name, 'email' => $ticket->assignee->email]
                : null,
            'first_response_at' => optional($ticket->first_response_at)->toIso8601String(),
            'last_reply_at' => optional($ticket->last_reply_at)->toIso8601String(),
            'resolved_at' => optional($ticket->resolved_at)->toIso8601String(),
            'closed_at' => optional($ticket->closed_at)->toIso8601String(),
            'sla_due_at' => optional($ticket->sla_due_at)->toIso8601String(),
            'sla_minutes_remaining' => $ticket->slaMinutesRemaining(),
            'sla_breached' => (bool) $ticket->sla_breached,
            'satisfaction' => $ticket->satisfaction,
            'satisfaction_comment' => $ticket->satisfaction_comment,
            'messages_count' => $ticket->messages_count,
            'created_at' => optional($ticket->created_at)->toIso8601String(),
            'updated_at' => optional($ticket->updated_at)->toIso8601String(),
            'messages' => $ticket->relationLoaded('messages')
                ? $ticket->messages
                    ->filter(fn (SupportMessage $m) => $includeInternal || $m->visibility === SupportMessage::VISIBILITY_PUBLIC)
                    ->values()
                    ->map(fn (SupportMessage $m) => self::message($m))
                    ->all()
                : null,
            'tasks' => $ticket->relationLoaded('tasks')
                ? $ticket->tasks->map(fn (SupportTask $t) => self::task($t))->all()
                : null,
        ];
    }

    public static function message(SupportMessage $message): array
    {
        return [
            'id' => $message->id,
            'ticket_id' => $message->ticket_id,
            'author_id' => $message->author_id,
            'author_name' => $message->author_name,
            'author_role' => $message->author_role,
            'visibility' => $message->visibility,
            'body' => $message->body,
            'attachments' => $message->attachments ?? [],
            'created_at' => optional($message->created_at)->toIso8601String(),
        ];
    }

    public static function chat(SupportChat $chat): array
    {
        return [
            'id' => $chat->id,
            'topic' => $chat->topic,
            'status' => $chat->status,
            'priority' => $chat->priority,
            'visitor' => [
                'id' => $chat->visitor_id,
                'name' => $chat->visitor_name,
                'email' => $chat->visitor_email,
                'type' => $chat->visitor_type,
            ],
            'tenant' => $chat->relationLoaded('tenant') && $chat->tenant
                ? ['id' => $chat->tenant->id, 'name' => $chat->tenant->business_name ?: $chat->tenant->name, 'status' => $chat->tenant->status]
                : null,
            'agent' => $chat->relationLoaded('agent') && $chat->agent
                ? ['id' => $chat->agent->id, 'name' => $chat->agent->name, 'email' => $chat->agent->email]
                : null,
            'ticket_id' => $chat->ticket_id,
            'started_at' => optional($chat->started_at)->toIso8601String(),
            'answered_at' => optional($chat->answered_at)->toIso8601String(),
            'ended_at' => optional($chat->ended_at)->toIso8601String(),
            'last_message_at' => optional($chat->last_message_at)->toIso8601String(),
            'wait_seconds' => $chat->waitSeconds(),
            'unread_count' => $chat->unread_count,
            'rating' => $chat->rating,
            'messages' => $chat->relationLoaded('messages')
                ? $chat->messages->map(fn (SupportChatMessage $m) => self::chatMessage($m))->all()
                : null,
        ];
    }

    public static function chatMessage(SupportChatMessage $message): array
    {
        return [
            'id' => $message->id,
            'chat_id' => $message->chat_id,
            'author_id' => $message->author_id,
            'author_name' => $message->author_name,
            'author_role' => $message->author_role,
            'body' => $message->body,
            'read_at' => optional($message->read_at)->toIso8601String(),
            'created_at' => optional($message->created_at)->toIso8601String(),
        ];
    }

    public static function task(SupportTask $task): array
    {
        return [
            'id' => $task->id,
            'title' => $task->title,
            'description' => $task->description,
            'status' => $task->status,
            'priority' => $task->priority,
            'owner_type' => $task->owner_type,
            'ticket_id' => $task->ticket_id,
            'ticket_reference' => $task->relationLoaded('ticket') && $task->ticket ? $task->ticket->reference : null,
            'tenant' => $task->relationLoaded('tenant') && $task->tenant
                ? ['id' => $task->tenant->id, 'name' => $task->tenant->business_name ?: $task->tenant->name, 'status' => $task->tenant->status]
                : null,
            'assignee' => $task->relationLoaded('assignee') && $task->assignee
                ? ['id' => $task->assignee->id, 'name' => $task->assignee->name, 'email' => $task->assignee->email]
                : null,
            'due_at' => optional($task->due_at)->toIso8601String(),
            'completed_at' => optional($task->completed_at)->toIso8601String(),
            'checklist' => $task->checklist ?? [],
            'labels' => $task->labels ?? [],
            'position' => $task->position,
            'overdue' => $task->isOverdue(),
            'created_at' => optional($task->created_at)->toIso8601String(),
        ];
    }

    public static function article(HelpArticle $article, bool $withBody = true): array
    {
        $payload = [
            'id' => $article->id,
            'category_id' => $article->category_id,
            'category' => $article->relationLoaded('category') && $article->category
                ? ['id' => $article->category->id, 'name' => $article->category->name, 'slug' => $article->category->slug, 'icon' => $article->category->icon]
                : null,
            'title' => $article->title,
            'slug' => $article->slug,
            'excerpt' => $article->excerpt,
            'status' => $article->status,
            'audience' => $article->audience,
            'tags' => $article->tags ?? [],
            'is_pinned' => (bool) $article->is_pinned,
            'read_minutes' => $article->read_minutes,
            'views' => $article->views,
            'helpful_yes' => $article->helpful_yes,
            'helpful_no' => $article->helpful_no,
            'helpful_score' => $article->helpfulScore(),
            'author' => $article->relationLoaded('author') && $article->author
                ? ['id' => $article->author->id, 'name' => $article->author->name]
                : null,
            'published_at' => optional($article->published_at)->toIso8601String(),
            'updated_at' => optional($article->updated_at)->toIso8601String(),
        ];

        if ($withBody) {
            $payload['body'] = $article->body;
        }

        return $payload;
    }
}
