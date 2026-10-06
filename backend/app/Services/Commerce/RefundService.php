<?php

namespace App\Services\Commerce;

use App\Models\Inventory;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\PaymentTransaction;
use App\Models\Refund;
use App\Models\RefundItem;
use App\Models\SellerOrder;
use App\Models\StockMovement;
use App\Models\User;
use App\Services\Integration\EventBus;
use App\Services\Notifications\NotificationService;
use App\Services\Payment\PaymentGateway;
use App\Support\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * §12 / §18 — refunds with a real ledger impact.
 *
 * A refund belongs to one seller order so the settlement can be adjusted:
 * the refunded value is recorded, commission is reversed pro rata, and the
 * seller's net payout shrinks accordingly.
 */
class RefundService
{
    public function __construct(
        protected PaymentGateway $gateway,
        protected PayoutService $payouts,
        protected NotificationService $notifications,
        protected EventBus $events,
    ) {}

    /**
     * Open a refund request.
     *
     * @param  array{type?:string, reason?:string, amount?:string|float|null, customer_note?:string|null, items?:array<int,array{order_item_id:int, qty:int}>, restock?:bool, dispute_id?:int|null, status?:string}  $data
     */
    public function create(SellerOrder $sellerOrder, ?User $actor, array $data): Refund
    {
        $order = $sellerOrder->order()->first();
        if (! $order) {
            throw ValidationException::withMessages(['order' => 'The parent order could not be found.']);
        }

        $type = $data['type'] ?? Refund::TYPE_PARTIAL;
        $items = $data['items'] ?? [];

        $amount = $type === Refund::TYPE_FULL
            ? $sellerOrder->refundableTotal()
            : $this->money($data['amount'] ?? $this->amountFromItems($sellerOrder, $items));

        if (bccomp($amount, '0', 2) <= 0) {
            throw ValidationException::withMessages(['amount' => 'A refund needs an amount greater than zero.']);
        }

        $refundable = $sellerOrder->refundableTotal();
        if (bccomp($amount, $refundable, 2) === 1) {
            throw ValidationException::withMessages([
                'amount' => 'You can refund at most '.$refundable.' on this order.',
            ]);
        }

        $refund = DB::transaction(function () use ($order, $sellerOrder, $actor, $data, $type, $amount, $items) {
            $refund = Refund::query()->create([
                'reference' => $this->reference(),
                'order_id' => $order->id,
                'seller_order_id' => $sellerOrder->id,
                'tenant_id' => $sellerOrder->tenant_id,
                'payment_transaction_id' => $this->transactionFor($order)?->id,
                'dispute_id' => $data['dispute_id'] ?? null,
                'requested_by_user_id' => $actor?->id,
                'type' => $type,
                'reason' => $data['reason'] ?? 'other',
                'customer_note' => $data['customer_note'] ?? null,
                'status' => $data['status'] ?? Refund::STATUS_REQUESTED,
                'amount' => $amount,
                'delivery_refund' => $this->money($data['delivery_refund'] ?? 0),
                'currency' => $order->currency,
                'restock' => $data['restock'] ?? true,
            ]);

            foreach ($items as $line) {
                $orderItem = OrderItem::query()
                    ->where('seller_order_id', $sellerOrder->id)
                    ->find($line['order_item_id'] ?? 0);
                if (! $orderItem) {
                    continue;
                }
                $qty = max(1, (int) ($line['qty'] ?? 1));
                RefundItem::query()->create([
                    'refund_id' => $refund->id,
                    'order_item_id' => $orderItem->id,
                    'qty' => $qty,
                    'unit_price' => $orderItem->unit_price,
                    'amount' => bcmul((string) $orderItem->unit_price, (string) $qty, 2),
                    'restock' => $data['restock'] ?? true,
                ]);
            }

            return $refund;
        });

        $this->notifications->toTenant($sellerOrder->tenant_id, 'dispute', 'Refund requested on order #'.$order->id, [
            'body' => 'A customer asked for '.$order->currency.' '.$amount.' back. Review it in the refunds queue.',
            'action_url' => '/tenant/refunds',
            'action_label' => 'Review refund',
            'level' => 'warning',
            'subject_type' => Refund::class,
            'subject_id' => $refund->id,
        ]);
        $this->notifications->toAdmins('dispute', 'Refund requested on order #'.$order->id, [
            'body' => 'Refund '.$refund->reference.' is awaiting a decision.',
            'action_url' => '/admin/disputes',
            'action_label' => 'Open refunds',
            'subject_type' => Refund::class,
            'subject_id' => $refund->id,
        ]);

        return $refund->fresh(['items']);
    }

