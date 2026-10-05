<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Remember which currency a workspace's stored money is *actually* denominated
 * in, and at which rate it was last converted. Without this we cannot tell a
 * price of "120" in USD apart from "120" in GHS.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenant_settings', function (Blueprint $table) {
            $table->string('base_currency', 3)->default('USD')->after('currency');
            $table->decimal('currency_rate', 20, 8)->default(1)->after('base_currency');
            $table->timestamp('currency_converted_at')->nullable()->after('currency_rate');
            $table->boolean('auto_convert_prices')->default(true)->after('currency_converted_at');
        });
    }

    public function down(): void
    {
        Schema::table('tenant_settings', function (Blueprint $table) {
            $table->dropColumn(['base_currency', 'currency_rate', 'currency_converted_at', 'auto_convert_prices']);
        });
    }
};
