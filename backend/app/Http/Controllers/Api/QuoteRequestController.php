<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\SalesCustomer;
use App\Models\SalesQuote;
use App\Models\Store;
use App\Models\TenantSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Customer side of the quote channel: shoppers raise a request-for-quote
 * from any product page, follow its status under "My quotes", and accept
 * or decline once the merchant sends a priced offer.
 *
 * Requested quotes land in the tenant's sales workspace as normal
 * quotations flagged with source = 'customer_request', so staff keep one
 * pipeline for both manual and inbound quotes.
 */
class QuoteRequestController extends Controller
{
    /** Tax classes that never attract tax, mirroring CartService. */
    private const TAX_FREE_CLASSES = ['zero-rated', 'zero_rated', 'zero', 'exempt', 'out_of_scope'];

    public function index(Request $request): JsonResponse
    {
        $quotes = SalesQuote::query()
            ->where('customer_user_id', $request->user()->id)
            ->with(['items', 'tenant:id,name,slug'])
            ->latest()
            ->paginate(min(50, max(1, $request->integer('per_page', 20))));

        return response()->json([
            'data' => $quotes->items(),
            'meta' => [
                'page' => $quotes->currentPage(),
                'per_page' => $quotes->perPage(),
                'total' => $quotes->total(),
                'last_page' => $quotes->lastPage(),
            ],
        ]);
    }

    /**
     * Create a request-for-quote. Prices and tax are always derived
     * server-side from the live catalogue so customers can propose
     * quantities but never amounts.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'store_id' => ['required', 'integer', 'exists:stores,id'],
            'message' => ['nullable', 'string', 'max:2000'],
            'items' => ['required', 'array', 'min:1', 'max:20'],
            'items.*.product_id' => ['required', 'integer', 'distinct'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0', 'max:100000'],
        ]);

        $user = $request->user();
        $store = Store::withoutGlobalScopes()
            ->whereKey($data['store_id'])
            ->where('status', Store::STATUS_ACTIVE)
            ->with('tenant')
            ->firstOrFail();

        abort_if(! $store->tenant || $store->tenant->status !== 'active', 404, 'Store is not available.');

        $tenantId = (int) $store->tenant_id;
        $productIds = collect($data['items'])->pluck('product_id');
        $products = Product::withoutGlobalScopes()
            ->whereIn('id', $productIds)
            ->where('store_id', $store->id)
            ->where('status', Product::STATUS_ACTIVE)
            ->get()
            ->keyBy('id');

        if ($products->count() !== $productIds->unique()->count()) {
            throw ValidationException::withMessages(['items' => 'One or more products are not available from this store.']);
        }

        $settings = TenantSetting::withoutGlobalScopes()->where('tenant_id', $tenantId)->first();
        $tenantTax = (float) ($settings?->tax_rate ?? 0);
        $currency = $settings?->currency ?? 'USD';

        $quote = DB::transaction(function () use ($data, $user, $store, $products, $tenantId, $tenantTax, $currency) {
            $subtotal = 0.0;
            $tax = 0.0;
            $rows = [];

            foreach ($data['items'] as $line) {
                $product = $products->get((int) $line['product_id']);
                $qty = (float) $line['quantity'];
                $lineSubtotal = round($qty * (float) $product->price, 2);
                $rate = $this->taxRateFor($product, $tenantTax);
                $lineTax = round($lineSubtotal * ($rate / 100), 2);
                $subtotal += $lineSubtotal;
                $tax += $lineTax;
                $rows[] = [
                    'description' => $product->name,
                    'quantity' => $qty,
                    'unit_price' => (float) $product->price,
                    'tax_rate' => $rate,
                    'line_subtotal' => $lineSubtotal,
                    'line_tax' => $lineTax,
                    'line_total' => round($lineSubtotal + $lineTax, 2),
                ];
            }

            // Attach the CRM customer record when one exists for this email.
            $accountId = SalesCustomer::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->where('email', $user->email)
                ->value('id');

            $quote = SalesQuote::withoutGlobalScopes()->create([
                'tenant_id' => $tenantId,
                'customer_id' => $accountId,
                'customer_user_id' => $user->id,
                'source' => 'customer_request',
                'created_by' => null,
                'number' => $this->nextNumber($tenantId),
                'customer_name' => $user->name,
                'customer_email' => $user->email,
                'issue_date' => today(),
                'expiry_date' => today()->addDays(14),
                'status' => 'draft',
                'subtotal' => round($subtotal, 2),
                'tax_total' => round($tax, 2),
                'discount_total' => 0,
                'total' => round($subtotal + $tax, 2),
                'currency' => strtoupper($currency),
                'notes' => 'Requested by customer — review pricing and send when ready.',
                'request_message' => $data['message'] ?? null,
            ]);
            $quote->items()->createMany($rows);

            return $quote;
        });

        return response()->json([
            'data' => $quote->load(['items', 'tenant:id,name,slug']),
        ], 201);
    }

    public function show(Request $request, int $quote): JsonResponse
    {
        $model = $this->ownQuote($request, $quote);

        return response()->json(['data' => $model->load(['items', 'tenant:id,name,slug'])]);
    }

    /** Customer answers a priced quote: accept or decline. */
    public function respond(Request $request, int $quote): JsonResponse
    {
        $data = $request->validate([
            'action' => ['required', 'in:accept,decline'],
        ]);

        $model = $this->ownQuote($request, $quote);
        if ($model->status !== 'sent') {
            throw ValidationException::withMessages([
                'quote' => 'Only a quote the merchant has sent can be answered.',
            ]);
        }

        $target = $data['action'] === 'accept' ? 'accepted' : 'declined';
        if (! $model->canTransitionTo($target)) {
            throw ValidationException::withMessages(['quote' => "This quote cannot be {$target} anymore."]);
        }

        $model->update([
            'status' => $target,
            'accepted_at' => $target === 'accepted' ? now() : null,
        ]);

        return response()->json(['data' => $model->fresh()->load(['items', 'tenant:id,name,slug'])]);
    }

    private function ownQuote(Request $request, int $id): SalesQuote
    {
        return SalesQuote::query()
            ->where('customer_user_id', $request->user()->id)
            ->whereKey($id)
            ->firstOrFail();
    }

    private function taxRateFor(Product $product, float $tenantDefault): float
    {
        $class = strtolower((string) $product->tax_class);
        if (in_array($class, self::TAX_FREE_CLASSES, true)) {
            return 0.0;
        }

        return $product->tax_rate !== null ? (float) $product->tax_rate : $tenantDefault;
    }

    private function nextNumber(int $tenantId): string
    {
        $base = SalesQuote::withoutGlobalScopes()->where('tenant_id', $tenantId);
        $next = ((int) (clone $base)->max('id')) + 1;
        $candidate = sprintf('RFQ-%s-%05d', now()->format('Y'), $next);
        while ((clone $base)->where('number', $candidate)->exists()) {
            $candidate = sprintf('RFQ-%s-%05d', now()->format('Y'), ++$next);
        }

        return $candidate;
    }
}
