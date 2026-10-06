<?php

namespace App\Services\Commerce;

use App\Models\Order;
use App\Models\PayoutAccount;
use App\Models\PayoutAdjustment;
use App\Models\PayoutBatch;
use App\Models\PayoutBatchItem;
use App\Models\PlatformSetting;
use App\Models\SellerOrder;
use App\Models\SellerSettlement;
use App\Models\Tenant;
use App\Services\Notifications\NotificationService;
use App\Support\TenantContext;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * §12 / §18 / §22 #16 — seller payouts automation.
 *
 * Settlement lifecycle:
 *   pending  → money earned, inside the hold window
 *   available→ hold cleared and the order was delivered/completed
 *   processing → swept into a batch awaiting release
 *   paid     → batch released and marked paid
 *   on_hold  → withheld by an admin (open dispute, risk review)
 *   reversed → fully refunded, nothing left to pay
 */
class PayoutService
{
    public function __construct(protected NotificationService $notifications) {}

    /** Days a settlement is held after delivery (Settings → Commerce). */
    public function holdDays(): int
    {
        $days = PlatformSetting::get('payout_delay_days', null);
        $days ??= PlatformSetting::get('payout_hold_days', 7);

        return max(0, (int) ($days ?? 7));
    }

    /** Settlements below this roll over to the next run. */
    public function minimumPayout(): string
    {
        $minimum = PlatformSetting::get('min_payout_amount', null);
        $minimum ??= PlatformSetting::get('minimum_payout_amount', 0);

        return number_format((float) ($minimum ?? 0), 2, '.', '');
    }

    /**
     * Promote settlements whose hold has elapsed on a fulfilled order.
     * Safe to call repeatedly — it is the scheduler-friendly entry point.
     */
    public function syncAvailability(?int $tenantId = null): int
    {
        return $this->withoutTenantScope(function () use ($tenantId) {
            $fulfilled = [SellerOrder::STATUS_DELIVERED, SellerOrder::STATUS_COMPLETED];

            $query = SellerSettlement::query()
                ->where('status', SellerSettlement::STATUS_PENDING)
                ->whereNotNull('available_at')
                ->where('available_at', '<=', now())
                ->whereHas('sellerOrder', fn ($q) => $q->withoutGlobalScopes()->whereIn('status', $fulfilled));

            if ($tenantId) {
                $query->where('tenant_id', $tenantId);
            }

            $count = 0;
            foreach ($query->get() as $settlement) {
                if (bccomp((string) $settlement->net, '0', 2) <= 0) {
                    $settlement->update(['status' => SellerSettlement::STATUS_REVERSED]);

                    continue;
                }
                $settlement->update(['status' => SellerSettlement::STATUS_AVAILABLE]);
                $count++;
            }

            return $count;
        });
    }

    /** Headline balances for one seller. */
    public function balanceFor(int $tenantId): array
    {
        return $this->withoutTenantScope(function () use ($tenantId) {
            $rows = SellerSettlement::query()
                ->where('tenant_id', $tenantId)
                ->selectRaw('status, COUNT(*) as entries, COALESCE(SUM(net), 0) as total')
                ->groupBy('status')
                ->get()
                ->keyBy('status');

            $value = fn (string $status) => number_format((float) ($rows[$status]->total ?? 0), 2, '.', '');
            $count = fn (string $status) => (int) ($rows[$status]->entries ?? 0);

            $adjustments = PayoutAdjustment::query()
                ->where('tenant_id', $tenantId)
                ->where('status', PayoutAdjustment::STATUS_PENDING)
                ->get()
                ->reduce(fn ($carry, PayoutAdjustment $a) => bcadd($carry, $a->signedAmount(), 2), '0.00');

            return [
                'pending' => $value(SellerSettlement::STATUS_PENDING),
                'pending_count' => $count(SellerSettlement::STATUS_PENDING),
                'available' => $value(SellerSettlement::STATUS_AVAILABLE),
                'available_count' => $count(SellerSettlement::STATUS_AVAILABLE),
                'processing' => $value(SellerSettlement::STATUS_PROCESSING),
                'processing_count' => $count(SellerSettlement::STATUS_PROCESSING),
                'paid' => $value(SellerSettlement::STATUS_PAID),
                'paid_count' => $count(SellerSettlement::STATUS_PAID),
                'on_hold' => $value(SellerSettlement::STATUS_ON_HOLD),
                'on_hold_count' => $count(SellerSettlement::STATUS_ON_HOLD),
                'adjustments' => $adjustments,
                'payable' => bcadd($value(SellerSettlement::STATUS_AVAILABLE), $adjustments, 2),
                'currency' => config('markethub.currency', 'USD'),
                'hold_days' => $this->holdDays(),
                'minimum_payout' => $this->minimumPayout(),
            ];
        });
    }

