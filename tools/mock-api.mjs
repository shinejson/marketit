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

const adminUser = { id: 1, name: 'Super Admin', email: 'admin@markethub.test', role: 'super_admin' };

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

  // ---- auth
  if (path === '/api/auth/login' && method === 'POST') {
    return json(res, 200, { data: { token: 'mock-token', user: adminUser } });
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
  if (path === '/api/admin/ai-costs') return json(res, 200, { data: [] });
  if (path === '/api/admin/webhooks/health') return json(res, 200, { data: { endpoints: 0, active: 0, failed_24h: 0 } });

  return json(res, 404, { message: `Mock API: no handler for ${method} ${path}` });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Mock MarketHub API listening on http://127.0.0.1:${PORT}`);
  console.log('Log in with any credentials at /admin/login (returns a super_admin session).');
});
