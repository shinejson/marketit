<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * §18 / §22 #18 — Coupons and promotions.
 *
 * A coupon with a null tenant_id is a platform-wide promotion owned by the
 * super admin; a coupon with a tenant_id belongs to that seller and can only
 * discount their own lines. Redemptions are written at checkout so limits
 * ("10 total, 1 per shopper") can be enforced atomically.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('coupons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('store_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('code', 48)->unique();
            $table->string('name');
            $table->string('description')->nullable();
            $table->string('discount_type', 24)->default('percentage');
            $table->decimal('value', 12, 2)->default(0);
            $table->string('currency', 3)->nullable();
            $table->decimal('min_subtotal', 12, 2)->default(0);
            $table->decimal('max_discount', 12, 2)->nullable();
            $table->unsignedInteger('usage_limit')->nullable();
            $table->unsignedInteger('per_user_limit')->nullable();
            $table->unsignedInteger('used_count')->default(0);
            $table->decimal('redeemed_value', 12, 2)->default(0);
            $table->string('applies_to', 24)->default('all');
            $table->boolean('is_stackable')->default(false);
            $table->boolean('first_order_only')->default(false);
            $table->boolean('auto_apply')->default(false);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->string('status', 24)->default('draft');
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['status', 'starts_at', 'ends_at']);
            $table->index(['tenant_id', 'status']);
        });

        // Restrict a coupon to specific products, categories or stores.
        Schema::create('coupon_targets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('coupon_id')->constrained()->cascadeOnDelete();
            $table->string('target_type', 24);
            $table->unsignedBigInteger('target_id');
            $table->timestamps();

            $table->unique(['coupon_id', 'target_type', 'target_id'], 'coupon_targets_unique');
        });

        Schema::create('coupon_redemptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('coupon_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('order_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('seller_order_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('code', 48);
            $table->decimal('amount', 12, 2)->default(0);
            $table->string('currency', 3)->nullable();
            $table->string('status', 24)->default('applied');
            $table->timestamps();

            $table->index(['coupon_id', 'user_id']);
            $table->index('order_id');
        });

        Schema::table('carts', function (Blueprint $table) {
            $table->foreignId('coupon_id')->nullable()->after('user_id')->constrained()->nullOnDelete();
            $table->string('coupon_code', 48)->nullable()->after('coupon_id');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->decimal('discount_total', 12, 2)->default(0)->after('subtotal');
            $table->foreignId('coupon_id')->nullable()->after('currency')->constrained()->nullOnDelete();
            $table->string('coupon_code', 48)->nullable()->after('coupon_id');
        });

        Schema::table('seller_orders', function (Blueprint $table) {
            $table->decimal('discount', 12, 2)->default(0)->after('subtotal');
        });
    }

    public function down(): void
    {
        Schema::table('seller_orders', function (Blueprint $table) {
            $table->dropColumn('discount');
        });
        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('coupon_id');
            $table->dropColumn(['discount_total', 'coupon_code']);
        });
        Schema::table('carts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('coupon_id');
            $table->dropColumn('coupon_code');
        });
        Schema::dropIfExists('coupon_redemptions');
        Schema::dropIfExists('coupon_targets');
        Schema::dropIfExists('coupons');
    }
};