    /** Platform-wide payout KPIs for the admin console. */
    public function platformSummary(): array
    {
        return $this->withoutTenantScope(function () {
            $byStatus = SellerSettlement::query()
                ->selectRaw('status, COUNT(*) as entries, COALESCE(SUM(net), 0) as total')
                ->groupBy('status')
                ->get()
                ->keyBy('status');

            $value = fn (string $status) => number_format((float) ($byStatus[$status]->total ?? 0), 2, '.', '');

            $batches = PayoutBatch::query()
                ->selectRaw('status, COUNT(*) as entries, COALESCE(SUM(net), 0) as total')
                ->groupBy('status')
                ->get()
                ->keyBy('status');

            return [
                'pending' => $value(SellerSettlement::STATUS_PENDING),
                'available' => $value(SellerSettlement::STATUS_AVAILABLE),
                'processing' => $value(SellerSettlement::STATUS_PROCESSING),
                'paid' => $value(SellerSettlement::STATUS_PAID),
                'on_hold' => $value(SellerSettlement::STATUS_ON_HOLD),
                'commission_earned' => number_format((float) SellerSettlement::query()->sum('commission'), 2, '.', ''),
                'batches' => [
                    'draft' => (int) ($batches[PayoutBatch::STATUS_DRAFT]->entries ?? 0),
                    'processing' => (int) ($batches[PayoutBatch::STATUS_PROCESSING]->entries ?? 0),
                    'paid' => (int) ($batches[PayoutBatch::STATUS_PAID]->entries ?? 0),
                    'failed' => (int) ($batches[PayoutBatch::STATUS_FAILED]->entries ?? 0),
                ],
                'currency' => config('markethub.currency', 'USD'),
                'hold_days' => $this->holdDays(),
                'minimum_payout' => $this->minimumPayout(),
            ];
        });
    }

    /**
     * Sellers that currently have money waiting, ready to be batched.
     *
     * @return array<int, array<string, mixed>>
     */
    public function payableTenants(): array
    {
        return $this->withoutTenantScope(function () {
            $rows = SellerSettlement::query()
                ->where('status', SellerSettlement::STATUS_AVAILABLE)
                ->whereNull('payout_batch_id')
                ->selectRaw('tenant_id, COUNT(*) as entries, COALESCE(SUM(net), 0) as total, MIN(available_at) as oldest')
                ->groupBy('tenant_id')
                ->orderByDesc('total')
                ->get();

            $tenants = Tenant::query()->whereIn('id', $rows->pluck('tenant_id'))->get()->keyBy('id');
            $minimum = $this->minimumPayout();

            return $rows->map(function ($row) use ($tenants, $minimum) {
                $tenant = $tenants[$row->tenant_id] ?? null;
                $total = number_format((float) $row->total, 2, '.', '');

                return [
                    'tenant_id' => (int) $row->tenant_id,
                    'tenant_name' => $tenant?->name ?? ('Tenant #'.$row->tenant_id),
                    'settlements' => (int) $row->entries,
                    'amount' => $total,
                    'oldest_available_at' => $row->oldest,
                    'meets_minimum' => bccomp($total, $minimum, 2) >= 0,
                    'account' => $this->defaultAccount((int) $row->tenant_id)?->only([
                        'id', 'label', 'method', 'account_name', 'bank_name', 'status',
                    ]),
                ];
            })->all();
        });
    }

    public function defaultAccount(int $tenantId): ?PayoutAccount
    {
        return $this->withoutTenantScope(fn () => PayoutAccount::query()
            ->where('tenant_id', $tenantId)
            ->orderByDesc('is_default')
            ->orderByRaw("CASE WHEN status = 'verified' THEN 0 ELSE 1 END")
            ->orderBy('id')
            ->first());
    }

