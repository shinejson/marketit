<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Turns sales_quotes into a two-way channel: quotes staff create
 * ('staff' source) and quote requests customers raise from a product
 * page ('customer_request' source). customer_user_id links the
 * marketplace account so customers can track and answer their quotes.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales_quotes', function (Blueprint $table) {
            $table->foreignId('customer_user_id')->nullable()->after('customer_id')
                ->constrained('users')->nullOnDelete();
            $table->string('source', 24)->default('staff')->after('customer_user_id');
            $table->text('request_message')->nullable()->after('notes');

            $table->index(['customer_user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('sales_quotes', function (Blueprint $table) {
            $table->dropIndex(['customer_user_id', 'status']);
            $table->dropConstrainedForeignId('customer_user_id');
            $table->dropColumn(['source', 'request_message']);
        });
    }
};
