<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Profile page fields: the bits of a person that are not authentication —
 * job title, bio, locale, and the heartbeat used to show "last seen".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('job_title', 120)->nullable()->after('avatar_url');
            $table->text('bio')->nullable()->after('job_title');
            $table->string('timezone', 64)->nullable()->after('bio');
            $table->string('locale', 12)->nullable()->after('timezone');
            $table->string('preferred_currency', 3)->nullable()->after('locale');
            $table->timestamp('last_seen_at')->nullable()->after('last_login_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['job_title', 'bio', 'timezone', 'locale', 'preferred_currency', 'last_seen_at']);
        });
    }
};
