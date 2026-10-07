<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Page;
use App\Models\PageRevision;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class TenantPageController extends Controller
{
    public function index(Store $store): JsonResponse
    {
        $this->authorize('view', $store);

        return response()->json(['data' => $store->pages()->orderBy('name')->get()]);
    }

    public function store(Request $request, Store $store): JsonResponse
    {
        $this->authorize('update', $store);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'slug' => ['nullable', 'string', 'max:120', 'alpha_dash:ascii'],
            'content' => ['required', 'array'],
            ...$this->contentRules(),
            'status' => ['nullable', Rule::in([Page::STATUS_DRAFT, Page::STATUS_PUBLISHED])],
            'seo_title' => ['nullable', 'string', 'max:70'],
            'seo_description' => ['nullable', 'string', 'max:170'],
        ]);
        $slug = Str::lower($data['slug'] ?? Str::slug($data['name']));
        $this->assertPageSlug($slug);
        $page = $store->pages()->create([
            'tenant_id' => $store->tenant_id,
            'created_by' => $request->user()->id,
            'name' => $data['name'],
            'slug' => $slug,
            'page_type' => Page::TYPE_CUSTOM,
            'content' => $this->normalizeContent($data['content']),
            'status' => $data['status'] ?? Page::STATUS_DRAFT,
            'seo_title' => $data['seo_title'] ?? null,
            'seo_description' => $data['seo_description'] ?? null,
            'published_at' => ($data['status'] ?? Page::STATUS_DRAFT) === Page::STATUS_PUBLISHED ? now() : null,
        ]);
        $this->writeRevision($page, $request->user()->id);

        return response()->json(['data' => $page], 201);
    }

    public function update(Request $request, Store $store, Page $page): JsonResponse
    {
        $this->authorize('update', $store);
        $this->assertPageBelongsToStore($store, $page);
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'slug' => ['sometimes', 'string', 'max:120', 'alpha_dash:ascii', Rule::unique('pages', 'slug')->where('store_id', $store->id)->ignore($page->id)],
            'content' => ['sometimes', 'array'],
            ...$this->contentRules(),
            'status' => ['sometimes', Rule::in([Page::STATUS_DRAFT, Page::STATUS_PUBLISHED])],
            'seo_title' => ['nullable', 'string', 'max:70'],
            'seo_description' => ['nullable', 'string', 'max:170'],
        ]);
        if (isset($data['slug'])) {
            $data['slug'] = Str::lower($data['slug']);
            $this->assertPageSlug($data['slug']);
        }
        if (isset($data['content'])) {
            $data['content'] = $this->normalizeContent($data['content']);
        }
        if (($data['status'] ?? null) === Page::STATUS_PUBLISHED && $page->status !== Page::STATUS_PUBLISHED) {
            $data['published_at'] = now();
        } elseif (($data['status'] ?? null) === Page::STATUS_DRAFT) {
            $data['published_at'] = null;
        }

        $before = $page->content;
        $page->update($data);
        if (array_key_exists('content', $data) && $before !== $page->content) {
            $this->writeRevision($page, $request->user()->id);
        }

        return response()->json(['data' => $page->fresh()]);
    }

    public function destroy(Request $request, Store $store, Page $page): JsonResponse
    {
        $this->authorize('update', $store);
        $this->assertPageBelongsToStore($store, $page);
        $page->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    public function pageRevisions(Store $store, Page $page): JsonResponse
    {
        $this->authorize('view', $store);
        $this->assertPageBelongsToStore($store, $page);

        return response()->json(['data' => PageRevision::query()
            ->with('creator:id,name')
            ->where('store_id', $store->id)
            ->where('page_id', $page->id)
            ->orderByDesc('version')
            ->limit(50)
            ->get(['id', 'page_id', 'page_type', 'version', 'created_by', 'created_at'])]);
    }

    public function restorePageRevision(Request $request, Store $store, Page $page, PageRevision $revision): JsonResponse
    {
        $this->authorize('update', $store);
        $this->assertPageBelongsToStore($store, $page);
        abort_unless($revision->store_id === $store->id && $revision->page_id === $page->id, 404);

        return DB::transaction(function () use ($request, $page, $revision) {
            $page->update(['content' => $revision->content]);
            $this->writeRevision($page, $request->user()->id);

            return response()->json(['data' => $page->fresh(), 'restored_version' => $revision->version]);
        });
    }

    public function homeRevisions(Store $store): JsonResponse
    {
        $this->authorize('view', $store);

        return response()->json(['data' => PageRevision::query()
            ->with('creator:id,name')
            ->where('store_id', $store->id)
            ->where('page_type', 'home')
            ->orderByDesc('version')
            ->limit(50)
            ->get(['id', 'store_id', 'page_type', 'version', 'created_by', 'created_at'])]);
    }

    public function restoreHomeRevision(Request $request, Store $store, PageRevision $revision): JsonResponse
    {
        $this->authorize('update', $store);
        abort_unless($revision->store_id === $store->id && $revision->page_type === 'home', 404);
        $content = $revision->content ?? [];
        $sections = $content['sections'] ?? [];
        $theme = $content['theme_config'] ?? [];

        return DB::transaction(function () use ($request, $store, $revision, $sections, $theme) {
            $store->update([
                'page_sections' => $sections,
                'theme_config' => $theme,
            ]);
            $this->writeHomeRevision($store, $request->user()->id);

            return response()->json(['data' => $store->fresh(), 'restored_version' => $revision->version]);
        });
    }

    protected function contentRules(): array
    {
        return [
            'content.schema_version' => ['required_with:content', 'integer', 'in:1'],
            'content.sections' => ['required_with:content', 'array', 'max:25'],
            'content.sections.*' => ['array:id,type,title,subtitle,badge,image_url,button_text,button_link,content,layout,overlay_opacity,enabled,items,steps,columns,responsive,product_source,category_id,product_ids,limit'],
            'content.sections.*.category_id' => ['nullable', 'integer'],
            'content.sections.*.product_ids' => ['nullable', 'array', 'max:24'],
            'content.sections.*.product_ids.*' => ['integer'],
            'content.sections.*.limit' => ['nullable', 'integer', 'between:1,24'],
            'content.sections.*.id' => ['required_with:content.sections', 'string', 'max:64'],
            'content.sections.*.type' => ['required_with:content.sections', Rule::in([
                'hero', 'featured_products', 'product_grid', 'category_grid', 'banner', 'rich_text', 'image',
                'production', 'gallery', 'trust_bar', 'reviews', 'newsletter', 'contact_card', 'faq', 'spacer', 'testimonials',
            ])],
            'content.sections.*.title' => ['nullable', 'string', 'max:255'],
            'content.sections.*.subtitle' => ['nullable', 'string', 'max:2000'],
            'content.sections.*.badge' => ['nullable', 'string', 'max:255'],
            'content.sections.*.image_url' => ['nullable', 'string', 'max:1000'],
            'content.sections.*.button_text' => ['nullable', 'string', 'max:100'],
            'content.sections.*.button_link' => ['nullable', 'string', 'max:255'],
            'content.sections.*.content' => ['nullable', 'string', 'max:10000'],
            'content.sections.*.layout' => ['nullable', 'string', 'max:64'],
            'content.sections.*.overlay_opacity' => ['nullable', 'numeric', 'between:0,1'],
            'content.sections.*.enabled' => ['required_with:content.sections', 'boolean'],
            'content.sections.*.columns' => ['nullable', 'integer', 'between:1,6'],
            'content.sections.*.responsive' => ['nullable', 'array:desktop,tablet,mobile'],
            'content.sections.*.responsive.*' => ['array:columns,padding,font_size'],
            'content.sections.*.responsive.*.columns' => ['nullable', 'integer', 'between:1,6'],
            'content.sections.*.responsive.*.padding' => ['nullable', 'integer', 'between:0,160'],
            'content.sections.*.responsive.*.font_size' => ['nullable', 'integer', 'between:8,100'],
            'content.sections.*.product_source' => ['nullable', Rule::in(['latest', 'featured', 'bestsellers', 'category', 'manual'])],
            'content.sections.*.items' => ['nullable', 'array', 'max:30'],
            'content.sections.*.steps' => ['nullable', 'array', 'max:20'],
        ];
    }

    protected function normalizeContent(array $content): array
    {
        $content['schema_version'] = 1;
        $content['sections'] = array_values($content['sections'] ?? []);

        return $content;
    }

    protected function assertPageSlug(string $slug): void
    {
        abort_if(in_array($slug, ['home', 'shop', 'product', 'category', 'cart', 'checkout', 'about', 'contact', 'terms', 'privacy'], true), 422, 'That page URL is reserved. Choose another slug.');
    }

    protected function assertPageBelongsToStore(Store $store, Page $page): void
    {
        abort_unless((int) $page->store_id === (int) $store->id && $page->page_type === Page::TYPE_CUSTOM, 404);
    }

    protected function writeRevision(Page $page, int $userId): PageRevision
    {
        $version = (int) PageRevision::query()->where('page_id', $page->id)->max('version') + 1;

        return PageRevision::query()->create([
            'tenant_id' => $page->tenant_id,
            'store_id' => $page->store_id,
            'page_id' => $page->id,
            'created_by' => $userId,
            'page_type' => $page->page_type,
            'version' => $version,
            'content' => $page->content,
        ]);
    }

    protected function writeHomeRevision(Store $store, int $userId): PageRevision
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
            'content' => [
                'sections' => $store->page_sections ?? [],
                'theme_config' => $store->theme_config ?? [],
            ],
        ]);
    }
}
