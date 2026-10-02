export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: 'super_admin' | 'tenant_owner' | 'store_staff' | 'customer';
  tenant_id: number | null;
  tenant_slug?: string | null;
  tenant_name?: string | null;
  tenant_status?: 'pending' | 'active' | 'suspended' | 'rejected' | null;
  department?: string | null;
  roles: { role: string; tenant_id: number | null; store_id: number | null; department?: string | null }[];
}

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
}

export interface LineChart {
  type: 'line';
  title: string;
  points: Record<string, string | number>[];
  series: ChartSeries[];
}

export interface BarChart {
  type: 'bar';
  title: string;
  bars: { label: string; value: number; color: string }[];
}

export interface DonutChart {
  type: 'donut';
  title: string;
  slices: { label: string; value: number; color: string }[];
}

export type MhChart = LineChart | BarChart | DonutChart;

export interface DeptKpi {
  key: string;
  label: string;
  value: string;
  format: 'currency' | 'number' | 'percent';
}

export interface DeptProgress {
  label: string;
  current: string;
  target: string;
  percent: number;
  format: string;
}

export interface DeptDashboard {
  department: string;
  title: string;
  kpis: DeptKpi[];
  progress: DeptProgress[];
  charts: MhChart[];
  table?: { title: string; columns: string[]; rows: string[][] };
}

export interface AccountingDashboard {
  currency: string;
  kpis: {
    cash_balance: number; receivables: number; payables: number; net_cash_flow: number;
    cash_in: number; cash_out: number; overdue_invoices: number; open_bills: number;
    pending_settlements: number; committed_spend: number;
  };
  cash_flow: { label: string; month: string; incoming: number; outgoing: number }[];
  aging: Record<'current' | '1_30' | '31_60' | '61_90' | 'over_90', number>;
  invoice_statuses: Record<string, number>;
  purchase_statuses: Record<string, number>;
  recent_activity: { type: string; title: string; amount: number; status: string; at: string }[];
}

export interface AccountingContact {
  id: number; type: 'customer' | 'vendor' | 'both'; name: string; email?: string | null;
  phone?: string | null; tax_id?: string | null; address?: string | null; currency: string;
  payment_terms: number; opening_balance: string | number; is_active: boolean;
  invoices_count?: number; purchase_orders_count?: number;
}

export interface AccountingLineItem {
  id?: number; description: string; sku?: string | null; quantity: string | number;
  unit_price?: string | number; unit_cost?: string | number; tax_rate: string | number;
  line_subtotal?: string | number; line_tax?: string | number; line_total?: string | number;
}

export interface AccountingInvoice {
  id: number; number: string; contact_id?: number | null; customer_name: string;
  customer_email?: string | null; issue_date: string; due_date: string;
  status: 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'void';
  subtotal: string | number; tax_total: string | number; discount_total: string | number;
  total: string | number; amount_paid: string | number; balance_due: string | number;
  currency: string; notes?: string | null; items: AccountingLineItem[];
  payments?: AccountingPayment[];
}

export interface AccountingPayment {
  id: number; reference: string; direction: 'incoming' | 'outgoing'; method: string;
  amount: string | number; currency: string; paid_on: string; notes?: string | null;
  invoice?: { id: number; number: string; customer_name: string } | null;
  expense?: { id: number; number: string; vendor_name?: string; description: string } | null;
}

export interface AccountingExpense {
  id: number; number: string; vendor_id?: number | null; vendor_name?: string | null;
  category: string; description: string; expense_date: string; due_date?: string | null;
  amount: string | number; tax_amount: string | number; total: string | number;
  currency: string; status: 'draft' | 'pending' | 'paid' | 'overdue' | 'void';
  receipt_reference?: string | null; vendor?: Pick<AccountingContact, 'id' | 'name'> | null;
}

export interface PurchaseOrder {
  id: number; number: string; vendor_id?: number | null; vendor_name: string;
  order_date: string; expected_date?: string | null;
  status: 'draft' | 'pending_approval' | 'approved' | 'ordered' | 'partially_received' | 'received' | 'cancelled';
  subtotal: string | number; tax_total: string | number; total: string | number;
  currency: string; notes?: string | null; items: AccountingLineItem[];
  vendor?: Pick<AccountingContact, 'id' | 'name' | 'email'> | null;
}

export interface AccountingAccount {
  id: number; code: string; name: string; type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  subtype?: string | null; system_key?: string | null; description?: string | null;
  is_system: boolean; is_active: boolean; debit_total?: number; credit_total?: number; balance?: number;
}

export interface AccountingJournalLine {
  id?: number; account_id: number; description?: string | null;
  debit: string | number; credit: string | number; account?: Pick<AccountingAccount, 'id' | 'code' | 'name' | 'type'>;
}

export interface AccountingJournalEntry {
  id: number; number: string; entry_date: string; reference?: string | null; memo: string;
  status: 'draft' | 'posted'; source_type?: string | null; source_id?: number | null;
  total_debit: string | number; total_credit: string | number; posted_at?: string | null;
  lines: AccountingJournalLine[]; creator?: { id: number; name: string } | null;
  poster?: { id: number; name: string } | null;
}

export interface AccountingReportRow {
  id: number; code: string; name: string; type: string; debit: number; credit: number; balance: number;
}

