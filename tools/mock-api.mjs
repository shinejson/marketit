/**
 * Minimal mock API for frontend-only development (no PHP/Laravel needed).
 *
 *   node tools/mock-api.mjs            # listens on 127.0.0.1:8001
 *
 * Covers just enough of the MarketHub API to log in to the super-admin
 * console and exercise the Ads & Marketing workspace (social accounts,
 * posts, campaigns). Data is kept in memory and resets on restart.
 */
import http from 'node:http';
import { handleSupport } from './support-mock.mjs';
import { handleTenant } from './tenant-mock.mjs';
import { handleAccounting } from './accounting-mock.mjs';
import { handleProducts } from './products-mock.mjs';
import { handleAccess } from './access-mock.mjs';

const PORT = process.env.PORT || 8001;

// ------------------------------------------------------------------ state

let id = 1000;
const nextId = () => ++id;

const accounts = [
  { id: 1, platform: 'facebook', handle: 'markethubgh', display_name: 'MarketHub Ghana', status: 'connected', followers: 28400, connected_at: '2025-07-02T10:00:00Z' },
  { id: 2, platform: 'instagram', handle: 'markethub.gh', display_name: 'MarketHub', status: 'connected', followers: 41200, connected_at: '2025-06-18T10:00:00Z' },
  { id: 3, platform: 'x', handle: 'markethub_gh', display_name: 'MarketHub', status: 'connected', followers: 12800, connected_at: '2025-08-21T10:00:00Z' },
  { id: 4, platform: 'linkedin', handle: 'markethub-africa', display_name: 'MarketHub Africa', status: 'connected', followers: 5300, connected_at: '2025-09-02T10:00:00Z' },
  { id: 5, platform: 'tiktok', handle: 'markethubgh', display_name: 'MarketHub', status: 'disconnected', followers: 19600, connected_at: null },
  { id: 6, platform: 'youtube', handle: 'MarketHubAfrica', display_name: 'MarketHub Africa', status: 'disconnected', followers: 2100, connected_at: null },
];

const campaigns = [
  { id: 1, name: 'Festive Season Mega Sale', objective: 'conversions', status: 'active', channels: ['facebook', 'instagram', 'x'], daily_budget: 120, total_budget: 3600, spend: 1485.5, impressions: 412800, clicks: 9640, conversions: 418, starts_at: '2025-09-19', ends_at: '2025-10-19', posts_count: 2 },
  { id: 2, name: 'New Seller Onboarding Drive', objective: 'seller_acquisition', status: 'active', channels: ['linkedin', 'facebook'], daily_budget: 60, total_budget: 1800, spend: 732.25, impressions: 98500, clicks: 2210, conversions: 64, starts_at: '2025-09-17', ends_at: '2025-10-17', posts_count: 1 },
  { id: 3, name: 'Handmade & Local Spotlight', objective: 'awareness', status: 'paused', channels: ['instagram', 'tiktok'], daily_budget: 40, total_budget: 1200, spend: 396, impressions: 154200, clicks: 3110, conversions: 92, starts_at: '2025-09-01', ends_at: '2025-10-31', posts_count: 0 },
  { id: 4, name: 'Back to School Tech Deals', objective: 'traffic', status: 'completed', channels: ['facebook', 'instagram', 'x', 'linkedin'], daily_budget: 90, total_budget: 2700, spend: 2700, impressions: 689400, clicks: 15320, conversions: 711, starts_at: '2025-07-18', ends_at: '2025-08-17', posts_count: 0 },
];

