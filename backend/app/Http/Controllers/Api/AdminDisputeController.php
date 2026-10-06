<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Dispute;
use App\Models\DisputeMessage;
use App\Models\Refund;
use App\Services\Commerce\DisputeService;
use App\Services\Commerce\RefundService;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * §12 / §18 / §27 — the platform arbitration desk.
 *
 * Covers both halves of the "Disputes" nav entry: escalated cases and the
 * refund ledger those cases produce.
 */
class AdminDisputeController extends Controller
{
    public function __construct(
        protected DisputeService $disputes,
        protected RefundService $refunds,
    ) {}

    public function index(Request $request): JsonResponse
    {
        TenantContext::bypass(true);

        $query = Dispute::query()->with([
            'tenant:id,name',
            'store:id,name,slug',
            'raisedBy:id,name,email',
            'assignedAdmin:id,name',
        ]);

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->boolean('open_only')) {
            $query->whereIn('status', Dispute::OPEN_STATUSES);
        }
        if ($request->boolean('escalated_only')) {
            $query->where('status', Dispute::STATUS_ESCALATED);
        }
        if ($request->boolean('overdue_only')) {
            $query->where('status', Dispute::STATUS_AWAITING_SELLER)
                ->whereNotNull('seller_due_at')
                ->where('seller_due_at', '<', now());
        }
        if ($request->filled('tenant_id')) {
            $query->where('tenant_id', $request->integer('tenant_id'));
        }
        if ($request->filled('priority')) {
            $query->where('priority', $request->string('priority'));
        }
        if ($request->filled('q')) {
            $term = '%'.$request->string('q').'%';
            $query->where(fn ($q) => $q->where('reference', 'like', $term)
                ->orWhere('subject', 'like', $term)
                ->orWhere('description', 'like', $term));
        }

