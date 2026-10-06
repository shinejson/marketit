<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * §12 / §18 / §22 #16 — Seller payouts automation.
 *
 * Settlements already exist per seller order but had nowhere to go. They now
 * carry a tenant, a hold window and a batch: once an order is delivered the
 * settlement becomes `available` after the hold period, a batch sweeps the
 * available settlements for a tenant, and the admin releases the batch.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Where a seller wants the money sent (§12 Ghana-first methods).
        Schema::create('payout_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('label')->nullable();
            $table->string('method', 32)->default('bank');
            $table->string('account_name');
            $table->string('account_number');
            $table->string('bank_name')->nullable();
            $table->string('branch')->nullable();
            $table->string('swift_code', 24)->nullable();
            $table->string('mobile_network', 32)->nullable();
            $table->string('currency', 3)->default('USD');
            $table->string('country', 2)->nullable();
            $table->boolean('is_default')->default(false);
            $table->string('status', 24)->default('pending');
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'status']);
        });

        Schema::create('payout_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('payout_account_id')->nullable()->constrained()->nullOnDelete();
            $table->string('reference', 48)->unique();
            $table->string('status', 24)->default('draft');
            $table->string('currency', 3)->default('USD');
            $table->decimal('gross', 14, 2)->default(0);
            $table->decimal('commission', 14, 2)->default(0);
            $table->decimal('delivery_fees', 14, 2)->default(0);
            $table->decimal('refunds', 14, 2)->default(0);
            $table->decimal('adjustments', 14, 2)->default(0);
            $table->decimal('net', 14, 2)->default(0);
            $table->unsignedInteger('settlement_count')->default(0);
            $table->date('period_start')->nullable();
            $table->date('period_end')->nullable();
            $table->string('method', 32)->nullable();
            $table->string('external_ref')->nullable();
            $table->text('notes')->nullable();
            $table->text('failure_reason')->nullable();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('released_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('released_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'status']);
            $table->index(['status', 'created_at']);
        });

        Schema::create('payout_batch_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payout_batch_id')->constrained()->cascadeOnDelete();
            $table->foreignId('seller_settlement_id')->constrained()->cascadeOnDelete();
            $table->decimal('gross', 12, 2)->default(0);
            $table->decimal('commission', 12, 2)->default(0);
            $table->decimal('refund_amount', 12, 2)->default(0);
            $table->decimal('amount', 12, 2)->default(0);
            $table->timestamps();

            $table->unique(['payout_batch_id', 'seller_settlement_id'], 'payout_batch_settlement_unique');
        });

        // Manual credits/debits an admin applies to a seller balance.
        Schema::create('payout_adjustments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('payout_batch_id')->nullable()->constrained()->nullOnDelete();
            $table->string('kind', 24)->default('credit');
            $table->string('reason');
            $table->decimal('amount', 12, 2);
            $table->string('currency', 3)->default('USD');
            $table->string('status', 24)->default('pending');
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['tenant_id', 'status']);
        });

        Schema::table('seller_settlements', function (Blueprint $table) {
            $table->foreignId('tenant_id')->nullable()->after('seller_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('payout_batch_id')->nullable()->after('tenant_id')->constrained()->nullOnDelete();
            $table->string('currency', 3)->default('USD')->after('net');
            $table->timestamp('available_at')->nullable()->after('status');
            $table->timestamp('released_at')->nullable()->after('available_at');
            $table->string('hold_reason')->nullable()->after('released_at');

            $table->index(['tenant_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('seller_settlements', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'status']);
            $table->dropConstrainedForeignId('payout_batch_id');
            $table->dropConstrainedForeignId('tenant_id');
            $table->dropColumn(['currency', 'available_at', 'released_at', 'hold_reason']);
        });
        Schema::dropIfExists('payout_adjustments');
        Schema::dropIfExists('payout_batch_items');
        Schema::dropIfExists('payout_batches');
        Schema::dropIfExists('payout_accounts');
    }
};
