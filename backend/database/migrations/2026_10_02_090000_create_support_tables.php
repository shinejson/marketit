<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // --------------------------------------------------------- service desk
        // A ticket is one support request raised by a tenant, a staff member of a
        // tenant, or a marketplace customer. Tickets carry SLA timers so the
        // console can surface breaches, and a denormalised requester snapshot so
        // the inbox renders without extra joins.
        Schema::create('support_tickets', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique();            // TKT-10427
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->foreignId('requester_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('requester_name');
            $table->string('requester_email')->nullable();
            $table->string('requester_type')->default('tenant'); // tenant | customer | internal
            $table->string('subject');
            $table->text('summary')->nullable();
            $table->string('category')->default('other');        // billing | payouts | orders | catalog | technical | account | onboarding | other
            $table->string('channel')->default('portal');        // portal | email | chat | phone | whatsapp
            $table->string('status')->default('new');            // new | open | pending | on_hold | resolved | closed
            $table->string('priority')->default('normal');       // low | normal | high | urgent
            $table->foreignId('assignee_id')->nullable()->constrained('users')->nullOnDelete();
            $table->json('tags')->nullable();
            $table->timestamp('first_response_at')->nullable();
            $table->timestamp('last_reply_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->timestamp('sla_due_at')->nullable();
            $table->boolean('sla_breached')->default(false);
            $table->unsignedSmallInteger('satisfaction')->nullable(); // 1..5
            $table->string('satisfaction_comment')->nullable();
            $table->unsignedInteger('messages_count')->default(0);
            $table->timestamps();

            $table->index(['status', 'priority']);
            $table->index(['tenant_id', 'status']);
            $table->index('assignee_id');
        });

        // Every reply on a ticket. `visibility = internal` keeps agent-only notes
        // out of the tenant-facing thread.
        Schema::create('support_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_id')->constrained('support_tickets')->cascadeOnDelete();
            $table->foreignId('author_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('author_name');
            $table->string('author_role')->default('agent');   // agent | requester | system
            $table->string('visibility')->default('public');   // public | internal
            $table->text('body');
            $table->json('attachments')->nullable();
            $table->timestamps();

            $table->index(['ticket_id', 'created_at']);
        });

        // --------------------------------------------------------- live chat
        // Short-lived conversations from the in-product chat widget. They can be
        // escalated into a ticket, which links the two records together.
        Schema::create('support_chats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->foreignId('visitor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('visitor_name');
            $table->string('visitor_email')->nullable();
            $table->string('visitor_type')->default('tenant'); // tenant | customer | guest
            $table->string('topic')->nullable();
            $table->string('status')->default('queued');       // queued | active | ended
            $table->string('priority')->default('normal');
            $table->foreignId('agent_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('ticket_id')->nullable()->constrained('support_tickets')->nullOnDelete();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('answered_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->timestamp('last_message_at')->nullable();
            $table->unsignedInteger('unread_count')->default(0);
            $table->unsignedSmallInteger('rating')->nullable();
            $table->timestamps();

            $table->index(['status', 'last_message_at']);
        });

        Schema::create('support_chat_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chat_id')->constrained('support_chats')->cascadeOnDelete();
            $table->foreignId('author_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('author_name');
            $table->string('author_role')->default('agent');   // agent | visitor | bot | system
            $table->text('body');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['chat_id', 'created_at']);
        });

        // --------------------------------------------------------- tasks
        // Service tasks: internal follow-ups owned by the support team, or
        // onboarding/compliance work handed to a tenant.
        Schema::create('support_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->foreignId('ticket_id')->nullable()->constrained('support_tickets')->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('status')->default('todo');      // todo | in_progress | blocked | review | done
            $table->string('priority')->default('normal');  // low | normal | high | urgent
            $table->string('owner_type')->default('support'); // support | tenant
            $table->foreignId('assignee_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('due_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->json('checklist')->nullable();          // [{ label, done }]
            $table->json('labels')->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();

            $table->index(['status', 'position']);
            $table->index(['tenant_id', 'status']);
        });

        // --------------------------------------------------------- help centre
        Schema::create('help_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('description')->nullable();
            $table->string('icon')->default('book');
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });

        Schema::create('help_articles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->nullable()->constrained('help_categories')->nullOnDelete();
            $table->string('title');
            $table->string('slug')->unique();
            $table->string('excerpt')->nullable();
            $table->longText('body')->nullable();           // markdown-ish
            $table->string('status')->default('draft');     // draft | review | published | archived
            $table->string('audience')->default('tenant');  // tenant | customer | internal | all
            $table->json('tags')->nullable();
            $table->boolean('is_pinned')->default(false);
            $table->unsignedSmallInteger('read_minutes')->default(3);
            $table->unsignedInteger('views')->default(0);
            $table->unsignedInteger('helpful_yes')->default(0);
            $table->unsignedInteger('helpful_no')->default(0);
            $table->foreignId('author_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'audience']);
        });

        // Reusable agent replies ("macros") surfaced in the ticket composer.
        Schema::create('support_canned_replies', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('shortcut')->nullable();
            $table->string('category')->default('general');
            $table->text('body');
            $table->unsignedInteger('uses')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_canned_replies');
        Schema::dropIfExists('help_articles');
        Schema::dropIfExists('help_categories');
        Schema::dropIfExists('support_tasks');
        Schema::dropIfExists('support_chat_messages');
        Schema::dropIfExists('support_chats');
        Schema::dropIfExists('support_messages');
        Schema::dropIfExists('support_tickets');
    }
};
