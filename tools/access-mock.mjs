/**
 * Mock access-control endpoints for frontend-only development.
 *
 * Mirrors the JSON produced by TenantUserController, TenantRoleController,
 * TenantCustomerController and SocialAuthController so /tenant/users and the
 * customer social login behave exactly the same without PHP.
 *
 * Mounted by tools/mock-api.mjs. State lives in memory: restart to reset.
 */

const PERMISSION_GROUPS = [
  {
    key: 'workspace',
    label: 'Workspace',
    description: 'Everyday visibility across the console.',
    permissions: [
      { key: 'dashboard.view', label: 'View dashboard', description: 'Open the tenant dashboard and KPI cards.' },
      { key: 'analytics.view', label: 'View analytics', description: 'Traffic, conversion and revenue reporting.' },
      { key: 'reports.export', label: 'Export reports', description: 'Download CSV exports of console data.' },
    ],
  },
  {
    key: 'catalog',
    label: 'Catalog & inventory',
    description: 'Products, variants and stock control.',
    permissions: [
      { key: 'catalog.view', label: 'View catalog', description: 'Browse products, categories and stores.' },
      { key: 'catalog.manage', label: 'Manage catalog', description: 'Create, edit, publish and archive products.' },
      { key: 'inventory.view', label: 'View inventory', description: 'See stock levels and the stock ledger.' },
      { key: 'inventory.manage', label: 'Manage inventory', description: 'Receive, adjust, count and write off stock.' },
    ],
  },
  {
    key: 'orders',
    label: 'Orders & fulfillment',
    description: 'The order pipeline from payment to delivery.',
    permissions: [
      { key: 'orders.view', label: 'View orders', description: 'Open orders and their line items.' },
      { key: 'orders.manage', label: 'Manage orders', description: 'Advance status, edit and cancel orders.' },
      { key: 'fulfillment.manage', label: 'Fulfil & ship', description: 'Pick, pack, ship and add tracking.' },
      { key: 'orders.refund', label: 'Refund orders', description: 'Issue refunds and returns.' },
    ],
  },
  {
    key: 'customers',
    label: 'Customers',
    description: 'Shoppers who bought from this tenant.',
    permissions: [
      { key: 'customers.view', label: 'View customers', description: 'See customer profiles, spend and order history.' },
      { key: 'customers.manage', label: 'Manage customers', description: 'Edit notes, tags, segments and block abusive accounts.' },
      { key: 'customers.message', label: 'Contact customers', description: 'Send order and marketing messages.' },
    ],
  },
  {
    key: 'finance',
    label: 'Finance',
    description: 'Accounting, invoicing and payouts.',
    permissions: [
      { key: 'finance.view', label: 'View finance', description: 'Open accounting dashboards and reports.' },
      { key: 'finance.manage', label: 'Manage finance', description: 'Invoices, expenses, journals and reconciliation.' },
      { key: 'payouts.manage', label: 'Manage payouts', description: 'Settlement accounts and payout details.' },
    ],
  },
  {
    key: 'sales',
    label: 'Sales',
    description: 'Leads, pipeline and quotes.',
    permissions: [
      { key: 'sales.view', label: 'View sales workspace', description: 'Open leads, pipeline and quotes.' },
      { key: 'sales.manage', label: 'Manage sales workspace', description: 'Create and progress leads, deals and quotes.' },
    ],
  },
  {
    key: 'marketing',
    label: 'Marketing & ads',
    description: 'Campaigns, promotions and sponsored ads.',
    permissions: [
      { key: 'marketing.view', label: 'View marketing', description: 'Campaign performance and content calendar.' },
      { key: 'marketing.manage', label: 'Manage marketing', description: 'Create and edit campaigns and promotions.' },
      { key: 'ads.manage', label: 'Manage sponsored ads', description: 'Fund, launch and pause ad campaigns.' },
    ],
  },
  {
    key: 'support',
    label: 'Support',
    description: 'Help centre, tickets and live chat.',
    permissions: [
      { key: 'support.view', label: 'View support', description: 'Read tickets, chats and guides.' },
      { key: 'support.manage', label: 'Handle support', description: 'Reply, assign and resolve conversations.' },
    ],
  },
  {
    key: 'administration',
    label: 'Administration',
    description: 'Who works here and how the account is configured.',
    permissions: [
      { key: 'team.view', label: 'View system users', description: 'See staff accounts and their access.' },
      { key: 'team.manage', label: 'Manage system users', description: 'Invite, edit, suspend and remove staff.' },
      { key: 'roles.manage', label: 'Manage roles & permissions', description: 'Create roles and change what they can do.' },
      { key: 'settings.manage', label: 'Manage settings', description: 'Business profile, notifications and preferences.' },
      { key: 'integrations.manage', label: 'Manage integrations', description: 'Domains, API keys and webhooks.' },
      { key: 'backups.manage', label: 'Manage backups', description: 'Create, download and restore backups.' },
    ],
  },
];