    public function approve(Refund $refund, ?User $actor = null, ?string $note = null): Refund
    {
        if (! in_array($refund->status, [Refund::STATUS_REQUESTED], true)) {
            throw ValidationException::withMessages(['status' => 'Only a requested refund can be approved.']);
        }

        $refund->update([
            'status' => Refund::STATUS_APPROVED,
            'reviewed_by_user_id' => $actor?->id,
            'reviewed_at' => now(),
            'decision_note' => $note,
        ]);

        return $this->process($refund->fresh(), $actor);
    }

    public function reject(Refund $refund, ?User $actor, string $note): Refund
    {
        if (! $refund->isOpen()) {
            throw ValidationException::withMessages(['status' => 'This refund has already been settled.']);
        }

        $refund->update([
            'status' => Refund::STATUS_REJECTED,
            'reviewed_by_user_id' => $actor?->id,
            'reviewed_at' => now(),
            'decision_note' => $note,
        ]);

        $order = $refund->order()->first();
        $this->notifications->toCustomer($order?->user_id, 'dispute', 'Refund declined', [
            'body' => $note,
            'action_url' => '/orders/'.$refund->order_id,
            'action_label' => 'View order',
            'level' => 'warning',
            'subject_type' => Refund::class,
            'subject_id' => $refund->id,
        ]);

        return $refund->fresh();
    }

    /**
     * Move the money and adjust every downstream ledger: payment gateway,
     * seller settlement, inventory and the order status.
     */
    public function process(Refund $refund, ?User $actor = null): Refund
    {
        if ($refund->status === Refund::STATUS_COMPLETED) {
            return $refund;
        }
        if (! in_array($refund->status, [Refund::STATUS_APPROVED, Refund::STATUS_PROCESSING], true)) {
            throw ValidationException::withMessages(['status' => 'Approve the refund before processing it.']);
        }

        $refund->update(['status' => Refund::STATUS_PROCESSING]);

        $transaction = $refund->payment_transaction_id
            ? PaymentTransaction::query()->find($refund->payment_transaction_id)
            : $this->transactionFor($refund->order()->first());

        $gatewayRef = null;
        if ($transaction) {
            try {
                $result = $this->gateway->refund($transaction, (string) $refund->amount);
                if (! $result->success) {
                    $refund->update(['status' => Refund::STATUS_FAILED, 'decision_note' => $result->message]);

                    return $refund->fresh();
                }
                $gatewayRef = $result->refundRef;
            } catch (\Throwable $e) {
                $refund->update(['status' => Refund::STATUS_FAILED, 'decision_note' => $e->getMessage()]);

                return $refund->fresh();
            }
        }

        DB::transaction(function () use ($refund, $actor, $gatewayRef) {
            $sellerOrder = SellerOrder::withoutGlobalScopes()->find($refund->seller_order_id);
            $commissionReversal = '0.00';

            if ($sellerOrder) {
                $commissionReversal = $this->commissionReversalFor($sellerOrder, (string) $refund->amount);
                $this->payouts->applyRefund($sellerOrder, (string) $refund->amount, $commissionReversal);
                $this->restock($refund);

                // Mark the seller order refunded once nothing is left.
                if (bccomp($sellerOrder->fresh()->refundableTotal(), '0', 2) <= 0) {
                    $sellerOrder->update(['status' => SellerOrder::STATUS_REFUNDED]);
                }
            }

            $refund->update([
                'status' => Refund::STATUS_COMPLETED,
                'gateway_ref' => $gatewayRef,
                'commission_reversal' => $commissionReversal,
                'net_seller_impact' => bcsub((string) $refund->amount, $commissionReversal, 2),
                'processed_at' => now(),
                'reviewed_by_user_id' => $refund->reviewed_by_user_id ?: $actor?->id,
            ]);

            $this->syncOrderStatus($refund->order()->first());
        });

        $order = $refund->order()->first();

        $this->notifications->toCustomer($order?->user_id, 'payment', 'Refund issued for order #'.$refund->order_id, [
            'body' => $refund->currency.' '.$refund->amount.' is on its way back to you.',
            'action_url' => '/orders/'.$refund->order_id,
            'action_label' => 'View order',
            'level' => 'success',
            'subject_type' => Refund::class,
            'subject_id' => $refund->id,
        ]);
        $this->notifications->toTenant($refund->tenant_id, 'payout', 'Refund processed on order #'.$refund->order_id, [
            'body' => 'Your settlement was adjusted by '.$refund->currency.' '.$refund->amount.'.',
            'action_url' => '/tenant/payouts',
            'action_label' => 'View settlements',
            'level' => 'warning',
            'subject_type' => Refund::class,
            'subject_id' => $refund->id,
        ]);

        try {
            $this->events->emit($refund->tenant_id, 'order.refunded', [
                'order_id' => $refund->order_id,
                'seller_order_id' => $refund->seller_order_id,
                'amount' => (string) $refund->amount,
                'reference' => $refund->reference,
            ]);
        } catch (\Throwable) {
            // Outbound webhooks must never break a refund.
        }

        return $refund->fresh(['items']);
    }

