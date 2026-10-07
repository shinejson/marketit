<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PageTemplate;
use App\Models\TemplateCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminTemplateController extends Controller
{
    public function categories(): JsonResponse
    {
        return response()->json(['data' => TemplateCategory::query()
            ->withCount('templates')
            ->orderBy('position')
            ->orderBy('name')
            ->get()]);
    }

    public function storeCategory(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'slug' => ['nullable', 'string', 'max:100', 'alpha_dash:ascii', 'unique:template_categories,slug'],
            'description' => ['nullable', 'string', 'max:500'],
            'icon' => ['nullable', 'string', 'max:64'],
            'position' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        $data['slug'] = $data['slug'] ?? Str::slug($data['name']);
        $category = TemplateCategory::query()->create($data);

        return response()->json(['data' => $category], 201);
    }

    public function updateCategory(Request $request, TemplateCategory $category): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:80'],
            'slug' => ['sometimes', 'string', 'max:100', 'alpha_dash:ascii', Rule::unique('template_categories', 'slug')->ignore($category->id)],
            'description' => ['nullable', 'string', 'max:500'],
            'icon' => ['nullable', 'string', 'max:64'],
            'position' => ['sometimes', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        $category->update($data);

        return response()->json(['data' => $category->fresh()->loadCount('templates')]);
    }

    public function destroyCategory(TemplateCategory $category): JsonResponse
    {
        if ($category->templates()->exists()) {
            return response()->json([
                'error' => [
                    'code' => 'category_in_use',
                    'message' => 'Move or remove this category’s templates before deleting it.',
                    'fields' => null,
                ],
            ], 422);
        }

        $category->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    public function index(Request $request): JsonResponse
    {
        $query = PageTemplate::query()
            ->with('category:id,name,slug')
            ->withCount(['purchases', 'installations']);

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->integer('category_id'));
        }
        if ($request->filled('q')) {
            $term = '%'.$request->string('q').'%';
            $query->where(fn ($q) => $q->where('name', 'like', $term)->orWhere('description', 'like', $term));
        }

        $templates = $query->orderByDesc('updated_at')->paginate(min(100, max(1, $request->integer('per_page', 30))));

        return response()->json([
            'data' => $templates->items(),
            'meta' => [
                'page' => $templates->currentPage(),
                'per_page' => $templates->perPage(),
                'total' => $templates->total(),
                'last_page' => $templates->lastPage(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->templateRules());
        $data['slug'] = $data['slug'] ?? $this->uniqueSlug($data['name']);
        $data['created_by'] = $request->user()->id;
        $data['status'] = PageTemplate::STATUS_DRAFT;
        $data['currency'] = strtoupper($data['currency'] ?? config('markethub.currency', 'USD'));
        $data['definition'] = $this->normalizeDefinition($data['definition']);

        $template = PageTemplate::query()->create($data);

        return response()->json(['data' => $template->load('category:id,name,slug')], 201);
    }

    public function update(Request $request, PageTemplate $template): JsonResponse
    {
        $data = $request->validate($this->templateRules($template));
        unset($data['status']);
        if (isset($data['definition'])) {
            $data['definition'] = $this->normalizeDefinition($data['definition']);
        }
        if (isset($data['currency'])) {
            $data['currency'] = strtoupper($data['currency']);
        }
        if ($template->status === PageTemplate::STATUS_PUBLISHED) {
            // Published marketplace data remains immutable; edits are staged as a
            // draft until an administrator explicitly republishes the new version.
            $data['status'] = PageTemplate::STATUS_DRAFT;
            $data['published_at'] = null;
        }
        $template->update($data);

        return response()->json(['data' => $template->fresh()->load('category:id,name,slug')]);
    }

    public function publish(PageTemplate $template): JsonResponse
    {
        $template->update([
            'status' => PageTemplate::STATUS_PUBLISHED,
            'published_at' => now(),
        ]);

        return response()->json(['data' => $template->fresh()->load('category:id,name,slug')]);
    }

    public function destroy(PageTemplate $template): JsonResponse
    {
        if ($template->purchases()->exists() || $template->installations()->exists()) {
            return response()->json([
                'error' => [
                    'code' => 'template_in_use',
                    'message' => 'Templates with purchases or installations cannot be deleted. Unpublish the template instead.',
                    'fields' => null,
                ],
            ], 422);
        }

        $template->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    public function purchases(Request $request): JsonResponse
    {
        $query = \App\Models\TemplatePurchase::query()
            ->with(['template:id,name,slug,price,currency', 'tenant:id,name,slug'])
            ->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('payment_status', $request->string('status'));
        }
        if ($request->filled('q')) {
            $term = '%'.$request->string('q').'%';
            $query->where(function ($q) use ($term) {
                $q->whereHas('template', fn ($template) => $template->where('name', 'like', $term))
                    ->orWhereHas('tenant', fn ($tenant) => $tenant->where('name', 'like', $term));
            });
        }

        $purchases = $query->paginate(min(100, max(1, $request->integer('per_page', 30))));

        return response()->json([
            'data' => $purchases->items(),
            'meta' => [
                'page' => $purchases->currentPage(),
                'per_page' => $purchases->perPage(),
                'total' => $purchases->total(),
                'last_page' => $purchases->lastPage(),
            ],
        ]);
    }

    protected function templateRules(?PageTemplate $template = null): array
    {
        return [
            'category_id' => ['nullable', 'integer', 'exists:template_categories,id'],
            'name' => [$template ? 'sometimes' : 'required', 'string', 'max:120'],
            'slug' => [$template ? 'sometimes' : 'nullable', 'string', 'max:120', 'alpha_dash:ascii', Rule::unique('page_templates', 'slug')->ignore($template?->id)],
            'description' => ['nullable', 'string', 'max:1500'],
            'thumbnail' => ['nullable', 'string', 'max:1000'],
            'designer_name' => ['nullable', 'string', 'max:120'],
            'price' => [$template ? 'sometimes' : 'required', 'numeric', 'min:0', 'max:10000000'],
            'currency' => ['nullable', 'string', 'size:3'],
            'version' => ['nullable', 'string', 'max:32'],
            'is_featured' => ['sometimes', 'boolean'],
            'definition' => [$template ? 'sometimes' : 'required', 'array'],
            'definition.schema_version' => ['required_with:definition', 'integer', 'in:1'],
            'definition.theme' => ['required_with:definition', 'array:primary_color,accent_color,surface_color,font,hero_style,logo_image,hero_image,banner_image'],
            'definition.theme.primary_color' => ['required_with:definition.theme', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'definition.theme.accent_color' => ['required_with:definition.theme', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'definition.theme.surface_color' => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'definition.theme.font' => ['nullable', Rule::in(['modern', 'editorial', 'friendly', 'classic'])],
            'definition.theme.hero_style' => ['nullable', Rule::in(['split', 'centered', 'minimal', 'full_banner'])],
            'definition.theme.logo_image' => ['nullable', 'string', 'max:1000'],
            'definition.theme.hero_image' => ['nullable', 'string', 'max:1000'],
            'definition.theme.banner_image' => ['nullable', 'string', 'max:1000'],
            'definition.pages' => ['required_with:definition', 'array:home,about,contact,custom'],
            'definition.pages.home' => ['required_with:definition', 'array', 'max:25'],
            'definition.pages.home.*' => ['array:id,type,title,subtitle,badge,image_url,button_text,button_link,content,layout,overlay_opacity,enabled,items,steps,columns,responsive,product_source,category_id,product_ids,limit'],
            'definition.pages.home.*.category_id' => ['nullable', 'integer'],
            'definition.pages.home.*.product_ids' => ['nullable', 'array', 'max:24'],
            'definition.pages.home.*.product_ids.*' => ['integer'],
            'definition.pages.home.*.limit' => ['nullable', 'integer', 'between:1,24'],
            'definition.pages.home.*.responsive.*.columns' => ['nullable', 'integer', 'between:1,6'],
            'definition.pages.home.*.responsive.*.padding' => ['nullable', 'integer', 'between:0,160'],
            'definition.pages.home.*.responsive.*.font_size' => ['nullable', 'integer', 'between:8,100'],
            'definition.pages.home.*.product_source' => ['nullable', Rule::in(['latest', 'featured', 'bestsellers', 'category', 'manual'])],
            'definition.pages.home.*.id' => ['required_with:definition.pages.home', 'string', 'max:64'],
            'definition.pages.home.*.type' => ['required_with:definition.pages.home', Rule::in($this->sectionTypes())],
            'definition.pages.home.*.title' => ['nullable', 'string', 'max:255'],
            'definition.pages.home.*.subtitle' => ['nullable', 'string', 'max:2000'],
            'definition.pages.home.*.badge' => ['nullable', 'string', 'max:255'],
            'definition.pages.home.*.image_url' => ['nullable', 'string', 'max:1000'],
            'definition.pages.home.*.button_text' => ['nullable', 'string', 'max:100'],
            'definition.pages.home.*.button_link' => ['nullable', 'string', 'max:255'],
            'definition.pages.home.*.content' => ['nullable', 'string', 'max:10000'],
            'definition.pages.home.*.layout' => ['nullable', 'string', 'max:64'],
            'definition.pages.home.*.overlay_opacity' => ['nullable', 'numeric', 'between:0,1'],
            'definition.pages.home.*.enabled' => ['required_with:definition.pages.home', 'boolean'],
            'definition.pages.home.*.columns' => ['nullable', 'integer', 'between:1,6'],
            'definition.pages.home.*.responsive' => ['nullable', 'array'],
            'definition.pages.home.*.items' => ['nullable', 'array', 'max:30'],
            'definition.pages.home.*.steps' => ['nullable', 'array', 'max:20'],
            'definition.pages.about' => ['sometimes', 'array'],
            'definition.pages.contact' => ['sometimes', 'array'],
            'definition.pages.custom' => ['sometimes', 'array', 'max:10'],
        ];
    }

    protected function sectionTypes(): array
    {
        return ['hero', 'featured_products', 'product_grid', 'category_grid', 'banner', 'rich_text', 'image', 'production', 'gallery', 'trust_bar', 'reviews', 'newsletter', 'contact_card', 'faq', 'spacer', 'testimonials'];
    }

    protected function normalizeDefinition(array $definition): array
    {
        $definition['schema_version'] = 1;
        $definition['theme'] = array_merge([
            'primary_color' => '#1f4b3a',
            'accent_color' => '#c45c26',
            'surface_color' => '#ffffff',
            'font' => 'modern',
            'hero_style' => 'split',
        ], $definition['theme'] ?? []);
        $definition['pages'] = array_merge([
            'home' => [],
            'about' => [],
            'contact' => [],
            'custom' => [],
        ], $definition['pages'] ?? []);

        return $definition;
    }

    protected function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'template';
        $slug = $base;
        $number = 2;
        while (PageTemplate::query()->where('slug', $slug)->exists()) {
            $slug = $base.'-'.$number++;
        }

        return $slug;
    }
}
