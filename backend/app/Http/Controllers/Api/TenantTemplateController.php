<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Page;
use App\Models\PageRevision;
use App\Models\PageTemplate;
use App\Models\Store;
use App\Models\TemplateCategory;
use App\Models\TemplatePurchase;
use App\Models\TenantTemplate;
use App\Services\Payment\PaymentConfiguration;
use App\Services\Payment\PaymentGateway;
use App\Support\ActivityLogger;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class TenantTemplateController extends Controller
{
    public function __construct(
        protected PaymentGateway $gateway,
        protected PaymentConfiguration $payments,
    ) {}

    public function catalog(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing('roles');
        $tenantId = (int) $user->tenantId();
        $query = PageTemplate::query()
            ->with('category:id,name,slug')
            ->where('status', PageTemplate::STATUS_PUBLISHED)
            ->where(function ($q) {
                $q->whereNull('category_id')
                    ->orWhereHas('category', fn ($category) => $category->where('is_active', true));
            });

        if ($request->filled('category')) {
            $query->whereHas('category', fn ($q) => $q->where('slug', $request->string('category')));
        }
        if ($request->filled('q')) {
            $term = '%'.$request->string('q').'%';
            $query->where(fn ($q) => $q->where('name', 'like', $term)->orWhere('description', 'like', $term));
        }
        if ($request->boolean('featured')) {
            $query->where('is_featured', true);
        }

        $templates = $query->orderByDesc('is_featured')->orderBy('name')
            ->paginate(min(60, max(1, $request->integer('per_page', 30))));
        $ownedIds = TemplatePurchase::query()
            ->where('tenant_id', $tenantId)
            ->where('payment_status', TemplatePurchase::STATUS_PAID)
            ->pluck('template_id')
            ->all();

        return response()->json([
            'data' => collect($templates->items())->map(function (PageTemplate $template) use ($ownedIds) {
                $row = $template->toArray();
                $row['is_owned'] = in_array($template->id, $ownedIds, true);

                return $row;
            })->all(),
            'categories' => TemplateCategory::query()->where('is_active', true)
                ->orderBy('position')->orderBy('name')->get(['id', 'name', 'slug', 'description', 'icon']),
            'meta' => [
                'page' => $templates->currentPage(),
                'per_page' => $templates->perPage(),
                'total' => $templates->total(),
                'last_page' => $templates->lastPage(),
            ],
            'currency' => $this->payments->currency(),
        ]);
    }

    public function mine(Request $request): JsonResponse
    {
        $tenantId = (int) $request->user()->tenantId();
        $purchases = TemplatePurchase::query()
            ->with(['template.category:id,name,slug', 'template.installations' => fn ($q) => $q
                ->where('tenant_id', $tenantId)
                ->where('status', 'active')
                ->with('store:id,name,slug')])
            ->where('tenant_id', $tenantId)
            ->whereIn('payment_status', [TemplatePurchase::STATUS_PAID, TemplatePurchase::STATUS_PENDING])
            ->orderByDesc('purchased_at')
            ->orderByDesc('updated_at')
            ->get();

        return response()->json(['data' => $purchases]);
    }

    public function purchase(Request $request, PageTemplate $template): JsonResponse
    {
        $user = $request->user()->loadMissing('roles');
        abort_unless($user->isTenantOwner(), 403, 'Only a tenant owner can purchase a template licence.');
        abort_unless($template->status === PageTemplate::STATUS_PUBLISHED, 404, 'Template is not available.');
        abort_unless(! $template->category_id || $template->category()->where('is_active', true)->exists(), 404, 'Template category is not available.');

        $tenantId = (int) $user->tenantId();
        $existing = TemplatePurchase::query()
            ->where('tenant_id', $tenantId)
            ->where('template_id', $template->id)
            ->first();
        if ($existing?->payment_status === TemplatePurchase::STATUS_PAID) {
            return response()->json(['data' => [
                'purchase' => $existing->load('template'),
                'already_owned' => true,
            ]]);
        }

        $purchase = $existing ?? new TemplatePurchase([
            'tenant_id' => $tenantId,
            'template_id' => $template->id,
        ]);
        $purchase->fill([
            'amount' => $template->price,
            'currency' => strtoupper($template->currency),
        ]);

        if ($template->isFree()) {
            $purchase->fill([
                'payment_status' => TemplatePurchase::STATUS_PAID,
                'payment_provider' => 'free',
                'payment_reference' => null,
                'payment_meta' => ['licence' => 'free'],
                'purchased_at' => now(),
            ]);
            $purchase->save();
            ActivityLogger::record('template.purchased', [
                'subject_type' => TemplatePurchase::class,
                'subject_id' => $purchase->id,
                'meta' => ['template_id' => $template->id, 'amount' => '0.00', 'currency' => $template->currency],
            ], tenantId: $tenantId);

            return response()->json(['data' => [
                'purchase' => $purchase->load('template'),
                'already_owned' => false,
                'checkout' => null,
            ]], $existing ? 200 : 201);
        }

        $data = $request->validate([
            'payment_method' => ['nullable', 'string', 'max:32'],
        ]);
        $method = (string) ($data['payment_method'] ?? 'card');
        $availableMethod = collect($this->payments->methods())->firstWhere('key', $method);
        if (! $availableMethod || ! ($availableMethod['online'] ?? false)) {
            return response()->json(['error' => [
                'code' => 'payment_method_unavailable',
                'message' => 'Choose an available online payment method for this template.',
                'fields' => ['payment_method' => ['Choose an available online payment method.']],
            ]], 422);
        }

        if ($purchase->exists && $purchase->payment_status === TemplatePurchase::STATUS_PENDING
            && data_get($purchase->payment_meta, 'checkout_url')
            && data_get($purchase->payment_meta, 'payment_method') === $method) {
            return response()->json(['data' => [
                'purchase' => $purchase->load('template'),
                'already_owned' => false,
                'checkout' => [
                    'type' => data_get($purchase->payment_meta, 'intent_type', 'redirect'),
                    'url' => data_get($purchase->payment_meta, 'checkout_url'),
                    'reference' => $purchase->payment_reference,
                ],
            ]]);
        }

        $purchase->fill([
            'payment_status' => TemplatePurchase::STATUS_PENDING,
            'payment_provider' => $this->payments->provider(),
            'payment_reference' => null,
            'payment_meta' => null,
            'purchased_at' => null,
        ]);
        try {
            $purchase->save();
        } catch (QueryException $exception) {
            // Two rapid purchase clicks can race on the tenant/template unique key.
            $purchase = TemplatePurchase::query()
                ->where('tenant_id', $tenantId)
                ->where('template_id', $template->id)
                ->firstOrFail();
        }

        $intent = $this->gateway->createTemplateIntent(
            $purchase,
            $template,
            $user,
            (string) $template->price,
            strtoupper($template->currency),
            $method,
        );
        $purchase->update([
            'payment_provider' => $this->payments->provider(),
            'payment_reference' => $intent->gatewayRef,
            'payment_meta' => [
                'checkout_url' => $intent->url,
                'intent_type' => $intent->type,
                'payment_method' => $method,
                ...$intent->meta,
            ],
        ]);

        return response()->json(['data' => [
            'purchase' => $purchase->fresh()->load('template'),
            'already_owned' => false,
            'checkout' => [
                'type' => $intent->type,
                'url' => $intent->url,
                'reference' => $intent->gatewayRef,
            ],
        ]], 201);
    }

    public function install(Request $request, PageTemplate $template): JsonResponse
    {
        $user = $request->user()->loadMissing('roles');
        abort_unless($user->isTenantOwner(), 403, 'Only a tenant owner can install a template.');
        $data = $request->validate(['store_id' => ['required', 'integer', 'exists:stores,id']]);
        $store = Store::query()->findOrFail($data['store_id']);
        $this->authorize('update', $store);

        $tenantId = (int) $user->tenantId();
        $purchase = TemplatePurchase::query()
            ->where('tenant_id', $tenantId)
            ->where('template_id', $template->id)
            ->where('payment_status', TemplatePurchase::STATUS_PAID)
            ->first();
        abort_unless($purchase, 403, 'Purchase this template before installing it.');

        $definition = $template->definition ?? [];
        $pages = $definition['pages'] ?? [];
        $currentTheme = $store->theme_config ?? [];
        $newTheme = $definition['theme'] ?? [];
        $newTheme['pages'] = array_merge($currentTheme['pages'] ?? [], array_filter([
            'about' => $pages['about'] ?? null,
            'contact' => $pages['contact'] ?? null,
        ], fn ($page) => is_array($page) && $page !== []));
        $homeSections = array_values(array_filter($pages['home'] ?? [], fn ($section) => is_array($section) && ($section['enabled'] ?? true)));

        $installation = DB::transaction(function () use ($store, $template, $tenantId, $definition, $newTheme, $homeSections, $pages, $user) {
            $previous = [
                'sections' => $store->page_sections ?? [],
                'theme_config' => $store->theme_config ?? [],
            ];
            if ($previous['sections'] !== [] || $previous['theme_config'] !== []) {
                $this->writeHomeRevision($store, $user->id, $previous);
            }

            $store->update([
                'theme_config' => $newTheme,
                'page_sections' => $homeSections,
            ]);
            $this->writeHomeRevision($store, $user->id, [
                'sections' => $store->page_sections ?? [],
                'theme_config' => $store->theme_config ?? [],
            ]);

            TenantTemplate::query()->where('store_id', $store->id)->where('status', 'active')->update(['status' => 'archived']);
            $installation = TenantTemplate::query()->create([
                'tenant_id' => $tenantId,
                'store_id' => $store->id,
                'template_id' => $template->id,
                'template_version' => $template->version,
                'customized_data' => $definition,
                'status' => 'active',
                'installed_at' => now(),
            ]);

            foreach ($pages['custom'] ?? [] as $customPage) {
                if (! is_array($customPage) || empty($customPage['name']) || empty($customPage['sections'])) {
                    continue;
                }
                $slug = Str::slug((string) ($customPage['slug'] ?? $customPage['name'])) ?: 'page';
                $base = $slug;
                $suffix = 2;
                while (Page::query()->where('store_id', $store->id)->where('slug', $slug)->exists()) {
                    $slug = $base.'-'.$suffix++;
                }
                $page = Page::query()->create([
                    'tenant_id' => $tenantId,
                    'store_id' => $store->id,
                    'created_by' => $user->id,
                    'name' => $customPage['name'],
                    'slug' => $slug,
                    'page_type' => Page::TYPE_CUSTOM,
                    'content' => ['schema_version' => 1, 'sections' => array_values($customPage['sections'])],
                    'status' => Page::STATUS_DRAFT,
                ]);
                PageRevision::query()->create([
                    'tenant_id' => $tenantId,
                    'store_id' => $store->id,
                    'page_id' => $page->id,
                    'created_by' => $user->id,
                    'page_type' => $page->page_type,
                    'version' => 1,
                    'content' => $page->content,
                ]);
            }

            return $installation;
        });

        ActivityLogger::record('template.installed', [
            'subject_type' => TenantTemplate::class,
            'subject_id' => $installation->id,
            'meta' => ['template_id' => $template->id, 'store_id' => $store->id, 'template_version' => $template->version],
        ], tenantId: $tenantId);

        return response()->json([
            'data' => [
                'installation' => $installation->load('template:id,name,slug,version'),
                'store' => $store->fresh(),
            ],
        ], 201);
    }

    protected function writeHomeRevision(Store $store, int $userId, array $content): PageRevision
    {
        $version = (int) PageRevision::query()
            ->where('store_id', $store->id)
            ->where('page_type', 'home')
            ->max('version') + 1;

        return PageRevision::query()->create([
            'tenant_id' => $store->tenant_id,
            'store_id' => $store->id,
            'page_id' => null,
            'created_by' => $userId,
            'page_type' => 'home',
            'version' => $version,
            'content' => $content,
        ]);
    }
}
