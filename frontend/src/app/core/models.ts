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
  avatar_url?: string | null;
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
  customer_user_id?: number | null; source?: 'staff' | 'customer_request' | string;
  request_message?: string | null;
  customer_name: string; customer_email?: string | null; issue_date: string; expiry_date: string;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'expired' | 'void';
  subtotal: string | number; tax_total: string | number; discount_total: string | number;
  total: string | number; currency: string; notes?: string | null;
  customer?: { id: number; name: string; company?: string | null } | null;
  customer_user?: { id: number; name: string; email?: string | null } | null;
  opportunity?: { id: number; number: string; title: string } | null;
  tenant?: { id: number; name: string; slug: string } | null;
  items: SalesQuoteLineItem[];
}

/** Receipt template edited by the settings "Receipt builder" tab. */
export interface TenantReceipt {
  header_line: string;
  address_line: string;
  footer_note: string;
  tax_label: string;
  show_tax_breakdown: boolean;
  show_discounts: boolean;
  show_sku: boolean;
  show_logo: boolean;
  paper_size: 'a4' | 'a5' | '80mm';
  accent_color: string;
}

export const DEFAULT_RECEIPT: TenantReceipt = {
  header_line: '',
  address_line: '',
  footer_note: 'Thank you for your business!',
  tax_label: 'Tax',
  show_tax_breakdown: true,
  show_discounts: true,
  show_sku: true,
  show_logo: false,
  paper_size: 'a4',
  accent_color: '#1f4b3a',
};

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
  /** Currency the stored price is denominated in (the store's currency). */
  currency?: string;
  compare_at_price?: string | null;
  on_sale?: boolean;
  discount_percent?: number | null;
  tax_class?: string | null;
  tax_rate?: string | null;
  unit?: string | null;
  unit_amount?: string | null;
  min_order_qty?: number;
  brand?: string | null;
  status: string;
  image?: string | null;
  images: { id: number; url: string; is_primary: boolean }[];
  store: { id: number; name: string; slug: string; currency?: string; delivery_fee?: string } | null;
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
  short_description?: string | null;
  tags?: string[];
  condition?: string | null;
  warranty_months?: number | null;
  sponsored?: boolean;
  impression_id?: number;
  rating_avg?: number;
  rating_count?: number;
  is_featured?: boolean;
  best_selling_count?: number;
}

export interface StorePageSectionItem {
  title: string;
  desc?: string;
  icon?: string;
  image?: string;
  link?: string;
}

export interface StoreProductionStep {
  step_num?: number;
  title: string;
  description: string;
  tag?: string;
}

export interface StorePageSection {
  id: string;
  type: 'hero' | 'featured_products' | 'banner' | 'rich_text' | 'production' | 'gallery' | 'trust_bar' | 'reviews' | 'newsletter' | 'contact_card' | string;
  title?: string;
  subtitle?: string;
  badge?: string;
  image_url?: string;
  button_text?: string;
  button_link?: string;
  content?: string;
  layout?: 'split' | 'centered' | 'full' | 'cards' | 'grid' | 'carousel' | string;
  overlay_opacity?: number;
  enabled: boolean;
  columns?: number;
  product_source?: 'latest' | 'featured' | 'bestsellers' | 'category' | 'manual' | string;
  category_id?: number | null;
  product_ids?: number[];
  limit?: number;
  responsive?: Partial<Record<'desktop' | 'tablet' | 'mobile', { columns?: number; padding?: number; font_size?: number }>>;
  items?: StorePageSectionItem[];
  steps?: StoreProductionStep[];
}

export interface StoreThemePagesConfig {
  about?: {
    enabled?: boolean;
    nav_label?: string;
    hero_title?: string;
    hero_subtitle?: string;
    cover_image?: string;
    story_title?: string;
    story_body?: string;
    story_image?: string;
    mission_title?: string;
    mission_body?: string;
    craft_title?: string;
    craft_body?: string;
    craft_image?: string;
    craft_steps?: StoreProductionStep[];
    values?: { icon: string; title: string; desc: string }[];
  };
  contact?: {
    enabled?: boolean;
    nav_label?: string;
    title?: string;
    subtitle?: string;
    address?: string;
    hours?: string;
    phone?: string;
    email?: string;
    show_form?: boolean;
    form_intro?: string;
  };
}

export interface StoreThemeConfig {
  primary_color?: string;
  accent_color?: string;
  surface_color?: string;
  font?: 'modern' | 'editorial' | 'friendly' | 'classic' | string;
  hero_style?: 'split' | 'centered' | 'minimal' | 'full_banner' | string;
  banner_image?: string;
  logo_image?: string;
  hero_badge?: string;
  hero_image?: string;
  pages?: StoreThemePagesConfig;
}

