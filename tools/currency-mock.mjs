/**
 * Mock currency + profile endpoints for frontend-only development.
 * Mounted by tools/mock-api.mjs; mirrors the Laravel responses from
 * App\Http\Controllers\Api\CurrencyController, TenantSettingsController and
 * ProfileController. State is in memory — restart to reset.
 */

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$', rate: 1, decimals: 2 },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH\u20b5', rate: 12.45, decimals: 2 },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '\u20a6', rate: 1545, decimals: 2 },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', rate: 129, decimals: 2 },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', rate: 18.1, decimals: 2 },
  { code: 'XOF', name: 'West African CFA Franc', symbol: 'CFA', rate: 605, decimals: 0 },
  { code: 'EUR', name: 'Euro', symbol: '\u20ac', rate: 0.92, decimals: 2 },
  { code: 'GBP', name: 'British Pound', symbol: '\u00a3', rate: 0.78, decimals: 2 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', rate: 1.37, decimals: 2 },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E\u00a3', rate: 48.5, decimals: 2 },
];

const BASE = 'USD';
const meta = (code) => CURRENCIES.find((c) => c.code === String(code || BASE).toUpperCase()) ?? CURRENCIES[0];
const factor = (from, to) => meta(to).rate / meta(from).rate;

// ----------------------------------------------------------- tenant state
const settings = {
  tenant: {
    id: 1,
    name: 'Northstar Gadgets',
    slug: 'northstar',
    status: 'active',
    business_name: 'Northstar Trading Ltd',
    country: 'GH',
    business_details: 'Consumer electronics and accessories.',
  },
  settings: {
    timezone: 'Africa/Accra',
    currency: 'USD',
    fiscal_year_start_month: 1,
    notify_low_stock: true,
    notify_orders: true,
    notify_payouts: false,
    backup_retention_days: 30,
    payout_email: 'payouts@northstar.test',
    tax_id: 'C0001234567',
    support_email: 'help@northstar.test',
    support_phone: '+233 24 000 0000',
    default_markup_percent: 30,
    default_discount_percent: 5,
    tax_rate: 12.5,
    auto_convert_prices: true,
    goals: {},
    receipt: {},
  },
  documents: [],
};

const sampleProducts = [
  { id: 1, name: 'Pulse Wireless Headphones', price: 89 },
  { id: 2, name: 'Northstar 65W GaN Charger', price: 54 },
  { id: 3, name: 'Solar Lantern Mini', price: 39 },
];

const recordCounts = { products: 48, accounting_invoices: 22, sales_quotes: 9, ad_campaigns: 4 };

const currencyPayload = () => ({ base: BASE, currencies: CURRENCIES });

const settingsPayload = (conversion = null) => {
  const code = settings.settings.currency;
  return {
    ...settings,
    settings: {
      ...settings.settings,
      currency_symbol: meta(code).symbol,
      currency_name: meta(code).name,
      currency_rate: meta(code).rate,
      currency_decimals: meta(code).decimals,
    },
    departments: ['finance', 'sales', 'operations', 'marketing'],
    currencies: currencyPayload(),
    conversion,
  };
};

// ------------------------------------------------------------- my account
const profileUser = {
  id: 7,
  name: 'Ama Mensah',
  email: 'seller1@markethub.test',
  phone: '+233 24 111 2233',
  avatar_url: null,
  job_title: 'Founder',
  bio: 'Runs the Northstar workspace day to day.',
  timezone: 'Africa/Accra',
  locale: 'en',
  preferred_currency: null,
  status: 'active',
  role: 'tenant_owner',
  email_verified_at: new Date(Date.now() - 86400000 * 120).toISOString(),
  last_login_at: new Date(Date.now() - 3600000).toISOString(),
  last_seen_at: new Date().toISOString(),
  created_at: new Date(Date.now() - 86400000 * 210).toISOString(),
};