        $page = $query
            ->orderByRaw("CASE WHEN status = 'escalated' THEN 0 ELSE 1 END")
            ->orderByDesc('last_activity_at')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 20));

        return response()->json([
            'data' => collect($page->items())->map(fn (Dispute $d) => $this->present($d))->all(),
            'summary' => $this->summary(),
            'meta' => $this->meta($page),
        ]);
    }

    public function show(Dispute $dispute): JsonResponse
    {
        TenantContext::bypass(true);
        $dispute->load([
            'messages' => fn ($q) => $q->orderBy('id'),
            'tenant:id,name',
            'store:id,name,slug',
            'raisedBy:id,name,email',
            'assignedAdmin:id,name',
            'refunds',
            'sellerOrder:id,order_id,store_id,subtotal,discount,delivery_fee,grand_total,currency,status',
        ]);

        return response()->json(['data' => $this->present($dispute, true)]);
    }

    public function reply(Request $request, Dispute $dispute): JsonResponse
    {
        TenantContext::bypass(true);
        $data = $request->validate([
            'body' => ['required', 'string', 'max:4000'],
            'is_internal' => ['nullable', 'boolean'],
        ]);

        $this->disputes->reply(
            $dispute,
            $request->user(),
            DisputeMessage::ROLE_ADMIN,
            $data['body'],
            (bool) ($data['is_internal'] ?? false),
        );

        return response()->json(['data' => $this->present($dispute->fresh(['messages']), true)]);
    }

    public function assign(Request $request, Dispute $dispute): JsonResponse
    {
        TenantContext::bypass(true);
        $data = $request->validate(['admin_id' => ['nullable', 'integer', 'exists:users,id']]);

        $updated = $this->disputes->assign($dispute, $data['admin_id'] ?? $request->user()->id);

        return response()->json(['data' => $this->present($updated->load('assignedAdmin:id,name'))]);
    }

    public function escalate(Request $request, Dispute $dispute): JsonResponse
    {
        TenantContext::bypass(true);
        $data = $request->validate(['note' => ['nullable', 'string', 'max:1000']]);

        $updated = $this->disputes->escalate($dispute, $request->user(), $data['note'] ?? null);

        return response()->json(['data' => $this->present($updated->load('messages'), true)]);
    }

    /** Arbitrate: close the case and optionally push the refund through. */
    public function resolve(Request $request, Dispute $dispute): JsonResponse
    {
        TenantContext::bypass(true);

        $data = $request->validate([
            'outcome' => ['required', 'in:'.implode(',', Dispute::OUTCOMES)],
            'resolution' => ['required', 'string', 'max:2000'],
            'refund_amount' => ['nullable', 'numeric', 'min:0'],
            'restock' => ['nullable', 'boolean'],
        ]);

        $updated = $this->disputes->resolve($dispute, $request->user(), $data);

        return response()->json(['data' => $this->present($updated->load(['messages', 'refunds']), true)]);
    }

    /** Cases where the seller missed the response window. */
    public function overdue(): JsonResponse
    {
        TenantContext::bypass(true);

        $cases = $this->disputes->overdueQuery()
            ->with(['tenant:id,name', 'store:id,name'])
            ->orderBy('seller_due_at')
            ->limit(50)
            ->get();

        return response()->json(['data' => $cases->map(fn (Dispute $d) => $this->present($d))->values()]);
    }

    // ------------------------------------------------------------ refunds

    public function refunds(Request $request): JsonResponse
    {
        TenantContext::bypass(true);

        $query = Refund::query()->with([
            'tenant:id,name',
            'order:id,user_id,currency,grand_total,placed_at',
            'order.user:id,name,email',
            'sellerOrder.store:id,name,slug',
        ]);

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->boolean('open_only')) {
            $query->whereIn('status', Refund::OPEN_STATUSES);
        }
        if ($request->filled('tenant_id')) {
            $query->where('tenant_id', $request->integer('tenant_id'));
        }
        if ($request->filled('q')) {
            $term = '%'.$request->string('q').'%';
            $query->where(fn ($q) => $q->where('reference', 'like', $term)->orWhere('customer_note', 'like', $term));
        }

        $page = $query->orderByDesc('id')->paginate($request->integer('per_page', 20));

        return response()->json([
            'data' => collect($page->items())->map(fn (Refund $r) => $this->presentRefund($r))->all(),
            'summary' => $this->refundSummary(),
            'meta' => $this->meta($page),
        ]);
    }

    public function approveRefund(Request $request, Refund $refund): JsonResponse
    {
        TenantContext::bypass(true);
        $data = $request->validate(['note' => ['nullable', 'string', 'max:1000']]);

        $updated = $this->refunds->approve($refund, $request->user(), $data['note'] ?? null);

        return response()->json(['data' => $this->presentRefund($updated->load(['order.user', 'sellerOrder.store']))]);
    }

    public function rejectRefund(Request $request, Refund $refund): JsonResponse
    {
        TenantContext::bypass(true);
        $data = $request->validate(['note' => ['required', 'string', 'max:1000']]);

        $updated = $this->refunds->reject($refund, $request->user(), $data['note']);

        return response()->json(['data' => $this->presentRefund($updated->load(['order.user', 'sellerOrder.store']))]);
    }

    /** Retry a refund that failed at the gateway. */
    public function retryRefund(Request $request, Refund $refund): JsonResponse
    {
        TenantContext::bypass(true);

        if ($refund->status === Refund::STATUS_FAILED) {
            $refund->update(['status' => Refund::STATUS_APPROVED]);
        }
        $updated = $this->refunds->process($refund->fresh(), $request->user());

        return response()->json(['data' => $this->presentRefund($updated->load(['order.user', 'sellerOrder.store']))]);
    }

    // ----------------------------------------------------------- internals

    protected function summary(): array
    {
        $base = Dispute::query();

        return [
            'open' => (clone $base)->whereIn('status', Dispute::OPEN_STATUSES)->count(),
            'escalated' => (clone $base)->where('status', Dispute::STATUS_ESCALATED)->count(),
            'awaiting_seller' => (clone $base)->where('status', Dispute::STATUS_AWAITING_SELLER)->count(),
            'overdue' => $this->disputes->overdueQuery()->count(),
            'resolved' => (clone $base)->where('status', Dispute::STATUS_RESOLVED)->count(),
            'claimed_value' => number_format(
                (float) (clone $base)->whereIn('status', Dispute::OPEN_STATUSES)->sum('amount_claimed'), 2, '.', ''
            ),
        ];
    }

    protected function refundSummary(): array
    {
        $base = Refund::query();

        return [
            'open' => (clone $base)->whereIn('status', Refund::OPEN_STATUSES)->count(),
            'completed' => (clone $base)->where('status', Refund::STATUS_COMPLETED)->count(),
            'failed' => (clone $base)->where('status', Refund::STATUS_FAILED)->count(),
            'refunded_value' => number_format(
                (float) (clone $base)->where('status', Refund::STATUS_COMPLETED)->sum('amount'), 2, '.', ''
            ),
            'commission_reversed' => number_format(
                (float) (clone $base)->where('status', Refund::STATUS_COMPLETED)->sum('commission_reversal'), 2, '.', ''
            ),
        ];
    }

    protected function present(Dispute $dispute, bool $detailed = false): array
    {
        $payload = [
            'id' => $dispute->id,
            'reference' => $dispute->reference,
            'order_id' => $dispute->order_id,
            'seller_order_id' => $dispute->seller_order_id,
            'tenant_id' => $dispute->tenant_id,
            'tenant' => $dispute->relationLoaded('tenant') ? $dispute->tenant?->name : null,
            'store' => $dispute->relationLoaded('store') && $dispute->store ? [
                'id' => $dispute->store->id,
                'name' => $dispute->store->name,
                'slug' => $dispute->store->slug,
            ] : null,
            'type' => $dispute->type,
            'status' => $dispute->status,
            'priority' => $dispute->priority,
            'subject' => $dispute->subject,
            'description' => $dispute->description,
            'amount_claimed' => (string) $dispute->amount_claimed,
            'currency' => $dispute->currency,
            'outcome' => $dispute->outcome,
            'resolution' => $dispute->resolution,
            'seller_due_at' => $dispute->seller_due_at,
            'is_overdue' => $dispute->isOverdue(),
            'escalated_at' => $dispute->escalated_at,
            'resolved_at' => $dispute->resolved_at,
            'last_activity_at' => $dispute->last_activity_at,
            'created_at' => $dispute->created_at,
            'customer' => $dispute->relationLoaded('raisedBy') && $dispute->raisedBy ? [
                'id' => $dispute->raisedBy->id,
                'name' => $dispute->raisedBy->name,
                'email' => $dispute->raisedBy->email,
            ] : null,
            'assigned_admin' => $dispute->relationLoaded('assignedAdmin') && $dispute->assignedAdmin ? [
                'id' => $dispute->assignedAdmin->id,
                'name' => $dispute->assignedAdmin->name,
            ] : null,
        ];

        if ($detailed) {
            $payload['messages'] = $dispute->relationLoaded('messages')
                ? $dispute->messages->map(fn (DisputeMessage $m) => [
                    'id' => $m->id,
                    'author_role' => $m->author_role,
                    'author_name' => $m->author_name ?? 'MarketHub',
                    'body' => $m->body,
                    'attachments' => $m->attachments ?? [],
                    'is_internal' => (bool) $m->is_internal,
                    'created_at' => $m->created_at,
                ])->values()
                : [];
            $payload['refunds'] = $dispute->relationLoaded('refunds')
                ? $dispute->refunds->map(fn (Refund $r) => [
                    'id' => $r->id,
                    'reference' => $r->reference,
                    'status' => $r->status,
                    'amount' => (string) $r->amount,
                    'processed_at' => $r->processed_at,
                ])->values()
                : [];
            $payload['seller_order'] = $dispute->relationLoaded('sellerOrder') && $dispute->sellerOrder ? [
                'id' => $dispute->sellerOrder->id,
                'status' => $dispute->sellerOrder->status,
                'subtotal' => (string) $dispute->sellerOrder->subtotal,
                'discount' => (string) $dispute->sellerOrder->discount,
                'delivery_fee' => (string) $dispute->sellerOrder->delivery_fee,
                'grand_total' => (string) $dispute->sellerOrder->grand_total,
                'refundable_total' => $dispute->sellerOrder->refundableTotal(),
                'currency' => $dispute->sellerOrder->currency,
            ] : null;
        }

        return $payload;
    }

    protected function presentRefund(Refund $refund): array
    {
        return [
            'id' => $refund->id,
            'reference' => $refund->reference,
            'order_id' => $refund->order_id,
            'seller_order_id' => $refund->seller_order_id,
            'tenant_id' => $refund->tenant_id,
            'tenant' => $refund->relationLoaded('tenant') ? $refund->tenant?->name : null,
            'dispute_id' => $refund->dispute_id,
            'type' => $refund->type,
            'reason' => $refund->reason,
            'status' => $refund->status,
            'amount' => (string) $refund->amount,
            'commission_reversal' => (string) $refund->commission_reversal,
            'net_seller_impact' => (string) $refund->net_seller_impact,
            'currency' => $refund->currency,
            'customer_note' => $refund->customer_note,
            'decision_note' => $refund->decision_note,
            'gateway_ref' => $refund->gateway_ref,
            'requested_at' => $refund->created_at,
            'reviewed_at' => $refund->reviewed_at,
            'processed_at' => $refund->processed_at,
            'store' => $refund->relationLoaded('sellerOrder') && $refund->sellerOrder?->store ? [
                'id' => $refund->sellerOrder->store->id,
                'name' => $refund->sellerOrder->store->name,
                'slug' => $refund->sellerOrder->store->slug,
            ] : null,
            'customer' => $refund->relationLoaded('order') && $refund->order?->user ? [
                'id' => $refund->order->user->id,
                'name' => $refund->order->user->name,
                'email' => $refund->order->user->email,
            ] : null,
        ];
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
