<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdCampaign;
use App\Models\MarketingCampaign;
use App\Models\SocialAccount;
use App\Models\SocialPost;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Platform-level marketing hub: connected social accounts, organic posts
 * and paid marketing campaigns managed by the super-admin team.
 */
class AdminMarketingController extends Controller
{
    public function overview(): JsonResponse
    {
        $campaigns = MarketingCampaign::query()->get();

        return response()->json(['data' => [
            'accounts' => [
                'connected' => SocialAccount::query()->where('status', SocialAccount::STATUS_CONNECTED)->count(),
                'total_followers' => (int) SocialAccount::query()->where('status', SocialAccount::STATUS_CONNECTED)->sum('followers'),
            ],
            'campaigns' => [
                'active' => $campaigns->where('status', MarketingCampaign::STATUS_ACTIVE)->count(),
                'spend' => round((float) $campaigns->sum('spend'), 2),
                'impressions' => (int) $campaigns->sum('impressions'),
                'clicks' => (int) $campaigns->sum('clicks'),
                'conversions' => (int) $campaigns->sum('conversions'),
            ],
            'posts' => [
                'published' => SocialPost::query()->where('status', SocialPost::STATUS_PUBLISHED)->count(),
                'scheduled' => SocialPost::query()->where('status', SocialPost::STATUS_SCHEDULED)->count(),
            ],
            'sponsored' => [
                'campaigns' => AdCampaign::withoutGlobalScopes()->count(),
                'active' => AdCampaign::withoutGlobalScopes()->where('status', 'active')->count(),
                'spend' => round((float) AdCampaign::withoutGlobalScopes()->sum('spent_total'), 2),
            ],
        ]]);
    }

    // ------------------------------------------------------------ accounts

    public function accounts(): JsonResponse
    {
        $existing = SocialAccount::query()->get()->keyBy('platform');

        // Always return a row per supported platform so the UI can render
        // connect cards for platforms that were never connected.
        $data = collect(SocialAccount::PLATFORMS)->map(function (string $platform) use ($existing) {
            return $existing[$platform] ?? new SocialAccount([
                'platform' => $platform,
                'status' => SocialAccount::STATUS_DISCONNECTED,
                'followers' => 0,
            ]);
        })->values();

        return response()->json(['data' => $data]);
    }

    public function connectAccount(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'platform' => ['required', Rule::in(SocialAccount::PLATFORMS)],
            'handle' => ['required', 'string', 'max:120'],
            'display_name' => ['nullable', 'string', 'max:160'],
        ]);

        $account = SocialAccount::query()->updateOrCreate(
            ['platform' => $payload['platform']],
            [
                'handle' => ltrim($payload['handle'], '@'),
                'display_name' => $payload['display_name'] ?? null,
                'status' => SocialAccount::STATUS_CONNECTED,
                'connected_at' => now(),
                'connected_by' => $request->user()?->id,
            ],
        );

        return response()->json(['data' => $account->fresh()], 201);
    }

    public function disconnectAccount(SocialAccount $account): JsonResponse
    {
        $account->update(['status' => SocialAccount::STATUS_DISCONNECTED, 'connected_at' => null]);

        return response()->json(['data' => $account->fresh()]);
    }

    // ----------------------------------------------------------- campaigns

    public function campaigns(): JsonResponse
    {
        return response()->json([
            'data' => MarketingCampaign::query()->withCount('posts')->orderByDesc('id')->limit(100)->get(),
        ]);
    }

    public function storeCampaign(Request $request): JsonResponse
    {
        $payload = $this->validateCampaign($request);
        $payload['created_by'] = $request->user()?->id;
        $payload['status'] = $payload['status'] ?? MarketingCampaign::STATUS_DRAFT;

        return response()->json(['data' => MarketingCampaign::query()->create($payload)], 201);
    }

    public function updateCampaign(Request $request, MarketingCampaign $campaign): JsonResponse
    {
        $campaign->update($this->validateCampaign($request, partial: true));

        return response()->json(['data' => $campaign->fresh()->loadCount('posts')]);
    }

    public function destroyCampaign(MarketingCampaign $campaign): JsonResponse
    {
        $campaign->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    // --------------------------------------------------------------- posts

    public function posts(): JsonResponse
    {
        return response()->json([
            'data' => SocialPost::query()->with('campaign:id,name')->orderByDesc('id')->limit(100)->get(),
        ]);
    }

    public function storePost(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
            'link_url' => ['nullable', 'url', 'max:500'],
            'channels' => ['required', 'array', 'min:1'],
            'channels.*' => [Rule::in(SocialAccount::PLATFORMS)],
            'campaign_id' => ['nullable', 'integer', 'exists:marketing_campaigns,id'],
            'status' => ['nullable', Rule::in([SocialPost::STATUS_DRAFT, SocialPost::STATUS_SCHEDULED, SocialPost::STATUS_PUBLISHED])],
            'scheduled_for' => ['nullable', 'date'],
        ]);

        $payload['created_by'] = $request->user()?->id;
        $payload['status'] = $payload['status'] ?? SocialPost::STATUS_DRAFT;
        if ($payload['status'] === SocialPost::STATUS_PUBLISHED) {
            $payload['published_at'] = now();
        }

        return response()->json(['data' => SocialPost::query()->create($payload)->load('campaign:id,name')], 201);
    }

    public function updatePost(Request $request, SocialPost $post): JsonResponse
    {
        $payload = $request->validate([
            'body' => ['sometimes', 'string', 'max:2000'],
            'link_url' => ['nullable', 'url', 'max:500'],
            'channels' => ['sometimes', 'array', 'min:1'],
            'channels.*' => [Rule::in(SocialAccount::PLATFORMS)],
            'campaign_id' => ['nullable', 'integer', 'exists:marketing_campaigns,id'],
            'status' => ['sometimes', Rule::in([SocialPost::STATUS_DRAFT, SocialPost::STATUS_SCHEDULED, SocialPost::STATUS_PUBLISHED])],
            'scheduled_for' => ['nullable', 'date'],
        ]);

        if (($payload['status'] ?? null) === SocialPost::STATUS_PUBLISHED && ! $post->published_at) {
            $payload['published_at'] = now();
        }

        $post->update($payload);

        return response()->json(['data' => $post->fresh()->load('campaign:id,name')]);
    }

    public function publishPost(SocialPost $post): JsonResponse
    {
        $post->update(['status' => SocialPost::STATUS_PUBLISHED, 'published_at' => now()]);

        return response()->json(['data' => $post->fresh()->load('campaign:id,name')]);
    }

    public function destroyPost(SocialPost $post): JsonResponse
    {
        $post->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    // ------------------------------------------------------------- helpers

    private function validateCampaign(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'name' => [$required, 'string', 'max:160'],
            'objective' => [$required, Rule::in(MarketingCampaign::OBJECTIVES)],
            'status' => ['nullable', Rule::in([
                MarketingCampaign::STATUS_DRAFT,
                MarketingCampaign::STATUS_ACTIVE,
                MarketingCampaign::STATUS_PAUSED,
                MarketingCampaign::STATUS_COMPLETED,
            ])],
            'channels' => [$required, 'array', 'min:1'],
            'channels.*' => [Rule::in(SocialAccount::PLATFORMS)],
            'daily_budget' => ['nullable', 'numeric', 'min:0'],
            'total_budget' => ['nullable', 'numeric', 'min:0'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
        ]);
    }
}