const posts = [
  { id: 1, campaign_id: 1, campaign: { id: 1, name: 'Festive Season Mega Sale' }, body: 'The Festive Mega Sale is LIVE! 🎉 Up to 40% off electronics, fashion and home — from verified sellers across Ghana. Free delivery in Accra on orders over GH₵200.', link_url: 'https://markethub.test/products?sale=festive', channels: ['facebook', 'instagram', 'x'], status: 'published', scheduled_for: null, published_at: '2025-09-29T08:30:00Z', impressions: 48200, clicks: 1890, engagements: 3260 },
  { id: 2, campaign_id: 2, campaign: { id: 2, name: 'New Seller Onboarding Drive' }, body: 'Turn your shop into an online store in under 10 minutes. Join 500+ sellers already growing with MarketHub — zero setup fees this month.', link_url: 'https://markethub.test/sell', channels: ['linkedin', 'facebook'], status: 'published', scheduled_for: null, published_at: '2025-09-26T14:00:00Z', impressions: 21400, clicks: 760, engagements: 980 },
  { id: 3, campaign_id: null, campaign: null, body: 'Meet the maker: SheaGold’s body butter is whipped in small batches in Tamale and ships nationwide. ✨ #ShopLocal #MadeInGhana', link_url: 'https://markethub.test/stores/sheagold', channels: ['instagram'], status: 'scheduled', scheduled_for: '2025-10-03T09:00:00Z', published_at: null, impressions: 0, clicks: 0, engagements: 0 },
  { id: 4, campaign_id: 1, campaign: { id: 1, name: 'Festive Season Mega Sale' }, body: 'Flash deal alert ⚡ Pulse Wireless Headphones at GH₵89 for the next 48 hours only. While stock lasts!', link_url: 'https://markethub.test/products/pulse-wireless-headphones', channels: ['x', 'facebook'], status: 'scheduled', scheduled_for: '2025-10-02T12:30:00Z', published_at: null, impressions: 0, clicks: 0, engagements: 0 },
  { id: 5, campaign_id: null, campaign: null, body: 'Draft: Year-in-review — celebrating our sellers, 120k orders delivered, and the communities behind them. (Add stats + video before publishing.)', link_url: null, channels: ['youtube', 'linkedin'], status: 'draft', scheduled_for: null, published_at: null, impressions: 0, clicks: 0, engagements: 0 },
];

const sponsoredAds = [
  { id: 101, name: 'Pulse launch', tenant_id: 1, status: 'active', spent_total: '182.40' },
  { id: 102, name: 'Kente home refresh', tenant_id: 2, status: 'active', spent_total: '96.10' },
  { id: 103, name: 'SheaGold glow-up', tenant_id: 2, status: 'paused', spent_total: '44.75' },
];

const adminDomains = [
  { id: 12, tenant_id: 1, tenant: { id: 1, name: 'Northstar Gadgets', business_name: 'Northstar Gadgets' }, domain: 'shop.northstargadgets.com', status: 'active', cert_status: 'active', dns_verified_at: '2026-09-30T08:30:00Z', last_check_at: '2026-10-01T21:42:00Z', check_attempts: 1, updated_at: '2026-09-30T08:30:00Z' },
  { id: 11, tenant_id: 2, tenant: { id: 2, name: 'Kente & Co', business_name: 'Kente & Co' }, domain: 'kenteandco.market', status: 'dns_pending', cert_status: 'none', dns_verified_at: null, last_check_at: '2026-10-01T17:14:00Z', check_attempts: 3, updated_at: '2026-10-01T17:14:00Z' },
  { id: 10, tenant_id: 3, tenant: { id: 3, name: 'Accra Food Hub', business_name: 'Accra Food Hub' }, domain: 'store.accrafoodhub.com', status: 'active', cert_status: 'issued', dns_verified_at: '2026-09-28T11:10:00Z', last_check_at: '2026-10-01T20:08:00Z', check_attempts: 1, updated_at: '2026-09-28T11:10:00Z' },
  { id: 9, tenant_id: 4, tenant: { id: 4, name: 'SheaGold', business_name: 'SheaGold' }, domain: 'sheagold.co', status: 'failed', cert_status: 'failed', dns_verified_at: '2026-09-27T09:22:00Z', last_check_at: '2026-10-01T15:38:00Z', check_attempts: 5, updated_at: '2026-10-01T15:38:00Z' },
];

const tenantUser = { id: 7, name: 'Nana Owusu', email: 'owner@northstar.test', role: 'tenant_owner', tenant_id: 1 };

const adminUser = { id: 1, name: 'Super Admin', email: 'admin@markethub.test', role: 'super_admin' };

// ----------------------------------------------------------------- audit log
// Deterministic 30-day audit trail for the super-admin audit console, shaped
// exactly like the Laravel /api/admin/audit-logs responses (rows + meta +
// stats, plus the /facets filter option lists).

