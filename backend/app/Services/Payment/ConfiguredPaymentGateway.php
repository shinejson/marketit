<?php

namespace App\Services\Payment;

use App\Models\Order;
use App\Models\PageTemplate;
use App\Models\PaymentTransaction;
use App\Models\TemplatePurchase;
use App\Models\User;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Hosted checkout adapters for the providers exposed in Platform Settings.
 * Keeping provider credentials and signature verification here prevents them
 * from leaking into controllers and makes adding another provider isolated.
 */
class ConfiguredPaymentGateway implements PaymentGateway
{
    private MockPaymentGateway $mock;

    public function __construct(private readonly PaymentConfiguration $config)
    {
        $this->mock = new MockPaymentGateway;
    }

    public function createIntent(Order $order, string $amount, ?string $paymentMethod = null): PaymentIntentResult
    {
        if (in_array($paymentMethod, ['bank_transfer', 'cash_on_delivery'], true)) {
            return new PaymentIntentResult(
                gatewayRef: 'offline_'.Str::uuid()->toString(),
                type: 'offline',
                url: null,
                meta: ['provider' => 'offline', 'payment_method' => $paymentMethod],
            );
        }

        $provider = $this->config->provider();
        if ($provider === 'mock') {
            return $this->mock->createIntent($order, $amount, $paymentMethod);
        }
        if (! $this->config->providerConfigured($provider)) {
            throw ValidationException::withMessages([
                'payment' => "Configure the {$provider} credentials in Admin Settings before accepting payments.",
            ]);
        }

        return match ($provider) {
            'stripe' => $this->stripe($order, $amount, $paymentMethod),
            'paystack' => $this->paystack($order, $amount, $paymentMethod),
            'flutterwave' => $this->flutterwave($order, $amount, $paymentMethod),
            default => throw ValidationException::withMessages(['payment' => 'The selected payment provider is not supported.']),
        };
    }

    public function createTemplateIntent(
        TemplatePurchase $purchase,
        PageTemplate $template,
        User $user,
        string $amount,
        string $currency,
        ?string $paymentMethod = null,
    ): PaymentIntentResult {
        $provider = $this->config->provider();
        if ($provider === 'mock') {
            return $this->mock->createTemplateIntent($purchase, $template, $user, $amount, $currency, $paymentMethod);
        }

        if (strtoupper($currency) !== $this->config->currency()) {
            throw ValidationException::withMessages([
                'payment' => 'This template is priced in '.$currency.'. Configure the platform payment currency to match before selling it.',
            ]);
        }
        if (! $this->config->providerConfigured($provider)) {
            throw ValidationException::withMessages([
                'payment' => "Configure the {$provider} credentials in Admin Settings before accepting template payments.",
            ]);
        }

        $base = rtrim((string) $this->config->get('platform_url', config('app.url')), '/');
        $currencyCode = strtolower($currency);
        $reference = 'template_'.$purchase->id.'_'.Str::lower(Str::random(12));

        return match ($provider) {
            'stripe' => $this->templateStripe($purchase, $template, $amount, $currencyCode, $base),
            'paystack' => $this->templatePaystack($purchase, $template, $user, $amount, strtoupper($currency), $base, $reference, $paymentMethod),
            'flutterwave' => $this->templateFlutterwave($purchase, $template, $user, $amount, strtoupper($currency), $base, $reference, $paymentMethod),
            default => throw ValidationException::withMessages(['payment' => 'The selected payment provider is not supported.']),
        };
    }

    public function verifyAndParse(WebhookRequest $req): ?WebhookResult
    {
        $provider = $this->config->provider();
        if ($provider === 'mock') {
            return $this->mock->verifyAndParse($req);
        }

        return match ($provider) {
            'stripe' => $this->verifyStripe($req),
            'paystack' => $this->verifyPaystack($req),
            'flutterwave' => $this->verifyFlutterwave($req),
            default => null,
        };
    }

