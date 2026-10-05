<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Exchange rate table. Every rate is expressed against the platform base
 * currency (config('markethub.currency'), USD by default): `rate` is how many
 * units of `code` one unit of the base currency buys.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('currency_rates', function (Blueprint $table) {
            $table->id();
            $table->string('code', 3)->unique();
            $table->string('name', 64);
            $table->string('symbol', 8)->default('$');
            $table->decimal('rate', 20, 8)->default(1);
            $table->unsignedTinyInteger('decimals')->default(2);
            $table->boolean('is_active')->default(true);
            $table->string('source', 32)->default('manual');
            $table->timestamp('rate_updated_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('currency_rates');
    }
};
