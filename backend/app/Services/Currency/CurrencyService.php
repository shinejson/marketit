<?php

namespace App\Services\Currency;

use App\Models\CurrencyRate;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

/**
 * Currency catalog + conversion maths.
 *
 * Every rate is stored against the platform base currency
 * (config('markethub.currency'), USD out of the box): `rate` answers
 * "how many units of this currency does one base unit buy?".
 *
 * Converting therefore always goes through the base:
 *
 *     amount_in_to = amount_in_from / rate(from) * rate(to)
 *
 * The table may not exist yet (fresh checkout, mid-migration), so every read
 * falls back to the hardcoded seed table below. That keeps the API answering
 * instead of 500-ing when a deployment runs ahead of its migrations.
 */
class CurrencyService
{
    public const CACHE_KEY = 'markethub.currency.rates';

    /**
     * Fallback catalog — also what the seeder writes. Rates are indicative
     * mid-market values; a tenant or the platform admin can override them.
     *
     * @var array<string, array{name: string, symbol: string, rate: float, decimals: int}>
     */
    public const DEFAULTS = [
        'USD' => ['name' => 'US Dollar', 'symbol' => '$', 'rate' => 1.0, 'decimals' => 2],
        'GHS' => ['name' => 'Ghanaian Cedi', 'symbol' => 'GH₵', 'rate' => 12.45, 'decimals' => 2],
        'NGN' => ['name' => 'Nigerian Naira', 'symbol' => '₦', 'rate' => 1545.0, 'decimals' => 2],
        'KES' => ['name' => 'Kenyan Shilling', 'symbol' => 'KSh', 'rate' => 129.0, 'decimals' => 2],
        'ZAR' => ['name' => 'South African Rand', 'symbol' => 'R', 'rate' => 18.1, 'decimals' => 2],
        'XOF' => ['name' => 'West African CFA Franc', 'symbol' => 'CFA', 'rate' => 605.0, 'decimals' => 0],
        'EUR' => ['name' => 'Euro', 'symbol' => '€', 'rate' => 0.92, 'decimals' => 2],
        'GBP' => ['name' => 'British Pound', 'symbol' => '£', 'rate' => 0.78, 'decimals' => 2],
        'CAD' => ['name' => 'Canadian Dollar', 'symbol' => 'C$', 'rate' => 1.37, 'decimals' => 2],
        'EGP' => ['name' => 'Egyptian Pound', 'symbol' => 'E£', 'rate' => 48.5, 'decimals' => 2],
    ];

    public function base(): string
    {
        return strtoupper((string) config('markethub.currency', 'USD'));
    }

    /**
     * The whole catalog, keyed by ISO code.
     *
     * @return array<string, array{code: string, name: string, symbol: string, rate: float, decimals: int, source: string, updated_at: ?string}>
     */
    public function catalog(): array
    {
        return Cache::remember(self::CACHE_KEY, now()->addMinutes(10), function (): array {
            $rows = [];

            try {
                if (Schema::hasTable('currency_rates')) {
                    $rows = CurrencyRate::query()
                        ->where('is_active', true)
                        ->get()
                        ->mapWithKeys(fn (CurrencyRate $rate) => [
                            strtoupper($rate->code) => [
                                'code' => strtoupper($rate->code),
                                'name' => $rate->name,
                                'symbol' => $rate->symbol,
                                'rate' => (float) $rate->rate,
                                'decimals' => (int) $rate->decimals,
                                'source' => $rate->source,
                                'updated_at' => $rate->rate_updated_at?->toIso8601String(),
                            ],
                        ])->all();
                }
            } catch (\Throwable) {
                $rows = [];
            }

            if (! $rows) {
                $rows = collect(self::DEFAULTS)
                    ->map(fn (array $meta, string $code) => $meta + [
                        'code' => $code,
                        'source' => 'builtin',
                        'updated_at' => null,
                    ])
                    ->all();
            }

            // The base currency must always be present and always be 1.
            $base = strtoupper((string) config('markethub.currency', 'USD'));
            $rows[$base] = ($rows[$base] ?? [
                'code' => $base,
                'name' => $base,
                'symbol' => '$',
                'decimals' => 2,
                'source' => 'builtin',
                'updated_at' => null,
            ]) + [];
            $rows[$base]['rate'] = 1.0;

            return $rows;
        });
    }