    /**
     * Sweep every available settlement for a tenant into a new batch.
     *
     * @param  array{settlement_ids?:int[], period_start?:string|null, period_end?:string|null, notes?:string|null, payout_account_id?:int|null, created_by?:int|null}  $options
     */
    public function buildBatch(int $tenantId, array $options = []): PayoutBatch
    {
        return $this->withoutTenantScope(function () use ($tenantId, $options) {
            return DB::transaction(function () use ($tenantId, $options) {
                $query = SellerSettlement::query()
                    ->where('tenant_id', $tenantId)
                    ->where('status', SellerSettlement::STATUS_AVAILABLE)
                    ->whereNull('payout_batch_id')
                    ->lockForUpdate();

                if (! empty($options['settlement_ids'])) {
                    $query->whereIn('id', $options['settlement_ids']);
                }

                /** @var Collection<int, SellerSettlement> $settlements */
                $settlements = $query->get();
                if ($settlements->isEmpty()) {
                    throw ValidationException::withMessages([
                        'settlements' => 'There is nothing available to pay out for this seller yet.',
                    ]);
                }

                $account = $options['payout_account_id']
                    ? PayoutAccount::query()->where('tenant_id', $tenantId)->find($options['payout_account_id'])
                    : $this->defaultAccount($tenantId);

                $batch = PayoutBatch::query()->create([
                    'tenant_id' => $tenantId,
                    'payout_account_id' => $account?->id,
                    'reference' => $this->reference(),
                    'status' => PayoutBatch::STATUS_DRAFT,
                    'currency' => $settlements->first()->currency ?: config('markethub.currency', 'USD'),
                    'period_start' => $options['period_start'] ?? null,
                    'period_end' => $options['period_end'] ?? null,
                    'method' => $account?->method,
                    'notes' => $options['notes'] ?? null,
                    'created_by_user_id' => $options['created_by'] ?? null,
                ]);

                foreach ($settlements as $settlement) {
                    PayoutBatchItem::query()->create([
                        'payout_batch_id' => $batch->id,
                        'seller_settlement_id' => $settlement->id,
                        'gross' => $settlement->gross,
                        'commission' => $settlement->commission,
                        'refund_amount' => $settlement->refund_amount,
                        'amount' => $settlement->net,
                    ]);

                    $settlement->update([
                        'payout_batch_id' => $batch->id,
                        'status' => SellerSettlement::STATUS_PROCESSING,
                    ]);
                }

                // Pull in any pending manual credits/debits for this seller.
                PayoutAdjustment::query()
                    ->where('tenant_id', $tenantId)
                    ->where('status', PayoutAdjustment::STATUS_PENDING)
                    ->whereNull('payout_batch_id')
                    ->update(['payout_batch_id' => $batch->id]);

                return $this->recalculate($batch);
            });
        });
    }

    /** Recompute the batch header from its items + adjustments. */
    public function recalculate(PayoutBatch $batch): PayoutBatch
    {
        $items = $batch->items()->get();
        $adjustments = $batch->adjustmentEntries()
            ->where('status', '!=', PayoutAdjustment::STATUS_VOID)
            ->get()
            ->reduce(fn ($carry, PayoutAdjustment $a) => bcadd($carry, $a->signedAmount(), 2), '0.00');

        $settlements = SellerSettlement::query()->whereIn('id', $items->pluck('seller_settlement_id'))->get();

        $gross = $settlements->reduce(fn ($c, $s) => bcadd($c, (string) $s->gross, 2), '0.00');
        $commission = $settlements->reduce(fn ($c, $s) => bcadd($c, (string) $s->commission, 2), '0.00');
        $deliveryFees = $settlements->reduce(fn ($c, $s) => bcadd($c, (string) $s->delivery_fee, 2), '0.00');
        $refunds = $settlements->reduce(fn ($c, $s) => bcadd($c, (string) $s->refund_amount, 2), '0.00');
        $net = $items->reduce(fn ($c, $i) => bcadd($c, (string) $i->amount, 2), '0.00');

        $batch->update([
            'gross' => $gross,
            'commission' => $commission,
            'delivery_fees' => $deliveryFees,
            'refunds' => $refunds,
            'adjustments' => $adjustments,
            'net' => bcadd($net, $adjustments, 2),
            'settlement_count' => $items->count(),
        ]);

        return $batch->fresh(['items']);
    }