export interface AccountingReport {
  report: 'profit_loss' | 'balance_sheet' | 'trial_balance'; from: string; to: string; currency: string;
  income?: AccountingReportRow[]; expenses?: AccountingReportRow[]; total_income?: number; total_expenses?: number; net_income?: number;
  assets?: AccountingReportRow[]; liabilities?: AccountingReportRow[]; equity?: AccountingReportRow[];
  total_assets?: number; total_liabilities?: number; total_equity?: number; difference?: number;
  accounts?: AccountingReportRow[]; total_debit?: number; total_credit?: number;
}

export interface AccountingBankAccount {
  id: number; name: string; bank_name?: string | null; account_number_last4?: string | null;
  currency: string; opening_balance: string | number; is_active: boolean;
  statement_balance?: number; ledger_balance?: number; difference?: number;
  transactions_count?: number; unmatched_count?: number;
  ledger_account?: { id: number; code: string; name: string };
}

export interface AccountingBankTransaction {
  id: number; bank_account_id: number; payment_id?: number | null; transaction_date: string;
  description: string; reference?: string | null; amount: string | number;
  status: 'unmatched' | 'matched' | 'excluded'; reconciled_at?: string | null;
  bank_account?: Pick<AccountingBankAccount, 'id' | 'name' | 'currency'>;
  payment?: Pick<AccountingPayment, 'id' | 'reference' | 'direction' | 'amount' | 'currency' | 'paid_on'> | null;
}

export interface SalesDashboard {
  currency: string;
  kpis: {
    pipeline_value: number; weighted_forecast: number; open_opportunities: number;
    active_leads: number; new_leads_30d: number; open_quotes: number; open_quotes_value: number;
    win_rate: number; won_revenue_30d: number; active_customers: number;
  };
  stages: { stage: string; label: string; count: number; value: number; probability: number }[];
  trend: { label: string; month: string; opened: number; won: number }[];
  lead_sources: { source: string; count: number }[];
  recent_activity: { type: string; title: string; amount: number; status: string; at: string }[];
  top_customers: { id: number; name: string; company?: string | null; won_total: string | number; open_deals_count: number }[];
}

export interface SalesLead {
  id: number; name: string; company?: string | null; email?: string | null; phone?: string | null;
  source: 'web' | 'referral' | 'campaign' | 'walk_in' | 'partner' | 'other';
  status: 'new' | 'contacted' | 'qualified' | 'disqualified' | 'converted';
  estimated_value: string | number; currency: string; notes?: string | null;
  last_contacted_at?: string | null; converted_at?: string | null;
  converted_customer_id?: number | null; created_at?: string;
  owner?: { id: number; name: string } | null;
}

export interface SalesOpportunity {
  id: number; number: string; title: string;
  stage: 'prospecting' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  expected_value: string | number; probability: number; currency: string;
  expected_close_date?: string | null; lost_reason?: string | null; notes?: string | null;
  closed_at?: string | null; customer_id?: number | null; lead_id?: number | null;
  customer?: { id: number; name: string; company?: string | null } | null;
  owner?: { id: number; name: string } | null;
  lead?: { id: number; name: string } | null;
}

export interface SalesQuoteLineItem {
  id?: number; description: string; quantity: string | number; unit_price: string | number;
  tax_rate: string | number; line_subtotal?: string | number; line_tax?: string | number; line_total?: string | number;
}

export interface SalesQuote {
  id: number; number: string; customer_id?: number | null; opportunity_id?: number | null;
  customer_name: string; customer_email?: string | null; issue_date: string; expiry_date: string;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'expired' | 'void';
  subtotal: string | number; tax_total: string | number; discount_total: string | number;
  total: string | number; currency: string; notes?: string | null;
  customer?: { id: number; name: string; company?: string | null } | null;
  opportunity?: { id: number; number: string; title: string } | null;
  items: SalesQuoteLineItem[];
}

export interface SalesCustomer {
  id: number; name: string; company?: string | null; email?: string | null; phone?: string | null;
  segment: string; status: 'active' | 'inactive'; currency: string; notes?: string | null;
  opportunities_count?: number; quotes_count?: number; open_deals_count?: number;
  won_total?: string | number;
}

export type SellerOrderStatus =
  | 'awaiting_fulfillment'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'refunded';

export interface SellerOrderItem {
  id: number;
  seller_order_id: number;
  variant_id?: number | null;
  product_name: string;
  sku?: string | null;
  unit_price: string | number;
  qty: number;
  line_tax: string | number;
  options?: Record<string, unknown> | null;
}

export interface SellerOrderAddress {
  id: number;
  full_name: string;
  phone?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null;
  postal_code?: string | null;
  country: string;
}

export interface SellerOrderSettlement {
  id: number;
  seller_order_id: number;
  gross: string | number;
  commission: string | number;
  delivery_fee: string | number;
  refund_amount: string | number;
  net: string | number;
  status: 'pending' | 'released';
}

export interface SellerOrderStoreRef {
  id: number;
  name: string;
  slug?: string;
}

export interface SellerOrderCustomer {
  id: number;
  name: string;
  email: string;
}

