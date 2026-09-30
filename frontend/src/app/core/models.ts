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

export interface AdminUserRole {
  id: number;
  role: string;
  tenant_id: number | null;
  tenant: string | null;
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

export interface SettingField {
  key: string;
  group: string;
  type: 'string' | 'number' | 'bool' | 'json';
  label: string;
  help: string;
  value: string | number | boolean | null;
  default: string | number | boolean | null;
  updated_at?: string | null;
}
