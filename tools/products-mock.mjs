/**
 * Mock tenant catalog endpoints (/api/tenant/products*) for frontend-only
 * development. Mounted by tools/mock-api.mjs.
 *
 * The payloads mirror App\Http\Controllers\Api\ProductController exactly —
 * same filters, same `stats` block, same derived fields (available_stock,
 * stock_state, margin_percent) — so the Angular catalog workspace behaves
 * identically against either backend. State is in memory: restart to reset.
 */

// ---------------------------------------------------------------- presets
// Mirrors App\Support\ProductCatalog.
export const PRESETS = [
  {
    key: 'fashion', label: 'Fashion & apparel', icon: 'shirt', example: 'Dresses, shoes, bags, tailoring',
    defaults: { product_type: 'physical', unit: 'piece', requires_shipping: true, track_inventory: true, is_perishable: false, condition: 'new', weight_unit: 'kg' },
    options: [
      { name: 'Size', values: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
      { name: 'Colour', values: ['Black', 'White', 'Indigo', 'Terracotta', 'Emerald'] },
    ],
    specs: [
      { key: 'material', label: 'Material / fabric', type: 'text', placeholder: 'e.g. 100% cotton poplin' },
      { key: 'fit', label: 'Fit', type: 'select', options: ['Slim', 'Regular', 'Relaxed', 'Oversized'] },
      { key: 'gender', label: 'Audience', type: 'select', options: ['Women', 'Men', 'Unisex', 'Kids'] },
      { key: 'care', label: 'Care instructions', type: 'text', placeholder: 'Machine wash cold, line dry' },
      { key: 'season', label: 'Season', type: 'select', options: ['All season', 'Spring/Summer', 'Autumn/Winter'] },
    ],
    tags: ['new-in', 'bestseller', 'handmade', 'limited-edition'],
  },
  {
    key: 'grocery', label: 'Fresh produce & grocery', icon: 'apple', example: 'Fruit, vegetables, meat, bakery',
    defaults: { product_type: 'physical', unit: 'kg', requires_shipping: true, track_inventory: true, is_perishable: true, shelf_life_days: 7, storage_requirement: 'chilled', weight_unit: 'kg' },
    options: [
      { name: 'Pack size', values: ['500 g', '1 kg', '2 kg', '5 kg crate'] },
      { name: 'Grade', values: ['Grade A', 'Grade B', 'Export'] },
    ],
    specs: [
      { key: 'variety', label: 'Variety / cultivar', type: 'text', placeholder: 'e.g. Keitt mango' },
      { key: 'grade', label: 'Quality grade', type: 'select', options: ['Grade A', 'Grade B', 'Export', 'Organic'] },
      { key: 'harvest_date', label: 'Harvest / packed date', type: 'date' },
      { key: 'farm', label: 'Farm / supplier', type: 'text' },
      { key: 'allergens', label: 'Allergens', type: 'text', placeholder: 'None / contains nuts' },
      { key: 'certification', label: 'Certification', type: 'select', options: ['None', 'Organic', 'Fairtrade', 'GlobalG.A.P.', 'HACCP'] },
    ],
    tags: ['fresh', 'organic', 'locally-grown', 'in-season'],
  },
  {
    key: 'electronics', label: 'Electronics & gadgets', icon: 'cpu', example: 'Phones, audio, computing, accessories',
    defaults: { product_type: 'physical', unit: 'piece', requires_shipping: true, track_inventory: true, is_perishable: false, condition: 'new', warranty_months: 12, weight_unit: 'kg' },
    options: [
      { name: 'Storage', values: ['64 GB', '128 GB', '256 GB', '512 GB', '1 TB'] },
      { name: 'Colour', values: ['Midnight', 'Silver', 'Graphite', 'Blue'] },
    ],
    specs: [
      { key: 'model_number', label: 'Model number', type: 'text' },
      { key: 'power', label: 'Power / battery', type: 'text', placeholder: 'e.g. 5000 mAh, 65 W USB-C' },
      { key: 'connectivity', label: 'Connectivity', type: 'text', placeholder: 'Bluetooth 5.3, Wi-Fi 6' },
      { key: 'in_the_box', label: 'In the box', type: 'text', placeholder: 'Device, cable, manual' },
      { key: 'voltage', label: 'Voltage', type: 'select', options: ['110 V', '220–240 V', 'Dual voltage', 'Battery only'] },
    ],
    tags: ['warranty', 'fast-charging', 'wireless', 'refurbished'],
  },
  {
    key: 'beauty', label: 'Beauty & personal care', icon: 'sparkle', example: 'Skincare, haircare, fragrance',
    defaults: { product_type: 'physical', unit: 'ml', requires_shipping: true, track_inventory: true, is_perishable: true, shelf_life_days: 365, storage_requirement: 'ambient', weight_unit: 'kg' },
    options: [
      { name: 'Size', values: ['50 ml', '100 ml', '200 ml', '500 ml'] },
      { name: 'Scent', values: ['Unscented', 'Shea', 'Citrus', 'Lavender'] },
    ],
    specs: [
      { key: 'skin_type', label: 'Suited to', type: 'select', options: ['All skin types', 'Dry', 'Oily', 'Sensitive', 'Combination'] },
      { key: 'ingredients', label: 'Key ingredients', type: 'text' },
      { key: 'volume', label: 'Net volume', type: 'text', placeholder: '200 ml' },
      { key: 'cruelty_free', label: 'Cruelty free', type: 'boolean' },
    ],
    tags: ['natural', 'vegan', 'dermatologist-tested'],
  },
  {
    key: 'home', label: 'Home, furniture & decor', icon: 'home', example: 'Textiles, kitchenware, furniture',
    defaults: { product_type: 'physical', unit: 'piece', requires_shipping: true, track_inventory: true, is_perishable: false, weight_unit: 'kg' },
    options: [
      { name: 'Size', values: ['Small', 'Medium', 'Large'] },
      { name: 'Finish', values: ['Natural', 'Walnut', 'Matte black'] },
    ],
    specs: [
      { key: 'material', label: 'Material', type: 'text' },
      { key: 'dimensions_note', label: 'Assembled size', type: 'text' },
      { key: 'assembly', label: 'Assembly required', type: 'boolean' },
      { key: 'room', label: 'Room', type: 'select', options: ['Living', 'Bedroom', 'Kitchen', 'Bath', 'Outdoor'] },
    ],
    tags: ['handwoven', 'artisan', 'sustainable'],
  },
  {
    key: 'digital', label: 'Digital products', icon: 'download', example: 'E-books, templates, software keys',
    defaults: { product_type: 'digital', unit: 'download', requires_shipping: false, track_inventory: false, is_perishable: false },
    options: [{ name: 'Licence', values: ['Personal', 'Commercial', 'Extended'] }],
    specs: [
      { key: 'file_format', label: 'File format', type: 'text', placeholder: 'PDF, EPUB, ZIP' },
      { key: 'file_size', label: 'File size', type: 'text', placeholder: '48 MB' },
      { key: 'licence_terms', label: 'Licence terms', type: 'text' },
      { key: 'download_limit', label: 'Download limit', type: 'number' },
    ],
    tags: ['instant-delivery', 'template', 'course'],
  },
  {
    key: 'service', label: 'Services & bookings', icon: 'calendar', example: 'Tailoring, repairs, consulting',
    defaults: { product_type: 'service', unit: 'hour', requires_shipping: false, track_inventory: false, is_perishable: false },
    options: [{ name: 'Tier', values: ['Standard', 'Priority', 'On-site'] }],
    specs: [
      { key: 'duration', label: 'Duration', type: 'text', placeholder: '60 minutes' },
      { key: 'delivery_mode', label: 'Delivered', type: 'select', options: ['On-site', 'Remote', 'In-store'] },
      { key: 'lead_time', label: 'Lead time', type: 'text', placeholder: '2 working days' },
      { key: 'coverage_area', label: 'Coverage area', type: 'text' },
    ],
    tags: ['bookable', 'same-day', 'warranty-included'],
  },
  {
    key: 'general', label: 'General merchandise', icon: 'box', example: 'Anything else',
    defaults: { product_type: 'physical', unit: 'piece', requires_shipping: true, track_inventory: true, is_perishable: false, weight_unit: 'kg' },
    options: [{ name: 'Variant', values: ['Standard'] }],
    specs: [
      { key: 'highlight', label: 'Key highlight', type: 'text' },
      { key: 'included', label: "What's included", type: 'text' },
    ],
    tags: ['new', 'clearance'],
  },
];

const UNITS = [
  { value: 'piece', label: 'Piece / item', group: 'Count' },
  { value: 'pair', label: 'Pair', group: 'Count' },
  { value: 'pack', label: 'Pack', group: 'Count' },
  { value: 'box', label: 'Box / carton', group: 'Count' },
  { value: 'dozen', label: 'Dozen', group: 'Count' },
  { value: 'bunch', label: 'Bunch', group: 'Count' },
  { value: 'crate', label: 'Crate', group: 'Count' },
  { value: 'kg', label: 'Kilogram (kg)', group: 'Weight' },
  { value: 'g', label: 'Gram (g)', group: 'Weight' },
  { value: 'lb', label: 'Pound (lb)', group: 'Weight' },
  { value: 'litre', label: 'Litre (L)', group: 'Volume' },
  { value: 'ml', label: 'Millilitre (ml)', group: 'Volume' },
  { value: 'metre', label: 'Metre (m)', group: 'Length' },
  { value: 'yard', label: 'Yard', group: 'Length' },
  { value: 'hour', label: 'Hour', group: 'Time' },
  { value: 'session', label: 'Session', group: 'Time' },
  { value: 'licence', label: 'Licence', group: 'Digital' },
  { value: 'download', label: 'Download', group: 'Digital' },
];

const STORES = [
  { id: 1, name: 'Northstar Electronics', slug: 'northstar', status: 'active', currency: 'USD', country: 'GH', products_count: 4 },
  { id: 2, name: 'Kente Home', slug: 'kente-home', status: 'active', currency: 'USD', country: 'GH', products_count: 5 },
  { id: 3, name: 'Accra Fresh Market', slug: 'accra-fresh', status: 'active', currency: 'USD', country: 'GH', products_count: 3 },
];

const CATEGORIES = [
  { id: 1, name: 'Audio', slug: 'audio', parent_id: null },
  { id: 2, name: 'Wearables', slug: 'wearables', parent_id: null },
  { id: 3, name: 'Accessories', slug: 'accessories', parent_id: null },
  { id: 4, name: 'Apparel', slug: 'apparel', parent_id: null },
  { id: 5, name: 'Home', slug: 'home', parent_id: null },
  { id: 6, name: 'Beauty', slug: 'beauty', parent_id: null },
  { id: 7, name: 'Fresh produce', slug: 'fresh-produce', parent_id: null },
  { id: 8, name: 'Services', slug: 'services', parent_id: null },
];

// Inline SVG covers keep the demo looking real without any network access.
const PALETTE = [['#1f4b3a', '#c45c26'], ['#c45c26', '#c9a227'], ['#1c1914', '#c45c26'], ['#35707f', '#1f4b3a'], ['#8a3b57', '#c9a227']];
const cover = (seed, label) => {
  const [from, to] = PALETTE[Math.abs(seed) % PALETTE.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="640" height="640" fill="url(#g)"/><circle cx="520" cy="110" r="150" fill="rgba(255,255,255,.08)"/><text x="50%" y="52%" text-anchor="middle" font-family="Georgia,serif" font-size="54" fill="rgba(255,255,255,.92)">${label}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
};

let sequence = 5000;
const nextId = () => ++sequence;

const variant = (productId, sku, options, qty, price = null, extra = {}) => {
  const id = nextId();
  return {
    id,
    product_id: productId,
    sku,
    name: Object.values(options).join(' / ') || 'Default',
    options,
    price_override: price,
    cost_price: null,
    weight: null,
    barcode: null,
    status: 'active',
    position: 0,
    inventory: {
      id: nextId(),
      variant_id: id,
      quantity: qty,
      reserved: 0,
      low_stock_threshold: extra.threshold ?? 5,
      batch_reference: extra.batch ?? null,
      expires_at: extra.expires ?? null,
      location: null,
    },
  };
};

const make = (row) => {
  const id = row.id;
  const preset = PRESETS.find((p) => p.key === row.catalog_preset) ?? PRESETS[PRESETS.length - 1];
  const store = STORES.find((s) => s.id === row.store_id);
  const category = CATEGORIES.find((c) => c.id === row.category_id) ?? null;
  const base = {
    id,
    tenant_id: 1,
    store_id: row.store_id,
    category_id: row.category_id ?? null,
    name: row.name,
    slug: row.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    description: row.description ?? `${row.name} — sold by ${store?.name}.`,
    short_description: row.short ?? null,
    status: row.status ?? 'active',
    catalog_preset: preset.key,
    price: row.price.toFixed(2),
    compare_at_price: row.compare_at ? row.compare_at.toFixed(2) : null,
    cost_price: row.cost ? row.cost.toFixed(2) : null,
    tax_class: null,
    brand: row.brand ?? null,
    min_order_qty: row.min_order_qty ?? 1,
    max_order_qty: null,
    unit_amount: null,
    low_stock_threshold: row.low_stock ?? 5,
    allow_backorder: false,
    length: null, width: null, height: null, dimension_unit: 'cm',
    weight: row.weight ?? null,
    country_of_origin: row.origin ?? null,
    barcode: row.barcode ?? null,
    tags: row.tags ?? [],
    specs: row.specs ?? {},
    option_schema: row.option_schema ?? [],
    has_variants: (row.variants?.length ?? 1) > 1,
    is_featured: !!row.featured,
    seo_title: null,
    seo_description: null,
    published_at: row.status === 'draft' ? null : '2026-09-12T09:00:00Z',
    created_at: row.created_at ?? '2026-09-12T09:00:00Z',
    updated_at: '2026-10-01T16:20:00Z',
    images: row.noImage ? [] : [{ id: nextId(), product_id: id, path: `mock/${id}.svg`, url: cover(id, row.glyph ?? '▦'), position: 0, is_primary: true }],
    store: store ? { id: store.id, name: store.name, slug: store.slug, currency: store.currency } : null,
    category,
    ...preset.defaults,
    ...(row.overrides ?? {}),
  };
  base.unit = row.unit ?? preset.defaults.unit ?? 'piece';
  base.variants = (row.variants ?? [{ options: { default: 'standard' }, qty: row.qty ?? 0 }]).map((v, index) =>
    variant(id, v.sku ?? `${row.name.toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 18)}-${String(index + 1).padStart(3, '0')}`,
      v.options ?? { default: 'standard' }, v.qty ?? 0, v.price ?? null,
      { threshold: row.low_stock ?? 5, batch: v.batch ?? null, expires: v.expires ?? null }),
  );
  return base;
};

let products = [
  make({
    id: 101, store_id: 2, category_id: 4, catalog_preset: 'fashion', name: 'Adinkra Wrap Dress', glyph: '👗',
    price: 85, compare_at: 99, cost: 38, brand: 'Kente', featured: true, weight: 0.42, origin: 'Ghana',
    short: 'Adinkra-printed wrap dress in breathable cotton poplin.',
    tags: ['new-in', 'handmade'],
    specs: { material: '100% cotton poplin', fit: 'Regular', gender: 'Women', care: 'Machine wash cold, line dry', season: 'All season' },
    option_schema: [{ name: 'Size', values: ['S', 'M', 'L', 'XL'] }, { name: 'Colour', values: ['Indigo', 'Terracotta'] }],
    variants: [
      { options: { Size: 'S', Colour: 'Indigo' }, qty: 6 },
      { options: { Size: 'M', Colour: 'Indigo' }, qty: 9 },
      { options: { Size: 'L', Colour: 'Terracotta' }, qty: 4 },
      { options: { Size: 'XL', Colour: 'Terracotta' }, qty: 2 },
    ],
  }),
  make({
    id: 102, store_id: 3, category_id: 7, catalog_preset: 'grocery', name: 'Keitt Mangoes', glyph: '🥭',
    price: 4.5, cost: 2.1, brand: 'Volta Farms', unit: 'kg', min_order_qty: 2, origin: 'Ghana', featured: true,
    short: 'Tree-ripened Keitt mangoes, picked to order.',
    tags: ['fresh', 'in-season', 'locally-grown'],
    specs: { variety: 'Keitt', grade: 'Grade A', farm: 'Volta Farms, Ho', allergens: 'None', certification: 'GlobalG.A.P.' },
    overrides: { shelf_life_days: 9 },
    option_schema: [{ name: 'Pack size', values: ['1 kg', '5 kg crate'] }],
    variants: [
      { options: { 'Pack size': '1 kg' }, qty: 120, batch: 'VF-MG-0412', expires: '2026-10-11' },
      { options: { 'Pack size': '5 kg crate' }, qty: 18, price: '20.00', batch: 'VF-MG-0413', expires: '2026-10-11' },
    ],
  }),
  make({
    id: 103, store_id: 3, category_id: 7, catalog_preset: 'grocery', name: 'Golden Sugarloaf Pineapple', glyph: '🍍',
    price: 3.2, cost: 1.35, brand: 'Volta Farms', unit: 'piece', qty: 3, origin: 'Ghana',
    short: 'Low-acid sugarloaf pineapple, sold whole.',
    tags: ['fresh', 'organic'],
    specs: { variety: 'Sugarloaf', grade: 'Export', farm: 'Volta Farms, Ho', certification: 'Organic' },
    overrides: { shelf_life_days: 6 },
  }),
  make({
    id: 104, store_id: 1, category_id: 1, catalog_preset: 'electronics', name: 'Pulse Wireless Headphones', glyph: '🎧',
    price: 89, compare_at: 109, cost: 52, brand: 'Pulse', featured: true, weight: 0.28, barcode: '6001234500011',
    short: 'Over-ear ANC headphones with 40-hour battery life.',
    tags: ['bestseller', 'wireless'],
    specs: { model_number: 'PLS-HP-01', power: '40 h battery, USB-C fast charge', connectivity: 'Bluetooth 5.3, multipoint', in_the_box: 'Headphones, case, USB-C cable' },
    overrides: { warranty_months: 24 },
    option_schema: [{ name: 'Colour', values: ['Midnight', 'Sand'] }],
    variants: [
      { options: { Colour: 'Midnight' }, qty: 24 },
      { options: { Colour: 'Sand' }, qty: 16 },
    ],
  }),
  make({
    id: 105, store_id: 1, category_id: 2, catalog_preset: 'electronics', name: 'Orbit Smartwatch', glyph: '⌚',
    price: 149, cost: 94, brand: 'Orbit', weight: 0.06,
    short: 'AMOLED fitness smartwatch with 7-day battery.',
    tags: ['new-in'],
    specs: { model_number: 'ORB-W2', power: '410 mAh, 7-day battery', connectivity: 'Bluetooth 5.2, GPS' },
    option_schema: [{ name: 'Size', values: ['42 mm', '46 mm'] }, { name: 'Colour', values: ['Graphite', 'Silver'] }],
    variants: [
      { options: { Size: '42 mm', Colour: 'Graphite' }, qty: 14 },
      { options: { Size: '46 mm', Colour: 'Silver' }, qty: 11, price: '159.00' },
    ],
  }),
  make({
    id: 106, store_id: 1, category_id: 1, catalog_preset: 'electronics', name: 'Nimbus Bluetooth Speaker', glyph: '🔊',
    price: 59, cost: 33, brand: 'Nimbus', qty: 4, weight: 0.54,
    short: 'Splash-proof portable speaker with 12-hour playback.',
    specs: { model_number: 'NMB-S1', power: '12 h playback', connectivity: 'Bluetooth 5.0, AUX' },
  }),
  make({
    id: 107, store_id: 1, category_id: 3, catalog_preset: 'electronics', name: 'Aero USB-C Hub', glyph: '🔌',
    price: 39, cost: 18.5, brand: 'Aero', qty: 60, weight: 0.11,
    short: '7-in-1 hub with HDMI, card reader and 100 W pass-through.',
    specs: { model_number: 'AER-H7', connectivity: 'USB-C, HDMI 4K60, SD/microSD' },
  }),
  make({
    id: 108, store_id: 2, category_id: 5, catalog_preset: 'home', name: 'Handwoven Throw Blanket', glyph: '🧶',
    price: 72, cost: 41, brand: 'Kente', qty: 18, weight: 1.4,
    short: 'Loom-woven cotton throw, finished by hand in Bonwire.',
    tags: ['handwoven', 'artisan'],
    specs: { material: '100% brushed cotton', dimensions_note: '130 × 180 cm', room: 'Living' },
  }),
  make({
    id: 109, store_id: 2, category_id: 6, catalog_preset: 'beauty', name: 'Shea Body Butter 200ml', glyph: '🧴',
    price: 16, cost: 6.4, brand: 'SheaGold', unit: 'ml',
    short: 'Unrefined shea whipped with baobab oil.',
    tags: ['natural', 'vegan'],
    specs: { skin_type: 'All skin types', ingredients: 'Shea butter, baobab oil, vitamin E', volume: '200 ml', cruelty_free: true },
    option_schema: [{ name: 'Scent', values: ['Unscented', 'Citrus'] }],
    variants: [
      { options: { Scent: 'Unscented' }, qty: 44 },
      { options: { Scent: 'Citrus' }, qty: 36 },
    ],
  }),
  make({
    id: 110, store_id: 2, category_id: 5, catalog_preset: 'home', name: 'Woven Market Tote', glyph: '👜',
    price: 28, cost: 12, brand: 'Kente', qty: 4, weight: 0.5,
    short: 'Raffia tote with leather handles.',
    specs: { material: 'Raffia and leather' },
  }),
  make({
    id: 111, store_id: 2, category_id: 4, catalog_preset: 'fashion', name: 'Hand-dyed Indigo Shirt', glyph: '👔',
    price: 64, cost: 29, brand: 'Kente', status: 'draft',
    short: 'Small-batch indigo shirt — awaiting final photography.',
    specs: { material: 'Cotton voile', fit: 'Relaxed', gender: 'Unisex' },
    option_schema: [{ name: 'Size', values: ['M', 'L'] }],
    variants: [
      { options: { Size: 'M' }, qty: 0 },
      { options: { Size: 'L' }, qty: 0 },
    ],
  }),
  make({
    id: 112, store_id: 1, category_id: 8, catalog_preset: 'service', name: 'On-site Device Repair', glyph: '🛠',
    price: 60, brand: 'Northstar Care', unit: 'hour',
    short: 'Certified technician, Accra and Tema, same-week booking.',
    tags: ['bookable', 'same-day'],
    specs: { duration: '60 minutes', delivery_mode: 'On-site', lead_time: '2 working days', coverage_area: 'Greater Accra' },
  }),
  make({
    id: 113, store_id: 2, category_id: null, catalog_preset: 'digital', name: 'Kente Pattern Pack (Vector)', glyph: '⤓',
    price: 24, brand: 'Kente Studio', unit: 'download',
    short: '48 royalty-free vector patterns in SVG and AI.',
    tags: ['instant-delivery', 'template'],
    specs: { file_format: 'SVG, AI, PNG', file_size: '184 MB', licence_terms: 'Commercial use, no resale' },
  }),
];

// --------------------------------------------------------------- helpers

const available = (product) =>
  product.variants.reduce((sum, v) => sum + Math.max(0, (v.inventory?.quantity ?? 0) - (v.inventory?.reserved ?? 0)), 0);

const stockState = (product) => {
  if (!product.track_inventory) return 'untracked';
  const qty = available(product);
  if (qty <= 0) return product.allow_backorder ? 'backorder' : 'out_of_stock';
  return qty <= (product.low_stock_threshold ?? 5) ? 'low_stock' : 'in_stock';
};

const present = (product) => {
  const price = Number(product.price);
  const cost = Number(product.cost_price ?? 0);
  return {
    ...product,
    available_stock: available(product),
    stock_state: stockState(product),
    primary_image_url: product.images[0]?.url ?? null,
    margin_percent: cost > 0 && price > 0 ? Math.round(((price - cost) / price) * 1000) / 10 : null,
  };
};

const matchesFilters = (product, q) => {
  const term = (q.get('q') ?? '').trim().toLowerCase();
  if (term) {
    const haystack = [product.name, product.brand, product.barcode, product.short_description,
      ...product.variants.map((v) => v.sku)].join(' ').toLowerCase();
    if (!haystack.includes(term)) return false;
  }
  if (q.get('store_id') && product.store_id !== +q.get('store_id')) return false;
  if (q.get('category_id') && product.category_id !== +q.get('category_id')) return false;
  if (q.get('catalog_preset') && product.catalog_preset !== q.get('catalog_preset')) return false;
  if (q.get('product_type') && product.product_type !== q.get('product_type')) return false;
  if (q.get('featured') && !product.is_featured) return false;
  return true;
};

const buildStats = (rows) => {
  const stats = {
    total_count: rows.length,
    active_count: rows.filter((p) => p.status === 'active').length,
    draft_count: rows.filter((p) => p.status === 'draft').length,
    archived_count: rows.filter((p) => p.status === 'archived').length,
    low_stock_count: 0,
    out_of_stock_count: 0,
    total_units: 0,
    retail_value: 0,
    inventory_cost: 0,
    featured_count: rows.filter((p) => p.is_featured).length,
  };
  for (const product of rows) {
    const qty = available(product);
    stats.total_units += qty;
    stats.retail_value += qty * Number(product.price);
    stats.inventory_cost += qty * Number(product.cost_price ?? 0);
    const state = stockState(product);
    if (state === 'low_stock') stats.low_stock_count++;
    if (state === 'out_of_stock') stats.out_of_stock_count++;
  }
  stats.retail_value = Math.round(stats.retail_value * 100) / 100;
  stats.inventory_cost = Math.round(stats.inventory_cost * 100) / 100;
  return stats;
};

const applyPayload = (product, body) => {
  const simple = ['store_id', 'category_id', 'name', 'description', 'short_description', 'status',
    'catalog_preset', 'product_type', 'brand', 'tax_class', 'unit', 'unit_amount', 'min_order_qty',
    'max_order_qty', 'track_inventory', 'allow_backorder', 'low_stock_threshold', 'requires_shipping',
    'weight', 'weight_unit', 'length', 'width', 'height', 'dimension_unit', 'condition', 'warranty_months',
    'is_perishable', 'shelf_life_days', 'storage_requirement', 'country_of_origin', 'barcode', 'tags',
    'specs', 'option_schema', 'is_featured', 'seo_title', 'seo_description'];
  for (const key of simple) if (key in body) product[key] = body[key];
  for (const key of ['price', 'compare_at_price', 'cost_price']) {
    if (key in body) product[key] = body[key] === null ? null : Number(body[key]).toFixed(2);
  }
  product.store = STORES.find((s) => s.id === Number(product.store_id)) ?? product.store;
  product.category = CATEGORIES.find((c) => c.id === Number(product.category_id)) ?? null;

  if (Array.isArray(body.variants)) {
    product.variants = body.variants.map((row, index) => {
      const existing = product.variants.find((v) => v.id === row.id);
      const options = row.options ?? {};
      const label = Object.entries(options).filter(([k]) => k !== 'default').map(([, v]) => v).join(' / ') || 'Default';
      const id = existing?.id ?? nextId();
      return {
        id,
        product_id: product.id,
        sku: row.sku || `${String(product.name).toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 18)}-${String(index + 1).padStart(3, '0')}`,
        name: row.name || label,
        options,
        price_override: row.price_override ?? null,
        cost_price: row.cost_price ?? null,
        weight: row.weight ?? null,
        barcode: row.barcode ?? null,
        status: row.status ?? 'active',
        position: index,
        inventory: {
          id: existing?.inventory?.id ?? nextId(),
          variant_id: id,
          quantity: Number(row.quantity ?? existing?.inventory?.quantity ?? 0),
          reserved: existing?.inventory?.reserved ?? 0,
          low_stock_threshold: Number(row.low_stock_threshold ?? product.low_stock_threshold ?? 5),
          batch_reference: row.batch_reference ?? null,
          expires_at: row.expires_at ?? null,
          location: null,
        },
      };
    });
    product.has_variants = product.variants.length > 1;
  }
  product.updated_at = new Date().toISOString();
  if (product.status === 'active' && !product.published_at) product.published_at = new Date().toISOString();
  return product;
};

// ---------------------------------------------------------------- routing

export async function handleProducts(req, res, url, method, readBody, json) {
  const path = url.pathname;
  if (!path.startsWith('/api/tenant/products')) return false;

  if (path === '/api/tenant/products/meta' && method === 'GET') {
    json(res, 200, {
      data: {
        stores: STORES,
        categories: CATEGORIES,
        presets: PRESETS,
        units: UNITS,
        types: ['physical', 'digital', 'service'],
        conditions: ['new', 'used', 'refurbished'],
        storage_requirements: ['ambient', 'chilled', 'frozen', 'dry', 'fragile'],
        statuses: ['draft', 'active', 'archived'],
        tags: [...new Set(products.flatMap((p) => p.tags ?? []))].sort(),
        brands: [...new Set(products.map((p) => p.brand).filter(Boolean))].sort(),
      },
    });
    return true;
  }

  if (path === '/api/tenant/products/bulk' && method === 'POST') {
    const body = await readBody(req);
    const ids = new Set(body.ids ?? []);
    let affected = 0;
    products = products.filter((product) => {
      if (!ids.has(product.id)) return true;
      affected++;
      switch (body.action) {
        case 'activate': product.status = 'active'; break;
        case 'draft': product.status = 'draft'; break;
        case 'archive': product.status = 'archived'; break;
        case 'feature': product.is_featured = true; break;
        case 'unfeature': product.is_featured = false; break;
        case 'category': product.category_id = body.category_id ?? null; break;
        case 'price_adjust':
          product.price = Math.max(0, Number(product.price) * (1 + Number(body.percent ?? 0) / 100)).toFixed(2);
          break;
        case 'delete': return false;
        default: break;
      }
      return true;
    });
    json(res, 200, { data: { affected, archived_instead: 0 } });
    return true;
  }

  let match = path.match(/^\/api\/tenant\/products\/(\d+)\/duplicate$/);
  if (match && method === 'POST') {
    const source = products.find((p) => p.id === +match[1]);
    if (!source) return json(res, 404, { message: 'Not found' }), true;
    const copy = JSON.parse(JSON.stringify(source));
    copy.id = nextId();
    copy.name = `${source.name} (copy)`;
    copy.slug = `${source.slug}-copy-${copy.id}`;
    copy.status = 'draft';
    copy.is_featured = false;
    copy.published_at = null;
    copy.variants = copy.variants.map((v, index) => {
      const id = nextId();
      return { ...v, id, product_id: copy.id, sku: `${v.sku}-COPY`, inventory: { ...v.inventory, id: nextId(), variant_id: id, quantity: 0 }, position: index };
    });
    copy.images = copy.images.map((image) => ({ ...image, id: nextId(), product_id: copy.id }));
    products.unshift(copy);
    json(res, 201, { data: present(copy) });
    return true;
  }

  match = path.match(/^\/api\/tenant\/products\/(\d+)\/images\/(\d+)$/);
  if (match && method === 'DELETE') {
    const product = products.find((p) => p.id === +match[1]);
    if (product) product.images = product.images.filter((image) => image.id !== +match[2]);
    json(res, 200, { data: { ok: true } });
    return true;
  }

  match = path.match(/^\/api\/tenant\/products\/(\d+)\/images$/);
  if (match && method === 'POST') {
    // Multipart uploads are not parsed by the mock; return a generated cover.
    const product = products.find((p) => p.id === +match[1]);
    if (product) {
      const image = { id: nextId(), product_id: product.id, path: 'mock/upload.svg', url: cover(nextId(), '✚'), position: product.images.length, is_primary: product.images.length === 0 };
      product.images.push(image);
      return json(res, 201, { data: image }), true;
    }
    json(res, 404, { message: 'Not found' });
    return true;
  }

  match = path.match(/^\/api\/tenant\/products\/(\d+)$/);
  if (match) {
    const index = products.findIndex((p) => p.id === +match[1]);
    if (index < 0) return json(res, 404, { message: 'Not found' }), true;
    if (method === 'GET') return json(res, 200, { data: present(products[index]) }), true;
    if (method === 'PATCH') {
      const body = await readBody(req);
      applyPayload(products[index], body);
      return json(res, 200, { data: present(products[index]) }), true;
    }
    if (method === 'DELETE') {
      const [removed] = products.splice(index, 1);
      return json(res, 200, { data: { ok: true, archived: false, id: removed.id } }), true;
    }
  }

  if (path === '/api/tenant/products' && method === 'POST') {
    const body = await readBody(req);
    const preset = PRESETS.find((p) => p.key === body.catalog_preset) ?? PRESETS[PRESETS.length - 1];
    const product = {
      id: nextId(),
      tenant_id: 1,
      slug: String(body.name ?? 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      images: [],
      variants: [],
      created_at: new Date().toISOString(),
      published_at: null,
      has_variants: false,
      ...preset.defaults,
      catalog_preset: preset.key,
      price: '0.00',
      compare_at_price: null,
      cost_price: null,
      tags: [],
      specs: {},
      option_schema: [],
      low_stock_threshold: 5,
      min_order_qty: 1,
      is_featured: false,
    };
    applyPayload(product, body);
    if (!product.variants.length) {
      product.variants = [variant(product.id, `${String(product.name).toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 18)}-001`, { default: 'standard' }, Number(body.quantity ?? 0))];
    }
    products.unshift(product);
    json(res, 201, { data: present(product) });
    return true;
  }

  if (path === '/api/tenant/products' && method === 'GET') {
    const q = url.searchParams;
    const base = products.filter((product) => matchesFilters(product, q));
    let rows = base;
    if (q.get('status')) rows = rows.filter((p) => p.status === q.get('status'));
    if (q.get('stock')) rows = rows.filter((p) => stockState(p) === q.get('stock'));

    const [sortBy, sortDir] = (q.get('sort_by') ?? 'created_at') === 'created_at'
      ? ['created_at', q.get('sort_dir') ?? 'desc']
      : [q.get('sort_by'), q.get('sort_dir') ?? 'desc'];
    rows = [...rows].sort((a, b) => {
      const left = sortBy === 'price' ? Number(a.price) : String(a[sortBy] ?? '');
      const right = sortBy === 'price' ? Number(b.price) : String(b[sortBy] ?? '');
      if (left === right) return 0;
      return (left < right ? -1 : 1) * (sortDir === 'asc' ? 1 : -1);
    });

    const perPage = Math.min(100, Math.max(1, Number(q.get('per_page') ?? 15)));
    const page = Math.max(1, Number(q.get('page') ?? 1));
    const slice = rows.slice((page - 1) * perPage, page * perPage);

    json(res, 200, {
      data: slice.map(present),
      meta: { page, per_page: perPage, total: rows.length, last_page: Math.max(1, Math.ceil(rows.length / perPage)) },
      stats: buildStats(base),
    });
    return true;
  }

  return false;
}