export interface SellerOrderMaster {
  id: number;
  status: string;
  currency?: string;
  grand_total?: string | number;
  placed_at?: string | null;
  created_at?: string;
  user?: SellerOrderCustomer | null;
  shipping_address?: SellerOrderAddress | null;
}

export interface SellerOrder {
  id: number;
  order_id: number;
  tenant_id: number;
  store_id: number;
  subtotal: string | number;
  delivery_fee: string | number;
  commission: string | number;
  net_settlement: string | number;
  status: SellerOrderStatus;
  created_at: string;
  updated_at?: string;
  items: SellerOrderItem[];
  store?: SellerOrderStoreRef | null;
  order?: SellerOrderMaster | null;
  settlement?: SellerOrderSettlement | null;
}

export interface SellerOrderStats {
  total_count: number;
  awaiting_fulfillment_count: number;
  processing_count: number;
  shipped_count: number;
  delivered_count: number;
  completed_count: number;
  cancelled_count: number;
  total_net_payout: number;
}

export interface SellerOrdersResponse {
  data: SellerOrder[];
  meta: { page: number; per_page: number; total: number; last_page: number };
  stats: SellerOrderStats;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ProductCard {
  id: number;
  name: string;
  slug: string;
  price: string;
  brand?: string | null;
  status: string;
  image?: string | null;
  images: { id: number; url: string; is_primary: boolean }[];
  store: { id: number; name: string; slug: string } | null;
  category: { id: number; name: string; slug: string } | null;
  variants: {
    id: number;
    sku: string;
    options: Record<string, unknown> | null;
    price: string;
    available: number;
    status: string;
  }[];
  description?: string;
  sponsored?: boolean;
  impression_id?: number;
}

export interface Storefront {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  city?: string | null;
  country?: string | null;
  delivery_fee: string | number;
  delivery_days: number;
  is_featured?: boolean;
}

export interface Paginated<T> {
  data: T;
  meta: { page: number; per_page: number; total: number; last_page: number };
}

export interface CartPayload {
  id: number;
  groups: {
    store: { id: number; name: string; slug: string; delivery_fee: string | number };
    items: {
      id: number;
      variant_id: number;
      sku: string;
      product_name: string;
      options: Record<string, unknown> | null;
      qty: number;
      unit_price: string;
      line_total: string;
      image?: string | null;
      available: number;
    }[];
    subtotal: string;
  }[];
  totals: {
    subtotal: string;
    delivery_total: string;
    tax_total: string;
    grand_total: string;
    currency: string;
  };
}

export interface Address {
  id: number;
  label?: string | null;
  full_name: string;
  phone?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null;
  postal_code?: string | null;
  country: string;
  is_default: boolean;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id?: number | null;
  children?: Category[];
}

export interface TenantDocument {
  key: string;
  label: string;
  path: string;
  original_name: string;
  mime: string;
  size: number;
  uploaded_at: string;
}

export interface TenantChecklist {
  items: Record<string, boolean>;
  complete: boolean;
  missing: string[];
}

export type TenantStatus = 'pending' | 'active' | 'suspended' | 'rejected';

export interface TenantApplication {
  id: number;
  name: string;
  slug: string;
  status: TenantStatus;
  owner_user_id: number;
  country?: string | null;
  business_name?: string | null;
  business_details?: string | null;

  trading_name?: string | null;
  business_type?: string | null;
  registration_number?: string | null;
  tax_id?: string | null;
  year_established?: number | null;
  website?: string | null;
  permit_number?: string | null;
  permit_expires_at?: string | null;

  product_summary?: string | null;
  categories_offered?: string[] | null;

  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  region?: string | null;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;

  social_links?: Record<string, string> | null;

  owner_name?: string | null;
  owner_email?: string | null;
  owner_phone?: string | null;
  owner_id_type?: string | null;
  /** Only returned by the admin detail endpoint — hidden everywhere else. */
  owner_id_number?: string | null;

  documents?: TenantDocument[] | null;
  documents_count?: number;
  /** Summary flag: false when required review details are still missing. */
  checklist_complete?: boolean;

  payout_method?: string | null;
  payout_account_name?: string | null;
  payout_account_number?: string | null;
  bank_name?: string | null;
  mobile_money_provider?: string | null;
  card_brand?: string | null;
  card_last4?: string | null;

  submitted_at?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  rejection_reason?: string | null;
  checklist?: TenantChecklist;

