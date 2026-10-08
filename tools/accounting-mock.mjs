/** In-memory tenant accounting API for frontend-only development. */
let sequence = 200;
const nextId = () => ++sequence;
const today = (offset = 0) => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
const iso = (days = 0) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString(); };

const contacts = [
  { id: 1, type: 'customer', name: 'Atlas Retail Group', email: 'accounts@atlas-retail.test', phone: '+233 20 555 0140', tax_id: 'TIN-ATLAS-2201', address: '18 Liberation Road, Accra', currency: 'USD', payment_terms: 30, opening_balance: '0.00', is_active: true, invoices_count: 6, purchase_orders_count: 0 },
  { id: 2, type: 'vendor', name: 'Meridian Supply Co.', email: 'orders@meridian-supply.test', phone: '+233 30 255 0194', tax_id: 'TIN-MER-8912', address: '4 Harbour Link, Tema', currency: 'USD', payment_terms: 30, opening_balance: '0.00', is_active: true, invoices_count: 0, purchase_orders_count: 3 },
  { id: 3, type: 'vendor', name: 'Swiftline Logistics', email: 'billing@swiftline.test', phone: '+233 55 310 2210', tax_id: null, address: 'Airport City, Accra', currency: 'USD', payment_terms: 14, opening_balance: '0.00', is_active: true, invoices_count: 0, purchase_orders_count: 0 },
  { id: 4, type: 'both', name: 'Cedar House Trading', email: 'finance@cedarhouse.test', phone: '+233 24 880 9912', tax_id: 'TIN-CDR-1048', address: 'Osu, Accra', currency: 'USD', payment_terms: 30, opening_balance: '0.00', is_active: true, invoices_count: 1, purchase_orders_count: 1 },
];

const invoiceRow = (id, number, offset, dueOffset, status, total, paid, label) => ({
  id, number, contact_id: 1, customer_name: 'Atlas Retail Group', customer_email: 'accounts@atlas-retail.test',
  issue_date: today(offset), due_date: today(dueOffset), status,
  subtotal: +(total / 1.05).toFixed(2), tax_total: +(total - total / 1.05).toFixed(2), discount_total: 0,
  total, amount_paid: paid, balance_due: total - paid, currency: 'USD', notes: 'Thank you for your business.',
  items: [{ id: id * 10, description: label, quantity: 1, unit_price: +(total / 1.05).toFixed(2), tax_rate: 5, line_total: total }], payments: [],
});
const invoices = [
  invoiceRow(1, 'INV-2026-NOR-0001', -75, -45, 'paid', 1860, 1860, 'Quarterly wholesale order'),
  invoiceRow(2, 'INV-2026-NOR-0002', -42, -12, 'paid', 1248.5, 1248.5, 'Store replenishment'),
  invoiceRow(3, 'INV-2026-NOR-0003', -24, -6, 'overdue', 2160, 0, 'Corporate equipment order'),
  invoiceRow(4, 'INV-2026-NOR-0004', -14, 16, 'partial', 980, 400, 'Monthly supply contract'),
  invoiceRow(5, 'INV-2026-NOR-0005', -5, 25, 'sent', 1540, 0, 'Retail stock allocation'),
  invoiceRow(6, 'INV-2026-NOR-0006', -1, 29, 'draft', 675, 0, 'Special product bundle'),
];

const payments = [
  { id: 1, reference: 'PAY-2026-NOR-I001', direction: 'incoming', method: 'bank_transfer', amount: 1860, currency: 'USD', paid_on: today(-67), invoice: { id: 1, number: invoices[0].number, customer_name: invoices[0].customer_name }, expense: null },
  { id: 2, reference: 'PAY-2026-NOR-I002', direction: 'incoming', method: 'card', amount: 1248.5, currency: 'USD', paid_on: today(-34), invoice: { id: 2, number: invoices[1].number, customer_name: invoices[1].customer_name }, expense: null },
  { id: 3, reference: 'PAY-2026-NOR-I004', direction: 'incoming', method: 'bank_transfer', amount: 400, currency: 'USD', paid_on: today(-5), invoice: { id: 4, number: invoices[3].number, customer_name: invoices[3].customer_name }, expense: null },
];