const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((group) => group.permissions.map((p) => p.key));
const VIEW_PERMISSIONS = ALL_PERMISSIONS.filter((key) => key.endsWith('.view'));

let seq = 500;
const nextId = () => ++seq;

const roles = [
  { id: 1, key: 'owner', name: 'Owner', description: 'Unrestricted access to everything in this tenant, including billing and access control.', department: null, permissions: [...ALL_PERMISSIONS], is_system: true },
  { id: 2, key: 'manager', name: 'General manager', description: 'Runs the day-to-day business across every workspace.', department: null, permissions: ALL_PERMISSIONS.filter((k) => !['roles.manage', 'team.manage', 'backups.manage', 'integrations.manage'].includes(k)), is_system: true },
  { id: 3, key: 'finance', name: 'Finance officer', description: 'Accounting, invoicing, expenses and payouts.', department: 'finance', permissions: ['dashboard.view', 'analytics.view', 'reports.export', 'orders.view', 'customers.view', 'finance.view', 'finance.manage', 'payouts.manage'], is_system: true },
  { id: 4, key: 'sales', name: 'Sales representative', description: 'Leads, quotes, customer relationships and order follow-up.', department: 'sales', permissions: ['dashboard.view', 'catalog.view', 'orders.view', 'orders.manage', 'customers.view', 'customers.manage', 'customers.message', 'sales.view', 'sales.manage'], is_system: true },
  { id: 5, key: 'operations', name: 'Operations lead', description: 'Fulfilment, stock control and catalog upkeep.', department: 'operations', permissions: ['dashboard.view', 'catalog.view', 'catalog.manage', 'inventory.view', 'inventory.manage', 'orders.view', 'orders.manage', 'fulfillment.manage'], is_system: true },
  { id: 6, key: 'marketing', name: 'Marketing manager', description: 'Campaigns, sponsored ads and customer communications.', department: 'marketing', permissions: ['dashboard.view', 'analytics.view', 'catalog.view', 'customers.view', 'customers.message', 'marketing.view', 'marketing.manage', 'ads.manage'], is_system: true },
  { id: 7, key: 'support', name: 'Support agent', description: 'Answers tickets and live chat with read access to orders.', department: null, permissions: ['dashboard.view', 'orders.view', 'customers.view', 'customers.message', 'support.view', 'support.manage'], is_system: true },
  { id: 8, key: 'store_staff', name: 'Store staff', description: 'Shop-floor access: sell, fulfil and keep stock accurate.', department: null, permissions: ['dashboard.view', 'catalog.view', 'inventory.view', 'inventory.manage', 'orders.view', 'orders.manage', 'fulfillment.manage', 'customers.view'], is_system: true },
  { id: 9, key: 'viewer', name: 'Viewer', description: 'Read-only access for auditors, accountants and advisors.', department: null, permissions: [...VIEW_PERMISSIONS], is_system: true },
];

const STORES = [
  { id: 1, name: 'Northstar Electronics' },
  { id: 2, name: 'Northstar Outlet' },
];

const iso = (daysAgo, hour = 9) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 15, 0, 0);
  return d.toISOString();
};

