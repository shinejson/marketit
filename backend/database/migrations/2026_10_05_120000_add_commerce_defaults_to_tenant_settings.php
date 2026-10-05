<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenant_settings', function (Blueprint $table) {
            $table->decimal('default_markup_percent', 7, 2)->default(30)->after('support_phone');
            $table->decimal('default_discount_percent', 7, 2)->default(0)->after('default_markup_percent');
            $table->decimal('tax_rate', 7, 2)->default(0)->after('default_discount_percent');
        });
    }

    public function down(): void
    {
        Schema::table('tenant_settings', function (Blueprint $table) {
            $table->dropColumn(['default_markup_percent', 'default_discount_percent', 'tax_rate']);
        });
    }
};
