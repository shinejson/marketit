<?php

namespace Database\Seeders;

use App\Models\MarketingCampaign;
use App\Models\SocialAccount;
use App\Models\SocialPost;
use App\Models\User;
use Illuminate\Database\Seeder;

class MarketingSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::query()->where('email', 'admin@markethub.test')->first();

        // ------------------------------------------------- social accounts
        $accounts = [
            ['platform' => 'facebook', 'handle' => 'markethubgh', 'display_name' => 'MarketHub Ghana', 'followers' => 28400, 'connected' => true],
            ['platform' => 'instagram', 'handle' => 'markethub.gh', 'display_name' => 'MarketHub', 'followers' => 41200, 'connected' => true],
            ['platform' => 'x', 'handle' => 'markethub_gh', 'display_name' => 'MarketHub', 'followers' => 12800, 'connected' => true],
            ['platform' => 'linkedin', 'handle' => 'markethub-africa', 'display_name' => 'MarketHub Africa', 'followers' => 5300, 'connected' => true],
            ['platform' => 'tiktok', 'handle' => 'markethubgh', 'display_name' => 'MarketHub', 'followers' => 19600, 'connected' => false],
            ['platform' => 'youtube', 'handle' => 'MarketHubAfrica', 'display_name' => 'MarketHub Africa', 'followers' => 2100, 'connected' => false],
        ];

        foreach ($accounts as $row) {
            SocialAccount::query()->updateOrCreate(['platform' => $row['platform']], [
                'handle' => $row['handle'],
                'display_name' => $row['display_name'],
                'followers' => $row['followers'],
                'status' => $row['connected'] ? SocialAccount::STATUS_CONNECTED : SocialAccount::STATUS_DISCONNECTED,
                'connected_at' => $row['connected'] ? now()->subDays(rand(20, 120)) : null,
                'connected_by' => $row['connected'] ? $admin?->id : null,
            ]);
        }

        // ----------------------------------------------- platform campaigns
        $campaigns = [
            [
                'name' => 'Festive Season Mega Sale',
                'objective' => 'conversions',
                'status' => MarketingCampaign::STATUS_ACTIVE,
                'channels' => ['facebook', 'instagram', 'x'],
                'daily_budget' => 120, 'total_budget' => 3600, 'spend' => 1485.50,
                'impressions' => 412800, 'clicks' => 9640, 'conversions' => 418,
                'starts_at' => now()->subDays(12)->toDateString(), 'ends_at' => now()->addDays(18)->toDateString(),
            ],
            [
                'name' => 'New Seller Onboarding Drive',
                'objective' => 'seller_acquisition',
                'status' => MarketingCampaign::STATUS_ACTIVE,
                'channels' => ['linkedin', 'facebook'],
                'daily_budget' => 60, 'total_budget' => 1800, 'spend' => 732.25,
                'impressions' => 98500, 'clicks' => 2210, 'conversions' => 64,
                'starts_at' => now()->subDays(14)->toDateString(), 'ends_at' => now()->addDays(16)->toDateString(),
            ],
            [
                'name' => 'Handmade & Local Spotlight',
                'objective' => 'awareness',
                'status' => MarketingCampaign::STATUS_PAUSED,
                'channels' => ['instagram', 'tiktok'],
                'daily_budget' => 40, 'total_budget' => 1200, 'spend' => 396.00,
                'impressions' => 154200, 'clicks' => 3110, 'conversions' => 92,
                'starts_at' => now()->subDays(30)->toDateString(), 'ends_at' => now()->addDays(30)->toDateString(),
            ],
            [
                'name' => 'Back to School Tech Deals',
                'objective' => 'traffic',
                'status' => MarketingCampaign::STATUS_COMPLETED,
                'channels' => ['facebook', 'instagram', 'x', 'linkedin'],
                'daily_budget' => 90, 'total_budget' => 2700, 'spend' => 2700.00,
                'impressions' => 689400, 'clicks' => 15320, 'conversions' => 711,
                'starts_at' => now()->subDays(75)->toDateString(), 'ends_at' => now()->subDays(45)->toDateString(),
            ],
        ];

        $created = [];
        foreach ($campaigns as $row) {
            $created[] = MarketingCampaign::query()->create($row + ['created_by' => $admin?->id]);
        }

        // --------------------------------------------------------- posts
        $posts = [
            [
                'campaign_id' => $created[0]->id,
                'body' => 'The Festive Mega Sale is LIVE! 🎉 Up to 40% off electronics, fashion and home — from verified sellers across Ghana. Free delivery in Accra on orders over GH₵200.',
                'link_url' => 'https://markethub.test/products?sale=festive',
                'channels' => ['facebook', 'instagram', 'x'],
                'status' => SocialPost::STATUS_PUBLISHED,
                'published_at' => now()->subDays(2),
                'impressions' => 48200, 'clicks' => 1890, 'engagements' => 3260,
            ],
            [
                'campaign_id' => $created[1]->id,
                'body' => 'Turn your shop into an online store in under 10 minutes. Join 500+ sellers already growing with MarketHub — zero setup fees this month.',
                'link_url' => 'https://markethub.test/sell',
                'channels' => ['linkedin', 'facebook'],
                'status' => SocialPost::STATUS_PUBLISHED,
                'published_at' => now()->subDays(5),
                'impressions' => 21400, 'clicks' => 760, 'engagements' => 980,
            ],
            [
                'campaign_id' => null,
                'body' => 'Meet the maker: SheaGold’s body butter is whipped in small batches in Tamale and ships nationwide. ✨ #ShopLocal #MadeInGhana',
                'link_url' => 'https://markethub.test/stores/sheagold',
                'channels' => ['instagram'],
                'status' => SocialPost::STATUS_SCHEDULED,
                'scheduled_for' => now()->addDays(2)->setTime(9, 0),
            ],
            [
                'campaign_id' => $created[0]->id,
                'body' => 'Flash deal alert ⚡ Pulse Wireless Headphones at GH₵89 for the next 48 hours only. While stock lasts!',
                'link_url' => 'https://markethub.test/products/pulse-wireless-headphones',
                'channels' => ['x', 'facebook'],
                'status' => SocialPost::STATUS_SCHEDULED,
                'scheduled_for' => now()->addDay()->setTime(12, 30),
            ],
            [
                'campaign_id' => null,
                'body' => 'Draft: Year-in-review — celebrating our sellers, 120k orders delivered, and the communities behind them. (Add stats + video before publishing.)',
                'channels' => ['youtube', 'linkedin'],
                'status' => SocialPost::STATUS_DRAFT,
            ],
        ];

        foreach ($posts as $row) {
            SocialPost::query()->create($row + ['created_by' => $admin?->id]);
        }
    }
}
