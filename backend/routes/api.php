<?php

use App\Http\Controllers\Api\AddressController;
use App\Http\Controllers\Api\AccountingController;
use App\Http\Controllers\Api\AccountingLedgerController;
use App\Http\Controllers\Api\AdCampaignController;
use App\Http\Controllers\Api\AdminBackupController;
use App\Http\Controllers\Api\AdminCatalogController;
use App\Http\Controllers\Api\AdminCommissionController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AdminCouponController;
use App\Http\Controllers\Api\AdminDisputeController;
use App\Http\Controllers\Api\AdminMarketingController;
use App\Http\Controllers\Api\AdminOverviewController;
use App\Http\Controllers\Api\AdminPayoutController;
use App\Http\Controllers\Api\AdminPhase3Controller;
use App\Http\Controllers\Api\AdminReviewController;
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
use App\Http\Controllers\Api\CouponController;
use App\Http\Controllers\Api\CurrencyController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DepartmentDashboardController;
use App\Http\Controllers\Api\SocialAuthController;
use App\Http\Controllers\Api\TenantBackupController;
use App\Http\Controllers\Api\TenantCustomerController;
use App\Http\Controllers\Api\TenantRoleController;
use App\Http\Controllers\Api\TenantUserController;
use App\Http\Controllers\Api\TenantSettingsController;
use App\Http\Controllers\Api\TenantSupportController;
use App\Http\Controllers\Api\DeliveryController;
use App\Http\Controllers\Api\DeviceTokenController;
use App\Http\Controllers\Api\DisputeController;
use App\Http\Controllers\Api\DomainController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\MarketController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\PayoutController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\QuoteRequestController;
use App\Http\Controllers\Api\RefundController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\SalesController;
use App\Http\Controllers\Api\SellerOrderController;
use App\Http\Controllers\Api\SellerPublicApiController;
use App\Http\Controllers\Api\TenantAuditController;
use App\Http\Controllers\Api\TenantController;
use App\Http\Controllers\Api\TenantReviewController;
use App\Http\Controllers\Api\WebhookController;
use App\Http\Controllers\Api\WishlistController;
use Illuminate\Support\Facades\Route;

Route::middleware('throttle:login')->group(function () {
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);

    // Customer social login (Google, Facebook, Apple, GitHub).
    Route::post('/auth/social/{provider}/redirect', [SocialAuthController::class, 'redirect']);
    Route::post('/auth/social/{provider}/callback', [SocialAuthController::class, 'callback']);
});

Route::get('/auth/social/providers', [SocialAuthController::class, 'index'])->middleware('throttle:60,1');

Route::prefix('market')->middleware('throttle:60,1')->group(function () {
    Route::get('/products', [MarketController::class, 'products']);
    Route::get('/products/{slug}', [MarketController::class, 'product']);
    Route::get('/stores', [MarketController::class, 'stores']);
    Route::get('/stores/{slug}', [MarketController::class, 'store']);
    Route::post('/stores/{slug}/contact', [MarketController::class, 'contact']);
    Route::get('/categories', [MarketController::class, 'categories']);
    Route::post('/ads/click/{impression}', [MarketController::class, 'click']);
    Route::get('/hero-slides', [MarketController::class, 'heroSlides']);
});

// §9 / §17 — public review reads. Writing one needs an account.
Route::prefix('market')->middleware('throttle:60,1')->group(function () {
    Route::get('/products/{slug}/reviews', [ReviewController::class, 'forProduct']);
    Route::get('/stores/{slug}/reviews', [ReviewController::class, 'forStore']);
});

