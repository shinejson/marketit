<?php

namespace App\Providers;

use App\Models\PlatformSetting;
use App\Services\Ai\AiProvider;
use App\Services\Ai\MockAiProvider;
use App\Services\Commerce\CommissionResolver;
use App\Services\Commerce\CouponService;
use App\Services\Commerce\DisputeService;
use App\Services\Commerce\PayoutService;
use App\Services\Commerce\RefundService;
use App\Services\Commerce\ReviewService;
use App\Services\Delivery\DeliveryService;
use App\Services\Notifications\NotificationService;
use App\Services\Payment\ConfiguredPaymentGateway;
use App\Services\Payment\PaymentConfiguration;
use App\Services\Payment\PaymentGateway;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(PaymentConfiguration::class);
        $this->app->singleton(PaymentGateway::class, fn ($app) => new ConfiguredPaymentGateway(
            $app->make(PaymentConfiguration::class),
        ));
        $this->app->singleton(AiProvider::class, MockAiProvider::class);

        // Commerce services keep per-request caches (commission rules, plan
        // lookups), so they are singletons for the life of the request.
        $this->app->singleton(NotificationService::class);
        $this->app->singleton(CommissionResolver::class);
        $this->app->singleton(CouponService::class);
        $this->app->singleton(DeliveryService::class);
        $this->app->singleton(PayoutService::class);
        $this->app->singleton(RefundService::class);
        $this->app->singleton(DisputeService::class);
        $this->app->singleton(ReviewService::class);
    }

    public function boot(): void
    {
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('login', function (Request $request) {
            $attempts = (int) PlatformSetting::get('max_login_attempts', 5);
            $attempts = max(3, min(20, $attempts));
            $email = Str::lower((string) $request->input('email'));

            return Limit::perMinute($attempts)->by($email.'|'.$request->ip());
        });
    }
}