const staff = [
  { id: 101, user_id: 7, name: 'Nana Owusu', email: 'owner@northstar.test', title: 'Owner', role: 'tenant_owner', status: 'active', department: null, store_id: null, tenant_role_id: 1, permissions: null, last_login_at: iso(0, 8) },
  { id: 102, user_id: 11, name: 'Kwame Finance', email: 'finance@markethub.test', title: 'Finance officer', role: 'store_staff', status: 'active', department: 'finance', store_id: 1, tenant_role_id: 3, permissions: null, last_login_at: iso(1) },
  { id: 103, user_id: 12, name: 'Abena Sales', email: 'sales@markethub.test', title: 'Sales representative', role: 'store_staff', status: 'active', department: 'sales', store_id: 1, tenant_role_id: 4, permissions: null, last_login_at: iso(2) },
  { id: 104, user_id: 13, name: 'Yaw Operations', email: 'ops@markethub.test', title: 'Operations lead', role: 'store_staff', status: 'active', department: 'operations', store_id: 1, tenant_role_id: 5, permissions: null, last_login_at: iso(3) },
  { id: 105, user_id: 14, name: 'Efua Marketing', email: 'marketing@markethub.test', title: 'Marketing manager', role: 'store_staff', status: 'active', department: 'marketing', store_id: 1, tenant_role_id: 6, permissions: null, last_login_at: iso(5) },
  { id: 106, user_id: 15, name: 'Afia Boadu', email: 'support@markethub.test', title: 'Support agent', role: 'store_staff', status: 'active', department: null, store_id: 1, tenant_role_id: 7, permissions: ['dashboard.view', 'orders.view', 'orders.manage', 'customers.view', 'customers.message', 'support.view', 'support.manage', 'reports.export'], last_login_at: iso(1, 16) },
  { id: 107, user_id: 16, name: 'Kojo Asante', email: 'warehouse@markethub.test', title: 'Warehouse lead', role: 'store_staff', status: 'invited', department: 'operations', store_id: 2, tenant_role_id: 5, permissions: null, last_login_at: null },
  { id: 108, user_id: 17, name: 'Linda Owusu', email: 'auditor@markethub.test', title: 'External auditor', role: 'store_staff', status: 'active', department: null, store_id: null, tenant_role_id: 9, permissions: null, last_login_at: iso(12) },
  { id: 109, user_id: 18, name: 'Daniel Tetteh', email: 'former.staff@markethub.test', title: 'Sales assistant', role: 'store_staff', status: 'suspended', department: 'sales', store_id: 1, tenant_role_id: 4, permissions: null, last_login_at: iso(41) },
];

const customers = [
  { id: 201, name: 'Akosua Boateng', email: 'google.customer@markethub.test', phone: '+233201234501', providers: ['google'], orders_count: 4, total_spent: 612.5, last_order_at: iso(3), joined_at: iso(210), last_login_at: iso(1), status: 'active', segment: 'vip', tags: ['high-value', 'newsletter'], notes: null, marketing_opt_in: true },
  { id: 202, name: 'Kofi Adjei', email: 'facebook.customer@markethub.test', phone: '+233201234502', providers: ['facebook'], orders_count: 2, total_spent: 188.0, last_order_at: iso(9), joined_at: iso(150), last_login_at: iso(6), status: 'active', segment: 'returning', tags: [], notes: null, marketing_opt_in: true },
  { id: 203, name: 'Naa Adoley', email: 'apple.customer@markethub.test', phone: '+233201234503', providers: ['apple'], orders_count: 1, total_spent: 94.0, last_order_at: iso(18), joined_at: iso(60), last_login_at: iso(18), status: 'active', segment: 'new', tags: [], notes: null, marketing_opt_in: false },
  { id: 204, name: 'Ama Mensah', email: 'customer@markethub.test', phone: '+233201111111', providers: ['google'], orders_count: 11, total_spent: 1486.25, last_order_at: iso(1), joined_at: iso(420), last_login_at: iso(0, 7), status: 'active', segment: 'vip', tags: ['loyalty'], notes: 'Top buyer — always ships to Accra.', marketing_opt_in: true },
  { id: 205, name: 'Selorm Dzifa', email: 'selorm@markethub.test', phone: '+233201234504', providers: [], orders_count: 3, total_spent: 274.0, last_order_at: iso(21), joined_at: iso(190), last_login_at: iso(20), status: 'active', segment: 'returning', tags: [], notes: null, marketing_opt_in: false },
  { id: 206, name: 'Yaa Serwaa', email: 'yaa@markethub.test', phone: '+233201234505', providers: ['google'], orders_count: 2, total_spent: 143.0, last_order_at: iso(33), joined_at: iso(95), last_login_at: iso(30), status: 'active', segment: null, tags: [], notes: null, marketing_opt_in: true },
  { id: 207, name: 'Ibrahim Musah', email: 'ibrahim@markethub.test', phone: '+233201234506', providers: [], orders_count: 1, total_spent: 39.0, last_order_at: iso(74), joined_at: iso(80), last_login_at: iso(70), status: 'blocked', segment: null, tags: ['watchlist'], notes: 'Repeated chargebacks — blocked pending review.', marketing_opt_in: false },
];

