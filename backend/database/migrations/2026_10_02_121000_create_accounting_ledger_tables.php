<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('accounting_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('code', 20);
            $table->string('name');
            $table->string('type', 20);
            $table->string('subtype', 60)->nullable();
            $table->string('system_key', 60)->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_system')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['tenant_id', 'code']);
            $table->unique(['tenant_id', 'system_key']);
            $table->index(['tenant_id', 'type', 'is_active']);
        });

        Schema::create('accounting_journal_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('posted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('number', 40);
            $table->date('entry_date');
            $table->string('reference')->nullable();
            $table->string('memo');
            $table->string('status', 16)->default('draft');
            $table->string('source_type', 40)->nullable();
            $table->unsignedBigInteger('source_id')->nullable();
            $table->decimal('total_debit', 14, 2)->default(0);
            $table->decimal('total_credit', 14, 2)->default(0);
            $table->timestamp('posted_at')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'number']);
            $table->unique(['tenant_id', 'source_type', 'source_id']);
            $table->index(['tenant_id', 'status', 'entry_date']);
        });

        Schema::create('accounting_journal_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('journal_entry_id')->constrained('accounting_journal_entries')->cascadeOnDelete();
            $table->foreignId('account_id')->constrained('accounting_accounts')->restrictOnDelete();
            $table->string('description')->nullable();
            $table->decimal('debit', 14, 2)->default(0);
            $table->decimal('credit', 14, 2)->default(0);
            $table->timestamps();

            $table->index(['account_id', 'journal_entry_id']);
        });

        Schema::create('accounting_bank_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ledger_account_id')->constrained('accounting_accounts')->restrictOnDelete();
            $table->string('name');
            $table->string('bank_name')->nullable();
            $table->string('account_number_last4', 4)->nullable();
            $table->string('currency', 3)->default('USD');
            $table->decimal('opening_balance', 14, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['tenant_id', 'name']);
        });

        Schema::create('accounting_bank_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('bank_account_id')->constrained('accounting_bank_accounts')->cascadeOnDelete();
            $table->foreignId('payment_id')->nullable()->constrained('accounting_payments')->nullOnDelete();
            $table->date('transaction_date');
            $table->string('description');
            $table->string('reference')->nullable();
            $table->decimal('amount', 14, 2);
            $table->string('status', 16)->default('unmatched');
            $table->timestamp('reconciled_at')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'status', 'transaction_date']);
            $table->unique(['tenant_id', 'bank_account_id', 'reference']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('accounting_bank_transactions');
        Schema::dropIfExists('accounting_bank_accounts');
        Schema::dropIfExists('accounting_journal_lines');
        Schema::dropIfExists('accounting_journal_entries');
        Schema::dropIfExists('accounting_accounts');
    }
};
