<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lets a product carry its own tax rate (percent) which overrides the
 * tenant-wide default from tenant_settings.tax_rate. Paired with the
 * existing compare_at_price column this gives every product a complete
 * discount (was/now) and tax story that flows into carts, quotes,
 * invoices and receipts.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('tax_rate', 5, 2)->nullable()->after('tax_class');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('tax_rate');
        });
    }
};
