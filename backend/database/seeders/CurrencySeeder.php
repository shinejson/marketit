<?php

namespace Database\Seeders;

use App\Models\CurrencyRate;
use App\Services\Currency\CurrencyService;
use Illuminate\Database\Seeder;

/**
 * Seeds the exchange-rate table from the service's built-in catalog. Rates are
 * indicative mid-market values; platform admins can edit them from the console
 * (PUT /api/admin/currency/rates) or point the app at a feed.
 */
class CurrencySeeder extends Seeder
{
    public function run(): void
    {
        foreach (CurrencyService::DEFAULTS as $code => $meta) {
            CurrencyRate::query()->updateOrCreate(
                ['code' => $code],
                [
                    'name' => $meta['name'],
                    'symbol' => $meta['symbol'],
                    'rate' => $meta['rate'],
                    'decimals' => $meta['decimals'],
                    'is_active' => true,
                    'source' => 'seed',
                    'rate_updated_at' => now(),
                ]
            );
        }

        app(CurrencyService::class)->forget();
    }
}