const PROVIDER_LABELS = { google: 'Google', facebook: 'Facebook', apple: 'Apple', github: 'GitHub' };

const roleById = (id) => roles.find((role) => role.id === Number(id)) ?? null;

const effectivePermissions = (member) => {
  if (member.role === 'tenant_owner') return [...ALL_PERMISSIONS];
  if (member.status === 'suspended') return [];
  if (Array.isArray(member.permissions)) return [...member.permissions];
  return [...(roleById(member.tenant_role_id)?.permissions ?? [])];
};

const staffPayload = (member) => {
  const role = roleById(member.tenant_role_id);
  const store = STORES.find((s) => s.id === member.store_id) ?? null;
  return {
    id: member.id,
    user_id: member.user_id,
    name: member.name,
    email: member.email,
    phone: member.phone ?? null,
    avatar_url: null,
    title: member.title ?? null,
    role: member.role,
    access_level: member.role,
    status: member.status,
    department: member.department,
    store_id: member.store_id,
    store: store ? { id: store.id, name: store.name } : null,
    tenant_role_id: member.tenant_role_id,
    tenant_role: role
      ? { id: role.id, key: role.key, name: role.name, department: role.department, permissions: role.permissions }
      : null,
    permissions: effectivePermissions(member),
    custom_permissions: Array.isArray(member.permissions),
    is_owner: member.role === 'tenant_owner',
    last_login_at: member.last_login_at,
    invited_at: member.invited_at ?? null,
    created_at: member.created_at ?? iso(120),
  };
};

const rolePayload = (role) => ({
  ...role,
  is_owner_role: role.key === 'owner',
  users_count: staff.filter((member) => member.tenant_role_id === role.id).length,
  updated_at: new Date().toISOString(),
});

const customerPayload = (customer) => ({
  id: customer.id,
  name: customer.name,
  email: customer.email,
  phone: customer.phone,
  avatar_url: null,
  account_status: 'active',
  status: customer.status,
  segment: customer.segment ?? (customer.orders_count > 1 ? 'returning' : 'new'),
  tags: customer.tags ?? [],
  notes: customer.notes ?? null,
  marketing_opt_in: !!customer.marketing_opt_in,
  orders_count: customer.orders_count,
  total_spent: customer.total_spent,
  average_order_value: customer.orders_count
    ? Math.round((customer.total_spent / customer.orders_count) * 100) / 100
    : 0,
  first_order_at: customer.joined_at,
  last_order_at: customer.last_order_at,
  joined_at: customer.joined_at,
  last_login_at: customer.last_login_at,
  login_methods: ['password', ...customer.providers],
  social_accounts: customer.providers.map((provider) => ({
    provider,
    label: PROVIDER_LABELS[provider] ?? provider,
    email: customer.email,
    nickname: customer.name,
    avatar_url: null,
    last_login_at: customer.last_login_at,
  })),
  orders: Array.from({ length: Math.min(customer.orders_count, 5) }, (_, index) => ({
    id: customer.id * 10 + index,
    order_id: 4800 + customer.id + index,
    status: ['completed', 'shipped', 'processing'][index % 3],
    total: Math.round((customer.total_spent / Math.max(customer.orders_count, 1)) * 100) / 100,
    currency: 'USD',
    placed_at: iso(3 + index * 9),
  })),
});

const socialStates = new Map();

