<?php

use App\Http\Controllers\Api\AddressController;
use App\Http\Controllers\Api\AdCampaignController;
use App\Http\Controllers\Api\AdminBackupController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AdminMarketingController;
use App\Http\Controllers\Api\AdminOverviewController;
use App\Http\Controllers\Api\AdminPhase3Controller;
use App\Http\Controllers\Api\AdminRoleController;
use App\Http\Controllers\Api\AdminSettingController;
use App\Http\Controllers\Api\AdminSubscriptionController;
use App\Http\Controllers\Api\AdminSupportController;
use App\Http\Controllers\Api\AdminUserController;
use App\Http\Controllers\Api\AiController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\ApiKeyController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CheckoutController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DepartmentDashboardController;
use App\Http\Controllers\Api\StaffController;
use App\Http\Controllers\Api\TenantBackupController;
use App\Http\Controllers\Api\TenantSettingsController;
use App\Http\Controllers\Api\TenantSupportController;
use App\Http\Controllers\Api\DeviceTokenController;
use App\Http\Controllers\Api\DomainController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\MarketController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\SellerOrderController;
use App\Http\Controllers\Api\SellerPublicApiController;
use App\Http\Controllers\Api\TenantController;
use App\Http\Controllers\Api\WebhookController;
use Illuminate\Support\Facades\Route;

Route::middleware('throttle:login')->group(function () {
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);
});

Route::prefix('market')->middleware('throttle:60,1')->group(function () {
    Route::get('/products', [MarketController::class, 'products']);
    Route::get('/products/{slug}', [MarketController::class, 'product']);
    Route::get('/stores', [MarketController::class, 'stores']);
    Route::get('/stores/{slug}', [MarketController::class, 'store']);
    Route::get('/categories', [MarketController::class, 'categories']);
    Route::post('/ads/click/{impression}', [MarketController::class, 'click']);
});

