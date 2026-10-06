<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PayoutAccount;
use App\Models\PayoutAdjustment;
use App\Models\PayoutBatch;
use App\Models\PayoutBatchItem;
use App\Models\SellerSettlement;
use App\Services\Commerce\PayoutService;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * §12 / §22 #16 — the seller side of payouts.
 *
 * Sellers watch their balance, manage payout accounts and request a payout;
 * only the platform can actually release money.
 */
class PayoutController extends Controller
{
    public function __construct(protected PayoutService $payouts) {}

    public function overview(Request $request): JsonResponse
    {
        $tenantId = (int) TenantContext::id();
        $this->payouts->syncAvailability($tenantId);

        return response()->json([
            'data' => [
                'balance' => $this->payouts->balanceFor($tenantId),
                'account' => $this->presentAccount($this->payouts->defaultAccount($tenantId)),
                'recent_batches' => PayoutBatch::query()
                    ->where('tenant_id', $tenantId)
                    ->orderByDesc('id')
                    ->limit(5)
                    ->get()
                    ->map(fn (PayoutBatch $b) => $this->presentBatch($b))
                    ->values(),
                'next_release' => SellerSettlement::query()
                    ->where('tenant_id', $tenantId)
                    ->where('status', SellerSettlement::STATUS_PENDING)
                    ->whereNotNull('available_at')
                    ->orderBy('available_at')
                    ->value('available_at'),
            ],
        ]);
    }

    public function settlements(Request $request): JsonResponse
    {
        $tenantId = (int) TenantContext::id();
        $this->payouts->syncAvailability($tenantId);

        $query = $this->payouts->settlementQuery($tenantId)
            ->with(['sellerOrder:id,order_id,store_id,status,grand_total,currency', 'sellerOrder.store:id,name']);

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        $page = $query->orderByDesc('id')->paginate($request->integer('per_page', 20));

        return response()->json([
            'data' => collect($page->items())->map(fn (SellerSettlement $s) => $this->presentSettlement($s))->all(),
            'summary' => $this->payouts->balanceFor($tenantId),
            'meta' => $this->meta($page),
        ]);
    }

