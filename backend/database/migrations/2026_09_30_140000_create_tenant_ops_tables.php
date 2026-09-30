<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_roles', function (Blueprint $table) {
            $table->string('department', 32)->nullable()->after('store_id');
            $table->index(['tenant_id', 'department']);
        });

        Schema::create('tenant_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('timezone', 64)->default('Africa/Accra');
            $table->string('currency', 3)->default('USD');
            $table->unsignedTinyInteger('fiscal_year_start_month')->default(1);
            $table->boolean('notify_low_stock')->default(true);
            $table->boolean('notify_orders')->default(true);
            $table->boolean('notify_payouts')->default(true);
            $table->unsignedSmallInteger('backup_retention_days')->default(30);
            $table->string('payout_email')->nullable();
            $table->string('tax_id')->nullable();
            $table->string('support_email')->nullable();
            $table->string('support_phone', 32)->nullable();
            $table->json('goals')->nullable();
            $table->timestamps();

            $table->unique('tenant_id');
        });

        Schema::create('tenant_backups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('filename');
            $table->string('path');
            $table->unsignedBigInteger('size_bytes')->default(0);
            $table->string('status', 32)->default('pending');
            $table->string('type', 32)->default('manual');
            $table->json('tables')->nullable();
            $table->text('error')->nullable();
            $table->timestamp('restored_at')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_backups');
        Schema::dropIfExists('tenant_settings');
        Schema::table('user_roles', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'department']);
            $table->dropColumn('department');
        });
    }
};
