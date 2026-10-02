/**
 * Mock tenant-console endpoints (dashboard summary + department overview) for
 * frontend-only development. Mounted by tools/mock-api.mjs.
 *
 * Data is deterministic and generated relative to "today" so the tenant
 * dashboard always has a realistic looking trend to render.
 */

const PRODUCTS = [
  { name: 'Pulse Wireless Headphones', sku: 'PLS-HP-01', price: 89, weight: 26, stock: 42 },
  { name: 'Kente Throw Blanket', sku: 'KNT-TB-04', price: 145, weight: 18, stock: 12 },
  { name: 'SheaGold Body Butter 250ml', sku: 'SHG-BB-250', price: 32, weight: 22, stock: 4 },
  { name: 'Northstar 65W GaN Charger', sku: 'NS-CH-65', price: 54, weight: 14, stock: 88 },
  { name: 'Accra Roast Coffee 1kg', sku: 'AFH-CF-1K', price: 28, weight: 11, stock: 0 },
  { name: 'Adinkra Ceramic Mug Set', sku: 'KNT-MG-06', price: 46, weight: 7, stock: 23 },
  { name: 'Solar Lantern Mini', sku: 'NS-SL-02', price: 39, weight: 6, stock: 31 },
  { name: 'Handwoven Raffia Tote', sku: 'KNT-RT-11', price: 72, weight: 5, stock: 9 },
];

const STORES = [
  { id: 1, name: 'Northstar Gadgets', status: 'active', weight: 42 },
  { id: 2, name: 'Kente & Co', status: 'active', weight: 33 },
  { id: 3, name: 'SheaGold Beauty', status: 'active', weight: 16 },
  { id: 4, name: 'Accra Food Hub', status: 'draft', weight: 9 },
];

// Deterministic pseudo-random so numbers stay stable between reloads.
const rand = (seed) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

const money = (n) => Math.round(n * 100) / 100;

const buildTrend = (days) => {
  const out = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dow = d.getDay();
    const weekend = dow === 0 || dow === 6 ? 1.28 : 1;
    const growth = 1 + (days - i) / (days * 4);
    const base = 850 * weekend * growth * (0.72 + rand(d.getDate() + d.getMonth() * 31 + i) * 0.62);
    out.push({
      day: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      total: money(base),
      orders: Math.max(1, Math.round(base / 96)),
    });
  }
  return out;
};

const metric = (value, previous, format, caption) => {
  const delta = previous > 0 ? Math.round(((value - previous) / previous) * 1000) / 10 : value > 0 ? 100 : 0;
  return {
    value: money(value),
    previous: money(previous),
    delta,
    direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
    format,
    caption,
  };
};

const departments = (revenue, orders) => [
  {
    key: 'finance',
    title: 'Finance',
    kpis: [
      { key: 'revenue', label: 'Revenue', value: String(money(revenue)), format: 'currency' },
      { key: 'settlement', label: 'Net payout', value: String(money(revenue * 0.91)), format: 'currency' },
      { key: 'margin', label: 'Margin', value: '38.4', format: 'percent' },
    ],
    progress: [{ label: 'Monthly revenue goal', current: String(money(revenue)), target: '40000', percent: Math.min(100, Math.round((revenue / 40000) * 100)), format: 'currency' }],
  },
  {
    key: 'sales',
    title: 'Sales',
    kpis: [
      { key: 'orders', label: 'Orders', value: String(orders), format: 'number' },
      { key: 'aov', label: 'Avg order', value: String(money(revenue / Math.max(1, orders))), format: 'currency' },
      { key: 'repeat', label: 'Repeat rate', value: '27.6', format: 'percent' },
    ],
    progress: [{ label: 'Order target', current: String(orders), target: '420', percent: Math.min(100, Math.round((orders / 420) * 100)), format: 'number' }],
  },
  {
    key: 'operations',
    title: 'Operations',
    kpis: [
      { key: 'fulfilled', label: 'Fulfilled', value: String(Math.round(orders * 0.82)), format: 'number' },
      { key: 'sla', label: 'On-time SLA', value: '94.1', format: 'percent' },
      { key: 'lowstock', label: 'Low stock', value: '3', format: 'number' },
    ],
    progress: [{ label: 'Same-day dispatch', current: '88', target: '95', percent: 93, format: 'percent' }],
  },
  {
    key: 'marketing',
    title: 'Marketing',
    kpis: [
      { key: 'spend', label: 'Ad spend', value: String(money(revenue * 0.11)), format: 'currency' },
      { key: 'roas', label: 'ROAS', value: '4.2', format: 'number' },
      { key: 'ctr', label: 'CTR', value: '2.9', format: 'percent' },
    ],
    progress: [{ label: 'Campaign budget used', current: '1485', target: '3600', percent: 41, format: 'currency' }],
  },
];

