/**
 * Mock for the tenant Report Center (/api/tenant/reports/*) so the reports page
 * can be developed against `npm start` without PHP.
 *
 * The catalogue, the permission each report needs and the `available` flag all
 * mirror `App\Support\TenantReportCatalog` on the API. Keep the two in sync when
 * a report ships: the real enforcement lives in Laravel, this file only lets the
 * console render the same shape.
 */

const iso = (daysAgo) => new Date(Date.now() - daysAgo * 86400000).toISOString();
const day = (daysAgo) => new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);
const pretty = (daysAgo) =>
  new Date(Date.now() - daysAgo * 86400000).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
const money = (n) => Math.round(n * 100) / 100;

/** Everything the tenant owner holds, mirroring TenantRole::permissionKeys(). */
export const ALL_PERMISSIONS = [
  'dashboard.view', 'analytics.view', 'reports.export',
  'catalog.view', 'catalog.manage', 'inventory.view', 'inventory.manage',
  'orders.view', 'orders.manage', 'fulfillment.manage', 'orders.refund',
  'customers.view', 'customers.manage', 'customers.message',
  'finance.view', 'finance.manage', 'payouts.manage',
  'sales.view', 'sales.manage',
  'marketing.view', 'marketing.manage', 'ads.manage',
  'support.view', 'support.manage',
  'team.view', 'team.manage', 'roles.manage', 'settings.manage', 'integrations.manage', 'backups.manage',
];

/** Report catalogue: [key, label, permission, generator?, favorite?, restricted?] */
const CATALOG = [
  {
    name: 'Sales & Orders Reports',
    icon: 'orders',
    reports: [
      ['sales_summary', 'Sales Summary Report', 'orders.view', true, true],
      ['orders_master', 'Orders Master List', 'orders.view', true, true, { customer_email: 'customers.view' }],
      ['orders_by_status', 'Orders by Status Breakdown', 'orders.view'],
      ['orders_cancelled', 'Cancelled & Refunded Orders', 'orders.view'],
      ['fulfillment_delivery', 'Fulfillment & Delivery List', 'orders.view'],
      ['discounts_coupons', 'Discounts & Coupon Redemptions', 'orders.view'],
      ['geographic_sales', 'Geographic & Regional Sales', 'orders.view'],
    ],
  },
  {
    name: 'Catalog & Inventory Reports',
    icon: 'inventory',
    reports: [
      ['inventory_stock', 'Stock On Hand & Availability', 'inventory.view', true, true],
      ['low_stock_alerts', 'Low Stock & Reorder Alerts', 'inventory.view'],
      ['inventory_valuation', 'Inventory Valuation Report', 'inventory.view'],
      ['best_sellers', 'Best-Selling Products', 'catalog.view'],
      ['slow_moving_stock', 'Slow Moving & Aging Stock', 'inventory.view'],
      ['category_performance', 'Category & Collection Performance', 'catalog.view'],
    ],
  },
  {
    name: 'Finance & Accounting Reports',
    icon: 'finance',
    reports: [
      ['invoices_breakdown', 'Customer Invoices Breakdown', 'finance.view', true, true],
      ['expenses_bills', 'Bills & Operating Expenses', 'finance.view', true],
      ['payments_ledger', 'Payments & Cash Movement Ledger', 'finance.view', true],
      ['pnl_statement', 'Profit & Loss Statement (P&L)', 'finance.view'],
      ['tax_summary', 'Tax Summary & Collected Liability', 'finance.view'],
      ['settlements_payouts', 'Platform Settlements & Payouts', 'finance.view'],
    ],
  },
  {
    name: 'Customers & Vendors Reports',
    icon: 'users',
    reports: [
      ['customers_directory', 'Customer Directory & Spending', 'customers.view'],
      ['repeat_buyers', 'Repeat Buyers & Customer Retention', 'customers.view'],
      ['vendor_payables', 'Vendor & Supplier Directory', 'finance.view'],
    ],
  },
  {
    name: 'Marketing & Advertising Reports',
    icon: 'ads',
    reports: [
      ['ads_performance', 'Ad Campaign Performance & ROI', 'marketing.view'],
      ['traffic_funnel', 'Storefront Traffic & Funnel', 'analytics.view'],
      ['store_comparison', 'Multi-Store Performance Comparison', 'analytics.view'],
    ],
  },
  {
    name: 'Audit & Operations Reports',
    icon: 'activity',
    reports: [['audit_trail', 'Tenant Activity Audit Trail', 'team.view', true]],
  },
];

