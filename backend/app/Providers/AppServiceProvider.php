<?php

namespace App\Providers;

use App\Models\PlatformSetting;
use App\Services\Ai\AiProvider;
use App\Services\Ai\MockAiProvider;
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