    /** What share of the commission comes back when `$amount` is refunded. */
    public function commissionReversalFor(SellerOrder $sellerOrder, string $amount): string
    {
        $rate = (string) ($sellerOrder->commission_rate ?? '0');
        if (bccomp($rate, '0', 4) === 1) {
            return bcdiv(bcmul($amount, $rate, 6), '100', 2);
        }

        // Legacy rows: derive the rate from what was actually charged.
        $basis = bcsub((string) $sellerOrder->subtotal, (string) ($sellerOrder->discount ?? '0'), 2);
        if (bccomp($basis, '0', 2) <= 0) {
            return '0.00';
        }

        return bcdiv(bcmul($amount, (string) $sellerOrder->commission, 6), $basis, 2);
    }

    protected function restock(Refund $refund): void
    {
        if (! $refund->restock) {
            return;
        }

        TenantContext::bypass(true);
        try {
            foreach ($refund->items()->with('orderItem')->get() as $line) {
                if (! $line->restock || ! $line->orderItem) {
                    continue;
                }
                $inventory = Inventory::withoutGlobalScopes()
                    ->where('variant_id', $line->orderItem->variant_id)
                    ->first();
                if (! $inventory) {
                    continue;
                }
                $before = (int) $inventory->quantity;
                $inventory->quantity = $before + (int) $line->qty;
                $inventory->version = (int) $inventory->version + 1;
                $inventory->save();

                $this->logStockMovement($inventory, $line->qty, $before, $refund);
            }
        } finally {
            TenantContext::bypass(false);
        }
    }

    protected function logStockMovement(Inventory $inventory, int $qty, int $before, Refund $refund): void
    {
        try {
            StockMovement::withoutGlobalScopes()->create([
                'tenant_id' => $inventory->tenant_id,
                'inventory_id' => $inventory->id,
                'variant_id' => $inventory->variant_id,
                'type' => 'return',
                'quantity' => $qty,
                'quantity_before' => $before,
                'quantity_after' => $before + $qty,
                'reference' => $refund->reference,
                'note' => 'Refund restock',
            ]);
        } catch (\Throwable) {
            // Movement history is advisory; never block the refund.
        }
    }

    protected function syncOrderStatus(?Order $order): void
    {
        if (! $order) {
            return;
        }

        $sellerOrders = SellerOrder::withoutGlobalScopes()->where('order_id', $order->id)->get();
        if ($sellerOrders->isEmpty()) {
            return;
        }

        $allRefunded = $sellerOrders->every(fn (SellerOrder $so) => bccomp($so->refundableTotal(), '0', 2) <= 0);
        if ($allRefunded) {
            $order->update(['status' => Order::STATUS_REFUNDED]);
        }
    }

    protected function amountFromItems(SellerOrder $sellerOrder, array $items): string
    {
        $total = '0.00';
        foreach ($items as $line) {
            $orderItem = OrderItem::query()
                ->where('seller_order_id', $sellerOrder->id)
                ->find($line['order_item_id'] ?? 0);
            if (! $orderItem) {
                continue;
            }
            $qty = max(1, (int) ($line['qty'] ?? 1));
            $total = bcadd($total, bcmul((string) $orderItem->unit_price, (string) $qty, 2), 2);
        }

        return $total;
    }

    protected function transactionFor(?Order $order): ?PaymentTransaction
    {
        if (! $order) {
            return null;
        }

        return PaymentTransaction::query()
            ->where('order_id', $order->id)
            ->where('status', PaymentTransaction::STATUS_SUCCEEDED)
            ->latest('id')
            ->first();
    }

    public function reference(): string
    {
        return 'RF-'.strtoupper(Str::random(10));
    }

    protected function money(string|float|int|null $value): string
    {
        return number_format((float) ($value ?? 0), 2, '.', '');
    }
}
