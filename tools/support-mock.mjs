/**
 * Service-desk slice of the mock MarketHub API.
 *
 * Mirrors `App\Http\Controllers\Api\AdminSupportController` and
 * `TenantSupportController` closely enough that the Angular support workspace
 * can be developed without PHP. State lives in memory and resets on restart.
 */

const HOUR = 3600 * 1000;
const MIN = 60 * 1000;
const iso = (ms) => new Date(ms).toISOString();
const agoH = (h) => iso(Date.now() - h * HOUR);
const agoM = (m) => iso(Date.now() - m * MIN);
const inD = (d) => iso(Date.now() + d * 24 * HOUR);

let seq = 5000;
const nextId = () => ++seq;

const SLA_MINUTES = { urgent: 60, high: 240, normal: 480, low: 1440 };
const OPEN_STATUSES = ['new', 'open', 'pending', 'on_hold'];

// ------------------------------------------------------------------ people

const agents = [
  { id: 1, name: 'Super Admin', email: 'admin@markethub.test', status: 'online' },
  { id: 6, name: 'Yaw Operations', email: 'ops@markethub.test', status: 'online' },
  { id: 5, name: 'Abena Sales', email: 'sales@markethub.test', status: 'away' },
];

const tenants = [
  { id: 1, name: 'Northstar Gadgets', status: 'active' },
  { id: 2, name: 'Kente & Co', status: 'active' },
  { id: 3, name: 'Accra Food Hub', status: 'pending' },
  { id: 4, name: 'SheaGold', status: 'active' },
];

const people = {
  nana: { id: 2, name: 'Nana Owusu', email: 'seller1@markethub.test', type: 'tenant' },
  abena: { id: 3, name: 'Abena Boakye', email: 'seller2@markethub.test', type: 'tenant' },
  ama: { id: 4, name: 'Ama Mensah', email: 'customer@markethub.test', type: 'customer' },
  kofi: { id: 9, name: 'Kofi Asante', email: 'kofi@accrafoodhub.com', type: 'tenant' },
  esi: { id: 10, name: 'Esi Danquah', email: 'esi@sheagold.co', type: 'tenant' },
};

const agentRef = (id) => {
  const a = agents.find((x) => x.id === id);
  return a ? { id: a.id, name: a.name, email: a.email } : null;
};
const tenantRef = (id) => tenants.find((t) => t.id === id) ?? null;

// ----------------------------------------------------------------- tickets

let ticketSeq = 10400;
const mkTicket = (t) => {
  const id = ++ticketSeq;
  const createdAt = t.created_at;
  const priority = t.priority ?? 'normal';
  const slaDue = iso(Date.parse(createdAt) + (SLA_MINUTES[priority] ?? 480) * MIN);
  let order = 0;
  const messages = (t.thread ?? []).map(([role, body]) => {
    order += 20 + Math.round(Math.random() * 180);
    return {
      id: nextId(),
      ticket_id: id,
      author_id: role === 'requester' ? t.requester.id : 1,
      author_name: role === 'requester' ? t.requester.name : 'Super Admin',
      author_role: role === 'requester' ? 'requester' : 'agent',
      visibility: role === 'internal' ? 'internal' : 'public',
      body,
      attachments: [],
      created_at: iso(Date.parse(createdAt) + order * MIN),
    };
  });

  return {
    id,
    reference: `TKT-${id}`,
    subject: t.subject,
    summary: (t.thread?.[0]?.[1] ?? '').slice(0, 150),
    category: t.category,
    channel: t.channel,
    status: t.status,
    priority,
    tags: t.tags ?? [],
    tenant: t.tenant_id ? tenantRef(t.tenant_id) : null,
    requester: t.requester,
    assignee: t.assignee_id ? agentRef(t.assignee_id) : null,
    first_response_at: t.first_response_at ?? null,
    last_reply_at: messages.at(-1)?.created_at ?? createdAt,
    resolved_at: t.resolved_at ?? null,
    closed_at: t.closed_at ?? null,
    sla_due_at: slaDue,
    sla_breached: !t.first_response_at && Date.parse(slaDue) < Date.now(),
    satisfaction: t.satisfaction ?? null,
    satisfaction_comment: null,
    messages_count: messages.length,
    created_at: createdAt,
    updated_at: messages.at(-1)?.created_at ?? createdAt,
    messages,
  };
};

const tickets = [
  mkTicket({
    subject: 'Payout for September settlement has not landed',
    category: 'payouts', channel: 'email', priority: 'urgent', status: 'open',
    created_at: agoH(5), first_response_at: agoH(4), tenant_id: 1, requester: people.nana,
    assignee_id: 1, tags: ['payout', 'finance'],
    thread: [
      ['requester', 'Our September settlement of $4,218.40 was marked released on the 28th but nothing has arrived in the bank account. Order references are attached — can you trace it?'],
      ['agent', 'Thanks for flagging this. I can see the settlement batch was released on 28 Sep at 14:02 UTC and our payments partner still shows it as "processing". I have escalated with reference SET-99214 and asked for a trace.'],
      ['internal', 'Partner confirmed a batch delay affecting 6 tenants. ETA 24h. Keep this urgent until funds are confirmed.'],
      ['requester', 'Appreciated. Please keep us posted — we have supplier invoices due Friday.'],
    ],
  }),
  mkTicket({
    subject: 'Custom domain stuck on DNS pending',
    category: 'technical', channel: 'portal', priority: 'high', status: 'pending',
    created_at: agoH(26), first_response_at: agoH(24), tenant_id: 2, requester: people.abena,
    assignee_id: 1, tags: ['domains', 'dns'],
    thread: [
      ['requester', 'We added kenteandco.market three days ago and it still shows DNS pending. The CNAME is set at our registrar.'],
      ['agent', 'I checked the record — your CNAME points at the apex instead of the store host. Please point `shop` at `edge.markethub.app` and remove the conflicting A record. Full walkthrough: "Connecting a custom domain".'],
    ],
  }),
  mkTicket({
    subject: 'Bulk product import fails on row 142',
    category: 'catalog', channel: 'portal', priority: 'normal', status: 'open',
    created_at: agoH(50), first_response_at: agoH(47), tenant_id: 1, requester: people.nana,
    assignee_id: 6, tags: ['import', 'catalog'],
    thread: [
      ['requester', 'The CSV import stops at row 142 with "variant option mismatch". The row looks identical to the ones above it.'],
      ['agent', 'That error fires when a variant option column is present but empty. Row 142 has a trailing comma creating an empty "Size" value. Strip the empty column and re-upload — I have also raised a task to improve the error message.'],
    ],
  }),
  mkTicket({
    subject: 'Customer charged twice for order #10492',
    category: 'billing', channel: 'phone', priority: 'urgent', status: 'new',
    created_at: agoM(42), tenant_id: 2, requester: people.abena, tags: ['refund', 'payments'],
    thread: [
      ['requester', 'A buyer says their card was charged twice for order #10492. They have two pending authorisations of $142.00 each.'],
    ],
  }),
  mkTicket({
    subject: 'Onboarding: documents rejected, what is missing?',
    category: 'onboarding', channel: 'portal', priority: 'high', status: 'open',
    created_at: agoH(8), tenant_id: 3, requester: people.kofi, tags: ['kyc', 'onboarding'],
    thread: [
      ['requester', 'Our business registration upload was rejected but the reason just says "unclear". What exactly do you need?'],
    ],
  }),
  mkTicket({
    subject: 'Delivery marked shipped but tracking never updated',
    category: 'orders', channel: 'portal', priority: 'normal', status: 'pending',
    created_at: agoH(18), first_response_at: agoH(16), tenant_id: 1, requester: people.ama,
    assignee_id: 6, tags: ['delivery'],
    thread: [
      ['requester', 'My order was marked shipped five days ago but the tracking number has no scans.'],
      ['agent', 'I have contacted the seller and the courier. If there is no scan by tomorrow we will reship at no cost or refund you in full — your choice.'],
    ],
  }),
  mkTicket({
    subject: 'Commission rate seems wrong on handmade category',
    category: 'billing', channel: 'whatsapp', priority: 'high', status: 'open',
    created_at: agoH(34), first_response_at: agoH(31), tenant_id: 2, requester: people.abena,
    assignee_id: 1, tags: ['commission'],
    thread: [
      ['requester', 'We were told handmade goods are at 6% but settlements show 8%.'],
      ['agent', 'Checking with the commercial team — the handmade rate applies from 1 Oct. I will confirm whether September orders qualify for a retroactive adjustment.'],
      ['internal', 'Pricing confirmed 6% applies from 1 Oct only. Prepare a goodwill credit note offer.'],
    ],
  }),
  mkTicket({
    subject: 'Ad campaign spending faster than daily budget',
    category: 'other', channel: 'portal', priority: 'normal', status: 'new',
    created_at: agoH(3), tenant_id: 4, requester: people.esi, tags: ['ads'],
    thread: [
      ['requester', 'Our daily budget is $20 but yesterday we were charged $31.40.'],
    ],
  }),
  mkTicket({
    subject: 'Request: webhook for settlement released',
    category: 'technical', channel: 'email', priority: 'low', status: 'on_hold',
    created_at: agoH(170), first_response_at: agoH(166), tenant_id: 1, requester: people.nana,
    assignee_id: 1, tags: ['api', 'feature-request'],
    thread: [
      ['requester', 'We reconcile payouts automatically. Could you emit a webhook when a settlement moves to released?'],
      ['agent', 'Good idea — logged on the platform roadmap. Holding this ticket open so you get notified when it ships.'],
      ['internal', 'Roadmap item PLT-212. Review at next platform planning.'],
    ],
  }),
  mkTicket({
    subject: 'How do I add a finance-only staff account?',
    category: 'account', channel: 'chat', priority: 'low', status: 'resolved',
    created_at: agoH(96), first_response_at: agoH(95), resolved_at: agoH(94), satisfaction: 5,
    tenant_id: 1, requester: people.nana, assignee_id: 1, tags: ['staff', 'permissions'],
    thread: [
      ['requester', 'I want our accountant to only see settlements and invoices, nothing else.'],
      ['agent', 'Open Tenant console → Users → Invite, pick the Finance department and the Store staff role. They will only see the finance dashboard and settlements.'],
      ['requester', 'Worked perfectly, thank you!'],
    ],
  }),
  mkTicket({
    subject: 'Low stock alerts are not being emailed',
    category: 'technical', channel: 'portal', priority: 'normal', status: 'resolved',
    created_at: agoH(140), first_response_at: agoH(138), resolved_at: agoH(130), satisfaction: 4,
    tenant_id: 4, requester: people.esi, assignee_id: 6, tags: ['notifications'],
    thread: [
      ['requester', 'We set the low stock threshold to 5 but never receive the alert email.'],
      ['agent', 'Your tenant notification settings had low-stock alerts disabled. I have enabled them and sent a test — let me know if it arrives.'],
      ['requester', 'Got it, thanks.'],
    ],
  }),
  mkTicket({
    subject: 'Need an invoice copy for August subscription',
    category: 'billing', channel: 'email', priority: 'low', status: 'closed',
    created_at: agoH(300), first_response_at: agoH(298), resolved_at: agoH(296), closed_at: agoH(290),
    satisfaction: 5, tenant_id: 1, requester: people.nana, assignee_id: 1, tags: ['invoice'],
    thread: [
      ['requester', 'Could you resend the August subscription invoice as a PDF?'],
      ['agent', 'Sent to your billing email. You can also download past invoices under Tenant console → Settings → Billing.'],
    ],
  }),
];

