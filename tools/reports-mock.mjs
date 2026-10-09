/**
 * Mock report endpoints for the tenant report (/tenant/reports) and the
 * super-admin platform report (/admin/reports). Mounted by tools/mock-api.mjs.
 *
 * Payloads mirror TenantAnalyticsService::report() and
 * PlatformReportService::report(). Figures are deterministic and generated
 * relative to "today", so the charts always have a trend to draw. A tenant
 * scope or store filter narrows the same dataset the way the API does.
 */

const DAY = 86400000;

// Deterministic pseudo-random so numbers stay stable between reloads.
const rand = (seed) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

const TENANTS = [
  { id: 1, name: 'Northstar Gadgets', status: 'active', weight: 34, stores: [{ id: 1, name: 'Northstar Gadgets', currency: 'USD' }, { id: 5, name: 'Northstar Outlet', currency: 'USD' }] },
  { id: 2, name: 'Kente & Co', status: 'active', weight: 24, stores: [{ id: 2, name: 'Kente & Co', currency: 'USD' }] },
  { id: 3, name: 'Accra Food Hub', status: 'active', weight: 16, stores: [{ id: 3, name: 'Accra Food Hub', currency: 'USD' }] },
  { id: 4, name: 'SheaGold', status: 'pending', weight: 0, stores: [{ id: 4, name: 'SheaGold Beauty', currency: 'USD' }] },
  { id: 5, name: 'Savanna Crafts', status: 'suspended', weight: 6, stores: [{ id: 6, name: 'Savanna Crafts', currency: 'USD' }] },
  { id: 6, name: 'Lagos Threads', status: 'rejected', weight: 0, stores: [] },
];

const PRODUCTS = [
  { tenant: 1, name: 'Pulse Wireless Headphones', sku: 'PLS-HP-01', price: 89 },
  { tenant: 1, name: 'Northstar 65W GaN Charger', sku: 'NS-CH-65', price: 54 },
  { tenant: 1, name: 'Solar Lantern Mini', sku: 'NS-SL-02', price: 39 },
  { tenant: 2, name: 'Kente Throw Blanket', sku: 'KNT-TB-04', price: 145 },
  { tenant: 2, name: 'Adinkra Ceramic Mug Set', sku: 'KNT-MG-06', price: 46 },
  { tenant: 2, name: 'Handwoven Raffia Tote', sku: 'KNT-RT-11', price: 72 },
  { tenant: 3, name: 'Accra Roast Coffee 1kg', sku: 'AFH-CF-1K', price: 28 },
  { tenant: 4, name: 'SheaGold Body Butter 250ml', sku: 'SHG-BB-250', price: 32 },
  { tenant: 5, name: 'Woven Market Basket', sku: 'SAV-BK-02', price: 58 },
];