    public function batches(Request $request): JsonResponse
    {
        $page = PayoutBatch::query()
            ->with('account')
            ->where('tenant_id', TenantContext::id())
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 15));

        return response()->json([
            'data' => collect($page->items())->map(fn (PayoutBatch $b) => $this->presentBatch($b))->all(),
            'meta' => $this->meta($page),
        ]);
    }

    public function showBatch(PayoutBatch $batch): JsonResponse
    {
        $this->assertOwned($batch->tenant_id);
        $batch->load(['account', 'items.settlement.sellerOrder:id,order_id,store_id', 'adjustmentEntries']);

        return response()->json(['data' => $this->presentBatch($batch, true)]);
    }

    /** A seller asks the platform to pay out their available balance. */
    public function requestPayout(Request $request): JsonResponse
    {
        $data = $request->validate([
            'payout_account_id' => ['nullable', 'integer', 'exists:payout_accounts,id'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        if (! empty($data['payout_account_id'])) {
            $account = PayoutAccount::query()->findOrFail($data['payout_account_id']);
            $this->assertOwned($account->tenant_id);
        }

        $batch = $this->payouts->buildBatch((int) TenantContext::id(), [
            'payout_account_id' => $data['payout_account_id'] ?? null,
            'notes' => $data['notes'] ?? null,
            'created_by' => $request->user()->id,
        ]);

        $batch->load(['account', 'items.settlement.sellerOrder:id,order_id,store_id']);

        return response()->json(['data' => $this->presentBatch($batch, true)], 201);
    }

    public function accounts(): JsonResponse
    {
        $accounts = PayoutAccount::query()
            ->where('tenant_id', TenantContext::id())
            ->orderByDesc('is_default')
            ->orderByDesc('id')
            ->get()
            ->map(fn (PayoutAccount $a) => $this->presentAccount($a))
            ->values();

        return response()->json([
            'data' => [
                'accounts' => $accounts,
                'methods' => PayoutAccount::METHODS,
            ],
        ]);
    }

    public function storeAccount(Request $request): JsonResponse
    {
        $data = $this->accountRules($request);

        $account = PayoutAccount::query()->create([
            ...$data,
            'tenant_id' => TenantContext::id(),
            'status' => PayoutAccount::STATUS_PENDING,
        ]);

        $this->enforceSingleDefault($account);

        return response()->json(['data' => $this->presentAccount($account->fresh())], 201);
    }

    public function updateAccount(Request $request, PayoutAccount $account): JsonResponse
    {
        $this->assertOwned($account->tenant_id);
        $data = $this->accountRules($request, $account);

        // Any change re-opens verification — payout details are high risk.
        $account->update([...$data, 'status' => PayoutAccount::STATUS_PENDING, 'verified_at' => null]);
        $this->enforceSingleDefault($account);

        return response()->json(['data' => $this->presentAccount($account->fresh())]);
    }

    public function destroyAccount(PayoutAccount $account): JsonResponse
    {
        $this->assertOwned($account->tenant_id);
        $account->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    // ----------------------------------------------------------- internals

    protected function accountRules(Request $request, ?PayoutAccount $account = null): array
    {
        return $request->validate([
            'label' => ['nullable', 'string', 'max:120'],
            'method' => [$account ? 'sometimes' : 'required', 'in:'.implode(',', PayoutAccount::METHODS)],
            'account_name' => [$account ? 'sometimes' : 'required', 'string', 'max:160'],
            'account_number' => [$account ? 'sometimes' : 'required', 'string', 'max:64'],
            'bank_name' => ['nullable', 'string', 'max:160'],
            'branch' => ['nullable', 'string', 'max:120'],
            'swift_code' => ['nullable', 'string', 'max:24'],
            'mobile_network' => ['nullable', 'string', 'max:32'],
            'currency' => ['nullable', 'string', 'size:3'],
            'country' => ['nullable', 'string', 'size:2'],
            'is_default' => ['nullable', 'boolean'],
        ]);
    }

    protected function enforceSingleDefault(PayoutAccount $account): void
    {
        if (! $account->is_default) {
            return;
        }
        PayoutAccount::query()
            ->where('tenant_id', $account->tenant_id)
            ->whereKeyNot($account->id)
            ->update(['is_default' => false]);
    }

    protected function assertOwned(?int $tenantId): void
    {
        abort_unless($tenantId !== null && (int) $tenantId === (int) TenantContext::id(), 403, 'Not your workspace.');
    }

    protected function presentAccount(?PayoutAccount $account): ?array
    {
        if (! $account) {
            return null;
        }

        return [
            'id' => $account->id,
            'label' => $account->label,
            'method' => $account->method,
            'account_name' => $account->account_name,
            'masked_account_number' => $account->masked_account_number,
            'bank_name' => $account->bank_name,
            'branch' => $account->branch,
            'swift_code' => $account->swift_code,
            'mobile_network' => $account->mobile_network,
            'currency' => $account->currency,
            'country' => $account->country,
            'status' => $account->status,
            'is_default' => (bool) $account->is_default,
            'verified_at' => $account->verified_at,
        ];
    }

    protected function presentSettlement(SellerSettlement $settlement): array
    {
        return [
            'id' => $settlement->id,
            'seller_order_id' => $settlement->seller_order_id,
            'order_id' => $settlement->sellerOrder?->order_id,
            'store' => $settlement->sellerOrder?->store?->name,
            'gross' => (string) $settlement->gross,
            'commission' => (string) $settlement->commission,
            'net' => (string) $settlement->net,
            'commission_rate' => $settlement->commission_rate !== null ? (string) $settlement->commission_rate : null,
            'currency' => $settlement->currency,
            'status' => $settlement->status,
            'available_at' => $settlement->available_at,
            'released_at' => $settlement->released_at,
            'hold_reason' => $settlement->hold_reason,
            'payout_batch_id' => $settlement->payout_batch_id,
            'created_at' => $settlement->created_at,
        ];
    }

    protected function presentBatch(PayoutBatch $batch, bool $detailed = false): array
    {
        $payload = [
            'id' => $batch->id,
            'reference' => $batch->reference,
            'tenant_id' => $batch->tenant_id,
            'status' => $batch->status,
            'currency' => $batch->currency,
            'gross' => (string) $batch->gross,
            'commission' => (string) $batch->commission,
            'delivery_fees' => (string) $batch->delivery_fees,
            'refunds' => (string) $batch->refunds,
            'adjustments' => (string) $batch->adjustments,
            'net' => (string) $batch->net,
            'settlement_count' => (int) $batch->settlement_count,
            'period_start' => $batch->period_start?->toDateString(),
            'period_end' => $batch->period_end?->toDateString(),
            'method' => $batch->method,
            'external_ref' => $batch->external_ref,
            'notes' => $batch->notes,
            'failure_reason' => $batch->failure_reason,
            'released_at' => $batch->released_at,
            'paid_at' => $batch->paid_at,
            'created_at' => $batch->created_at,
            'account' => $batch->relationLoaded('account') ? $this->presentAccount($batch->account) : null,
        ];

        if ($detailed) {
            $payload['items'] = $batch->relationLoaded('items')
                ? $batch->items->map(fn (PayoutBatchItem $item) => [
                    'id' => $item->id,
                    'seller_settlement_id' => $item->seller_settlement_id,
                    'seller_order_id' => $item->settlement?->seller_order_id,
                    'order_id' => $item->settlement?->sellerOrder?->order_id,
                    'gross' => (string) $item->gross,
                    'commission' => (string) $item->commission,
                    'refund_amount' => (string) $item->refund_amount,
                    'amount' => (string) $item->amount,
                ])->values()
                : [];
            $payload['adjustment_entries'] = $batch->relationLoaded('adjustmentEntries')
                ? $batch->adjustmentEntries->map(fn (PayoutAdjustment $adj) => [
                    'id' => $adj->id,
                    'kind' => $adj->kind,
                    'amount' => (string) $adj->amount,
                    'reason' => $adj->reason,
                    'status' => $adj->status,
                    'created_at' => $adj->created_at,
                ])->values()
                : [];
        }

        return $payload;
    }

    protected function meta($page): array
    {
        return [
            'page' => $page->currentPage(),
            'per_page' => $page->perPage(),
            'total' => $page->total(),
            'last_page' => $page->lastPage(),
        ];
    }
}