// ------------------------------------------------------------------- chats

const mkChat = (c) => {
  const id = nextId();
  let offset = 0;
  const messages = (c.thread ?? []).map(([role, body]) => {
    offset += 25 + Math.round(Math.random() * 90);
    return {
      id: nextId(),
      chat_id: id,
      author_id: role === 'visitor' ? c.visitor.id : role === 'agent' ? 1 : null,
      author_name:
        role === 'visitor' ? c.visitor.name
        : role === 'agent' ? 'Super Admin'
        : role === 'bot' ? 'MarketHub Assistant'
        : 'System',
      author_role: role,
      body,
      read_at: c.status === 'queued' && role === 'visitor' ? null : iso(Date.parse(c.started_at) + offset * 1000),
      created_at: iso(Date.parse(c.started_at) + offset * 1000),
    };
  });

  return {
    id,
    topic: c.topic,
    status: c.status,
    priority: c.priority ?? 'normal',
    visitor: c.visitor,
    tenant: c.tenant_id ? tenantRef(c.tenant_id) : null,
    agent: c.agent_id ? agentRef(c.agent_id) : null,
    ticket_id: null,
    started_at: c.started_at,
    answered_at: c.answered_at ?? null,
    ended_at: c.ended_at ?? null,
    last_message_at: messages.at(-1)?.created_at ?? c.started_at,
    wait_seconds: c.answered_at ? Math.round((Date.parse(c.answered_at) - Date.parse(c.started_at)) / 1000) : null,
    unread_count: c.status === 'queued' ? messages.filter((m) => m.author_role === 'visitor').length : 0,
    rating: c.rating ?? null,
    messages,
  };
};

const chats = [
  mkChat({
    topic: 'Checkout error on mobile', status: 'active', priority: 'high',
    started_at: agoM(14), answered_at: agoM(13), tenant_id: 1, visitor: people.nana, agent_id: 1,
    thread: [
      ['visitor', 'Hi! Buyers on Android are seeing "payment could not be initialised" at checkout.'],
      ['agent', 'Thanks for the heads-up — are they all on the same payment method?'],
      ['visitor', 'Mobile money mostly. Card seems fine.'],
      ['agent', 'Got it. I can see elevated errors from the mobile-money gateway in the last 20 minutes. Our payments team is on it; I will keep this chat open and update you here.'],
    ],
  }),
  mkChat({
    topic: 'Store not visible in search', status: 'queued', priority: 'normal',
    started_at: agoM(3), tenant_id: 3, visitor: people.kofi,
    thread: [
      ['visitor', 'Our store went live yesterday but it does not appear in marketplace search.'],
      ['bot', 'Thanks! You are 1st in the queue — an agent will be with you shortly. Meanwhile, "Why is my store not showing in search?" may help.'],
      ['visitor', 'I read that one, everything on the list is already done.'],
    ],
  }),
  mkChat({
    topic: 'Refund policy question', status: 'queued', priority: 'low',
    started_at: agoM(8), tenant_id: null, visitor: people.ama,
    thread: [
      ['visitor', 'How long does a refund take once the seller approves it?'],
    ],
  }),
  mkChat({
    topic: 'Bulk price update', status: 'active', priority: 'normal',
    started_at: agoM(26), answered_at: agoM(25), tenant_id: 2, visitor: people.abena, agent_id: 6,
    thread: [
      ['visitor', 'Is there a way to raise all prices in a category by 5%?'],
      ['agent', 'Yes — Products → filter by category → select all → Bulk edit → Adjust price by percentage. Want me to walk through it?'],
      ['visitor', 'Found it, thanks!'],
    ],
  }),
  mkChat({
    topic: 'Invoice download', status: 'ended', priority: 'low', rating: 5,
    started_at: agoM(110), answered_at: agoM(109), ended_at: agoM(95), tenant_id: 2, visitor: people.abena, agent_id: 1,
    thread: [
      ['visitor', 'Where do I download my subscription invoices?'],
      ['agent', 'Tenant console → Settings → Billing → Invoices. Each row has a PDF download.'],
      ['visitor', 'Perfect, thank you.'],
      ['system', 'Chat ended by visitor.'],
    ],
  }),
];

// ------------------------------------------------------------------- tasks

let taskPos = 0;
const mkTask = (t) => ({
  id: nextId(),
  title: t.title,
  description: t.description ?? null,
  status: t.status,
  priority: t.priority,
  owner_type: t.owner_type,
  ticket_id: t.ticket_id ?? null,
  ticket_reference: t.ticket_id ? `TKT-${t.ticket_id}` : null,
  tenant: t.tenant_id ? tenantRef(t.tenant_id) : null,
  assignee: t.assignee_id ? agentRef(t.assignee_id) : null,
  due_at: t.due_at,
  completed_at: t.status === 'done' ? agoH(20) : null,
  checklist: (t.checklist ?? []).map((label, i) => ({
    label,
    done: t.status === 'done' || (t.status === 'in_progress' && i === 0),
  })),
  labels: [t.owner_type === 'tenant' ? 'tenant-action' : 'internal'],
  position: taskPos++,
  overdue: t.status !== 'done' && Date.parse(t.due_at) < Date.now(),
  created_at: agoH(60),
});