export interface StorefrontPage {
  id: number;
  name: string;
  slug: string;
  page_type: 'custom' | string;
  status: 'draft' | 'published' | string;
  content: { schema_version?: number; sections: StorePageSection[] };
  seo_title?: string | null;
  seo_description?: string | null;
}

export interface Storefront {
  id: number;
  tenant_id?: number;
  name: string;
  slug: string;
  status?: string;
  currency?: string;
  description?: string | null;
  city?: string | null;
  country?: string | null;
  delivery_fee: string | number;
  delivery_days: number;
  is_featured?: boolean;
  logo_path?: string | null;
  banner_path?: string | null;
  theme_config?: StoreThemeConfig | null;
  page_sections?: StorePageSection[] | null;
  pages?: StorefrontPage[];
  seo_title?: string | null;
  seo_description?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  address_line?: string | null;
  customer_accounts_enabled?: boolean;
  guest_checkout_enabled?: boolean;
  rating_avg?: number;
  rating_count?: number;
  products_count?: number;
  category_name?: string | null;
  badge?: string | null;
  sample_products?: {
    id: number;
    name: string;
    slug?: string;
    price: string | number;
    image_url?: string | null;
  }[];
}

export interface TemplateCategory {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  is_active?: boolean;
  templates_count?: number;
}

export interface TemplateDefinition {
  schema_version: number;
  theme: StoreThemeConfig;
  pages: {
    home: StorePageSection[];
    about?: Record<string, unknown>;
    contact?: Record<string, unknown>;
    custom?: { name: string; slug?: string; sections: StorePageSection[] }[];
  };
}

export interface PageTemplate {
  id: number;
  category_id?: number | null;
  name: string;
  slug: string;
  description?: string | null;
  thumbnail?: string | null;
  designer_name: string;
  price: string | number;
  currency: string;
  status: 'draft' | 'pending_review' | 'published' | 'rejected' | string;
  version: string;
  definition: TemplateDefinition;
  is_featured: boolean;
  rating_avg: string | number;
  rating_count: number;
  is_owned?: boolean;
  purchases_count?: number;
  installations_count?: number;
  category?: Pick<TemplateCategory, 'id' | 'name' | 'slug'> | null;
  published_at?: string | null;
  updated_at?: string;
}

export interface TemplatePurchase {
  id: number;
  tenant_id: number;
  template_id: number;
  amount: string | number;
  currency: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded' | string;
  payment_provider?: string | null;
  purchased_at?: string | null;
  template: PageTemplate;
  tenant?: { id: number; name: string; slug: string };
  installations?: { id: number; store_id: number; status: string; store?: { id: number; name: string; slug: string } }[];
}

export interface TenantPage {
  id: number;
  tenant_id: number;
  store_id: number;
  name: string;
  slug: string;
  page_type: 'custom' | string;
  content: { schema_version: number; sections: StorePageSection[] };
  status: 'draft' | 'published' | string;
  seo_title?: string | null;
  seo_description?: string | null;
  created_at?: string;
  updated_at?: string;
  published_at?: string | null;
}

export interface PageRevision {
  id: number;
  page_id?: number | null;
  page_type: string;
  version: number;
  created_at: string;
  creator?: { id: number; name: string } | null;
}

