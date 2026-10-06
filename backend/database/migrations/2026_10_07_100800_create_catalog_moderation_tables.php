<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * §7 / §18 #4 — Admin catalogue moderation.
 *
 * `categories` stays tenant-owned (each seller organises their own shelves).
 * `platform_categories` is the marketplace-wide taxonomy the super admin
 * curates — Electronics → Mobile Phones → Smartphones — that tenant
 * categories and products map onto so shoppers can browse across stores.
 * Products also gain a moderation state and a report trail.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_id')->nullable()->constrained('platform_categories')->nullOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('description')->nullable();
            $table->string('icon', 64)->nullable();
            $table->string('image_url')->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->boolean('is_active')->default(true);
            $table->boolean('is_featured')->default(false);
            $table->string('seo_title')->nullable();
            $table->string('seo_description')->nullable();
            $table->timestamps();

            $table->index(['parent_id', 'position']);
            $table->index(['is_active', 'is_featured']);
        });

        Schema::create('product_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('reason', 48);
            $table->text('note')->nullable();
            $table->string('status', 24)->default('open');
            $table->foreignId('handled_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('handled_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index('product_id');
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->foreignId('platform_category_id')->nullable()->after('parent_id')
                ->constrained('platform_categories')->nullOnDelete();
        });

        Schema::table('products', function (Blueprint $table) {
            $table->foreignId('platform_category_id')->nullable()->after('category_id')
                ->constrained('platform_categories')->nullOnDelete();
            // pending | approved | flagged | rejected
            $table->string('moderation_status', 24)->default('approved')->after('status');
            $table->string('moderation_note')->nullable()->after('moderation_status');
            $table->foreignId('moderated_by_user_id')->nullable()->after('moderation_note')
                ->constrained('users')->nullOnDelete();
            $table->timestamp('moderated_at')->nullable()->after('moderated_by_user_id');
            $table->unsignedInteger('report_count')->default(0)->after('moderated_at');

            $table->index(['moderation_status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['moderation_status', 'created_at']);
            $table->dropConstrainedForeignId('moderated_by_user_id');
            $table->dropConstrainedForeignId('platform_category_id');
            $table->dropColumn(['moderation_status', 'moderation_note', 'moderated_at', 'report_count']);
        });
        Schema::table('categories', function (Blueprint $table) {
            $table->dropConstrainedForeignId('platform_category_id');
        });
        Schema::dropIfExists('product_reports');
        Schema::dropIfExists('platform_categories');
    }
};