const expenses = [
  { id: 1, number: 'BILL-2026-NOR-0001', vendor_id: 3, vendor_name: 'Swiftline Logistics', category: 'Shipping', description: 'Inventory freight and handling', expense_date: today(-52), due_date: today(-42), amount: 430, tax_amount: 21.5, total: 451.5, currency: 'USD', status: 'paid', receipt_reference: 'REC-1001' },
  { id: 2, number: 'BILL-2026-NOR-0002', vendor_id: 2, vendor_name: 'Meridian Supply Co.', category: 'Software', description: 'Commerce platform software', expense_date: today(-32), due_date: today(-22), amount: 149, tax_amount: 0, total: 149, currency: 'USD', status: 'paid', receipt_reference: 'REC-1002' },
  { id: 3, number: 'BILL-2026-NOR-0003', vendor_id: 2, vendor_name: 'Meridian Supply Co.', category: 'Marketing', description: 'Performance marketing creative', expense_date: today(-18), due_date: today(-8), amount: 620, tax_amount: 31, total: 651, currency: 'USD', status: 'paid', receipt_reference: 'REC-1003' },
  { id: 4, number: 'BILL-2026-NOR-0004', vendor_id: 3, vendor_name: 'Swiftline Logistics', category: 'Utilities', description: 'Warehouse utilities', expense_date: today(-12), due_date: today(-2), amount: 285, tax_amount: 14.25, total: 299.25, currency: 'USD', status: 'overdue', receipt_reference: 'REC-1004' },
  { id: 5, number: 'BILL-2026-NOR-0005', vendor_id: 2, vendor_name: 'Meridian Supply Co.', category: 'Inventory', description: 'Incoming inventory deposit', expense_date: today(-4), due_date: today(10), amount: 1450, tax_amount: 72.5, total: 1522.5, currency: 'USD', status: 'pending', receipt_reference: 'REC-1005' },
];
expenses.slice(0, 3).forEach((expense, index) => payments.push({ id: 10 + index, reference: `PAY-2026-NOR-E00${index + 1}`, direction: 'outgoing', method: 'bank_transfer', amount: expense.total, currency: 'USD', paid_on: today(-45 + index * 14), invoice: null, expense: { id: expense.id, number: expense.number, vendor_name: expense.vendor_name, description: expense.description } }));

const poRow = (id, status, offset, total, label) => ({
  id, number: `PO-2026-NOR-000${id}`, vendor_id: 2, vendor_name: 'Meridian Supply Co.', vendor: { id: 2, name: 'Meridian Supply Co.', email: 'orders@meridian-supply.test' },
  order_date: today(offset), expected_date: today(offset + 18), status, subtotal: +(total / 1.05).toFixed(2), tax_total: +(total - total / 1.05).toFixed(2), total, currency: 'USD', notes: `Procurement request: ${label}`,
  items: [{ id: id * 10, description: label, sku: `SUP-${100 + id}`, quantity: 20 + id * 10, received_quantity: status === 'received' ? 20 + id * 10 : 0, unit_cost: +(total / 1.05 / (20 + id * 10)).toFixed(2), tax_rate: 5 }],
});
const purchaseOrders = [
  poRow(1, 'received', -65, 2750, 'Core inventory restock'),
  poRow(2, 'ordered', -9, 1860, 'Holiday inventory batch'),
  poRow(3, 'pending_approval', -2, 920, 'Packaging and fulfilment supplies'),
];