const FLAT = CATALOG.flatMap((category) =>
  category.reports.map(([key, label, permission, available, favorite, restricted]) => ({
    key,
    label,
    permission,
    available: !!available,
    favorite: !!favorite,
    restricted: restricted || {},
    category: category.name,
  })),
);

const byKey = (key) => FLAT.find((r) => r.key === key);

// ------------------------------------------------------------------- datasets

const ORDERS = [
  ['#NS-48213', 'Akosua Boateng', 'akosua@example.test', 'Northstar Flagship', 'completed', 3, 268.5, 20, 236.9],
  ['#NS-48212', 'Kofi Adjei', 'kofi@example.test', 'Northstar Flagship', 'shipped', 1, 59.0, 0, 52.4],
  ['#NS-48211', 'Naa Adoley', 'naa@example.test', 'Northstar Outlet', 'processing', 2, 148.0, 15, 128.35],
  ['#NS-48210', 'Selorm Dzifa', 'selorm@example.test', 'Northstar Flagship', 'completed', 5, 412.75, 40, 361.2],
  ['#NS-48209', 'Yaa Serwaa', 'yaa@example.test', 'Northstar Outlet', 'cancelled', 1, 39.0, 0, 0],
];

const PRODUCTS = [
  ['Pulse Wireless Headphones', 'PLS-WH-01', 'Audio', 'Northstar Flagship', 42, 129.0],
  ['Nimbus Bluetooth Speaker', 'NMB-S1', 'Audio', 'Northstar Flagship', 8, 59.0],
  ['Aero USB-C Hub', 'AER-H7', 'Accessories', 'Northstar Outlet', 60, 39.0],
  ['Volt 20K Power Bank', 'VLT-20K', 'Accessories', 'Northstar Outlet', 4, 45.0],
  ['Halo Smart Bulb (2-pack)', 'HAL-2P', 'Smart Home', 'Northstar Flagship', 0, 27.5],
];

const INVOICES = [
  ['INV-2026-0148', 'Accra Food Hub', 'sent', 1250.0, 62.5, 300.0, 9],
  ['INV-2026-0147', 'Kente & Co', 'paid', 640.0, 32.0, 672.0, 16],
  ['INV-2026-0146', 'SheaGold', 'partial', 2100.0, 105.0, 900.0, 23],
  ['INV-2026-0145', 'Tema Electronics', 'overdue', 480.0, 24.0, 0.0, 41],
];

const BILLS = [
  ['BILL-3391', 'DHL Ghana', 'logistics', 'Outbound courier, September', 'paid', 412.0, 20.6],
  ['BILL-3390', 'Vodafone Business', 'utilities', 'Fibre + 5 SIMs', 'paid', 289.0, 14.45],
  ['BILL-3389', 'Klarna GH', 'software', 'Subscription, Q3', 'pending', 720.0, 36.0],
];

const PAYMENTS = [
  ['PAY-9081', 'Invoice INV-2026-0147 (Kente & Co)', 'bank_transfer', 'incoming', 672.0, 4],
  ['PAY-9080', 'Bill BILL-3391', 'mobile_money', 'outgoing', 432.6, 6],
  ['PAY-9079', 'Invoice INV-2026-0146 (SheaGold)', 'card', 'incoming', 900.0, 11],
  ['PAY-9078', 'Direct Entry', 'cash', 'outgoing', 120.0, 18],
];

const AUDIT = [
  ['Nana Owusu', 'product updated', 'Product #412', '196.173.44.12', 1],
  ['Kwame Finance', 'invoice created', 'AccountingInvoice #148', '41.66.205.7', 2],
  ['Yaw Operations', 'inventory adjusted', 'Inventory #88', '196.173.44.31', 3],
  ['Efua Marketing', 'campaign launched', 'AdCampaign #7', '41.66.205.44', 5],
];