Route::post('/payments/webhook/{gateway}', [PaymentController::class, 'webhook'])->middleware('throttle:120,1');
Route::get('/payments/methods', [PaymentController::class, 'methods'])->middleware('throttle:60,1');
Route::get('/payments/mock/pay', [PaymentController::class, 'mockPay']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/sessions', [AuthController::class, 'sessions']);
    Route::delete('/auth/sessions', [AuthController::class, 'revokeOtherSessions']);
    Route::delete('/auth/sessions/{token}', [AuthController::class, 'revokeSession']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    Route::post('/tenants/register', [TenantController::class, 'register']);
    Route::get('/tenants/mine', [TenantController::class, 'mine']);

    Route::get('/addresses', [AddressController::class, 'index']);
    Route::post('/addresses', [AddressController::class, 'store']);
    Route::patch('/addresses/{address}', [AddressController::class, 'update']);
    Route::delete('/addresses/{address}', [AddressController::class, 'destroy']);

    Route::middleware('throttle:30,1')->group(function () {
        Route::get('/cart', [CartController::class, 'show']);
        Route::post('/cart/items', [CartController::class, 'add']);
        Route::patch('/cart/items/{item}', [CartController::class, 'update']);
        Route::delete('/cart/items/{item}', [CartController::class, 'destroy']);

        Route::post('/checkout/quote', [CheckoutController::class, 'quote']);
        Route::post('/checkout', [CheckoutController::class, 'store']);
    });

    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/{order}', [OrderController::class, 'show']);
    Route::post('/orders/{order}/cancel', [OrderController::class, 'cancel']);

    Route::post('/payments/intent/{orderId}', [PaymentController::class, 'intent']);

    Route::middleware(['tenant', 'role:tenant'])->prefix('tenant')->group(function () {
        Route::get('/', [TenantController::class, 'show']);
        Route::patch('/', [TenantController::class, 'update']);

        Route::get('/stores', [TenantController::class, 'stores']);
        Route::post('/stores', [TenantController::class, 'storeStore']);
        Route::patch('/stores/{store}', [TenantController::class, 'updateStore']);
        Route::delete('/stores/{store}', [TenantController::class, 'destroyStore']);

        Route::get('/categories', [CategoryController::class, 'index']);
        Route::post('/categories', [CategoryController::class, 'store']);
        Route::get('/categories/{category}', [CategoryController::class, 'show']);
        Route::patch('/categories/{category}', [CategoryController::class, 'update']);
        Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);

        Route::get('/products', [ProductController::class, 'index']);
        Route::post('/products', [ProductController::class, 'store']);
        Route::get('/products/{product}', [ProductController::class, 'show']);
        Route::patch('/products/{product}', [ProductController::class, 'update']);
        Route::delete('/products/{product}', [ProductController::class, 'destroy']);

        Route::post('/products/{product}/variants', [ProductController::class, 'storeVariant']);
        Route::patch('/products/{product}/variants/{variant}', [ProductController::class, 'updateVariant']);
        Route::delete('/products/{product}/variants/{variant}', [ProductController::class, 'destroyVariant']);

        Route::post('/products/{product}/images', [ProductController::class, 'storeImage']);
        Route::delete('/products/{product}/images/{image}', [ProductController::class, 'destroyImage']);
        Route::patch('/products/{product}/images', [ProductController::class, 'reorderImages']);

        Route::get('/variants/{variant}/inventory', [InventoryController::class, 'show']);
        Route::patch('/variants/{variant}/inventory', [InventoryController::class, 'update']);
        Route::get('/inventory/low-stock', [InventoryController::class, 'lowStock']);

        Route::get('/orders', [SellerOrderController::class, 'index']);
        Route::get('/orders/{order}', [SellerOrderController::class, 'show']);
        Route::patch('/orders/{order}/status', [SellerOrderController::class, 'updateStatus']);

        Route::get('/dashboard/summary', [DashboardController::class, 'summary']);
        Route::get('/dashboard/departments', [DepartmentDashboardController::class, 'overview']);
        Route::get('/dashboard/departments/{department}', [DepartmentDashboardController::class, 'show']);

        Route::get('/staff', [StaffController::class, 'index']);
        Route::post('/staff', [StaffController::class, 'store']);
        Route::patch('/staff/{staff}', [StaffController::class, 'update']);
        Route::delete('/staff/{staff}', [StaffController::class, 'destroy']);

        Route::get('/settings', [TenantSettingsController::class, 'show']);
        Route::patch('/settings', [TenantSettingsController::class, 'update']);

        Route::get('/backups', [TenantBackupController::class, 'index']);
        Route::post('/backups', [TenantBackupController::class, 'store']);
        Route::get('/backups/{backup}/download', [TenantBackupController::class, 'download']);
        Route::post('/backups/{backup}/restore', [TenantBackupController::class, 'restore']);

        Route::get('/domains', [DomainController::class, 'index']);
        Route::post('/domains', [DomainController::class, 'store']);
        Route::post('/domains/{domain}/verify', [DomainController::class, 'verify']);
        Route::delete('/domains/{domain}', [DomainController::class, 'destroy']);

        Route::get('/ads', [AdCampaignController::class, 'index']);
        Route::post('/ads', [AdCampaignController::class, 'store']);
        Route::patch('/ads/{campaign}', [AdCampaignController::class, 'update']);
        Route::post('/ads/fund', [AdCampaignController::class, 'fund']);

        Route::get('/api-keys', [ApiKeyController::class, 'index']);
        Route::post('/api-keys', [ApiKeyController::class, 'store']);
        Route::delete('/api-keys/{apiKey}', [ApiKeyController::class, 'destroy']);

        Route::get('/webhooks', [WebhookController::class, 'index']);
        Route::post('/webhooks', [WebhookController::class, 'store']);
        Route::delete('/webhooks/{endpoint}', [WebhookController::class, 'destroy']);
        Route::get('/webhooks/catalog', [WebhookController::class, 'catalog']);
        Route::get('/webhooks/{endpoint}/deliveries', [WebhookController::class, 'deliveries']);
        Route::post('/webhooks/deliveries/{delivery}/replay', [WebhookController::class, 'replay']);

        Route::get('/ai/settings', [AiController::class, 'settings']);
        Route::patch('/ai/settings', [AiController::class, 'updateSettings']);
        Route::post('/ai/describe', [AiController::class, 'describe']);
        Route::post('/ai/categorize', [AiController::class, 'categorize']);
        Route::get('/ai/generations', [AiController::class, 'generations']);
        Route::post('/ai/generations/{generation}/review', [AiController::class, 'reviewGeneration']);
        Route::post('/ai/categorizations/{categorization}/accept', [AiController::class, 'acceptCategory']);
        Route::get('/ai/insights', [AiController::class, 'insights']);
        Route::get('/ai/usage', [AiController::class, 'usage']);

        Route::get('/analytics', [AnalyticsController::class, 'tenant']);

        // Tenant help centre: tickets, live chat, assigned tasks and guides.
        Route::prefix('support')->group(function () {
            Route::get('/overview', [TenantSupportController::class, 'overview']);
            Route::get('/tickets', [TenantSupportController::class, 'tickets']);
            Route::post('/tickets', [TenantSupportController::class, 'storeTicket']);
            Route::get('/tickets/{ticket}', [TenantSupportController::class, 'showTicket']);
            Route::post('/tickets/{ticket}/messages', [TenantSupportController::class, 'replyTicket']);
            Route::post('/tickets/{ticket}/rate', [TenantSupportController::class, 'rateTicket']);
            Route::get('/chat', [TenantSupportController::class, 'chat']);
            Route::post('/chat/messages', [TenantSupportController::class, 'sendChatMessage']);
            Route::get('/tasks', [TenantSupportController::class, 'tasks']);
            Route::patch('/tasks/{task}', [TenantSupportController::class, 'updateTask']);
            Route::get('/guides', [TenantSupportController::class, 'guides']);
            Route::get('/guides/{guide}', [TenantSupportController::class, 'readGuide']);
            Route::post('/guides/{guide}/feedback', [TenantSupportController::class, 'rateGuide']);
        });
    });

    Route::post('/devices', [DeviceTokenController::class, 'store']);
    Route::delete('/devices', [DeviceTokenController::class, 'destroy']);

    Route::middleware('role:super_admin')->prefix('admin')->group(function () {
        Route::get('/tenants', [AdminController::class, 'tenants']);
        Route::get('/tenants/{tenant}', [AdminController::class, 'showTenant']);
        Route::get('/tenants/{tenant}/documents/{document}', [AdminController::class, 'tenantDocument']);
        Route::patch('/tenants/{tenant}', [AdminController::class, 'updateTenant']);
        Route::get('/orders', [AdminController::class, 'orders']);
        Route::get('/metrics', [AdminController::class, 'metrics']);
        Route::get('/overview', AdminOverviewController::class);

        Route::get('/users', [AdminUserController::class, 'index']);
        Route::post('/users', [AdminUserController::class, 'store']);
        Route::get('/users/{user}', [AdminUserController::class, 'show']);
        Route::patch('/users/{user}', [AdminUserController::class, 'update']);
        Route::put('/users/{user}/roles', [AdminUserController::class, 'syncRoles']);
        Route::delete('/users/{user}', [AdminUserController::class, 'destroy']);

        Route::get('/roles', [AdminRoleController::class, 'index']);
        Route::post('/roles', [AdminRoleController::class, 'store']);
        Route::patch('/roles/{role}', [AdminRoleController::class, 'update']);
        Route::delete('/roles/{role}', [AdminRoleController::class, 'destroy']);

        Route::get('/plans', [AdminSubscriptionController::class, 'plans']);
        Route::post('/plans', [AdminSubscriptionController::class, 'storePlan']);
        Route::patch('/plans/{plan}', [AdminSubscriptionController::class, 'updatePlan']);
        Route::delete('/plans/{plan}', [AdminSubscriptionController::class, 'destroyPlan']);

        Route::get('/subscriptions', [AdminSubscriptionController::class, 'index']);
        Route::post('/subscriptions', [AdminSubscriptionController::class, 'store']);
        Route::get('/subscriptions/stats', [AdminSubscriptionController::class, 'statsEndpoint']);
        Route::patch('/subscriptions/{subscription}', [AdminSubscriptionController::class, 'update']);
        Route::post('/subscriptions/{subscription}/renew', [AdminSubscriptionController::class, 'renew']);

        Route::get('/invoices', [AdminSubscriptionController::class, 'invoices']);
        Route::patch('/invoices/{invoice}', [AdminSubscriptionController::class, 'updateInvoice']);

        Route::get('/settings', [AdminSettingController::class, 'index']);
        Route::get('/settings/payment-status', [AdminSettingController::class, 'paymentStatus']);
        Route::put('/settings', [AdminSettingController::class, 'update']);
        Route::post('/settings/reset', [AdminSettingController::class, 'reset']);
        Route::post('/settings/assets/{asset}', [AdminSettingController::class, 'uploadAsset']);
        Route::delete('/settings/assets/{asset}', [AdminSettingController::class, 'destroyAsset']);
        Route::post('/settings/email/test', [AdminSettingController::class, 'testEmail'])->middleware('throttle:6,1');
        Route::post('/settings/sms/test', [AdminSettingController::class, 'testSms'])->middleware('throttle:6,1');

        Route::get('/backups', [AdminBackupController::class, 'index']);
        Route::post('/backups', [AdminBackupController::class, 'store']);
        Route::get('/backups/{backup}/download', [AdminBackupController::class, 'download']);
        Route::post('/backups/{backup}/restore', [AdminBackupController::class, 'restore']);
        Route::delete('/backups/{backup}', [AdminBackupController::class, 'destroy']);
        Route::get('/audit-logs', [AdminController::class, 'auditLogs']);
        Route::get('/audit-logs/facets', [AdminController::class, 'auditLogFacets']);
        Route::get('/analytics', [AnalyticsController::class, 'platform']);
        Route::get('/insights', [AnalyticsController::class, 'platformInsights']);
        Route::get('/domains', [AdminPhase3Controller::class, 'domains']);
        Route::post('/domains/{domain}/verify', [AdminPhase3Controller::class, 'forceVerifyDomain']);
        Route::delete('/domains/{domain}', [AdminPhase3Controller::class, 'forceRemoveDomain']);
        Route::get('/ads', [AdminPhase3Controller::class, 'ads']);
        Route::get('/ai-costs', [AdminPhase3Controller::class, 'aiCosts']);
        Route::get('/webhooks/health', [AdminPhase3Controller::class, 'webhookHealth']);

        // Service desk: tickets, live chat, service tasks and tenant guides.
        Route::prefix('support')->group(function () {
            Route::get('/overview', [AdminSupportController::class, 'overview']);
            Route::get('/agents', [AdminSupportController::class, 'agents']);

            Route::get('/tickets', [AdminSupportController::class, 'tickets']);
            Route::post('/tickets', [AdminSupportController::class, 'storeTicket']);
            Route::get('/tickets/{ticket}', [AdminSupportController::class, 'showTicket']);
            Route::patch('/tickets/{ticket}', [AdminSupportController::class, 'updateTicket']);
            Route::post('/tickets/{ticket}/messages', [AdminSupportController::class, 'replyTicket']);

            Route::get('/chats', [AdminSupportController::class, 'chats']);
            Route::get('/chats/{chat}', [AdminSupportController::class, 'showChat']);
            Route::patch('/chats/{chat}', [AdminSupportController::class, 'updateChat']);
            Route::post('/chats/{chat}/messages', [AdminSupportController::class, 'replyChat']);

            Route::get('/tasks', [AdminSupportController::class, 'tasks']);
            Route::post('/tasks', [AdminSupportController::class, 'storeTask']);
            Route::patch('/tasks/{task}', [AdminSupportController::class, 'updateTask']);
            Route::delete('/tasks/{task}', [AdminSupportController::class, 'destroyTask']);

            Route::get('/guides', [AdminSupportController::class, 'guides']);
            Route::post('/guides', [AdminSupportController::class, 'storeGuide']);
            Route::patch('/guides/{guide}', [AdminSupportController::class, 'updateGuide']);
            Route::delete('/guides/{guide}', [AdminSupportController::class, 'destroyGuide']);
            Route::post('/guide-categories', [AdminSupportController::class, 'storeGuideCategory']);

            Route::get('/canned-replies', [AdminSupportController::class, 'cannedReplies']);
            Route::post('/canned-replies', [AdminSupportController::class, 'storeCannedReply']);
        });

        // Marketing hub: social accounts, organic posts, platform campaigns.
        Route::get('/marketing/overview', [AdminMarketingController::class, 'overview']);
        Route::get('/marketing/accounts', [AdminMarketingController::class, 'accounts']);
        Route::post('/marketing/accounts/connect', [AdminMarketingController::class, 'connectAccount']);
        Route::post('/marketing/accounts/{account}/disconnect', [AdminMarketingController::class, 'disconnectAccount']);
        Route::get('/marketing/campaigns', [AdminMarketingController::class, 'campaigns']);
        Route::post('/marketing/campaigns', [AdminMarketingController::class, 'storeCampaign']);
        Route::patch('/marketing/campaigns/{campaign}', [AdminMarketingController::class, 'updateCampaign']);
        Route::delete('/marketing/campaigns/{campaign}', [AdminMarketingController::class, 'destroyCampaign']);
        Route::get('/marketing/posts', [AdminMarketingController::class, 'posts']);
        Route::post('/marketing/posts', [AdminMarketingController::class, 'storePost']);
        Route::patch('/marketing/posts/{post}', [AdminMarketingController::class, 'updatePost']);
        Route::post('/marketing/posts/{post}/publish', [AdminMarketingController::class, 'publishPost']);
        Route::delete('/marketing/posts/{post}', [AdminMarketingController::class, 'destroyPost']);
    });
});

Route::prefix('seller/v1')->middleware('throttle:60,1')->group(function () {
    Route::get('/products', [SellerPublicApiController::class, 'products'])->middleware('seller.api:products.read');
    Route::get('/orders', [SellerPublicApiController::class, 'orders'])->middleware('seller.api:orders.read');
    Route::post('/orders/{order}/fulfill', [SellerPublicApiController::class, 'fulfill'])->middleware('seller.api:orders.fulfill');
    Route::patch('/variants/{variant}/inventory', [SellerPublicApiController::class, 'inventory'])->middleware('seller.api:inventory.write');
    Route::get('/settlements', [SellerPublicApiController::class, 'settlements'])->middleware('seller.api:settlements.read');
});
