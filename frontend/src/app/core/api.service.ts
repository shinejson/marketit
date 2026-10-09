import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CurrencyCatalog } from './currency.service';
import {
  Address,
  AdminPayoutOverview,
  AdminReviewSummary,
  AppNotification,
  CatalogCategoriesPayload,
  CatalogProductSummary,
  CommissionEarnings,
  CommissionMeta,
  CommissionQuotePreview,
  CommissionRule,
  Coupon,
  CouponMeta,
  CouponRedemption,
  CouponSummary,
  DeliverySettings,
  DeliveryMethod,
  DeliveryZone,
  Dispute,
  DisputeSummary,
  ModeratedProduct,
  NotificationSummary,
  PageMeta,
  PayoutAccount,
  PayoutAdjustment,
  PayoutBatch,
  PayoutOverview,
  PendingReview,
  PlatformCategory,
  ProductReportRow,
  Refund,
  RefundSummary,
  RefundableOrder,
  Review,
  ReviewFeed,
  ReviewReport,
  ReviewSummary,
  SettlementRow,
  Shipment,
  ShipmentSummary,
  TenantCategoryRow,
  TenantReviewSummary,
  WishlistItem,
  WishlistPayload,
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
  TenantReportCatalogResponse,
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
  HeroSlide,
  HeroSlidesPayload,
  SocialAccount,
  SocialPost,
  Storefront,
  StorefrontPage,
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
  TemplateCategory,
  PageTemplate,
  TemplatePurchase,
  TenantPage,
  PageRevision,
  StorePageSection,
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
    return this.http.get<{ data: { store: Storefront; products: ProductCard[]; pages: StorefrontPage[] } }>(`/api/market/stores/${slug}`);
  }

  contactStore(slug: string, payload: { name: string; email: string; subject?: string; message: string }) {
    return this.http.post<{ data: { sent: boolean; message: string } }>(`/api/market/stores/${slug}/contact`, payload);
  }

  marketCategories() {
    return this.http.get<{ data: Category[] }>('/api/market/categories');
  }

  marketHeroSlides() {
    return this.http.get<{ data: HeroSlidesPayload }>('/api/market/hero-slides');
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

  updateAddress(id: number, payload: Partial<Address>) {
    return this.http.patch<{ data: Address }>(`/api/addresses/${id}`, payload);
  }

  deleteAddress(id: number) {
    return this.http.delete<{ data: { ok: boolean } }>(`/api/addresses/${id}`);
  }

  checkoutQuote(addressId?: number | null, deliveryChoices: Record<string, number> = {}) {
    return this.http.post<{ data: CartPayload }>('/api/checkout/quote', {
      address_id: addressId ?? null,
      delivery_choices: deliveryChoices,
    });
  }

  checkout(
    shippingAddressId: number,
    idempotencyKey: string,
    paymentMethod = 'card',
    deliveryChoices: Record<string, number> = {},
  ) {
    return this.http.post<any>(
      '/api/checkout',
      {
        shipping_address_id: shippingAddressId,
        payment_method: paymentMethod,
        delivery_choices: deliveryChoices,
      },
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
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

  updateAccountingInvoice(id: number, payload: Record<string, unknown>) {
    return this.http.patch<{ data: AccountingInvoice }>(`/api/tenant/accounting/invoices/${id}`, payload);
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

  accountingPayment(id: number) {
    return this.http.get<{ data: AccountingPayment }>(`/api/tenant/accounting/payments/${id}`);
  }

  accountingExpenses(params: Record<string, string | number> = {}) {
    return this.http.get<Paginated<AccountingExpense[]>>('/api/tenant/accounting/expenses', { params });
  }

  createAccountingExpense(payload: Record<string, unknown>) {
    return this.http.post<{ data: AccountingExpense }>('/api/tenant/accounting/expenses', payload);
  }

  updateAccountingExpense(id: number, payload: Record<string, unknown>) {
    return this.http.patch<{ data: AccountingExpense }>(`/api/tenant/accounting/expenses/${id}`, payload);
  }

  deleteAccountingExpense(id: number) {
    return this.http.delete<{ data: { deleted: boolean } }>(`/api/tenant/accounting/expenses/${id}`);
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

  updateAccountingContact(id: number, payload: Record<string, unknown>) {
    return this.http.patch<{ data: AccountingContact }>(`/api/tenant/accounting/contacts/${id}`, payload);
  }

  deleteAccountingContact(id: number) {
    return this.http.delete<{ data: { deleted: boolean } }>(`/api/tenant/accounting/contacts/${id}`);
  }

  purchaseOrders(params: Record<string, string | number> = {}) {
    return this.http.get<Paginated<PurchaseOrder[]>>('/api/tenant/accounting/purchase-orders', { params });
  }

  createPurchaseOrder(payload: Record<string, unknown>) {
    return this.http.post<{ data: PurchaseOrder }>('/api/tenant/accounting/purchase-orders', payload);
  }

  updatePurchaseOrder(id: number, payload: Record<string, unknown>) {
    return this.http.patch<{ data: PurchaseOrder }>(`/api/tenant/accounting/purchase-orders/${id}`, payload);
  }

  deletePurchaseOrder(id: number) {
    return this.http.delete<{ data: { deleted: boolean } }>(`/api/tenant/accounting/purchase-orders/${id}`);
  }

  accountingAccounts(params: Record<string, string | number> = {}) {
    return this.http.get<{ data: AccountingAccount[] }>('/api/tenant/accounting/accounts', { params });
  }

  createAccountingAccount(payload: Record<string, unknown>) {
    return this.http.post<{ data: AccountingAccount }>('/api/tenant/accounting/accounts', payload);
  }

  updateAccountingAccount(id: number, payload: Record<string, unknown>) {
    return this.http.patch<{ data: AccountingAccount }>(`/api/tenant/accounting/accounts/${id}`, payload);
  }

  deleteAccountingAccount(id: number) {
    return this.http.delete<{ data: { deleted: boolean } }>(`/api/tenant/accounting/accounts/${id}`);
  }

  accountingJournals(params: Record<string, string | number> = {}) {
    return this.http.get<Paginated<AccountingJournalEntry[]>>('/api/tenant/accounting/journals', { params });
  }

  createAccountingJournal(payload: Record<string, unknown>) {
    return this.http.post<{ data: AccountingJournalEntry }>('/api/tenant/accounting/journals', payload);
  }

  updateAccountingJournal(id: number, payload: Record<string, unknown>) {
    return this.http.patch<{ data: AccountingJournalEntry }>(`/api/tenant/accounting/journals/${id}`, payload);
  }

  deleteAccountingJournal(id: number) {
    return this.http.delete<{ data: { deleted: boolean } }>(`/api/tenant/accounting/journals/${id}`);
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

  updateAccountingBankAccount(id: number, payload: Record<string, unknown>) {
    return this.http.patch<{ data: AccountingBankAccount }>(`/api/tenant/accounting/bank-accounts/${id}`, payload);
  }

  deleteAccountingBankAccount(id: number) {
    return this.http.delete<{ data: { deleted: boolean } }>(`/api/tenant/accounting/bank-accounts/${id}`);
  }

  accountingBankTransactions(params: Record<string, string | number> = {}) {
    return this.http.get<Paginated<AccountingBankTransaction[]>>('/api/tenant/accounting/bank-transactions', { params });
  }

  createAccountingBankTransaction(payload: Record<string, unknown>) {
    return this.http.post<{ data: AccountingBankTransaction }>('/api/tenant/accounting/bank-transactions', payload);
  }

  reconcileAccountingBankTransaction(id: number, payload: Record<string, unknown>) {
    return this.http.patch<{ data: AccountingBankTransaction }>(`/api/tenant/accounting/bank-transactions/${id}`, payload);
  }

  deleteAccountingBankTransaction(id: number) {
    return this.http.delete<{ data: { deleted: boolean } }>(`/api/tenant/accounting/bank-transactions/${id}`);
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
    return this.http.patch<{ data: Storefront }>(`/api/tenant/stores/${id}`, payload);
  }

  templateCatalog(params: Record<string, string | number> = {}) {
    return this.http.get<{ data: PageTemplate[]; categories: TemplateCategory[]; meta: PageMeta; currency: string }>(
      '/api/tenant/templates', { params },
    );
  }

  templateLibrary() {
    return this.http.get<{ data: TemplatePurchase[] }>('/api/tenant/templates/mine');
  }

  purchaseTemplate(id: number, paymentMethod?: string) {
    return this.http.post<{ data: { purchase: TemplatePurchase; already_owned: boolean; checkout: null | { type: string; url: string; reference: string } } }>(
      `/api/tenant/templates/${id}/purchase`, paymentMethod ? { payment_method: paymentMethod } : {},
    );
  }

  installTemplate(id: number, storeId: number) {
    return this.http.post<{ data: { installation: unknown; store: Storefront } }>(
      `/api/tenant/templates/${id}/install`, { store_id: storeId },
    );
  }

  tenantPages(storeId: number) {
    return this.http.get<{ data: TenantPage[] }>(`/api/tenant/stores/${storeId}/pages`);
  }

  createTenantPage(storeId: number, payload: Partial<TenantPage> & { name: string; content: { schema_version: number; sections: StorePageSection[] } }) {
    return this.http.post<{ data: TenantPage }>(`/api/tenant/stores/${storeId}/pages`, payload);
  }

  updateTenantPage(storeId: number, pageId: number, payload: Partial<TenantPage>) {
    return this.http.patch<{ data: TenantPage }>(`/api/tenant/stores/${storeId}/pages/${pageId}`, payload);
  }

  deleteTenantPage(storeId: number, pageId: number) {
    return this.http.delete<{ data: { deleted: boolean } }>(`/api/tenant/stores/${storeId}/pages/${pageId}`);
  }

  tenantHomeRevisions(storeId: number) {
    return this.http.get<{ data: PageRevision[] }>(`/api/tenant/stores/${storeId}/page-revisions`);
  }

  tenantPageRevisions(storeId: number, pageId: number) {
    return this.http.get<{ data: PageRevision[] }>(`/api/tenant/stores/${storeId}/pages/${pageId}/revisions`);
  }

  restoreTenantHomeRevision(storeId: number, revisionId: number) {
    return this.http.post<{ data: Storefront; restored_version: number }>(
      `/api/tenant/stores/${storeId}/page-revisions/${revisionId}/restore`, {},
    );
  }

  restoreTenantPageRevision(storeId: number, pageId: number, revisionId: number) {
    return this.http.post<{ data: TenantPage; restored_version: number }>(
      `/api/tenant/stores/${storeId}/pages/${pageId}/revisions/${revisionId}/restore`, {},
    );
  }

  deleteStore(id: number) {
    return this.http.delete<{ data: { ok: boolean } }>(`/api/tenant/stores/${id}`);
  }

  uploadStoreMedia(storeId: number, file: File, type?: string) {
    const fd = new FormData();
    fd.append('file', file);
    if (type) fd.append('type', type);
    return this.http.post<{ data: { url: string; filename: string; type?: string } }>(
      `/api/tenant/stores/${storeId}/media`,
      fd
    );
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

  adminStores(params: Record<string, string | number> = {}) {
    return this.http.get<Paginated<any[]>>('/api/admin/stores', { params });
  }

  adminUpdateStore(id: number, payload: { status?: string; is_featured?: boolean }) {
    return this.http.patch<{ data: any }>(`/api/admin/stores/${id}`, payload);
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

  /** Catalogue of the reports the signed-in user's role may open. */
  tenantReportCatalog() {
    return this.http.get<TenantReportCatalogResponse>('/api/tenant/reports/catalog');
  }

  generateTenantReport(params: Record<string, any> = {}) {
    return this.http.get<{ data: any }>('/api/tenant/reports/generate', { params });
  }

  adminReportCatalog() {
    return this.http.get<{ data: { categories: any[] } }>('/api/admin/reports/catalog');
  }

  generateAdminReport(params: Record<string, any> = {}) {
    return this.http.get<{ data: any }>('/api/admin/reports/generate', { params });
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

  adminTemplateCategories() {
    return this.http.get<{ data: TemplateCategory[] }>('/api/admin/template-categories');
  }

  createAdminTemplateCategory(payload: Partial<TemplateCategory> & { name: string }) {
    return this.http.post<{ data: TemplateCategory }>('/api/admin/template-categories', payload);
  }

  updateAdminTemplateCategory(id: number, payload: Partial<TemplateCategory>) {
    return this.http.patch<{ data: TemplateCategory }>(`/api/admin/template-categories/${id}`, payload);
  }

  deleteAdminTemplateCategory(id: number) {
    return this.http.delete<{ data: { deleted: boolean } }>(`/api/admin/template-categories/${id}`);
  }

  adminTemplates(params: Record<string, string | number> = {}) {
    return this.http.get<Paginated<PageTemplate[]>>('/api/admin/templates', { params });
  }

  createAdminTemplate(payload: Partial<PageTemplate>) {
    return this.http.post<{ data: PageTemplate }>('/api/admin/templates', payload);
  }

  updateAdminTemplate(id: number, payload: Partial<PageTemplate>) {
    return this.http.patch<{ data: PageTemplate }>(`/api/admin/templates/${id}`, payload);
  }

  publishAdminTemplate(id: number) {
    return this.http.post<{ data: PageTemplate }>(`/api/admin/templates/${id}/publish`, {});
  }

  deleteAdminTemplate(id: number) {
    return this.http.delete<{ data: { deleted: boolean } }>(`/api/admin/templates/${id}`);
  }

  adminTemplatePurchases(params: Record<string, string | number> = {}) {
    return this.http.get<Paginated<TemplatePurchase[]>>('/api/admin/template-purchases', { params });
  }

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

  adminHeroSlides() {
    return this.http.get<{ data: HeroSlidesPayload }>('/api/admin/settings/hero-slides');
  }

  uploadHeroSlide(file: File, meta?: { tag?: string; title?: string; link?: string }) {
    const form = new FormData();
    form.append('file', file);
    if (meta?.tag) form.append('tag', meta.tag);
    if (meta?.title) form.append('title', meta.title);
    if (meta?.link) form.append('link', meta.link);
    return this.http.post<{ data: { slide: HeroSlide; slides: HeroSlide[]; autoplay: boolean; interval: number }; message: string }>(
      '/api/admin/settings/hero-slides',
      form
    );
  }

  updateHeroSlides(payload: { slides: HeroSlide[]; autoplay?: boolean; interval?: number }) {
    return this.http.put<{ data: HeroSlidesPayload; message: string }>(
      '/api/admin/settings/hero-slides',
      payload
    );
  }

  deleteHeroSlide(id: string) {
    return this.http.delete<{ data: { slides: HeroSlide[]; autoplay: boolean; interval: number }; message: string }>(
      `/api/admin/settings/hero-slides/${id}`
    );
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

  // ----------- §9 / §17 reviews, ratings & trust

  productReviews(slug: string, params: Record<string, string> = {}) {
    return this.http.get<ReviewFeed>(`/api/market/products/${slug}/reviews`, { params });
  }

  storeReviews(slug: string, params: Record<string, string> = {}) {
    return this.http.get<ReviewFeed>(`/api/market/stores/${slug}/reviews`, { params });
  }

  myReviews(params: Record<string, string> = {}) {
    return this.http.get<{ data: Review[]; meta: PageMeta }>('/api/reviews/mine', { params });
  }

  reviewableProducts() {
    return this.http.get<{ data: PendingReview[] }>('/api/reviews/pending');
  }

  submitReview(payload: {
    store_id: number;
    product_id?: number | null;
    rating: number;
    title?: string | null;
    body?: string | null;
  }) {
    return this.http.post<{ data: Review }>('/api/reviews', payload);
  }

  updateReview(id: number, payload: { rating: number; title?: string | null; body?: string | null }) {
    return this.http.patch<{ data: Review }>(`/api/reviews/${id}`, payload);
  }

  deleteReview(id: number) {
    return this.http.delete<{ data: { deleted: boolean } }>(`/api/reviews/${id}`);
  }

  voteReview(id: number, helpful = true) {
    return this.http.post<{ data: { id: number; helpful_count: number } }>(`/api/reviews/${id}/vote`, { helpful });
  }

  reportReview(id: number, reason: string, note?: string) {
    return this.http.post<{ data: { reported: boolean } }>(`/api/reviews/${id}/report`, { reason, note: note ?? null });
  }

  // ----------- §9 / §20 wishlist

  wishlist() {
    return this.http.get<{ data: WishlistPayload }>('/api/wishlist');
  }

  wishlistIds() {
    return this.http.get<{ data: { product_ids: number[]; store_ids: number[] } }>('/api/wishlist/ids');
  }

  addToWishlist(payload: { product_id: number; variant_id?: number | null; note?: string | null }) {
    return this.http.post<{ data: WishlistItem }>('/api/wishlist', payload);
  }

  removeWishlistItem(id: number) {
    return this.http.delete<{ data: { deleted: boolean } }>(`/api/wishlist/${id}`);
  }

  removeWishlistProduct(productId: number) {
    return this.http.delete<{ data: { deleted: boolean } }>(`/api/wishlist/product/${productId}`);
  }

  wishlistToCart(id: number, qty = 1) {
    return this.http.post<{ data: CartPayload }>(`/api/wishlist/${id}/move-to-cart`, { qty });
  }

  toggleFavouriteStore(storeId: number) {
    return this.http.post<{ data: { saved: boolean } }>('/api/wishlist/stores', { store_id: storeId });
  }

  // ----------- §18 cart coupons & §16 delivery picks

  applyCartCoupon(code: string) {
    return this.http.post<{ data: CartPayload }>('/api/cart/coupon', { code });
  }

  removeCartCoupon() {
    return this.http.delete<{ data: CartPayload }>('/api/cart/coupon');
  }

  priceCart(addressId?: number | null, deliveryChoices: Record<string, number> = {}) {
    return this.http.post<{ data: CartPayload }>('/api/cart/delivery', {
      address_id: addressId ?? null,
      delivery_choices: deliveryChoices,
    });
  }

  // ----------- §12 customer refunds & disputes

  myRefunds(params: Record<string, string> = {}) {
    return this.http.get<{ data: Refund[]; meta: PageMeta }>('/api/refunds', { params });
  }

  requestRefund(payload: {
    seller_order_id: number;
    reason: string;
    type?: string;
    customer_note?: string | null;
    amount?: number | null;
    items?: { order_item_id: number; qty: number }[];
  }) {
    return this.http.post<{ data: Refund }>('/api/refunds', payload);
  }

  cancelRefund(id: number) {
    return this.http.post<{ data: Refund }>(`/api/refunds/${id}/cancel`, {});
  }

  myDisputes(params: Record<string, string> = {}) {
    return this.http.get<{ data: Dispute[]; meta: PageMeta }>('/api/disputes', { params });
  }

  openDispute(payload: {
    seller_order_id: number;
    type: string;
    subject: string;
    description: string;
    amount_claimed?: number | null;
  }) {
    return this.http.post<{ data: Dispute }>('/api/disputes', payload);
  }

  dispute(id: number) {
    return this.http.get<{ data: Dispute }>(`/api/disputes/${id}`);
  }

  replyToDispute(id: number, body: string, isInternal = false) {
    return this.http.post<{ data: Dispute }>(`/api/disputes/${id}/messages`, { body, is_internal: isInternal });
  }

  escalateDispute(id: number, note?: string) {
    return this.http.post<{ data: Dispute }>(`/api/disputes/${id}/escalate`, { note: note ?? null });
  }

  trackShipment(reference: string) {
    return this.http.get<{ data: Shipment }>(`/api/shipments/${reference}`);
  }

  // ----------- §20 notification centre

  notifications(params: Record<string, string> = {}) {
    return this.http.get<{ data: AppNotification[]; summary: NotificationSummary; meta: PageMeta }>(
      '/api/notifications',
      { params },
    );
  }

  notificationSummary(audience?: string) {
    const params: Record<string, string> = audience ? { audience } : {};
    return this.http.get<{ data: NotificationSummary }>('/api/notifications/summary', { params });
  }

  markNotificationRead(id: number) {
    return this.http.post<{ data: AppNotification }>(`/api/notifications/${id}/read`, {});
  }

  markNotificationUnread(id: number) {
    return this.http.post<{ data: AppNotification }>(`/api/notifications/${id}/unread`, {});
  }

  markAllNotificationsRead(audience?: string) {
    return this.http.post<{ data: { updated: number } }>('/api/notifications/read-all', {
      audience: audience ?? null,
    });
  }

  archiveNotification(id: number) {
    return this.http.delete<{ data: { archived: boolean } }>(`/api/notifications/${id}`);
  }

  clearReadNotifications() {
    return this.http.post<{ data: { archived: number } }>('/api/notifications/clear', {});
  }

  notificationPreferences() {
    return this.http.get<{ data: Record<string, boolean> }>('/api/notification-preferences');
  }

  updateNotificationPreferences(payload: Record<string, boolean>) {
    return this.http.put<{ data: Record<string, boolean> }>('/api/notification-preferences', payload);
  }

  // ----------- §17 tenant review inbox

  tenantReviews(params: Record<string, string> = {}) {
    return this.http.get<{ data: Review[]; summary: TenantReviewSummary; meta: PageMeta }>('/api/tenant/reviews', {
      params,
    });
  }

  respondToReview(id: number, body: string) {
    return this.http.post<{ data: Review }>(`/api/tenant/reviews/${id}/respond`, { body });
  }

  flagReview(id: number, reason: string, note?: string) {
    return this.http.post<{ data: { reported: boolean } }>(`/api/tenant/reviews/${id}/report`, {
      reason,
      note: note ?? null,
    });
  }

  // ----------- §18 tenant coupons

  tenantCoupons(params: Record<string, string> = {}) {
    return this.http.get<{ data: Coupon[]; summary: CouponSummary; meta: PageMeta }>('/api/tenant/coupons', {
      params,
    });
  }

  tenantCouponMeta() {
    return this.http.get<{ data: CouponMeta }>('/api/tenant/coupons/meta');
  }

  tenantCoupon(id: number) {
    return this.http.get<{ data: Coupon }>(`/api/tenant/coupons/${id}`);
  }

  createTenantCoupon(payload: Record<string, unknown>) {
    return this.http.post<{ data: Coupon }>('/api/tenant/coupons', payload);
  }

  updateTenantCoupon(id: number, payload: Record<string, unknown>) {
    return this.http.patch<{ data: Coupon }>(`/api/tenant/coupons/${id}`, payload);
  }

  deleteTenantCoupon(id: number) {
    return this.http.delete<{ data: { deleted: boolean } }>(`/api/tenant/coupons/${id}`);
  }

  tenantCouponRedemptions(id: number, params: Record<string, string> = {}) {
    return this.http.get<{ data: CouponRedemption[]; meta: PageMeta }>(
      `/api/tenant/coupons/${id}/redemptions`,
      { params },
    );
  }

  // ----------- §16 tenant delivery & shipments

  deliverySettings() {
    return this.http.get<{ data: DeliverySettings }>('/api/tenant/delivery');
  }

  createDeliveryZone(payload: Record<string, unknown>) {
    return this.http.post<{ data: DeliveryZone }>('/api/tenant/delivery/zones', payload);
  }

  updateDeliveryZone(id: number, payload: Record<string, unknown>) {
    return this.http.patch<{ data: DeliveryZone }>(`/api/tenant/delivery/zones/${id}`, payload);
  }

  deleteDeliveryZone(id: number) {
    return this.http.delete<{ data: { deleted: boolean } }>(`/api/tenant/delivery/zones/${id}`);
  }

  createDeliveryMethod(payload: Record<string, unknown>) {
    return this.http.post<{ data: DeliveryMethod }>('/api/tenant/delivery/methods', payload);
  }

  updateDeliveryMethod(id: number, payload: Record<string, unknown>) {
    return this.http.patch<{ data: DeliveryMethod }>(`/api/tenant/delivery/methods/${id}`, payload);
  }

  deleteDeliveryMethod(id: number) {
    return this.http.delete<{ data: { deleted: boolean } }>(`/api/tenant/delivery/methods/${id}`);
  }

  tenantShipments(params: Record<string, string> = {}) {
    return this.http.get<{ data: Shipment[]; summary: ShipmentSummary; meta: PageMeta }>('/api/tenant/shipments', {
      params,
    });
  }

  tenantShipment(id: number) {
    return this.http.get<{ data: Shipment }>(`/api/tenant/shipments/${id}`);
  }

  updateShipment(id: number, payload: Record<string, unknown>) {
    return this.http.patch<{ data: Shipment }>(`/api/tenant/shipments/${id}`, payload);
  }

  addShipmentEvent(id: number, payload: { status: string; description: string; location?: string | null }) {
    return this.http.post<{ data: Shipment }>(`/api/tenant/shipments/${id}/events`, payload);
  }

  ensureShipmentForOrder(sellerOrderId: number) {
    return this.http.post<{ data: Shipment }>(`/api/tenant/orders/${sellerOrderId}/shipment`, {});
  }

  // ----------- §12 tenant payouts

  tenantPayouts() {
    return this.http.get<{ data: PayoutOverview }>('/api/tenant/payouts');
  }

  tenantSettlements(params: Record<string, string> = {}) {
    return this.http.get<{ data: SettlementRow[]; summary: PayoutOverview['balance']; meta: PageMeta }>(
      '/api/tenant/payouts/settlements',
      { params },
    );
  }

  tenantPayoutBatches(params: Record<string, string> = {}) {
    return this.http.get<{ data: PayoutBatch[]; meta: PageMeta }>('/api/tenant/payouts/batches', { params });
  }

  tenantPayoutBatch(id: number) {
    return this.http.get<{ data: PayoutBatch }>(`/api/tenant/payouts/batches/${id}`);
  }

  requestPayout(payload: { payout_account_id?: number | null; notes?: string | null } = {}) {
    return this.http.post<{ data: PayoutBatch }>('/api/tenant/payouts/request', payload);
  }

  payoutAccounts() {
    return this.http.get<{ data: { accounts: PayoutAccount[]; methods: string[] } }>('/api/tenant/payouts/accounts');
  }

  createPayoutAccount(payload: Record<string, unknown>) {
    return this.http.post<{ data: PayoutAccount }>('/api/tenant/payouts/accounts', payload);
  }

  updatePayoutAccount(id: number, payload: Record<string, unknown>) {
    return this.http.patch<{ data: PayoutAccount }>(`/api/tenant/payouts/accounts/${id}`, payload);
  }

  deletePayoutAccount(id: number) {
    return this.http.delete<{ data: { deleted: boolean } }>(`/api/tenant/payouts/accounts/${id}`);
  }

  // ----------- §12 tenant refunds & disputes

  tenantRefunds(params: Record<string, string> = {}) {
    return this.http.get<{ data: Refund[]; summary: RefundSummary; meta: PageMeta }>('/api/tenant/refunds', {
      params,
    });
  }

  tenantRefund(id: number) {
    return this.http.get<{ data: Refund }>(`/api/tenant/refunds/${id}`);
  }

  approveRefund(id: number, note?: string) {
    return this.http.post<{ data: Refund }>(`/api/tenant/refunds/${id}/approve`, { note: note ?? null });
  }

  rejectRefund(id: number, note: string) {
    return this.http.post<{ data: Refund }>(`/api/tenant/refunds/${id}/reject`, { note });
  }

  issueRefund(payload: {
    seller_order_id: number;
    amount: number;
    reason?: string;
    type?: string;
    customer_note?: string | null;
    restock?: boolean;
  }) {
    return this.http.post<{ data: Refund }>('/api/tenant/refunds/issue', payload);
  }

  refundableOrder(sellerOrderId: number) {
    return this.http.get<{ data: RefundableOrder }>(`/api/tenant/orders/${sellerOrderId}/refundable`);
  }

  tenantDisputes(params: Record<string, string> = {}) {
    return this.http.get<{ data: Dispute[]; summary: DisputeSummary; meta: PageMeta }>('/api/tenant/disputes', {
      params,
    });
  }

  tenantDispute(id: number) {
    return this.http.get<{ data: Dispute }>(`/api/tenant/disputes/${id}`);
  }

  replyToTenantDispute(id: number, body: string, isInternal = false) {
    return this.http.post<{ data: Dispute }>(`/api/tenant/disputes/${id}/messages`, {
      body,
      is_internal: isInternal,
    });
  }

  escalateTenantDispute(id: number, note?: string) {
    return this.http.post<{ data: Dispute }>(`/api/tenant/disputes/${id}/escalate`, { note: note ?? null });
  }

  resolveTenantDispute(id: number, payload: Record<string, unknown>) {
    return this.http.post<{ data: Dispute }>(`/api/tenant/disputes/${id}/resolve`, payload);
  }

  // ----------- §17 admin review moderation

  adminReviews(params: Record<string, string> = {}) {
    return this.http.get<{ data: Review[]; summary: AdminReviewSummary; meta: PageMeta }>('/api/admin/reviews', {
      params,
    });
  }

  adminReview(id: number) {
    return this.http.get<{ data: Review & { reports: ReviewReport[] } }>(`/api/admin/reviews/${id}`);
  }

  moderateReview(id: number, status: string, note?: string) {
    return this.http.post<{ data: Review }>(`/api/admin/reviews/${id}/moderate`, { status, note: note ?? null });
  }

  bulkModerateReviews(ids: number[], status: string, note?: string) {
    return this.http.post<{ data: { updated: number } }>('/api/admin/reviews/bulk', {
      ids,
      status,
      note: note ?? null,
    });
  }

  deleteAdminReview(id: number) {
    return this.http.delete<{ data: { deleted: boolean } }>(`/api/admin/reviews/${id}`);
  }

  adminReviewReports(params: Record<string, string> = {}) {
    return this.http.get<{ data: ReviewReport[]; meta: PageMeta }>('/api/admin/reviews/reports', { params });
  }

  resolveReviewReport(id: number, status: string, note?: string) {
    return this.http.post<{ data: { id: number; status: string } }>(`/api/admin/review-reports/${id}/resolve`, {
      status,
      note: note ?? null,
    });
  }

  adminStoreRatings(limit = 20) {
    return this.http.get<{ data: { id: number; name: string; slug: string; tenant?: string; rating_avg: number; rating_count: number }[] }>(
      '/api/admin/reviews/store-ratings',
      { params: { limit: String(limit) } },
    );
  }

  // ----------- §14 admin commissions

  commissionRules(params: Record<string, string> = {}) {
    return this.http.get<{
      data: CommissionRule[];
      summary: { total: number; active: number; scheduled: number; expired: number; by_scope: Record<string, number> };
      defaults: { platform_rate: string; config_rate: string };
    }>('/api/admin/commissions', { params });
  }

  commissionMeta() {
    return this.http.get<{ data: CommissionMeta }>('/api/admin/commissions/meta');
  }

  commissionEarnings(params: Record<string, string> = {}) {
    return this.http.get<{ data: CommissionEarnings }>('/api/admin/commissions/earnings', { params });
  }

  createCommissionRule(payload: Record<string, unknown>) {
    return this.http.post<{ data: CommissionRule }>('/api/admin/commissions', payload);
  }

  updateCommissionRule(id: number, payload: Record<string, unknown>) {
    return this.http.patch<{ data: CommissionRule }>(`/api/admin/commissions/${id}`, payload);
  }

  deleteCommissionRule(id: number) {
    return this.http.delete<{ data: { deleted: boolean } }>(`/api/admin/commissions/${id}`);
  }

  toggleCommissionRule(id: number) {
    return this.http.post<{ data: CommissionRule }>(`/api/admin/commissions/${id}/toggle`, {});
  }

  simulateCommission(payload: Record<string, unknown>) {
    return this.http.post<{ data: CommissionQuotePreview }>('/api/admin/commissions/simulate', payload);
  }

  // ----------- §12 admin payouts

  adminPayouts() {
    return this.http.get<{ data: AdminPayoutOverview }>('/api/admin/payouts');
  }

  adminPayoutBatches(params: Record<string, string> = {}) {
    return this.http.get<{ data: PayoutBatch[]; summary: AdminPayoutOverview['summary']; meta: PageMeta }>(
      '/api/admin/payouts/batches',
      { params },
    );
  }

  adminPayoutBatch(id: number) {
    return this.http.get<{ data: PayoutBatch }>(`/api/admin/payouts/batches/${id}`);
  }

  createPayoutBatch(payload: Record<string, unknown>) {
    return this.http.post<{ data: PayoutBatch }>('/api/admin/payouts/batches', payload);
  }

  runAllPayouts(onlyMeetingMinimum = true) {
    return this.http.post<{ data: { created: number; batches: PayoutBatch[] } }>(
      '/api/admin/payouts/batches/run-all',
      { only_meeting_minimum: onlyMeetingMinimum },
    );
  }

  recalculatePayoutBatch(id: number) {
    return this.http.post<{ data: PayoutBatch }>(`/api/admin/payouts/batches/${id}/recalculate`, {});
  }

  releasePayoutBatch(id: number, externalRef?: string) {
    return this.http.post<{ data: PayoutBatch }>(`/api/admin/payouts/batches/${id}/release`, {
      external_ref: externalRef ?? null,
    });
  }

  markPayoutBatchPaid(id: number, externalRef?: string) {
    return this.http.post<{ data: PayoutBatch }>(`/api/admin/payouts/batches/${id}/paid`, {
      external_ref: externalRef ?? null,
    });
  }

  markPayoutBatchFailed(id: number, reason: string) {
    return this.http.post<{ data: PayoutBatch }>(`/api/admin/payouts/batches/${id}/failed`, { reason });
  }

  cancelPayoutBatch(id: number) {
    return this.http.post<{ data: PayoutBatch }>(`/api/admin/payouts/batches/${id}/cancel`, {});
  }

  adminSettlements(params: Record<string, string> = {}) {
    return this.http.get<{ data: SettlementRow[]; meta: PageMeta }>('/api/admin/payouts/settlements', { params });
  }

  holdSettlement(id: number, reason: string) {
    return this.http.post<{ data: SettlementRow }>(`/api/admin/payouts/settlements/${id}/hold`, { reason });
  }

  releaseSettlement(id: number) {
    return this.http.post<{ data: SettlementRow }>(`/api/admin/payouts/settlements/${id}/release`, {});
  }

  payoutAdjustments(params: Record<string, string> = {}) {
    return this.http.get<{ data: PayoutAdjustment[]; meta: PageMeta }>('/api/admin/payouts/adjustments', { params });
  }

  createPayoutAdjustment(payload: Record<string, unknown>) {
    return this.http.post<{ data: PayoutAdjustment }>('/api/admin/payouts/adjustments', payload);
  }

  adminPayoutAccounts(params: Record<string, string> = {}) {
    return this.http.get<{ data: PayoutAccount[]; meta: PageMeta }>('/api/admin/payouts/accounts', { params });
  }

  verifyPayoutAccount(id: number, status: string) {
    return this.http.post<{ data: { id: number; status: string } }>(`/api/admin/payouts/accounts/${id}/verify`, {
      status,
    });
  }

  // ----------- §12 / §18 admin disputes & refunds

  adminDisputes(params: Record<string, string> = {}) {
    return this.http.get<{ data: Dispute[]; summary: DisputeSummary; meta: PageMeta }>('/api/admin/disputes', {
      params,
    });
  }

  adminDispute(id: number) {
    return this.http.get<{ data: Dispute }>(`/api/admin/disputes/${id}`);
  }

  replyToAdminDispute(id: number, body: string, isInternal = false) {
    return this.http.post<{ data: Dispute }>(`/api/admin/disputes/${id}/messages`, {
      body,
      is_internal: isInternal,
    });
  }

  assignDispute(id: number, adminId?: number | null) {
    return this.http.post<{ data: Dispute }>(`/api/admin/disputes/${id}/assign`, { admin_id: adminId ?? null });
  }

  escalateAdminDispute(id: number, note?: string) {
    return this.http.post<{ data: Dispute }>(`/api/admin/disputes/${id}/escalate`, { note: note ?? null });
  }

  resolveAdminDispute(id: number, payload: Record<string, unknown>) {
    return this.http.post<{ data: Dispute }>(`/api/admin/disputes/${id}/resolve`, payload);
  }

  overdueDisputes() {
    return this.http.get<{ data: Dispute[] }>('/api/admin/disputes/overdue');
  }

  adminRefunds(params: Record<string, string> = {}) {
    return this.http.get<{ data: Refund[]; summary: RefundSummary; meta: PageMeta }>('/api/admin/refunds', {
      params,
    });
  }

  adminApproveRefund(id: number, note?: string) {
    return this.http.post<{ data: Refund }>(`/api/admin/refunds/${id}/approve`, { note: note ?? null });
  }

  adminRejectRefund(id: number, note: string) {
    return this.http.post<{ data: Refund }>(`/api/admin/refunds/${id}/reject`, { note });
  }

  retryRefund(id: number) {
    return this.http.post<{ data: Refund }>(`/api/admin/refunds/${id}/retry`, {});
  }

  // ----------- §7 admin catalog moderation

  catalogCategories() {
    return this.http.get<{ data: CatalogCategoriesPayload }>('/api/admin/catalog/categories');
  }

  createPlatformCategory(payload: Record<string, unknown>) {
    return this.http.post<{ data: PlatformCategory }>('/api/admin/catalog/categories', payload);
  }

  updatePlatformCategory(id: number, payload: Record<string, unknown>) {
    return this.http.patch<{ data: PlatformCategory }>(`/api/admin/catalog/categories/${id}`, payload);
  }

  deletePlatformCategory(id: number) {
    return this.http.delete<{ data: { deleted: boolean } }>(`/api/admin/catalog/categories/${id}`);
  }

  reorderPlatformCategories(order: { id: number; position: number; parent_id?: number | null }[]) {
    return this.http.post<{ data: { reordered: number } }>('/api/admin/catalog/categories/reorder', { order });
  }

  catalogTenantCategories(params: Record<string, string> = {}) {
    return this.http.get<{ data: TenantCategoryRow[]; meta: PageMeta }>('/api/admin/catalog/tenant-categories', {
      params,
    });
  }

  mapTenantCategories(categoryIds: number[], platformCategoryId: number | null, cascade = true) {
    return this.http.post<{ data: { categories: number; products: number } }>('/api/admin/catalog/map', {
      category_ids: categoryIds,
      platform_category_id: platformCategoryId,
      cascade_products: cascade,
    });
  }

  catalogProducts(params: Record<string, string> = {}) {
    return this.http.get<{ data: ModeratedProduct[]; summary: CatalogProductSummary; meta: PageMeta }>(
      '/api/admin/catalog/products',
      { params },
    );
  }

  moderateProduct(id: number, payload: Record<string, unknown>) {
    return this.http.post<{ data: ModeratedProduct }>(`/api/admin/catalog/products/${id}/moderate`, payload);
  }

  bulkModerateProducts(ids: number[], moderationStatus: string, note?: string) {
    return this.http.post<{ data: { updated: number } }>('/api/admin/catalog/products/bulk', {
      ids,
      moderation_status: moderationStatus,
      note: note ?? null,
    });
  }

  catalogReports(params: Record<string, string> = {}) {
    return this.http.get<{ data: ProductReportRow[]; meta: PageMeta }>('/api/admin/catalog/reports', { params });
  }

  resolveCatalogReport(id: number, status: string, note?: string) {
    return this.http.post<{ data: { id: number; status: string } }>(`/api/admin/catalog/reports/${id}/resolve`, {
      status,
      note: note ?? null,
    });
  }

  // ----------- §18 admin coupons

  adminCoupons(params: Record<string, string> = {}) {
    return this.http.get<{ data: Coupon[]; summary: CouponSummary; meta: PageMeta }>('/api/admin/coupons', {
      params,
    });
  }

  adminCouponOptions() {
    return this.http.get<{
      data: {
        discount_types: string[];
        statuses: string[];
        applies_to: string[];
        tenants: { id: number; name: string }[];
        stores: { id: number; tenant_id: number; name: string }[];
        platform_categories: { id: number; name: string }[];
      };
    }>('/api/admin/coupons/options');
  }

  adminCoupon(id: number) {
    return this.http.get<{ data: Coupon }>(`/api/admin/coupons/${id}`);
  }

  createAdminCoupon(payload: Record<string, unknown>) {
    return this.http.post<{ data: Coupon }>('/api/admin/coupons', payload);
  }

  updateAdminCoupon(id: number, payload: Record<string, unknown>) {
    return this.http.patch<{ data: Coupon }>(`/api/admin/coupons/${id}`, payload);
  }

  deleteAdminCoupon(id: number) {
    return this.http.delete<{ data: { deleted: boolean } }>(`/api/admin/coupons/${id}`);
  }

  toggleAdminCoupon(id: number) {
    return this.http.post<{ data: Coupon }>(`/api/admin/coupons/${id}/toggle`, {});
  }

  adminCouponRedemptions(id: number, params: Record<string, string> = {}) {
    return this.http.get<{ data: CouponRedemption[]; meta: PageMeta }>(`/api/admin/coupons/${id}/redemptions`, {
      params,
    });
  }

  adminBackupDownloadUrl(id: number) {
    return `/api/admin/backups/${id}/download`;
  }
}
