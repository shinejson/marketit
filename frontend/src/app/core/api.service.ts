import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CurrencyCatalog } from './currency.service';
import {
  Address,
  CurrencyConversionPreview,
  ProfileActivityEntry,
  ProfileActivityStats,
  ProfilePayload,
  ProfileSession,
  ProfileUser,
  AccountingAccount,
  AccountingBankAccount,
  AccountingBankTransaction,
  AccountingContact,
  AccountingDashboard,
  AccountingExpense,
  AccountingInvoice,
  AccountingJournalEntry,
  AccountingPayment,
  AccountingReport,
  PurchaseOrder,
  AdminAnalytics,
  AdminInsight,
  AdminOverview,
  AdminRoleDefinition,
  AuthSession,
  SalesCustomer,
  SalesDashboard,
  SalesLead,
  SalesOpportunity,
  SalesQuote,
  SellerOrder,
  SellerOrdersResponse,
  AdminUser,
  AdminUserSummary,
  AuditLogEntry,
  AuditLogFacets,
  AuditLogStats,
  PermissionGroup,
  TenantCustomer,
  TenantCustomersResponse,
  TenantRoleSummary,
  TenantSystemUser,
  TenantSystemUsersResponse,
  CartPayload,
  Category,
  DeptDashboard,
  DepartmentSummary,
  TenantDashboard,
  Invoice,
  Paginated,
  BackupMeta,
  GatewayTestResult,
  MarketingCampaign,
  MarketingOverview,
  PaymentMethodsPayload,
  Plan,
  PlatformBackup,
  ProductBulkAction,
  ProductCard,
  ProductCatalogMeta,
  ProductInventory,
  AdWorkspace,
  AdWorkspaceMeta,
  InventoryFilterOptions,
  InventoryResponse,
  InventoryRow,
  StockMovementEntry,
  StockMovementType,
  TenantAnalyticsReport,
  SettingsPayload,
  SocialAccount,
  SocialPost,
  Storefront,
  Subscription,
  SubscriptionStats,
  TenantApplication,
  TenantProduct,
  TenantProductsResponse,
  GuideSummary,
  HelpArticle,
  HelpCategory,
  SupportAgent,
  SupportCannedReply,
  SupportChat,
  SupportChatMessage,
  SupportChatSummary,
  SupportOverview,
  SupportTask,
  SupportTaskSummary,
  SupportTicket,
  SupportTicketSummary,
  TenantSupportOverview,
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  marketProducts(params: Record<string, string | number> = {}) {
    return this.http.get<Paginated<ProductCard[]>>('/api/market/products', { params });
  }

  marketProduct(slug: string) {
    return this.http.get<{ data: ProductCard }>(`/api/market/products/${slug}`);
  }

  marketStores(params: Record<string, string | number> = {}) {
    return this.http.get<Paginated<Storefront[]>>('/api/market/stores', { params });
  }

  marketStore(slug: string) {
    return this.http.get<{ data: { store: Storefront; products: ProductCard[] } }>(`/api/market/stores/${slug}`);
  }

  marketCategories() {
    return this.http.get<{ data: Category[] }>('/api/market/categories');
  }

  cart() {
    return this.http.get<{ data: CartPayload }>('/api/cart');
  }

  addToCart(variantId: number, qty: number) {
    return this.http.post<{ data: CartPayload }>('/api/cart/items', { variant_id: variantId, qty });
  }

  updateCartItem(id: number, qty: number) {
    return this.http.patch<{ data: CartPayload }>(`/api/cart/items/${id}`, { qty });
  }

  removeCartItem(id: number) {
    return this.http.delete<{ data: CartPayload }>(`/api/cart/items/${id}`);
  }

  // ----------------------------- customer quotes (RFQ)

  myQuotes(params: Record<string, string | number> = {}) {
    return this.http.get<Paginated<SalesQuote[]>>('/api/quotes', { params });
  }

  myQuote(id: number) {
    return this.http.get<{ data: SalesQuote }>(`/api/quotes/${id}`);
  }

  requestQuote(payload: { store_id: number; message?: string; items: { product_id: number; quantity: number }[] }) {
    return this.http.post<{ data: SalesQuote }>('/api/quotes', payload);
  }

  respondQuote(id: number, action: 'accept' | 'decline') {
    return this.http.post<{ data: SalesQuote }>(`/api/quotes/${id}/respond`, { action });
  }

  paymentMethods() {
    return this.http.get<{ data: PaymentMethodsPayload }>('/api/payments/methods');
  }

  authSessions() {
    return this.http.get<{ data: AuthSession[] }>('/api/auth/sessions');
  }

  revokeAuthSession(id: number) {
    return this.http.delete<{ data: { revoked: boolean } }>(`/api/auth/sessions/${id}`);
  }

  revokeOtherAuthSessions() {
    return this.http.delete<{ data: { revoked: number } }>('/api/auth/sessions');
  }

  addresses() {
    return this.http.get<{ data: Address[] }>('/api/addresses');
  }

  createAddress(payload: Partial<Address>) {
    return this.http.post<{ data: Address }>('/api/addresses', payload);
  }

  checkoutQuote() {
    return this.http.post<{ data: CartPayload }>('/api/checkout/quote', {});
  }

  checkout(shippingAddressId: number, idempotencyKey: string, paymentMethod = 'card') {
    return this.http.post<any>('/api/checkout', { shipping_address_id: shippingAddressId, payment_method: paymentMethod }, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  }

  mockPay(url: string) {
    return this.http.get<any>(url);
  }

  myOrders() {
    return this.http.get<Paginated<any[]>>('/api/orders');
  }

  myOrder(id: number) {
    return this.http.get<{ data: any }>(`/api/orders/${id}`);
  }

  cancelOrder(id: number) {
    return this.http.post<{ data: any }>(`/api/orders/${id}/cancel`, {});
  }

  tenant() {
    return this.http.get<{ data: TenantApplication }>('/api/tenant');
  }

  sellerDashboard(days = 30) {
    return this.http.get<{ data: TenantDashboard }>('/api/tenant/dashboard/summary', {
      params: { days },
    });
  }

  departmentOverview() {
    return this.http.get<{ data: { departments: DepartmentSummary[] } }>('/api/tenant/dashboard/departments');
  }

  departmentDashboard(department: string) {
    return this.http.get<{ data: DeptDashboard }>(`/api/tenant/dashboard/departments/${department}`);
  }

  accountingDashboard() {
    return this.http.get<{ data: AccountingDashboard }>('/api/tenant/accounting/dashboard');
  }

  accountingInvoices(params: Record<string, string | number> = {}) {
    return this.http.get<Paginated<AccountingInvoice[]>>('/api/tenant/accounting/invoices', { params });
  }

  createAccountingInvoice(payload: Record<string, unknown>) {
    return this.http.post<{ data: AccountingInvoice }>('/api/tenant/accounting/invoices', payload);
  }

  updateAccountingInvoice(id: number, status: string) {
    return this.http.patch<{ data: AccountingInvoice }>(`/api/tenant/accounting/invoices/${id}`, { status });
  }

  accountingInvoice(id: number) {
    return this.http.get<{ data: AccountingInvoice }>(`/api/tenant/accounting/invoices/${id}`);
  }

  deleteAccountingInvoice(id: number) {
    return this.http.delete<{ data: { deleted: boolean } }>(`/api/tenant/accounting/invoices/${id}`);
  }

  recordAccountingPayment(id: number, payload: Record<string, unknown>) {
    return this.http.post<{ data: { invoice: AccountingInvoice; payment: AccountingPayment } }>(`/api/tenant/accounting/invoices/${id}/payments`, payload);
  }

  accountingPayments(params: Record<string, string | number> = {}) {
    return this.http.get<Paginated<AccountingPayment[]>>('/api/tenant/accounting/payments', { params });
  }

  accountingExpenses(params: Record<string, string | number> = {}) {
    return this.http.get<Paginated<AccountingExpense[]>>('/api/tenant/accounting/expenses', { params });
  }

  createAccountingExpense(payload: Record<string, unknown>) {
    return this.http.post<{ data: AccountingExpense }>('/api/tenant/accounting/expenses', payload);
  }

  payAccountingExpense(id: number, payload: Record<string, unknown>) {
    return this.http.post<{ data: { expense: AccountingExpense; payment: AccountingPayment } }>(`/api/tenant/accounting/expenses/${id}/pay`, payload);
  }

  accountingContacts(params: Record<string, string | number> = {}) {
    return this.http.get<Paginated<AccountingContact[]>>('/api/tenant/accounting/contacts', { params });
  }

  createAccountingContact(payload: Record<string, unknown>) {
    return this.http.post<{ data: AccountingContact }>('/api/tenant/accounting/contacts', payload);
  }

  purchaseOrders(params: Record<string, string | number> = {}) {
    return this.http.get<Paginated<PurchaseOrder[]>>('/api/tenant/accounting/purchase-orders', { params });
  }

  createPurchaseOrder(payload: Record<string, unknown>) {
    return this.http.post<{ data: PurchaseOrder }>('/api/tenant/accounting/purchase-orders', payload);
  }

  updatePurchaseOrder(id: number, status: string) {
    return this.http.patch<{ data: PurchaseOrder }>(`/api/tenant/accounting/purchase-orders/${id}`, { status });
  }

  accountingAccounts(params: Record<string, string | number> = {}) {
    return this.http.get<{ data: AccountingAccount[] }>('/api/tenant/accounting/accounts', { params });
  }

  createAccountingAccount(payload: Record<string, unknown>) {
    return this.http.post<{ data: AccountingAccount }>('/api/tenant/accounting/accounts', payload);
  }

  accountingJournals(params: Record<string, string | number> = {}) {
    return this.http.get<Paginated<AccountingJournalEntry[]>>('/api/tenant/accounting/journals', { params });
  }

  createAccountingJournal(payload: Record<string, unknown>) {
    return this.http.post<{ data: AccountingJournalEntry }>('/api/tenant/accounting/journals', payload);
  }

  postAccountingJournal(id: number) {
    return this.http.post<{ data: AccountingJournalEntry }>(`/api/tenant/accounting/journals/${id}/post`, {});
  }

  accountingReport(params: { report: string; from: string; to: string }) {
    return this.http.get<{ data: AccountingReport }>('/api/tenant/accounting/reports', { params });
  }

  accountingBankAccounts() {
    return this.http.get<{ data: AccountingBankAccount[] }>('/api/tenant/accounting/bank-accounts');
  }

  createAccountingBankAccount(payload: Record<string, unknown>) {
    return this.http.post<{ data: AccountingBankAccount }>('/api/tenant/accounting/bank-accounts', payload);
  }

  accountingBankTransactions(params: Record<string, string | number> = {}) {
    return this.http.get<Paginated<AccountingBankTransaction[]>>('/api/tenant/accounting/bank-transactions', { params });
  }

  createAccountingBankTransaction(payload: Record<string, unknown>) {
    return this.http.post<{ data: AccountingBankTransaction }>('/api/tenant/accounting/bank-transactions', payload);
  }

  reconcileAccountingBankTransaction(id: number, payload: { status: string; payment_id?: number | null }) {
    return this.http.patch<{ data: AccountingBankTransaction }>(`/api/tenant/accounting/bank-transactions/${id}`, payload);
  }

  salesDashboard() {
    return this.http.get<{ data: SalesDashboard }>('/api/tenant/sales/dashboard');
  }

  salesLeads(params: Record<string, string | number> = {}) {
    return this.http.get<Paginated<SalesLead[]>>('/api/tenant/sales/leads', { params });
  }

  createSalesLead(payload: any) {
    return this.http.post<{ data: SalesLead }>('/api/tenant/sales/leads', payload);
  }

  updateSalesLead(id: number, status: string) {
    return this.http.patch<{ data: SalesLead }>(`/api/tenant/sales/leads/${id}`, { status });
  }

  convertSalesLead(id: number, payload: any) {
    return this.http.post<{ data: { customer: SalesCustomer; opportunity: SalesOpportunity; lead: SalesLead } }>(`/api/tenant/sales/leads/${id}/convert`, payload);
  }

  salesOpportunities(params: Record<string, string | number> = {}) {
    return this.http.get<Paginated<SalesOpportunity[]>>('/api/tenant/sales/opportunities', { params });
  }

  createSalesOpportunity(payload: any) {
    return this.http.post<{ data: SalesOpportunity }>('/api/tenant/sales/opportunities', payload);
  }

  updateSalesOpportunity(id: number, payload: { stage: string; lost_reason?: string | null; probability?: number }) {
    return this.http.patch<{ data: SalesOpportunity }>(`/api/tenant/sales/opportunities/${id}`, payload);
  }

  salesQuotes(params: Record<string, string | number> = {}) {
    return this.http.get<Paginated<SalesQuote[]>>('/api/tenant/sales/quotes', { params });
  }

  createSalesQuote(payload: any) {
    return this.http.post<{ data: SalesQuote }>('/api/tenant/sales/quotes', payload);
  }

  updateSalesQuote(id: number, status: string) {
    return this.http.patch<{ data: SalesQuote }>(`/api/tenant/sales/quotes/${id}`, { status });
  }

  /** Full draft edit: customer fields, items and totals (optionally sends). */
  updateSalesQuoteFull(id: number, payload: any) {
    return this.http.patch<{ data: SalesQuote }>(`/api/tenant/sales/quotes/${id}`, payload);
  }

  salesCustomers(params: Record<string, string | number> = {}) {
    return this.http.get<Paginated<SalesCustomer[]>>('/api/tenant/sales/customers', { params });
  }

  createSalesCustomer(payload: any) {
    return this.http.post<{ data: SalesCustomer }>('/api/tenant/sales/customers', payload);
  }

  // ------------------------------------------------------------- tenant access
  // System users (console staff), the roles that carry their permissions, and
  // the tenant's customer accounts. See /tenant/users.

  tenantSystemUsers(params: Record<string, string | number> = {}) {
    return this.http.get<TenantSystemUsersResponse>('/api/tenant/users', { params });
  }

  createTenantSystemUser(payload: Record<string, unknown>) {
    return this.http.post<{ data: TenantSystemUser; meta: { temporary_password?: string | null } }>(
      '/api/tenant/users',
      payload,
    );
  }

  updateTenantSystemUser(id: number, payload: Record<string, unknown>) {
    return this.http.patch<{ data: TenantSystemUser }>(`/api/tenant/users/${id}`, payload);
  }

  removeTenantSystemUser(id: number) {
    return this.http.delete<{ data: { ok: boolean } }>(`/api/tenant/users/${id}`);
  }

  resetTenantSystemUserPassword(id: number) {
    return this.http.post<{ data: { ok: boolean }; meta: { temporary_password: string } }>(
      `/api/tenant/users/${id}/password`,
      {},
    );
  }

  tenantRoles() {
    return this.http.get<{ data: TenantRoleSummary[]; meta: { permission_groups: PermissionGroup[]; departments: string[]; can_manage: boolean } }>(
      '/api/tenant/roles',
    );
  }

  createTenantRole(payload: Record<string, unknown>) {
    return this.http.post<{ data: TenantRoleSummary }>('/api/tenant/roles', payload);
  }

  updateTenantRole(id: number, payload: Record<string, unknown>) {
    return this.http.patch<{ data: TenantRoleSummary }>(`/api/tenant/roles/${id}`, payload);
  }

  deleteTenantRole(id: number) {
    return this.http.delete<{ data: { deleted: boolean } }>(`/api/tenant/roles/${id}`);
  }

  tenantCustomers(params: Record<string, string | number> = {}) {
    return this.http.get<TenantCustomersResponse>('/api/tenant/customers', { params });
  }

  tenantCustomer(id: number) {
    return this.http.get<{ data: TenantCustomer }>(`/api/tenant/customers/${id}`);
  }

  updateTenantCustomer(id: number, payload: Record<string, unknown>) {
    return this.http.patch<{ data: TenantCustomer }>(`/api/tenant/customers/${id}`, payload);
  }

  // Legacy aliases (the API keeps /api/tenant/staff working).
  tenantStaff() {
    return this.http.get<TenantSystemUsersResponse>('/api/tenant/staff');
  }

  createStaff(payload: any) {
    return this.http.post<{ data: TenantSystemUser; meta: { temporary_password?: string | null } }>('/api/tenant/staff', payload);
  }

  updateStaff(id: number, payload: any) {
    return this.http.patch<{ data: TenantSystemUser }>(`/api/tenant/staff/${id}`, payload);
  }

  removeStaff(id: number) {
    return this.http.delete<{ data: { ok: boolean } }>(`/api/tenant/staff/${id}`);
  }

  // ----------------------------- currency

  /** Platform-wide rate table (public). */
  currencyCatalog() {
    return this.http.get<{ data: CurrencyCatalog }>('/api/currency');
  }

  /** The workspace's active currency plus the catalog. */
  tenantCurrency() {
    return this.http.get<{ data: CurrencyCatalog & { code: string; symbol: string; name: string; decimals: number; rate: number; converted_at: string | null } }>(
      '/api/tenant/currency',
    );
  }

  /** Dry run: what switching the workspace to `to` would re-price. */
  previewCurrencyChange(to: string) {
    return this.http.post<{ data: CurrencyConversionPreview }>('/api/tenant/currency/preview', { to });
  }

  // ----------------------------- my account

  profile() {
    return this.http.get<{ data: ProfilePayload }>('/api/profile');
  }

  updateProfile(payload: Partial<ProfileUser>) {
    return this.http.patch<{ data: ProfilePayload }>('/api/profile', payload);
  }

  updateProfilePassword(payload: { current_password: string; password: string; password_confirmation: string }) {
    return this.http.post<{ data: { ok: boolean; sessions_revoked: number } }>('/api/profile/password', payload);
  }

  uploadProfileAvatar(file: File) {
    const form = new FormData();
    form.append('avatar', file);
    return this.http.post<{ data: { avatar_url: string } }>('/api/profile/avatar', form);
  }

  profileActivity(params: Record<string, string | number> = {}) {
    return this.http.get<Paginated<ProfileActivityEntry[]> & { stats: ProfileActivityStats }>('/api/profile/activity', { params });
  }

  profileSessions() {
    return this.http.get<{ data: ProfileSession[] }>('/api/profile/sessions');
  }

  tenantSettings() {
    return this.http.get<{ data: any }>('/api/tenant/settings');
  }

  updateTenantSettings(payload: any) {
    return this.http.patch<{ data: any }>('/api/tenant/settings', payload);
  }

  uploadTenantDocument(file: File) {
    const form = new FormData();
    form.append('document', file);
    return this.http.post<{ data: { documents: any[] } }>('/api/tenant/settings/documents', form);
  }

  // ----------------------------- tenant activity log

  tenantAuditLogs(params: Record<string, string | number> = {}) {
    return this.http.get<Paginated<AuditLogEntry[]> & { stats: AuditLogStats }>('/api/tenant/audit-logs', { params });
  }

  tenantAuditFacets() {
    return this.http.get<{ data: AuditLogFacets }>('/api/tenant/audit-logs/facets');
  }

  tenantBackups() {
    return this.http.get<{ data: any[] }>('/api/tenant/backups');
  }

  createBackup() {
    return this.http.post<{ data: any }>('/api/tenant/backups', {});
  }

  restoreBackup(id: number) {
    return this.http.post<{ data: any }>(`/api/tenant/backups/${id}/restore`, {});
  }

  backupDownloadUrl(id: number) {
    return `/api/tenant/backups/${id}/download`;
  }

  // ---- tenant catalog -----------------------------------------------------

  sellerProducts(params: Record<string, string | number> = {}) {
    return this.http.get<TenantProductsResponse>('/api/tenant/products', { params });
  }

  /** Stores, categories, catalog presets, units and enums for the editor. */
  productCatalogMeta() {
    return this.http.get<{ data: ProductCatalogMeta }>('/api/tenant/products/meta');
  }

  sellerProduct(id: number) {
    return this.http.get<{ data: TenantProduct }>(`/api/tenant/products/${id}`);
  }

  createProduct(payload: Record<string, unknown>) {
    return this.http.post<{ data: TenantProduct }>('/api/tenant/products', payload);
  }

  updateProduct(id: number, payload: Record<string, unknown>) {
    return this.http.patch<{ data: TenantProduct }>(`/api/tenant/products/${id}`, payload);
  }

  deleteProduct(id: number) {
    return this.http.delete<{ data: { ok: boolean; archived: boolean }; message?: string }>(
      `/api/tenant/products/${id}`,
    );
  }

  duplicateProduct(id: number, name?: string) {
    return this.http.post<{ data: TenantProduct }>(`/api/tenant/products/${id}/duplicate`, name ? { name } : {});
  }

  bulkProducts(payload: { ids: number[]; action: ProductBulkAction; category_id?: number | null; percent?: number; tag?: string }) {
    return this.http.post<{ data: { affected: number; archived_instead: number } }>('/api/tenant/products/bulk', payload);
  }

  uploadProductImage(id: number, file: File, isPrimary = false) {
    const body = new FormData();
    body.append('image', file);
    body.append('is_primary', isPrimary ? '1' : '0');
    return this.http.post<{ data: { id: number; url: string } }>(`/api/tenant/products/${id}/images`, body);
  }

  deleteProductImage(productId: number, imageId: number) {
    return this.http.delete<{ data: { ok: boolean } }>(`/api/tenant/products/${productId}/images/${imageId}`);
  }

  updateVariantInventory(variantId: number, payload: { quantity?: number; adjustment?: number; low_stock_threshold?: number }) {
    return this.http.patch<{ data: ProductInventory }>(`/api/tenant/variants/${variantId}/inventory`, payload);
  }

  sellerOrders(params: Record<string, string | number> = {}) {
    return this.http.get<SellerOrdersResponse>('/api/tenant/orders', { params });
  }

  sellerOrder(id: number) {
    return this.http.get<{ data: SellerOrder }>(`/api/tenant/orders/${id}`);
  }

  updateSellerOrderStatus(id: number, status: string) {
    return this.http.patch<{ data: SellerOrder }>(`/api/tenant/orders/${id}/status`, { status });
  }

  sellerStores() {
    return this.http.get<Paginated<any[]>>('/api/tenant/stores');
  }

  createStore(payload: any) {
    return this.http.post<{ data: any }>('/api/tenant/stores', payload);
  }

  sellerStore(id: number) {
    return this.http.get<{ data: any }>(`/api/tenant/stores/${id}`);
  }

  updateStore(id: number, payload: any) {
    return this.http.patch<{ data: any }>(`/api/tenant/stores/${id}`, payload);
  }

  deleteStore(id: number) {
    return this.http.delete<{ data: { ok: boolean } }>(`/api/tenant/stores/${id}`);
  }

  sellerCategories() {
    return this.http.get<{ data: Category[] }>('/api/tenant/categories');
  }

  createCategory(payload: { name: string }) {
    return this.http.post<{ data: Category }>('/api/tenant/categories', payload);
  }

  // ---- tenant stock control ----------------------------------------------

  tenantInventory(params: Record<string, string | number> = {}) {
    return this.http.get<InventoryResponse>('/api/tenant/inventory', { params });
  }

  inventoryMeta() {
    return this.http.get<{ data: InventoryFilterOptions & { movement_types: StockMovementType[] } }>(
      '/api/tenant/inventory/meta',
    );
  }

  inventoryMovements(params: Record<string, string | number> = {}) {
    return this.http.get<{ data: StockMovementEntry[] }>('/api/tenant/inventory/movements', { params });
  }

  adjustInventory(id: number, payload: Record<string, unknown>) {
    return this.http.post<{ data: InventoryRow; movement_id: number | null }>(
      `/api/tenant/inventory/${id}/adjust`,
      payload,
    );
  }

  bulkInventory(payload: { ids: number[]; action: string; quantity?: number; location?: string; note?: string; reference?: string }) {
    return this.http.post<{ data: { affected: number } }>('/api/tenant/inventory/bulk', payload);
  }

  lowStock() {
    return this.http.get<{ data: InventoryRow[] }>('/api/tenant/inventory/low-stock');
  }

  adminMetrics() {
    return this.http.get<{ data: any }>('/api/admin/metrics');
  }

  adminTenants(params: Record<string, string | number> = {}) {
    return this.http.get<Paginated<TenantApplication[]>>('/api/admin/tenants', { params });
  }

  adminTenant(id: number) {
    return this.http.get<{ data: TenantApplication }>(`/api/admin/tenants/${id}`);
  }

  adminTenantDocumentUrl(id: number, key: string) {
    return `/api/admin/tenants/${id}/documents/${key}`;
  }

  /** Documents are private, so they are fetched with the token and saved as a blob. */
  adminTenantDocument(id: number, key: string) {
    return this.http.get(this.adminTenantDocumentUrl(id, key), { responseType: 'blob' });
  }

  updateTenantStatus(id: number, status: string, extra: { review_notes?: string; rejection_reason?: string } = {}) {
    return this.http.patch<{ data: TenantApplication }>(`/api/admin/tenants/${id}`, { status, ...extra });
  }

  adminOrders() {
    return this.http.get<Paginated<any[]>>('/api/admin/orders');
  }

  adminAuditLogs(params: Record<string, string | number> = {}) {
    return this.http.get<Paginated<AuditLogEntry[]> & { stats: AuditLogStats }>('/api/admin/audit-logs', { params });
  }

  adminAuditLogFacets() {
    return this.http.get<{ data: AuditLogFacets }>('/api/admin/audit-logs/facets');
  }

  /** Store application: multipart so certificates/permits can be uploaded. */
  applyForStore(form: FormData) {
    return this.http.post<{ data: TenantApplication; message: string }>('/api/tenants/register', form);
  }

  myTenantApplication() {
    return this.http.get<{ data: TenantApplication | null }>('/api/tenants/mine');
  }

  updateTenantApplication(form: FormData) {
    return this.http.patch<{ data: TenantApplication; resubmitted: boolean }>('/api/tenant', form);
  }

  clickAd(impressionId: number) {
    return this.http.post<{ data: { ok: boolean } }>(`/api/market/ads/click/${impressionId}`, {});
  }

  sellerDomains() {
    return this.http.get<{ data: any[] }>('/api/tenant/domains');
  }

  addDomain(domain: string) {
    return this.http.post<{ data: any }>('/api/tenant/domains', { domain });
  }

  verifyDomain(id: number, force = false) {
    return this.http.post<{ data: any }>(`/api/tenant/domains/${id}/verify`, { force });
  }

  deleteDomain(id: number) {
    return this.http.delete<{ data: any }>(`/api/tenant/domains/${id}`);
  }

  sellerAds(params: Record<string, string | number> = {}) {
    return this.http.get<{ data: AdWorkspace }>('/api/tenant/ads', { params });
  }

  adsMeta() {
    return this.http.get<{ data: AdWorkspaceMeta }>('/api/tenant/ads/meta');
  }

  deleteAd(id: number) {
    return this.http.delete<{ data: { deleted: boolean } }>(`/api/tenant/ads/${id}`);
  }

  createAd(payload: any) {
    return this.http.post<{ data: any }>('/api/tenant/ads', payload);
  }

  updateAd(id: number, payload: any) {
    return this.http.patch<{ data: any }>(`/api/tenant/ads/${id}`, payload);
  }

  fundAds(amount: number) {
    return this.http.post<{ data: any }>('/api/tenant/ads/fund', { amount });
  }

  sellerApiKeys() {
    return this.http.get<{ data: any[] }>('/api/tenant/api-keys');
  }

  createApiKey(payload: any) {
    return this.http.post<{ data: { key: any; secret: string } }>('/api/tenant/api-keys', payload);
  }

  revokeApiKey(id: number) {
    return this.http.delete<{ data: any }>(`/api/tenant/api-keys/${id}`);
  }

  sellerWebhooks() {
    return this.http.get<{ data: any[] }>('/api/tenant/webhooks');
  }

  createWebhook(payload: any) {
    return this.http.post<{ data: any }>('/api/tenant/webhooks', payload);
  }

  deleteWebhook(id: number) {
    return this.http.delete<{ data: { ok: boolean } }>(`/api/tenant/webhooks/${id}`);
  }

  webhookDeliveries(id: number) {
    return this.http.get<{ data: any[]; meta?: any }>(`/api/tenant/webhooks/${id}/deliveries`);
  }

  webhookCatalog() {
    return this.http.get<{ data: string[] }>('/api/tenant/webhooks/catalog');
  }

  aiSettings() {
    return this.http.get<{ data: any }>('/api/tenant/ai/settings');
  }

  updateAiSettings(payload: any) {
    return this.http.patch<{ data: any }>('/api/tenant/ai/settings', payload);
  }

  aiUsage() {
    return this.http.get<{ data: { used: number; budget: number } }>('/api/tenant/ai/usage');
  }

  aiDescribe(productId: number) {
    return this.http.post<{ data: any }>('/api/tenant/ai/describe', { product_id: productId });
  }

  aiCategorize(productId: number) {
    return this.http.post<{ data: any }>('/api/tenant/ai/categorize', { product_id: productId });
  }

  aiGenerations() {
    return this.http.get<{ data: any[] }>('/api/tenant/ai/generations');
  }

  reviewGeneration(id: number, status: string) {
    return this.http.post<{ data: any }>(`/api/tenant/ai/generations/${id}/review`, { status });
  }

  aiInsights() {
    return this.http.get<{ data: any }>('/api/tenant/ai/insights');
  }

  sellerAnalytics(params: Record<string, string | number> = {}) {
    return this.http.get<{ data: TenantAnalyticsReport }>('/api/tenant/analytics', { params });
  }

  adminAnalytics(days = 30) {
    return this.http.get<{ data: AdminAnalytics }>('/api/admin/analytics', { params: { days } });
  }

  adminInsights(days = 30) {
    return this.http.get<{ data: AdminInsight }>('/api/admin/insights', { params: { days } });
  }

  adminAds() {
    return this.http.get<{ data: any[] }>('/api/admin/ads');
  }

  adminDomains() {
    return this.http.get<{ data: any[] }>('/api/admin/domains');
  }

  adminVerifyDomain(id: number) {
    return this.http.post<{ data: any }>(`/api/admin/domains/${id}/verify`, {});
  }

  adminWebhookHealth() {
    return this.http.get<{ data: any }>('/api/admin/webhooks/health');
  }

  adminAiCosts() {
    return this.http.get<{ data: any[] }>('/api/admin/ai-costs');
  }

  // ---------------------------------------------------------- marketing hub

  adminMarketingOverview() {
    return this.http.get<{ data: MarketingOverview }>('/api/admin/marketing/overview');
  }

  adminSocialAccounts() {
    return this.http.get<{ data: SocialAccount[] }>('/api/admin/marketing/accounts');
  }

  connectSocialAccount(payload: { platform: string; handle: string; display_name?: string }) {
    return this.http.post<{ data: SocialAccount }>('/api/admin/marketing/accounts/connect', payload);
  }

  disconnectSocialAccount(id: number) {
    return this.http.post<{ data: SocialAccount }>(`/api/admin/marketing/accounts/${id}/disconnect`, {});
  }

  adminMarketingCampaigns() {
    return this.http.get<{ data: MarketingCampaign[] }>('/api/admin/marketing/campaigns');
  }

  createMarketingCampaign(payload: Partial<MarketingCampaign>) {
    return this.http.post<{ data: MarketingCampaign }>('/api/admin/marketing/campaigns', payload);
  }

  updateMarketingCampaign(id: number, payload: Partial<MarketingCampaign>) {
    return this.http.patch<{ data: MarketingCampaign }>(`/api/admin/marketing/campaigns/${id}`, payload);
  }

  deleteMarketingCampaign(id: number) {
    return this.http.delete<{ data: { deleted: boolean } }>(`/api/admin/marketing/campaigns/${id}`);
  }

  adminSocialPosts() {
    return this.http.get<{ data: SocialPost[] }>('/api/admin/marketing/posts');
  }

  createSocialPost(payload: Partial<SocialPost>) {
    return this.http.post<{ data: SocialPost }>('/api/admin/marketing/posts', payload);
  }

  updateSocialPost(id: number, payload: Partial<SocialPost>) {
    return this.http.patch<{ data: SocialPost }>(`/api/admin/marketing/posts/${id}`, payload);
  }

  publishSocialPost(id: number) {
    return this.http.post<{ data: SocialPost }>(`/api/admin/marketing/posts/${id}/publish`, {});
  }

  deleteSocialPost(id: number) {
    return this.http.delete<{ data: { deleted: boolean } }>(`/api/admin/marketing/posts/${id}`);
  }
  // ---------------------------------------------------------- super admin

  adminOverview(days = 30) {
    return this.http.get<{ data: AdminOverview }>('/api/admin/overview', { params: { days } });
  }

  adminUsers(params: Record<string, string | number> = {}) {
    return this.http.get<Paginated<AdminUser[]> & { summary: AdminUserSummary }>('/api/admin/users', { params });
  }

  adminUser(id: number) {
    return this.http.get<{ data: AdminUser }>(`/api/admin/users/${id}`);
  }

  createAdminUser(payload: Record<string, unknown>) {
    return this.http.post<{ data: AdminUser }>('/api/admin/users', payload);
  }

  updateAdminUser(id: number, payload: Record<string, unknown>) {
    return this.http.patch<{ data: AdminUser }>(`/api/admin/users/${id}`, payload);
  }

  syncAdminUserRoles(id: number, roles: { role: string; tenant_id?: number | null; store_id?: number | null; department?: string | null }[]) {
    return this.http.put<{ data: AdminUser }>(`/api/admin/users/${id}/roles`, { roles });
  }

  deleteAdminUser(id: number) {
    return this.http.delete<{ data: { deleted: boolean } }>(`/api/admin/users/${id}`);
  }

  adminRoles() {
    return this.http.get<{ data: AdminRoleDefinition[]; meta: { permission_groups: PermissionGroup[] } }>('/api/admin/roles');
  }

  createAdminRole(payload: { key: string; name: string; description?: string | null; permissions: string[] }) {
    return this.http.post<{ data: AdminRoleDefinition }>('/api/admin/roles', payload);
  }

  updateAdminRole(id: number, payload: { name?: string; description?: string | null; permissions?: string[] }) {
    return this.http.patch<{ data: AdminRoleDefinition }>(`/api/admin/roles/${id}`, payload);
  }

  deleteAdminRole(id: number) {
    return this.http.delete<{ data: { deleted: boolean } }>(`/api/admin/roles/${id}`);
  }

  adminPlans() {
    return this.http.get<{ data: Plan[] }>('/api/admin/plans');
  }

  createPlan(payload: Partial<Plan>) {
    return this.http.post<{ data: Plan }>('/api/admin/plans', payload);
  }

  updatePlan(id: number, payload: Partial<Plan>) {
    return this.http.patch<{ data: Plan }>(`/api/admin/plans/${id}`, payload);
  }

  deletePlan(id: number) {
    return this.http.delete<{ data: { deleted: boolean } }>(`/api/admin/plans/${id}`);
  }

  adminSubscriptions(params: Record<string, string | number> = {}) {
    return this.http.get<Paginated<Subscription[]> & { stats: SubscriptionStats }>('/api/admin/subscriptions', { params });
  }

  adminSubscriptionStats() {
    return this.http.get<{ data: SubscriptionStats }>('/api/admin/subscriptions/stats');
  }

  createSubscription(payload: { tenant_id: number; plan_id: number; status?: string; trial_days?: number }) {
    return this.http.post<{ data: Subscription }>('/api/admin/subscriptions', payload);
  }

  updateSubscription(id: number, payload: Record<string, unknown>) {
    return this.http.patch<{ data: Subscription }>(`/api/admin/subscriptions/${id}`, payload);
  }

  renewSubscription(id: number) {
    return this.http.post<{ data: any }>(`/api/admin/subscriptions/${id}/renew`, {});
  }

  adminInvoices(params: Record<string, string | number> = {}) {
    return this.http.get<Paginated<Invoice[]>>('/api/admin/invoices', { params });
  }

  updateInvoice(id: number, status: string) {
    return this.http.patch<{ data: Invoice }>(`/api/admin/invoices/${id}`, { status });
  }

  adminSettings() {
    return this.http.get<SettingsPayload>('/api/admin/settings');
  }

  adminPaymentStatus() {
    return this.http.get<{ data: { enabled: boolean; mode: string; provider: string; provider_configured: boolean; currency: string; webhook_tolerance: number; methods: { key: string; label: string; enabled: boolean }[] } }>('/api/admin/settings/payment-status');
  }

  saveSettings(settings: { key: string; value: unknown }[]) {
    return this.http.put<SettingsPayload>('/api/admin/settings', { settings });
  }

  resetSettings(group: string) {
    return this.http.post<SettingsPayload>('/api/admin/settings/reset', { group });
  }

  /** Branding assets (logo, dark logo, favicon, social image) are uploaded as multipart. */
  uploadBrandingAsset(asset: string, file: File) {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<SettingsPayload & { meta: { asset: string; url: string } }>(
      `/api/admin/settings/assets/${asset}`,
      form,
    );
  }

  removeBrandingAsset(asset: string) {
    return this.http.delete<SettingsPayload>(`/api/admin/settings/assets/${asset}`);
  }

  sendTestEmail(to: string) {
    return this.http.post<{ data: GatewayTestResult }>('/api/admin/settings/email/test', { to });
  }

  sendTestSms(to: string) {
    return this.http.post<{ data: GatewayTestResult }>('/api/admin/settings/sms/test', { to });
  }

  adminBackups() {
    return this.http.get<{ data: PlatformBackup[]; meta: BackupMeta }>('/api/admin/backups');
  }

  createAdminBackup(scope: string, note?: string) {
    return this.http.post<{ data: PlatformBackup }>('/api/admin/backups', { scope, note: note || null });
  }

  restoreAdminBackup(id: number) {
    return this.http.post<{ data: { ok: boolean; message: string; settings_restored: number; backup: PlatformBackup } }>(
      `/api/admin/backups/${id}/restore`,
      {},
    );
  }

  deleteAdminBackup(id: number) {
    return this.http.delete<{ data: { deleted: boolean } }>(`/api/admin/backups/${id}`);
  }

  // ---------------------------------------------------------- service desk

  supportOverview(days = 30) {
    return this.http.get<{ data: SupportOverview }>('/api/admin/support/overview', { params: { days } });
  }

  supportAgents() {
    return this.http.get<{ data: SupportAgent[] }>('/api/admin/support/agents');
  }

  supportTickets(params: Record<string, string | number | boolean> = {}) {
    return this.http.get<{ data: SupportTicket[]; meta: Paginated<unknown>['meta']; summary: SupportTicketSummary }>(
      '/api/admin/support/tickets',
      { params: params as Record<string, string> },
    );
  }

  supportTicket(id: number) {
    return this.http.get<{ data: SupportTicket }>(`/api/admin/support/tickets/${id}`);
  }

  createSupportTicket(payload: Record<string, unknown>) {
    return this.http.post<{ data: SupportTicket }>('/api/admin/support/tickets', payload);
  }

  updateSupportTicket(id: number, payload: Record<string, unknown>) {
    return this.http.patch<{ data: SupportTicket }>(`/api/admin/support/tickets/${id}`, payload);
  }

  replySupportTicket(id: number, payload: Record<string, unknown>) {
    return this.http.post<{ data: SupportTicket }>(`/api/admin/support/tickets/${id}/messages`, payload);
  }

  supportChats(params: Record<string, string> = {}) {
    return this.http.get<{ data: SupportChat[]; summary: SupportChatSummary }>('/api/admin/support/chats', { params });
  }

  supportChat(id: number) {
    return this.http.get<{ data: SupportChat }>(`/api/admin/support/chats/${id}`);
  }

  updateSupportChat(id: number, action: string, agentId?: number | null) {
    return this.http.patch<{ data: SupportChat }>(`/api/admin/support/chats/${id}`, { action, agent_id: agentId ?? null });
  }

  replySupportChat(id: number, body: string) {
    return this.http.post<{ data: SupportChatMessage }>(`/api/admin/support/chats/${id}/messages`, { body });
  }

  supportTasks(params: Record<string, string> = {}) {
    return this.http.get<{ data: SupportTask[]; summary: SupportTaskSummary }>('/api/admin/support/tasks', { params });
  }

  createSupportTask(payload: Record<string, unknown>) {
    return this.http.post<{ data: SupportTask }>('/api/admin/support/tasks', payload);
  }

  updateSupportTask(id: number, payload: Record<string, unknown>) {
    return this.http.patch<{ data: SupportTask }>(`/api/admin/support/tasks/${id}`, payload);
  }

  deleteSupportTask(id: number) {
    return this.http.delete<{ data: { deleted: boolean } }>(`/api/admin/support/tasks/${id}`);
  }

  supportGuides(params: Record<string, string> = {}) {
    return this.http.get<{ data: { categories: HelpCategory[]; articles: HelpArticle[] }; summary: GuideSummary }>(
      '/api/admin/support/guides',
      { params },
    );
  }

  createSupportGuide(payload: Record<string, unknown>) {
    return this.http.post<{ data: HelpArticle }>('/api/admin/support/guides', payload);
  }

  updateSupportGuide(id: number, payload: Record<string, unknown>) {
    return this.http.patch<{ data: HelpArticle }>(`/api/admin/support/guides/${id}`, payload);
  }

  deleteSupportGuide(id: number) {
    return this.http.delete<{ data: { deleted: boolean } }>(`/api/admin/support/guides/${id}`);
  }

  createGuideCategory(payload: Record<string, unknown>) {
    return this.http.post<{ data: HelpCategory }>('/api/admin/support/guide-categories', payload);
  }

  supportCannedReplies() {
    return this.http.get<{ data: SupportCannedReply[] }>('/api/admin/support/canned-replies');
  }

  // ------------------------------------------------- tenant-facing support

  tenantSupportOverview() {
    return this.http.get<{ data: TenantSupportOverview }>('/api/tenant/support/overview');
  }

  tenantTickets(params: Record<string, string> = {}) {
    return this.http.get<{ data: SupportTicket[] }>('/api/tenant/support/tickets', { params });
  }

  tenantTicket(id: number) {
    return this.http.get<{ data: SupportTicket }>(`/api/tenant/support/tickets/${id}`);
  }

  createTenantTicket(payload: Record<string, unknown>) {
    return this.http.post<{ data: SupportTicket }>('/api/tenant/support/tickets', payload);
  }

  replyTenantTicket(id: number, body: string) {
    return this.http.post<{ data: SupportTicket }>(`/api/tenant/support/tickets/${id}/messages`, { body });
  }

  rateTenantTicket(id: number, satisfaction: number, comment?: string) {
    return this.http.post<{ data: SupportTicket }>(`/api/tenant/support/tickets/${id}/rate`, {
      satisfaction,
      satisfaction_comment: comment ?? null,
    });
  }

  tenantChat() {
    return this.http.get<{ data: SupportChat }>('/api/tenant/support/chat');
  }

  sendTenantChatMessage(body: string) {
    return this.http.post<{ data: SupportChatMessage }>('/api/tenant/support/chat/messages', { body });
  }

  tenantSupportTasks() {
    return this.http.get<{ data: SupportTask[] }>('/api/tenant/support/tasks');
  }

  updateTenantSupportTask(id: number, payload: Record<string, unknown>) {
    return this.http.patch<{ data: SupportTask }>(`/api/tenant/support/tasks/${id}`, payload);
  }

  tenantGuides(params: Record<string, string> = {}) {
    return this.http.get<{ data: { categories: HelpCategory[]; articles: HelpArticle[] } }>(
      '/api/tenant/support/guides',
      { params },
    );
  }

  readTenantGuide(id: number) {
    return this.http.get<{ data: HelpArticle }>(`/api/tenant/support/guides/${id}`);
  }

  rateTenantGuide(id: number, helpful: boolean) {
    return this.http.post<{ data: HelpArticle }>(`/api/tenant/support/guides/${id}/feedback`, { helpful });
  }

  adminBackupDownloadUrl(id: number) {
    return `/api/admin/backups/${id}/download`;
  }
}
