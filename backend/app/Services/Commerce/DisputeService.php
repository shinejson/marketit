<?php

namespace App\Services\Commerce;

use App\Models\Dispute;
use App\Models\DisputeMessage;
use App\Models\Order;
use App\Models\Refund;
use App\Models\SellerOrder;
use App\Models\User;
use App\Services\Notifications\NotificationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * §18 / §27 — the dispute escalation flow.
 *
 * customer opens → seller must answer inside the response window →
 * either side can escalate to the platform → an admin arbitrates and
 * (optionally) triggers a refund.
 */
class DisputeService
{
    /** How long a seller has to respond before the case can be escalated. */
    public const SELLER_RESPONSE_HOURS = 72;

    public function __construct(
        protected NotificationService $notifications,
        protected RefundService $refunds,
        protected PayoutService $payouts,
    ) {}

    public function open(User $customer, SellerOrder $sellerOrder, array $data): Dispute
    {
        $order = $sellerOrder->order()->first();
        if (! $order || (int) $order->user_id !== (int) $customer->id) {
            throw ValidationException::withMessages(['order' => 'You can only raise a dispute on your own order.']);
        }

        $existing = Dispute::query()
            ->where('seller_order_id', $sellerOrder->id)
            ->whereIn('status', Dispute::OPEN_STATUSES)
            ->first();
        if ($existing) {
            throw ValidationException::withMessages(['dispute' => 'There is already an open case on this order.']);
        }

        $dispute = DB::transaction(function () use ($customer, $order, $sellerOrder, $data) {
            $dispute = Dispute::query()->create([
                'reference' => $this->reference(),
                'order_id' => $order->id,
                'seller_order_id' => $sellerOrder->id,
                'tenant_id' => $sellerOrder->tenant_id,
                'store_id' => $sellerOrder->store_id,
                'raised_by_user_id' => $customer->id,
                'type' => $data['type'] ?? 'other',
                'status' => Dispute::STATUS_AWAITING_SELLER,
                'priority' => $data['priority'] ?? 'normal',
                'subject' => $data['subject'],
                'description' => $data['description'],
                'amount_claimed' => $data['amount_claimed'] ?? $sellerOrder->refundableTotal(),
                'currency' => $order->currency,
                'seller_due_at' => now()->addHours(self::SELLER_RESPONSE_HOURS),
                'last_activity_at' => now(),
            ]);

            DisputeMessage::query()->create([
                'dispute_id' => $dispute->id,
                'user_id' => $customer->id,
                'author_role' => DisputeMessage::ROLE_CUSTOMER,
                'author_name' => $customer->name,
                'body' => $data['description'],
            ]);

            return $dispute;
        });

        // Money stays put while the case is live (§12).
        $this->payouts->holdForOrder($order, 'Dispute '.$dispute->reference.' is open.');

        $this->notifications->toTenant($sellerOrder->tenant_id, 'dispute', 'New dispute on order #'.$order->id, [
            'body' => $dispute->subject.' — you have '.self::SELLER_RESPONSE_HOURS.' hours to respond.',
            'action_url' => '/tenant/disputes',
            'action_label' => 'Respond',
            'level' => 'critical',
            'subject_type' => Dispute::class,
            'subject_id' => $dispute->id,
        ]);
        $this->notifications->toAdmins('dispute', 'Dispute '.$dispute->reference.' opened', [
            'body' => 'A customer raised "'.$dispute->subject.'" on order #'.$order->id.'.',
            'action_url' => '/admin/disputes',
            'action_label' => 'Open case',
            'subject_type' => Dispute::class,
            'subject_id' => $dispute->id,
        ]);

        return $dispute->fresh(['messages']);
    }