export interface PageMeta {
  page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface Paginated<T> {
  data: T;
  meta: PageMeta;
}

export interface CartItemLine {
  id: number;
  variant_id: number;
  product_id?: number;
  category_id?: number | null;
  tenant_id?: number;
  sku: string;
  product_name: string;
  product_slug?: string;
  options: Record<string, unknown> | null;
  qty: number;
  unit_price: string;
  line_total: string;
  tax_rate?: number;
  line_tax?: string;
  image?: string | null;
  available: number;
}

export interface CartGroup {
  store: { id: number; tenant_id?: number; name: string; slug: string; delivery_fee: string | number };
  items: CartItemLine[];
  subtotal: string;
  tax?: string;
  discount?: string;
  qty?: number;
  delivery_options?: DeliveryOption[];
  delivery?: DeliveryOption | null;
  delivery_fee?: string;
}

export interface CartCoupon {
  id?: number;
  code: string;
  name?: string;
  discount_type?: CouponDiscountType;
  value?: string;
  amount: string;
  free_shipping?: boolean;
  invalid?: boolean;
  message?: string;
}

export interface CartPayload {
  id: number;
  groups: CartGroup[];
  coupon?: CartCoupon | null;
  totals: {
    subtotal: string;
    discount_total?: string;
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

/* ------------------------------------------------------------------------ */
/* Tenant access control (/tenant/users)                                      */
/* ------------------------------------------------------------------------ */

export type TenantAccessLevel = 'tenant_owner' | 'store_staff';
export type TenantUserStatus = 'active' | 'invited' | 'suspended';
export type TenantCustomerStatus = 'active' | 'blocked';
export type SocialProviderKey = 'google' | 'facebook' | 'apple' | 'github';

export interface TenantRoleSummary {
  id: number;
  key: string;
  name: string;
  description?: string | null;
  department?: string | null;
  permissions: string[];
  is_system: boolean;
  is_owner_role?: boolean;
  users_count: number;
  updated_at?: string | null;
}

export interface TenantAccessLevelOption {
  key: TenantAccessLevel;
  label: string;
  description: string;
}

export interface TenantSystemUser {
  id: number;
  user_id: number;
  name: string;
  email: string;
  phone?: string | null;
  avatar_url?: string | null;
  title?: string | null;
  role: TenantAccessLevel;
  access_level: TenantAccessLevel;
  status: TenantUserStatus;
  department?: string | null;
  store_id?: number | null;
  store?: { id: number; name: string } | null;
  tenant_role_id?: number | null;
  tenant_role?: Pick<TenantRoleSummary, 'id' | 'key' | 'name' | 'department' | 'permissions'> | null;
  permissions: string[];
  custom_permissions: boolean;
  is_owner: boolean;
  last_login_at?: string | null;
  invited_at?: string | null;
  created_at?: string | null;
}

export interface TenantSystemUserStats {
  total: number;
  active: number;
  invited: number;
  suspended: number;
  owners: number;
  customised: number;
}

export interface TenantSystemUsersResponse {
  data: TenantSystemUser[];
  stats: TenantSystemUserStats;
  meta: {
    departments: string[];
    roles: string[];
    access_levels: TenantAccessLevelOption[];
    statuses: TenantUserStatus[];
    tenant_roles: TenantRoleSummary[];
    permission_groups: PermissionGroup[];
    stores: { id: number; name: string }[];
    can_manage: boolean;
  };
}

export interface SocialAccountRef {
  provider: SocialProviderKey | string;
  label: string;
  email?: string | null;
  nickname?: string | null;
  avatar_url?: string | null;
  last_login_at?: string | null;
}

export interface TenantCustomer {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  avatar_url?: string | null;
  account_status: 'active' | 'suspended';
  status: TenantCustomerStatus;
  segment?: string | null;
  tags: string[];
  notes?: string | null;
  marketing_opt_in: boolean;
  orders_count: number;
  total_spent: number;
  average_order_value: number;
  first_order_at?: string | null;
  last_order_at?: string | null;
  joined_at?: string | null;
  last_login_at?: string | null;
  login_methods: string[];
  social_accounts: SocialAccountRef[];
  orders?: TenantCustomerOrder[];
}

export interface TenantCustomerOrder {
  id: number;
  order_id: number;
  status: string;
  total: number;
  currency: string;
  placed_at?: string | null;
}

export interface TenantCustomerStats {
  total: number;
  blocked: number;
  repeat: number;
  new_this_month: number;
  social_logins: number;
  revenue: number;
  average_spend: number;
}

export interface TenantCustomersResponse {
  data: TenantCustomer[];
  meta: {
    page: number;
    per_page: number;
    total: number;
    last_page: number;
    providers: { key: string; label: string; count: number }[];
    segments: string[];
    can_manage: boolean;
  };
  stats: TenantCustomerStats;
}

export interface SocialProviderOption {
  key: SocialProviderKey | string;
  label: string;
  color: string;
  mode: 'oauth' | 'demo';
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

export interface HeroSlide {
  id: string;
  image_url: string;
  tag: string;
  title?: string;
  link?: string;
  alt?: string;
}

export interface HeroSlidesPayload {
  slides: HeroSlide[];
  autoplay: boolean;
  interval: number;
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
  tax_rate?: string | number | null;
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

// ---------------------------------------------------------------------------
// My account (/tenant/profile) — profile, security and personal activity
// ---------------------------------------------------------------------------

export interface ProfileUser {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  avatar_url?: string | null;
  job_title?: string | null;
  bio?: string | null;
  timezone?: string | null;
  locale?: string | null;
  preferred_currency?: string | null;
  status?: string | null;
  role: string;
  email_verified_at?: string | null;
  last_login_at?: string | null;
  last_seen_at?: string | null;
  created_at?: string | null;
}

export interface ProfileTenantRef {
  id: number;
  name: string;
  slug: string;
  status: string;
  currency?: string | null;
  joined_at?: string | null;
  is_owner: boolean;
}

export interface ProfileStats {
  activity_total: number;
  activity_last_7_days: number;
  active_sessions: number;
  member_since?: string | null;
  products_in_workspace?: number;
  stores_in_workspace?: number;
  orders_placed?: number;
}

export interface ProfilePayload {
  user: ProfileUser;
  tenant: ProfileTenantRef | null;
  roles: { role: string; tenant_id: number | null; store_id: number | null; department: string | null }[];
  permissions: string[];
  social_accounts: { provider: string; linked_at?: string | null }[];
  stats: ProfileStats;
}

export interface ProfileActivityEntry {
  id: number;
  action: string;
  subject_type: string | null;
  subject_label: string;
  subject_id: number | null;
  tenant_id: number | null;
  ip: string | null;
  diff?: { before?: unknown; after?: unknown } | null;
  created_at: string;
}

export interface ProfileActivityStats {
  total: number;
  today: number;
  last_7_days: number;
  last_30_days: number;
  first_event_at?: string | null;
  last_event_at?: string | null;
  by_action: { action: string; count: number }[];
  trend: { day: string; count: number }[];
}

export interface ProfileSession {
  id: number;
  name: string;
  current: boolean;
  created_at?: string | null;
  last_used_at?: string | null;
  expires_at?: string | null;
}

// ---------------------------------------------------------------------------
// Currency
// ---------------------------------------------------------------------------

export interface CurrencyConversionPreview {
  from: string;
  to: string;
  factor: number;
  from_symbol: string;
  to_symbol: string;
  records?: Record<string, number>;
  sample?: { id: number; name: string; before: number; after: number }[];
}

export interface CurrencyConversionResult extends CurrencyConversionPreview {
  tables: Record<string, number>;
  rows: number;
}

// ---------------------------------------------------------------------------
// §9 / §17 — Reviews, ratings & trust
// ---------------------------------------------------------------------------

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'flagged';

export interface ReviewAuthor {
  name: string;
  avatar_url?: string | null;
}

export interface Review {
  id: number;
  rating: number;
  title?: string | null;
  body?: string | null;
  status: ReviewStatus;
  is_verified_purchase: boolean;
  helpful_count: number;
  report_count?: number;
  created_at?: string | null;
  response_body?: string | null;
  responded_at?: string | null;
  moderation_note?: string | null;
  moderated_at?: string | null;
  author?: ReviewAuthor | null;
  customer?: { id?: number; name: string; email?: string; avatar_url?: string | null } | null;
  product?: { id: number; name: string; slug: string } | null;
  store?: { id: number; name: string; slug: string } | null;
  tenant?: string | null;
}

export interface ReviewSummary {
  average: number;
  count: number;
  verified_count: number;
  distribution: { rating: number; count: number; percent: number }[];
}

export interface ReviewFeed {
  data: Review[];
  summary: ReviewSummary;
  meta: PageMeta;
}

export interface PendingReview {
  product_id: number;
  product_name: string;
  product_slug: string;
  image?: string | null;
  store_id: number;
  store_name?: string | null;
  seller_order_id: number;
  order_id: number;
}

export interface TenantReviewSummary {
  total: number;
  approved: number;
  pending: number;
  flagged: number;
  needs_response: number;
  average: number;
  detractors: number;
  promoters: number;
}

export interface AdminReviewSummary {
  total: number;
  pending: number;
  flagged: number;
  rejected: number;
  reported: number;
  open_reports: number;
  average: number;
}

export interface ReviewReport {
  id: number;
  review_id: number;
  reason: string;
  note?: string | null;
  status: 'open' | 'dismissed' | 'actioned';
  reporter?: { id: number; name: string } | string | null;
  created_at?: string | null;
  review?: {
    id: number;
    rating: number;
    title?: string | null;
    body?: string | null;
    status: ReviewStatus;
    product?: string | null;
    store?: string | null;
  } | null;
}

// ---------------------------------------------------------------------------
// §9 / §20 — Wishlist
// ---------------------------------------------------------------------------

export interface WishlistItem {
  id: number;
  product_id: number;
  variant_id?: number | null;
  note?: string | null;
  notify_on_restock: boolean;
  notify_on_price_drop: boolean;
  price_at_save?: string | null;
  current_price: string;
  price_dropped: boolean;
  created_at?: string | null;
  product?: {
    id: number;
    name: string;
    slug: string;
    price: string;
    image?: string | null;
    status: string;
    rating_avg: number;
    rating_count: number;
    in_stock: boolean;
    store?: { id: number; name: string; slug: string; currency: string } | null;
  } | null;
  variant?: { id: number; sku: string; options: Record<string, unknown> | null; available: number } | null;
}

export interface WishlistStoreEntry {
  id: number;
  store?: {
    id: number;
    name: string;
    slug: string;
    logo_path?: string | null;
    rating_avg: number;
    rating_count: number;
  } | null;
}

export interface WishlistPayload {
  items: WishlistItem[];
  stores: WishlistStoreEntry[];
  counts: { items: number; stores: number };
}

// ---------------------------------------------------------------------------
// §18 — Coupons & promotions
// ---------------------------------------------------------------------------

export type CouponDiscountType = 'percentage' | 'fixed' | 'free_shipping';
export type CouponStatus = 'draft' | 'active' | 'paused' | 'expired' | 'archived';

export interface CouponTarget {
  target_type: 'product' | 'category' | 'store';
  target_id: number;
}

export interface Coupon {
  id: number;
  tenant_id?: number | null;
  tenant?: string | null;
  store_id?: number | null;
  store?: string | null;
  code: string;
  name: string;
  description?: string | null;
  discount_type: CouponDiscountType;
  value: string;
  currency?: string | null;
  min_subtotal: string;
  max_discount?: string | null;
  usage_limit?: number | null;
  per_user_limit?: number | null;
  used_count: number;
  redeemed_value: string;
  applies_to: 'all' | 'products' | 'categories' | 'stores';
  is_stackable: boolean;
  first_order_only: boolean;
  auto_apply: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  status: CouponStatus;
  is_live: boolean;
  remaining_uses?: number | null;
  scope: 'platform' | 'seller';
  created_at?: string | null;
  targets?: CouponTarget[];
}

export interface CouponSummary {
  total: number;
  active: number;
  redemptions: number;
  discount_given: string;
  platform?: number;
  seller?: number;
}

export interface CouponRedemption {
  id: number;
  order_id?: number | null;
  seller_order_id?: number | null;
  code: string;
  amount: string;
  currency?: string | null;
  status: string;
  created_at?: string | null;
  customer?: { id: number; name: string; email: string } | null;
  order_total?: string | null;
}

export interface CouponMeta {
  stores: { id: number; name: string; slug?: string }[];
  categories: { id: number; name: string }[];
  products: { id: number; name: string; price: string }[];
  discount_types: CouponDiscountType[];
  statuses: CouponStatus[];
}

// ---------------------------------------------------------------------------
// §14 — Configurable commissions
// ---------------------------------------------------------------------------

export type CommissionScope = 'global' | 'plan' | 'tenant' | 'store' | 'category' | 'product';
export type CommissionCalculation = 'percentage' | 'flat' | 'percentage_plus_flat' | 'tiered';

export interface CommissionTier {
  id?: number;
  from_amount: string;
  to_amount?: string | null;
  rate: string;
  flat_fee: string;
}

export interface CommissionRule {
  id: number;
  name: string;
  description?: string | null;
  scope_type: CommissionScope;
  scope_id?: number | null;
  scope_label: string;
  calculation: CommissionCalculation;
  rate: string;
  flat_fee: string;
  min_fee?: string | null;
  max_fee?: string | null;
  min_order_amount: string;
  include_delivery: boolean;
  priority: number;
  specificity: number;
  status: 'active' | 'inactive';
  effective_from?: string | null;
  effective_to?: string | null;
  is_live: boolean;
  summary: string;
  created_at?: string | null;
  tiers?: CommissionTier[];
}

export interface CommissionQuotePreview {
  amount: string;
  rate: string;
  rule_id?: number | null;
  rule_name?: string | null;
  calculation: string;
  basis: string;
  sale_amount: string;
  seller_receives: string;
  scope_type: CommissionScope;
  scope_id?: number | null;
  matched: boolean;
}

export interface CommissionEarnings {
  range: { from: string; to: string };
  commission_total: string;
  gross_total: string;
  net_to_sellers: string;
  settlement_count: number;
  effective_rate: string;
  top_tenants: { tenant_id: number; tenant: string; commission: string; gross: string; orders: number }[];
}

export interface CommissionMeta {
  scope_types: CommissionScope[];
  calculations: CommissionCalculation[];
  plans: { id: number; name: string; commission_rate: string }[];
  tenants: { id: number; name: string }[];
  stores: { id: number; tenant_id: number; name: string }[];
  categories: { id: number; tenant_id: number; name: string }[];
}

// ---------------------------------------------------------------------------
// §12 — Payouts
// ---------------------------------------------------------------------------

export type PayoutBatchStatus =
  | 'draft'
  | 'pending_approval'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'cancelled';

export interface PayoutAccount {
  id: number;
  tenant_id?: number;
  tenant?: string | null;
  label?: string | null;
  method: 'bank' | 'mobile_money' | 'paypal' | 'wallet';
  account_name: string;
  masked_account_number: string;
  bank_name?: string | null;
  branch?: string | null;
  swift_code?: string | null;
  mobile_network?: string | null;
  currency: string;
  country?: string | null;
  status: 'pending' | 'verified' | 'rejected';
  is_default: boolean;
  verified_at?: string | null;
}

export interface PayoutBatchItem {
  id: number;
  seller_settlement_id: number;
  seller_order_id?: number | null;
  order_id?: number | null;
  gross: string;
  commission: string;
  refund_amount: string;
  amount: string;
}

export interface PayoutBatch {
  id: number;
  reference: string;
  tenant_id: number;
  tenant?: string | null;
  status: PayoutBatchStatus;
  currency: string;
  gross: string;
  commission: string;
  delivery_fees: string;
  refunds: string;
  adjustments: string;
  net: string;
  settlement_count: number;
  period_start?: string | null;
  period_end?: string | null;
  method?: string | null;
  external_ref?: string | null;
  notes?: string | null;
  failure_reason?: string | null;
  released_at?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
  is_editable?: boolean;
  account?: Partial<PayoutAccount> | null;
  items?: PayoutBatchItem[];
  adjustment_entries?: PayoutAdjustment[];
}

export interface PayoutAdjustment {
  id: number;
  tenant_id?: number;
  tenant?: string | null;
  kind: 'credit' | 'debit';
  amount: string;
  signed_amount?: string;
  reason: string;
  status: 'pending' | 'applied' | 'void';
  payout_batch_id?: number | null;
  created_at?: string | null;
}

export interface SettlementRow {
  id: number;
  tenant_id?: number | null;
  tenant?: string | null;
  seller_order_id: number;
  order_id?: number | null;
  store?: string | null;
  gross: string;
  commission: string;
  net: string;
  commission_rate?: string | null;
  currency: string;
  status: 'pending' | 'available' | 'processing' | 'paid' | 'on_hold' | 'reversed';
  available_at?: string | null;
  released_at?: string | null;
  hold_reason?: string | null;
  payout_batch_id?: number | null;
  created_at?: string | null;
}

export interface PayoutBalance {
  pending: string;
  pending_count: number;
  available: string;
  available_count: number;
  processing: string;
  processing_count: number;
  paid: string;
  paid_count: number;
  on_hold: string;
  on_hold_count: number;
  adjustments: string;
  payable: string;
  currency: string;
  hold_days: number;
  minimum_payout: string;
}

export interface PayoutOverview {
  balance: PayoutBalance;
  account?: PayoutAccount | null;
  recent_batches: PayoutBatch[];
  next_release?: string | null;
}

export interface PlatformPayoutSummary {
  pending: string;
  available: string;
  processing: string;
  paid: string;
  on_hold: string;
  commission_earned: string;
  batches: { draft: number; processing: number; paid: number; failed: number };
  currency: string;
  hold_days: number;
  minimum_payout: string;
}

export interface PayableTenant {
  tenant_id: number;
  tenant_name: string;
  settlements: number;
  amount: string;
  oldest_available_at?: string | null;
  meets_minimum: boolean;
  account?: Partial<PayoutAccount> | null;
}

export interface AdminPayoutOverview {
  summary: PlatformPayoutSummary;
  payable: PayableTenant[];
  recent_batches: PayoutBatch[];
}

// ---------------------------------------------------------------------------
// §12 — Refunds & disputes
// ---------------------------------------------------------------------------

export type RefundStatus = 'requested' | 'approved' | 'processing' | 'completed' | 'rejected' | 'failed';

export interface RefundLine {
  id: number;
  order_item_id: number;
  product_name?: string | null;
  qty: number;
  unit_price: string;
  amount: string;
}

export interface Refund {
  id: number;
  reference: string;
  order_id: number;
  seller_order_id?: number | null;
  tenant_id?: number | null;
  tenant?: string | null;
  dispute_id?: number | null;
  type: 'full' | 'partial' | 'shipping_only' | 'goodwill';
  reason: string;
  status: RefundStatus;
  amount: string;
  delivery_refund?: string;
  commission_reversal: string;
  net_seller_impact: string;
  currency: string;
  customer_note?: string | null;
  decision_note?: string | null;
  restock?: boolean;
  gateway_ref?: string | null;
  requested_at?: string | null;
  reviewed_at?: string | null;
  processed_at?: string | null;
  store?: { id: number; name: string; slug: string } | null;
  customer?: { id: number; name: string; email: string } | null;
  items?: RefundLine[];
}

export interface RefundSummary {
  open: number;
  completed: number;
  rejected?: number;
  failed?: number;
  refunded_value: string;
  commission_reversed?: string;
}

export interface RefundableOrder {
  seller_order_id: number;
  grand_total: string;
  refunded_total: string;
  refundable_total: string;
  currency: string;
  items: { order_item_id: number; product_name: string; sku: string; qty: number; unit_price: string; line_total: string }[];
}

export type DisputeStatus =
  | 'open'
  | 'awaiting_seller'
  | 'awaiting_customer'
  | 'escalated'
  | 'resolved'
  | 'rejected'
  | 'closed';

export interface DisputeMessage {
  id: number;
  author_role: 'customer' | 'seller' | 'admin' | 'system';
  author_name: string;
  body: string;
  attachments: unknown[];
  is_internal: boolean;
  created_at?: string | null;
}

export interface Dispute {
  id: number;
  reference: string;
  order_id: number;
  seller_order_id?: number | null;
  tenant_id?: number | null;
  tenant?: string | null;
  store_id?: number | null;
  type: string;
  status: DisputeStatus;
  priority: string;
  subject: string;
  description: string;
  amount_claimed: string;
  currency: string;
  outcome?: string | null;
  resolution?: string | null;
  seller_due_at?: string | null;
  is_overdue: boolean;
  escalated_at?: string | null;
  resolved_at?: string | null;
  last_activity_at?: string | null;
  created_at?: string | null;
  store?: { id: number; name: string; slug: string } | null;
  customer?: { id: number; name: string; email: string } | null;
  assigned_admin?: { id: number; name: string } | null;
  messages?: DisputeMessage[];
  refunds?: { id: number; reference: string; status: RefundStatus; amount: string; processed_at?: string | null }[];
  seller_order?: {
    id: number;
    status: string;
    subtotal: string;
    discount: string;
    delivery_fee: string;
    grand_total: string;
    refundable_total: string;
    currency: string;
  } | null;
}

export interface DisputeSummary {
  open: number;
  awaiting_seller?: number;
  escalated: number;
  overdue: number;
  resolved: number;
  claimed_value?: string;
}

// ---------------------------------------------------------------------------
// §16 — Delivery zones, methods & tracking
// ---------------------------------------------------------------------------

export type ShipmentStatus =
  | 'pending'
  | 'ready_for_pickup'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed'
  | 'returned'
  | 'cancelled';

export type DeliveryMethodType = 'pickup' | 'store_delivery' | 'courier' | 'platform';

export interface DeliveryOption {
  method_id: number | null;
  zone_id?: number | null;
  zone_name?: string | null;
  name: string;
  type: DeliveryMethodType;
  carrier?: string | null;
  service_level?: string | null;
  fee: string;
  min_days?: number | null;
  max_days?: number | null;
  pickup_address?: string | null;
  pickup_hours?: string | null;
  instructions?: string | null;
  is_default?: boolean;
  free_over?: string | null;
}

export interface DeliveryMethod {
  id: number;
  delivery_zone_id?: number | null;
  store_id?: number | null;
  name: string;
  type: DeliveryMethodType;
  carrier?: string | null;
  service_level?: string | null;
  fee: string;
  free_over?: string | null;
  min_days: number;
  max_days: number;
  pickup_address?: string | null;
  pickup_hours?: string | null;
  instructions?: string | null;
  tracking_url_template?: string | null;
  is_default: boolean;
  status: 'active' | 'inactive';
  position: number;
}

export interface DeliveryZone {
  id: number;
  store_id?: number | null;
  name: string;
  description?: string | null;
  match_type: 'country' | 'region' | 'city' | 'postcode' | 'any';
  countries: string[];
  regions: string[];
  cities: string[];
  postcodes: string[];
  base_fee: string;
  per_item_fee: string;
  per_kg_fee: string;
  free_over?: string | null;
  min_days: number;
  max_days: number;
  priority: number;
  is_default: boolean;
  status: 'active' | 'inactive';
  methods: DeliveryMethod[];
}

export interface ShipmentEvent {
  id: number;
  status: ShipmentStatus;
  description: string;
  location?: string | null;
  happened_at?: string | null;
}

export interface Shipment {
  id: number;
  reference: string;
  seller_order_id: number;
  order_id?: number | null;
  store_id?: number;
  status: ShipmentStatus;
  status_label: string;
  type: DeliveryMethodType;
  carrier?: string | null;
  service_level?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  cost: string;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  destination?: string | null;
  estimated_delivery_from?: string | null;
  estimated_delivery_to?: string | null;
  dispatched_at?: string | null;
  delivered_at?: string | null;
  created_at?: string | null;
  notes?: string | null;
  method?: { id: number; name: string; type: DeliveryMethodType; carrier?: string | null } | null;
  store?: { id: number; name: string; slug: string } | null;
  events?: ShipmentEvent[];
}

export interface DeliverySettings {
  stores: { id: number; name: string; slug: string; delivery_fee: string; delivery_days?: number | null; country?: string | null }[];
  zones: DeliveryZone[];
  methods: DeliveryMethod[];
  match_types: string[];
  method_types: DeliveryMethodType[];
  shipment_statuses: ShipmentStatus[];
  status_labels: Record<string, string>;
}

export interface ShipmentSummary {
  total: number;
  awaiting_dispatch: number;
  in_transit: number;
  delivered: number;
  problem: number;
}

// ---------------------------------------------------------------------------
// §20 — In-app notifications
// ---------------------------------------------------------------------------

export type NotificationAudience = 'customer' | 'tenant' | 'admin';
export type NotificationCategory =
  | 'order'
  | 'payment'
  | 'payout'
  | 'review'
  | 'dispute'
  | 'catalog'
  | 'inventory'
  | 'security'
  | 'system'
  | 'promotion';

export interface AppNotification {
  id: number;
  audience: NotificationAudience;
  category: NotificationCategory;
  level: 'info' | 'success' | 'warning' | 'critical';
  title: string;
  body?: string | null;
  action_url?: string | null;
  action_label?: string | null;
  data?: Record<string, unknown> | null;
  read: boolean;
  read_at?: string | null;
  created_at?: string | null;
}

export interface NotificationSummary {
  unread: number;
  total: number;
  today: number;
  by_category: Record<string, number>;
  recent?: AppNotification[];
}

// ---------------------------------------------------------------------------
// §7 — Global catalog moderation
// ---------------------------------------------------------------------------

export type ProductModerationStatus = 'pending' | 'approved' | 'flagged' | 'rejected';

export interface PlatformCategory {
  id: number;
  parent_id?: number | null;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  image_url?: string | null;
  position: number;
  is_active: boolean;
  is_featured: boolean;
  seo_title?: string | null;
  seo_description?: string | null;
  children_count: number;
  tenant_categories_count: number;
  products_count: number;
  children?: PlatformCategory[];
}

export interface CatalogCategoriesPayload {
  tree: PlatformCategory[];
  flat: PlatformCategory[];
  summary: {
    total: number;
    active: number;
    featured: number;
    unmapped_tenant_categories: number;
    unmapped_products: number;
  };
}

export interface TenantCategoryRow {
  id: number;
  tenant_id: number;
  tenant?: string | null;
  name: string;
  slug: string;
  platform_category_id?: number | null;
  platform_category?: string | null;
  products_count: number;
}

export interface ModeratedProduct {
  id: number;
  name: string;
  slug: string;
  sku?: string | null;
  price: string;
  status: string;
  moderation_status: ProductModerationStatus;
  moderation_note?: string | null;
  moderated_at?: string | null;
  report_count: number;
  rating_avg: number;
  rating_count: number;
  image?: string | null;
  created_at?: string | null;
  tenant?: string | null;
  tenant_id?: number;
  store?: { id: number; name: string; slug: string } | null;
  category?: string | null;
  platform_category_id?: number | null;
  platform_category?: string | null;
}

export interface CatalogProductSummary {
  total: number;
  pending: number;
  rejected: number;
  flagged: number;
  reported: number;
  unmapped: number;
  open_reports: number;
}

export interface ProductReportRow {
  id: number;
  product_id: number;
  product?: { id: number; name: string; slug: string; store?: string | null; moderation_status: string } | null;
  reason: string;
  note?: string | null;
  status: 'open' | 'dismissed' | 'actioned';
  reporter?: string | null;
  created_at?: string | null;
}