const ACTIONS = [
  ['auth.login', 'User'],
  ['created', 'Product'],
  ['updated', 'Product'],
  ['updated', 'Store'],
  ['created', 'AccountingInvoice'],
  ['deleted', 'AdCampaign'],
  ['profile.updated', 'User'],
  ['currency.changed', 'Tenant'],
];

const activity = Array.from({ length: 64 }, (_, i) => {
  const [action, subject] = ACTIONS[i % ACTIONS.length];
  const at = new Date(Date.now() - i * 5400000 - (i % 5) * 600000);
  return {
    id: 1000 - i,
    action,
    subject_type: `App\\Models\\${subject}`,
    subject_label: subject,
    subject_id: 100 + (i % 17),
    tenant_id: 1,
    ip: `41.66.${10 + (i % 6)}.${20 + (i % 40)}`,
    diff: { before: { price: 89 }, after: { price: 94 } },
    created_at: at.toISOString(),
  };
});

const sessions = [
  { id: 1, name: 'tenant', current: true, created_at: new Date(Date.now() - 3600000).toISOString(), last_used_at: new Date().toISOString(), expires_at: null },
  { id: 2, name: 'tenant', current: false, created_at: new Date(Date.now() - 86400000 * 3).toISOString(), last_used_at: new Date(Date.now() - 86400000 * 2).toISOString(), expires_at: null },
];

const profilePayload = () => ({
  user: profileUser,
  tenant: { id: 1, name: settings.tenant.name, slug: settings.tenant.slug, status: 'active', currency: settings.settings.currency, joined_at: profileUser.created_at, is_owner: true },
  roles: [{ role: 'tenant_owner', tenant_id: 1, store_id: null, department: null }],
  permissions: ['products.manage', 'orders.manage', 'settings.manage', 'users.manage'],
  social_accounts: [],
  stats: {
    activity_total: activity.length,
    activity_last_7_days: activity.filter((a) => Date.parse(a.created_at) >= Date.now() - 7 * 86400000).length,
    active_sessions: sessions.length,
    member_since: profileUser.created_at,
    products_in_workspace: recordCounts.products,
    stores_in_workspace: 4,
  },
});

const activityStats = () => {
  const byAction = new Map();
  for (const row of activity) byAction.set(row.action, (byAction.get(row.action) ?? 0) + 1);
  const trend = [];
  for (let i = 13; i >= 0; i--) {
    const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    trend.push({ day, count: activity.filter((a) => a.created_at.slice(0, 10) === day).length });
  }
  return {
    total: activity.length,
    today: activity.filter((a) => a.created_at.slice(0, 10) === new Date().toISOString().slice(0, 10)).length,
    last_7_days: activity.filter((a) => Date.parse(a.created_at) >= Date.now() - 7 * 86400000).length,
    last_30_days: activity.filter((a) => Date.parse(a.created_at) >= Date.now() - 30 * 86400000).length,
    first_event_at: activity[activity.length - 1]?.created_at ?? null,
    last_event_at: activity[0]?.created_at ?? null,
    by_action: [...byAction.entries()].map(([action, count]) => ({ action, count })).sort((a, b) => b.count - a.count),
    trend,
  };
};

