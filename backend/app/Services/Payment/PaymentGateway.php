<?php

namespace App\Services\Payment;

use App\Models\Order;
use App\Models\PageTemplate;
use App\Models\PaymentTransaction;
use App\Models\TemplatePurchase;
use App\Models\User;

interface PaymentGateway
{
    public function createIntent(Order $order, string $amount, ?string $paymentMethod = null): PaymentIntentResult;

    public function createTemplateIntent(
        TemplatePurchase $purchase,
        PageTemplate $template,
        User $user,
        string $amount,
        string $currency,
        ?string $paymentMethod = null,
    ): PaymentIntentResult;

    public function verifyAndParse(WebhookRequest $req): ?WebhookResult;

    public function refund(PaymentTransaction $tx, string $amount): RefundResult;
}
