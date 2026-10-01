<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Platform-level social media accounts connected by the marketing team.
        Schema::create('social_accounts', function (Blueprint $table) {
            $table->id();
            $table->string('platform')->unique(); // facebook, instagram, x, linkedin, tiktok, youtube
            $table->string('handle')->nullable();
            $table->string('display_name')->nullable();
            $table->string('status')->default('disconnected'); // connected | disconnected
            $table->unsignedBigInteger('followers')->default(0);
            $table->timestamp('connected_at')->nullable();
            $table->foreignId('connected_by')->nullable()->constrained('users')->nullOnDelete();
            $table->json('meta')->nullable();
            $table->timestamps();
        });

        // Platform marketing campaigns (distinct from tenant sponsored-ad campaigns).
        Schema::create('marketing_campaigns', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('objective')->default('awareness'); // awareness | traffic | conversions | engagement | seller_acquisition
            $table->string('status')->default('draft'); // draft | active | paused | completed
            $table->json('channels')->nullable();
            $table->decimal('daily_budget', 10, 2)->nullable();
            $table->decimal('total_budget', 12, 2)->nullable();
            $table->decimal('spend', 12, 2)->default(0);
            $table->unsignedBigInteger('impressions')->default(0);
            $table->unsignedBigInteger('clicks')->default(0);
            $table->unsignedBigInteger('conversions')->default(0);
            $table->date('starts_at')->nullable();
            $table->date('ends_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Organic / scheduled social posts, optionally attached to a campaign.
        Schema::create('social_posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->nullable()->constrained('marketing_campaigns')->nullOnDelete();
            $table->text('body');
            $table->string('link_url')->nullable();
            $table->json('channels')->nullable();
            $table->string('status')->default('draft'); // draft | scheduled | published
            $table->timestamp('scheduled_for')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->unsignedBigInteger('impressions')->default(0);
            $table->unsignedBigInteger('clicks')->default(0);
            $table->unsignedBigInteger('engagements')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('social_posts');
        Schema::dropIfExists('marketing_campaigns');
        Schema::dropIfExists('social_accounts');
    }
};