  stores?: { id: number; name: string; slug: string; status: string }[];
  owner?: { id: number; name: string; email: string } | null;
}

// ------------------------------------------------------------- super admin

export interface Kpi {
  value: number;
  previous: number;
  change: number;
  direction: 'up' | 'down' | 'flat';
  format: 'number' | 'currency';
}

export interface SeriesPoint {
  date: string;
  value: number;
}

export interface AdminOverview {
  range: { days: number; start: string; end: string };
  kpis: Record<string, Kpi>;
  totals: Record<string, number>;
  series: { revenue: SeriesPoint[]; orders: SeriesPoint[]; tenants: SeriesPoint[]; users: SeriesPoint[] };
  tenant_status: Record<string, number>;
  plan_distribution: { plan: string; slug: string; subscribers: number; mrr: number }[];
  top_tenants: { tenant_id: number; name: string; orders: number; revenue: number; commission: number }[];
  recent_activity: { id: number; action: string; entity: string; actor: string; created_at: string }[];
}

export interface AdminAnalytics {
  range?: { days: number; start: string; end: string };
  gmv: string | number;
  commission: string | number;
  take_rate: string | number;
  orders: number;
  funnel: {
    views: number;
    carts: number;
    checkouts: number;
    paid: number;
  };
  daily: { day: string; gmv: string | number; orders: number }[];
  ads: {
    impressions: number;
    clicks: number;
    spend: string | number;
    ctr: number;
  };
}

export interface AdminInsight {
  narrative?: string;
  summary?: string;
  payload?: {
    narrative?: string;
    metrics?: AdminAnalytics;
    window?: string;
    source?: string;
  };
  generated_at?: string;
}

export interface AdminUserRole {
  id: number;
  role: string;
  role_name?: string;
  permissions?: string[];
  tenant_id: number | null;
  store_id?: number | null;
  department?: string | null;
  tenant: string | null;
}

export interface PermissionDefinition {
  key: string;
  label: string;
  description: string;
}

export interface PermissionGroup {
  key: string;
  label: string;
  permissions: PermissionDefinition[];
}

export interface AdminRoleDefinition {
  id: number;
  key: string;
  name: string;
  description?: string | null;
  permissions: string[];
  is_system: boolean;
  users_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  status: 'active' | 'suspended';
  primary_role: string;
  last_login_at?: string | null;
  created_at: string;
  roles: AdminUserRole[];
  orders_count?: number;
  orders_total?: number;
}

export interface AdminUserSummary {
  total: number;
  active: number;
  suspended: number;
  by_role: Record<string, number>;
}

export interface Plan {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  price: string | number;
  currency: string;
  interval: 'monthly' | 'yearly';
  trial_days: number;
  commission_rate: string | number;
  max_products?: number | null;
  max_stores?: number | null;
  max_staff?: number | null;
  features?: string[] | null;
  is_active: boolean;
  sort_order: number;
  subscribers_count?: number;
}

export interface Subscription {
  id: number;
  tenant_id: number;
  plan_id: number;
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';
  amount: string | number;
  currency: string;
  interval: 'monthly' | 'yearly';
  trial_ends_at?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  canceled_at?: string | null;
  tenant?: { id: number; name: string; business_name?: string | null };
  plan?: Plan;
}

export interface SubscriptionStats {
  mrr: number;
  arr: number;
  arpa: number;
  active: number;
  trialing: number;
  past_due: number;
  canceled: number;
  churn_rate: number;
  outstanding: number;
  collected: number;
  by_status: Record<string, number>;
  revenue_by_month: SeriesPoint[];
}

export interface Invoice {
  id: number;
  number: string;
  tenant_id: number;
  amount: string | number;
  currency: string;
  status: 'open' | 'paid' | 'failed' | 'void';
  issued_at?: string | null;
  paid_at?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  tenant?: { id: number; name: string; business_name?: string | null };
  subscription?: { id: number; plan?: { id: number; name: string } };
}

export type SettingFieldType =
  | 'string'
  | 'text'
  | 'number'
  | 'bool'
  | 'json'
  | 'email'
  | 'url'
  | 'color'
  | 'select'
  | 'time'
  | 'secret'
  | 'image';

export interface SettingOption {
  value: string;
  label: string;
}

export interface SettingField {
  key: string;
  group: string;
  type: SettingFieldType;
  label: string;
  help: string;
  value: string | number | boolean | null;
  default: string | number | boolean | null;
  updated_at?: string | null;
  options?: SettingOption[] | null;
  placeholder?: string | null;
  unit?: string | null;
  columns?: 'full' | null;
  has_value?: boolean;
}

export interface SettingGroupMeta {
  key: string;
  label: string;
  icon: string;
  description: string;
}

export interface SettingsPayload {
  data: Record<string, SettingField[]>;
  meta: { groups: SettingGroupMeta[]; assets: string[] };
}

export interface PlatformBackup {
  id: number;
  filename: string;
  size_bytes: number;
  status: 'completed' | 'failed';
  scope: string;
  scope_label: string;
  type: string;
  tables?: string[] | null;
  records: number;
  note?: string | null;
  error?: string | null;
  created_at?: string | null;
  restored_at?: string | null;
  created_by?: { id: number; name: string; email: string } | null;
}

export interface BackupScope {
  value: string;
  label: string;
  description: string;
  tables: number;
}

export interface BackupMeta {
  scopes: BackupScope[];
  retention_days: number;
  total_size_bytes: number;
  last_completed_at?: string | null;
  scheduled: boolean;
  frequency: string;
}

export interface PaymentMethod {
  key: 'card' | 'mobile_money' | 'bank_transfer' | 'cash_on_delivery' | string;
  label: string;
  description: string;
  online: boolean;
}

export interface PaymentMethodsPayload {
  provider: string;
  mode: 'test' | 'live' | string;
  currency: string;
  methods: PaymentMethod[];
}

export interface AuthSession {
  id: number;
  name: string;
  current: boolean;
  created_at?: string | null;
  last_used_at?: string | null;
  expires_at?: string | null;
}

export interface GatewayTestResult {
  ok: boolean;
  provider?: string;
  transport?: string;
  message: string;
  reference?: string | null;
  sent_at?: string | null;
}

// ---------------------------------------------------------------- marketing

export type SocialPlatform = 'facebook' | 'instagram' | 'x' | 'linkedin' | 'tiktok' | 'youtube';

export interface SocialAccount {
  id?: number | null;
  platform: SocialPlatform;
  handle?: string | null;
  display_name?: string | null;
  status: 'connected' | 'disconnected';
  followers: number;
  connected_at?: string | null;
}

export interface MarketingCampaign {
  id: number;
  name: string;
  objective: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  channels: SocialPlatform[];
  daily_budget?: string | number | null;
  total_budget?: string | number | null;
  spend: string | number;
  impressions: number;
  clicks: number;
  conversions: number;
  starts_at?: string | null;
  ends_at?: string | null;
  posts_count?: number;
}

export interface SocialPost {
  id: number;
  campaign_id?: number | null;
  campaign?: { id: number; name: string } | null;
  body: string;
  link_url?: string | null;
  channels: SocialPlatform[];
  status: 'draft' | 'scheduled' | 'published';
  scheduled_for?: string | null;
  published_at?: string | null;
  impressions: number;
  clicks: number;
  engagements: number;
  created_at?: string;
}

export interface MarketingOverview {
  accounts: { connected: number; total_followers: number };
  campaigns: { active: number; spend: number; impressions: number; clicks: number; conversions: number };
  posts: { published: number; scheduled: number };
  sponsored: { campaigns: number; active: number; spend: number };
}

// ---------------------------------------------------------------- audit log

export interface AuditActorRef {
  id: number;
  name: string;
  email: string;
}

export interface AuditTenantRef {
  id: number;
  name: string;
  status?: string;
}

export interface AuditDiff {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

export interface AuditLogEntry {
  id: number;
  actor_user_id: number | null;
  tenant_id: number | null;
  action: string;
  subject_type: string | null;
  subject_id: number | null;
  diff: AuditDiff | null;
  ip: string | null;
  created_at: string;
  actor: AuditActorRef | null;
  tenant: AuditTenantRef | null;
}

export interface AuditLogStats {
  total: number;
  today: number;
  last_7_days: number;
  unique_actors: number;
  unique_ips: number;
}

export interface AuditCountFacet {
  value: string;
  count: number;
}

export interface AuditActorFacet {
  id: number;
  name: string;
  email: string;
  count: number;
}

export interface AuditTenantFacet {
  id: number;
  name: string;
  count: number;
}

export interface AuditLogFacets {
  actions: AuditCountFacet[];
  subject_types: AuditCountFacet[];
  actors: AuditActorFacet[];
  ips: AuditCountFacet[];
  tenants: AuditTenantFacet[];
}

// ------------------------------------------------------------ service desk

export type TicketStatus = 'new' | 'open' | 'pending' | 'on_hold' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TicketChannel = 'portal' | 'email' | 'chat' | 'phone' | 'whatsapp';
export type TicketCategory =
  | 'billing' | 'payouts' | 'orders' | 'catalog' | 'technical' | 'account' | 'onboarding' | 'other';

export interface SupportPersonRef {
  id: number | null;
  name: string;
  email?: string | null;
  type?: string;
}

export interface SupportTenantRef {
  id: number;
  name: string;
  status?: string;
}

export interface SupportMessage {
  id: number;
  ticket_id: number;
  author_id: number | null;
  author_name: string;
  author_role: 'agent' | 'requester' | 'system';
  visibility: 'public' | 'internal';
  body: string;
  attachments?: unknown[];
  created_at: string;
}

export interface SupportTicket {
  id: number;
  reference: string;
  subject: string;
  summary?: string | null;
  category: TicketCategory;
  channel: TicketChannel;
  status: TicketStatus;
  priority: TicketPriority;
  tags: string[];
  tenant: SupportTenantRef | null;
  requester: SupportPersonRef;
  assignee: SupportPersonRef | null;
  first_response_at?: string | null;
  last_reply_at?: string | null;
  resolved_at?: string | null;
  closed_at?: string | null;
  sla_due_at?: string | null;
  sla_minutes_remaining?: number | null;
  sla_breached: boolean;
  satisfaction?: number | null;
  satisfaction_comment?: string | null;
  messages_count: number;
  created_at: string;
  updated_at?: string;
  messages?: SupportMessage[] | null;
  tasks?: SupportTask[] | null;
}

export interface SupportTicketSummary {
  all: number;
  open: number;
  unassigned: number;
  breached: number;
  resolved: number;
  closed: number;
}

export type ChatStatus = 'queued' | 'active' | 'ended';

export interface SupportChatMessage {
  id: number;
  chat_id: number;
  author_id: number | null;
  author_name: string;
  author_role: 'agent' | 'visitor' | 'bot' | 'system';
  body: string;
  read_at?: string | null;
  created_at: string;
}

export interface SupportChat {
  id: number;
  topic: string | null;
  status: ChatStatus;
  priority: TicketPriority;
  visitor: SupportPersonRef;
  tenant: SupportTenantRef | null;
  agent: SupportPersonRef | null;
  ticket_id: number | null;
  started_at?: string | null;
  answered_at?: string | null;
  ended_at?: string | null;
  last_message_at?: string | null;
  wait_seconds?: number | null;
  unread_count: number;
  rating?: number | null;
  messages?: SupportChatMessage[] | null;
  typing?: boolean;
}

export interface SupportChatSummary {
  queued: number;
  active: number;
  ended_today: number;
  avg_wait_seconds: number;
  unread: number;
}

export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'review' | 'done';

export interface TaskChecklistItem {
  label: string;
  done: boolean;
}

export interface SupportTask {
  id: number;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TicketPriority;
  owner_type: 'support' | 'tenant';
  ticket_id: number | null;
  ticket_reference?: string | null;
  tenant: SupportTenantRef | null;
  assignee: SupportPersonRef | null;
  due_at?: string | null;
  completed_at?: string | null;
  checklist: TaskChecklistItem[];
  labels: string[];
  position: number;
  overdue: boolean;
  created_at?: string;
}

export interface SupportTaskSummary {
  total: number;
  open: number;
  overdue: number;
  due_today: number;
  done_this_week: number;
  by_status: Record<TaskStatus, number>;
}

export type GuideStatus = 'draft' | 'review' | 'published' | 'archived';

export interface HelpCategory {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  icon: string;
  position: number;
  articles_count?: number;
}

export interface HelpArticle {
  id: number;
  category_id: number | null;
  category: { id: number; name: string; slug: string; icon: string } | null;
  title: string;
  slug: string;
  excerpt?: string | null;
  body?: string;
  status: GuideStatus;
  audience: 'tenant' | 'customer' | 'internal' | 'all';
  tags: string[];
  is_pinned: boolean;
  read_minutes: number;
  views: number;
  helpful_yes: number;
  helpful_no: number;
  helpful_score: number | null;
  author?: { id: number; name: string } | null;
  published_at?: string | null;
  updated_at?: string | null;
}

export interface GuideSummary {
  total: number;
  published: number;
  draft: number;
  review: number;
  views: number;
  avg_helpful: number;
}

export interface SupportAgent {
  id: number;
  name: string;
  email: string;
  open_tickets: number;
  active_chats: number;
  open_tasks: number;
  csat: number | null;
  status: 'online' | 'away' | 'offline';
}

export interface SupportCannedReply {
  id: number;
  title: string;
  shortcut?: string | null;
  category: string;
  body: string;
  uses: number;
}

export interface SupportOverview {
  range_days: number;
  kpis: {
    open_tickets: number;
    unassigned: number;
    urgent: number;
    breached: number;
    created_in_range: number;
    resolved_in_range: number;
    avg_first_response_minutes: number;
    avg_resolution_hours: number;
    csat: number | null;
    active_chats: number;
    queued_chats: number;
    open_tasks: number;
    overdue_tasks: number;
    published_guides: number;
    guide_views: number;
  };
  by_status: { status: TicketStatus; count: number }[];
  by_priority: { priority: TicketPriority; count: number }[];
  by_category: { category: TicketCategory; count: number }[];
  by_channel: { channel: TicketChannel; count: number }[];
  volume: { label: string; date: string; created: number; resolved: number }[];
  agents: SupportAgent[];
  top_tenants: { id: number; name: string; tickets: number; open: number }[];
  recent_tickets: SupportTicket[];
  top_guides: HelpArticle[];
}

export interface TenantSupportOverview {
  tickets: { open: number; awaiting_you: number; resolved: number; total: number };
  tasks: { open: number; overdue: number; done: number; total: number };
  chat: { status: ChatStatus | 'none'; unread: number };
  guides: { published: number };
}

// ------------------------------------------------- tenant console dashboard

export interface DashboardMetric {
  value: number;
  previous: number;
  delta: number;
  direction: 'up' | 'down' | 'flat';
  format: 'currency' | 'number' | 'percent';
  caption: string;
}

export interface DashboardTrendPoint {
  day: string;
  label: string;
  total: number;
  orders: number;
}

export interface DashboardStatusSlice {
  status: string;
  label: string;
  count: number;
  value: number;
}

export interface DashboardTopProduct {
  name: string;
  sku: string | null;
  units: number;
  orders: number;
  revenue: number;
  share: number;
  delta: number;
  stock: number | null;
}

export interface DashboardStoreRow {
  id: number;
  name: string;
  status: string;
  orders: number;
  revenue: number;
  share: number;
}

export interface DashboardInventoryAlert {
  variant_id: number;
  name: string;
  sku: string | null;
  available: number;
  threshold: number;
  severity: 'low' | 'out';
}

export interface DashboardRecentOrder {
  id: number;
  reference: string;
  status: string;
  subtotal: string;
  store: string | null;
  customer: string;
  created_at: string | null;
}

export interface DashboardChatMessage {
  id: number;
  author: string;
  role: string;
  body: string;
  read: boolean;
  at: string | null;
}

export interface DashboardChatThread {
  id: number;
  topic: string;
  status: string;
  priority: string;
  agent: string | null;
  unread: number;
  last_message_at: string | null;
  messages: DashboardChatMessage[];
}

export interface DashboardSupport {
  tickets?: { open: number; awaiting_you: number; resolved: number; total: number };
  tasks?: { open: number; overdue: number; done: number; total: number };
  guides?: { published: number };
  chat?: { unread: number; active: number };
  threads: DashboardChatThread[];
}

export interface TenantDashboard {
  generated_at: string;
  range: { days: number; from: string; to: string };
  sales_today: string;
  open_orders: number;
  low_stock: number;
  kpis: Record<string, DashboardMetric>;
  sales_chart: DashboardTrendPoint[];
  status_breakdown: DashboardStatusSlice[];
  top_products: DashboardTopProduct[];
  stores: DashboardStoreRow[];
  inventory_alerts: DashboardInventoryAlert[];
  recent_orders: DashboardRecentOrder[];
  support: DashboardSupport;
}

export interface DepartmentSummary {
  key: string;
  title: string;
  kpis: DeptKpi[];
  progress: DeptProgress[];
}

// ---------------------------------------------------------------------------
// Tenant catalog (/tenant/products)
//
// One shape has to describe a dress, a crate of mangoes, a laptop, a download
// and a service booking. Columns cover what the platform reasons about
// (stock, shipping, pricing); `specs` + `option_schema` carry whatever the
// vertical needs, described by the preset metadata below.
// ---------------------------------------------------------------------------

export type ProductStatus = 'draft' | 'active' | 'archived';
export type ProductType = 'physical' | 'digital' | 'service';
export type ProductStockState = 'in_stock' | 'low_stock' | 'out_of_stock' | 'backorder' | 'untracked';

export interface ProductInventory {
  id: number;
  variant_id: number;
  quantity: number;
  reserved: number;
  low_stock_threshold: number;
  batch_reference?: string | null;
  expires_at?: string | null;
  location?: string | null;
}

export interface TenantProductVariant {
  id: number;
  product_id: number;
  sku: string;
  name?: string | null;
  options?: Record<string, string> | null;
  price_override?: string | number | null;
  cost_price?: string | number | null;
  weight?: string | number | null;
  barcode?: string | null;
  status: 'active' | 'inactive';
  position?: number;
  inventory?: ProductInventory | null;
}

export interface TenantProductImage {
  id: number;
  product_id: number;
  path: string;
  url: string;
  position: number;
  is_primary: boolean;
}

export interface ProductStoreRef {
  id: number;
  name: string;
  slug?: string;
  status?: string;
  currency?: string;
  products_count?: number;
}

export interface TenantProduct {
  id: number;
  tenant_id: number;
  store_id: number;
  category_id?: number | null;
  name: string;
  slug: string;
  description?: string | null;
  short_description?: string | null;
  status: ProductStatus;
  product_type: ProductType;
  catalog_preset: string;

