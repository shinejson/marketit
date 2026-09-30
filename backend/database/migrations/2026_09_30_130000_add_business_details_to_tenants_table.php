<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            // Business identity
            $table->string('trading_name')->nullable();
            $table->string('business_type', 32)->nullable();
            $table->string('registration_number')->nullable();
            $table->string('tax_id')->nullable();
            $table->unsignedSmallInteger('year_established')->nullable();
            $table->string('website')->nullable();
            $table->string('permit_number')->nullable();
            $table->date('permit_expires_at')->nullable();

            // What the tenant sells
            $table->text('product_summary')->nullable();
            $table->json('categories_offered')->nullable();

            // Registered address + GPS
            $table->string('address_line1')->nullable();
            $table->string('address_line2')->nullable();
            $table->string('city')->nullable();
            $table->string('region')->nullable();
            $table->string('postal_code')->nullable();
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();

            // Social presence
            $table->json('social_links')->nullable();

            // Owner / signatory
            $table->string('owner_name')->nullable();
            $table->string('owner_email')->nullable();
            $table->string('owner_phone')->nullable();
            $table->string('owner_id_type', 32)->nullable();
            $table->string('owner_id_number')->nullable();

            // Certificates & permits (metadata only; files live on the private disk)
            $table->json('documents')->nullable();

            // Payout destination — never store a full card number
            $table->string('payout_method', 32)->nullable();
            $table->string('payout_account_name')->nullable();
            $table->string('payout_account_number')->nullable();
            $table->string('bank_name')->nullable();
            $table->string('mobile_money_provider', 64)->nullable();
            $table->string('card_brand', 32)->nullable();
            $table->string('card_last4', 4)->nullable();

            // Review workflow
            $table->timestamp('submitted_at')->nullable();
            $table->unsignedBigInteger('reviewed_by')->nullable();
            $table->text('review_notes')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamp('reviewed_at')->nullable();

            $table->index('reviewed_by');
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropIndex(['reviewed_by']);

            foreach ([
                'trading_name', 'business_type', 'registration_number', 'tax_id', 'year_established', 'website',
                'permit_number', 'permit_expires_at', 'product_summary', 'categories_offered',
                'address_line1', 'address_line2', 'city', 'region', 'postal_code', 'latitude', 'longitude',
                'social_links', 'owner_name', 'owner_email', 'owner_phone', 'owner_id_type', 'owner_id_number',
                'documents', 'payout_method', 'payout_account_name', 'payout_account_number', 'bank_name',
                'mobile_money_provider', 'card_brand', 'card_last4',
                'submitted_at', 'reviewed_by', 'review_notes', 'rejection_reason', 'reviewed_at',
            ] as $column) {
                $table->dropColumn($column);
            }
        });
    }
};
