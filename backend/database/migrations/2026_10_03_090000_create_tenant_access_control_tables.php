<?php

use App\Models\TenantRole;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Access control for the tenant console (/tenant/users).
 *
 * A tenant now has two populations of people:
 *
 *  - System users — the staff who sign into the tenant console. Their portal
 *    access level still lives in `user_roles.role` (tenant_owner | store_staff)
 *    because routing and middleware depend on it, while *what they may do* is
 *    described by a tenant-owned role (`tenant_roles`) plus optional per-user
 *    permission overrides.
 *  - Customers — marketplace shoppers who bought from the tenant. The tenant
 *    cannot touch the platform account, so tenant-scoped decisions (blocking,
 *    notes, tags, marketing consent) live in `tenant_customer_profiles`.
 *
 * `social_identities` records the OAuth identities (Google, Facebook, Apple…)
 * a customer signs in with, so the console can show how each account
 * authenticates and a provider can be unlinked without losing the account.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenant_roles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('key', 50);
            $table->string('name', 100);
            $table->string('description', 500)->nullable();
            // finance | sales | operations | marketing — used to pre-fill the
            // department of anyone assigned to the role.
            $table->string('department', 32)->nullable();
            $table->json('permissions')->nullable();
            $table->boolean('is_system')->default(false);
            $table->timestamps();

            $table->unique(['tenant_id', 'key']);
        });

        Schema::create('tenant_customer_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('status', 16)->default('active');   // active | blocked
            $table->string('segment', 24)->nullable();         // new | returning | vip
            $table->json('tags')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('marketing_opt_in')->default(false);
            $table->timestamps();

            $table->unique(['tenant_id', 'user_id']);
            $table->index(['tenant_id', 'status']);
        });

        Schema::create('social_identities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('provider', 32);           // google | facebook | apple | github
            $table->string('provider_user_id', 191);
            $table->string('email', 191)->nullable();
            $table->string('nickname', 191)->nullable();
            $table->string('avatar_url', 500)->nullable();
            $table->json('meta')->nullable();
            $table->timestamp('last_login_at')->nullable();
            $table->timestamps();

            $table->unique(['provider', 'provider_user_id']);
            $table->index(['user_id', 'provider']);
        });

        Schema::table('user_roles', function (Blueprint $table) {
            $table->foreignId('tenant_role_id')->nullable()->constrained('tenant_roles')->nullOnDelete();
            // Explicit per-user permission list. NULL means "inherit the role".
            $table->json('permissions')->nullable();
            $table->string('status', 16)->default('active'); // active | invited | suspended
            $table->string('title', 100)->nullable();
            $table->timestamp('invited_at')->nullable();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('avatar_url', 500)->nullable();
        });

        $this->backfillTenantRoles();
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('avatar_url');
        });

        Schema::table('user_roles', function (Blueprint $table) {
            $table->dropConstrainedForeignId('tenant_role_id');
            $table->dropColumn(['permissions', 'status', 'title', 'invited_at']);
        });

        Schema::dropIfExists('social_identities');
        Schema::dropIfExists('tenant_customer_profiles');
        Schema::dropIfExists('tenant_roles');
    }

    /** Give every existing tenant the built-in role set and map current staff onto it. */
    protected function backfillTenantRoles(): void
    {
        $now = now();

        foreach (DB::table('tenants')->select('id')->get() as $tenant) {
            $ids = [];

            foreach (TenantRole::defaults() as $role) {
                $ids[$role['key']] = DB::table('tenant_roles')->insertGetId([
                    'tenant_id' => $tenant->id,
                    'key' => $role['key'],
                    'name' => $role['name'],
                    'description' => $role['description'],
                    'department' => $role['department'],
                    'permissions' => json_encode($role['permissions']),
                    'is_system' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            $assignments = DB::table('user_roles')
                ->where('tenant_id', $tenant->id)
                ->whereIn('role', ['tenant_owner', 'store_staff'])
                ->get(['id', 'role', 'department']);

            foreach ($assignments as $assignment) {
                $key = $assignment->role === 'tenant_owner'
                    ? TenantRole::KEY_OWNER
                    : ($assignment->department && isset($ids[$assignment->department]) ? $assignment->department : 'store_staff');

                DB::table('user_roles')->where('id', $assignment->id)->update([
                    'tenant_role_id' => $ids[$key] ?? null,
                    'status' => 'active',
                    'updated_at' => $now,
                ]);
            }
        }
    }
};
