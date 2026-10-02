<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Widens the product catalog so a single tenant can sell anything: apparel
 * (size/colour variants), fresh produce (sold by weight, perishable, shelf
 * life), electronics (condition, warranty, barcode), digital downloads and
 * services (no shipping).
 *
 * Anything that is genuinely category-specific lives in the `specs` JSON bag
 * so new verticals never need another migration. Columns are reserved only
 * for fields the platform itself has to reason about (stock, shipping,
 * pricing, publishing).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // What kind of thing is being sold — drives shipping/stock rules.
            $table->string('product_type', 32)->default('physical');
            $table->string('catalog_preset', 40)->default('general');
            $table->string('short_description', 320)->nullable();

            // Pricing
            $table->decimal('compare_at_price', 12, 2)->nullable();
            $table->decimal('cost_price', 12, 2)->nullable();

            // Selling unit: piece, kg, bunch, litre, hour, licence…
            $table->string('unit', 24)->default('piece');
            $table->decimal('unit_amount', 10, 3)->nullable();
            $table->unsignedInteger('min_order_qty')->default(1);
            $table->unsignedInteger('max_order_qty')->nullable();

            // Stock behaviour
            $table->boolean('track_inventory')->default(true);
            $table->boolean('allow_backorder')->default(false);
            $table->unsignedInteger('low_stock_threshold')->default(5);

            // Logistics
            $table->boolean('requires_shipping')->default(true);
            $table->decimal('weight', 10, 3)->nullable();
            $table->string('weight_unit', 8)->default('kg');
            $table->decimal('length', 10, 2)->nullable();
            $table->decimal('width', 10, 2)->nullable();
            $table->decimal('height', 10, 2)->nullable();
            $table->string('dimension_unit', 8)->default('cm');

            // Vertical specifics the platform understands
            $table->string('condition', 24)->nullable();
            $table->unsignedSmallInteger('warranty_months')->nullable();
            $table->boolean('is_perishable')->default(false);
            $table->unsignedSmallInteger('shelf_life_days')->nullable();
            $table->string('storage_requirement', 32)->nullable();
            $table->string('country_of_origin', 64)->nullable();
            $table->string('barcode', 64)->nullable();

            // Flexible, per-vertical data
            $table->json('tags')->nullable();
            $table->json('specs')->nullable();
            $table->json('option_schema')->nullable();

            // Merchandising
            $table->string('seo_title')->nullable();
            $table->string('seo_description', 320)->nullable();
            $table->timestamp('published_at')->nullable();

            $table->index(['tenant_id', 'product_type']);
            $table->index(['tenant_id', 'catalog_preset']);
        });

        Schema::table('product_variants', function (Blueprint $table) {
            $table->string('name')->nullable();
            $table->decimal('cost_price', 12, 2)->nullable();
            $table->unsignedInteger('position')->default(0);
        });

        Schema::table('inventories', function (Blueprint $table) {
            $table->string('batch_reference', 64)->nullable();
            $table->date('expires_at')->nullable();
            $table->string('location', 64)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'product_type']);
            $table->dropIndex(['tenant_id', 'catalog_preset']);
            $table->dropColumn([
                'product_type', 'catalog_preset', 'short_description',
                'compare_at_price', 'cost_price',
                'unit', 'unit_amount', 'min_order_qty', 'max_order_qty',
                'track_inventory', 'allow_backorder', 'low_stock_threshold',
                'requires_shipping', 'weight', 'weight_unit', 'length', 'width', 'height', 'dimension_unit',
                'condition', 'warranty_months', 'is_perishable', 'shelf_life_days', 'storage_requirement',
                'country_of_origin', 'barcode',
                'tags', 'specs', 'option_schema',
                'seo_title', 'seo_description', 'published_at',
            ]);
        });

        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropColumn(['name', 'cost_price', 'position']);
        });

        Schema::table('inventories', function (Blueprint $table) {
            $table->dropColumn(['batch_reference', 'expires_at', 'location']);
        });
    }
};
