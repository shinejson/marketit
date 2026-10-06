<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CheckoutService;
use App\Services\Payment\PaymentConfiguration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CheckoutController extends Controller
{
    public function __construct(
        protected CheckoutService $checkout,
        protected PaymentConfiguration $payments,
    ) {}

    public function quote(Request $request): JsonResponse
    {
        $data = $request->validate([
            'address_id' => ['nullable', 'integer', 'exists:addresses,id'],
            'shipping_address_id' => ['nullable', 'integer', 'exists:addresses,id'],
            'delivery_choices' => ['nullable', 'array'],
        ]);

        return response()->json([
            'data' => $this->checkout->quote($request->user(), [
                'address_id' => $data['address_id'] ?? $data['shipping_address_id'] ?? null,
                'delivery_choices' => $this->choices($request),
            ]),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $key = $request->header('Idempotency-Key');
        if (! $key) {
            throw ValidationException::withMessages([
                'Idempotency-Key' => 'Idempotency-Key header is required.',
            ]);
        }
        $data = $request->validate([
            'shipping_address_id' => ['required', 'integer', 'exists:addresses,id'],
            'payment_method' => ['nullable', 'string', 'max:32'],
            'delivery_choices' => ['nullable', 'array'],
        ]);
        $paymentMethod = (string) ($data['payment_method'] ?? 'card');
        if (! $this->payments->supports($paymentMethod)) {
            throw ValidationException::withMessages([
                'payment_method' => 'That payment method is not available right now.',
            ]);
        }

        $payload = $this->checkout->checkout(
            $request->user(),
            (int) $data['shipping_address_id'],
            $key,
            $paymentMethod,
            $this->choices($request),
        );

        return response()->json($payload, 201);
    }

    /** @return array<int|string, int> storeId => deliveryMethodId */
    protected function choices(Request $request): array
    {
        $choices = $request->input('delivery_choices', []);
        if (is_string($choices)) {
            $choices = json_decode($choices, true) ?: [];
        }

        return is_array($choices) ? $choices : [];
    }
}