export async function handleCurrency(req, res, url, method, readBody, json) {
  const path = url.pathname;

  // ---- catalog ------------------------------------------------------------
  if (path === '/api/currency' || path === '/api/admin/currency') {
    return json(res, 200, { data: currencyPayload() }), true;
  }

  if (path === '/api/currency/convert') {
    const amount = Number(url.searchParams.get('amount') ?? 0);
    const from = url.searchParams.get('from') ?? BASE;
    const to = url.searchParams.get('to') ?? BASE;
    const value = Math.round(amount * factor(from, to) * 100) / 100;
    return json(res, 200, { data: { amount, from, to, rate: factor(from, to), value, formatted: `${meta(to).symbol}${value}` } }), true;
  }

  if (path === '/api/tenant/currency') {
    const code = settings.settings.currency;
    return json(res, 200, { data: { code, symbol: meta(code).symbol, name: meta(code).name, decimals: meta(code).decimals, rate: meta(code).rate, converted_at: null, ...currencyPayload() } }), true;
  }

  if (path === '/api/tenant/currency/preview' && method === 'POST') {
    const body = await readBody(req);
    const from = settings.settings.currency;
    const to = String(body.to || from).toUpperCase();
    const f = factor(from, to);
    return json(res, 200, {
      data: {
        from,
        to,
        factor: f,
        from_symbol: meta(from).symbol,
        to_symbol: meta(to).symbol,
        records: recordCounts,
        sample: sampleProducts.map((p) => ({ id: p.id, name: p.name, before: p.price, after: Math.round(p.price * f * 100) / 100 })),
      },
    }), true;
  }

  // ---- tenant settings ----------------------------------------------------
  if (path === '/api/tenant/settings' && method === 'GET') {
    return json(res, 200, { data: settingsPayload() }), true;
  }

  if (path === '/api/tenant/settings' && method === 'PATCH') {
    const body = await readBody(req);
    const from = settings.settings.currency;
    const to = String(body.currency || from).toUpperCase();
    let conversion = null;

    if (to !== from && body.convert_existing_prices !== false) {
      const f = factor(from, to);
      for (const p of sampleProducts) p.price = Math.round(p.price * f * 100) / 100;
      conversion = {
        from,
        to,
        factor: f,
        from_symbol: meta(from).symbol,
        to_symbol: meta(to).symbol,
        tables: { products: recordCounts.products, accounting_invoices: recordCounts.accounting_invoices },
        rows: recordCounts.products + recordCounts.accounting_invoices,
      };
    }

    const { name, business_name, country, business_details, ...rest } = body;
    Object.assign(settings.tenant, { name: name ?? settings.tenant.name, business_name, country, business_details });
    Object.assign(settings.settings, rest, { currency: to });
    return json(res, 200, { data: settingsPayload(conversion) }), true;
  }

  // ---- my account ---------------------------------------------------------
  if (path === '/api/profile' && method === 'GET') return json(res, 200, { data: profilePayload() }), true;

  if (path === '/api/profile' && method === 'PATCH') {
    const body = await readBody(req);
    Object.assign(profileUser, body);
    activity.unshift({
      id: Date.now(),
      action: 'profile.updated',
      subject_type: 'App\\Models\\User',
      subject_label: 'User',
      subject_id: profileUser.id,
      tenant_id: 1,
      ip: '41.66.10.21',
      diff: { before: null, after: body },
      created_at: new Date().toISOString(),
    });
    return json(res, 200, { data: profilePayload() }), true;
  }

  if (path === '/api/profile/password' && method === 'POST') {
    await readBody(req);
    return json(res, 200, { data: { ok: true, sessions_revoked: 1 } }), true;
  }

  if (path === '/api/profile/avatar' && method === 'POST') {
    return json(res, 201, { data: { avatar_url: profileUser.avatar_url } }), true;
  }

  if (path === '/api/profile/sessions') return json(res, 200, { data: sessions }), true;

  if (path === '/api/profile/activity') {
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1);
    const perPage = Math.min(100, Number(url.searchParams.get('per_page') ?? 20) || 20);
    const action = url.searchParams.get('action');
    const q = (url.searchParams.get('q') ?? '').toLowerCase();

    let rows = activity;
    if (action) rows = rows.filter((r) => r.action.startsWith(action));
    if (q) rows = rows.filter((r) => `${r.action} ${r.subject_label} ${r.ip}`.toLowerCase().includes(q));

    const slice = rows.slice((page - 1) * perPage, page * perPage);
    return json(res, 200, {
      data: slice,
      meta: { page, per_page: perPage, total: rows.length, last_page: Math.max(1, Math.ceil(rows.length / perPage)) },
      stats: activityStats(),
    }), true;
  }

  return false;
}