// Currency catalog + ad-hoc conversion. Public: the storefront formats prices
// with it before anyone signs in.
Route::middleware('throttle:60,1')->group(function () {
    Route::get('/currency', [CurrencyController::class, 'index']);
    Route::get('/currency/convert', [CurrencyController::class, 'convert']);
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
    Route::get('/auth/social/identities', [SocialAuthController::class, 'identities']);
    Route::delete('/auth/social/identities/{identity}', [SocialAuthController::class, 'unlink']);

    // My account: profile, security and personal activity trail.
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::patch('/profile', [ProfileController::class, 'update']);
    Route::post('/profile/password', [ProfileController::class, 'updatePassword']);
    Route::post('/profile/avatar', [ProfileController::class, 'uploadAvatar']);
    Route::get('/profile/activity', [ProfileController::class, 'activity']);
    Route::get('/profile/sessions', [ProfileController::class, 'sessions']);

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

    // §18 — coupons applied to the basket before checkout.
    Route::middleware('throttle:30,1')->group(function () {
        Route::post('/cart/coupon', [CartController::class, 'applyCoupon']);
        Route::delete('/cart/coupon', [CartController::class, 'removeCoupon']);
        Route::post('/cart/delivery', [CartController::class, 'chooseDelivery']);
    });

    // §9 / §17 — reviews, ratings and trust.
    Route::get('/reviews/mine', [ReviewController::class, 'mine']);
    Route::get('/reviews/pending', [ReviewController::class, 'pending']);
    Route::post('/reviews', [ReviewController::class, 'store'])->middleware('throttle:20,1');
    Route::patch('/reviews/{review}', [ReviewController::class, 'update']);
    Route::delete('/reviews/{review}', [ReviewController::class, 'destroy']);
    Route::post('/reviews/{review}/vote', [ReviewController::class, 'vote']);
    Route::post('/reviews/{review}/report', [ReviewController::class, 'report'])->middleware('throttle:10,1');

    // §9 / §20 #6 — wishlist and favourites.
    Route::get('/wishlist', [WishlistController::class, 'index']);
    Route::get('/wishlist/ids', [WishlistController::class, 'ids']);
    Route::post('/wishlist', [WishlistController::class, 'store']);
    Route::delete('/wishlist/{item}', [WishlistController::class, 'destroy'])->whereNumber('item');
    Route::delete('/wishlist/product/{product}', [WishlistController::class, 'destroyByProduct'])->whereNumber('product');
    Route::post('/wishlist/{item}/move-to-cart', [WishlistController::class, 'moveToCart'])->whereNumber('item');
    Route::post('/wishlist/stores', [WishlistController::class, 'toggleStore']);

    // §12 — refunds a shopper asks for on their own orders.
    Route::get('/refunds', [RefundController::class, 'mine']);
    Route::post('/refunds', [RefundController::class, 'store'])->middleware('throttle:10,1');
    Route::post('/refunds/{refund}/cancel', [RefundController::class, 'cancel']);

    // §12 / §18 — buyer disputes.
    Route::get('/disputes', [DisputeController::class, 'mine']);
    Route::post('/disputes', [DisputeController::class, 'store'])->middleware('throttle:10,1');
    Route::get('/disputes/{dispute}', [DisputeController::class, 'show']);
    Route::post('/disputes/{dispute}/messages', [DisputeController::class, 'reply']);
    Route::post('/disputes/{dispute}/escalate', [DisputeController::class, 'escalate']);

    // §16 — track a parcel.
    Route::get('/shipments/{reference}', [DeliveryController::class, 'track']);

    // §20 #12 — notification centre, shared by all three consoles.
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/summary', [NotificationController::class, 'summary']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::post('/notifications/clear', [NotificationController::class, 'clear']);
    Route::post('/notifications/{notification}/read', [NotificationController::class, 'markRead']);
    Route::post('/notifications/{notification}/unread', [NotificationController::class, 'markUnread']);
    Route::delete('/notifications/{notification}', [NotificationController::class, 'destroy']);
    Route::get('/notification-preferences', [NotificationController::class, 'preferences']);
    Route::put('/notification-preferences', [NotificationController::class, 'updatePreferences']);

    // Customer quote requests (RFQ): raise from a product page, track the
    // merchant's answer and accept or decline it.
    Route::get('/quotes', [QuoteRequestController::class, 'index']);
    Route::post('/quotes', [QuoteRequestController::class, 'store'])->middleware('throttle:12,1');
    Route::get('/quotes/{quote}', [QuoteRequestController::class, 'show'])->whereNumber('quote');
    Route::post('/quotes/{quote}/respond', [QuoteRequestController::class, 'respond'])->whereNumber('quote');

    Route::post('/payments/intent/{orderId}', [PaymentController::class, 'intent']);

    Route::middleware(['tenant', 'role:tenant'])->prefix('tenant')->group(function () {
        Route::get('/', [TenantController::class, 'show']);
        Route::patch('/', [TenantController::class, 'update']);

        Route::get('/stores', [TenantController::class, 'stores']);
        Route::post('/stores', [TenantController::class, 'storeStore']);
        Route::get('/stores/{store}', [TenantController::class, 'showStore']);
        Route::patch('/stores/{store}', [TenantController::class, 'updateStore']);
        Route::delete('/stores/{store}', [TenantController::class, 'destroyStore']);
        Route::post('/stores/{store}/media', [TenantController::class, 'uploadMedia']);

        // Workspace currency: active code, catalog, and a dry-run of what a
        // switch would do to stored prices.
        Route::get('/currency', [CurrencyController::class, 'active']);
        Route::post('/currency/preview', [CurrencyController::class, 'preview']);

        Route::get('/categories', [CategoryController::class, 'index']);
        Route::post('/categories', [CategoryController::class, 'store']);
        Route::get('/categories/{category}', [CategoryController::class, 'show']);
        Route::patch('/categories/{category}', [CategoryController::class, 'update']);
        Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);

        Route::get('/products', [ProductController::class, 'index']);
        Route::get('/products/meta', [ProductController::class, 'meta']);
        Route::post('/products', [ProductController::class, 'store']);
        Route::post('/products/bulk', [ProductController::class, 'bulk']);
        Route::get('/products/{product}', [ProductController::class, 'show']);
        Route::post('/products/{product}/duplicate', [ProductController::class, 'duplicate']);
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
        Route::get('/inventory', [InventoryController::class, 'index']);
        Route::get('/inventory/meta', [InventoryController::class, 'meta']);
        Route::get('/inventory/movements', [InventoryController::class, 'movements']);
        Route::get('/inventory/low-stock', [InventoryController::class, 'lowStock']);
        Route::post('/inventory/bulk', [InventoryController::class, 'bulk']);
        Route::post('/inventory/{inventory}/adjust', [InventoryController::class, 'adjust']);

        Route::get('/orders', [SellerOrderController::class, 'index']);
        Route::get('/orders/{order}', [SellerOrderController::class, 'show']);
        Route::patch('/orders/{order}/status', [SellerOrderController::class, 'updateStatus']);

        Route::get('/dashboard/summary', [DashboardController::class, 'summary']);
        Route::get('/dashboard/departments', [DepartmentDashboardController::class, 'overview']);
        Route::get('/dashboard/departments/{department}', [DepartmentDashboardController::class, 'show']);

        // Accounting: receivables, payments, bills, contacts and procurement.
        Route::prefix('accounting')->middleware('accounting')->group(function () {
            Route::get('/dashboard', [AccountingController::class, 'dashboard']);
            Route::get('/invoices', [AccountingController::class, 'invoices']);
            Route::post('/invoices', [AccountingController::class, 'storeInvoice']);
            Route::get('/invoices/{invoice}', [AccountingController::class, 'showInvoice']);
            Route::patch('/invoices/{invoice}', [AccountingController::class, 'updateInvoice']);
            Route::delete('/invoices/{invoice}', [AccountingController::class, 'destroyInvoice']);
            Route::post('/invoices/{invoice}/payments', [AccountingController::class, 'recordInvoicePayment']);
            Route::get('/payments', [AccountingController::class, 'payments']);
            Route::get('/expenses', [AccountingController::class, 'expenses']);
            Route::post('/expenses', [AccountingController::class, 'storeExpense']);
            Route::post('/expenses/{expense}/pay', [AccountingController::class, 'payExpense']);
            Route::get('/contacts', [AccountingController::class, 'contacts']);
            Route::post('/contacts', [AccountingController::class, 'storeContact']);
            Route::get('/purchase-orders', [AccountingController::class, 'purchaseOrders']);
            Route::post('/purchase-orders', [AccountingController::class, 'storePurchaseOrder']);
            Route::patch('/purchase-orders/{purchaseOrder}', [AccountingController::class, 'updatePurchaseOrder']);

            Route::get('/accounts', [AccountingLedgerController::class, 'accounts']);
            Route::post('/accounts', [AccountingLedgerController::class, 'storeAccount']);
            Route::get('/journals', [AccountingLedgerController::class, 'journals']);
            Route::post('/journals', [AccountingLedgerController::class, 'storeJournal']);
            Route::post('/journals/{journal}/post', [AccountingLedgerController::class, 'postJournal']);
            Route::get('/reports', [AccountingLedgerController::class, 'reports']);
            Route::get('/bank-accounts', [AccountingLedgerController::class, 'bankAccounts']);
            Route::post('/bank-accounts', [AccountingLedgerController::class, 'storeBankAccount']);
            Route::get('/bank-transactions', [AccountingLedgerController::class, 'bankTransactions']);
            Route::post('/bank-transactions', [AccountingLedgerController::class, 'storeBankTransaction']);
            Route::patch('/bank-transactions/{bankTransaction}', [AccountingLedgerController::class, 'reconcileBankTransaction']);
        });

        // Sales workspace: leads, pipeline, quotes and customer accounts.
        Route::prefix('sales')->middleware('sales')->group(function () {
            Route::get('/dashboard', [SalesController::class, 'dashboard']);
            Route::get('/leads', [SalesController::class, 'leads']);
            Route::post('/leads', [SalesController::class, 'storeLead']);
            Route::patch('/leads/{lead}', [SalesController::class, 'updateLead']);
            Route::post('/leads/{lead}/convert', [SalesController::class, 'convertLead']);
            Route::get('/opportunities', [SalesController::class, 'opportunities']);
            Route::post('/opportunities', [SalesController::class, 'storeOpportunity']);
            Route::patch('/opportunities/{opportunity}', [SalesController::class, 'updateOpportunity']);
            Route::get('/quotes', [SalesController::class, 'quotes']);
            Route::post('/quotes', [SalesController::class, 'storeQuote']);
            Route::patch('/quotes/{quote}', [SalesController::class, 'updateQuote']);
            Route::get('/customers', [SalesController::class, 'customers']);
            Route::post('/customers', [SalesController::class, 'storeCustomer']);
        });

        // Access control: system users (console staff), the roles that carry
        // their permission checkboxes, and the tenant's customer accounts.
        Route::get('/users', [TenantUserController::class, 'index']);
        Route::post('/users', [TenantUserController::class, 'store']);
        Route::patch('/users/{staff}', [TenantUserController::class, 'update']);
        Route::delete('/users/{staff}', [TenantUserController::class, 'destroy']);
        Route::post('/users/{staff}/password', [TenantUserController::class, 'resetPassword']);

        // Legacy aliases kept so older clients keep working.
        Route::get('/staff', [TenantUserController::class, 'index']);
        Route::post('/staff', [TenantUserController::class, 'store']);
        Route::patch('/staff/{staff}', [TenantUserController::class, 'update']);
        Route::delete('/staff/{staff}', [TenantUserController::class, 'destroy']);

        Route::get('/roles', [TenantRoleController::class, 'index']);
        Route::post('/roles', [TenantRoleController::class, 'store']);
        Route::patch('/roles/{role}', [TenantRoleController::class, 'update']);
        Route::delete('/roles/{role}', [TenantRoleController::class, 'destroy']);

        Route::get('/customers', [TenantCustomerController::class, 'index']);
        Route::get('/customers/{customer}', [TenantCustomerController::class, 'show']);
        Route::patch('/customers/{customer}', [TenantCustomerController::class, 'update']);

        Route::get('/settings', [TenantSettingsController::class, 'show']);
        Route::patch('/settings', [TenantSettingsController::class, 'update']);
        Route::post('/settings/documents', [TenantSettingsController::class, 'uploadDocument']);

        // Workspace activity trail: the tenant's own slice of the audit log.
        Route::get('/audit-logs', [TenantAuditController::class, 'index']);
        Route::get('/audit-logs/facets', [TenantAuditController::class, 'facets']);

        Route::get('/backups', [TenantBackupController::class, 'index']);
        Route::post('/backups', [TenantBackupController::class, 'store']);
        Route::get('/backups/{backup}/download', [TenantBackupController::class, 'download']);
        Route::post('/backups/{backup}/restore', [TenantBackupController::class, 'restore']);

        Route::get('/domains', [DomainController::class, 'index']);
        Route::post('/domains', [DomainController::class, 'store']);
        Route::post('/domains/{domain}/verify', [DomainController::class, 'verify']);
        Route::delete('/domains/{domain}', [DomainController::class, 'destroy']);

        Route::get('/ads', [AdCampaignController::class, 'index']);
        Route::get('/ads/meta', [AdCampaignController::class, 'meta']);
        Route::post('/ads', [AdCampaignController::class, 'store']);
        Route::patch('/ads/{campaign}', [AdCampaignController::class, 'update']);
        Route::post('/ads/fund', [AdCampaignController::class, 'fund']);
        Route::delete('/ads/{campaign}', [AdCampaignController::class, 'destroy']);

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

        // §17 — the seller's review inbox. Approval stays with the platform.
        Route::get('/reviews', [TenantReviewController::class, 'index']);
        Route::post('/reviews/{review}/respond', [TenantReviewController::class, 'respond']);
        Route::post('/reviews/{review}/report', [TenantReviewController::class, 'report']);

        // §18 — seller coupons.
        Route::get('/coupons/meta', [CouponController::class, 'meta']);
        Route::get('/coupons', [CouponController::class, 'index']);
        Route::post('/coupons', [CouponController::class, 'store']);
        Route::get('/coupons/{coupon}', [CouponController::class, 'show'])->whereNumber('coupon');
        Route::patch('/coupons/{coupon}', [CouponController::class, 'update'])->whereNumber('coupon');
        Route::delete('/coupons/{coupon}', [CouponController::class, 'destroy'])->whereNumber('coupon');
        Route::get('/coupons/{coupon}/redemptions', [CouponController::class, 'redemptions'])->whereNumber('coupon');

        // §16 — delivery zones, methods and shipment tracking.
        Route::get('/delivery', [DeliveryController::class, 'index']);
        Route::post('/delivery/zones', [DeliveryController::class, 'storeZone']);
        Route::patch('/delivery/zones/{zone}', [DeliveryController::class, 'updateZone']);
        Route::delete('/delivery/zones/{zone}', [DeliveryController::class, 'destroyZone']);
        Route::post('/delivery/methods', [DeliveryController::class, 'storeMethod']);
        Route::patch('/delivery/methods/{method}', [DeliveryController::class, 'updateMethod']);
        Route::delete('/delivery/methods/{method}', [DeliveryController::class, 'destroyMethod']);
        Route::get('/shipments', [DeliveryController::class, 'shipments']);
        Route::get('/shipments/{shipment}', [DeliveryController::class, 'showShipment'])->whereNumber('shipment');
        Route::patch('/shipments/{shipment}', [DeliveryController::class, 'updateShipment'])->whereNumber('shipment');
        Route::post('/shipments/{shipment}/events', [DeliveryController::class, 'addShipmentEvent'])->whereNumber('shipment');
        Route::post('/orders/{sellerOrder}/shipment', [DeliveryController::class, 'shipmentForOrder'])->whereNumber('sellerOrder');

        // §12 — settlements, payout accounts and payout requests.
        Route::get('/payouts', [PayoutController::class, 'overview']);
        Route::get('/payouts/settlements', [PayoutController::class, 'settlements']);
        Route::get('/payouts/batches', [PayoutController::class, 'batches']);
        Route::get('/payouts/batches/{batch}', [PayoutController::class, 'showBatch'])->whereNumber('batch');
        Route::post('/payouts/request', [PayoutController::class, 'requestPayout']);
        Route::get('/payouts/accounts', [PayoutController::class, 'accounts']);
        Route::post('/payouts/accounts', [PayoutController::class, 'storeAccount']);
        Route::patch('/payouts/accounts/{account}', [PayoutController::class, 'updateAccount'])->whereNumber('account');
        Route::delete('/payouts/accounts/{account}', [PayoutController::class, 'destroyAccount'])->whereNumber('account');

        // §12 — the seller's refund queue.
        Route::get('/refunds', [RefundController::class, 'index']);
        Route::post('/refunds/issue', [RefundController::class, 'issue']);
        Route::get('/refunds/{refund}', [RefundController::class, 'show'])->whereNumber('refund');
        Route::post('/refunds/{refund}/approve', [RefundController::class, 'approve'])->whereNumber('refund');
        Route::post('/refunds/{refund}/reject', [RefundController::class, 'reject'])->whereNumber('refund');
        Route::get('/orders/{sellerOrder}/refundable', [RefundController::class, 'refundable'])->whereNumber('sellerOrder');

        // §18 — the seller's dispute board.
        Route::get('/disputes', [DisputeController::class, 'index']);
        Route::get('/disputes/{dispute}', [DisputeController::class, 'show'])->whereNumber('dispute');
        Route::post('/disputes/{dispute}/messages', [DisputeController::class, 'reply'])->whereNumber('dispute');
        Route::post('/disputes/{dispute}/escalate', [DisputeController::class, 'escalate'])->whereNumber('dispute');
        Route::post('/disputes/{dispute}/resolve', [DisputeController::class, 'resolve'])->whereNumber('dispute');
    });

    Route::post('/devices', [DeviceTokenController::class, 'store']);
    Route::delete('/devices', [DeviceTokenController::class, 'destroy']);

    Route::middleware('role:super_admin')->prefix('admin')->group(function () {
        Route::get('/tenants', [AdminController::class, 'tenants']);
        Route::get('/tenants/{tenant}', [AdminController::class, 'showTenant']);
        Route::get('/tenants/{tenant}/documents/{document}', [AdminController::class, 'tenantDocument']);
        Route::patch('/tenants/{tenant}', [AdminController::class, 'updateTenant']);
        Route::get('/stores', [AdminController::class, 'stores']);
        Route::patch('/stores/{store}', [AdminController::class, 'updateStore']);
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

        Route::get('/currency', [CurrencyController::class, 'index']);
        Route::put('/currency/rates', [CurrencyController::class, 'updateRates']);

        Route::get('/settings', [AdminSettingController::class, 'index']);
        Route::get('/settings/payment-status', [AdminSettingController::class, 'paymentStatus']);
        Route::put('/settings', [AdminSettingController::class, 'update']);
        Route::post('/settings/reset', [AdminSettingController::class, 'reset']);
        Route::post('/settings/assets/{asset}', [AdminSettingController::class, 'uploadAsset']);
        Route::delete('/settings/assets/{asset}', [AdminSettingController::class, 'destroyAsset']);
        Route::post('/settings/email/test', [AdminSettingController::class, 'testEmail'])->middleware('throttle:6,1');
        Route::post('/settings/sms/test', [AdminSettingController::class, 'testSms'])->middleware('throttle:6,1');
        Route::get('/settings/hero-slides', [AdminSettingController::class, 'heroSlides']);
        Route::post('/settings/hero-slides', [AdminSettingController::class, 'uploadHeroSlide']);
        Route::put('/settings/hero-slides', [AdminSettingController::class, 'updateHeroSlides']);
        Route::delete('/settings/hero-slides/{id}', [AdminSettingController::class, 'destroyHeroSlide']);

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

        // §17 — review moderation desk.
        Route::get('/reviews', [AdminReviewController::class, 'index']);
        Route::get('/reviews/reports', [AdminReviewController::class, 'reports']);
        Route::get('/reviews/store-ratings', [AdminReviewController::class, 'storeRatings']);
        Route::post('/reviews/bulk', [AdminReviewController::class, 'bulkModerate']);
        Route::get('/reviews/{review}', [AdminReviewController::class, 'show'])->whereNumber('review');
        Route::post('/reviews/{review}/moderate', [AdminReviewController::class, 'moderate'])->whereNumber('review');
        Route::delete('/reviews/{review}', [AdminReviewController::class, 'destroy'])->whereNumber('review');
        Route::post('/review-reports/{report}/resolve', [AdminReviewController::class, 'resolveReport']);

        // §14 — the configurable commission engine.
        Route::get('/commissions/meta', [AdminCommissionController::class, 'meta']);
        Route::get('/commissions/earnings', [AdminCommissionController::class, 'earnings']);
        Route::post('/commissions/simulate', [AdminCommissionController::class, 'simulate']);
        Route::post('/commissions/reorder', [AdminCommissionController::class, 'reorder']);
        Route::get('/commissions', [AdminCommissionController::class, 'index']);
        Route::post('/commissions', [AdminCommissionController::class, 'store']);
        Route::get('/commissions/{rule}', [AdminCommissionController::class, 'show'])->whereNumber('rule');
        Route::patch('/commissions/{rule}', [AdminCommissionController::class, 'update'])->whereNumber('rule');
        Route::delete('/commissions/{rule}', [AdminCommissionController::class, 'destroy'])->whereNumber('rule');
        Route::post('/commissions/{rule}/toggle', [AdminCommissionController::class, 'toggle'])->whereNumber('rule');

        // §12 — the platform payouts desk.
        Route::get('/payouts', [AdminPayoutController::class, 'overview']);
        Route::get('/payouts/batches', [AdminPayoutController::class, 'batches']);
        Route::post('/payouts/batches', [AdminPayoutController::class, 'createBatch']);
        Route::post('/payouts/batches/run-all', [AdminPayoutController::class, 'createAllBatches']);
        Route::get('/payouts/batches/{batch}', [AdminPayoutController::class, 'showBatch'])->whereNumber('batch');
        Route::post('/payouts/batches/{batch}/recalculate', [AdminPayoutController::class, 'recalculate'])->whereNumber('batch');
        Route::post('/payouts/batches/{batch}/release', [AdminPayoutController::class, 'release'])->whereNumber('batch');
        Route::post('/payouts/batches/{batch}/paid', [AdminPayoutController::class, 'markPaid'])->whereNumber('batch');
        Route::post('/payouts/batches/{batch}/failed', [AdminPayoutController::class, 'markFailed'])->whereNumber('batch');
        Route::post('/payouts/batches/{batch}/cancel', [AdminPayoutController::class, 'cancelBatch'])->whereNumber('batch');
        Route::get('/payouts/settlements', [AdminPayoutController::class, 'settlements']);
        Route::post('/payouts/settlements/{settlement}/hold', [AdminPayoutController::class, 'holdSettlement'])->whereNumber('settlement');
        Route::post('/payouts/settlements/{settlement}/release', [AdminPayoutController::class, 'releaseSettlement'])->whereNumber('settlement');
        Route::get('/payouts/adjustments', [AdminPayoutController::class, 'adjustments']);
        Route::post('/payouts/adjustments', [AdminPayoutController::class, 'addAdjustment']);
        Route::get('/payouts/accounts', [AdminPayoutController::class, 'accounts']);
        Route::post('/payouts/accounts/{account}/verify', [AdminPayoutController::class, 'verifyAccount'])->whereNumber('account');

        // §12 / §18 — arbitration: disputes plus the refund ledger.
        Route::get('/disputes', [AdminDisputeController::class, 'index']);
        Route::get('/disputes/overdue', [AdminDisputeController::class, 'overdue']);
        Route::get('/disputes/{dispute}', [AdminDisputeController::class, 'show'])->whereNumber('dispute');
        Route::post('/disputes/{dispute}/messages', [AdminDisputeController::class, 'reply'])->whereNumber('dispute');
        Route::post('/disputes/{dispute}/assign', [AdminDisputeController::class, 'assign'])->whereNumber('dispute');
        Route::post('/disputes/{dispute}/escalate', [AdminDisputeController::class, 'escalate'])->whereNumber('dispute');
        Route::post('/disputes/{dispute}/resolve', [AdminDisputeController::class, 'resolve'])->whereNumber('dispute');
        Route::get('/refunds', [AdminDisputeController::class, 'refunds']);
        Route::post('/refunds/{refund}/approve', [AdminDisputeController::class, 'approveRefund'])->whereNumber('refund');
        Route::post('/refunds/{refund}/reject', [AdminDisputeController::class, 'rejectRefund'])->whereNumber('refund');
        Route::post('/refunds/{refund}/retry', [AdminDisputeController::class, 'retryRefund'])->whereNumber('refund');

        // §7 — global category tree and product moderation.
        Route::get('/catalog/categories', [AdminCatalogController::class, 'categories']);
        Route::post('/catalog/categories', [AdminCatalogController::class, 'storeCategory']);
        Route::post('/catalog/categories/reorder', [AdminCatalogController::class, 'reorderCategories']);
        Route::patch('/catalog/categories/{category}', [AdminCatalogController::class, 'updateCategory'])->whereNumber('category');
        Route::delete('/catalog/categories/{category}', [AdminCatalogController::class, 'destroyCategory'])->whereNumber('category');
        Route::get('/catalog/tenant-categories', [AdminCatalogController::class, 'tenantCategories']);
        Route::post('/catalog/map', [AdminCatalogController::class, 'mapCategory']);
        Route::get('/catalog/products', [AdminCatalogController::class, 'products']);
        Route::post('/catalog/products/bulk', [AdminCatalogController::class, 'bulkModerateProducts']);
        Route::post('/catalog/products/{product}/moderate', [AdminCatalogController::class, 'moderateProduct'])->whereNumber('product');
        Route::get('/catalog/reports', [AdminCatalogController::class, 'productReports']);
        Route::post('/catalog/reports/{report}/resolve', [AdminCatalogController::class, 'resolveProductReport'])->whereNumber('report');

        // §18 — platform-wide promotions.
        Route::get('/coupons/options', [AdminCouponController::class, 'options']);
        Route::get('/coupons', [AdminCouponController::class, 'index']);
        Route::post('/coupons', [AdminCouponController::class, 'store']);
        Route::get('/coupons/{coupon}', [AdminCouponController::class, 'show'])->whereNumber('coupon');
        Route::patch('/coupons/{coupon}', [AdminCouponController::class, 'update'])->whereNumber('coupon');
        Route::delete('/coupons/{coupon}', [AdminCouponController::class, 'destroy'])->whereNumber('coupon');
        Route::post('/coupons/{coupon}/toggle', [AdminCouponController::class, 'toggle'])->whereNumber('coupon');
        Route::get('/coupons/{coupon}/redemptions', [AdminCouponController::class, 'redemptions'])->whereNumber('coupon');
    });
});

Route::prefix('seller/v1')->middleware('throttle:60,1')->group(function () {
    Route::get('/products', [SellerPublicApiController::class, 'products'])->middleware('seller.api:products.read');
    Route::get('/orders', [SellerPublicApiController::class, 'orders'])->middleware('seller.api:orders.read');
    Route::post('/orders/{order}/fulfill', [SellerPublicApiController::class, 'fulfill'])->middleware('seller.api:orders.fulfill');
    Route::patch('/variants/{variant}/inventory', [SellerPublicApiController::class, 'inventory'])->middleware('seller.api:inventory.write');
    Route::get('/settlements', [SellerPublicApiController::class, 'settlements'])->middleware('seller.api:settlements.read');
});