    public function forget(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    public function supports(?string $code): bool
    {
        return $code !== null && isset($this->catalog()[strtoupper($code)]);
    }

    /** @return string[] */
    public function codes(): array
    {
        return array_keys($this->catalog());
    }

    /** Units of `$code` per one base unit. Unknown codes fall back to 1.0. */
    public function rate(?string $code): float
    {
        $code = strtoupper((string) ($code ?: $this->base()));
        $rate = (float) ($this->catalog()[$code]['rate'] ?? 0);

        return $rate > 0 ? $rate : 1.0;
    }

    public function symbol(?string $code): string
    {
        $code = strtoupper((string) ($code ?: $this->base()));

        return (string) ($this->catalog()[$code]['symbol'] ?? $code);
    }

    public function decimals(?string $code): int
    {
        $code = strtoupper((string) ($code ?: $this->base()));

        return (int) ($this->catalog()[$code]['decimals'] ?? 2);
    }

    public function name(?string $code): string
    {
        $code = strtoupper((string) ($code ?: $this->base()));

        return (string) ($this->catalog()[$code]['name'] ?? $code);
    }

    /** Multiplier that takes an amount from `$from` into `$to`. */
    public function factor(?string $from, ?string $to): float
    {
        $from = strtoupper((string) ($from ?: $this->base()));
        $to = strtoupper((string) ($to ?: $this->base()));

        if ($from === $to) {
            return 1.0;
        }

        return $this->rate($to) / $this->rate($from);
    }

    public function convert(float|int|string|null $amount, ?string $from, ?string $to): float
    {
        if ($amount === null || $amount === '') {
            return 0.0;
        }

        $value = (float) $amount * $this->factor($from, $to);

        return round($value, $this->decimals($to));
    }

    public function format(float|int|string|null $amount, ?string $code = null): string
    {
        $code = strtoupper((string) ($code ?: $this->base()));

        return $this->symbol($code).number_format((float) $amount, $this->decimals($code));
    }

    /**
     * Payload consumed by the Angular CurrencyService: the base code plus every
     * supported currency with its symbol and rate.
     */
    public function payload(): array
    {
        $base = $this->base();

        return [
            'base' => $base,
            'currencies' => array_values(array_map(
                fn (array $row) => [
                    'code' => $row['code'],
                    'name' => $row['name'],
                    'symbol' => $row['symbol'],
                    'rate' => round((float) $row['rate'], 8),
                    'decimals' => (int) $row['decimals'],
                    'source' => $row['source'] ?? 'manual',
                    'updated_at' => $row['updated_at'] ?? null,
                ],
                $this->catalog()
            )),
        ];
    }

    /**
     * Upsert rates. Accepts ['GHS' => 12.6, ...] or full rows.
     *
     * @param  array<string, float|array{rate?: float, name?: string, symbol?: string, decimals?: int}>  $rates
     */
    public function updateRates(array $rates, string $source = 'manual'): array
    {
        if (! Schema::hasTable('currency_rates')) {
            return [];
        }

        $touched = [];
        foreach ($rates as $code => $value) {
            $code = strtoupper((string) $code);
            $row = is_array($value) ? $value : ['rate' => (float) $value];
            $rate = (float) ($row['rate'] ?? 0);
            if ($rate <= 0) {
                continue;
            }

            $defaults = self::DEFAULTS[$code] ?? ['name' => $code, 'symbol' => $code, 'decimals' => 2];

            CurrencyRate::query()->updateOrCreate(
                ['code' => $code],
                [
                    'name' => $row['name'] ?? $defaults['name'],
                    'symbol' => $row['symbol'] ?? $defaults['symbol'],
                    'decimals' => (int) ($row['decimals'] ?? $defaults['decimals']),
                    'rate' => $code === $this->base() ? 1.0 : $rate,
                    'is_active' => (bool) ($row['is_active'] ?? true),
                    'source' => $source,
                    'rate_updated_at' => now(),
                ]
            );
            $touched[] = $code;
        }

        $this->forget();

        return $touched;
    }
}