const STATUS_MIX = ['awaiting_fulfillment', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded'];

const isoDay = (date) => date.toISOString().slice(0, 10);
const startOfDay = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

/** Synthesises the day-level facts for a window; everything else is derived from these. */
function dataset(days, tenantId, storeId) {
  const today = startOfDay(new Date());
  const rows = [];
  for (let back = 0; back < days * 2; back++) {
    const day = new Date(today.getTime() - back * DAY);
    for (const t of TENANTS) {
      if (!t.weight) continue;
      if (tenantId && t.id !== tenantId) continue;
      for (const store of t.stores) {
        if (storeId && store.id !== storeId) continue;
        const seed = back * 97 + t.id * 13 + store.id * 7;
        const orders = Math.round((t.weight / 12) * (0.6 + rand(seed) * 1.4));
        for (let o = 0; o < orders; o++) {
          const product = PRODUCTS.filter((p) => p.tenant === t.id)[Math.floor(rand(seed + o) * 3) % Math.max(1, PRODUCTS.filter((p) => p.tenant === t.id).length)];
          const qty = 1 + Math.floor(rand(seed + o + 3) * 3);
          const status = STATUS_MIX[Math.floor(rand(seed + o + 9) * STATUS_MIX.length)];
          rows.push({
            day,
            tenant: t,
            store,
            product,
            qty,
            status,
            userId: 100 + Math.floor(rand(seed + o + 17) * 400),
            subtotal: product ? product.price * qty : 40,
          });
        }
      }
    }
  }
  return rows;
}

const inWindow = (row, start) => row.day >= start;
const counted = (row) => row.status !== 'cancelled' && row.status !== 'refunded';
const money = (n) => Math.round(n * 100) / 100;

function views(days, tenantId, storeId) {
  const total = [];
  for (let back = 0; back < days * 2; back++) {
    const day = new Date(startOfDay(new Date()).getTime() - back * DAY);
    for (const t of TENANTS) {
      if (!t.weight) continue;
      if (tenantId && t.id !== tenantId) continue;
      for (const store of t.stores) {
        if (storeId && store.id !== storeId) continue;
        const n = Math.round(t.weight * 1.4 * (0.5 + rand(back * 31 + t.id * 5 + store.id)));
        for (let i = 0; i < n; i++) total.push({ day, tenant: t.id, store: store.id });
      }
    }
  }
  return total;
}

function kpi(current, previous) {
  const delta = previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : current > 0 ? 100 : 0;
  return {
    value: money(current),
    previous: money(previous),
    delta_percent: delta,
    direction: current > previous ? 'up' : current < previous ? 'down' : 'flat',
  };
}

function series(rows, eventViews, start, days) {
  const out = [];
  for (let i = 0; i < days; i++) {
    const day = isoDay(new Date(start.getTime() + i * DAY));
    const sameDay = rows.filter((r) => isoDay(r.day) === day && counted(r));
    out.push({
      day,
      gmv: money(sameDay.reduce((s, r) => s + r.subtotal, 0)),
      commission: money(sameDay.reduce((s, r) => s + r.subtotal * 0.1, 0)),
      orders: sameDay.length,
      views: eventViews.filter((v) => isoDay(v.day) === day).length,
    });
  }
  return out;
}

function statusMix(rows) {
  return STATUS_MIX.map((status) => {
    const matching = rows.filter((r) => r.status === status);
    return { status, count: matching.length, gmv: money(matching.reduce((s, r) => s + r.subtotal, 0)) };
  }).filter((s) => s.count > 0).sort((a, b) => b.count - a.count);
}

function topProducts(rows) {
  const map = new Map();
  for (const r of rows.filter(counted)) {
    if (!r.product) continue;
    const key = `${r.tenant.id}|${r.product.sku}`;
    const row = map.get(key) ?? { tenant: r.tenant.business_name ?? r.tenant.name, name: r.product.name, sku: r.product.sku, units: 0, revenue: 0, orders: 0 };
    row.units += r.qty;
    row.revenue += r.subtotal;
    row.orders += 1;
    map.set(key, row);
  }
  return [...map.values()].map((r) => ({ ...r, revenue: money(r.revenue) })).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
}

function funnelFor(eventViews, rows) {
  const views = eventViews.length;
  const carts = Math.round(views * 0.31);
  const placed = rows.length;
  const paid = rows.filter((r) => counted(r) && r.status !== 'awaiting_fulfillment').length;
  const rate = (a) => (views > 0 ? Math.round((a / views) * 1000) / 10 : 0);
  return {
    steps: [
      { key: 'views', label: 'Product views', value: views, rate: 100 },
      { key: 'carts', label: 'Added to cart', value: carts, rate: rate(carts) },
      { key: 'checkouts', label: 'Order placed', value: placed, rate: rate(placed) },
      { key: 'paid', label: 'Paid', value: paid, rate: rate(paid) },
    ],
    cart_abandonment: carts > 0 ? Math.round(((carts - paid) / carts) * 1000) / 10 : 0,
  };
}

function customersFor(rows) {
  const byUser = new Map();
  for (const r of rows.filter(counted)) {
    const entry = byUser.get(r.userId) ?? { checkouts: new Set(), gmv: 0 };
    entry.checkouts.add(`${r.tenant.id}-${r.day.getTime()}-${r.userId}-${r.product?.sku}`);
    entry.gmv += r.subtotal;
    byUser.set(r.userId, entry);
  }
  const buyers = byUser.size;
  const repeat = [...byUser.values()].filter((e) => e.checkouts.size > 1).length;
  const gmv = [...byUser.values()].reduce((s, e) => s + e.gmv, 0);
  return {
    buyers,
    repeat_buyers: repeat,
    repeat_rate: buyers ? Math.round((repeat / buyers) * 1000) / 10 : 0,
    revenue_per_buyer: buyers ? money(gmv / buyers) : 0,
  };
}

function adsFor(days, tenantId) {
  const scale = tenantId ? 0.4 : 1;
  const impressions = Math.round(days * 1800 * scale);
  const clicks = Math.round(impressions * 0.027);
  const spend = money(clicks * 0.42);
  return {
    impressions,
    clicks,
    spend,
    ctr: impressions ? Math.round((clicks / impressions) * 10000) / 100 : 0,
    avg_cpc: clicks ? Math.round((spend / clicks) * 10000) / 10000 : 0,
  };
}

function highlights(current, previous, tenantRows, pending, hold) {
  const out = [];
  const delta = previous.gmv > 0 ? Math.round(((current.gmv - previous.gmv) / previous.gmv) * 1000) / 10 : 0;
  out.push({
    tone: delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'neutral',
    title: delta === 0 ? 'Revenue flat' : `Revenue ${delta > 0 ? 'up' : 'down'} ${Math.abs(delta)}%`,
    detail: 'Compared with the previous period of the same length.',
  });
  if (current.orders > 0) {
    out.push({
      tone: 'neutral',
      title: `Take rate ${((current.commission / current.gmv) * 100).toFixed(1)}%`,
      detail: `${current.commission.toFixed(2)} commission on ${current.gmv.toFixed(2)} GMV across ${current.orders} seller orders.`,
    });
  }
  if (tenantRows.length) {
    out.push({
      tone: 'neutral',
      title: `${tenantRows[0].name} leads with ${tenantRows[0].share}% of GMV`,
      detail: `${tenantRows[0].orders} orders from ${tenantRows[0].stores} store(s) in the window.`,
    });
  }
  if (pending > 0) out.push({ tone: 'neutral', title: `${pending} seller application(s) waiting`, detail: 'Review them in Tenants to activate or reject.' });
  if (hold > 0) out.push({ tone: 'negative', title: `${hold} settlement(s) on hold`, detail: 'Release or reverse them from Payouts before the next batch.' });
  return out.slice(0, 5);
}

/** Mirrors TenantAnalyticsService::highlights(): revenue, AOV and conversion only. */
function tenantHighlights(current, previous) {
  const out = [];
  const delta = previous.gmv > 0 ? Math.round(((current.gmv - previous.gmv) / previous.gmv) * 1000) / 10 : current.gmv > 0 ? 100 : 0;
  out.push({
    tone: delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'neutral',
    title: delta === 0 ? 'Revenue flat' : `Revenue ${delta > 0 ? 'up' : 'down'} ${Math.abs(delta)}%`,
    detail: 'Compared with the previous period of the same length.',
  });
  if (current.orders > 0) {
    out.push({ tone: 'neutral', title: `Average order value ${current.aov.toFixed(2)}`, detail: `${current.orders} orders from ${current.buyers} buyers.` });
  }
  if (current.views > 0) {
    out.push({
      tone: current.conversion >= previous.conversion ? 'positive' : 'negative',
      title: `Conversion at ${current.conversion}%`,
      detail: `${current.views} product views recorded in the window.`,
    });
  } else {
    out.push({ tone: 'neutral', title: 'No storefront traffic recorded', detail: 'Publish products and share your store link to start collecting view data.' });
  }
  return out;
}

function windowOf(days) {
  const end = new Date();
  const start = startOfDay(new Date(Date.now() - (days - 1) * DAY));
  const prevStart = new Date(start.getTime() - days * DAY);
  const prevEnd = new Date(start.getTime() - 1000);
  return { start, end, prevStart, prevEnd };
}

function totalsFor(rows, eventViews, start, end) {
  const inRange = rows.filter((r) => r.day >= start && r.day <= end && counted(r));
  const gmv = inRange.reduce((s, r) => s + r.subtotal, 0);
  const orders = inRange.length;
  const v = eventViews.filter((e) => e.day >= start && e.day <= end).length;
  return {
    orders,
    gmv: money(gmv),
    commission: money(gmv * 0.1),
    net: money(gmv * 0.87),
    units: inRange.reduce((s, r) => s + r.qty, 0),
    views: v,
    buyers: new Set(inRange.map((r) => r.userId)).size,
    active_tenants: new Set(inRange.map((r) => r.tenant.id)).size,
    new_tenants: 0,
    aov: orders ? money(gmv / orders) : 0,
    conversion: v ? Math.round((orders / v) * 10000) / 100 : 0,
  };
}

// --------------------------------------------------------- tenant analytics

function tenantReport(url, tenantId) {
  const days = Math.max(1, Math.min(365, Number(url.searchParams.get('days') ?? 30) || 30));
  const storeId = url.searchParams.get('store_id') ? Number(url.searchParams.get('store_id')) : null;
  const { start, end, prevStart, prevEnd } = windowOf(days);

  const rows = dataset(days, tenantId, storeId);
  const prevRows = dataset(days * 2, tenantId, storeId);
  const eventViews = views(days, tenantId, storeId);
  const prevViews = views(days * 2, tenantId, storeId);
  const current = totalsFor(rows, eventViews, start, end);
  const previous = totalsFor(prevRows, prevViews, prevStart, prevEnd);

  const stores = TENANTS.find((t) => t.id === tenantId)?.stores ?? [];
  // Like storeBreakdown() in the API, the store table ignores the store filter,
  // so every store of the tenant stays listed.
  const storeRows = dataset(days, tenantId, null).filter((r) => counted(r) && inWindow(r, start));
  const storeBreakdown = stores.map((s) => {
    const mine = storeRows.filter((r) => r.store.id === s.id);
    const gmv = mine.reduce((sum, r) => sum + r.subtotal, 0);
    return { id: s.id, name: s.name, currency: s.currency, orders: mine.length, gmv: money(gmv), net: money(gmv * 0.87) };
  }).filter((s) => s.orders > 0);  // the API lists only stores with sales in the window

  const kpis = {
    gmv: kpi(current.gmv, previous.gmv),
    orders: kpi(current.orders, previous.orders),
    aov: kpi(current.aov, previous.aov),
    net: kpi(current.net, previous.net),
    units: kpi(current.units, previous.units),
    customers: kpi(current.buyers, previous.buyers),
    views: kpi(current.views, previous.views),
    conversion: kpi(current.conversion, previous.conversion),
    commission: kpi(current.commission, previous.commission),
  };

  return {
    currency: 'USD',
    range: {
      days,
      start: isoDay(start),
      end: isoDay(end),
      previous_start: isoDay(prevStart),
      previous_end: isoDay(prevEnd),
    },
    kpis,
    series: series(rows, eventViews, start, days),
    funnel: funnelFor(eventViews, rows),
    status_mix: statusMix(rows),
    top_products: topProducts(rows),
    stores: storeBreakdown,
    customers: customersFor(rows),
    ads: adsFor(days, tenantId),
    highlights: tenantHighlights(current, previous),
    lifetime: { gmv: '48250.00', commission: '4825.00', orders: 612, take_rate: '10.00' },
    scope: { store_id: storeId, tenant_wide_sections: storeId ? ['funnel', 'ads'] : [] },
  };
}

// ----------------------------------------------------------- platform report

function platformReport(url) {
  const days = Math.max(1, Math.min(365, Number(url.searchParams.get('days') ?? 30) || 30));
  const tenantParam = url.searchParams.get('tenant_id');
  const tenantId = tenantParam ? Number(tenantParam) : null;
  const scoped = tenantId ? TENANTS.find((t) => t.id === tenantId) : null;
  if (tenantId && !scoped) return { status: 404, body: { message: 'Tenant not found.' } };

  const { start, end, prevStart, prevEnd } = windowOf(days);
  const rows = dataset(days, tenantId, null);
  const prevRows = dataset(days * 2, tenantId, null);
  const eventViews = views(days, tenantId, null);
  const prevViews = views(days * 2, tenantId, null);
  const current = totalsFor(rows, eventViews, start, end);
  const previous = totalsFor(prevRows, prevViews, prevStart, prevEnd);
  current.new_tenants = scoped ? 0 : 1;
  previous.new_tenants = 0;

  const allRows = tenantId ? dataset(days, null, null) : rows;
  const platformGmv = allRows.filter(counted).reduce((s, r) => s + r.subtotal, 0);

  const leaderboard = TENANTS.filter((t) => t.weight && (!tenantId || t.id === tenantId))
    .map((t) => {
      const mine = rows.filter((r) => r.tenant.id === t.id && counted(r));
      const gmv = mine.reduce((s, r) => s + r.subtotal, 0);
      const commission = gmv * 0.1;
      return {
        id: t.id,
        name: t.name,
        status: t.status,
        stores: t.stores.length,
        orders: mine.length,
        gmv: money(gmv),
        commission: money(commission),
        net: money(gmv * 0.87),
        take_rate: gmv ? Math.round((commission / gmv) * 10000) / 100 : 0,
        share: platformGmv ? Math.round((gmv / platformGmv) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.gmv - a.gmv);

  const pending = TENANTS.filter((t) => t.status === 'pending').length;
  const hold = 2;
  const statuses = ['active', 'pending', 'suspended', 'rejected'];
  const tenantStatus = statuses.map((status) => ({ status, count: TENANTS.filter((t) => t.status === status).length }));

  return {
    status: 200,
    body: {
      range: {
        days,
        start: isoDay(start),
        end: isoDay(end),
        previous_start: isoDay(prevStart),
        previous_end: isoDay(prevEnd),
      },
      scope: { tenant_id: tenantId, tenant_name: scoped?.name ?? null },
      kpis: {
        gmv: kpi(current.gmv, previous.gmv),
        commission: kpi(current.commission, previous.commission),
        net: kpi(current.net, previous.net),
        orders: kpi(current.orders, previous.orders),
        aov: kpi(current.aov, previous.aov),
        units: kpi(current.units, previous.units),
        buyers: kpi(current.buyers, previous.buyers),
        active_tenants: kpi(current.active_tenants, previous.active_tenants),
        new_tenants: kpi(current.new_tenants, previous.new_tenants),
        views: kpi(current.views, previous.views),
        conversion: kpi(current.conversion, previous.conversion),
      },
      series: series(rows, eventViews, start, days),
      funnel: funnelFor(eventViews, rows),
      status_mix: statusMix(rows),
      top_products: topProducts(rows),
      tenants: leaderboard,
      customers: customersFor(rows),
      ads: adsFor(days, tenantId),
      billing: {
        mrr: scoped ? 1497 : 8964,
        active_subscriptions: scoped ? 1 : 5,
        open_invoices: scoped ? 0 : 2,
        open_amount: scoped ? 0 : 598,
      },
      payouts: {
        by_status: [
          { status: 'paid', count: 4, net: 6120.4 },
          { status: 'pending_approval', count: 1, net: 1418.25 },
          { status: 'processing', count: 1, net: 902.1 },
        ],
        on_hold: { count: hold, net: 312.4 },
      },
      tenant_status: tenantStatus,
      tenant_options: TENANTS.map((t) => ({ id: t.id, name: t.name })),
      highlights: highlights(current, previous, leaderboard, pending, hold),
    },
  };
}

// ------------------------------------------------------------------ router

/**
 * Returns true when the request was handled. Mirrors the response envelope
 * used by the Laravel controllers ({ data } on success, { message } on error).
 */
export async function handleReports(req, res, url, method, readBody, json) {
  const path = url.pathname;
  if (method !== 'GET') return false;

  if (path === '/api/tenant/analytics') {
    json(res, 200, { data: tenantReport(url, 1) });
    return true;
  }

  // Tenant store list, used by the store filter on the tenant report.
  if (path === '/api/tenant/stores') {
    const stores = TENANTS.find((t) => t.id === 1).stores.map((s) => ({ id: s.id, name: s.name, currency: s.currency, status: 'active' }));
    json(res, 200, { data: stores, meta: { current_page: 1, last_page: 1, per_page: 50, total: stores.length } });
    return true;
  }

  if (path === '/api/admin/reports') {
    const out = platformReport(url);
    json(res, out.status, out.status === 200 ? { data: out.body } : { message: out.body.message });
    return true;
  }

  return false;
}