const HELP = {
  summary:
    'This report summarises the selected window across your tenant workspace so you can review performance and reconcile it against the rest of your books.',
  compare_heading: 'How can you compare the report data with other reports?',
  points: [
    'Cross-reference the same date window with your Finance Overview to confirm the totals agree.',
    'Export to CSV or PDF for auditing, offline records, or sharing with an external accountant.',
  ],
};

function buildRows(key) {
  switch (key) {
    case 'orders_master':
      return {
        columns: [
          ['order_number', 'Order Ref', 'text', true],
          ['date', 'Date & Time', 'date', true],
          ['customer', 'Customer', 'text', true],
          ['customer_email', 'Customer Email', 'text', false],
          ['store', 'Storefront', 'text', true],
          ['status', 'Fulfillment Status', 'status', true],
          ['items_count', 'Units', 'number', false],
          ['subtotal', 'Subtotal', 'money', true],
          ['net_settlement', 'Net Payout', 'money', true],
        ],
        rows: ORDERS.map(([ref, name, email, store, status, units, subtotal, discount, net], i) => ({
          id: 48213 - i,
          order_number: ref,
          date: pretty(i) + ' 10:2' + i,
          customer: name,
          customer_email: email,
          store,
          status,
          items_count: units,
          subtotal,
          discount,
          net_settlement: net,
        })),
        kpis: [
          { label: 'Total Orders Found', value: ORDERS.length, format: 'number', tone: 'blue' },
          { label: 'Total Revenue', value: money(ORDERS.reduce((s, o) => s + o[5], 0)), format: 'money', tone: 'gold' },
          { label: 'Net Payout Amount', value: money(ORDERS.reduce((s, o) => s + o[8], 0)), format: 'money', tone: 'green' },
        ],
      };
    case 'inventory_stock':
      return {
        columns: [
          ['name', 'Product Name', 'text', true],
          ['sku', 'SKU', 'text', true],
          ['category', 'Category', 'text', true],
          ['store', 'Storefront', 'text', false],
          ['stock', 'Stock Quantity', 'number', true],
          ['status', 'Stock Status', 'status', true],
          ['price', 'Retail Price', 'money', true],
          ['total_valuation', 'Total Asset Value', 'money', true],
        ],
        rows: PRODUCTS.map(([name, sku, category, store, stock, price], i) => ({
          id: 400 + i,
          name,
          sku,
          category,
          store,
          stock,
          status: stock <= 0 ? 'out_of_stock' : stock <= 5 ? 'low_stock' : 'in_stock',
          price,
          cost_estimate: money(price * 0.65),
          total_valuation: money(stock * price),
        })),
        kpis: [
          { label: 'Total SKUs / Products', value: PRODUCTS.length, format: 'number', tone: 'blue' },
          { label: 'Total Units on Hand', value: PRODUCTS.reduce((s, p) => s + p[4], 0), format: 'number', tone: 'slate' },
          { label: 'Inventory Asset Value', value: money(PRODUCTS.reduce((s, p) => s + p[4] * p[5], 0)), format: 'money', tone: 'gold' },
        ],
      };
    case 'invoices_breakdown':
      return {
        columns: [
          ['number', 'Invoice #', 'text', true],
          ['issue_date', 'Issue Date', 'date', true],
          ['customer_name', 'Client / Customer', 'text', true],
          ['status', 'Payment Status', 'status', true],
          ['total', 'Total Invoiced', 'money', true],
          ['amount_paid', 'Paid', 'money', true],
          ['balance_due', 'Outstanding Due', 'money', true],
        ],
        rows: INVOICES.map(([number, customer, status, subtotal, tax, paid, age], i) => ({
          id: 148 - i,
          number,
          issue_date: pretty(age),
          due_date: pretty(Math.max(0, age - 14)),
          customer_name: customer,
          status,
          subtotal,
          tax_total: tax,
          total: money(subtotal + tax),
          amount_paid: paid,
          balance_due: money(subtotal + tax - paid),
        })),
        kpis: [
          { label: 'Total Invoices', value: INVOICES.length, format: 'number', tone: 'blue' },
          { label: 'Gross Invoiced', value: money(INVOICES.reduce((s, v) => s + v[3] + v[4], 0)), format: 'money', tone: 'gold' },
          { label: 'Receivables (Due)', value: money(INVOICES.reduce((s, v) => s + v[3] + v[4] - v[5], 0)), format: 'money', tone: 'danger' },
        ],
      };
    case 'expenses_bills':
      return {
        columns: [
          ['number', 'Bill #', 'text', true],
          ['expense_date', 'Bill Date', 'date', true],
          ['vendor_name', 'Vendor / Supplier', 'text', true],
          ['category', 'Expense Category', 'text', true],
          ['description', 'Memo / Details', 'text', true],
          ['status', 'Payment Status', 'status', true],
          ['total', 'Total Cost', 'money', true],
        ],
        rows: BILLS.map(([number, vendor, category, memo, status, amount, tax], i) => ({
          id: 3391 - i,
          number,
          expense_date: pretty(4 + i * 3),
          vendor_name: vendor,
          category,
          description: memo,
          status,
          amount,
          tax_amount: tax,
          total: money(amount + tax),
        })),
        kpis: [
          { label: 'Total Bills', value: BILLS.length, format: 'number', tone: 'blue' },
          { label: 'Total Operating Cost', value: money(BILLS.reduce((s, b) => s + b[5] + b[6], 0)), format: 'money', tone: 'danger' },
        ],
      };
    case 'payments_ledger':
      return {
        columns: [
          ['paid_on', 'Date', 'date', true],
          ['reference', 'Reference', 'text', true],
          ['related', 'Source Document', 'text', true],
          ['method', 'Payment Method', 'text', true],
          ['direction', 'Direction', 'status', true],
          ['amount', 'Amount', 'money', true],
        ],
        rows: PAYMENTS.map(([ref, related, method, direction, amount, age], i) => ({
          id: 9081 - i,
          paid_on: pretty(age),
          reference: ref,
          related,
          method: method.replace(/_/g, ' '),
          direction: direction === 'incoming' ? 'Money In' : 'Money Out',
          amount,
          currency: 'USD',
        })),
        kpis: [
          { label: 'Cash Collected (In)', value: money(PAYMENTS.filter((p) => p[3] === 'incoming').reduce((s, p) => s + p[4], 0)), format: 'money', tone: 'green' },
          { label: 'Cash Disbursed (Out)', value: money(PAYMENTS.filter((p) => p[3] === 'outgoing').reduce((s, p) => s + p[4], 0)), format: 'money', tone: 'danger' },
        ],
      };
    case 'audit_trail':
      return {
        columns: [
          ['date', 'Timestamp', 'date', true],
          ['actor', 'Staff / User', 'text', true],
          ['action', 'Action Performed', 'text', true],
          ['subject', 'Target Record', 'text', true],
          ['ip', 'IP Address', 'text', false],
        ],
        rows: AUDIT.map(([actor, action, subject, ip, age], i) => ({
          id: 5120 - i,
          date: pretty(age) + ' 09:1' + i + ':00',
          actor,
          action,
          subject,
          ip,
        })),
        kpis: [{ label: 'Total Audited Events', value: AUDIT.length, format: 'number', tone: 'blue' }],
      };
    case 'sales_summary':
    default: {
      const rows = Array.from({ length: 14 }, (_, i) => {
        const orders = 6 + ((i * 7) % 11);
        const gross = money(orders * (118 + ((i * 13) % 40)));
        return {
          id: day(i),
          date: pretty(i),
          orders_count: orders,
          gross_sales: gross,
          discounts: money(gross * 0.06),
          delivery_fees: money(orders * 8.5),
          commission: money(gross * 0.08),
          net_settlement: money(gross * 0.86),
          avg_order_value: money(gross / orders),
        };
      });
      const sum = (k) => money(rows.reduce((s, r) => s + r[k], 0));
      return {
        columns: [
          ['date', 'Reporting Date', 'date', true],
          ['orders_count', 'Orders', 'number', true],
          ['gross_sales', 'Gross Sales', 'money', true],
          ['discounts', 'Discounts', 'money', true],
          ['delivery_fees', 'Delivery Fees', 'money', false],
          ['commission', 'Marketplace Fee', 'money', false],
          ['net_settlement', 'Net Payout', 'money', true],
          ['avg_order_value', 'Avg Order Value', 'money', true],
        ],
        rows,
        kpis: [
          { label: 'Total Gross Sales', value: sum('gross_sales'), format: 'money', tone: 'gold' },
          { label: 'Total Orders', value: rows.reduce((s, r) => s + r.orders_count, 0), format: 'number', tone: 'blue' },
          { label: 'Net Settlement', value: sum('net_settlement'), format: 'money', tone: 'green' },
        ],
        totals: {
          date: `Total (${rows.length} days)`,
          orders_count: rows.reduce((s, r) => s + r.orders_count, 0),
          gross_sales: sum('gross_sales'),
          net_settlement: sum('net_settlement'),
        },
      };
    }
  }
}

