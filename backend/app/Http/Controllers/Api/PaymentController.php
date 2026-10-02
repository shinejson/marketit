<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Models\WebhookEvent;
use App\Services\CheckoutService;
use App\Services\Payment\PaymentConfiguration;
use App\Services\Payment\PaymentGateway;
use App\Services\Payment\WebhookRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PaymentController extends Controller
{
    public function __construct(
        protected PaymentGateway $gateway,
        protected CheckoutService $checkout,
        protected PaymentConfiguration $payments,
    ) {}

    /** Public checkout capabilities; never returns provider credentials. */
    public function methods(): JsonResponse
    {
        return response()->json(['data' => [
            'provider' => $this->payments->provider(),
            'mode' => $this->payments->get('payment_mode', 'test'),
            'currency' => $this->payments->currency(),
            'methods' => $this->payments->methods(),
        ]]);
    }

    public function intent(Request $request, int $orderId): JsonResponse
    {
        $data = $request->validate(['payment_method' => ['nullable', 'string', 'max:32']]);
        $paymentMethod = (string) ($data['payment_method'] ?? 'card');
        if (! $this->payments->supports($paymentMethod)) {
            return response()->json(['error' => ['code' => 'payment_method_unavailable', 'message' => 'That payment method is not available right now.']], 422);
        }

        $order = Order::query()->where('user_id', $request->user()->id)->findOrFail($orderId);
        $existing = $order->payments()->where('status', PaymentTransaction::STATUS_INITIATED)->latest()->first();
        if ($existing && data_get($existing->meta, 'checkout_url')) {
            return response()->json(['data' => [
                'type' => data_get($existing->meta, 'intent_type', 'redirect'),
                'url' => data_get($existing->meta, 'checkout_url'),
                'gateway_ref' => $existing->gateway_ref,
            ]]);
        }

        $intent = $this->gateway->createIntent($order, (string) $order->grand_total, $paymentMethod);
        if ($existing) {
            $existing->update([
                'gateway' => $this->payments->provider(),
                'gateway_ref' => $intent->gatewayRef,
                'meta' => array_merge($existing->meta ?? [], [
                    'checkout_url' => $intent->url,
                    'intent_type' => $intent->type,
                    ...$intent->meta,
                ]),
            ]);
        } else {
            PaymentTransaction::query()->create([
                'order_id' => $order->id,
                'gateway' => $this->payments->provider(),
                'gateway_ref' => $intent->gatewayRef,
                'amount' => $order->grand_total,
                'status' => PaymentTransaction::STATUS_INITIATED,
                'meta' => ['checkout_url' => $intent->url, 'intent_type' => $intent->type, ...$intent->meta],
            ]);
        }

        return response()->json([
            'data' => [
                'type' => $intent->type,
                'url' => $intent->url,
                'gateway_ref' => $intent->gatewayRef,
            ],
        ]);
    }

    public function webhook(Request $request, string $gateway): JsonResponse
    {
        abort_unless($gateway === $this->payments->provider(), 404, 'Payment provider is not active.');
        $result = $this->gateway->verifyAndParse(new WebhookRequest(
            payload: $request->all(),
            headers: $request->headers->all(),
            rawBody: $request->getContent(),
        ));

        if (! $result || $result->eventId === '' || $result->gatewayRef === '') {
            return response()->json([
                'error' => ['code' => 'invalid_webhook', 'message' => 'Signature verification failed.', 'fields' => null],
            ], 400);
        }

        $event = WebhookEvent::query()->firstOrCreate(
            ['gateway' => $gateway, 'event_id' => $result->eventId],
            ['payload' => $result->payload],
        );

        if ($event->processed_at) {
            return response()->json(['data' => ['ok' => true, 'idempotent' => true]]);
        }

        $tx = PaymentTransaction::query()->where('gateway_ref', $result->gatewayRef)->first();
        if ($tx) {
            if ($result->status === 'succeeded') {
                $tx->update([
                    'status' => PaymentTransaction::STATUS_SUCCEEDED,
                    'raw_webhook_id' => $result->eventId,
                ]);
                $this->checkout->markPaid($tx->order);
            } elseif ($result->status === 'failed') {
                $tx->update(['status' => PaymentTransaction::STATUS_FAILED, 'raw_webhook_id' => $result->eventId]);
                $this->checkout->releaseReservation($tx->order);
            }
        }

        $event->update(['processed_at' => now()]);

        return response()->json(['data' => ['ok' => true]]);
    }

    public function mockPay(Request $request): JsonResponse
    {
        abort_unless($this->payments->provider() === 'mock', 404);
        $ref = $request->string('ref');
        $orderId = $request->integer('order');
        $tx = PaymentTransaction::query()->where('gateway_ref', $ref)->where('order_id', $orderId)->firstOrFail();

        if ($tx->status === PaymentTransaction::STATUS_SUCCEEDED) {
            return response()->json(['data' => ['status' => 'already_paid', 'order_id' => $tx->order_id]]);
        }

        $payload = [
            'event_id' => 'evt_'.Str::uuid()->toString(),
            'gateway_ref' => $ref,
            'status' => 'succeeded',
            'order_id' => $orderId,
        ];
        $raw = json_encode($payload);
        $signature = hash_hmac('sha256', $raw, (string) config('app.key'));

        $result = $this->gateway->verifyAndParse(new WebhookRequest(
            payload: $payload,
            headers: ['X-Mock-Signature' => $signature],
            rawBody: $raw,
        ));

        if ($result) {
            $event = WebhookEvent::query()->firstOrCreate(
                ['gateway' => 'mock', 'event_id' => $result->eventId],
                ['payload' => $result->payload],
            );
            if (! $event->processed_at) {
                $tx->update(['status' => PaymentTransaction::STATUS_SUCCEEDED, 'raw_webhook_id' => $result->eventId]);
                $this->checkout->markPaid($tx->order);
                $event->update(['processed_at' => now()]);
            }
        }

        return response()->json(['data' => ['status' => 'paid', 'order_id' => $tx->order_id]]);
    }
}