  price: string | number;
  compare_at_price?: string | number | null;
  cost_price?: string | number | null;
  tax_class?: string | null;
  brand?: string | null;

  unit: string;
  unit_amount?: string | number | null;
  min_order_qty: number;
  max_order_qty?: number | null;

  track_inventory: boolean;
  allow_backorder: boolean;
  low_stock_threshold: number;

  requires_shipping: boolean;
  weight?: string | number | null;
  weight_unit?: string | null;
  length?: string | number | null;
  width?: string | number | null;
  height?: string | number | null;
  dimension_unit?: string | null;

  condition?: string | null;
  warranty_months?: number | null;
  is_perishable: boolean;
  shelf_life_days?: number | null;
  storage_requirement?: string | null;
  country_of_origin?: string | null;
  barcode?: string | null;

  tags?: string[] | null;
  specs?: Record<string, string | number | boolean | null> | null;
  option_schema?: ProductOptionDefinition[] | null;

  has_variants: boolean;
  is_featured: boolean;
  seo_title?: string | null;
  seo_description?: string | null;
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;

  available_stock: number;
  stock_state: ProductStockState;
  primary_image_url?: string | null;
  margin_percent?: number | null;

  variants: TenantProductVariant[];
  images: TenantProductImage[];
  store?: ProductStoreRef | null;
  category?: Category | null;
}

export interface ProductOptionDefinition {
  name: string;
  values: string[];
}

export interface ProductSpecField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date' | 'boolean';
  options?: string[];
  placeholder?: string;
  help?: string;
}

export interface ProductPreset {
  key: string;
  label: string;
  icon: string;
  example: string;
  defaults: Partial<TenantProduct> & Record<string, unknown>;
  options: ProductOptionDefinition[];
  specs: ProductSpecField[];
  tags: string[];
}

export interface ProductUnitOption {
  value: string;
  label: string;
  group: string;
}

export interface ProductCatalogMeta {
  stores: ProductStoreRef[];
  categories: Category[];
  presets: ProductPreset[];
  units: ProductUnitOption[];
  types: ProductType[];
  conditions: string[];
  storage_requirements: string[];
  statuses: ProductStatus[];
  tags: string[];
  brands: string[];
}

export interface ProductCatalogStats {
  total_count: number;
  active_count: number;
  draft_count: number;
  archived_count: number;
  low_stock_count: number;
  out_of_stock_count: number;
  total_units: number;
  retail_value: number;
  inventory_cost: number;
  featured_count: number;
}

export interface TenantProductsResponse {
  data: TenantProduct[];
  meta: { page: number; per_page: number; total: number; last_page: number };
  stats: ProductCatalogStats;
}

export type ProductBulkAction =
  | 'activate' | 'draft' | 'archive' | 'delete'
  | 'feature' | 'unfeature' | 'category' | 'price_adjust' | 'tag';

// ---------------------------------------------------------------------------
// Inventory workspace (/tenant/inventory)
// ---------------------------------------------------------------------------

export type StockState = 'in_stock' | 'low_stock' | 'out_of_stock' | 'backorder' | 'untracked';

export type StockMovementType =
  | 'receipt' | 'adjustment' | 'count' | 'damage' | 'transfer' | 'return' | 'sale';

export interface InventoryRow {
  id: number;
  variant_id: number;
  quantity: number;
  reserved: number;
  available: number;
  low_stock_threshold: number;
  reorder_suggestion: number;
  location: string | null;
  batch_reference: string | null;
  expires_at: string | null;
  days_to_expiry: number | null;
  state: StockState;
  unit_price: number;
  unit_cost: number;
  retail_value: number;
  cost_value: number;
  updated_at: string | null;
  variant: { id: number; sku: string; name: string | null; barcode: string | null; options: Record<string, string> | null } | null;
  product: {
    id: number;
    name: string;
    status: string;
    unit: string;
    product_type: string;
    track_inventory: boolean;
    allow_backorder: boolean;
    is_perishable: boolean;
    image: string | null;
  } | null;
  store: { id: number; name: string } | null;
}

export interface InventoryStats {
  sku_count: number;
  units_on_hand: number;
  units_reserved: number;
  units_available: number;
  retail_value: number;
  cost_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
  expiring_count: number;
  healthy_count: number;
}

export interface InventoryFilterOptions {
  stores: { id: number; name: string; currency?: string }[];
  locations: string[];
}

export interface InventoryResponse {
  data: InventoryRow[];
  meta: { page: number; per_page: number; total: number; last_page: number };
  stats: InventoryStats;
  filters: InventoryFilterOptions;
}

export interface StockMovementEntry {
  id: number;
  type: StockMovementType;
  quantity: number;
  quantity_before: number;
  quantity_after: number;
  reference: string | null;
  location: string | null;
  note: string | null;
  created_at: string | null;
  actor: string | null;
  variant_id: number;
  sku: string | null;
  product_name: string | null;
}

// ---------------------------------------------------------------------------
// Sponsored ads workspace (/tenant/ads)
// ---------------------------------------------------------------------------

export type AdCampaignStatus = 'draft' | 'active' | 'paused' | 'exhausted';

export interface AdCampaignMetrics {
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
  avg_cpc: number;
  cpm: number;
}

export interface AdCampaignRow {
  id: number;
  name: string;
  status: AdCampaignStatus;
  objective: string;
  store: { id: number; name: string } | null;
  daily_budget: number;
  total_budget: number;
  bid_cpc: number;
  spent_today: number;
  spent_total: number;
  remaining_budget: number;
  budget_used_percent: number;
  daily_pacing_percent: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
  metrics: AdCampaignMetrics;
  products: { id: number; name: string | null; price: number | null; match_type: string }[];
}

export interface AdWorkspaceSummary {
  window_days: number;
  campaign_count: number;
  active_count: number;
  paused_count: number;
  draft_count: number;
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
  avg_cpc: number;
  daily_committed: number;
  wallet_balance: number;
  runway_days: number | null;
}

export interface AdWorkspace {
  balance: string;
  campaigns: AdCampaignRow[];
  summary: AdWorkspaceSummary;
  series: { day: string; impressions: number; clicks: number; spend: number }[];
  top_products: { product_id: number; name: string; clicks: number; spend: number; impressions: number }[];
  ledger: { id: number; campaign_id: number; kind: string; amount: number; created_at: string | null }[];
}

export interface AdWorkspaceMeta {
  stores: { id: number; name: string; currency?: string }[];
  products: { id: number; name: string; store_id: number; price: number }[];
  objectives: string[];
}

// ---------------------------------------------------------------------------
// Analytics workspace (/tenant/analytics)
// ---------------------------------------------------------------------------

export interface AnalyticsKpi {
  value: number;
  previous: number;
  delta_percent: number;
  direction: 'up' | 'down' | 'flat';
}

export interface TenantAnalyticsReport {
  range: { days: number; start: string; end: string; previous_start: string; previous_end: string };
  kpis: Record<'gmv' | 'orders' | 'aov' | 'net' | 'units' | 'customers' | 'views' | 'conversion' | 'commission', AnalyticsKpi>;
  series: { day: string; gmv: number; orders: number; views: number }[];
  funnel: {
    steps: { key: string; label: string; value: number; rate: number }[];
    cart_abandonment: number;
  };
  status_mix: { status: string; count: number; gmv: number }[];
  top_products: { name: string; sku: string | null; units: number; revenue: number; orders: number }[];
  stores: { id: number; name: string; currency: string; orders: number; gmv: number; net: number }[];
  customers: { buyers: number; repeat_buyers: number; repeat_rate: number; revenue_per_buyer: number };
  ads: { impressions: number; clicks: number; spend: number; ctr: number; avg_cpc: number; roas: number | null };
  highlights: { tone: 'positive' | 'negative' | 'neutral'; title: string; detail: string }[];
  lifetime?: { gmv: string; commission: string; orders: number; take_rate: string };
}
