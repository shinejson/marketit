<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PayoutAccount;
use App\Models\PayoutAdjustment;
use App\Models\PayoutBatch;
use App\Models\PayoutBatchItem;
use App\Models\SellerSettlement;
use App\Models\Tenant;
use App\Services\Commerce\PayoutService;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * §12 / §18 / §27 — the platform payouts desk.
 *
 * Settlements used to sit at `pending` forever. This screen sweeps matured
 * settlements into batches, releases them and records the payment.
 */
class AdminPayoutController extends Controller
{
    public function __construct(protected PayoutService $payouts) {}

    /** Headline numbers plus the queue of sellers waiting to be paid. */
    public function overview(): JsonResponse
    {
        TenantContext::bypass(true);
        $this->payouts->syncAvailability();

        return response()->json([
            'data' => [
                'summary' => $this->payouts->platformSummary(),
                'payable' => $this->payouts->payableTenants(),
                'recent_batches' => PayoutBatch::query()
                    ->with('account')
                    ->orderByDesc('id')
                    ->limit(10)
                    ->get()
                    ->map(fn (PayoutBatch $b) => $this->presentBatch($b))
                    ->values(),
            ],
        ]);
    }

    public function batches(Request $request): JsonResponse
    {
        TenantContext::bypass(true);

        $query = PayoutBatch::query()->with(['account', 'tenant:id,name']);

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('tenant_id')) {
            $query->where('tenant_id', $request->integer('tenant_id'));
        }
        if ($request->filled('q')) {
            $term = '%'.$request->string('q').'%';
            $query->where(fn ($q) => $q->where('reference', 'like', $term)->orWhere('external_ref', 'like', $term));
        }

        $page = $query->orderByDesc('id')->paginate($request->integer('per_page', 20));