const mulberry32 = (seed) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const auditRand = mulberry32(20261001);
const ri = (min, max) => min + Math.floor(auditRand() * (max - min + 1));
const pickOne = (arr) => arr[ri(0, arr.length - 1)];

const auditActors = {
  admin: { id: 1, name: 'Super Admin', email: 'admin@markethub.test', ip: '41.210.14.7' },
  seller1: { id: 2, name: 'Nana Owusu', email: 'seller1@markethub.test', ip: '197.251.12.88' },
  seller2: { id: 3, name: 'Abena Boakye', email: 'seller2@markethub.test', ip: '197.251.12.140' },
  finance: { id: 4, name: 'Kwame Finance', email: 'finance@markethub.test', ip: '41.210.14.52' },
  sales: { id: 5, name: 'Abena Sales', email: 'sales@markethub.test', ip: '41.210.14.61' },
  ops: { id: 6, name: 'Yaw Operations', email: 'ops@markethub.test', ip: '102.176.65.12' },
  marketing: { id: 7, name: 'Efua Marketing', email: 'marketing@markethub.test', ip: '102.176.65.45' },
};
const auditTenants = {
  north: { id: 1, name: 'Northstar Gadgets' },
  kente: { id: 2, name: 'Kente & Co' },
};
const auditProducts = {
  1: [
    { id: 1, name: 'Pulse Wireless Headphones', price: '89.00' },
    { id: 2, name: 'Orbit Smartwatch', price: '149.00' },
    { id: 3, name: 'Nimbus Bluetooth Speaker', price: '59.00' },
    { id: 4, name: 'Aero USB-C Hub', price: '39.00' },
  ],
  2: [
    { id: 5, name: 'Handwoven Throw Blanket', price: '72.00' },
    { id: 6, name: 'Ceramic Pour-Over Set', price: '48.00' },
    { id: 7, name: 'Shea Body Butter 200ml', price: '16.00' },
    { id: 8, name: 'Woven Market Tote', price: '28.00' },
  ],
};
const orderStatuses = ['awaiting_fulfilment', 'processing', 'shipped', 'delivered', 'completed'];

const auditSettingsEvent = () => {
  const keySets = [
    ['general.platform_name', 'general.support_email'],
    ['commerce.commission_rate'],
    ['security.session_lifetime', 'security.force_2fa'],
    ['email.from_address', 'email.from_name'],
  ];
  const action = pickOne(['settings.updated', 'settings.updated', 'settings.updated', 'settings.reset', 'settings.asset_uploaded', 'settings.email_test_sent', 'settings.email_test_failed', 'settings.sms_test_sent']);
  const after = {
    'settings.reset': { group: 'commerce' },
    'settings.asset_uploaded': { asset: 'brand_logo', path: 'branding/logo-2.svg' },
    'settings.email_test_sent': { to: 'ops@markethub.test', transport: 'smtp' },
    'settings.email_test_failed': { to: 'finance@markethub.test', error: 'SMTP connect() failed: connection timed out' },
    'settings.sms_test_sent': { to: '+233200000111', sender: 'MarketHub' },
  }[action] ?? { keys: pickOne(keySets) };
  return { tenantId: null, action, subjectType: 'App\\Models\\PlatformSetting', subjectId: null, diff: { before: null, after } };
};

const auditBackupEvent = (system) => {
  const action = pickOne(['backup.created', 'backup.created', 'backup.created', 'backup.restored', 'backup.deleted', 'backup.failed']);
  const scope = pickOne(['full', 'settings']);
  const after = {
    'backup.restored': { id: ri(1, 12), scope, settings_restored: 41 },
    'backup.deleted': { id: ri(1, 12) },
    'backup.failed': { scope, error: 'disk quota exceeded while writing snapshot' },
  }[action] ?? { scope, filename: `markethub-snapshot-${ri(100, 999)}.json` };
  return { tenantId: null, action, subjectType: 'App\\Models\\PlatformBackup', subjectId: null, diff: { before: null, after }, ip: system ? '127.0.0.1' : null };
};