    public function refund(PaymentTransaction $tx, string $amount): RefundResult
    {
        // Refunds are deliberately not guessed here. Each provider has a
        // different idempotency and settlement contract; expose this result
        // until a provider-specific refund job is enabled.
        if ($this->config->provider() === 'mock') {
            return $this->mock->refund($tx, $amount);
        }

        return new RefundResult(false, '', 'Refunds must be initiated from the configured payment provider dashboard.');
    }

    private function templateStripe(PageTemplate $template, TemplatePurchase $purchase, string $amount, string $currency, string $base): PaymentIntentResult
    {
        $response = $this->http('stripe')->asForm()->post('https://api.stripe.com/v1/checkout/sessions', [
            'mode' => 'payment',
            'success_url' => $base.'/tenant/templates?payment=success',
            'cancel_url' => $base.'/tenant/templates?payment=cancelled',
            'client_reference_id' => 'template_purchase_'.$purchase->id,
            'metadata[template_purchase_id]' => (string) $purchase->id,
            'line_items[0][quantity]' => 1,
            'line_items[0][price_data][currency]' => $currency,
            'line_items[0][price_data][unit_amount]' => $this->minor($amount),
            'line_items[0][price_data][product_data][name]' => $template->name.' template licence',
        ]);

        if ($response->failed() || ! $response->json('id') || ! $response->json('url')) {
            throw ValidationException::withMessages(['payment' => 'Stripe could not start template checkout. Try again or choose another method.']);
        }

        return new PaymentIntentResult(
            gatewayRef: (string) $response->json('id'),
            type: 'redirect',
            url: (string) $response->json('url'),
            meta: ['provider' => 'stripe', 'payment_method' => 'card', 'template_purchase_id' => $purchase->id],
        );
    }

    private function templatePaystack(
        TemplatePurchase $purchase,
        PageTemplate $template,
        User $user,
        string $amount,
        string $currency,
        string $base,
        string $reference,
        ?string $paymentMethod,
    ): PaymentIntentResult {
        $response = $this->http('paystack')->post('https://api.paystack.co/transaction/initialize', [
            'email' => $user->email,
            'amount' => $this->minor($amount),
            'currency' => $currency,
            'reference' => $reference,
            'channels' => [$paymentMethod === 'mobile_money' ? 'mobile_money' : 'card'],
            'callback_url' => $base.'/tenant/templates?payment=success',
            'metadata' => ['template_purchase_id' => $purchase->id, 'template_id' => $template->id],
        ]);

        if ($response->failed() || ! $response->json('data.authorization_url')) {
            throw ValidationException::withMessages(['payment' => 'Paystack could not start template checkout. Try again or choose another method.']);
        }

        return new PaymentIntentResult(
            gatewayRef: (string) ($response->json('data.reference') ?: $reference),
            type: 'redirect',
            url: (string) $response->json('data.authorization_url'),
            meta: ['provider' => 'paystack', 'payment_method' => $paymentMethod ?: 'card', 'template_purchase_id' => $purchase->id],
        );
    }

    private function templateFlutterwave(
        TemplatePurchase $purchase,
        PageTemplate $template,
        User $user,
        string $amount,
        string $currency,
        string $base,
        string $reference,
        ?string $paymentMethod,
    ): PaymentIntentResult {
        $response = $this->http('flutterwave')->post('https://api.flutterwave.com/v3/payments', [
            'tx_ref' => $reference,
            'amount' => (float) $amount,
            'currency' => $currency,
            'payment_options' => $paymentMethod === 'mobile_money' ? 'mobilemoney' : 'card',
            'redirect_url' => $base.'/tenant/templates?payment=success',
            'customer' => ['email' => $user->email, 'name' => $user->name],
            'customizations' => ['title' => (string) $this->config->get('platform_name', 'MarketHub'), 'description' => $template->name.' template licence'],
            'meta' => ['template_purchase_id' => $purchase->id, 'template_id' => $template->id],
        ]);

        if ($response->failed() || ! $response->json('data.link')) {
            throw ValidationException::withMessages(['payment' => 'Flutterwave could not start template checkout. Try again or choose another method.']);
        }

        return new PaymentIntentResult(
            gatewayRef: $reference,
            type: 'redirect',
            url: (string) $response->json('data.link'),
            meta: ['provider' => 'flutterwave', 'payment_method' => $paymentMethod ?: 'card', 'template_purchase_id' => $purchase->id],
        );
    }

