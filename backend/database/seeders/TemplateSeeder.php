<?php

namespace Database\Seeders;

use App\Models\PageTemplate;
use App\Models\TemplateCategory;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class TemplateSeeder extends Seeder
{
    public function run(): void
    {
        $categories = [];
        foreach ([
            ['name' => 'Fashion', 'slug' => 'fashion', 'description' => 'Editorial layouts for clothing, accessories and independent labels.', 'icon' => 'hanger'],
            ['name' => 'Electronics', 'slug' => 'electronics', 'description' => 'Product-first layouts for gadgets, devices and technology shops.', 'icon' => 'cpu'],
            ['name' => 'Food & grocery', 'slug' => 'food-grocery', 'description' => 'Fresh, local and prepared-food storefronts.', 'icon' => 'basket'],
            ['name' => 'Home & living', 'slug' => 'home-living', 'description' => 'Warm, considered layouts for homewares and furniture.', 'icon' => 'house'],
            ['name' => 'General', 'slug' => 'general', 'description' => 'Versatile starting points for any independent store.', 'icon' => 'sparkles'],
        ] as $position => $category) {
            $categories[$category['slug']] = TemplateCategory::query()->updateOrCreate(
                ['slug' => $category['slug']],
                $category + ['position' => $position, 'is_active' => true],
            );
        }

        $adminId = User::query()->whereHas('roles', fn ($q) => $q->where('role', 'super_admin'))->value('id');
        $currency = strtoupper((string) config('markethub.currency', 'USD'));

        $templates = [
            [
                'name' => 'Market Starter', 'slug' => 'market-starter', 'category' => 'general',
                'description' => 'A clean, flexible storefront with an editorial hero, product collection and trust bar.',
                'thumbnail' => 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=80',
                'price' => 0, 'featured' => true, 'rating_avg' => 4.9, 'rating_count' => 38,
                'definition' => $this->definition(
                    ['#25483c', '#c6633a', '#fbfaf7', 'modern'],
                    [
                        $this->section('hero', 'Thoughtfully chosen, made for living', 'Discover independent goods selected with care.', 'Shop the collection', '/images/market-shopper.jpg', 'split'),
                        $this->section('trust_bar', 'Shop with confidence', 'Secure checkout · Reliable dispatch · Simple returns'),
                        $this->section('featured_products', 'Your next favourite', 'Discover the latest arrivals and customer favourites.'),
                        $this->section('newsletter', 'A little note from us', 'New collections, thoughtful stories and occasional offers.', 'Join the list'),
                    ],
                ),
            ],
            [
                'name' => 'Fashion Story', 'slug' => 'fashion-story', 'category' => 'fashion',
                'description' => 'A confident, editorial theme for fashion boutiques, makers and contemporary labels.',
                'thumbnail' => 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80',
                'price' => 50, 'featured' => true, 'rating_avg' => 4.8, 'rating_count' => 24,
                'definition' => $this->definition(
                    ['#1e2220', '#b86b4d', '#f7f4ef', 'editorial'],
                    [
                        $this->section('hero', 'Wear what feels like you', 'Small collections, thoughtful details and pieces made to go places.', 'Explore the edit', 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80', 'split'),
                        $this->section('featured_products', 'The new season edit', 'Easy pieces. Distinctive details. Made to be worn on repeat.'),
                        $this->section('banner', 'Made with intention', 'Meet the independent makers behind each collection.', 'Read our story', 'https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=1400&q=80', 'full'),
                        $this->section('trust_bar', 'Good things, thoughtfully made', 'Independent design · Secure checkout · Tracked delivery'),
                    ],
                    aboutTitle: 'A point of view, stitched into every piece',
                ),
            ],
            [
                'name' => 'Gadget Grid', 'slug' => 'gadget-grid', 'category' => 'electronics',
                'description' => 'A crisp, specification-friendly storefront that puts your technology catalogue first.',
                'thumbnail' => 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=900&q=80',
                'price' => 70, 'featured' => false, 'rating_avg' => 4.7, 'rating_count' => 17,
                'definition' => $this->definition(
                    ['#152a3a', '#1d8294', '#f5f8fa', 'modern'],
                    [
                        $this->section('hero', 'Technology that fits your day', 'Find considered devices, useful accessories and dependable essentials.', 'Shop devices', 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1200&q=80', 'split'),
                        $this->section('featured_products', 'Popular right now', 'Best-loved technology from our current catalogue.'),
                        $this->section('trust_bar', 'Buy with confidence', 'Clear product details · Secure payment · Helpful support'),
                        $this->section('contact_card', 'Need a recommendation?', 'Our team can help you find the right device for your needs.'),
                    ],
                    aboutTitle: 'Useful technology, selected by people who care',
                ),
            ],
            [
                'name' => 'Fresh Table', 'slug' => 'fresh-table', 'category' => 'food-grocery',
                'description' => 'A warm, ingredient-led layout for grocers, food makers and neighbourhood markets.',
                'thumbnail' => 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80',
                'price' => 60, 'featured' => false, 'rating_avg' => 4.9, 'rating_count' => 12,
                'definition' => $this->definition(
                    ['#294b32', '#ba733f', '#faf8f1', 'friendly'],
                    [
                        $this->section('hero', 'Good food, close to home', 'Fresh picks and pantry staples from people who know their produce.', 'Shop fresh', 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80', 'split'),
                        $this->section('featured_products', 'Picked for this week', 'Seasonal favourites and everyday essentials.'),
                        $this->section('rich_text', 'From our neighbourhood to your table', 'We work with local growers and makers to bring good things to your kitchen.'),
                        $this->section('contact_card', 'Ask about today’s harvest', 'Have a question about availability or delivery? We are happy to help.'),
                    ],
                    aboutTitle: 'Good food begins with good people',
                ),
            ],
        ];

        foreach ($templates as $row) {
            $definition = $row['definition'];
            PageTemplate::query()->updateOrCreate(
                ['slug' => $row['slug']],
                [
                    'category_id' => $categories[$row['category']]->id,
                    'created_by' => $adminId,
                    'name' => $row['name'],
                    'description' => $row['description'],
                    'thumbnail' => $row['thumbnail'],
                    'designer_name' => 'MarketHub Studio',
                    'price' => $row['price'],
                    'currency' => $currency,
                    'status' => PageTemplate::STATUS_PUBLISHED,
                    'version' => '1.0.0',
                    'definition' => $definition,
                    'is_featured' => $row['featured'],
                    'rating_avg' => $row['rating_avg'],
                    'rating_count' => $row['rating_count'],
                    'published_at' => now()->subDays(14),
                ],
            );
        }
    }

    protected function definition(array $palette, array $home, string $aboutTitle = 'Our story, told with care'): array
    {
        [$primary, $accent, $surface, $font] = $palette;

        return [
            'schema_version' => 1,
            'theme' => [
                'primary_color' => $primary,
                'accent_color' => $accent,
                'surface_color' => $surface,
                'font' => $font,
                'hero_style' => 'split',
            ],
            'pages' => [
                'home' => $home,
                'about' => [
                    'enabled' => true,
                    'nav_label' => 'Our story',
                    'hero_title' => $aboutTitle,
                    'hero_subtitle' => 'A little about the people, ideas and care behind this store.',
                    'story_title' => 'Why we started',
                    'story_body' => 'We believe the things we bring into our everyday lives should be useful, thoughtfully made and a pleasure to keep.',
                    'craft_title' => 'Made with care',
                    'craft_body' => 'We work with people who care about the details, the materials and the way each piece is made.',
                    'craft_steps' => [
                        ['title' => 'Thoughtful sourcing', 'description' => 'We choose materials and products with their origins in mind.'],
                        ['title' => 'Careful making', 'description' => 'Each detail is checked before a product makes its way to you.'],
                        ['title' => 'Helpful support', 'description' => 'Real people are here to help before and after your order.'],
                    ],
                ],
                'contact' => [
                    'enabled' => true,
                    'nav_label' => 'Contact',
                    'title' => 'We would love to hear from you',
                    'subtitle' => 'Questions about an item, an order or a custom request? Get in touch.',
                    'show_form' => true,
                    'hours' => 'Monday – Friday, 9am – 5pm',
                ],
                'custom' => [],
            ],
        ];
    }

    protected function section(string $type, string $title, string $subtitle = '', ?string $button = null, ?string $image = null, ?string $layout = null): array
    {
        $section = [
            'id' => Str::lower(Str::random(10)),
            'type' => $type,
            'title' => $title,
            'subtitle' => $subtitle,
            'enabled' => true,
        ];

        if ($type === 'hero') {
            $section += [
                'badge' => 'A NOTE FROM OUR STORE',
                'button_text' => $button ?? 'Explore the store',
                'button_link' => '#catalogue',
                'image_url' => $image,
                'layout' => $layout ?? 'split',
            ];
        } elseif ($type === 'banner') {
            $section += [
                'badge' => 'A LITTLE SOMETHING SPECIAL',
                'button_text' => $button ?? 'Read more',
                'button_link' => '?page=about',
                'image_url' => $image,
                'layout' => $layout ?? 'full',
            ];
        } elseif ($button) {
            $section['button_text'] = $button;
        }

        return $section;
    }
}