const accountRows = [
  ['1000', 'Cash and bank', 'asset', 3508.5, 1251.5, 'Cash and cash equivalents'],
  ['1100', 'Accounts receivable', 'asset', 7788.5, 3508.5, 'Customer balances due'],
  ['1200', 'Inventory', 'asset', 0, 0, 'Inventory held for sale'],
  ['1300', 'Recoverable input tax', 'asset', 139.25, 0, 'Tax paid on business purchases'],
  ['2000', 'Accounts payable', 'liability', 1251.5, 3073.25, 'Supplier balances due'],
  ['2100', 'Sales tax payable', 'liability', 0, 370.88, 'Tax collected on sales'],
  ['3000', 'Owner equity', 'equity', 0, 0, 'Owner capital and retained earnings'],
  ['4000', 'Sales revenue', 'income', 0, 7417.62, 'Product and service sales'],
  ['4100', 'Shipping income', 'income', 0, 0, 'Delivery revenue'],
  ['5000', 'Cost of goods sold', 'expense', 0, 0, 'Direct product cost'],
  ['6000', 'Inventory purchases', 'expense', 1450, 0, 'Inventory and packaging purchases'],
  ['6100', 'Shipping and delivery', 'expense', 430, 0, 'Freight and fulfilment costs'],
  ['6200', 'Marketing and advertising', 'expense', 620, 0, 'Campaign and creative costs'],
  ['6300', 'Software and subscriptions', 'expense', 149, 0, 'Software services'],
  ['6400', 'Rent and occupancy', 'expense', 0, 0, 'Premises and occupancy costs'],
  ['6500', 'Payroll', 'expense', 0, 0, 'Payroll and contractor costs'],
  ['6600', 'Utilities', 'expense', 285, 0, 'Utilities and connectivity'],
  ['6700', 'Professional services', 'expense', 0, 0, 'Legal, accounting and consulting'],
  ['6800', 'Tax expense', 'expense', 0, 0, 'Non-recoverable business tax'],
  ['6900', 'Other operating expense', 'expense', 0, 0, 'Other operating costs'],
];
const accounts = accountRows.map(([code, name, type, debit, credit, description], index) => ({ id: 100 + index, code, name, type, subtype: null, system_key: name.toLowerCase().replaceAll(' ', '_'), description, is_system: true, is_active: true, debit_total: debit, credit_total: credit, balance: ['asset', 'expense'].includes(type) ? debit - credit : credit - debit }));
const journals = [
  ...invoices.filter((invoice) => invoice.status !== 'draft').map((invoice, index) => ({ id: 300 + index, number: `JRN-2026-${String(index + 1).padStart(5, '0')}`, entry_date: invoice.issue_date, reference: invoice.number, memo: `Sales invoice ${invoice.number}`, status: 'posted', source_type: 'invoice', source_id: invoice.id, total_debit: invoice.total, total_credit: invoice.total, lines: [] })),
  ...expenses.map((expense, index) => ({ id: 320 + index, number: `JRN-2026-${String(index + 6).padStart(5, '0')}`, entry_date: expense.expense_date, reference: expense.number, memo: `Supplier bill ${expense.number}`, status: 'posted', source_type: 'expense', source_id: expense.id, total_debit: expense.total, total_credit: expense.total, lines: [] })),
  ...payments.map((payment, index) => ({ id: 340 + index, number: `JRN-2026-${String(index + 11).padStart(5, '0')}`, entry_date: payment.paid_on, reference: payment.reference, memo: payment.direction === 'incoming' ? 'Customer payment' : 'Supplier payment', status: 'posted', source_type: `${payment.direction}_payment`, source_id: payment.id, total_debit: payment.amount, total_credit: payment.amount, lines: [] })),
].sort((a, b) => b.entry_date.localeCompare(a.entry_date));
const bankAccounts = [{ id: 1, ledger_account_id: 100, name: 'Primary operating account', bank_name: 'MarketHub Demo Bank', account_number_last4: '4101', currency: 'USD', opening_balance: 0, is_active: true, transactions_count: payments.length + 2, unmatched_count: 3, ledger_balance: 2257, difference: 256.5, statement_balance: payments.reduce((sum, payment) => sum + (payment.direction === 'incoming' ? payment.amount : -payment.amount), 256.5) }];
const bankTransactions = [
  ...payments.map((payment, index) => { const matched = index < payments.length - 1; return { id: 500 + index, bank_account_id: 1, payment_id: matched ? payment.id : null, transaction_date: payment.paid_on, description: payment.direction === 'incoming' ? 'Customer receipt' : 'Supplier payment', reference: `STM-${payment.reference}`, amount: payment.direction === 'incoming' ? payment.amount : -payment.amount, status: matched ? 'matched' : 'unmatched', reconciled_at: matched ? iso() : null, bank_account: { id: 1, name: bankAccounts[0].name, currency: 'USD' }, payment: matched ? payment : null }; }),
  { id: 590, bank_account_id: 1, payment_id: null, transaction_date: today(-1), description: 'Bank service charge', reference: 'STM-NOR-FEE', amount: -18.5, status: 'unmatched', bank_account: { id: 1, name: bankAccounts[0].name, currency: 'USD' }, payment: null },
  { id: 591, bank_account_id: 1, payment_id: null, transaction_date: today(), description: 'Unidentified customer transfer', reference: 'STM-NOR-UNIDENTIFIED', amount: 275, status: 'unmatched', bank_account: { id: 1, name: bankAccounts[0].name, currency: 'USD' }, payment: null },
].sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));

