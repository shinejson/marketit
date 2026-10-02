<?php

namespace App\Support;

/**
 * Catalog presets.
 *
 * A tenant can sell a dress, a crate of mangoes, a laptop, a download or a
 * consulting hour from the same console. Rather than hard-coding one form,
 * every vertical declares:
 *
 *  - sensible defaults (type, selling unit, shipping/stock behaviour)
 *  - the variant options buyers expect (Size/Colour, Weight, Storage…)
 *  - a spec sheet schema rendered dynamically by the Angular product editor
 *
 * Both the API (validation hints) and the UI read from this single source of
 * truth, so adding a vertical is a data change — not a schema change.
 */
class ProductCatalog
{
    public const TYPES = ['physical', 'digital', 'service'];

    public const CONDITIONS = ['new', 'used', 'refurbished'];

    public const STORAGE_REQUIREMENTS = ['ambient', 'chilled', 'frozen', 'dry', 'fragile'];

    /** Selling units grouped so the UI can show them sensibly. */
    public const UNITS = [
        ['value' => 'piece', 'label' => 'Piece / item', 'group' => 'Count'],
        ['value' => 'pair', 'label' => 'Pair', 'group' => 'Count'],
        ['value' => 'pack', 'label' => 'Pack', 'group' => 'Count'],
        ['value' => 'box', 'label' => 'Box / carton', 'group' => 'Count'],
        ['value' => 'dozen', 'label' => 'Dozen', 'group' => 'Count'],
        ['value' => 'bunch', 'label' => 'Bunch', 'group' => 'Count'],
        ['value' => 'crate', 'label' => 'Crate', 'group' => 'Count'],
        ['value' => 'kg', 'label' => 'Kilogram (kg)', 'group' => 'Weight'],
        ['value' => 'g', 'label' => 'Gram (g)', 'group' => 'Weight'],
        ['value' => 'lb', 'label' => 'Pound (lb)', 'group' => 'Weight'],
        ['value' => 'litre', 'label' => 'Litre (L)', 'group' => 'Volume'],
        ['value' => 'ml', 'label' => 'Millilitre (ml)', 'group' => 'Volume'],
        ['value' => 'metre', 'label' => 'Metre (m)', 'group' => 'Length'],
        ['value' => 'yard', 'label' => 'Yard', 'group' => 'Length'],
        ['value' => 'hour', 'label' => 'Hour', 'group' => 'Time'],
        ['value' => 'session', 'label' => 'Session', 'group' => 'Time'],
        ['value' => 'licence', 'label' => 'Licence', 'group' => 'Digital'],
        ['value' => 'download', 'label' => 'Download', 'group' => 'Digital'],
    ];

