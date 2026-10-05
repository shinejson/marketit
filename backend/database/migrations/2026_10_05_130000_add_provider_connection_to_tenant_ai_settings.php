<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenant_ai_settings', function (Blueprint $table) {
            $table->string('provider', 40)->default('OpenAI')->after('tenant_id');
            $table->string('endpoint', 500)->default('https://api.openai.com/v1')->after('provider');
            $table->string('model', 100)->default('gpt-4o-mini')->after('endpoint');
            $table->text('api_key')->nullable()->after('model');
        });
    }

    public function down(): void
    {
        Schema::table('tenant_ai_settings', function (Blueprint $table) {
            $table->dropColumn(['provider', 'endpoint', 'model', 'api_key']);
        });
    }
};
