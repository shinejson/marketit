<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform_backups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('filename');
            $table->string('path');
            $table->string('disk', 32)->default('local');
            $table->unsignedBigInteger('size_bytes')->default(0);
            $table->string('status', 24)->default('completed'); // completed|failed
            $table->string('scope', 24)->default('full');       // settings|core|full
            $table->string('type', 24)->default('manual');      // manual|scheduled
            $table->json('tables')->nullable();
            $table->unsignedInteger('records')->default(0);
            $table->string('note')->nullable();
            $table->text('error')->nullable();
            $table->timestamp('restored_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_backups');
    }
};
