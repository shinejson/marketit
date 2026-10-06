<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * §9 / §20 — Wishlist / favourites.
 *
 * Shoppers keep products (optionally a specific variant) for later and can
 * move them straight into the cart. Saved stores are kept in the same place
 * so "favourites" covers both halves of the marketplace.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wishlist_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('variant_id')->nullable()->constrained('product_variants')->cascadeOnDelete();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->string('note')->nullable();
            // Snapshot of the price when saved, so we can show "price dropped".
            $table->decimal('price_at_save', 12, 2)->nullable();
            $table->boolean('notify_on_restock')->default(false);
            $table->boolean('notify_on_price_drop')->default(true);
            $table->timestamps();

            $table->unique(['user_id', 'product_id', 'variant_id'], 'wishlist_user_product_variant_unique');
            $table->index(['user_id', 'created_at']);
            $table->index('product_id');
        });

        Schema::create('wishlist_stores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'store_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wishlist_stores');
        Schema::dropIfExists('wishlist_items');
    }
};