const paginate = (res, json, rows, url) => json(res, 200, { data: rows, meta: { page: 1, per_page: 100, total: rows.length, last_page: 1 } });
const filtered = (rows, url, fields, statusField = 'status') => {
  const search = (url.searchParams.get('search') || '').toLowerCase();
  const status = url.searchParams.get('status') || '';
  return rows.filter((row) => (!status || row[statusField] === status) && (!search || fields.some((field) => String(row[field] || '').toLowerCase().includes(search))));
};
const lineTotals = (items, key) => {
  let subtotal = 0; let tax = 0;
  const mapped = items.map((item) => {
    const lineSubtotal = +((+item.quantity || 0) * (+item[key] || 0)).toFixed(2);
    const lineTax = +(lineSubtotal * ((+item.tax_rate || 0) / 100)).toFixed(2);
    subtotal += lineSubtotal; tax += lineTax;
    return { id: nextId(), ...item, line_subtotal: lineSubtotal, line_tax: lineTax, line_total: lineSubtotal + lineTax };
  });
  return { subtotal: +subtotal.toFixed(2), tax: +tax.toFixed(2), items: mapped };
};

export async function handleAccounting(req, res, url, method, readBody, json) {
  const path = url.pathname;
  if (!path.startsWith('/api/tenant/accounting')) return false;

  if (path === '/api/tenant/accounting/dashboard' && method === 'GET') {
    const incoming = payments.filter((p) => p.direction === 'incoming').reduce((sum, p) => sum + p.amount, 0);
    const outgoing = payments.filter((p) => p.direction === 'outgoing').reduce((sum, p) => sum + p.amount, 0);
    const receivables = invoices.filter((i) => i.status !== 'void').reduce((sum, i) => sum + i.balance_due, 0);
    const payables = expenses.filter((e) => !['paid', 'void'].includes(e.status)).reduce((sum, e) => sum + e.total, 0);
    const committed = purchaseOrders.filter((po) => ['pending_approval', 'approved', 'ordered', 'partially_received'].includes(po.status)).reduce((sum, po) => sum + po.total, 0);
    const cashFlow = [
      ['May', 1780, 410], ['Jun', 2350, 820], ['Jul', 1680, 530], ['Aug', 3108.5, 600.5], ['Sep', 2260, 800], ['Oct', 400, 651],
    ].map(([label, moneyIn, moneyOut], index) => ({ label, month: `2026-${String(5 + index).padStart(2, '0')}`, incoming: moneyIn, outgoing: moneyOut }));
    const recent = [
      { type: 'invoice', title: `${invoices[5].number} · ${invoices[5].customer_name}`, amount: invoices[5].total, status: invoices[5].status, at: iso(-1) },
      { type: 'purchase_order', title: `${purchaseOrders[2].number} · ${purchaseOrders[2].vendor_name}`, amount: purchaseOrders[2].total, status: purchaseOrders[2].status, at: iso(-2) },
      { type: 'expense', title: expenses[4].description, amount: expenses[4].total, status: expenses[4].status, at: iso(-4) },
      { type: 'invoice', title: `${invoices[4].number} · ${invoices[4].customer_name}`, amount: invoices[4].total, status: invoices[4].status, at: iso(-5) },
      { type: 'purchase_order', title: `${purchaseOrders[1].number} · ${purchaseOrders[1].vendor_name}`, amount: purchaseOrders[1].total, status: purchaseOrders[1].status, at: iso(-9) },
    ];
    json(res, 200, { data: {
      currency: 'USD',
      kpis: { cash_balance: +(incoming - outgoing).toFixed(2), receivables, payables, net_cash_flow: +(incoming - outgoing).toFixed(2), cash_in: incoming, cash_out: outgoing, overdue_invoices: invoices.filter((i) => i.status === 'overdue').length, open_bills: expenses.filter((e) => !['paid', 'void'].includes(e.status)).length, pending_settlements: 2340, committed_spend: committed },
      cash_flow: cashFlow, aging: { current: 2120, '1_30': 2160, '31_60': 0, '61_90': 0, over_90: 0 },
      invoice_statuses: { draft: 1, sent: 1, partial: 1, paid: 2, overdue: 1 }, purchase_statuses: { received: 1, ordered: 1, pending_approval: 1 }, recent_activity: recent,
    } }); return true;
  }

  if (path === '/api/tenant/accounting/invoices' && method === 'GET') return paginate(res, json, filtered(invoices, url, ['number', 'customer_name', 'customer_email']), url) || true;
  if (path === '/api/tenant/accounting/invoices' && method === 'POST') {
    const body = await readBody(req); const totals = lineTotals(body.items || [], 'unit_price'); const total = +(totals.subtotal + totals.tax - (+body.discount_total || 0)).toFixed(2);
    const invoice = { id: nextId(), number: `INV-2026-NOR-${String(invoices.length + 1).padStart(4, '0')}`, contact_id: body.contact_id || null, customer_name: body.customer_name, customer_email: body.customer_email, issue_date: body.issue_date, due_date: body.due_date, status: body.send_now ? 'sent' : 'draft', subtotal: totals.subtotal, tax_total: totals.tax, discount_total: +body.discount_total || 0, total, amount_paid: 0, balance_due: total, currency: body.currency || 'USD', notes: body.notes, items: totals.items, payments: [] };
    invoices.unshift(invoice); return json(res, 201, { data: invoice }) || true;
  }
  let match = path.match(/^\/api\/tenant\/accounting\/invoices\/(\d+)$/);
  if (match && method === 'PATCH') { const row = invoices.find((i) => i.id === +match[1]); if (!row) return json(res, 404, { message: 'Invoice not found' }) || true; Object.assign(row, await readBody(req)); return json(res, 200, { data: row }) || true; }
  match = path.match(/^\/api\/tenant\/accounting\/invoices\/(\d+)\/payments$/);
  if (match && method === 'POST') {
    const invoice = invoices.find((i) => i.id === +match[1]); if (!invoice) return json(res, 404, { message: 'Invoice not found' }) || true; const body = await readBody(req); const amount = +body.amount;
    const payment = { id: nextId(), reference: body.reference || `PAY-2026-NOR-${sequence}`, direction: 'incoming', method: body.method, amount, currency: invoice.currency, paid_on: body.paid_on, invoice: { id: invoice.id, number: invoice.number, customer_name: invoice.customer_name }, expense: null };
    payments.unshift(payment); invoice.amount_paid += amount; invoice.balance_due = +(invoice.total - invoice.amount_paid).toFixed(2); invoice.status = invoice.balance_due <= 0 ? 'paid' : 'partial'; invoice.payments.push(payment);
    return json(res, 201, { data: { payment, invoice } }) || true;
  }

  if (path === '/api/tenant/accounting/payments' && method === 'GET') return paginate(res, json, filtered(payments, url, ['reference', 'method'], 'direction'), url) || true;
  if (path === '/api/tenant/accounting/expenses' && method === 'GET') return paginate(res, json, filtered(expenses, url, ['number', 'vendor_name', 'category', 'description']), url) || true;
  if (path === '/api/tenant/accounting/expenses' && method === 'POST') {
    const body = await readBody(req); const total = +body.amount + (+body.tax_amount || 0); const expense = { id: nextId(), number: `BILL-2026-NOR-${String(expenses.length + 1).padStart(4, '0')}`, ...body, total, currency: body.currency || 'USD', status: body.status || 'pending' }; expenses.unshift(expense); return json(res, 201, { data: expense }) || true;
  }
  match = path.match(/^\/api\/tenant\/accounting\/expenses\/(\d+)\/pay$/);
  if (match && method === 'POST') {
    const expense = expenses.find((e) => e.id === +match[1]); if (!expense) return json(res, 404, { message: 'Expense not found' }) || true; const body = await readBody(req); expense.status = 'paid';
    const payment = { id: nextId(), reference: body.reference || `PAY-2026-NOR-${sequence}`, direction: 'outgoing', method: body.method, amount: expense.total, currency: expense.currency, paid_on: body.paid_on, invoice: null, expense: { id: expense.id, number: expense.number, vendor_name: expense.vendor_name, description: expense.description } }; payments.unshift(payment); return json(res, 201, { data: { expense, payment } }) || true;
  }

  if (path === '/api/tenant/accounting/contacts' && method === 'GET') return paginate(res, json, filtered(contacts, url, ['name', 'email', 'phone'], 'type'), url) || true;
  if (path === '/api/tenant/accounting/contacts' && method === 'POST') { const body = await readBody(req); const contact = { id: nextId(), is_active: true, invoices_count: 0, purchase_orders_count: 0, ...body }; contacts.push(contact); return json(res, 201, { data: contact }) || true; }
  match = path.match(/^\/api\/tenant\/accounting\/contacts\/(\d+)$/);
  if (match && method === 'PATCH') { const row = contacts.find((c) => c.id === +match[1]); if (!row) return json(res, 404, { message: 'Contact not found' }) || true; Object.assign(row, await readBody(req)); return json(res, 200, { data: row }) || true; }
  if (match && method === 'DELETE') {
    const idx = contacts.findIndex((c) => c.id === +match[1]); if (idx < 0) return json(res, 404, { message: 'Contact not found' }) || true;
    const row = contacts[idx];
    const used = invoices.some((i) => i.contact_id === row.id) || expenses.some((e) => e.vendor_id === row.id) || purchaseOrders.some((po) => po.vendor_id === row.id);
    if (used) { const message = 'This contact already has invoices, bills or purchase orders. Mark it inactive instead of deleting so the history stays intact.'; return json(res, 422, { message, errors: { contact: [message] } }) || true; }
    contacts.splice(idx, 1); return json(res, 200, { data: { deleted: true } }) || true;
  }
  if (path === '/api/tenant/accounting/purchase-orders' && method === 'GET') return paginate(res, json, filtered(purchaseOrders, url, ['number', 'vendor_name']), url) || true;
  if (path === '/api/tenant/accounting/purchase-orders' && method === 'POST') {
    const body = await readBody(req); const totals = lineTotals(body.items || [], 'unit_cost'); const vendor = contacts.find((c) => c.id === +body.vendor_id); const po = { id: nextId(), number: `PO-2026-NOR-${String(purchaseOrders.length + 1).padStart(4, '0')}`, ...body, vendor, status: body.submit_for_approval ? 'pending_approval' : 'draft', subtotal: totals.subtotal, tax_total: totals.tax, total: totals.subtotal + totals.tax, items: totals.items }; purchaseOrders.unshift(po); return json(res, 201, { data: po }) || true;
  }
  match = path.match(/^\/api\/tenant\/accounting\/purchase-orders\/(\d+)$/);
  if (match && method === 'PATCH') { const po = purchaseOrders.find((row) => row.id === +match[1]); if (!po) return json(res, 404, { message: 'Purchase order not found' }) || true; Object.assign(po, await readBody(req)); return json(res, 200, { data: po }) || true; }

  if (path === '/api/tenant/accounting/accounts' && method === 'GET') {
    const search = (url.searchParams.get('search') || '').toLowerCase(); const type = url.searchParams.get('type') || '';
    const rows = accounts.filter((account) => (!type || account.type === type) && (!search || `${account.code} ${account.name}`.toLowerCase().includes(search)));
    return json(res, 200, { data: rows }) || true;
  }
  if (path === '/api/tenant/accounting/accounts' && method === 'POST') {
    const body = await readBody(req); const account = { id: nextId(), is_system: false, is_active: true, debit_total: 0, credit_total: 0, balance: 0, ...body }; accounts.push(account); return json(res, 201, { data: account }) || true;
  }
  if (path === '/api/tenant/accounting/journals' && method === 'GET') return paginate(res, json, filtered(journals, url, ['number', 'reference', 'memo']), url) || true;
  if (path === '/api/tenant/accounting/journals' && method === 'POST') {
    const body = await readBody(req); const debit = (body.lines || []).reduce((sum, line) => sum + (+line.debit || 0), 0); const credit = (body.lines || []).reduce((sum, line) => sum + (+line.credit || 0), 0);
    if (!debit || Math.abs(debit - credit) > 0.001) return json(res, 422, { message: 'The given data was invalid.', errors: { lines: ['Total debits and credits must be equal and greater than zero.'] } }) || true;
    const journal = { id: nextId(), number: `JRN-2026-${String(journals.length + 1).padStart(5, '0')}`, entry_date: body.entry_date, reference: body.reference, memo: body.memo, status: body.post_now ? 'posted' : 'draft', source_type: null, source_id: null, total_debit: debit, total_credit: credit, lines: body.lines }; journals.unshift(journal); return json(res, 201, { data: journal }) || true;
  }
  match = path.match(/^\/api\/tenant\/accounting\/journals\/(\d+)\/post$/);
  if (match && method === 'POST') { const journal = journals.find((row) => row.id === +match[1]); if (!journal) return json(res, 404, { message: 'Journal not found' }) || true; journal.status = 'posted'; return json(res, 200, { data: journal }) || true; }
  if (path === '/api/tenant/accounting/reports' && method === 'GET') {
    const report = url.searchParams.get('report') || 'profit_loss'; const from = url.searchParams.get('from') || `${new Date().getFullYear()}-01-01`; const to = url.searchParams.get('to') || today();
    const rows = accounts.map((account) => ({ id: account.id, code: account.code, name: account.name, type: account.type, debit: account.debit_total, credit: account.credit_total, balance: account.balance }));
    const income = rows.filter((row) => row.type === 'income' && row.balance); const expenseRows = rows.filter((row) => row.type === 'expense' && row.balance); const totalIncome = income.reduce((sum, row) => sum + row.balance, 0); const totalExpenses = expenseRows.reduce((sum, row) => sum + row.balance, 0);
    let data = { report, from, to, currency: 'USD' };
    if (report === 'profit_loss') data = { ...data, income, expenses: expenseRows, total_income: totalIncome, total_expenses: totalExpenses, net_income: totalIncome - totalExpenses };
    if (report === 'balance_sheet') { const assets = rows.filter((row) => row.type === 'asset' && row.balance); const liabilities = rows.filter((row) => row.type === 'liability' && row.balance); const equity = [{ id: 0, code: 'RE', name: 'Current retained earnings', type: 'equity', debit: 0, credit: 0, balance: totalIncome - totalExpenses }]; const totalAssets = assets.reduce((sum, row) => sum + row.balance, 0); const totalLiabilities = liabilities.reduce((sum, row) => sum + row.balance, 0); const totalEquity = equity[0].balance; data = { ...data, assets, liabilities, equity, total_assets: totalAssets, total_liabilities: totalLiabilities, total_equity: totalEquity, difference: +(totalAssets - totalLiabilities - totalEquity).toFixed(2) }; }
    if (report === 'trial_balance') data = { ...data, accounts: rows.filter((row) => row.debit || row.credit), total_debit: 15621.75, total_credit: 15621.75 };
    return json(res, 200, { data }) || true;
  }

  if (path === '/api/tenant/accounting/bank-accounts' && method === 'GET') return json(res, 200, { data: bankAccounts }) || true;
  if (path === '/api/tenant/accounting/bank-accounts' && method === 'POST') { const body = await readBody(req); const bank = { id: nextId(), transactions_count: 0, unmatched_count: 0, statement_balance: +body.opening_balance || 0, is_active: true, ...body }; bankAccounts.push(bank); return json(res, 201, { data: bank }) || true; }
  if (path === '/api/tenant/accounting/bank-transactions' && method === 'GET') return paginate(res, json, filtered(bankTransactions, url, ['description', 'reference']), url) || true;
  if (path === '/api/tenant/accounting/bank-transactions' && method === 'POST') { const body = await readBody(req); const bank = bankAccounts.find((row) => row.id === +body.bank_account_id); const transaction = { id: nextId(), payment_id: null, status: 'unmatched', bank_account: { id: bank.id, name: bank.name, currency: bank.currency }, payment: null, ...body }; bankTransactions.unshift(transaction); bank.transactions_count += 1; bank.unmatched_count += 1; bank.statement_balance += +body.amount; bank.difference = bank.statement_balance - bank.ledger_balance; return json(res, 201, { data: transaction }) || true; }
  match = path.match(/^\/api\/tenant\/accounting\/bank-transactions\/(\d+)$/);
  if (match && method === 'PATCH') { const transaction = bankTransactions.find((row) => row.id === +match[1]); if (!transaction) return json(res, 404, { message: 'Transaction not found' }) || true; const body = await readBody(req); const wasUnmatched = transaction.status === 'unmatched'; transaction.status = body.status; transaction.payment_id = body.status === 'matched' ? +body.payment_id : null; transaction.payment = body.status === 'matched' ? payments.find((payment) => payment.id === +body.payment_id) : null; if (wasUnmatched && body.status !== 'unmatched') bankAccounts[0].unmatched_count -= 1; if (!wasUnmatched && body.status === 'unmatched') bankAccounts[0].unmatched_count += 1; return json(res, 200, { data: transaction }) || true; }

  json(res, 404, { message: `Accounting mock: no handler for ${method} ${path}` }); return true;
}
