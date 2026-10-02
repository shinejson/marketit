<?php

namespace App\Services\Payment;

use App\Models\PlatformSetting;

/**
 * Centralises the public payment configuration used by checkout and payment
 * adapters. Secret values are only read server-side and are never exposed by
 * the public methods payload.
 */
class PaymentConfiguration
{
    public function get(string $key, mixed $default = null): mixed
    {
        $defaults = [
            'payments_enabled' => true,
            'payment_mode' => 'test',
            'payment_provider' => config('markethub.payment_gateway', 'mock'),
            'payment_currency' => null,
            'payment_methods_card' => true,
            'payment_methods_mobile_money' => true,
            'payment_methods_bank_transfer' => false,
            'payment_methods_cash_on_delivery' => false,
            'payment_auto_capture' => true,
            'payment_webhook_tolerance' => 300,
            'platform_url' => config('app.url'),
            'platform_name' => config('app.name', 'MarketHub'),
        ];

        return PlatformSetting::get($key, $defaults[$key] ?? $default);
    }

    public function provider(): string
    {
        return (string) $this->get('payment_provider', 'mock');
    }

    public function currency(): string
    {
        return strtoupper((string) $this->get('payment_currency', $this->get('default_currency', 'USD')));
    }

    /** @return array<int, array{key:string,label:string,description:string,online:bool}> */
    public function methods(): array
    {
        if (! (bool) $this->get('payments_enabled', true)) {
            return [];
        }

        $provider = $this->provider();
        $configured = $this->providerConfigured($provider);
        $methods = [];

        if ((bool) $this->get('payment_methods_card', true) && ($provider === 'mock' || $configured)) {
            $methods[] = [
                'key' => 'card',
                'label' => 'Card',
                'description' => $provider === 'mock' ? 'Test card checkout' : 'Secure hosted card checkout',
                'online' => true,
            ];
        }

        if ((bool) $this->get('payment_methods_mobile_money', true)
            && in_array($provider, ['mock', 'paystack', 'flutterwave'], true)
            && ($provider === 'mock' || $configured)) {
            $methods[] = [
                'key' => 'mobile_money',
                'label' => 'Mobile money',
                'description' => 'Pay with a supported mobile wallet',
                'online' => true,
            ];
        }

        if ((bool) $this->get('payment_methods_bank_transfer', false)) {
            $methods[] = [
                'key' => 'bank_transfer',
                'label' => 'Bank transfer',
                'description' => (string) ($this->get('bank_transfer_instructions', '') ?: 'Receive instructions after placing the order'),
                'online' => false,
            ];
        }

        if ((bool) $this->get('payment_methods_cash_on_delivery', false)) {
            $methods[] = [
                'key' => 'cash_on_delivery',
                'label' => 'Cash on delivery',
                'description' => 'Pay when your order arrives',
                'online' => false,
            ];
        }

        return $methods;
    }

    public function supports(string $method): bool
    {
        return collect($this->methods())->contains(fn (array $item) => $item['key'] === $method);
    }

    public function providerConfigured(?string $provider = null): bool
    {
        return match ($provider ?: $this->provider()) {
            'stripe' => filled($this->get('stripe_secret_key')),
            'paystack' => filled($this->get('paystack_secret_key')),
            'flutterwave' => filled($this->get('flutterwave_secret_key')),
            default => true,
        };
    }

    public function secret(string $key): ?string
    {
        $value = $this->get($key);

        return filled($value) ? (string) $value : null;
    }
}
