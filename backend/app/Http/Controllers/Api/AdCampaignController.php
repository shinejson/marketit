<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdBalance;
use App\Models\AdCampaign;
use App\Models\AdClick;
use App\Models\AdImpression;
use App\Models\AdSpendEntry;
use App\Models\AdTarget;
use App\Models\Product;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Sponsored ads workspace API.
 *
 * A campaign list is useless without performance: the console shows delivery
 * (impressions, clicks, CTR), cost (spend, effective CPC, budget pacing) and
 * wallet health side by side, so the index endpoint returns campaigns already
 * joined to their measured metrics for the requested window.
 */
class AdCampaignController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $days = max(1, min(365, $request->integer('days', 30)));
        $since = now()->subDays($days - 1)->startOfDay();

        $campaigns = AdCampaign::query()
            ->with(['store:id,name', 'targets.product:id,name,price,slug,store_id'])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('store_id'), fn ($q) => $q->where('store_id', $request->integer('store_id')))
            ->when($request->filled('q'), fn ($q) => $q->where('name', 'like', '%'.trim((string) $request->string('q')).'%'))
            ->orderByDesc('id')
            ->get();

        $ids = $campaigns->pluck('id')->all();
        $impressions = $this->countBy(AdImpression::query(), $ids, $since);
        $clicks = $this->countBy(AdClick::query(), $ids, $since);
        $spend = $this->sumBy(AdClick::query(), $ids, $since);

        $balance = AdBalance::query()->first();

        $data = $campaigns->map(function (AdCampaign $campaign) use ($impressions, $clicks, $spend) {
            $imp = (int) ($impressions[$campaign->id] ?? 0);
            $clk = (int) ($clicks[$campaign->id] ?? 0);
            $cost = (float) ($spend[$campaign->id] ?? 0);

            return [
                'id' => $campaign->id,
                'name' => $campaign->name,
                'status' => $campaign->status,
                'objective' => $campaign->objective,
                'store' => $campaign->store ? ['id' => $campaign->store->id, 'name' => $campaign->store->name] : null,
                'daily_budget' => (float) $campaign->daily_budget,
                'total_budget' => (float) $campaign->total_budget,
                'bid_cpc' => (float) $campaign->bid_cpc,
                'spent_today' => (float) $campaign->spent_today,
                'spent_total' => (float) $campaign->spent_total,
                'remaining_budget' => max(0, (float) $campaign->total_budget - (float) $campaign->spent_total),
                'budget_used_percent' => (float) $campaign->total_budget > 0
                    ? round(((float) $campaign->spent_total / (float) $campaign->total_budget) * 100, 1)
                    : 0.0,
                'daily_pacing_percent' => (float) $campaign->daily_budget > 0
                    ? round(((float) $campaign->spent_today / (float) $campaign->daily_budget) * 100, 1)
                    : 0.0,
                'start_date' => $campaign->start_date?->toDateString(),
                'end_date' => $campaign->end_date?->toDateString(),
                'created_at' => $campaign->created_at?->toIso8601String(),
                'metrics' => [
                    'impressions' => $imp,
                    'clicks' => $clk,
                    'spend' => round($cost, 2),
                    'ctr' => $imp > 0 ? round(($clk / $imp) * 100, 2) : 0.0,
                    'avg_cpc' => $clk > 0 ? round($cost / $clk, 4) : 0.0,
                    'cpm' => $imp > 0 ? round(($cost / $imp) * 1000, 2) : 0.0,
                ],
                'products' => $campaign->targets->map(fn (AdTarget $t) => [
                    'id' => $t->product_id,
                    'name' => $t->product?->name,
                    'price' => $t->product ? (float) $t->product->price : null,
                    'match_type' => $t->match_type,
                ])->all(),
            ];
        })->values();

        return response()->json([
            'data' => [
                'balance' => $balance?->balance ?? '0.00',
                'campaigns' => $data,
                'summary' => $this->summary($data, $balance, $days),
                'series' => $this->series($ids, $days),
                'top_products' => $this->topProducts($ids, $since),
                'ledger' => $this->ledger(),
            ],
        ]);
    }

    /** Stores and sellable products for the campaign composer. */
    public function meta(): JsonResponse
    {
        return response()->json([
            'data' => [
                'stores' => Store::query()->orderBy('name')->get(['id', 'name', 'currency'])->all(),
                'products' => Product::query()
                    ->where('status', Product::STATUS_ACTIVE)
                    ->orderBy('name')
                    ->get(['id', 'name', 'store_id', 'price'])
                    ->all(),
                'objectives' => ['product_visits', 'store_traffic', 'conversions', 'awareness'],
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenantId();
        $data = $request->validate([
            'store_id' => ['required', Rule::exists('stores', 'id')->where('tenant_id', $tenantId)],
            'name' => ['required', 'string', 'max:120'],
            'objective' => ['nullable', 'string', 'max:32'],
            'daily_budget' => ['required', 'numeric', 'min:1'],
            'total_budget' => ['required', 'numeric', 'min:1', 'gte:daily_budget'],
            'bid_cpc' => ['required', 'numeric', 'min:0.05'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'status' => ['nullable', Rule::in([AdCampaign::STATUS_DRAFT, AdCampaign::STATUS_ACTIVE])],
            'product_ids' => ['required', 'array', 'min:1'],
            'product_ids.*' => ['integer'],
        ]);

        $campaign = AdCampaign::query()->create([
            'store_id' => $data['store_id'],
            'name' => $data['name'],
            'objective' => $data['objective'] ?? 'product_visits',
            'daily_budget' => $data['daily_budget'],
            'total_budget' => $data['total_budget'],
            'bid_cpc' => $data['bid_cpc'],
            'status' => $data['status'] ?? AdCampaign::STATUS_DRAFT,
            'start_date' => $data['start_date'] ?? now()->toDateString(),
            'end_date' => $data['end_date'] ?? null,
        ]);

        $this->syncTargets($campaign, $data['product_ids']);

        return response()->json(['data' => $campaign->load('targets.product')], 201);
    }

    public function update(Request $request, AdCampaign $campaign): JsonResponse
    {
        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:120'],
            'objective' => ['nullable', 'string', 'max:32'],
            'status' => ['nullable', Rule::in(['draft', 'active', 'paused'])],
            'bid_cpc' => ['nullable', 'numeric', 'min:0.05'],
            'daily_budget' => ['nullable', 'numeric', 'min:1'],
            'total_budget' => ['nullable', 'numeric', 'min:1'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
            'product_ids' => ['nullable', 'array'],
            'product_ids.*' => ['integer'],
        ]);

        if (($data['status'] ?? null) === AdCampaign::STATUS_ACTIVE) {
            $balance = AdBalance::query()->first();
            abort_if(
                ! $balance || bccomp((string) $balance->balance, '0.01', 2) < 0,
                422,
                'Top up your ad wallet before activating a campaign.',
            );
        }

        $campaign->update(array_filter(
            collect($data)->except('product_ids')->all(),
            fn ($v) => $v !== null,
        ));

        if (array_key_exists('product_ids', $data) && is_array($data['product_ids'])) {
            $this->syncTargets($campaign, $data['product_ids'], true);
        }

        return response()->json(['data' => $campaign->fresh(['targets.product', 'store'])]);
    }

    public function destroy(AdCampaign $campaign): JsonResponse
    {
        abort_if(
            $campaign->status === AdCampaign::STATUS_ACTIVE,
            422,
            'Pause the campaign before deleting it.',
        );
        $campaign->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    public function fund(Request $request): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:1', 'max:1000000'],
        ]);
        $balance = AdBalance::query()->firstOrCreate(
            ['tenant_id' => $request->user()->tenantId()],
            ['balance' => 0],
        );
        $balance->balance = bcadd((string) $balance->balance, (string) $data['amount'], 2);
        $balance->save();

        return response()->json(['data' => $balance]);
    }

    public function stores(): JsonResponse
    {
        return response()->json(['data' => Store::query()->get(['id', 'name'])]);
    }

    // ------------------------------------------------------------- helpers

    protected function syncTargets(AdCampaign $campaign, array $productIds, bool $replace = false): void
    {
        if ($replace) {
            AdTarget::query()->where('campaign_id', $campaign->id)->whereNotIn('product_id', $productIds)->delete();
        }

        foreach (array_unique($productIds) as $pid) {
            $product = Product::query()->whereKey($pid)->where('store_id', $campaign->store_id)->first();
            if (! $product) {
                continue;
            }
            AdTarget::query()->firstOrCreate(
                ['campaign_id' => $campaign->id, 'product_id' => $product->id],
                ['match_type' => 'exact'],
            );
        }
    }

    /** @return array<int,int> campaign id => count */
    protected function countBy($query, array $ids, Carbon $since): array
    {
        if (! $ids) {
            return [];
        }

        return $query->whereIn('campaign_id', $ids)
            ->where('created_at', '>=', $since)
            ->groupBy('campaign_id')
            ->select('campaign_id', DB::raw('count(*) as aggregate'))
            ->get()
            ->mapWithKeys(fn ($row) => [(int) $row->campaign_id => (int) $row->aggregate])
            ->all();
    }

    /** @return array<int,float> campaign id => summed cost */
    protected function sumBy($query, array $ids, Carbon $since): array
    {
        if (! $ids) {
            return [];
        }

        return $query->whereIn('campaign_id', $ids)
            ->where('created_at', '>=', $since)
            ->groupBy('campaign_id')
            ->select('campaign_id', DB::raw('sum(cost) as aggregate'))
            ->get()
            ->mapWithKeys(fn ($row) => [(int) $row->campaign_id => (float) $row->aggregate])
            ->all();
    }

    protected function summary($campaigns, ?AdBalance $balance, int $days): array
    {
        $impressions = $campaigns->sum(fn ($c) => $c['metrics']['impressions']);
        $clicks = $campaigns->sum(fn ($c) => $c['metrics']['clicks']);
        $spend = $campaigns->sum(fn ($c) => $c['metrics']['spend']);
        $active = $campaigns->where('status', AdCampaign::STATUS_ACTIVE);
        $dailyCommitted = (float) $active->sum('daily_budget');
        $wallet = (float) ($balance?->balance ?? 0);

        return [
            'window_days' => $days,
            'campaign_count' => $campaigns->count(),
            'active_count' => $active->count(),
            'paused_count' => $campaigns->where('status', AdCampaign::STATUS_PAUSED)->count(),
            'draft_count' => $campaigns->where('status', AdCampaign::STATUS_DRAFT)->count(),
            'impressions' => (int) $impressions,
            'clicks' => (int) $clicks,
            'spend' => round((float) $spend, 2),
            'ctr' => $impressions > 0 ? round(($clicks / $impressions) * 100, 2) : 0.0,
            'avg_cpc' => $clicks > 0 ? round($spend / $clicks, 4) : 0.0,
            'daily_committed' => round($dailyCommitted, 2),
            'wallet_balance' => round($wallet, 2),
            'runway_days' => $dailyCommitted > 0 ? (int) floor($wallet / $dailyCommitted) : null,
        ];
    }

    /** Daily delivery curve so the workspace can draw a trend chart. */
    protected function series(array $ids, int $days): array
    {
        $since = now()->subDays($days - 1)->startOfDay();
        $impressions = $this->dailyCounts(AdImpression::query(), $ids, $since, 'count(*)');
        $clicks = $this->dailyCounts(AdClick::query(), $ids, $since, 'count(*)');
        $spend = $this->dailyCounts(AdClick::query(), $ids, $since, 'sum(cost)');

        $out = [];
        for ($i = 0; $i < $days; $i++) {
            $day = now()->subDays($days - 1 - $i)->toDateString();
            $out[] = [
                'day' => $day,
                'impressions' => (int) ($impressions[$day] ?? 0),
                'clicks' => (int) ($clicks[$day] ?? 0),
                'spend' => round((float) ($spend[$day] ?? 0), 2),
            ];
        }

        return $out;
    }

    protected function dailyCounts($query, array $ids, Carbon $since, string $aggregate): array
    {
        if (! $ids) {
            return [];
        }

        return $query->whereIn('campaign_id', $ids)
            ->where('created_at', '>=', $since)
            ->groupBy('day')
            ->select(DB::raw('date(created_at) as day'), DB::raw($aggregate.' as aggregate'))
            ->get()
            ->mapWithKeys(fn ($row) => [(string) $row->day => (float) $row->aggregate])
            ->all();
    }

    /** Which promoted products actually earn the clicks. */
    protected function topProducts(array $ids, Carbon $since): array
    {
        if (! $ids) {
            return [];
        }

        $clicks = AdClick::query()
            ->whereIn('campaign_id', $ids)
            ->where('created_at', '>=', $since)
            ->groupBy('product_id')
            ->select('product_id', DB::raw('count(*) as clicks'), DB::raw('sum(cost) as spend'))
            ->orderByDesc('clicks')
            ->limit(5)
            ->get();

        $impressions = AdImpression::query()
            ->whereIn('campaign_id', $ids)
            ->where('created_at', '>=', $since)
            ->whereIn('product_id', $clicks->pluck('product_id'))
            ->groupBy('product_id')
            ->select('product_id', DB::raw('count(*) as aggregate'))
            ->get()
            ->mapWithKeys(fn ($row) => [(int) $row->product_id => (int) $row->aggregate]);

        $names = Product::query()->whereIn('id', $clicks->pluck('product_id'))->pluck('name', 'id');

        return $clicks->map(fn ($row) => [
            'product_id' => (int) $row->product_id,
            'name' => $names[$row->product_id] ?? 'Product #'.$row->product_id,
            'clicks' => (int) $row->clicks,
            'spend' => round((float) $row->spend, 2),
            'impressions' => (int) ($impressions[$row->product_id] ?? 0),
        ])->all();
    }

    /** Recent wallet activity (charges booked against campaigns). */
    protected function ledger(): array
    {
        return AdSpendEntry::query()
            ->latest('id')
            ->limit(15)
            ->get()
            ->map(fn (AdSpendEntry $entry) => [
                'id' => $entry->id,
                'campaign_id' => $entry->campaign_id,
                'kind' => $entry->kind,
                'amount' => round((float) $entry->amount, 4),
                'created_at' => $entry->created_at?->toIso8601String(),
            ])->all();
    }
}
