<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Dispute;
use App\Models\DisputeMessage;
use App\Models\SellerOrder;
use App\Services\Commerce\DisputeService;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * §12 / §18 / §27 — buyer-seller disputes with platform escalation.
 */
class DisputeController extends Controller
{
    public function __construct(protected DisputeService $disputes) {}

    /** Customer: my cases. */
    public function mine(Request $request): JsonResponse
    {
        $page = Dispute::query()
            ->with(['sellerOrder.store:id,name,slug'])
            ->where('raised_by_user_id', $request->user()->id)
            ->orderByDesc('last_activity_at')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 15));

        return response()->json([
            'data' => collect($page->items())->map(fn (Dispute $d) => $this->present($d))->all(),
            'meta' => $this->meta($page),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'seller_order_id' => ['required', 'integer', 'exists:seller_orders,id'],
            'type' => ['required', 'in:'.implode(',', Dispute::TYPES)],
            'subject' => ['required', 'string', 'max:200'],
            'description' => ['required', 'string', 'max:4000'],
            'amount_claimed' => ['nullable', 'numeric', 'min:0'],
        ]);

        TenantContext::bypass(true);
        try {
            $sellerOrder = SellerOrder::withoutGlobalScopes()->findOrFail($data['seller_order_id']);
            $dispute = $this->disputes->open($request->user(), $sellerOrder, $data);

            return response()->json(['data' => $this->present($dispute, true)], 201);
        } finally {
            TenantContext::bypass(false);
        }
    }

    /** Shared detail view — scoped by who is asking. */
    public function show(Request $request, Dispute $dispute): JsonResponse
    {
        $this->assertVisible($request, $dispute);

        $dispute->load(['messages' => fn ($q) => $q->orderBy('id'), 'sellerOrder.store:id,name,slug']);

        return response()->json(['data' => $this->present($dispute, true, $this->isStaff($request, $dispute))]);
    }

    public function reply(Request $request, Dispute $dispute): JsonResponse
    {
        $this->assertVisible($request, $dispute);
        $data = $request->validate([
            'body' => ['required', 'string', 'max:4000'],
            'is_internal' => ['nullable', 'boolean'],
        ]);

        $user = $request->user();
        $role = match (true) {
            $user->isSuperAdmin() => DisputeMessage::ROLE_ADMIN,
            (int) $dispute->raised_by_user_id === (int) $user->id => DisputeMessage::ROLE_CUSTOMER,
            default => DisputeMessage::ROLE_SELLER,
        };

        $internal = (bool) ($data['is_internal'] ?? false) && $role !== DisputeMessage::ROLE_CUSTOMER;
        $this->disputes->reply($dispute, $user, $role, $data['body'], $internal);

        $dispute->load(['messages' => fn ($q) => $q->orderBy('id')]);

        return response()->json(['data' => $this->present($dispute->fresh(['messages']), true, $this->isStaff($request, $dispute))]);
    }

    public function escalate(Request $request, Dispute $dispute): JsonResponse
    {
        $this->assertVisible($request, $dispute);
        $data = $request->validate(['note' => ['nullable', 'string', 'max:1000']]);

        $updated = $this->disputes->escalate($dispute, $request->user(), $data['note'] ?? null);

        return response()->json(['data' => $this->present($updated->load('messages'), true, $this->isStaff($request, $dispute))]);
    }

    /** Seller: the case board for this workspace. */
    public function index(Request $request): JsonResponse
    {
        $query = Dispute::query()
            ->with(['sellerOrder:id,order_id,store_id,grand_total,currency', 'raisedBy:id,name,email'])
            ->where('tenant_id', TenantContext::id());

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->boolean('open_only')) {
            $query->whereIn('status', Dispute::OPEN_STATUSES);
        }
        if ($request->filled('q')) {
            $term = '%'.$request->string('q').'%';
            $query->where(fn ($q) => $q->where('reference', 'like', $term)->orWhere('subject', 'like', $term));
        }

        $page = $query->orderByDesc('last_activity_at')->orderByDesc('id')->paginate($request->integer('per_page', 20));

        return response()->json([
            'data' => collect($page->items())->map(fn (Dispute $d) => $this->present($d, false, true))->all(),
            'summary' => $this->summary(TenantContext::id()),
            'meta' => $this->meta($page),
        ]);
    }

    /** Seller: offer a settlement and close the case cooperatively. */
    public function resolve(Request $request, Dispute $dispute): JsonResponse
    {
        $this->assertVisible($request, $dispute);
        abort_if(
            $dispute->status === Dispute::STATUS_ESCALATED && ! $request->user()->isSuperAdmin(),
            403,
            'An escalated case can only be closed by MarketHub.'
        );

        $data = $request->validate([
            'outcome' => ['required', 'in:'.implode(',', Dispute::OUTCOMES)],
            'resolution' => ['required', 'string', 'max:2000'],
            'refund_amount' => ['nullable', 'numeric', 'min:0'],
            'restock' => ['nullable', 'boolean'],
        ]);

        $updated = $this->disputes->resolve($dispute, $request->user(), $data);

        return response()->json(['data' => $this->present($updated, true, true)]);
    }

    // ----------------------------------------------------------- internals

    protected function isStaff(Request $request, Dispute $dispute): bool
    {
        $user = $request->user();

        return $user->isSuperAdmin() || (int) $dispute->raised_by_user_id !== (int) $user->id;
    }

    protected function assertVisible(Request $request, Dispute $dispute): void
    {
        $user = $request->user();
        if ($user->isSuperAdmin()) {
            return;
        }
        if ((int) $dispute->raised_by_user_id === (int) $user->id) {
            return;
        }
        abort_unless((int) $dispute->tenant_id === (int) $user->tenantId(), 403, 'Not your case.');
    }

    protected function summary(?int $tenantId): array
    {
        $base = Dispute::query()->when($tenantId, fn ($q) => $q->where('tenant_id', $tenantId));

        return [
            'open' => (clone $base)->whereIn('status', Dispute::OPEN_STATUSES)->count(),
            'awaiting_seller' => (clone $base)->where('status', Dispute::STATUS_AWAITING_SELLER)->count(),
            'escalated' => (clone $base)->where('status', Dispute::STATUS_ESCALATED)->count(),
            'overdue' => (clone $base)
                ->where('status', Dispute::STATUS_AWAITING_SELLER)
                ->whereNotNull('seller_due_at')
                ->where('seller_due_at', '<', now())
                ->count(),
            'resolved' => (clone $base)->where('status', Dispute::STATUS_RESOLVED)->count(),
        ];
    }

    protected function present(Dispute $dispute, bool $withMessages = false, bool $staff = false): array
    {
        $payload = [
            'id' => $dispute->id,
            'reference' => $dispute->reference,
            'order_id' => $dispute->order_id,
            'seller_order_id' => $dispute->seller_order_id,
            'tenant_id' => $dispute->tenant_id,
            'store_id' => $dispute->store_id,
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
            'store' => $dispute->relationLoaded('sellerOrder') && $dispute->sellerOrder?->store ? [
                'id' => $dispute->sellerOrder->store->id,
                'name' => $dispute->sellerOrder->store->name,
                'slug' => $dispute->sellerOrder->store->slug,
            ] : null,
            'customer' => $staff && $dispute->relationLoaded('raisedBy') && $dispute->raisedBy ? [
                'id' => $dispute->raisedBy->id,
                'name' => $dispute->raisedBy->name,
                'email' => $dispute->raisedBy->email,
            ] : null,
        ];

        if ($withMessages) {
            $payload['messages'] = $dispute->relationLoaded('messages')
                ? $dispute->messages
                    ->filter(fn (DisputeMessage $m) => $staff || ! $m->is_internal)
                    ->map(fn (DisputeMessage $m) => [
                        'id' => $m->id,
                        'author_role' => $m->author_role,
                        'author_name' => $m->author_name ?? 'MarketHub',
                        'body' => $m->body,
                        'attachments' => $m->attachments ?? [],
                        'is_internal' => (bool) $m->is_internal,
                        'created_at' => $m->created_at,
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