const auditEventBody = (actorKey) => {
  const actor = auditActors[actorKey];
  const north = auditTenants.north.id;
  const kente = auditTenants.kente.id;

  if (actorKey === 'admin') {
    const choice = pickOne(['user', 'user', 'settings', 'settings', 'backup', 'subscription', 'tenant', 'tenant']);
    if (choice === 'tenant') {
      const tenant = pickOne([auditTenants.north, auditTenants.kente]);
      return { tenantId: tenant.id, action: 'updated', subjectType: 'App\\Models\\Tenant', subjectId: tenant.id, diff: { before: { status: 'pending' }, after: { status: 'active' } } };
    }
    if (choice === 'subscription') {
      const tenant = pickOne([auditTenants.north, auditTenants.kente]);
      return { tenantId: tenant.id, action: 'updated', subjectType: 'App\\Models\\Subscription', subjectId: tenant.id, diff: { before: { status: 'trialing', plan_id: 1 }, after: { status: 'active', plan_id: 2 } } };
    }
    if (choice === 'user') {
      return { tenantId: null, action: 'updated', subjectType: 'App\\Models\\User', subjectId: ri(2, 8), diff: { before: { status: 'active' }, after: { status: ri(0, 3) === 0 ? 'suspended' : 'active' } } };
    }
    if (choice === 'backup') return auditBackupEvent(false);
    return auditSettingsEvent();
  }

  if (actorKey === 'seller1' || actorKey === 'seller2') {
    const tenantId = actorKey === 'seller1' ? north : kente;
    const product = pickOne(auditProducts[tenantId]);
    const choice = pickOne(['price', 'price', 'price', 'created', 'inventory', 'variant', 'store', 'deleted']);
    if (choice === 'created') {
      return { tenantId, action: 'created', subjectType: 'App\\Models\\Product', subjectId: product.id, diff: { before: null, after: { name: product.name, price: product.price, qty: ri(5, 60), status: 'draft' } } };
    }
    if (choice === 'deleted') {
      return { tenantId, action: 'deleted', subjectType: 'App\\Models\\Product', subjectId: product.id, diff: { before: { name: product.name, status: 'active' }, after: null } };
    }
    if (choice === 'inventory') {
      return { tenantId, action: 'updated', subjectType: 'App\\Models\\Inventory', subjectId: product.id, diff: { before: { qty: ri(1, 6) }, after: { qty: ri(10, 50) } } };
    }
    if (choice === 'variant') {
      return { tenantId, action: 'updated', subjectType: 'App\\Models\\ProductVariant', subjectId: product.id, diff: { before: { price: product.price }, after: { price: (Math.max(5, Number(product.price) - ri(3, 12))).toFixed(2) } } };
    }
    if (choice === 'store') {
      return { tenantId, action: 'updated', subjectType: 'App\\Models\\Store', subjectId: tenantId, diff: { before: { delivery_fee: '5.00' }, after: { delivery_fee: ri(0, 1) === 0 ? '4.00' : '6.00' } } };
    }
    return {
      tenantId, action: 'updated', subjectType: 'App\\Models\\Product', subjectId: product.id,
      diff: { before: { price: product.price }, after: { price: (Math.max(5, Number(product.price) + ri(-10, 6))).toFixed(2) } },
    };
  }

  if (actorKey === 'ops') {
    const tenant = pickOne([auditTenants.north, auditTenants.kente]);
    const idx = ri(0, 3);
    return { tenantId: tenant.id, action: 'updated', subjectType: 'App\\Models\\SellerOrder', subjectId: ri(10, 99), diff: { before: { status: orderStatuses[idx] }, after: { status: orderStatuses[idx + 1] } } };
  }

  if (actorKey === 'finance') {
    const tenant = pickOne([auditTenants.north, auditTenants.kente]);
    return { tenantId: tenant.id, action: 'updated', subjectType: 'App\\Models\\Subscription', subjectId: tenant.id, diff: { before: { status: 'past_due' }, after: { status: 'active' } } };
  }

  // sales / marketing
  const tenant = pickOne([auditTenants.north, auditTenants.kente]);
  if (ri(0, 2) === 0) {
    return { tenantId: tenant.id, action: 'created', subjectType: 'App\\Models\\Category', subjectId: ri(5, 12), diff: { before: null, after: { name: 'New Arrivals', slug: 'new-arrivals' } } };
  }
  const product = pickOne(auditProducts[tenant.id]);
  return { tenantId: tenant.id, action: 'updated', subjectType: 'App\\Models\\Product', subjectId: product.id, diff: { before: { status: 'draft' }, after: { status: 'active' } } };
};

