<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * §16 / §22 #19 — Delivery zones, fulfilment options and tracking.
 *
 * Replaces the single static `stores.delivery_fee` column with real zones
 * (country/region/city/postcode), per-zone rates, pickup and courier options,
 * and a shipment record per seller order carrying carrier + tracking number
 * and a scan history the customer can follow.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('delivery_zones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('store_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('description')->nullable();
            $table->string('match_type', 24)->default('country');
            $table->json('countries')->nullable();
            $table->json('regions')->nullable();
            $table->json('cities')->nullable();
            $table->json('postcodes')->nullable();
            $table->decimal('base_fee', 12, 2)->default(0);
            $table->decimal('per_item_fee', 12, 2)->default(0);
            $table->decimal('per_kg_fee', 12, 2)->default(0);
            $table->decimal('free_over', 12, 2)->nullable();
            $table->unsignedSmallInteger('min_days')->default(1);
            $table->unsignedSmallInteger('max_days')->default(5);
            $table->unsignedInteger('priority')->default(0);
            $table->boolean('is_default')->default(false);
            $table->string('status', 24)->default('active');
            $table->timestamps();

            $table->index(['tenant_id', 'status', 'priority']);
            $table->index(['store_id', 'status']);
        });

        Schema::create('delivery_methods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('store_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('delivery_zone_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('name');
            // pickup | store_delivery | courier | platform
            $table->string('type', 32)->default('store_delivery');
            $table->string('carrier')->nullable();
            $table->string('service_level')->nullable();
            $table->decimal('fee', 12, 2)->default(0);
            $table->decimal('free_over', 12, 2)->nullable();
            $table->unsignedSmallInteger('min_days')->default(1);
            $table->unsignedSmallInteger('max_days')->default(5);
            $table->string('pickup_address')->nullable();
            $table->string('pickup_hours')->nullable();
            $table->text('instructions')->nullable();
            $table->string('tracking_url_template')->nullable();
            $table->boolean('is_default')->default(false);
            $table->string('status', 24)->default('active');
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();

            $table->index(['tenant_id', 'status']);
            $table->index(['store_id', 'status']);
        });

        Schema::create('shipments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('seller_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('delivery_method_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('delivery_zone_id')->nullable()->constrained()->nullOnDelete();
            $table->string('reference', 48)->unique();
            $table->string('type', 32)->default('store_delivery');
            $table->string('carrier')->nullable();
            $table->string('service_level')->nullable();
            $table->string('tracking_number')->nullable();
            $table->string('tracking_url')->nullable();
            // pending | ready_for_pickup | picked_up | in_transit |
            // out_for_delivery | delivered | failed | returned | cancelled
            $table->string('status', 32)->default('pending');
            $table->decimal('cost', 12, 2)->default(0);
            $table->decimal('weight', 10, 3)->nullable();
            $table->string('recipient_name')->nullable();
            $table->string('recipient_phone', 32)->nullable();
            $table->text('destination')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('dispatched_at')->nullable();
            $table->date('estimated_delivery_from')->nullable();
            $table->date('estimated_delivery_to')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'status']);
            $table->index('tracking_number');
        });

        Schema::create('shipment_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shipment_id')->constrained()->cascadeOnDelete();
            $table->string('status', 32);
            $table->string('description');
            $table->string('location')->nullable();
            $table->foreignId('recorded_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('happened_at');
            $table->timestamps();

            $table->index(['shipment_id', 'happened_at']);
        });

        Schema::table('seller_orders', function (Blueprint $table) {
            $table->foreignId('delivery_method_id')->nullable()->after('delivery_fee')->constrained()->nullOnDelete();
            $table->foreignId('delivery_zone_id')->nullable()->after('delivery_method_id')->constrained()->nullOnDelete();
            $table->string('delivery_type', 32)->nullable()->after('delivery_zone_id');
        });
    }

    public function down(): void
    {
        Schema::table('seller_orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('delivery_zone_id');
            $table->dropConstrainedForeignId('delivery_method_id');
            $table->dropColumn('delivery_type');
        });
        Schema::dropIfExists('shipment_events');
        Schema::dropIfExists('shipments');
        Schema::dropIfExists('delivery_methods');
        Schema::dropIfExists('delivery_zones');
    }
};
