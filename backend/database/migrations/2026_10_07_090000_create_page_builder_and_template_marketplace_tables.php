<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('template_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('icon', 64)->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('page_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->nullable()->constrained('template_categories')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('thumbnail')->nullable();
            $table->string('designer_name')->default('MarketHub Studio');
            $table->decimal('price', 12, 2)->default(0);
            $table->char('currency', 3)->default('USD');
            $table->string('status', 32)->default('draft')->index();
            $table->string('version', 32)->default('1.0.0');
            $table->json('definition');
            $table->boolean('is_featured')->default(false);
            $table->decimal('rating_avg', 3, 2)->default(0);
            $table->unsignedInteger('rating_count')->default(0);
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->index(['category_id', 'status']);
        });

        Schema::create('template_purchases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('template_id')->constrained('page_templates')->cascadeOnDelete();
            $table->decimal('amount', 12, 2)->default(0);
            $table->char('currency', 3)->default('USD');
            $table->string('payment_status', 32)->default('pending')->index();
            $table->string('payment_provider', 64)->nullable();
            $table->string('payment_reference')->nullable()->unique();
            $table->json('payment_meta')->nullable();
            $table->timestamp('purchased_at')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'template_id']);
        });

        Schema::create('tenant_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('template_id')->constrained('page_templates')->restrictOnDelete();
            $table->string('template_version', 32);
            $table->json('customized_data');
            $table->string('status', 32)->default('active')->index();
            $table->timestamp('installed_at');
            $table->timestamps();

            $table->index(['tenant_id', 'store_id', 'status']);
        });

        Schema::create('pages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name');
            $table->string('slug');
            $table->string('page_type', 32)->default('custom');
            $table->json('content');
            $table->string('status', 32)->default('draft')->index();
            $table->string('seo_title', 70)->nullable();
            $table->string('seo_description', 170)->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->unique(['store_id', 'slug']);
            $table->index(['tenant_id', 'store_id', 'status']);
        });

        Schema::create('page_revisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('page_id')->nullable()->constrained('pages')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('page_type', 32)->default('custom');
            $table->unsignedInteger('version');
            $table->json('content');
            $table->timestamps();

            $table->index(['store_id', 'page_type', 'version']);
            $table->index(['page_id', 'version']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('page_revisions');
        Schema::dropIfExists('pages');
        Schema::dropIfExists('tenant_templates');
        Schema::dropIfExists('template_purchases');
        Schema::dropIfExists('page_templates');
        Schema::dropIfExists('template_categories');
    }
};
