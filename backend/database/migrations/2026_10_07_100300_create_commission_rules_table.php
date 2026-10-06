<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * §14 / §18 — Configurable commissions.
 *
 * Replaces the hard-coded config('markethub.commission_rate') with a rule
 * engine. The most specific active rule wins: product → category → store →
 * tenant → plan → global, with an explicit priority as the tie-breaker.
 * Tiered rules carry their bands in commission_tiers.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('commission_rules', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('description')->nullable();
            $table->string('scope_type', 24)->default('global');
            $table->unsignedBigInteger('scope_id')->nullable();
            $table->string('calculation', 24)->default('percentage');
            $table->decimal('rate', 8, 4)->default(0);
            $table->decimal('flat_fee', 12, 2)->default(0);
            $table->decimal('min_fee', 12, 2)->nullable();
            $table->decimal('max_fee', 12, 2)->nullable();
            $table->decimal('min_order_amount', 12, 2)->default(0);
            $table->boolean('include_delivery')->default(false);
            $table->unsignedInteger('priority')->default(0);
            $table->string('status', 24)->default('active');
            $table->date('effective_from')->nullable();
            $table->date('effective_to')->nullable();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['scope_type', 'scope_id', 'status']);
            $table->index(['status', 'priority']);
        });

        Schema::create('commission_tiers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('commission_rule_id')->constrained()->cascadeOnDelete();
            $table->decimal('from_amount', 12, 2)->default(0);
            $table->decimal('to_amount', 12, 2)->nullable();
            $table->decimal('rate', 8, 4)->default(0);
            $table->decimal('flat_fee', 12, 2)->default(0);
            $table->timestamps();

            $table->index(['commission_rule_id', 'from_amount']);
        });

        Schema::table('seller_orders', function (Blueprint $table) {
            $table->decimal('commission_rate', 8, 4)->default(0)->after('commission');
            $table->foreignId('commission_rule_id')->nullable()->after('commission_rate')->constrained()->nullOnDelete();
        });

        Schema::table('seller_settlements', function (Blueprint $table) {
            $table->decimal('commission_rate', 8, 4)->default(0)->after('commission');
        });
    }

    public function down(): void
    {
        Schema::table('seller_settlements', function (Blueprint $table) {
            $table->dropColumn('commission_rate');
        });
        Schema::table('seller_orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('commission_rule_id');
            $table->dropColumn('commission_rate');
        });
        Schema::dropIfExists('commission_tiers');
        Schema::dropIfExists('commission_rules');
    }
};