export function handleTenant(req, res, url, method, readBody, json) {
  const path = url.pathname;
  if (!path.startsWith('/api/tenant/dashboard')) return false;

  if (path === '/api/tenant/dashboard/departments') {
    const trend = buildTrend(30);
    const revenue = trend.reduce((s, p) => s + p.total, 0);
    const orders = trend.reduce((s, p) => s + p.orders, 0);
    json(res, 200, { data: { departments: departments(revenue, orders) } });
    return true;
  }

  if (path === '/api/tenant/dashboard/summary') {
    const days = Math.max(7, Math.min(90, Number(url.searchParams.get('days') || 30)));
    const trend = buildTrend(days);
    const prev = buildTrend(days * 2).slice(0, days);

    const revenue = trend.reduce((s, p) => s + p.total, 0);
    const orders = trend.reduce((s, p) => s + p.orders, 0);
    const prevRevenue = prev.reduce((s, p) => s + p.total, 0);
    const prevOrders = prev.reduce((s, p) => s + p.orders, 0);
    const today = trend[trend.length - 1];
    const yesterday = trend[trend.length - 2] ?? today;

    const totalWeight = PRODUCTS.reduce((s, p) => s + p.weight, 0);
    const topProducts = PRODUCTS.map((p) => {
      const share = p.weight / totalWeight;
      const rev = money(revenue * share);
      return {
        name: p.name,
        sku: p.sku,
        units: Math.max(1, Math.round(rev / p.price)),
        orders: Math.max(1, Math.round((rev / p.price) * 0.7)),
        revenue: rev,
        share: Math.round(share * 1000) / 10,
        delta: Math.round((rand(p.weight) * 70 - 22) * 10) / 10,
        stock: p.stock,
      };
    }).sort((a, b) => b.revenue - a.revenue);

    const storeTotal = STORES.reduce((s, x) => s + x.weight, 0);
    const stores = STORES.map((s) => ({
      id: s.id,
      name: s.name,
      status: s.status,
      orders: Math.round(orders * (s.weight / storeTotal)),
      revenue: money(revenue * (s.weight / storeTotal)),
      share: Math.round((s.weight / storeTotal) * 1000) / 10,
    }));

    const statusSplit = [
      ['completed', 0.46], ['delivered', 0.18], ['shipped', 0.12],
      ['processing', 0.11], ['awaiting_fulfillment', 0.08], ['cancelled', 0.05],
    ];

    const iso = (minsAgo) => new Date(Date.now() - minsAgo * 60000).toISOString();

    json(res, 200, {
      data: {
        generated_at: new Date().toISOString(),
        range: { days, from: trend[0].day, to: trend[trend.length - 1].day },
        sales_today: String(today.total),
        open_orders: Math.round(orders * 0.19),
        low_stock: 3,
        kpis: {
          revenue_today: metric(today.total, yesterday.total, 'currency', 'vs yesterday'),
          revenue_period: metric(revenue, prevRevenue, 'currency', 'vs previous period'),
          orders_period: { ...metric(orders, prevOrders, 'number', 'vs previous period'), value: orders, previous: prevOrders },
          avg_order_value: metric(revenue / Math.max(1, orders), prevRevenue / Math.max(1, prevOrders), 'currency', 'vs previous period'),
          net_settlement: metric(revenue * 0.91, prevRevenue * 0.91, 'currency', 'after commission'),
          units_sold: { ...metric(Math.round(orders * 1.7), Math.round(prevOrders * 1.7), 'number', 'vs previous period'), value: Math.round(orders * 1.7) },
          open_orders: { value: Math.round(orders * 0.19), previous: 0, delta: 0, direction: 'flat', format: 'number', caption: 'awaiting action' },
          low_stock: { value: 3, previous: 0, delta: 0, direction: 'flat', format: 'number', caption: 'variants below threshold' },
        },
        sales_chart: trend,
        status_breakdown: statusSplit.map(([status, pct]) => ({
          status,
          label: status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          count: Math.max(1, Math.round(orders * pct)),
          value: money(revenue * pct),
        })),
        top_products: topProducts,
        stores,
        inventory_alerts: [
          { variant_id: 51, name: 'Accra Roast Coffee 1kg', sku: 'AFH-CF-1K', available: 0, threshold: 10, severity: 'out' },
          { variant_id: 33, name: 'SheaGold Body Butter 250ml', sku: 'SHG-BB-250', available: 4, threshold: 12, severity: 'low' },
          { variant_id: 44, name: 'Handwoven Raffia Tote', sku: 'KNT-RT-11', available: 9, threshold: 10, severity: 'low' },
          { variant_id: 22, name: 'Kente Throw Blanket', sku: 'KNT-TB-04', available: 12, threshold: 15, severity: 'low' },
        ],
        recent_orders: [
          { id: 4821, reference: 'ORD-04821', status: 'processing', subtotal: '248.00', store: 'Northstar Gadgets', customer: 'Ama Boateng', created_at: iso(14) },
          { id: 4820, reference: 'ORD-04820', status: 'awaiting_fulfillment', subtotal: '92.50', store: 'Kente & Co', customer: 'Kwame Mensah', created_at: iso(48) },
          { id: 4819, reference: 'ORD-04819', status: 'shipped', subtotal: '410.00', store: 'Northstar Gadgets', customer: 'Nana Adjei', created_at: iso(126) },
          { id: 4818, reference: 'ORD-04818', status: 'completed', subtotal: '64.00', store: 'SheaGold Beauty', customer: 'Efua Sarpong', created_at: iso(240) },
          { id: 4817, reference: 'ORD-04817', status: 'cancelled', subtotal: '145.00', store: 'Kente & Co', customer: 'Yaw Owusu', created_at: iso(330) },
          { id: 4816, reference: 'ORD-04816', status: 'delivered', subtotal: '189.90', store: 'Northstar Gadgets', customer: 'Abena Darko', created_at: iso(470) },
        ],
        support: {
          tickets: { open: 3, awaiting_you: 1, resolved: 28, total: 31 },
          tasks: { open: 4, overdue: 1, done: 19, total: 23 },
          guides: { published: 42 },
          chat: { unread: 2, active: 2 },
          threads: [
            {
              id: 91,
              topic: 'Payout schedule for September',
              status: 'active',
              priority: 'high',
              agent: 'Dora Ampofo',
              unread: 2,
              last_message_at: iso(9),
              messages: [
                { id: 1, author: 'You', role: 'visitor', body: 'Hi — our September settlement still shows as pending. Can you check?', read: true, at: iso(26) },
                { id: 2, author: 'Dora Ampofo', role: 'agent', body: 'Looking now. I can see the batch was queued behind a bank holiday.', read: false, at: iso(17) },
                { id: 3, author: 'Dora Ampofo', role: 'agent', body: 'Payout is released and should land within 24 hours. Reference STL-20931.', read: false, at: iso(9) },
              ],
            },
            {
              id: 88,
              topic: 'Custom domain SSL warning',
              status: 'queued',
              priority: 'normal',
              agent: null,
              unread: 0,
              last_message_at: iso(190),
              messages: [
                { id: 4, author: 'You', role: 'visitor', body: 'Browser shows a certificate warning on shop.northstargadgets.com.', read: true, at: iso(200) },
                { id: 5, author: 'MarketHub Bot', role: 'bot', body: 'Thanks! An agent will join shortly. Meanwhile, re-run DNS verification from Domains.', read: true, at: iso(190) },
              ],
            },
            {
              id: 84,
              topic: 'Bulk product import template',
              status: 'ended',
              priority: 'low',
              agent: 'Kojo Antwi',
              unread: 0,
              last_message_at: iso(2600),
              messages: [
                { id: 6, author: 'Kojo Antwi', role: 'agent', body: 'Template shared in the guide "Importing your catalogue". Closing this one — shout if you need more.', read: true, at: iso(2600) },
              ],
            },
          ],
        },
      },
    });
    return true;
  }

  return false;
}