    private function stripe(Order $order, string $amount, ?string $paymentMethod): PaymentIntentResult
    {
        $ref = 'stripe_'.Str::uuid()->toString();
        $base = rtrim((string) $this->config->get('platform_url', config('app.url')), '/');
        $currency = strtolower($this->config->currency());
        $response = $this->http('stripe')->asForm()->post('https://api.stripe.com/v1/checkout/sessions', [
            'mode' => 'payment',
            'success_url' => $base.'/orders/'.$order->id.'?payment=success',
            'cancel_url' => $base.'/checkout?payment=cancelled',
            'client_reference_id' => (string) $order->id,
            'metadata[order_id]' => (string) $order->id,
            'line_items[0][quantity]' => 1,
            'line_items[0][price_data][currency]' => $currency,
            'line_items[0][price_data][unit_amount]' => $this->minor($amount),
            'line_items[0][price_data][product_data][name]' => 'MarketHub order #'.$order->id,
        ]);

        if ($response->failed() || ! $response->json('id') || ! $response->json('url')) {
            throw ValidationException::withMessages(['payment' => 'Stripe could not start checkout. Try again or choose another method.']);
        }

        return new PaymentIntentResult(
            gatewayRef: (string) $response->json('id'),
            type: 'redirect',
            url: (string) $response->json('url'),
            meta: ['provider' => 'stripe', 'payment_method' => 'card'],
        );
    }

    private function paystack(Order $order, string $amount, ?string $paymentMethod): PaymentIntentResult
    {
        $ref = 'mh_'.$order->id.'_'.Str::lower(Str::random(12));
        $base = rtrim((string) $this->config->get('platform_url', config('app.url')), '/');
        $response = $this->http('paystack')->post('https://api.paystack.co/transaction/initialize', [
            'email' => $order->user?->email,
            'amount' => $this->minor($amount),
            'currency' => $this->config->currency(),
            'reference' => $ref,
            'channels' => [$paymentMethod === 'mobile_money' ? 'mobile_money' : 'card'],
            'callback_url' => $base.'/orders/'.$order->id.'?payment=success',
            'metadata' => ['order_id' => $order->id],
        ]);

        if ($response->failed() || ! $response->json('data.authorization_url')) {
            throw ValidationException::withMessages(['payment' => 'Paystack could not start checkout. Try again or choose another method.']);
        }

        return new PaymentIntentResult(
            gatewayRef: (string) ($response->json('data.reference') ?: $ref),
            type: 'redirect',
            url: (string) $response->json('data.authorization_url'),
            meta: ['provider' => 'paystack', 'payment_method' => 'card'],
        );
    }

    private function flutterwave(Order $order, string $amount, ?string $paymentMethod): PaymentIntentResult
    {
        $ref = 'mh_'.$order->id.'_'.Str::lower(Str::random(12));
        $base = rtrim((string) $this->config->get('platform_url', config('app.url')), '/');
        $response = $this->http('flutterwave')->post('https://api.flutterwave.com/v3/payments', [
            'tx_ref' => $ref,
            'amount' => (float) $amount,
            'currency' => $this->config->currency(),
            'payment_options' => $paymentMethod === 'mobile_money' ? 'mobilemoney' : 'card',
            'redirect_url' => $base.'/orders/'.$order->id.'?payment=success',
            'customer' => [
                'email' => $order->user?->email,
                'name' => $order->user?->name,
            ],
            'customizations' => ['title' => (string) $this->config->get('platform_name', 'MarketHub')],
            'meta' => ['order_id' => $order->id],
        ]);

        if ($response->failed() || ! $response->json('data.link')) {
            throw ValidationException::withMessages(['payment' => 'Flutterwave could not start checkout. Try again or choose another method.']);
        }

        return new PaymentIntentResult(
            gatewayRef: $ref,
            type: 'redirect',
            url: (string) $response->json('data.link'),
            meta: ['provider' => 'flutterwave', 'payment_method' => 'card'],
        );
    }