const auditLogs = [];
let auditSeq = 0;
const addAuditEvent = (at, actorKey) => {
  const actor = auditActors[actorKey] ?? null;
  const body = actorKey === 'system' ? auditBackupEvent(true) : auditEventBody(actorKey);
  const tenant = body.tenantId === null ? null : Object.values(auditTenants).find((t) => t.id === body.tenantId) ?? null;
  const roam = actor && ri(1, 12) === 1;
  auditLogs.push({
    id: ++auditSeq,
    actor_user_id: actor?.id ?? null,
    tenant_id: body.tenantId,
    action: body.action,
    subject_type: body.subjectType,
    subject_id: body.subjectId,
    diff: body.diff,
    ip: body.ip ?? (actor ? (roam ? `41.210.${ri(14, 30)}.${ri(20, 240)}` : actor.ip) : null),
    created_at: at.toISOString(),
    actor: actor ? { id: actor.id, name: actor.name, email: actor.email } : null,
    tenant: tenant ? { id: tenant.id, name: tenant.name } : null,
  });
};

const auditActorFor = (recent) => {
  const weights = recent
    ? { seller1: 30, seller2: 25, ops: 15, marketing: 10, finance: 8, sales: 7, admin: 5 }
    : { seller1: 22, seller2: 18, ops: 14, marketing: 11, finance: 10, sales: 10, admin: 10, system: 5 };
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let roll = auditRand() * total;
  for (const [key, weight] of Object.entries(weights)) {
    roll -= weight;
    if (roll <= 0) return key;
  }
  return 'seller1';
};

const now = new Date();
for (let daysAgo = 29; daysAgo >= 1; daysAgo--) {
  const count = ri(4, 7);
  const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19].sort(() => auditRand() - 0.5).slice(0, count).sort((a, b) => a - b);
  for (const hour of hours) {
    const at = new Date(now);
    at.setDate(at.getDate() - daysAgo);
    at.setHours(hour, ri(0, 59), ri(0, 59), 0);
    addAuditEvent(at, auditActorFor(false));
  }
}
for (const [hour, minute] of [[8, 41], [9, 12], [10, 33], [11, 5], [13, 48], [15, 26], [16, 58], [18, 3]]) {
  const at = new Date(now);
  at.setHours(hour, minute, ri(0, 59), 0);
  addAuditEvent(at, auditActorFor(false));
}
for (const minutesAgo of [46, 31, 22, 11, 6]) {
  addAuditEvent(new Date(now.getTime() - minutesAgo * 60000), auditActorFor(true));
}
const auditByCount = (key) => {
  const map = new Map();
  for (const row of auditLogs) {
    const value = key(row);
    if (value === null || value === undefined || value === '') continue;
    map.set(value, (map.get(value) ?? 0) + 1);
  }
  return [...map.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count);
};

const filterAuditLogs = (params) => {
  const q = (params.get('q') ?? '').trim().toLowerCase();
  const action = params.get('action') ?? '';
  const subjectType = params.get('subject_type') ?? '';
  const ip = params.get('ip') ?? '';
  const actorId = params.get('actor_id') ?? '';
  const tenantId = params.get('tenant_id') ?? '';
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';

  return auditLogs
    .filter((row) => {
      if (action && row.action !== action) return false;
      if (subjectType && row.subject_type !== subjectType) return false;
      if (ip && row.ip !== ip) return false;
      if (actorId && String(row.actor_user_id ?? '') !== actorId) return false;
      if (tenantId && String(row.tenant_id ?? '') !== tenantId) return false;
      if (from && row.created_at.slice(0, 10) < from) return false;
      if (to && row.created_at.slice(0, 10) > to) return false;
      if (q) {
        const haystack = [row.action, row.subject_type, row.ip, row.actor?.name, row.actor?.email]
          .filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => b.id - a.id);
};

// ---------------------------------------------------------------- helpers

const json = (res, status, payload) => {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': '*',
  });
  res.end(body);
};