// --------------------------------------------------------------------- handler

/**
 * @param {string[]} permissions permission keys of the signed-in mock user
 * @returns {boolean} true when the request was answered
 */
export function handleReports(req, res, url, method, _readBody, json, permissions = ALL_PERMISSIONS) {
  const path = url.pathname;
  if (method !== 'GET' || !path.startsWith('/api/tenant/reports')) return false;

  if (path === '/api/tenant/reports/catalog') {
    const categories = CATALOG.map((category) => ({
      name: category.name,
      icon: category.icon,
      reports: category.reports
        .filter(([key]) => permissions.includes(byKey(key).permission))
        .map(([key, label, permission, available, favorite]) => ({
          key,
          label,
          permission,
          available: !!available,
          favorite: !!favorite,
        })),
    })).filter((category) => category.reports.length > 0);

    json(res, 200, {
      data: { categories },
      meta: {
        total: FLAT.length,
        accessible: FLAT.filter((r) => permissions.includes(r.permission)).length,
        permissions: { can_export: permissions.includes('reports.export') },
      },
    });
    return true;
  }

  if (path === '/api/tenant/reports/generate') {
    const key = url.searchParams.get('report') || 'sales_summary';
    const report = byKey(key);

    if (!report) {
      json(res, 422, {
        error: { code: 'unprocessable', message: 'Unknown report. Pick one from the report catalogue.' },
      });
      return true;
    }

    if (!permissions.includes(report.permission)) {
      json(res, 403, {
        error: {
          code: 'forbidden',
          message: 'Your role does not include access to this report. Ask a workspace administrator if you need it.',
        },
      });
      return true;
    }

    if (!report.available) {
      json(res, 501, {
        error: { code: 'not_implemented', message: 'This report is not available in your workspace yet.' },
      });
      return true;
    }

    const built = buildRows(key);
    const blocked = Object.entries(report.restricted)
      .filter(([, needed]) => !permissions.includes(needed))
      .map(([column]) => column);

    const rows = built.rows.map((row) => {
      const next = { ...row };
      for (const column of blocked) if (column in next) next[column] = 'Restricted';
      return next;
    });

    const columns = built.columns.map(([c, label, type, selected]) =>
      blocked.includes(c)
        ? { key: c, label: `${label} (restricted)`, type, selected: false, restricted: true }
        : { key: c, label, type, selected },
    );

    const start = url.searchParams.get('start_date') || day(29);
    const end = url.searchParams.get('end_date') || day(0);
    const days = Math.max(1, Math.round((new Date(end) - new Date(start)) / 86400000) + 1);

    json(res, 200, {
      data: {
        report_key: key,
        report_name: report.label,
        category: report.category,
        generated_at: iso(0),
        tenant_name: 'Northstar Gadgets',
        store_name: 'All Stores',
        currency: 'USD',
        range: { start, end, days },
        help: HELP,
        permissions: { can_export: permissions.includes('reports.export') },
        kpis: built.kpis,
        columns,
        rows,
        totals: built.totals || { [columns[0]?.key || 'date']: `Total (${rows.length} rows)` },
      },
    });
    return true;
  }

  return false;
}
