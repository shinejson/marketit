<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Append-only stock ledger.
 *
 * Inventory rows only carry the current balance, which makes "why is this SKU
 * at 3 units?" unanswerable. Every receipt, adjustment, stock count, damage
 * write-off or transfer is recorded here with the balance before/after so the
 * inventory workspace can show a real audit trail and reconcile counts.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('inventory_id')->constrained('inventories')->cascadeOnDelete();
            $table->foreignId('variant_id')->constrained('product_variants')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();

            // receipt | adjustment | count | damage | transfer | sale | return | reservation
            $table->string('type', 24);
            $table->integer('quantity');          // signed delta applied
            $table->integer('quantity_before');
            $table->integer('quantity_after');
            $table->string('reference', 64)->nullable();
            $table->string('location', 64)->nullable();
            $table->string('note', 255)->nullable();
            $table->decimal('unit_cost', 12, 2)->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'created_at']);
            $table->index(['variant_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
