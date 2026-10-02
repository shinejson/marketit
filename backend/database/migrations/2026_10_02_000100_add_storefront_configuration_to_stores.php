<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->json('theme_config')->nullable()->after('banner_path');
            $table->json('page_sections')->nullable()->after('theme_config');
            $table->string('seo_title')->nullable()->after('page_sections');
            $table->text('seo_description')->nullable()->after('seo_title');
            $table->boolean('customer_accounts_enabled')->default(true)->after('seo_description');
            $table->boolean('guest_checkout_enabled')->default(true)->after('customer_accounts_enabled');
        });

        // Storefront URLs use /stores/{slug}, so slugs must be platform-wide unique.
        // Normalise legacy duplicates before replacing the old tenant-scoped index.
        $used = [];
        foreach (DB::table('stores')->orderBy('id')->get(['id', 'slug']) as $store) {
            $base = Str::slug($store->slug) ?: 'store';
            $slug = $base;
            $suffix = 2;
            while (isset($used[$slug])) {
                $slug = $base.'-'.$suffix++;
            }
            $used[$slug] = true;
            if ($slug !== $store->slug) {
                DB::table('stores')->where('id', $store->id)->update(['slug' => $slug]);
            }
        }

        Schema::table('stores', function (Blueprint $table) {
            $table->dropUnique(['tenant_id', 'slug']);
            $table->unique('slug');
        });
    }

    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->dropUnique(['slug']);
            $table->unique(['tenant_id', 'slug']);
            $table->dropColumn([
                'theme_config', 'page_sections', 'seo_title', 'seo_description',
                'customer_accounts_enabled', 'guest_checkout_enabled',
            ]);
        });
    }
};