export async function handleAccess(req, res, url, method, readBody, json) {
  const path = url.pathname;

  // -------------------------------------------------------- social login
  if (path === '/api/auth/social/providers' && method === 'GET') {
    json(res, 200, {
      data: [
        { key: 'google', label: 'Google', color: '#ffffff', mode: 'demo' },
        { key: 'facebook', label: 'Facebook', color: '#1877f2', mode: 'demo' },
        { key: 'apple', label: 'Apple', color: '#000000', mode: 'demo' },
      ],
    });
    return true;
  }

  const socialRedirect = path.match(/^\/api\/auth\/social\/([a-z]+)\/redirect$/);
  if (socialRedirect && method === 'POST') {
    const provider = socialRedirect[1];
    const body = await readBody(req);
    const state = `mock-${provider}-${Math.random().toString(36).slice(2, 12)}`;
    socialStates.set(state, provider);
    const redirectUri = body.redirect_uri || `${url.origin}/auth/callback/${provider}`;
    const joiner = redirectUri.includes('?') ? '&' : '?';
    json(res, 200, {
      data: {
        provider,
        state,
        mode: 'demo',
        url: `${redirectUri}${joiner}code=demo.${provider}.${Math.random().toString(36).slice(2, 10)}&state=${state}`,
        expires_in: 600,
      },
    });
    return true;
  }

  const socialCallback = path.match(/^\/api\/auth\/social\/([a-z]+)\/callback$/);
  if (socialCallback && method === 'POST') {
    const provider = socialCallback[1];
    const body = await readBody(req);
    if (!body.state || socialStates.get(body.state) !== provider) {
      json(res, 422, { error: { code: 'validation_error', message: 'This sign-in attempt expired. Please try again.' } });
      return true;
    }
    socialStates.delete(body.state);
    const names = { google: 'Akosua Boateng', facebook: 'Kofi Adjei', apple: 'Naa Adoley' };
    json(res, 200, {
      data: {
        token: `mock-social-${provider}`,
        user: {
          id: 900,
          name: names[provider] ?? 'Marketplace customer',
          email: `${provider}.customer@markethub.test`,
          role: 'customer',
          tenant_id: null,
          roles: [{ role: 'customer', tenant_id: null, store_id: null, department: null }],
          social_accounts: [{ provider, label: PROVIDER_LABELS[provider] ?? provider }],
        },
      },
      meta: { provider, created: false, demo: true },
    });
    return true;
  }

  // --------------------------------------------------------- system users
  const isUsersRoot = path === '/api/tenant/users' || path === '/api/tenant/staff';
  if (isUsersRoot && method === 'GET') {
    const search = (url.searchParams.get('search') || '').toLowerCase();
    const status = url.searchParams.get('status') || '';
    const roleKey = url.searchParams.get('role') || '';
    const department = url.searchParams.get('department') || '';

    const rows = staff.filter((member) => {
      if (search && !`${member.name} ${member.email}`.toLowerCase().includes(search)) return false;
      if (status && member.status !== status) return false;
      if (roleKey && roleById(member.tenant_role_id)?.key !== roleKey) return false;
      if (department && member.department !== department) return false;
      return true;
    });

    json(res, 200, {
      data: rows.map(staffPayload),
      stats: {
        total: staff.length,
        active: staff.filter((m) => m.status === 'active').length,
        invited: staff.filter((m) => m.status === 'invited').length,
        suspended: staff.filter((m) => m.status === 'suspended').length,
        owners: staff.filter((m) => m.role === 'tenant_owner').length,
        customised: staff.filter((m) => Array.isArray(m.permissions)).length,
      },
      meta: {
        departments: ['finance', 'sales', 'operations', 'marketing'],
        roles: ['tenant_owner', 'store_staff'],
        access_levels: [
          { key: 'tenant_owner', label: 'Owner', description: 'Unrestricted access, including access control and billing. Permissions cannot be narrowed.' },
          { key: 'store_staff', label: 'Staff', description: 'Signs into the console with exactly the permissions ticked below.' },
        ],
        statuses: ['active', 'invited', 'suspended'],
        tenant_roles: roles.map(rolePayload),
        permission_groups: PERMISSION_GROUPS,
        stores: STORES,
        can_manage: true,
      },
    });
    return true;
  }

  if (isUsersRoot && method === 'POST') {
    const body = await readBody(req);
    const role = roleById(body.tenant_role_id) ?? roles.find((r) => r.key === 'store_staff');
    const member = {
      id: nextId(),
      user_id: nextId(),
      name: body.name,
      email: body.email,
      phone: body.phone ?? null,
      title: body.title ?? null,
      role: body.role || 'store_staff',
      status: body.status || 'invited',
      department: body.department ?? role?.department ?? null,
      store_id: body.store_id ?? null,
      tenant_role_id: role?.id ?? null,
      permissions: samePermissions(body.permissions, role?.permissions) ? null : body.permissions ?? null,
      last_login_at: null,
      invited_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    staff.push(member);
    json(res, 201, { data: staffPayload(member), meta: { temporary_password: 'Mock-' + Math.random().toString(36).slice(2, 10) } });
    return true;
  }

  const userMatch = path.match(/^\/api\/tenant\/(?:users|staff)\/(\d+)$/);
  if (userMatch) {
    const member = staff.find((m) => m.id === Number(userMatch[1]));
    if (!member) {
      json(res, 404, { error: { code: 'not_found', message: 'Resource not found.' } });
      return true;
    }

    if (method === 'PATCH') {
      const body = await readBody(req);
      const role = body.tenant_role_id !== undefined ? roleById(body.tenant_role_id) : roleById(member.tenant_role_id);
      Object.assign(member, {
        name: body.name ?? member.name,
        phone: body.phone !== undefined ? body.phone : member.phone,
        title: body.title !== undefined ? body.title : member.title,
        role: body.role ?? member.role,
        status: body.status ?? member.status,
        department: body.department !== undefined ? body.department : member.department,
        store_id: body.store_id !== undefined ? body.store_id : member.store_id,
        tenant_role_id: role?.id ?? member.tenant_role_id,
      });
      if (body.permissions !== undefined) {
        member.permissions = samePermissions(body.permissions, role?.permissions) ? null : body.permissions;
      }
      json(res, 200, { data: staffPayload(member) });
      return true;
    }

    if (method === 'DELETE') {
      staff.splice(staff.indexOf(member), 1);
      json(res, 200, { data: { ok: true } });
      return true;
    }
  }

  const passwordMatch = path.match(/^\/api\/tenant\/(?:users|staff)\/(\d+)\/password$/);
  if (passwordMatch && method === 'POST') {
    json(res, 200, { data: { ok: true }, meta: { temporary_password: 'Mock-' + Math.random().toString(36).slice(2, 10) } });
    return true;
  }

  // ---------------------------------------------------------------- roles
  if (path === '/api/tenant/roles' && method === 'GET') {
    json(res, 200, {
      data: roles.map(rolePayload),
      meta: { permission_groups: PERMISSION_GROUPS, departments: ['finance', 'sales', 'operations', 'marketing'], can_manage: true },
    });
    return true;
  }

  if (path === '/api/tenant/roles' && method === 'POST') {
    const body = await readBody(req);
    const role = {
      id: nextId(),
      key: String(body.name || 'role').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
      name: body.name,
      description: body.description ?? null,
      department: body.department ?? null,
      permissions: body.permissions ?? [],
      is_system: false,
    };
    roles.push(role);
    json(res, 201, { data: rolePayload(role) });
    return true;
  }

  const roleMatch = path.match(/^\/api\/tenant\/roles\/(\d+)$/);
  if (roleMatch) {
    const role = roleById(roleMatch[1]);
    if (!role) {
      json(res, 404, { error: { code: 'not_found', message: 'Resource not found.' } });
      return true;
    }

    if (method === 'PATCH') {
      if (role.key === 'owner') {
        json(res, 422, { error: { code: 'validation_error', message: 'The owner role always holds every permission and cannot be edited.' } });
        return true;
      }
      const body = await readBody(req);
      Object.assign(role, {
        name: body.name ?? role.name,
        description: body.description !== undefined ? body.description : role.description,
        department: body.department !== undefined ? body.department : role.department,
        permissions: body.permissions ?? role.permissions,
      });
      json(res, 200, { data: rolePayload(role) });
      return true;
    }

    if (method === 'DELETE') {
      if (role.is_system) {
        json(res, 422, { error: { code: 'validation_error', message: 'Built-in roles cannot be deleted.' } });
        return true;
      }
      if (staff.some((member) => member.tenant_role_id === role.id)) {
        json(res, 422, { error: { code: 'validation_error', message: `${role.name} is still assigned to someone.` } });
        return true;
      }
      roles.splice(roles.indexOf(role), 1);
      json(res, 200, { data: { deleted: true } });
      return true;
    }
  }

  // ------------------------------------------------------------ customers
  if (path === '/api/tenant/customers' && method === 'GET') {
    const search = (url.searchParams.get('search') || '').toLowerCase();
    const status = url.searchParams.get('status') || '';
    const provider = url.searchParams.get('provider') || '';
    const sort = url.searchParams.get('sort') || 'spend_desc';
    const page = Math.max(1, Number(url.searchParams.get('page') || 1));
    const perPage = Math.max(5, Number(url.searchParams.get('per_page') || 20));

    let rows = customers.filter((customer) => {
      if (search && !`${customer.name} ${customer.email} ${customer.phone}`.toLowerCase().includes(search)) return false;
      if (status === 'blocked' && customer.status !== 'blocked') return false;
      if (status === 'active' && customer.status === 'blocked') return false;
      if (status === 'repeat' && customer.orders_count <= 1) return false;
      if (status === 'social' && !customer.providers.length) return false;
      if (status === 'password' && customer.providers.length) return false;
      if (provider && !customer.providers.includes(provider)) return false;
      return true;
    });

    const sorters = {
      spend_desc: (a, b) => b.total_spent - a.total_spent,
      spend_asc: (a, b) => a.total_spent - b.total_spent,
      orders_desc: (a, b) => b.orders_count - a.orders_count,
      recent_desc: (a, b) => (b.last_order_at || '').localeCompare(a.last_order_at || ''),
      name_asc: (a, b) => a.name.localeCompare(b.name),
      joined_desc: (a, b) => (b.joined_at || '').localeCompare(a.joined_at || ''),
    };
    rows = [...rows].sort(sorters[sort] ?? sorters.spend_desc);

    const total = rows.length;
    const slice = rows.slice((page - 1) * perPage, page * perPage);
    const revenue = customers.reduce((sum, c) => sum + c.total_spent, 0);

    json(res, 200, {
      data: slice.map(customerPayload),
      meta: {
        page,
        per_page: perPage,
        total,
        last_page: Math.max(1, Math.ceil(total / perPage)),
        providers: Object.entries(PROVIDER_LABELS).map(([key, label]) => ({
          key,
          label,
          count: customers.filter((c) => c.providers.includes(key)).length,
        })),
        segments: ['new', 'returning', 'vip', 'wholesale'],
        can_manage: true,
      },
      stats: {
        total: customers.length,
        blocked: customers.filter((c) => c.status === 'blocked').length,
        repeat: customers.filter((c) => c.orders_count > 1).length,
        new_this_month: 2,
        social_logins: customers.filter((c) => c.providers.length).length,
        revenue: Math.round(revenue * 100) / 100,
        average_spend: Math.round((revenue / customers.length) * 100) / 100,
      },
    });
    return true;
  }

  const customerMatch = path.match(/^\/api\/tenant\/customers\/(\d+)$/);
  if (customerMatch) {
    const customer = customers.find((c) => c.id === Number(customerMatch[1]));
    if (!customer) {
      json(res, 404, { error: { code: 'not_found', message: 'Resource not found.' } });
      return true;
    }

    if (method === 'GET') {
      json(res, 200, { data: customerPayload(customer) });
      return true;
    }

    if (method === 'PATCH') {
      const body = await readBody(req);
      Object.assign(customer, {
        status: body.status ?? customer.status,
        segment: body.segment !== undefined ? body.segment : customer.segment,
        tags: body.tags ?? customer.tags,
        notes: body.notes !== undefined ? body.notes : customer.notes,
        marketing_opt_in: body.marketing_opt_in ?? customer.marketing_opt_in,
      });
      json(res, 200, { data: customerPayload(customer) });
      return true;
    }
  }

  return false;
}

function samePermissions(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
}
