<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * §12 / §18 / §27 — Refunds and disputes.
 *
 * A refund is always tied to one seller order so the settlement ledger can be
 * adjusted (gross stays, refund_amount grows, commission is reversed pro
 * rata). Disputes are the escalation path: customer → seller → platform, with
 * a threaded message log and an admin resolution.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('refunds', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 48)->unique();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('seller_order_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('tenant_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('payment_transaction_id')->nullable()->constrained()->nullOnDelete();
            // Set when the refund was the outcome of a dispute. Kept as a
            // plain column (disputes is created after this table and SQLite
            // cannot add a foreign key to an existing table).
            $table->unsignedBigInteger('dispute_id')->nullable();
            $table->foreignId('requested_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            // full | partial | shipping_only | goodwill
            $table->string('type', 24)->default('partial');
            $table->string('reason', 48)->default('other');
            $table->text('customer_note')->nullable();
            // requested | approved | processing | completed | rejected | failed
            $table->string('status', 24)->default('requested');
            $table->decimal('amount', 12, 2)->default(0);
            $table->decimal('commission_reversal', 12, 2)->default(0);
            $table->decimal('delivery_refund', 12, 2)->default(0);
            $table->decimal('net_seller_impact', 12, 2)->default(0);
            $table->string('currency', 3)->default('USD');
            $table->boolean('restock')->default(true);
            $table->string('gateway_ref')->nullable();
            $table->text('decision_note')->nullable();
            $table->foreignId('reviewed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'status']);
            $table->index(['status', 'created_at']);
            $table->index('order_id');
            $table->index('dispute_id');
        });

        Schema::create('refund_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('refund_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_item_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('qty')->default(1);
            $table->decimal('unit_price', 12, 2)->default(0);
            $table->decimal('amount', 12, 2)->default(0);
            $table->boolean('restock')->default(true);
            $table->timestamps();

            $table->index('refund_id');
        });

        Schema::create('disputes', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 48)->unique();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('seller_order_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('tenant_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('store_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('raised_by_user_id')->constrained('users')->cascadeOnDelete();
            // item_not_received | not_as_described | damaged | wrong_item |
            // late_delivery | unauthorised | other
            $table->string('type', 40)->default('other');
            // open | awaiting_seller | awaiting_customer | escalated |
            // resolved | rejected | closed
            $table->string('status', 24)->default('open');
            $table->string('priority', 16)->default('normal');
            $table->string('subject');
            $table->text('description');
            $table->decimal('amount_claimed', 12, 2)->default(0);
            $table->string('currency', 3)->default('USD');
            $table->text('resolution')->nullable();
            $table->string('outcome', 32)->nullable();
            $table->foreignId('assigned_admin_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('escalated_at')->nullable();
            $table->timestamp('seller_due_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamp('last_activity_at')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'status']);
            $table->index(['status', 'created_at']);
        });

        Schema::create('dispute_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dispute_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            // customer | seller | admin | system
            $table->string('author_role', 16)->default('customer');
            $table->string('author_name')->nullable();
            $table->text('body');
            $table->json('attachments')->nullable();
            $table->boolean('is_internal')->default(false);
            $table->timestamps();

            $table->index(['dispute_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dispute_messages');
        Schema::dropIfExists('disputes');
        Schema::dropIfExists('refund_items');
        Schema::dropIfExists('refunds');
    }
};