const tasks = [
  mkTask({ title: 'Trace delayed settlement batch SET-99214 with payments partner', status: 'in_progress', priority: 'urgent', owner_type: 'support', tenant_id: 1, ticket_id: tickets[0].id, assignee_id: 1, due_at: inD(1), checklist: ['Open partner ticket', 'Confirm batch IDs', 'Notify affected tenants'] }),
  mkTask({ title: 'Publish guide: fixing CNAME records for custom domains', status: 'review', priority: 'high', owner_type: 'support', tenant_id: 2, ticket_id: tickets[1].id, assignee_id: 6, due_at: inD(2), checklist: ['Draft article', 'Add screenshots', 'Technical review'] }),
  mkTask({ title: 'Improve CSV import error message for empty variant columns', status: 'todo', priority: 'normal', owner_type: 'support', tenant_id: 1, ticket_id: tickets[2].id, assignee_id: 1, due_at: inD(6), checklist: ['Reproduce', 'Write copy', 'Ship with next release'] }),
  mkTask({ title: 'Prepare goodwill credit note for handmade commission gap', status: 'todo', priority: 'high', owner_type: 'support', tenant_id: 2, ticket_id: tickets[6].id, assignee_id: 5, due_at: inD(3), checklist: ['Confirm amount', 'Finance approval'] }),
  mkTask({ title: 'Weekly SLA review — breached tickets retro', status: 'todo', priority: 'normal', owner_type: 'support', assignee_id: 1, due_at: inD(4), checklist: ['Pull breach list', 'Find root causes', 'Share summary'] }),
  mkTask({ title: 'Audit help centre for out-of-date screenshots', status: 'in_progress', priority: 'low', owner_type: 'support', assignee_id: 6, due_at: inD(9), checklist: ['List articles older than 6 months', 'Reshoot UI'] }),
  mkTask({ title: 'Chase courier scan for order #10492 reship decision', status: 'blocked', priority: 'high', owner_type: 'support', tenant_id: 1, ticket_id: tickets[5].id, assignee_id: 6, due_at: inD(-1), checklist: ['Call courier hub', 'Offer reship or refund'] }),
  mkTask({ title: 'Upload a clearer business registration certificate', status: 'todo', priority: 'high', owner_type: 'tenant', tenant_id: 3, ticket_id: tickets[4].id, due_at: inD(2), checklist: ['Scan at 300dpi', 'Full page visible', 'Upload in Settings → Documents'] }),
  mkTask({ title: 'Complete payout bank verification', status: 'todo', priority: 'urgent', owner_type: 'tenant', tenant_id: 3, due_at: inD(1), checklist: ['Add account number', 'Upload bank letter'] }),
  mkTask({ title: 'Add delivery zones for Kumasi and Takoradi', status: 'blocked', priority: 'normal', owner_type: 'tenant', tenant_id: 1, due_at: inD(5), checklist: ['Define zones', 'Set fees'] }),
  mkTask({ title: 'Finish store branding (logo + banner)', status: 'done', priority: 'normal', owner_type: 'tenant', tenant_id: 1, due_at: inD(-2), checklist: ['Upload logo', 'Upload banner'] }),
  mkTask({ title: 'Verify webhook endpoint for order events', status: 'done', priority: 'low', owner_type: 'support', tenant_id: 1, assignee_id: 1, due_at: inD(-4), checklist: ['Send test event', 'Confirm 2xx'] }),
];

// ------------------------------------------------------------- help centre

const helpCategories = [
  { id: 1, name: 'Getting started', slug: 'getting-started', description: 'Open your store and make the first sale', icon: 'rocket', position: 0 },
  { id: 2, name: 'Payouts & billing', slug: 'payouts-billing', description: 'Settlements, commissions, invoices and taxes', icon: 'wallet', position: 1 },
  { id: 3, name: 'Orders & delivery', slug: 'orders-delivery', description: 'Fulfilment, shipping zones and returns', icon: 'truck', position: 2 },
  { id: 4, name: 'Catalog & inventory', slug: 'catalog-inventory', description: 'Products, variants, imports and stock', icon: 'box', position: 3 },
  { id: 5, name: 'Account & security', slug: 'account-security', description: 'Staff, roles, 2FA and API access', icon: 'shield', position: 4 },
];

