<?php

namespace App\Services\Payment;

use App\Models\Order;
use App\Models\PageTemplate;
use App\Models\PaymentTransaction;
use App\Models\TemplatePurchase;
use App\Models\User;
use Illuminate\Support\Str;

class MockPaymentGateway implements PaymentGateway
{
    public function createIntent(Order $order, string $amount, ?string $paymentMethod = null): PaymentIntentResult
    {
        $ref = 'mock_'.Str::uuid()->toString();

        return new PaymentIntentResult(
            gatewayRef: $ref,
            type: 'redirect',
            url: '/api/payments/mock/pay?ref='.$ref.'&order='.$order->id,
            meta: ['amount' => $amount, 'payment_method' => $paymentMethod ?: 'card'],
        );
    }

    public function createTemplateIntent(
        TemplatePurchase $purchase,
        PageTemplate $template,
        User $user,
        string $amount,
        string $currency,
        ?string $paymentMethod = null,
    ): PaymentIntentResult {
        $ref = 'mock_template_'.Str::uuid()->toString();

        return new PaymentIntentResult(
            gatewayRef: $ref,
            type: 'mock',
            url: '/api/payments/mock/template-pay?ref='.$ref.'&purchase='.$purchase->id,
            meta: [
                'amount' => $amount,
                'currency' => strtoupper($currency),
                'payment_method' => $paymentMethod ?: 'card',
                'template_id' => $template->id,
                'user_id' => $user->id,
            ],
        );
    }

    public function verifyAndParse(WebhookRequest $req): ?WebhookResult
    {
        $signature = (string) $req->header('X-Mock-Signature', '');
        $expected = hash_hmac('sha256', $req->rawBody, (string) config('app.key'));
        if ($signature === '' || ! hash_equals($expected, $signature)) {
            return null;
        }

        $payload = $req->payload;
        if (empty($payload['event_id']) || empty($payload['gateway_ref']) || empty($payload['status'])) {
            return null;
        }

        return new WebhookResult(
            eventId: (string) $payload['event_id'],
            gatewayRef: (string) $payload['gateway_ref'],
            status: (string) $payload['status'],
            payload: $payload,
        );
    }

    public function refund(PaymentTransaction $tx, string $amount): RefundResult
    {
        return new RefundResult(
            success: true,
            refundRef: 'refund_'.Str::uuid()->toString(),
            message: 'Mock refund of '.$amount,
        );
    }
}
