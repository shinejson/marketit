<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

/**
 * Stores the tenant's receipt template (the "receipt builder" in
 * workspace settings): headline lines, footer message, what to show
 * (tax breakdown, discounts, SKUs) and the print format. Rendered by
 * invoice/receipt printouts on top of TenantSetting::DEFAULT_RECEIPT.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenant_settings', function (Blueprint $table) {
            $table->json('receipt')->nullable()->after('goals');
        });
    }

    public function down(): void
    {
        Schema::table('tenant_settings', function (Blueprint $table) {
            $table->dropColumn('receipt');
        });
    }
};