    /**
     * @return array<int, array<string, mixed>>
     */
    public static function presets(): array
    {
        return [
            [
                'key' => 'fashion',
                'label' => 'Fashion & apparel',
                'icon' => 'shirt',
                'example' => 'Dresses, shoes, bags, tailoring',
                'defaults' => [
                    'product_type' => 'physical',
                    'unit' => 'piece',
                    'requires_shipping' => true,
                    'track_inventory' => true,
                    'is_perishable' => false,
                    'condition' => 'new',
                    'weight_unit' => 'kg',
                ],
                'options' => [
                    ['name' => 'Size', 'values' => ['XS', 'S', 'M', 'L', 'XL', 'XXL']],
                    ['name' => 'Colour', 'values' => ['Black', 'White', 'Indigo', 'Terracotta', 'Emerald']],
                ],
                'specs' => [
                    ['key' => 'material', 'label' => 'Material / fabric', 'type' => 'text', 'placeholder' => 'e.g. 100% cotton poplin'],
                    ['key' => 'fit', 'label' => 'Fit', 'type' => 'select', 'options' => ['Slim', 'Regular', 'Relaxed', 'Oversized']],
                    ['key' => 'gender', 'label' => 'Audience', 'type' => 'select', 'options' => ['Women', 'Men', 'Unisex', 'Kids']],
                    ['key' => 'care', 'label' => 'Care instructions', 'type' => 'text', 'placeholder' => 'Machine wash cold, line dry'],
                    ['key' => 'season', 'label' => 'Season', 'type' => 'select', 'options' => ['All season', 'Spring/Summer', 'Autumn/Winter']],
                ],
                'tags' => ['new-in', 'bestseller', 'handmade', 'limited-edition'],
            ],
            [
                'key' => 'grocery',
                'label' => 'Fresh produce & grocery',
                'icon' => 'apple',
                'example' => 'Fruit, vegetables, meat, bakery',
                'defaults' => [
                    'product_type' => 'physical',
                    'unit' => 'kg',
                    'requires_shipping' => true,
                    'track_inventory' => true,
                    'is_perishable' => true,
                    'shelf_life_days' => 7,
                    'storage_requirement' => 'chilled',
                    'weight_unit' => 'kg',
                ],
                'options' => [
                    ['name' => 'Pack size', 'values' => ['500 g', '1 kg', '2 kg', '5 kg crate']],
                    ['name' => 'Grade', 'values' => ['Grade A', 'Grade B', 'Export']],
                ],
                'specs' => [
                    ['key' => 'variety', 'label' => 'Variety / cultivar', 'type' => 'text', 'placeholder' => 'e.g. Keitt mango'],
                    ['key' => 'grade', 'label' => 'Quality grade', 'type' => 'select', 'options' => ['Grade A', 'Grade B', 'Export', 'Organic']],
                    ['key' => 'harvest_date', 'label' => 'Harvest / packed date', 'type' => 'date'],
                    ['key' => 'farm', 'label' => 'Farm / supplier', 'type' => 'text'],
                    ['key' => 'allergens', 'label' => 'Allergens', 'type' => 'text', 'placeholder' => 'None / contains nuts'],
                    ['key' => 'certification', 'label' => 'Certification', 'type' => 'select', 'options' => ['None', 'Organic', 'Fairtrade', 'GlobalG.A.P.', 'HACCP']],
                ],
                'tags' => ['fresh', 'organic', 'locally-grown', 'in-season'],
            ],
            [
                'key' => 'electronics',
                'label' => 'Electronics & gadgets',
                'icon' => 'cpu',
                'example' => 'Phones, audio, computing, accessories',
                'defaults' => [
                    'product_type' => 'physical',
                    'unit' => 'piece',
                    'requires_shipping' => true,
                    'track_inventory' => true,
                    'is_perishable' => false,
                    'condition' => 'new',
                    'warranty_months' => 12,
                    'weight_unit' => 'kg',
                ],
                'options' => [
                    ['name' => 'Storage', 'values' => ['64 GB', '128 GB', '256 GB', '512 GB', '1 TB']],
                    ['name' => 'Colour', 'values' => ['Midnight', 'Silver', 'Graphite', 'Blue']],
                ],
                'specs' => [
                    ['key' => 'model_number', 'label' => 'Model number', 'type' => 'text'],
                    ['key' => 'power', 'label' => 'Power / battery', 'type' => 'text', 'placeholder' => 'e.g. 5000 mAh, 65 W USB-C'],
                    ['key' => 'connectivity', 'label' => 'Connectivity', 'type' => 'text', 'placeholder' => 'Bluetooth 5.3, Wi-Fi 6'],
                    ['key' => 'in_the_box', 'label' => 'In the box', 'type' => 'text', 'placeholder' => 'Device, cable, manual'],
                    ['key' => 'voltage', 'label' => 'Voltage', 'type' => 'select', 'options' => ['110 V', '220–240 V', 'Dual voltage', 'Battery only']],
                ],
                'tags' => ['warranty', 'fast-charging', 'wireless', 'refurbished'],
            ],
            [
                'key' => 'beauty',
                'label' => 'Beauty & personal care',
                'icon' => 'sparkle',
                'example' => 'Skincare, haircare, fragrance',
                'defaults' => [
                    'product_type' => 'physical',
                    'unit' => 'ml',
                    'requires_shipping' => true,
                    'track_inventory' => true,
                    'is_perishable' => true,
                    'shelf_life_days' => 365,
                    'storage_requirement' => 'ambient',
                    'weight_unit' => 'kg',
                ],
                'options' => [
                    ['name' => 'Size', 'values' => ['50 ml', '100 ml', '200 ml', '500 ml']],
                    ['name' => 'Scent', 'values' => ['Unscented', 'Shea', 'Citrus', 'Lavender']],
                ],
                'specs' => [
                    ['key' => 'skin_type', 'label' => 'Suited to', 'type' => 'select', 'options' => ['All skin types', 'Dry', 'Oily', 'Sensitive', 'Combination']],
                    ['key' => 'ingredients', 'label' => 'Key ingredients', 'type' => 'text'],
                    ['key' => 'volume', 'label' => 'Net volume', 'type' => 'text', 'placeholder' => '200 ml'],
                    ['key' => 'cruelty_free', 'label' => 'Cruelty free', 'type' => 'boolean'],
                ],
                'tags' => ['natural', 'vegan', 'dermatologist-tested'],
            ],
            [
                'key' => 'home',
                'label' => 'Home, furniture & decor',
                'icon' => 'home',
                'example' => 'Textiles, kitchenware, furniture',
                'defaults' => [
                    'product_type' => 'physical',
                    'unit' => 'piece',
                    'requires_shipping' => true,
                    'track_inventory' => true,
                    'is_perishable' => false,
                    'weight_unit' => 'kg',
                ],
                'options' => [
                    ['name' => 'Size', 'values' => ['Small', 'Medium', 'Large']],
                    ['name' => 'Finish', 'values' => ['Natural', 'Walnut', 'Matte black']],
                ],
                'specs' => [
                    ['key' => 'material', 'label' => 'Material', 'type' => 'text'],
                    ['key' => 'dimensions_note', 'label' => 'Assembled size', 'type' => 'text'],
                    ['key' => 'assembly', 'label' => 'Assembly required', 'type' => 'boolean'],
                    ['key' => 'room', 'label' => 'Room', 'type' => 'select', 'options' => ['Living', 'Bedroom', 'Kitchen', 'Bath', 'Outdoor']],
                ],
                'tags' => ['handwoven', 'artisan', 'sustainable'],
            ],
            [
                'key' => 'digital',
                'label' => 'Digital products',
                'icon' => 'download',
                'example' => 'E-books, templates, software keys',
                'defaults' => [
                    'product_type' => 'digital',
                    'unit' => 'download',
                    'requires_shipping' => false,
                    'track_inventory' => false,
                    'is_perishable' => false,
                ],
                'options' => [
                    ['name' => 'Licence', 'values' => ['Personal', 'Commercial', 'Extended']],
                ],
                'specs' => [
                    ['key' => 'file_format', 'label' => 'File format', 'type' => 'text', 'placeholder' => 'PDF, EPUB, ZIP'],
                    ['key' => 'file_size', 'label' => 'File size', 'type' => 'text', 'placeholder' => '48 MB'],
                    ['key' => 'licence_terms', 'label' => 'Licence terms', 'type' => 'text'],
                    ['key' => 'download_limit', 'label' => 'Download limit', 'type' => 'number'],
                ],
                'tags' => ['instant-delivery', 'template', 'course'],
            ],
            [
                'key' => 'service',
                'label' => 'Services & bookings',
                'icon' => 'calendar',
                'example' => 'Tailoring, repairs, consulting',
                'defaults' => [
                    'product_type' => 'service',
                    'unit' => 'hour',
                    'requires_shipping' => false,
                    'track_inventory' => false,
                    'is_perishable' => false,
                ],
                'options' => [
                    ['name' => 'Tier', 'values' => ['Standard', 'Priority', 'On-site']],
                ],
                'specs' => [
                    ['key' => 'duration', 'label' => 'Duration', 'type' => 'text', 'placeholder' => '60 minutes'],
                    ['key' => 'delivery_mode', 'label' => 'Delivered', 'type' => 'select', 'options' => ['On-site', 'Remote', 'In-store']],
                    ['key' => 'lead_time', 'label' => 'Lead time', 'type' => 'text', 'placeholder' => '2 working days'],
                    ['key' => 'coverage_area', 'label' => 'Coverage area', 'type' => 'text'],
                ],
                'tags' => ['bookable', 'same-day', 'warranty-included'],
            ],
            [
                'key' => 'general',
                'label' => 'General merchandise',
                'icon' => 'box',
                'example' => 'Anything else',
                'defaults' => [
                    'product_type' => 'physical',
                    'unit' => 'piece',
                    'requires_shipping' => true,
                    'track_inventory' => true,
                    'is_perishable' => false,
                    'weight_unit' => 'kg',
                ],
                'options' => [
                    ['name' => 'Variant', 'values' => ['Standard']],
                ],
                'specs' => [
                    ['key' => 'highlight', 'label' => 'Key highlight', 'type' => 'text'],
                    ['key' => 'included', 'label' => "What's included", 'type' => 'text'],
                ],
                'tags' => ['new', 'clearance'],
            ],
        ];
    }

    /** @return array<string, mixed>|null */
    public static function preset(?string $key): ?array
    {
        foreach (self::presets() as $preset) {
            if ($preset['key'] === $key) {
                return $preset;
            }
        }

        return null;
    }

    /** @return array<int, string> */
    public static function presetKeys(): array
    {
        return array_column(self::presets(), 'key');
    }

    /** @return array<int, string> */
    public static function unitValues(): array
    {
        return array_column(self::UNITS, 'value');
    }
}