    private function verifyStripe(WebhookRequest $req): ?WebhookResult
    {
        $secret = $this->config->secret('stripe_webhook_secret');
        $signature = (string) $req->header('Stripe-Signature', '');
        if (! $secret || ! $signature) {
            return null;
        }

        $parts = collect(explode(',', $signature))->mapWithKeys(function (string $part) {
            [$key, $value] = array_pad(explode('=', $part, 2), 2, null);
            return [$key => $value];
        });
        $timestamp = (int) ($parts->get('t') ?: 0);
        $expected = hash_hmac('sha256', $timestamp.'.'.$req->rawBody, $secret);
        $received = collect($parts->get('v1') ? [$parts->get('v1')] : [])->first();
        $tolerance = (int) $this->config->get('payment_webhook_tolerance', 300);
        if (! $timestamp || ! $received || abs(time() - $timestamp) > $tolerance || ! hash_equals($expected, $received)) {
            return null;
        }

        $object = $req->payload['data']['object'] ?? [];
        $eventType = (string) ($req->payload['type'] ?? '');
        if (! in_array($eventType, ['checkout.session.completed', 'checkout.session.expired'], true)
            || empty($req->payload['id'])
            || empty($object['id'])) {
            return null;
        }
        $status = $eventType === 'checkout.session.completed' && ($object['payment_status'] ?? '') === 'paid'
            ? 'succeeded'
            : 'failed';

        return new WebhookResult(
            eventId: (string) ($req->payload['id'] ?? ''),
            gatewayRef: (string) ($object['id'] ?? ''),
            status: $status,
            payload: $req->payload,
        );
    }

    private function verifyPaystack(WebhookRequest $req): ?WebhookResult
    {
        $secret = $this->config->secret('paystack_webhook_secret') ?: $this->config->secret('paystack_secret_key');
        $signature = (string) $req->header('X-Paystack-Signature', '');
        if (! $secret || ! $signature || ! hash_equals(hash_hmac('sha512', $req->rawBody, $secret), $signature)) {
            return null;
        }

        $data = $req->payload['data'] ?? [];
        $event = (string) ($req->payload['event'] ?? '');
        if (! in_array($event, ['charge.success', 'charge.failed'], true)) {
            return null;
        }

        return new WebhookResult(
            eventId: (string) ($event.':'.($data['id'] ?? Str::uuid()->toString())),
            gatewayRef: (string) ($data['reference'] ?? ''),
            status: $event === 'charge.success' ? 'succeeded' : 'failed',
            payload: $req->payload,
        );
    }

    private function verifyFlutterwave(WebhookRequest $req): ?WebhookResult
    {
        $secret = $this->config->secret('flutterwave_webhook_hash') ?: $this->config->secret('flutterwave_secret_key');
        $signature = (string) ($req->header('verif-hash', '') ?: $req->header('X-Webhook-Signature', ''));
        if (! $secret || ! $signature || ! hash_equals($secret, $signature)) {
            return null;
        }

        $data = $req->payload['data'] ?? [];
        $event = (string) ($req->payload['event'] ?? '');
        return new WebhookResult(
            eventId: (string) ($req->payload['id'] ?? $data['id'] ?? Str::uuid()),
            gatewayRef: (string) ($data['tx_ref'] ?? $data['txRef'] ?? ''),
            status: in_array($event, ['charge.completed', 'successful'], true) || ($data['status'] ?? '') === 'successful' ? 'succeeded' : 'failed',
            payload: $req->payload,
        );
    }

    private function http(string $provider): PendingRequest
    {
        $request = Http::acceptJson()->timeout(15)->retry(2, 200);

        return match ($provider) {
            'stripe' => $request->withBasicAuth($this->config->secret('stripe_secret_key') ?: '', ''),
            'paystack' => $request->withToken($this->config->secret('paystack_secret_key') ?: ''),
            'flutterwave' => $request->withToken($this->config->secret('flutterwave_secret_key') ?: ''),
            default => $request,
        };
    }

    private function minor(string $amount): int
    {
        return (int) round(((float) $amount) * 100);
    }
}