        return response()->json([
            'data' => collect($page->items())->map(fn (PayoutBatch $b) => $this->presentBatch($b))->all(),
            'summary' => $this->payouts->platformSummary(),
            'meta' => $this->meta($page),
        ]);
    }

    public function showBatch(PayoutBatch $batch): JsonResponse
    {
        TenantContext::bypass(true);
        $batch->load(['account', 'tenant:id,name', 'items.settlement.sellerOrder:id,order_id,store_id', 'adjustmentEntries']);

        return response()->json(['data' => $this->presentBatch($batch, true)]);
    }

    /** Sweep a tenant's matured settlements into a fresh batch. */
    public function createBatch(Request $request): JsonResponse
    {
        TenantContext::bypass(true);

        $data = $request->validate([
            'tenant_id' => ['required', 'integer', 'exists:tenants,id'],
            'settlement_ids' => ['nullable', 'array'],
            'settlement_ids.*' => ['integer'],
            'period_start' => ['nullable', 'date'],
            'period_end' => ['nullable', 'date', 'after_or_equal:period_start'],
            'payout_account_id' => ['nullable', 'integer', 'exists:payout_accounts,id'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $batch = $this->payouts->buildBatch((int) $data['tenant_id'], [
            ...$data,
            'created_by' => $request->user()->id,
        ]);
        $batch->load(['account', 'items.settlement.sellerOrder:id,order_id,store_id']);

        return response()->json(['data' => $this->presentBatch($batch, true)], 201);
    }

    /** Run the whole payable queue in one click. */
    public function createAllBatches(Request $request): JsonResponse
    {
        TenantContext::bypass(true);
        $this->payouts->syncAvailability();

        $onlyQualifying = $request->boolean('only_meeting_minimum', true);
        $created = [];

        foreach ($this->payouts->payableTenants() as $row) {
            if ($onlyQualifying && ! $row['meets_minimum']) {
                continue;
            }
            try {
                $batch = $this->payouts->buildBatch((int) $row['tenant_id'], [
                    'created_by' => $request->user()->id,
                    'notes' => 'Auto-generated payout run.',
                ]);
                $created[] = $this->presentBatch($batch);
            } catch (\Throwable $e) {
                // One bad tenant must not stop the whole run.
                continue;
            }
        }

        return response()->json(['data' => ['created' => count($created), 'batches' => $created]], 201);
    }

    public function recalculate(PayoutBatch $batch): JsonResponse
    {
        TenantContext::bypass(true);
        $updated = $this->payouts->recalculate($batch);

        return response()->json(['data' => $this->presentBatch($updated->load(['account', 'items']), true)]);
    }

    public function release(Request $request, PayoutBatch $batch): JsonResponse
    {
        TenantContext::bypass(true);
        $data = $request->validate(['external_ref' => ['nullable', 'string', 'max:160']]);

        $updated = $this->payouts->release($batch, $request->user()->id, $data['external_ref'] ?? null);

        return response()->json(['data' => $this->presentBatch($updated->load('account'))]);
    }

    public function markPaid(Request $request, PayoutBatch $batch): JsonResponse
    {
        TenantContext::bypass(true);
        $data = $request->validate(['external_ref' => ['nullable', 'string', 'max:160']]);

        $updated = $this->payouts->markPaid($batch, $request->user()->id, $data['external_ref'] ?? null);

        return response()->json(['data' => $this->presentBatch($updated->load('account'))]);
    }

    public function markFailed(Request $request, PayoutBatch $batch): JsonResponse
    {
        TenantContext::bypass(true);
        $data = $request->validate(['reason' => ['required', 'string', 'max:500']]);

        $updated = $this->payouts->markFailed($batch, $data['reason']);

        return response()->json(['data' => $this->presentBatch($updated->load('account'))]);
    }

    public function cancelBatch(PayoutBatch $batch): JsonResponse
    {
        TenantContext::bypass(true);
        $updated = $this->payouts->cancel($batch);

        return response()->json(['data' => $this->presentBatch($updated->load('account'))]);
    }

    public function settlements(Request $request): JsonResponse
    {
        TenantContext::bypass(true);
        $this->payouts->syncAvailability();

        $query = SellerSettlement::query()
            ->with(['sellerOrder:id,order_id,store_id,status,grand_total,currency', 'sellerOrder.store:id,name', 'tenant:id,name']);

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('tenant_id')) {
            $query->where('tenant_id', $request->integer('tenant_id'));
        }

        $page = $query->orderByDesc('id')->paginate($request->integer('per_page', 25));

        return response()->json([
            'data' => collect($page->items())->map(fn (SellerSettlement $s) => $this->presentSettlement($s))->all(),
            'meta' => $this->meta($page),
        ]);
    }

    public function holdSettlement(Request $request, SellerSettlement $settlement): JsonResponse
    {
        TenantContext::bypass(true);
        $data = $request->validate(['reason' => ['required', 'string', 'max:255']]);

        $updated = $this->payouts->hold($settlement, $data['reason']);

        return response()->json(['data' => $this->presentSettlement($updated)]);
    }

    public function releaseSettlement(SellerSettlement $settlement): JsonResponse
    {
        TenantContext::bypass(true);
        $updated = $this->payouts->unhold($settlement);

        return response()->json(['data' => $this->presentSettlement($updated)]);
    }

    /** Manual credit or debit against a seller's next payout. */
    public function addAdjustment(Request $request): JsonResponse
    {
        TenantContext::bypass(true);

        $data = $request->validate([
            'tenant_id' => ['required', 'integer', 'exists:tenants,id'],
            'kind' => ['required', 'in:credit,debit'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'reason' => ['required', 'string', 'max:255'],
            'currency' => ['nullable', 'string', 'size:3'],
        ]);

        $adjustment = $this->payouts->addAdjustment((int) $data['tenant_id'], $data, $request->user()->id);

        return response()->json(['data' => [
            'id' => $adjustment->id,
            'tenant_id' => $adjustment->tenant_id,
            'kind' => $adjustment->kind,
            'amount' => (string) $adjustment->amount,
            'reason' => $adjustment->reason,
            'status' => $adjustment->status,
            'created_at' => $adjustment->created_at,
        ]], 201);
    }

    public function adjustments(Request $request): JsonResponse
    {
        TenantContext::bypass(true);

        $query = PayoutAdjustment::query()->with('tenant:id,name');
        if ($request->filled('tenant_id')) {
            $query->where('tenant_id', $request->integer('tenant_id'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        $page = $query->orderByDesc('id')->paginate($request->integer('per_page', 20));

        return response()->json([
            'data' => collect($page->items())->map(fn (PayoutAdjustment $a) => [
                'id' => $a->id,
                'tenant_id' => $a->tenant_id,
                'tenant' => $a->tenant?->name,
                'kind' => $a->kind,
                'amount' => (string) $a->amount,
                'signed_amount' => $a->signedAmount(),
                'reason' => $a->reason,
                'status' => $a->status,
                'payout_batch_id' => $a->payout_batch_id,
                'created_at' => $a->created_at,
            ])->all(),
            'meta' => $this->meta($page),
        ]);
    }

    /** Payout accounts awaiting KYC verification. */
    public function accounts(Request $request): JsonResponse
    {
        TenantContext::bypass(true);

        $query = PayoutAccount::query()->with('tenant:id,name');
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        $page = $query->orderByDesc('id')->paginate($request->integer('per_page', 20));

        return response()->json([
            'data' => collect($page->items())->map(fn (PayoutAccount $a) => [
                'id' => $a->id,
                'tenant_id' => $a->tenant_id,
                'tenant' => $a->tenant?->name,
                'label' => $a->label,
                'method' => $a->method,
                'account_name' => $a->account_name,
                'masked_account_number' => $a->masked_account_number,
                'bank_name' => $a->bank_name,
                'branch' => $a->branch,
                'swift_code' => $a->swift_code,
                'mobile_network' => $a->mobile_network,
                'currency' => $a->currency,
                'country' => $a->country,
                'status' => $a->status,
                'is_default' => (bool) $a->is_default,
                'verified_at' => $a->verified_at,
            ])->all(),
            'meta' => $this->meta($page),
        ]);
    }

    public function verifyAccount(Request $request, PayoutAccount $account): JsonResponse
    {
        TenantContext::bypass(true);
        $data = $request->validate(['status' => ['required', 'in:verified,rejected,pending']]);

        $account->update([
            'status' => $data['status'],
            'verified_at' => $data['status'] === PayoutAccount::STATUS_VERIFIED ? now() : null,
        ]);

        return response()->json(['data' => ['id' => $account->id, 'status' => $account->status]]);
    }

    // ----------------------------------------------------------- internals

    protected function presentSettlement(SellerSettlement $settlement): array
    {
        return [
            'id' => $settlement->id,
            'tenant_id' => $settlement->tenant_id,
            'tenant' => $settlement->relationLoaded('tenant') ? $settlement->tenant?->name : null,
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
            'tenant' => $batch->relationLoaded('tenant') ? $batch->tenant?->name : null,
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
            'is_editable' => $batch->isEditable(),
            'account' => $batch->relationLoaded('account') && $batch->account ? [
                'id' => $batch->account->id,
                'label' => $batch->account->label,
                'method' => $batch->account->method,
                'account_name' => $batch->account->account_name,
                'masked_account_number' => $batch->account->masked_account_number,
                'bank_name' => $batch->account->bank_name,
                'status' => $batch->account->status,
            ] : null,
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
                ? $batch->adjustmentEntries->map(fn (PayoutAdjustment $a) => [
                    'id' => $a->id,
                    'kind' => $a->kind,
                    'amount' => (string) $a->amount,
                    'reason' => $a->reason,
                    'status' => $a->status,
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