const mkArticle = (a) => {
  const yes = a.helpful === null ? 0 : Math.round(a.views * 0.42 * (a.helpful / 100));
  const no = a.helpful === null ? 0 : Math.max(0, Math.round((yes * (100 - a.helpful)) / Math.max(1, a.helpful)));
  const category = helpCategories.find((c) => c.id === a.category_id) ?? null;
  return {
    id: nextId(),
    category_id: a.category_id,
    category: category ? { id: category.id, name: category.name, slug: category.slug, icon: category.icon } : null,
    title: a.title,
    slug: a.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    excerpt: a.body.split('\n')[0].replace(/[#*>|`]/g, '').slice(0, 155),
    body: a.body,
    status: a.status,
    audience: 'tenant',
    tags: a.tags ?? [],
    is_pinned: !!a.pinned,
    read_minutes: a.minutes,
    views: a.views,
    helpful_yes: yes,
    helpful_no: no,
    helpful_score: a.helpful,
    author: { id: 1, name: 'Super Admin' },
    published_at: a.status === 'published' ? agoH(24 * (10 + (a.views % 90))) : null,
    updated_at: agoH(2 + (a.views % 200)),
  };
};

const articles = [
  mkArticle({
    title: 'Launch checklist: from application to first sale', category_id: 1, status: 'published', pinned: true,
    views: 2840, helpful: 96, minutes: 7, tags: ['onboarding', 'checklist'],
    body: `Everything a new tenant needs, in order.

## 1. Finish your application
Upload your business registration, owner ID and a payout method. Applications with all three documents are approved in under 24 hours.

## 2. Create your store
Tenant console → Stores → New store. Set your currency, delivery fee and delivery window.

## 3. Add your first products
Use Products → New product, or import a CSV. Every product needs at least one variant with tracked stock.

## 4. Set delivery zones
Define the areas you ship to and the fee for each. Orders outside your zones will not be offered to buyers.

## 5. Publish
Flip the store to Active. Your products appear in marketplace search within a few minutes.`,
  }),
  mkArticle({
    title: 'How settlements and payouts work', category_id: 2, status: 'published', pinned: true,
    views: 2110, helpful: 92, minutes: 6, tags: ['payouts', 'finance'],
    body: `Your money moves in three steps.

**Order paid** — funds are held by the platform.
**Order delivered** — a settlement is created: gross minus commission plus delivery fee equals net.
**Settlement released** — the net amount is queued for payout to your bank or mobile money account.

Payout runs happen every Tuesday and Friday. A release after the cut-off (14:00 UTC) moves to the next run.

### Why is my payout smaller than my sales?
Commission, refunds and chargebacks are deducted before payout. Open Finance → Settlements for a line-by-line breakdown.`,
  }),
  mkArticle({
    title: 'Connecting a custom domain', category_id: 5, status: 'published',
    views: 1680, helpful: 88, minutes: 5, tags: ['domains', 'dns'],
    body: `You can serve your storefront from your own domain.

1. Tenant console → Domains → Add domain.
2. Copy the CNAME target we show you (for example \`edge.markethub.app\`).
3. At your registrar, create a **CNAME** record for the subdomain you want (\`shop\`) pointing at that target.
4. Remove any conflicting A or AAAA record for the same host.
5. Back in the console press **Verify**.

DNS can take up to 30 minutes to propagate. Once verified we issue a TLS certificate automatically — the domain flips to Active when the certificate is live.

> Apex domains (example.com with no subdomain) need an ALIAS or ANAME record. Not all registrars support this.`,
  }),
  mkArticle({
    title: 'Importing products with CSV', category_id: 4, status: 'published',
    views: 1420, helpful: 81, minutes: 8, tags: ['catalog', 'import'],
    body: `Download the template from Products → Import.

### Required columns
\`name\`, \`price\`, \`sku\`, \`quantity\`.

### Variants
Add one column per option (\`Size\`, \`Colour\`). Leave the column out entirely if a product has no variants — an empty value is treated as a real option and will fail validation.

### Common errors
- **variant option mismatch** — an option column is present but empty on that row. Usually a trailing comma.
- **duplicate sku** — SKUs must be unique across your whole catalog.
- **invalid price** — use plain numbers, no currency symbols or thousands separators.`,
  }),
  mkArticle({
    title: 'Inviting staff and setting permissions', category_id: 5, status: 'published',
    views: 1190, helpful: 94, minutes: 4, tags: ['staff', 'permissions'],
    body: `Tenant console → Users → Invite.

Pick a **role** (Store staff) and a **department**:

| Department | Sees |
| --- | --- |
| Finance | Settlements, invoices, finance dashboard |
| Sales | Orders, customers, sales dashboard |
| Operations | Inventory, fulfilment, delivery |
| Marketing | Campaigns, ads, analytics |

Staff never see tenant settings, API keys or payout details — only the owner does.`,
  }),
  mkArticle({
    title: 'Why is my store not showing in search?', category_id: 1, status: 'published',
    views: 1530, helpful: 85, minutes: 3, tags: ['storefront'],
    body: `Run through this list:

- **Tenant status is Active** — pending tenants stay private.
- **Store status is Active** — drafts are never indexed.
- **At least one active product with stock** — empty stores are hidden.
- **Delivery zones configured** — stores with no shipping coverage are hidden from buyers.

If all four are true and you still do not appear after 30 minutes, raise a ticket with your store slug.`,
  }),
  mkArticle({
    title: 'Handling refunds and returns', category_id: 3, status: 'published',
    views: 980, helpful: 79, minutes: 5, tags: ['returns'],
    body: `A buyer can request a return within 7 days of delivery.

1. The request appears under Orders → Returns.
2. Approve or decline with a reason within 48 hours.
3. On approval the buyer ships the item back; mark it received when it arrives.
4. The refund is deducted from your next settlement.

Declined requests are escalated to platform support automatically if the buyer disputes them.`,
  }),
  mkArticle({
    title: 'Setting up low stock alerts', category_id: 4, status: 'published',
    views: 640, helpful: 90, minutes: 3, tags: ['inventory', 'notifications'],
    body: `Inventory → select a variant → set **Low stock threshold**.

Emails go to the addresses listed under Settings → Notifications. If you are not receiving them, confirm that **Low stock alerts** is enabled there — it is off by default for newly created tenants.`,
  }),
  mkArticle({
    title: 'Using the Seller API and webhooks', category_id: 5, status: 'published',
    views: 760, helpful: 87, minutes: 9, tags: ['api', 'webhooks'],
    body: `Create a key under Settings → API keys. Scopes are granular: \`products.read\`, \`orders.read\`, \`orders.fulfill\`, \`inventory.write\`, \`settlements.read\`.

\`\`\`
curl https://api.markethub.app/api/seller/v1/orders \\
  -H "Authorization: Bearer sk_live_..."
\`\`\`

Webhooks are signed with HMAC-SHA256 in the \`X-MarketHub-Signature\` header. Always verify the signature and respond 2xx within 5 seconds — we retry with exponential backoff for 24 hours.`,
  }),
  mkArticle({
    title: 'Understanding commission rates', category_id: 2, status: 'review',
    views: 0, helpful: null, minutes: 4, tags: ['commission'],
    body: `Commission is charged per order line and varies by category.

| Category | Rate |
| --- | --- |
| Electronics | 8% |
| Fashion | 10% |
| Home & kitchen | 8% |
| Handmade | 6% (from 1 Oct) |
| Groceries | 5% |

Rates are applied at the time the order is placed, not when it is settled.`,
  }),
  mkArticle({
    title: 'Preparing for the festive season', category_id: 3, status: 'draft',
    views: 0, helpful: null, minutes: 6, tags: ['seasonal'],
    body: `Draft — outline only.

- Stock planning: 3x normal cover on best sellers
- Delivery cut-off dates
- Extending the returns window
- Running a campaign with the Ads workspace`,
  }),
];

const cannedReplies = [
  { id: nextId(), title: 'Acknowledge & investigating', shortcut: '/ack', category: 'general', uses: 84, body: 'Thanks for reaching out — I have picked this up and I am investigating now. I will come back to you with an update within the next few hours.' },
  { id: nextId(), title: 'Payout delay explanation', shortcut: '/payout', category: 'payouts', uses: 51, body: 'I can see the settlement was released on our side and is now with our payments partner. Bank transfers typically land within 1–2 business days of release. I have asked for a trace and will update you as soon as I hear back.' },
  { id: nextId(), title: 'DNS / custom domain fix', shortcut: '/dns', category: 'technical', uses: 37, body: 'Your domain needs a CNAME record on the subdomain you want to use, pointing at our edge host, with any conflicting A record removed. Press Verify in the console once the record is live — DNS can take up to 30 minutes.' },
  { id: nextId(), title: 'Request more information', shortcut: '/info', category: 'general', uses: 29, body: 'To dig into this I need a little more detail:\n\n- The order or product reference\n- A screenshot of what you are seeing\n- The approximate time it happened\n\nAs soon as I have those I can trace it in our logs.' },
  { id: nextId(), title: 'Resolve & close', shortcut: '/resolve', category: 'general', uses: 68, body: 'Glad that worked! I am marking this as resolved — just reply here if anything changes and the ticket will reopen automatically.' },
  { id: nextId(), title: 'KYC document rejected', shortcut: '/kyc', category: 'onboarding', uses: 18, body: 'Your document was rejected because the scan was partially cut off. Please upload a 300dpi scan or photo with all four corners of the page visible and the registration number legible. Settings → Documents → Replace.' },
];

// --------------------------------------------------------------- summaries

const isOpen = (t) => OPEN_STATUSES.includes(t.status);

const ticketSummary = () => ({
  all: tickets.length,
  open: tickets.filter(isOpen).length,
  unassigned: tickets.filter((t) => isOpen(t) && !t.assignee).length,
  breached: tickets.filter((t) => isOpen(t) && t.sla_breached).length,
  resolved: tickets.filter((t) => t.status === 'resolved').length,
  closed: tickets.filter((t) => t.status === 'closed').length,
});

const taskSummary = () => ({
  total: tasks.length,
  open: tasks.filter((t) => t.status !== 'done').length,
  overdue: tasks.filter((t) => t.status !== 'done' && Date.parse(t.due_at) < Date.now()).length,
  due_today: tasks.filter((t) => t.status !== 'done' && new Date(t.due_at).toDateString() === new Date().toDateString()).length,
  done_this_week: tasks.filter((t) => t.completed_at).length,
  by_status: ['todo', 'in_progress', 'blocked', 'review', 'done'].reduce(
    (acc, s) => ({ ...acc, [s]: tasks.filter((t) => t.status === s).length }),
    {},
  ),
});

const chatSummary = () => ({
  queued: chats.filter((c) => c.status === 'queued').length,
  active: chats.filter((c) => c.status === 'active').length,
  ended_today: chats.filter((c) => c.ended_at).length,
  avg_wait_seconds: Math.round(
    chats.filter((c) => c.wait_seconds).reduce((s, c) => s + c.wait_seconds, 0) /
      Math.max(1, chats.filter((c) => c.wait_seconds).length),
  ),
  unread: chats.reduce((s, c) => s + c.unread_count, 0),
});

const guideSummary = () => ({
  total: articles.length,
  published: articles.filter((a) => a.status === 'published').length,
  draft: articles.filter((a) => a.status === 'draft').length,
  review: articles.filter((a) => a.status === 'review').length,
  views: articles.reduce((s, a) => s + a.views, 0),
  avg_helpful: Math.round(
    articles.filter((a) => a.helpful_score !== null).reduce((s, a) => s + a.helpful_score, 0) /
      Math.max(1, articles.filter((a) => a.helpful_score !== null).length),
  ),
});

const agentWorkload = () =>
  agents.map((a) => {
    const theirs = tickets.filter((t) => t.assignee?.id === a.id && t.satisfaction);
    return {
      id: a.id,
      name: a.name,
      email: a.email,
      open_tickets: tickets.filter((t) => isOpen(t) && t.assignee?.id === a.id).length,
      active_chats: chats.filter((c) => c.status === 'active' && c.agent?.id === a.id).length,
      open_tasks: tasks.filter((t) => t.status !== 'done' && t.assignee?.id === a.id).length,
      csat: theirs.length ? Number((theirs.reduce((s, t) => s + t.satisfaction, 0) / theirs.length).toFixed(2)) : null,
      status: a.status,
    };
  });

const overview = (days) => {
  const since = Date.now() - days * 24 * HOUR;
  const open = tickets.filter(isOpen);
  const responded = tickets.filter((t) => t.first_response_at);
  const resolved = tickets.filter((t) => t.resolved_at);
  const rated = tickets.filter((t) => t.satisfaction);

  const volume = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(Date.now() - i * 24 * HOUR);
    const key = day.toDateString();
    // Blend real records with a deterministic baseline so the trend reads well.
    const baseline = 3 + Math.round(3 * Math.abs(Math.sin((i + 1) * 1.7)));
    volume.push({
      label: day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      date: day.toISOString().slice(0, 10),
      created: baseline + tickets.filter((t) => new Date(t.created_at).toDateString() === key).length,
      resolved: Math.max(0, baseline - 1) + tickets.filter((t) => t.resolved_at && new Date(t.resolved_at).toDateString() === key).length,
    });
  }

  const count = (list, key) =>
    [...new Set(list.map((t) => t[key]))]
      .map((value) => ({ [key]: value, count: list.filter((t) => t[key] === value).length }))
      .sort((a, b) => b.count - a.count);

  return {
    range_days: days,
    kpis: {
      open_tickets: open.length,
      unassigned: open.filter((t) => !t.assignee).length,
      urgent: open.filter((t) => t.priority === 'urgent').length,
      breached: open.filter((t) => t.sla_breached).length,
      created_in_range: tickets.filter((t) => Date.parse(t.created_at) >= since).length,
      resolved_in_range: tickets.filter((t) => t.resolved_at && Date.parse(t.resolved_at) >= since).length,
      avg_first_response_minutes: Math.round(
        responded.reduce((s, t) => s + (Date.parse(t.first_response_at) - Date.parse(t.created_at)) / MIN, 0) /
          Math.max(1, responded.length),
      ),
      avg_resolution_hours: Number(
        (
          resolved.reduce((s, t) => s + (Date.parse(t.resolved_at) - Date.parse(t.created_at)) / HOUR, 0) /
          Math.max(1, resolved.length)
        ).toFixed(1),
      ),
      csat: rated.length ? Number((rated.reduce((s, t) => s + t.satisfaction, 0) / rated.length).toFixed(2)) : null,
      active_chats: chats.filter((c) => c.status === 'active').length,
      queued_chats: chats.filter((c) => c.status === 'queued').length,
      open_tasks: tasks.filter((t) => t.status !== 'done').length,
      overdue_tasks: tasks.filter((t) => t.status !== 'done' && Date.parse(t.due_at) < Date.now()).length,
      published_guides: articles.filter((a) => a.status === 'published').length,
      guide_views: articles.reduce((s, a) => s + a.views, 0),
    },
    by_status: ['new', 'open', 'pending', 'on_hold', 'resolved', 'closed'].map((status) => ({
      status,
      count: tickets.filter((t) => t.status === status).length,
    })),
    by_priority: ['urgent', 'high', 'normal', 'low'].map((priority) => ({
      priority,
      count: open.filter((t) => t.priority === priority).length,
    })),
    by_category: count(tickets, 'category'),
    by_channel: count(tickets, 'channel'),
    volume,
    agents: agentWorkload(),
    top_tenants: tenants
      .map((t) => ({
        id: t.id,
        name: t.name,
        tickets: tickets.filter((x) => x.tenant?.id === t.id).length,
        open: tickets.filter((x) => x.tenant?.id === t.id && isOpen(x)).length,
      }))
      .filter((t) => t.tickets > 0)
      .sort((a, b) => b.tickets - a.tickets),
    recent_tickets: [...tickets]
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
      .slice(0, 6)
      .map(({ messages, ...rest }) => rest),
    top_guides: [...articles]
      .filter((a) => a.status === 'published')
      .sort((a, b) => b.views - a.views)
      .slice(0, 5)
      .map(({ body, ...rest }) => rest),
  };
};

// ----------------------------------------------------------------- routing

const PRIORITY_RANK = { urgent: 0, high: 1, normal: 2, low: 3 };

/**
 * @returns {boolean} true when the request was handled.
 */
export async function handleSupport(req, res, url, method, readBody, json) {
  const path = url.pathname;
  const q = url.searchParams;

  if (!path.startsWith('/api/admin/support') && !path.startsWith('/api/tenant/support')) return false;

  // ------------------------------------------------------------- overview
  if (path === '/api/admin/support/overview') {
    return json(res, 200, { data: overview(Math.max(7, Math.min(90, Number(q.get('days') ?? 30) || 30)))}), true;
  }
  if (path === '/api/admin/support/agents') {
    return json(res, 200, { data: agentWorkload() }), true;
  }

  // -------------------------------------------------------------- tickets
  if (path === '/api/admin/support/tickets' && method === 'GET') {
    let rows = [...tickets];
    const term = (q.get('q') ?? '').trim().toLowerCase();
    if (term) {
      rows = rows.filter((t) =>
        [t.subject, t.reference, t.requester.name, t.requester.email].join(' ').toLowerCase().includes(term),
      );
    }
    const status = q.get('status');
    if (status && status !== 'all') rows = status === 'open' ? rows.filter(isOpen) : rows.filter((t) => t.status === status);
    for (const f of ['priority', 'category', 'channel']) {
      const v = q.get(f);
      if (v && v !== 'all') rows = rows.filter((t) => t[f] === v);
    }
    if (q.get('tenant_id')) rows = rows.filter((t) => t.tenant?.id === Number(q.get('tenant_id')));
    const assignee = q.get('assignee');
    if (assignee === 'unassigned') rows = rows.filter((t) => !t.assignee);
    else if (assignee && assignee !== 'all') rows = rows.filter((t) => t.assignee?.id === Number(assignee));
    if (q.get('breached') === 'true') rows = rows.filter((t) => t.sla_breached);

    rows.sort(
      (a, b) =>
        PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
        Date.parse(b.last_reply_at ?? b.created_at) - Date.parse(a.last_reply_at ?? a.created_at),
    );

    const page = Math.max(1, Number(q.get('page') ?? 1) || 1);
    const perPage = Math.min(100, Number(q.get('per_page') ?? 25) || 25);
    const slice = rows.slice((page - 1) * perPage, page * perPage).map(({ messages, ...rest }) => rest);

    return json(res, 200, {
      data: slice,
      meta: { page, per_page: perPage, total: rows.length, last_page: Math.max(1, Math.ceil(rows.length / perPage)) },
      summary: ticketSummary(),
    }), true;
  }

  let m = path.match(/^\/api\/admin\/support\/tickets\/(\d+)$/);
  if (m && method === 'GET') {
    const ticket = tickets.find((t) => t.id === +m[1]);
    if (!ticket) return json(res, 404, { message: 'Ticket not found' }), true;
    return json(res, 200, { data: { ...ticket, tasks: tasks.filter((t) => t.ticket_id === ticket.id) } }), true;
  }
  if (m && method === 'PATCH') {
    const ticket = tickets.find((t) => t.id === +m[1]);
    if (!ticket) return json(res, 404, { message: 'Ticket not found' }), true;
    const body = await readBody(req);
    if (body.assignee_id !== undefined) ticket.assignee = body.assignee_id ? agentRef(Number(body.assignee_id)) : null;
    for (const f of ['status', 'priority', 'category', 'subject']) {
      if (body[f] !== undefined && body[f] !== null) ticket[f] = body[f];
    }
    if (Array.isArray(body.tags)) ticket.tags = body.tags;
    if (body.status === 'resolved') ticket.resolved_at = ticket.resolved_at ?? iso(Date.now());
    if (body.status === 'closed') {
      ticket.closed_at = iso(Date.now());
      ticket.resolved_at = ticket.resolved_at ?? iso(Date.now());
    }
    if (OPEN_STATUSES.includes(ticket.status)) {
      ticket.resolved_at = null;
      ticket.closed_at = null;
    }
    ticket.sla_breached = isOpen(ticket) && !ticket.first_response_at && Date.parse(ticket.sla_due_at) < Date.now();
    ticket.updated_at = iso(Date.now());
    return json(res, 200, { data: ticket }), true;
  }

  m = path.match(/^\/api\/admin\/support\/tickets\/(\d+)\/messages$/);
  if (m && method === 'POST') {
    const ticket = tickets.find((t) => t.id === +m[1]);
    if (!ticket) return json(res, 404, { message: 'Ticket not found' }), true;
    const body = await readBody(req);
    const visibility = body.visibility === 'internal' ? 'internal' : 'public';
    const message = {
      id: nextId(),
      ticket_id: ticket.id,
      author_id: 1,
      author_name: 'Super Admin',
      author_role: 'agent',
      visibility,
      body: String(body.body ?? ''),
      attachments: [],
      created_at: iso(Date.now()),
    };
    ticket.messages.push(message);
    ticket.messages_count = ticket.messages.length;
    if (visibility === 'public') {
      ticket.first_response_at = ticket.first_response_at ?? message.created_at;
      ticket.last_reply_at = message.created_at;
      if (ticket.status === 'new') ticket.status = 'pending';
    }
    if (body.status) {
      ticket.status = body.status;
      if (body.status === 'resolved') ticket.resolved_at = iso(Date.now());
      if (body.status === 'closed') {
        ticket.closed_at = iso(Date.now());
        ticket.resolved_at = ticket.resolved_at ?? iso(Date.now());
      }
    }
    ticket.assignee = ticket.assignee ?? agentRef(1);
    ticket.sla_breached = isOpen(ticket) && !ticket.first_response_at && Date.parse(ticket.sla_due_at) < Date.now();
    const canned = cannedReplies.find((c) => c.id === body.canned_reply_id);
    if (canned) canned.uses += 1;
    return json(res, 201, { data: ticket, message }), true;
  }

  if (path === '/api/admin/support/tickets' && method === 'POST') {
    const body = await readBody(req);
    const priority = body.priority ?? 'normal';
    const created = iso(Date.now());
    const ticket = {
      id: ++ticketSeq,
      reference: `TKT-${ticketSeq}`,
      subject: body.subject ?? 'Untitled request',
      summary: String(body.body ?? '').slice(0, 150),
      category: body.category ?? 'other',
      channel: body.channel ?? 'portal',
      status: 'new',
      priority,
      tags: body.tags ?? [],
      tenant: body.tenant_id ? tenantRef(Number(body.tenant_id)) : null,
      requester: { id: null, name: body.requester_name ?? 'Unknown', email: body.requester_email ?? null, type: body.requester_type ?? 'tenant' },
      assignee: body.assignee_id ? agentRef(Number(body.assignee_id)) : null,
      first_response_at: null,
      last_reply_at: created,
      resolved_at: null,
      closed_at: null,
      sla_due_at: iso(Date.now() + (SLA_MINUTES[priority] ?? 480) * MIN),
      sla_breached: false,
      satisfaction: null,
      satisfaction_comment: null,
      messages_count: 1,
      created_at: created,
      updated_at: created,
      messages: [{
        id: nextId(), ticket_id: ticketSeq, author_id: null,
        author_name: body.requester_name ?? 'Unknown', author_role: 'requester', visibility: 'public',
        body: String(body.body ?? ''), attachments: [], created_at: created,
      }],
    };
    tickets.unshift(ticket);
    return json(res, 201, { data: ticket }), true;
  }

  // ----------------------------------------------------------------- chats
  if (path === '/api/admin/support/chats' && method === 'GET') {
    let rows = [...chats];
    const status = q.get('status');
    if (status && status !== 'all') rows = rows.filter((c) => c.status === status);
    const term = (q.get('q') ?? '').trim().toLowerCase();
    if (term) rows = rows.filter((c) => [c.visitor.name, c.visitor.email, c.topic].join(' ').toLowerCase().includes(term));
    const rank = { queued: 0, active: 1, ended: 2 };
    rows.sort((a, b) => rank[a.status] - rank[b.status] || Date.parse(b.last_message_at) - Date.parse(a.last_message_at));
    return json(res, 200, { data: rows, summary: chatSummary() }), true;
  }

  m = path.match(/^\/api\/admin\/support\/chats\/(\d+)$/);
  if (m && method === 'GET') {
    const chat = chats.find((c) => c.id === +m[1]);
    if (!chat) return json(res, 404, { message: 'Chat not found' }), true;
    chat.unread_count = 0;
    chat.messages.forEach((msg) => (msg.read_at = msg.read_at ?? iso(Date.now())));
    return json(res, 200, { data: chat }), true;
  }
  if (m && method === 'PATCH') {
    const chat = chats.find((c) => c.id === +m[1]);
    if (!chat) return json(res, 404, { message: 'Chat not found' }), true;
    const body = await readBody(req);
    switch (body.action) {
      case 'claim':
        chat.agent = agentRef(1);
        chat.status = 'active';
        chat.answered_at = chat.answered_at ?? iso(Date.now());
        chat.wait_seconds = chat.wait_seconds ?? Math.round((Date.now() - Date.parse(chat.started_at)) / 1000);
        break;
      case 'assign':
        chat.agent = body.agent_id ? agentRef(Number(body.agent_id)) : null;
        chat.status = chat.agent ? 'active' : 'queued';
        break;
      case 'end':
        chat.status = 'ended';
        chat.ended_at = iso(Date.now());
        break;
      case 'reopen':
        chat.status = 'active';
        chat.ended_at = null;
        break;
      case 'escalate': {
        if (!chat.ticket_id) {
          const created = iso(Date.now());
          const transcript = chat.messages.map((msg) => `**${msg.author_name}**: ${msg.body}`).join('\n\n');
          const ticket = {
            id: ++ticketSeq,
            reference: `TKT-${ticketSeq}`,
            subject: chat.topic || 'Escalated live chat',
            summary: transcript.slice(0, 150),
            category: 'other',
            channel: 'chat',
            status: 'open',
            priority: chat.priority,
            tags: ['escalated-chat'],
            tenant: chat.tenant,
            requester: chat.visitor,
            assignee: chat.agent ?? agentRef(1),
            first_response_at: null,
            last_reply_at: created,
            resolved_at: null,
            closed_at: null,
            sla_due_at: iso(Date.now() + (SLA_MINUTES[chat.priority] ?? 480) * MIN),
            sla_breached: false,
            satisfaction: null,
            satisfaction_comment: null,
            messages_count: 1,
            created_at: created,
            updated_at: created,
            messages: [{
              id: nextId(), ticket_id: ticketSeq, author_id: chat.visitor.id,
              author_name: chat.visitor.name, author_role: 'requester', visibility: 'public',
              body: `Escalated from live chat.\n\n${transcript}`, attachments: [], created_at: created,
            }],
          };
          tickets.unshift(ticket);
          chat.ticket_id = ticket.id;
        }
        break;
      }
      default:
        break;
    }
    return json(res, 200, { data: chat }), true;
  }

  m = path.match(/^\/api\/admin\/support\/chats\/(\d+)\/messages$/);
  if (m && method === 'POST') {
    const chat = chats.find((c) => c.id === +m[1]);
    if (!chat) return json(res, 404, { message: 'Chat not found' }), true;
    const body = await readBody(req);
    const message = {
      id: nextId(), chat_id: chat.id, author_id: 1, author_name: 'Super Admin',
      author_role: 'agent', body: String(body.body ?? ''), read_at: iso(Date.now()), created_at: iso(Date.now()),
    };
    chat.messages.push(message);
    chat.status = 'active';
    chat.agent = chat.agent ?? agentRef(1);
    chat.answered_at = chat.answered_at ?? message.created_at;
    chat.last_message_at = message.created_at;
    chat.unread_count = 0;
    return json(res, 201, { data: message }), true;
  }

  // ----------------------------------------------------------------- tasks
  if (path === '/api/admin/support/tasks' && method === 'GET') {
    let rows = [...tasks];
    for (const f of ['status', 'priority', 'owner_type']) {
      const v = q.get(f);
      if (v && v !== 'all') rows = rows.filter((t) => t[f] === v);
    }
    if (q.get('tenant_id')) rows = rows.filter((t) => t.tenant?.id === Number(q.get('tenant_id')));
    const assignee = q.get('assignee');
    if (assignee === 'unassigned') rows = rows.filter((t) => !t.assignee);
    else if (assignee && assignee !== 'all') rows = rows.filter((t) => t.assignee?.id === Number(assignee));
    const term = (q.get('q') ?? '').trim().toLowerCase();
    if (term) rows = rows.filter((t) => `${t.title} ${t.description ?? ''}`.toLowerCase().includes(term));
    rows.sort((a, b) => a.position - b.position);
    return json(res, 200, { data: rows, summary: taskSummary() }), true;
  }
  if (path === '/api/admin/support/tasks' && method === 'POST') {
    const body = await readBody(req);
    const task = {
      id: nextId(),
      title: body.title ?? 'Untitled task',
      description: body.description ?? null,
      status: body.status ?? 'todo',
      priority: body.priority ?? 'normal',
      owner_type: body.owner_type ?? 'support',
      ticket_id: body.ticket_id ?? null,
      ticket_reference: body.ticket_id ? `TKT-${body.ticket_id}` : null,
      tenant: body.tenant_id ? tenantRef(Number(body.tenant_id)) : null,
      assignee: body.assignee_id ? agentRef(Number(body.assignee_id)) : null,
      due_at: body.due_at ?? null,
      completed_at: null,
      checklist: body.checklist ?? [],
      labels: body.labels ?? [],
      position: tasks.length,
      overdue: false,
      created_at: iso(Date.now()),
    };
    tasks.unshift(task);
    return json(res, 201, { data: task }), true;
  }

  m = path.match(/^\/api\/admin\/support\/tasks\/(\d+)$/);
  if (m && method === 'PATCH') {
    const task = tasks.find((t) => t.id === +m[1]);
    if (!task) return json(res, 404, { message: 'Task not found' }), true;
    const body = await readBody(req);
    if (body.assignee_id !== undefined) task.assignee = body.assignee_id ? agentRef(Number(body.assignee_id)) : null;
    if (body.tenant_id !== undefined) task.tenant = body.tenant_id ? tenantRef(Number(body.tenant_id)) : null;
    for (const f of ['title', 'description', 'status', 'priority', 'owner_type', 'due_at', 'position']) {
      if (body[f] !== undefined) task[f] = body[f];
    }
    if (Array.isArray(body.checklist)) task.checklist = body.checklist;
    if (Array.isArray(body.labels)) task.labels = body.labels;
    task.completed_at = task.status === 'done' ? iso(Date.now()) : null;
    task.overdue = task.status !== 'done' && !!task.due_at && Date.parse(task.due_at) < Date.now();
    return json(res, 200, { data: task }), true;
  }
  if (m && method === 'DELETE') {
    const i = tasks.findIndex((t) => t.id === +m[1]);
    if (i >= 0) tasks.splice(i, 1);
    return json(res, 200, { data: { deleted: true } }), true;
  }

  // ---------------------------------------------------------------- guides
  if (path === '/api/admin/support/guides' && method === 'GET') {
    let rows = [...articles];
    for (const f of ['status', 'audience']) {
      const v = q.get(f);
      if (v && v !== 'all') rows = rows.filter((a) => a[f] === v);
    }
    if (q.get('category_id')) rows = rows.filter((a) => a.category_id === Number(q.get('category_id')));
    const term = (q.get('q') ?? '').trim().toLowerCase();
    if (term) rows = rows.filter((a) => `${a.title} ${a.excerpt} ${a.body}`.toLowerCase().includes(term));
    rows.sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned) || Date.parse(b.updated_at) - Date.parse(a.updated_at));

    return json(res, 200, {
      data: {
        categories: helpCategories.map((c) => ({ ...c, articles_count: articles.filter((a) => a.category_id === c.id).length })),
        articles: rows,
      },
      summary: guideSummary(),
    }), true;
  }
  if (path === '/api/admin/support/guides' && method === 'POST') {
    const body = await readBody(req);
    const category = helpCategories.find((c) => c.id === Number(body.category_id)) ?? null;
    const article = {
      id: nextId(),
      category_id: category?.id ?? null,
      category: category ? { id: category.id, name: category.name, slug: category.slug, icon: category.icon } : null,
      title: body.title ?? 'Untitled guide',
      slug: String(body.title ?? 'guide').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      excerpt: body.excerpt ?? String(body.body ?? '').split('\n')[0].slice(0, 155),
      body: body.body ?? '',
      status: body.status ?? 'draft',
      audience: body.audience ?? 'tenant',
      tags: body.tags ?? [],
      is_pinned: !!body.is_pinned,
      read_minutes: Math.max(1, Math.ceil(String(body.body ?? '').split(/\s+/).length / 200)),
      views: 0,
      helpful_yes: 0,
      helpful_no: 0,
      helpful_score: null,
      author: { id: 1, name: 'Super Admin' },
      published_at: body.status === 'published' ? iso(Date.now()) : null,
      updated_at: iso(Date.now()),
    };
    articles.unshift(article);
    return json(res, 201, { data: article }), true;
  }

  m = path.match(/^\/api\/admin\/support\/guides\/(\d+)$/);
  if (m && method === 'PATCH') {
    const article = articles.find((a) => a.id === +m[1]);
    if (!article) return json(res, 404, { message: 'Guide not found' }), true;
    const body = await readBody(req);
    for (const f of ['title', 'excerpt', 'body', 'status', 'audience']) {
      if (body[f] !== undefined && body[f] !== null) article[f] = body[f];
    }
    if (body.category_id !== undefined) {
      const category = helpCategories.find((c) => c.id === Number(body.category_id)) ?? null;
      article.category_id = category?.id ?? null;
      article.category = category ? { id: category.id, name: category.name, slug: category.slug, icon: category.icon } : null;
    }
    if (body.is_pinned !== undefined) article.is_pinned = !!body.is_pinned;
    if (Array.isArray(body.tags)) article.tags = body.tags;
    if (body.body !== undefined) article.read_minutes = Math.max(1, Math.ceil(String(body.body).split(/\s+/).length / 200));
    if (article.status === 'published' && !article.published_at) article.published_at = iso(Date.now());
    article.updated_at = iso(Date.now());
    return json(res, 200, { data: article }), true;
  }
  if (m && method === 'DELETE') {
    const i = articles.findIndex((a) => a.id === +m[1]);
    if (i >= 0) articles.splice(i, 1);
    return json(res, 200, { data: { deleted: true } }), true;
  }

  if (path === '/api/admin/support/guide-categories' && method === 'POST') {
    const body = await readBody(req);
    const category = {
      id: nextId(),
      name: body.name ?? 'New category',
      slug: String(body.name ?? 'category').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: body.description ?? null,
      icon: body.icon ?? 'book',
      position: helpCategories.length,
      articles_count: 0,
    };
    helpCategories.push(category);
    return json(res, 201, { data: category }), true;
  }

  if (path === '/api/admin/support/canned-replies' && method === 'GET') {
    return json(res, 200, { data: [...cannedReplies].sort((a, b) => b.uses - a.uses) }), true;
  }
  if (path === '/api/admin/support/canned-replies' && method === 'POST') {
    const body = await readBody(req);
    const reply = { id: nextId(), title: body.title, shortcut: body.shortcut ?? null, category: body.category ?? 'general', body: body.body, uses: 0 };
    cannedReplies.push(reply);
    return json(res, 201, { data: reply }), true;
  }

  // -------------------------------------------------------- tenant console
  // The mock session is always the super admin, so the tenant help centre is
  // pinned to tenant #1 for demo purposes.
  const TENANT_ID = 1;

  if (path === '/api/tenant/support/overview') {
    const mine = tickets.filter((t) => t.tenant?.id === TENANT_ID);
    const myTasks = tasks.filter((t) => t.tenant?.id === TENANT_ID && t.owner_type === 'tenant');
    const chat = chats.find((c) => c.tenant?.id === TENANT_ID && c.status !== 'ended');
    return json(res, 200, {
      data: {
        tickets: {
          open: mine.filter(isOpen).length,
          awaiting_you: mine.filter((t) => t.status === 'pending').length,
          resolved: mine.filter((t) => ['resolved', 'closed'].includes(t.status)).length,
          total: mine.length,
        },
        tasks: {
          open: myTasks.filter((t) => t.status !== 'done').length,
          overdue: myTasks.filter((t) => t.status !== 'done' && Date.parse(t.due_at) < Date.now()).length,
          done: myTasks.filter((t) => t.status === 'done').length,
          total: myTasks.length,
        },
        chat: { status: chat?.status ?? 'none', unread: chat?.unread_count ?? 0 },
        guides: { published: articles.filter((a) => a.status === 'published').length },
      },
    }), true;
  }

  if (path === '/api/tenant/support/tickets' && method === 'GET') {
    let rows = tickets.filter((t) => t.tenant?.id === TENANT_ID);
    const status = q.get('status');
    if (status === 'open') rows = rows.filter(isOpen);
    else if (status && status !== 'all') rows = rows.filter((t) => t.status === status);
    return json(res, 200, { data: rows.map((t) => ({ ...t, messages: t.messages.filter((msg) => msg.visibility === 'public') })) }), true;
  }
  if (path === '/api/tenant/support/tickets' && method === 'POST') {
    const body = await readBody(req);
    const created = iso(Date.now());
    const priority = body.priority ?? 'normal';
    const ticket = {
      id: ++ticketSeq, reference: `TKT-${ticketSeq}`, subject: body.subject, summary: String(body.body ?? '').slice(0, 150),
      category: body.category ?? 'other', channel: 'portal', status: 'new', priority, tags: [],
      tenant: tenantRef(TENANT_ID), requester: people.nana, assignee: null,
      first_response_at: null, last_reply_at: created, resolved_at: null, closed_at: null,
      sla_due_at: iso(Date.now() + (SLA_MINUTES[priority] ?? 480) * MIN), sla_breached: false,
      satisfaction: null, satisfaction_comment: null, messages_count: 1, created_at: created, updated_at: created,
      messages: [{
        id: nextId(), ticket_id: ticketSeq, author_id: people.nana.id, author_name: people.nana.name,
        author_role: 'requester', visibility: 'public', body: String(body.body ?? ''), attachments: [], created_at: created,
      }],
    };
    tickets.unshift(ticket);
    return json(res, 201, { data: ticket }), true;
  }

  m = path.match(/^\/api\/tenant\/support\/tickets\/(\d+)$/);
  if (m && method === 'GET') {
    const ticket = tickets.find((t) => t.id === +m[1]);
    if (!ticket) return json(res, 404, { message: 'Ticket not found' }), true;
    return json(res, 200, { data: { ...ticket, messages: ticket.messages.filter((msg) => msg.visibility === 'public') } }), true;
  }

  m = path.match(/^\/api\/tenant\/support\/tickets\/(\d+)\/messages$/);
  if (m && method === 'POST') {
    const ticket = tickets.find((t) => t.id === +m[1]);
    if (!ticket) return json(res, 404, { message: 'Ticket not found' }), true;
    const body = await readBody(req);
    ticket.messages.push({
      id: nextId(), ticket_id: ticket.id, author_id: people.nana.id, author_name: people.nana.name,
      author_role: 'requester', visibility: 'public', body: String(body.body ?? ''), attachments: [], created_at: iso(Date.now()),
    });
    ticket.messages_count = ticket.messages.length;
    ticket.last_reply_at = iso(Date.now());
    if (['resolved', 'closed', 'pending'].includes(ticket.status)) ticket.status = 'open';
    return json(res, 201, { data: { ...ticket, messages: ticket.messages.filter((msg) => msg.visibility === 'public') } }), true;
  }

  m = path.match(/^\/api\/tenant\/support\/tickets\/(\d+)\/rate$/);
  if (m && method === 'POST') {
    const ticket = tickets.find((t) => t.id === +m[1]);
    if (!ticket) return json(res, 404, { message: 'Ticket not found' }), true;
    const body = await readBody(req);
    ticket.satisfaction = Number(body.satisfaction);
    ticket.satisfaction_comment = body.satisfaction_comment ?? null;
    return json(res, 200, { data: ticket }), true;
  }

  if (path === '/api/tenant/support/chat' && method === 'GET') {
    let chat = chats.find((c) => c.tenant?.id === TENANT_ID && c.status !== 'ended');
    if (!chat) {
      chat = mkChat({ topic: 'Tenant console chat', status: 'queued', started_at: iso(Date.now()), tenant_id: TENANT_ID, visitor: people.nana, thread: [] });
      chats.unshift(chat);
    }
    return json(res, 200, { data: chat }), true;
  }
  if (path === '/api/tenant/support/chat/messages' && method === 'POST') {
    const body = await readBody(req);
    let chat = chats.find((c) => c.tenant?.id === TENANT_ID && c.status !== 'ended');
    if (!chat) {
      chat = mkChat({ topic: 'Tenant console chat', status: 'queued', started_at: iso(Date.now()), tenant_id: TENANT_ID, visitor: people.nana, thread: [] });
      chats.unshift(chat);
    }
    const message = {
      id: nextId(), chat_id: chat.id, author_id: people.nana.id, author_name: people.nana.name,
      author_role: 'visitor', body: String(body.body ?? ''), read_at: null, created_at: iso(Date.now()),
    };
    chat.messages.push(message);
    chat.last_message_at = message.created_at;
    chat.unread_count += 1;
    return json(res, 201, { data: message }), true;
  }

  if (path === '/api/tenant/support/tasks' && method === 'GET') {
    return json(res, 200, { data: tasks.filter((t) => t.tenant?.id === TENANT_ID && t.owner_type === 'tenant') }), true;
  }
  m = path.match(/^\/api\/tenant\/support\/tasks\/(\d+)$/);
  if (m && method === 'PATCH') {
    const task = tasks.find((t) => t.id === +m[1]);
    if (!task) return json(res, 404, { message: 'Task not found' }), true;
    const body = await readBody(req);
    if (body.status) task.status = body.status;
    if (Array.isArray(body.checklist)) task.checklist = body.checklist;
    task.completed_at = task.status === 'done' ? iso(Date.now()) : null;
    task.overdue = task.status !== 'done' && !!task.due_at && Date.parse(task.due_at) < Date.now();
    return json(res, 200, { data: task }), true;
  }

  if (path === '/api/tenant/support/guides' && method === 'GET') {
    let rows = articles.filter((a) => a.status === 'published');
    if (q.get('category_id')) rows = rows.filter((a) => a.category_id === Number(q.get('category_id')));
    const term = (q.get('q') ?? '').trim().toLowerCase();
    if (term) rows = rows.filter((a) => `${a.title} ${a.excerpt} ${a.body}`.toLowerCase().includes(term));
    rows.sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned) || b.views - a.views);
    return json(res, 200, { data: { categories: helpCategories, articles: rows } }), true;
  }
  m = path.match(/^\/api\/tenant\/support\/guides\/(\d+)$/);
  if (m && method === 'GET') {
    const article = articles.find((a) => a.id === +m[1]);
    if (!article) return json(res, 404, { message: 'Guide not found' }), true;
    article.views += 1;
    return json(res, 200, { data: article }), true;
  }
  m = path.match(/^\/api\/tenant\/support\/guides\/(\d+)\/feedback$/);
  if (m && method === 'POST') {
    const article = articles.find((a) => a.id === +m[1]);
    if (!article) return json(res, 404, { message: 'Guide not found' }), true;
    const body = await readBody(req);
    if (body.helpful) article.helpful_yes += 1;
    else article.helpful_no += 1;
    const total = article.helpful_yes + article.helpful_no;
    article.helpful_score = total ? Math.round((article.helpful_yes / total) * 100) : null;
    return json(res, 200, { data: article }), true;
  }

  return json(res, 404, { message: `Mock support API: no handler for ${method} ${path}` }), true;
}