    /** Approve the batch and hand it to the payment rail. */
    public function release(PayoutBatch $batch, ?int $actorId = null, ?string $externalRef = null): PayoutBatch
    {
        if (! $batch->isEditable()) {
            throw ValidationException::withMessages(['status' => 'Only a draft batch can be released.']);
        }

        $batch->update([
            'status' => PayoutBatch::STATUS_PROCESSING,
            'released_by_user_id' => $actorId,
            'released_at' => now(),
            'external_ref' => $externalRef ?: $batch->external_ref,
        ]);

        $this->notifications->toTenant($batch->tenant_id, 'payout', 'Payout '.$batch->reference.' released', [
            'body' => 'A payout of '.$batch->currency.' '.$batch->net.' has been released and is on its way.',
            'action_url' => '/tenant/payouts',
            'action_label' => 'View payouts',
            'level' => 'success',
            'subject_type' => PayoutBatch::class,
            'subject_id' => $batch->id,
        ]);

        return $batch->fresh();
    }

    /** Confirm the money left the platform. */
    public function markPaid(PayoutBatch $batch, ?int $actorId = null, ?string $externalRef = null): PayoutBatch
    {
        if (! in_array($batch->status, [PayoutBatch::STATUS_PROCESSING, PayoutBatch::STATUS_FAILED], true)) {
            throw ValidationException::withMessages(['status' => 'Only a released batch can be marked as paid.']);
        }

        DB::transaction(function () use ($batch, $actorId, $externalRef) {
            $batch->update([
                'status' => PayoutBatch::STATUS_PAID,
                'paid_at' => now(),
                'released_by_user_id' => $batch->released_by_user_id ?: $actorId,
                'external_ref' => $externalRef ?: $batch->external_ref,
                'failure_reason' => null,
            ]);

            SellerSettlement::query()
                ->where('payout_batch_id', $batch->id)
                ->update([
                    'status' => SellerSettlement::STATUS_PAID,
                    'released_at' => now(),
                ]);

            PayoutAdjustment::query()
                ->where('payout_batch_id', $batch->id)
                ->update(['status' => PayoutAdjustment::STATUS_APPLIED]);
        });

        $this->notifications->toTenant($batch->tenant_id, 'payout', 'Payout '.$batch->reference.' paid', [
            'body' => $batch->currency.' '.$batch->net.' has been sent to your payout account.',
            'action_url' => '/tenant/payouts',
            'action_label' => 'View payouts',
            'level' => 'success',
            'subject_type' => PayoutBatch::class,
            'subject_id' => $batch->id,
        ]);

        return $batch->fresh();
    }

    public function markFailed(PayoutBatch $batch, string $reason): PayoutBatch
    {
        $batch->update([
            'status' => PayoutBatch::STATUS_FAILED,
            'failure_reason' => $reason,
        ]);

        $this->notifications->toTenant($batch->tenant_id, 'payout', 'Payout '.$batch->reference.' failed', [
            'body' => $reason,
            'action_url' => '/tenant/payouts',
            'action_label' => 'Review payout',
            'level' => 'critical',
            'subject_type' => PayoutBatch::class,
            'subject_id' => $batch->id,
        ]);

        return $batch->fresh();
    }

    /** Pull a batch apart and hand every settlement back to "available". */
    public function cancel(PayoutBatch $batch): PayoutBatch
    {
        if ($batch->status === PayoutBatch::STATUS_PAID) {
            throw ValidationException::withMessages(['status' => 'A paid batch cannot be cancelled.']);
        }

        DB::transaction(function () use ($batch) {
            SellerSettlement::query()
                ->where('payout_batch_id', $batch->id)
                ->update([
                    'status' => SellerSettlement::STATUS_AVAILABLE,
                    'payout_batch_id' => null,
                ]);

            PayoutAdjustment::query()
                ->where('payout_batch_id', $batch->id)
                ->update(['payout_batch_id' => null]);

            $batch->items()->delete();
            $batch->update([
                'status' => PayoutBatch::STATUS_CANCELLED,
                'settlement_count' => 0,
                'net' => 0,
            ]);
        });

        return $batch->fresh();
    }