    public function reply(Dispute $dispute, ?User $author, string $role, string $body, bool $internal = false): DisputeMessage
    {
        if (! $dispute->isOpen() && ! $internal) {
            throw ValidationException::withMessages(['dispute' => 'This case is closed.']);
        }

        $message = DisputeMessage::query()->create([
            'dispute_id' => $dispute->id,
            'user_id' => $author?->id,
            'author_role' => $role,
            'author_name' => $author?->name,
            'body' => $body,
            'is_internal' => $internal,
        ]);

        if (! $internal) {
            $dispute->update([
                'status' => match ($role) {
                    DisputeMessage::ROLE_SELLER => Dispute::STATUS_AWAITING_CUSTOMER,
                    DisputeMessage::ROLE_CUSTOMER => $dispute->status === Dispute::STATUS_ESCALATED
                        ? Dispute::STATUS_ESCALATED
                        : Dispute::STATUS_AWAITING_SELLER,
                    default => $dispute->status,
                },
                'last_activity_at' => now(),
            ]);

            $this->announceReply($dispute, $role);
        }

        return $message;
    }

    public function escalate(Dispute $dispute, ?User $actor = null, ?string $note = null): Dispute
    {
        if ($dispute->status === Dispute::STATUS_ESCALATED) {
            return $dispute;
        }
        if (! $dispute->isOpen()) {
            throw ValidationException::withMessages(['dispute' => 'This case is already closed.']);
        }

        $dispute->update([
            'status' => Dispute::STATUS_ESCALATED,
            'escalated_at' => now(),
            'priority' => 'high',
            'last_activity_at' => now(),
        ]);

        DisputeMessage::query()->create([
            'dispute_id' => $dispute->id,
            'user_id' => $actor?->id,
            'author_role' => DisputeMessage::ROLE_SYSTEM,
            'author_name' => 'MarketHub',
            'body' => $note ?: 'The case was escalated to the MarketHub resolution team.',
        ]);

        $this->notifications->toAdmins('dispute', 'Dispute '.$dispute->reference.' escalated', [
            'body' => 'This case now needs platform arbitration.',
            'action_url' => '/admin/disputes',
            'action_label' => 'Arbitrate',
            'level' => 'critical',
            'subject_type' => Dispute::class,
            'subject_id' => $dispute->id,
        ]);
        $this->notifications->toTenant($dispute->tenant_id, 'dispute', 'Dispute '.$dispute->reference.' escalated', [
            'body' => 'MarketHub is now reviewing this case.',
            'action_url' => '/tenant/disputes',
            'action_label' => 'View case',
            'level' => 'warning',
            'subject_type' => Dispute::class,
            'subject_id' => $dispute->id,
        ]);

        return $dispute->fresh();
    }

    public function assign(Dispute $dispute, ?int $adminId): Dispute
    {
        $dispute->update(['assigned_admin_id' => $adminId, 'last_activity_at' => now()]);

        return $dispute->fresh();
    }