const readBody = (req) => new Promise((resolve) => {
  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', () => {
    try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); }
  });
});

// ----------------------------------------------------------------- server

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method;

  if (method === 'OPTIONS') return json(res, 204, {});

  // ---- service desk (tickets, live chat, tasks, help centre)
  if (await handleSupport(req, res, url, method, readBody, json)) return;

  // ---- tenant accounting and procurement
  if (await handleAccounting(req, res, url, method, readBody, json)) return;

  // ---- tenant console (dashboard + departments)
  if (handleTenant(req, res, url, method, readBody, json)) return;

  // ---- tenant catalog (/tenant/products)
  if (await handleProducts(req, res, url, method, readBody, json)) return;

  // ---- access control (/tenant/users) and customer social login
  if (await handleAccess(req, res, url, method, readBody, json)) return;

  // ---- auth
  if (path === '/api/auth/login' && method === 'POST') {
    const body = await readBody(req);
    const user = body.portal === 'tenant' ? tenantUser : adminUser;
    return json(res, 200, { data: { token: 'mock-token', user } });
  }
  if (path === '/api/auth/logout' && method === 'POST') return json(res, 200, { data: { ok: true } });
  if (path === '/api/auth/me') return json(res, 200, { data: adminUser });

  // ---- marketing: accounts
  if (path === '/api/admin/marketing/accounts' && method === 'GET') return json(res, 200, { data: accounts });
  if (path === '/api/admin/marketing/accounts/connect' && method === 'POST') {
    const body = await readBody(req);
    let acc = accounts.find((a) => a.platform === body.platform);
    if (!acc) { acc = { id: nextId(), platform: body.platform, followers: 0 }; accounts.push(acc); }
    Object.assign(acc, {
      handle: String(body.handle || '').replace(/^@/, ''),
      status: 'connected',
      connected_at: new Date().toISOString(),
      followers: acc.followers || Math.floor(1000 + Math.random() * 9000),
    });
    return json(res, 201, { data: acc });
  }
  let m = path.match(/^\/api\/admin\/marketing\/accounts\/(\d+)\/disconnect$/);
  if (m && method === 'POST') {
    const acc = accounts.find((a) => a.id === +m[1]);
    if (acc) Object.assign(acc, { status: 'disconnected', connected_at: null });
    return json(res, 200, { data: acc ?? null });
  }

  // ---- marketing: campaigns
  if (path === '/api/admin/marketing/campaigns' && method === 'GET') return json(res, 200, { data: campaigns });
  if (path === '/api/admin/marketing/campaigns' && method === 'POST') {
    const body = await readBody(req);
    const c = { id: nextId(), spend: 0, impressions: 0, clicks: 0, conversions: 0, posts_count: 0, ...body };
    campaigns.unshift(c);
    return json(res, 201, { data: c });
  }
  m = path.match(/^\/api\/admin\/marketing\/campaigns\/(\d+)$/);
  if (m && method === 'PATCH') {
    const c = campaigns.find((x) => x.id === +m[1]);
    if (c) Object.assign(c, await readBody(req));
    return json(res, 200, { data: c ?? null });
  }
  if (m && method === 'DELETE') {
    const i = campaigns.findIndex((x) => x.id === +m[1]);
    if (i >= 0) campaigns.splice(i, 1);
    return json(res, 200, { data: { deleted: true } });
  }

  // ---- marketing: posts
  if (path === '/api/admin/marketing/posts' && method === 'GET') return json(res, 200, { data: posts });
  if (path === '/api/admin/marketing/posts' && method === 'POST') {
    const body = await readBody(req);
    const campaign = campaigns.find((c) => c.id === body.campaign_id) ?? null;
    const p = {
      id: nextId(), impressions: 0, clicks: 0, engagements: 0,
      published_at: body.status === 'published' ? new Date().toISOString() : null,
      campaign: campaign ? { id: campaign.id, name: campaign.name } : null,
      ...body,
    };
    posts.unshift(p);
    return json(res, 201, { data: p });
  }
  m = path.match(/^\/api\/admin\/marketing\/posts\/(\d+)\/publish$/);
  if (m && method === 'POST') {
    const p = posts.find((x) => x.id === +m[1]);
    if (p) Object.assign(p, { status: 'published', published_at: new Date().toISOString() });
    return json(res, 200, { data: p ?? null });
  }
  m = path.match(/^\/api\/admin\/marketing\/posts\/(\d+)$/);
  if (m && method === 'PATCH') {
    const p = posts.find((x) => x.id === +m[1]);
    if (p) Object.assign(p, await readBody(req));
    return json(res, 200, { data: p ?? null });
  }
  if (m && method === 'DELETE') {
    const i = posts.findIndex((x) => x.id === +m[1]);
    if (i >= 0) posts.splice(i, 1);
    return json(res, 200, { data: { deleted: true } });
  }

  // ---- misc admin endpoints used around the console
  if (path === '/api/admin/ads') return json(res, 200, { data: sponsoredAds });
  if (path === '/api/admin/domains' && method === 'GET') return json(res, 200, { data: adminDomains });
  m = path.match(/^\/api\/admin\/domains\/(\d+)\/verify$/);
  if (m && method === 'POST') {
    const domain = adminDomains.find((item) => item.id === +m[1]);
    if (domain) Object.assign(domain, {
      status: 'active', cert_status: 'active', dns_verified_at: new Date().toISOString(),
      last_check_at: new Date().toISOString(), check_attempts: (domain.check_attempts || 0) + 1,
    });
    return json(res, 200, { data: domain ?? null });
  }
  if (path === '/api/admin/ai-costs') return json(res, 200, { data: [] });
  if (path === '/api/admin/webhooks/health') return json(res, 200, { data: { endpoints: 0, active: 0, failed_24h: 0 } });

  // ---- audit log (mirrors AdminController::auditLogs / auditLogFacets)
  if (path === '/api/admin/audit-logs' && method === 'GET') {
    const rows = filterAuditLogs(url.searchParams);
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1);
    const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get('per_page') ?? 30) || 30));
    const start = (page - 1) * perPage;
    const slice = rows.slice(start, start + perPage);
    const todayStr = new Date().toISOString().slice(0, 10);
    const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;

    return json(res, 200, {
      data: slice,
      meta: { page, per_page: perPage, total: rows.length, last_page: Math.max(1, Math.ceil(rows.length / perPage)) },
      stats: {
        total: rows.length,
        today: rows.filter((r) => r.created_at.slice(0, 10) === todayStr).length,
        last_7_days: rows.filter((r) => Date.parse(r.created_at) >= weekAgo).length,
        unique_actors: new Set(rows.filter((r) => r.actor_user_id).map((r) => r.actor_user_id)).size,
        unique_ips: new Set(rows.filter((r) => r.ip).map((r) => r.ip)).size,
      },
    });
  }
  if (path === '/api/admin/audit-logs/facets' && method === 'GET') {
    const actorMap = new Map();
    const tenantMap = new Map();
    for (const row of auditLogs) {
      if (row.actor) {
        const entry = actorMap.get(row.actor.id) ?? { id: row.actor.id, name: row.actor.name, email: row.actor.email, count: 0 };
        entry.count += 1;
        actorMap.set(row.actor.id, entry);
      }
      if (row.tenant) {
        const entry = tenantMap.get(row.tenant.id) ?? { id: row.tenant.id, name: row.tenant.name, count: 0 };
        entry.count += 1;
        tenantMap.set(row.tenant.id, entry);
      }
    }
    return json(res, 200, {
      data: {
        actions: auditByCount((r) => r.action),
        subject_types: auditByCount((r) => r.subject_type),
        actors: [...actorMap.values()].sort((a, b) => b.count - a.count),
        ips: auditByCount((r) => r.ip),
        tenants: [...tenantMap.values()].sort((a, b) => b.count - a.count),
      },
    });
  }

  return json(res, 404, { message: `Mock API: no handler for ${method} ${path}` });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Mock MarketHub API listening on http://127.0.0.1:${PORT}`);
  console.log('Log in with any credentials at /admin/login (returns a super_admin session).');
  console.log('Service desk endpoints are served from tools/support-mock.mjs.');
});