    /** Withhold a single settlement (open dispute, fraud review). */
    public function hold(SellerSettlement $settlement, string $reason): SellerSettlement
    {
        if (in_array($settlement->status, [SellerSettlement::STATUS_PAID, SellerSettlement::STATUS_PROCESSING], true)) {
            throw ValidationException::withMessages(['status' => 'That settlement is already in a payout batch.']);
        }

        $settlement->update([
            'status' => SellerSettlement::STATUS_ON_HOLD,
            'hold_reason' => $reason,
        ]);

        return $settlement->fresh();
    }

    public function unhold(SellerSettlement $settlement): SellerSettlement
    {
        if ($settlement->status !== SellerSettlement::STATUS_ON_HOLD) {
            return $settlement;
        }

        $settlement->update([
            'status' => $settlement->available_at && $settlement->available_at->isPast()
                ? SellerSettlement::STATUS_AVAILABLE
                : SellerSettlement::STATUS_PENDING,
            'hold_reason' => null,
        ]);

        return $settlement->fresh();
    }

    public function addAdjustment(int $tenantId, array $data, ?int $actorId = null): PayoutAdjustment
    {
        return PayoutAdjustment::query()->create([
            'tenant_id' => $tenantId,
            'kind' => $data['kind'] ?? PayoutAdjustment::KIND_CREDIT,
            'reason' => $data['reason'],
            'amount' => $data['amount'],
            'currency' => $data['currency'] ?? config('markethub.currency', 'USD'),
            'status' => PayoutAdjustment::STATUS_PENDING,
            'created_by_user_id' => $actorId,
        ]);
    }

    /** Settlement rows with their order context, for the payouts screens. */
    public function settlementQuery(?int $tenantId = null)
    {
        $query = SellerSettlement::query()->with([
            'sellerOrder' => fn ($q) => $q->withoutGlobalScopes()->with(['order:id,user_id,placed_at,currency', 'store:id,name,slug']),
            'batch:id,reference,status',
        ]);

        if ($tenantId) {
            $query->where('tenant_id', $tenantId);
        }

        return $query;
    }

    public function reference(): string
    {
        return 'PO-'.now()->format('Ymd').'-'.str_pad((string) (PayoutBatch::withoutGlobalScopes()->count() + 1), 5, '0', STR_PAD_LEFT);
    }

    /** Record an order-level refund against the seller's settlement. */
    public function applyRefund(SellerOrder $sellerOrder, string $amount, string $commissionReversal): ?SellerSettlement
    {
        return $this->withoutTenantScope(function () use ($sellerOrder, $amount, $commissionReversal) {
            $settlement = SellerSettlement::query()->where('seller_order_id', $sellerOrder->id)->first();
            if (! $settlement) {
                return null;
            }

            $settlement->refund_amount = bcadd((string) $settlement->refund_amount, $amount, 2);
            $settlement->commission = bcsub((string) $settlement->commission, $commissionReversal, 2);
            if (bccomp((string) $settlement->commission, '0', 2) === -1) {
                $settlement->commission = '0.00';
            }
            $settlement->net = $settlement->recalculateNet();

            if (bccomp((string) $settlement->net, '0', 2) <= 0
                && ! in_array($settlement->status, [SellerSettlement::STATUS_PAID, SellerSettlement::STATUS_PROCESSING], true)) {
                $settlement->status = SellerSettlement::STATUS_REVERSED;
            }

            $settlement->save();

            return $settlement;
        });
    }

    /** Hold back settlements while a dispute is being arbitrated. */
    public function holdForOrder(Order $order, string $reason): void
    {
        $this->withoutTenantScope(function () use ($order, $reason) {
            $sellerOrderIds = SellerOrder::withoutGlobalScopes()->where('order_id', $order->id)->pluck('id');
            SellerSettlement::query()
                ->whereIn('seller_order_id', $sellerOrderIds)
                ->whereIn('status', [SellerSettlement::STATUS_PENDING, SellerSettlement::STATUS_AVAILABLE])
                ->update(['status' => SellerSettlement::STATUS_ON_HOLD, 'hold_reason' => $reason]);
        });
    }

    protected function withoutTenantScope(callable $callback): mixed
    {
        $bypassed = TenantContext::isBypassed();
        TenantContext::bypass(true);
        try {
            return $callback();
        } finally {
            TenantContext::bypass($bypassed);
        }
    }
}
