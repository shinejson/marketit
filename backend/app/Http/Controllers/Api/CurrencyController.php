<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\TenantSetting;
use App\Services\Currency\CurrencyService;
use App\Services\Currency\TenantCurrencyConverter;
use App\Support\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Currency catalog, rates, and the conversion preview the tenant settings
 * screen shows before someone flips USD to GHS.
 */
class CurrencyController extends Controller
{
    public function __construct(
        private CurrencyService $currency,
        private TenantCurrencyConverter $converter,
    ) {
    }

    /** Public: every supported currency with its symbol and rate. */
    public function index(): JsonResponse
    {
        return response()->json(['data' => $this->currency->payload()]);
    }

    /** Ad-hoc conversion helper: ?amount=100&from=USD&to=GHS */
    public function convert(Request $request): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric'],
            'from' => ['required', 'string', 'size:3'],
            'to' => ['required', 'string', 'size:3'],
        ]);

        $value = $this->currency->convert($data['amount'], $data['from'], $data['to']);

        return response()->json([
            'data' => [
                'amount' => (float) $data['amount'],
                'from' => strtoupper($data['from']),
                'to' => strtoupper($data['to']),
                'rate' => round($this->currency->factor($data['from'], $data['to']), 8),
                'value' => $value,
                'formatted' => $this->currency->format($value, $data['to']),
            ],
        ]);
    }

    /**
     * Tenant console bootstrap: the workspace's active currency plus the full
     * catalog, so the UI can format money without loading every setting.
     */
    public function active(Request $request): JsonResponse
    {
        $tenant = $this->tenant($request);
        $settings = TenantSetting::query()->firstOrCreate(['tenant_id' => $tenant->id]);
        $code = strtoupper($settings->currency ?: $this->currency->base());

        return response()->json([
            'data' => [
                'code' => $code,
                'symbol' => $this->currency->symbol($code),
                'name' => $this->currency->name($code),
                'decimals' => $this->currency->decimals($code),
                'rate' => $this->currency->rate($code),
                'converted_at' => $settings->currency_converted_at?->toIso8601String(),
            ] + $this->currency->payload(),
        ]);
    }

    /** Tenant console: what switching to `to` would do to this workspace. */
    public function preview(Request $request): JsonResponse
    {
        $tenant = $this->tenant($request);
        $this->authorize('view', $tenant);

        $data = $request->validate(['to' => ['required', 'string', 'size:3']]);
        $to = strtoupper($data['to']);
        abort_unless($this->currency->supports($to), 422, 'Unsupported currency.');

        $settings = TenantSetting::query()->firstOrCreate(['tenant_id' => $tenant->id]);
        $from = strtoupper($settings->currency ?: $this->currency->base());

        return response()->json(['data' => $this->converter->preview($tenant, $from, $to)]);
    }

    /** Platform admin: hand-edit the rate table. */
    public function updateRates(Request $request): JsonResponse
    {
        $data = $request->validate([
            'rates' => ['required', 'array'],
            'rates.*' => ['numeric', 'min:0.00000001'],
        ]);

        $touched = $this->currency->updateRates($data['rates'], 'manual');
        ActivityLogger::record('currency.rates_updated', ['meta' => ['codes' => $touched]]);

        return response()->json(['data' => $this->currency->payload(), 'meta' => ['updated' => $touched]]);
    }

    protected function tenant(Request $request): Tenant
    {
        $id = $request->user()->tenantId();
        abort_unless($id, 404, 'No tenant associated.');

        return Tenant::query()->findOrFail($id);
    }
}