    /**
     * Close the case. When the outcome is a refund the ledger adjustment is
     * created and processed in the same step.
     *
     * @param  array{outcome:string, resolution:string, refund_amount?:string|float|null, restock?:bool}  $data
     */
    public function resolve(Dispute $dispute, ?User $actor, array $data): Dispute
    {
        if (! $dispute->isOpen()) {
            throw ValidationException::withMessages(['dispute' => 'This case is already closed.']);
        }

        $outcome = $data['outcome'];
        $refundAmount = $data['refund_amount'] ?? null;

        DB::transaction(function () use ($dispute, $actor, $data, $outcome, $refundAmount) {
            $dispute->update([
                'status' => in_array($outcome, ['no_action', 'seller_favour'], true)
                    ? Dispute::STATUS_REJECTED
                    : Dispute::STATUS_RESOLVED,
                'outcome' => $outcome,
                'resolution' => $data['resolution'],
                'resolved_at' => now(),
                'last_activity_at' => now(),
                'assigned_admin_id' => $dispute->assigned_admin_id ?: $actor?->id,
            ]);

            DisputeMessage::query()->create([
                'dispute_id' => $dispute->id,
                'user_id' => $actor?->id,
                'author_role' => DisputeMessage::ROLE_ADMIN,
                'author_name' => $actor?->name ?? 'MarketHub',
                'body' => $data['resolution'],
            ]);

            if (in_array($outcome, ['refund_full', 'refund_partial', 'customer_favour'], true)) {
                $sellerOrder = SellerOrder::withoutGlobalScopes()->find($dispute->seller_order_id);
                if ($sellerOrder) {
                    $refund = $this->refunds->create($sellerOrder, $actor, [
                        'type' => $outcome === 'refund_full' ? Refund::TYPE_FULL : Refund::TYPE_PARTIAL,
                        'reason' => in_array($dispute->type, Refund::REASONS, true) ? $dispute->type : 'other',
                        'amount' => $refundAmount ?? $dispute->amount_claimed,
                        'customer_note' => $dispute->subject,
                        'dispute_id' => $dispute->id,
                        'restock' => $data['restock'] ?? true,
                        'status' => Refund::STATUS_APPROVED,
                    ]);
                    $this->refunds->process($refund->fresh(), $actor);
                }
            }
        });

        // Release the settlement hold now the case is closed.
        $order = $dispute->order()->first();
        if ($order) {
            $this->releaseHold($order);
        }

        $this->notifications->toCustomer($dispute->raised_by_user_id, 'dispute', 'Dispute '.$dispute->reference.' resolved', [
            'body' => $data['resolution'],
            'action_url' => '/orders/'.$dispute->order_id,
            'action_label' => 'View order',
            'level' => 'success',
            'subject_type' => Dispute::class,
            'subject_id' => $dispute->id,
        ]);
        $this->notifications->toTenant($dispute->tenant_id, 'dispute', 'Dispute '.$dispute->reference.' resolved', [
            'body' => $data['resolution'],
            'action_url' => '/tenant/disputes',
            'action_label' => 'View case',
            'subject_type' => Dispute::class,
            'subject_id' => $dispute->id,
        ]);

        return $dispute->fresh(['messages']);
    }

    /** Cases where the seller has blown the response window. */
    public function overdueQuery()
    {
        return Dispute::query()
            ->where('status', Dispute::STATUS_AWAITING_SELLER)
            ->whereNotNull('seller_due_at')
            ->where('seller_due_at', '<', now());
    }

    public function reference(): string
    {
        return 'DP-'.strtoupper(Str::random(8));
    }

    protected function releaseHold(Order $order): void
    {
        $sellerOrderIds = SellerOrder::withoutGlobalScopes()->where('order_id', $order->id)->pluck('id');
        \App\Models\SellerSettlement::query()
            ->whereIn('seller_order_id', $sellerOrderIds)
            ->where('status', \App\Models\SellerSettlement::STATUS_ON_HOLD)
            ->get()
            ->each(fn ($settlement) => $this->payouts->unhold($settlement));
    }

    protected function announceReply(Dispute $dispute, string $role): void
    {
        if ($role === DisputeMessage::ROLE_SELLER) {
            $this->notifications->toCustomer($dispute->raised_by_user_id, 'dispute', 'The seller replied to '.$dispute->reference, [
                'body' => 'Open the case to read the response.',
                'action_url' => '/orders/'.$dispute->order_id,
                'action_label' => 'Read reply',
                'subject_type' => Dispute::class,
                'subject_id' => $dispute->id,
            ]);

            return;
        }

        if ($role === DisputeMessage::ROLE_CUSTOMER) {
            $this->notifications->toTenant($dispute->tenant_id, 'dispute', 'New message on '.$dispute->reference, [
                'body' => 'The customer added more detail to their case.',
                'action_url' => '/tenant/disputes',
                'action_label' => 'Read message',
                'subject_type' => Dispute::class,
                'subject_id' => $dispute->id,
            ]);

            return;
        }

        $this->notifications->toCustomer($dispute->raised_by_user_id, 'dispute', 'MarketHub replied to '.$dispute->reference, [
            'body' => 'Our resolution team added an update to your case.',
            'action_url' => '/orders/'.$dispute->order_id,
            'action_label' => 'Read update',
            'subject_type' => Dispute::class,
            'subject_id' => $dispute->id,
        ]);
    }
}
