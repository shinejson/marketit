import { injectQuery as __vite__injectQuery } from "/@vite/client";import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/main.js");import {
  PortalService
} from "/chunk-J6266RU7.js";
import {
  AuthService
} from "/chunk-MGG753EG.js";
import "/chunk-WDMUDEB6.js";

// src/main.ts
import { bootstrapApplication } from "/@fs/C:/xampp/htdocs/market/frontend/.angular/cache/22.2.0/frontend/vite/deps/@angular_platform-browser.js?v=97e7284e";

// src/app/app.config.ts
import { provideZoneChangeDetection } from "/@fs/C:/xampp/htdocs/market/frontend/.angular/cache/22.2.0/frontend/vite/deps/@angular_core.js?v=97e7284e";
import { provideRouter } from "/@fs/C:/xampp/htdocs/market/frontend/.angular/cache/22.2.0/frontend/vite/deps/@angular_router.js?v=97e7284e";
import { provideHttpClient, withInterceptors } from "/@fs/C:/xampp/htdocs/market/frontend/.angular/cache/22.2.0/frontend/vite/deps/@angular_common_http.js?v=97e7284e";

// src/app/core/auth.guard.ts
import { inject } from "/@fs/C:/xampp/htdocs/market/frontend/.angular/cache/22.2.0/frontend/vite/deps/@angular_core.js?v=97e7284e";
import { Router } from "/@fs/C:/xampp/htdocs/market/frontend/.angular/cache/22.2.0/frontend/vite/deps/@angular_router.js?v=97e7284e";
var authGuard = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const portal = inject(PortalService);
  if (auth.isLoggedIn()) {
    return true;
  }
  return router.createUrlTree([portal.loginPathForUrl(state.url)]);
};
var roleGuard = (...roles) => {
  return (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const portal = inject(PortalService);
    if (!auth.isLoggedIn()) {
      return router.createUrlTree([portal.loginPathForUrl(state.url)]);
    }
    if (!auth.hasRole(...roles)) {
      return router.createUrlTree([portal.dashboardForRole(auth.role())]);
    }
    return true;
  };
};
var marketingPortalGuard = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const portal = inject(PortalService);
  const requestedPortal = portal.hostPortal();
  if (requestedPortal === "marketplace") {
    return true;
  }
  let target = portal.loginPath(requestedPortal);
  if (requestedPortal === "admin" && auth.hasRole("super_admin")) {
    target = "/admin";
  }
  if (requestedPortal === "tenant" && auth.hasRole("tenant_owner", "store_staff")) {
    target = "/tenant";
  }
  return router.createUrlTree([target]);
};

// src/app/app.routes.ts
var tenantConsoleChildren = [
  { path: "", loadComponent: () => import("/chunk-MKFAJCGT.js").then((m) => m.SellerDashboardComponent) },
  { path: "stores", loadComponent: () => import("/chunk-YKU5ZYMU.js").then((m) => m.SellerStoresComponent) },
  { path: "stores/:id", loadComponent: () => import("/chunk-L6Q6FJDO.js").then((m) => m.StoreEditorComponent) },
  { path: "products", loadComponent: () => import("/chunk-RK4FTMD6.js").then((m) => m.SellerProductsComponent) },
  { path: "orders", loadComponent: () => import("/chunk-FXOCQCJF.js").then((m) => m.SellerOrdersComponent) },
  { path: "inventory", loadComponent: () => import("/chunk-JIFVLLJR.js").then((m) => m.SellerInventoryComponent) },
  { path: "ads", loadComponent: () => import("/chunk-MJXTJRLH.js").then((m) => m.SellerAdsComponent) },
  { path: "domains", loadComponent: () => import("/chunk-T2TQPXJR.js").then((m) => m.SellerDomainsComponent) },
  { path: "api-keys", loadComponent: () => import("/chunk-ZNTPBQ4T.js").then((m) => m.SellerApiKeysComponent) },
  { path: "webhooks", loadComponent: () => import("/chunk-PH54AQUS.js").then((m) => m.SellerWebhooksComponent) },
  { path: "ai", loadComponent: () => import("/chunk-W3ZTRG3C.js").then((m) => m.SellerAiComponent) },
  { path: "analytics", loadComponent: () => import("/chunk-CDB3NAU5.js").then((m) => m.SellerAnalyticsComponent) },
  { path: "departments/finance", loadComponent: () => import("/chunk-ADC67DZX.js").then((m) => m.SellerAccountingComponent), data: { page: "overview" } },
  { path: "accounting", redirectTo: "departments/finance", pathMatch: "full" },
  { path: "accounting/invoices", loadComponent: () => import("/chunk-ADC67DZX.js").then((m) => m.SellerAccountingComponent), data: { page: "invoices" } },
  { path: "accounting/payments", loadComponent: () => import("/chunk-ADC67DZX.js").then((m) => m.SellerAccountingComponent), data: { page: "payments" } },
  { path: "accounting/expenses", loadComponent: () => import("/chunk-ADC67DZX.js").then((m) => m.SellerAccountingComponent), data: { page: "expenses" } },
  { path: "accounting/procurement", loadComponent: () => import("/chunk-ADC67DZX.js").then((m) => m.SellerAccountingComponent), data: { page: "procurement" } },
  { path: "accounting/vendors", loadComponent: () => import("/chunk-ADC67DZX.js").then((m) => m.SellerAccountingComponent), data: { page: "vendors" } },
  { path: "accounting/chart-of-accounts", loadComponent: () => import("/chunk-ADC67DZX.js").then((m) => m.SellerAccountingComponent), data: { page: "accounts" } },
  { path: "accounting/journals", loadComponent: () => import("/chunk-ADC67DZX.js").then((m) => m.SellerAccountingComponent), data: { page: "journals" } },
  { path: "accounting/reports", loadComponent: () => import("/chunk-ADC67DZX.js").then((m) => m.SellerAccountingComponent), data: { page: "reports" } },
  { path: "accounting/reconciliation", loadComponent: () => import("/chunk-ADC67DZX.js").then((m) => m.SellerAccountingComponent), data: { page: "reconciliation" } },
  { path: "departments/sales", loadComponent: () => import("/chunk-PZVZWJIC.js").then((m) => m.SellerSalesComponent), data: { page: "overview" } },
  { path: "sales", redirectTo: "departments/sales", pathMatch: "full" },
  { path: "sales/leads", loadComponent: () => import("/chunk-PZVZWJIC.js").then((m) => m.SellerSalesComponent), data: { page: "leads" } },
  { path: "sales/pipeline", loadComponent: () => import("/chunk-PZVZWJIC.js").then((m) => m.SellerSalesComponent), data: { page: "pipeline" } },
  { path: "sales/quotes", loadComponent: () => import("/chunk-PZVZWJIC.js").then((m) => m.SellerSalesComponent), data: { page: "quotes" } },
  { path: "sales/customers", loadComponent: () => import("/chunk-PZVZWJIC.js").then((m) => m.SellerSalesComponent), data: { page: "customers" } },
  { path: "departments/operations", loadComponent: () => import("/chunk-YYYRSGN5.js").then((m) => m.SellerOperationsComponent), data: { page: "overview" } },
  { path: "operations", redirectTo: "departments/operations", pathMatch: "full" },
  { path: "operations/fulfillment", loadComponent: () => import("/chunk-YYYRSGN5.js").then((m) => m.SellerOperationsComponent), data: { page: "fulfillment" } },
  { path: "operations/inventory", loadComponent: () => import("/chunk-YYYRSGN5.js").then((m) => m.SellerOperationsComponent), data: { page: "inventory" } },
  { path: "operations/catalog", loadComponent: () => import("/chunk-YYYRSGN5.js").then((m) => m.SellerOperationsComponent), data: { page: "catalog" } },
  { path: "departments/marketing", loadComponent: () => import("/chunk-K6XK2SUH.js").then((m) => m.SellerMarketingComponent), data: { page: "overview" } },
  { path: "marketing", redirectTo: "departments/marketing", pathMatch: "full" },
  { path: "marketing/campaigns", loadComponent: () => import("/chunk-K6XK2SUH.js").then((m) => m.SellerMarketingComponent), data: { page: "campaigns" } },
  { path: "marketing/performance", loadComponent: () => import("/chunk-K6XK2SUH.js").then((m) => m.SellerMarketingComponent), data: { page: "performance" } },
  { path: "departments/:dept", loadComponent: () => import("/chunk-XZELXNIH.js").then((m) => m.SellerDepartmentComponent) },
  { path: "users", loadComponent: () => import("/chunk-TLKDXDMI.js").then((m) => m.SellerUsersComponent) },
  { path: "settings", loadComponent: () => import("/chunk-PETYRVY3.js").then((m) => m.SellerSettingsComponent) },
  { path: "backups", loadComponent: () => import("/chunk-GCTODVFI.js").then((m) => m.SellerBackupsComponent) },
  { path: "support", loadComponent: () => import("/chunk-32SS67NS.js").then((m) => m.TenantSupportComponent) }
];
var routes = [
  {
    path: "admin/login",
    loadComponent: () => import("/chunk-SEDG2FHY.js").then((m) => m.ConsoleLoginComponent),
    data: { portal: "admin" }
  },
  {
    path: "tenant/login",
    loadComponent: () => import("/chunk-SEDG2FHY.js").then((m) => m.ConsoleLoginComponent),
    data: { portal: "tenant" }
  },
  { path: "seller/login", redirectTo: "tenant/login" },
  {
    path: "",
    canActivate: [marketingPortalGuard],
    loadComponent: () => import("/chunk-MCEQ4CUF.js").then((m) => m.ShellComponent),
    children: [
      { path: "", loadComponent: () => import("/chunk-4UYTAOJ5.js").then((m) => m.HomeComponent) },
      { path: "products", loadComponent: () => import("/chunk-SQ7E6BUN.js").then((m) => m.CatalogComponent) },
      { path: "products/:slug", loadComponent: () => import("/chunk-UNCENS4G.js").then((m) => m.ProductComponent) },
      { path: "stores", loadComponent: () => import("/chunk-CFDBNJ44.js").then((m) => m.StoresComponent) },
      { path: "stores/:slug", loadComponent: () => import("/chunk-SFDEEV4Z.js").then((m) => m.StoreComponent) },
      { path: "login", loadComponent: () => import("/chunk-YDXYI2Q2.js").then((m) => m.LoginComponent) },
      { path: "register", loadComponent: () => import("/chunk-3DDVVCZ6.js").then((m) => m.RegisterComponent) },
      {
        // OAuth redirect target for customer social login.
        path: "auth/callback/:provider",
        loadComponent: () => import("/chunk-6JEE5I7F.js").then((m) => m.SocialCallbackComponent)
      },
      { path: "cart", canActivate: [authGuard], loadComponent: () => import("/chunk-ETYXLL4K.js").then((m) => m.CartComponent) },
      { path: "checkout", canActivate: [authGuard], loadComponent: () => import("/chunk-4U6IB6MV.js").then((m) => m.CheckoutComponent) },
      { path: "orders", canActivate: [authGuard], loadComponent: () => import("/chunk-UWLSVLRH.js").then((m) => m.OrdersComponent) },
      { path: "orders/:id", canActivate: [authGuard], loadComponent: () => import("/chunk-YXXAT2VU.js").then((m) => m.OrderDetailComponent) },
      { path: "sell", canActivate: [authGuard], loadComponent: () => import("/chunk-EM2E2BUT.js").then((m) => m.SellComponent) }
    ]
  },
  {
    path: "tenant",
    canActivate: [roleGuard("tenant_owner", "store_staff")],
    loadComponent: () => import("/chunk-FT6PNPYW.js").then((m) => m.SellerShellComponent),
    children: tenantConsoleChildren
  },
  {
    path: "seller",
    canActivate: [roleGuard("tenant_owner", "store_staff")],
    loadComponent: () => import("/chunk-FT6PNPYW.js").then((m) => m.SellerShellComponent),
    children: tenantConsoleChildren
  },
  {
    path: "admin",
    canActivate: [roleGuard("super_admin")],
    loadComponent: () => import("/chunk-MQDHCGVF.js").then((m) => m.AdminShellComponent),
    children: [
      { path: "", loadComponent: () => import("/chunk-FK37SCMG.js").then((m) => m.AdminDashboardComponent) },
      { path: "tenants", loadComponent: () => import("/chunk-EL2PSTGJ.js").then((m) => m.AdminTenantsComponent) },
      { path: "users", loadComponent: () => import("/chunk-OFRDXFGS.js").then((m) => m.AdminUsersComponent) },
      { path: "subscriptions", loadComponent: () => import("/chunk-FTOZVIF4.js").then((m) => m.AdminSubscriptionsComponent) },
      { path: "settings", loadComponent: () => import("/chunk-PJCWBPJO.js").then((m) => m.AdminSettingsComponent) },
      { path: "security", loadComponent: () => import("/chunk-ANDN57WL.js").then((m) => m.AdminSecurityComponent) },
      { path: "orders", loadComponent: () => import("/chunk-76AFXTIJ.js").then((m) => m.AdminOrdersComponent) },
      { path: "audit", loadComponent: () => import("/chunk-HIJ3WWJD.js").then((m) => m.AdminAuditComponent) },
      { path: "analytics", loadComponent: () => import("/chunk-XOYR7VCD.js").then((m) => m.AdminAnalyticsComponent) },
      { path: "domains", loadComponent: () => import("/chunk-BYR4XXQU.js").then((m) => m.AdminDomainsComponent) },
      { path: "ads", loadComponent: () => import("/chunk-NXCZFD4P.js").then((m) => m.AdminAdsComponent) },
      {
        path: "support",
        loadComponent: () => import("/chunk-7I2Z42R2.js").then((m) => m.AdminSupportOverviewComponent)
      },
      {
        path: "support/tickets",
        loadComponent: () => import("/chunk-EE65DSPJ.js").then((m) => m.AdminSupportTicketsComponent)
      },
      {
        path: "support/chats",
        loadComponent: () => import("/chunk-XHQAVV3N.js").then((m) => m.AdminSupportChatsComponent)
      },
      {
        path: "support/tasks",
        loadComponent: () => import("/chunk-UXTK6L43.js").then((m) => m.AdminSupportTasksComponent)
      },
      {
        path: "support/guides",
        loadComponent: () => import("/chunk-HK35PKEG.js").then((m) => m.AdminSupportGuidesComponent)
      }
    ]
  },
  { path: "**", redirectTo: "" }
];

// src/app/core/api.interceptor.ts
import { inject as inject2 } from "/@fs/C:/xampp/htdocs/market/frontend/.angular/cache/22.2.0/frontend/vite/deps/@angular_core.js?v=97e7284e";
import { catchError, throwError } from "/@fs/C:/xampp/htdocs/market/frontend/.angular/cache/22.2.0/frontend/vite/deps/rxjs.js?v=97e7284e";
var apiInterceptor = (req, next) => {
  const auth = inject2(AuthService);
  const token = auth.token();
  const headers = { Accept: "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const cloned = req.clone({ setHeaders: headers });
  return next(cloned).pipe(
    catchError((err) => {
      if (err.status === 401 && !req.url.includes("/auth/login") && !req.url.includes("/auth/logout")) {
        auth.logout();
      }
      return throwError(() => err);
    })
  );
};

// src/app/app.config.ts
var appConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([apiInterceptor]))
  ]
};

// src/app/app.component.ts
import { Component } from "/@fs/C:/xampp/htdocs/market/frontend/.angular/cache/22.2.0/frontend/vite/deps/@angular_core.js?v=97e7284e";
import { RouterOutlet } from "/@fs/C:/xampp/htdocs/market/frontend/.angular/cache/22.2.0/frontend/vite/deps/@angular_router.js?v=97e7284e";
import * as i0 from "/@fs/C:/xampp/htdocs/market/frontend/.angular/cache/22.2.0/frontend/vite/deps/@angular_core.js?v=97e7284e";
var AppComponent = class _AppComponent {
  static \u0275fac = function AppComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _AppComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ i0.\u0275\u0275defineComponent({ type: _AppComponent, selectors: [["app-root"]], decls: 1, vars: 0, template: function AppComponent_Template(rf, ctx) {
    if (rf & 1) {
      i0.\u0275\u0275element(0, "router-outlet");
    }
  }, dependencies: [RouterOutlet], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i0.\u0275setClassMetadata(AppComponent, [{
    type: Component,
    args: [{
      selector: "app-root",
      imports: [RouterOutlet],
      template: "<router-outlet />"
    }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i0.\u0275setClassDebugInfo(AppComponent, { className: "AppComponent", filePath: "src/app/app.component.ts", lineNumber: 9 });
})();
(() => {
  const id = "src%2Fapp%2Fapp.component.ts%40AppComponent";
  function AppComponent_HmrLoad(t) {
    import(
      /* @vite-ignore */
      __vite__injectQuery(i0.\u0275\u0275getReplaceMetadataURL(id, t, import.meta.url), 'import')
    ).then((m) => m.default && i0.\u0275\u0275replaceMetadata(AppComponent, m.default, [i0], [RouterOutlet, Component], import.meta, id));
  }
  (typeof ngDevMode === "undefined" || ngDevMode) && AppComponent_HmrLoad(Date.now());
  (typeof ngDevMode === "undefined" || ngDevMode) && (import.meta.hot && import.meta.hot.on("angular:component-update", (d) => d.id === id && AppComponent_HmrLoad(d.timestamp)));
})();

// src/main.ts
bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
//# debugId=c997267f-f65d-5c66-a47e-69d05e23652c


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9tYWluLnRzIiwic3JjL2FwcC9hcHAuY29uZmlnLnRzIiwic3JjL2FwcC9jb3JlL2F1dGguZ3VhcmQudHMiLCJzcmMvYXBwL2FwcC5yb3V0ZXMudHMiLCJzcmMvYXBwL2NvcmUvYXBpLmludGVyY2VwdG9yLnRzIiwic3JjL2FwcC9hcHAuY29tcG9uZW50LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGJvb3RzdHJhcEFwcGxpY2F0aW9uIH0gZnJvbSAnQGFuZ3VsYXIvcGxhdGZvcm0tYnJvd3Nlcic7XG5pbXBvcnQgeyBhcHBDb25maWcgfSBmcm9tICcuL2FwcC9hcHAuY29uZmlnJztcbmltcG9ydCB7IEFwcENvbXBvbmVudCB9IGZyb20gJy4vYXBwL2FwcC5jb21wb25lbnQnO1xuXG5ib290c3RyYXBBcHBsaWNhdGlvbihBcHBDb21wb25lbnQsIGFwcENvbmZpZylcbiAgLmNhdGNoKChlcnIpID0+IGNvbnNvbGUuZXJyb3IoZXJyKSk7XG4iLCJpbXBvcnQgeyBBcHBsaWNhdGlvbkNvbmZpZywgcHJvdmlkZVpvbmVDaGFuZ2VEZXRlY3Rpb24gfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IHByb3ZpZGVSb3V0ZXIgfSBmcm9tICdAYW5ndWxhci9yb3V0ZXInO1xuaW1wb3J0IHsgcHJvdmlkZUh0dHBDbGllbnQsIHdpdGhJbnRlcmNlcHRvcnMgfSBmcm9tICdAYW5ndWxhci9jb21tb24vaHR0cCc7XG5pbXBvcnQgeyByb3V0ZXMgfSBmcm9tICcuL2FwcC5yb3V0ZXMnO1xuaW1wb3J0IHsgYXBpSW50ZXJjZXB0b3IgfSBmcm9tICcuL2NvcmUvYXBpLmludGVyY2VwdG9yJztcblxuZXhwb3J0IGNvbnN0IGFwcENvbmZpZzogQXBwbGljYXRpb25Db25maWcgPSB7XG4gIHByb3ZpZGVyczogW1xuICAgIHByb3ZpZGVab25lQ2hhbmdlRGV0ZWN0aW9uKHsgZXZlbnRDb2FsZXNjaW5nOiB0cnVlIH0pLFxuICAgIHByb3ZpZGVSb3V0ZXIocm91dGVzKSxcbiAgICBwcm92aWRlSHR0cENsaWVudCh3aXRoSW50ZXJjZXB0b3JzKFthcGlJbnRlcmNlcHRvcl0pKSxcbiAgXSxcbn07XG4iLCJpbXBvcnQgeyBpbmplY3QgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcclxuaW1wb3J0IHsgQ2FuQWN0aXZhdGVGbiwgUm91dGVyIH0gZnJvbSAnQGFuZ3VsYXIvcm91dGVyJztcclxuaW1wb3J0IHsgQXV0aFNlcnZpY2UgfSBmcm9tICcuL2F1dGguc2VydmljZSc7XHJcbmltcG9ydCB7IFBvcnRhbFNlcnZpY2UgfSBmcm9tICcuL3BvcnRhbC5zZXJ2aWNlJztcclxuXHJcbmV4cG9ydCBjb25zdCBhdXRoR3VhcmQ6IENhbkFjdGl2YXRlRm4gPSAoX3JvdXRlLCBzdGF0ZSkgPT4ge1xyXG4gIGNvbnN0IGF1dGggPSBpbmplY3QoQXV0aFNlcnZpY2UpO1xyXG4gIGNvbnN0IHJvdXRlciA9IGluamVjdChSb3V0ZXIpO1xyXG4gIGNvbnN0IHBvcnRhbCA9IGluamVjdChQb3J0YWxTZXJ2aWNlKTtcclxuICBpZiAoYXV0aC5pc0xvZ2dlZEluKCkpIHtcclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH1cclxuICByZXR1cm4gcm91dGVyLmNyZWF0ZVVybFRyZWUoW3BvcnRhbC5sb2dpblBhdGhGb3JVcmwoc3RhdGUudXJsKV0pO1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IHJvbGVHdWFyZCA9ICguLi5yb2xlczogc3RyaW5nW10pOiBDYW5BY3RpdmF0ZUZuID0+IHtcclxuICByZXR1cm4gKF9yb3V0ZSwgc3RhdGUpID0+IHtcclxuICAgIGNvbnN0IGF1dGggPSBpbmplY3QoQXV0aFNlcnZpY2UpO1xyXG4gICAgY29uc3Qgcm91dGVyID0gaW5qZWN0KFJvdXRlcik7XHJcbiAgICBjb25zdCBwb3J0YWwgPSBpbmplY3QoUG9ydGFsU2VydmljZSk7XHJcbiAgICBpZiAoIWF1dGguaXNMb2dnZWRJbigpKSB7XHJcbiAgICAgIHJldHVybiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbcG9ydGFsLmxvZ2luUGF0aEZvclVybChzdGF0ZS51cmwpXSk7XHJcbiAgICB9XHJcbiAgICBpZiAoIWF1dGguaGFzUm9sZSguLi5yb2xlcykpIHtcclxuICAgICAgcmV0dXJuIHJvdXRlci5jcmVhdGVVcmxUcmVlKFtwb3J0YWwuZGFzaGJvYXJkRm9yUm9sZShhdXRoLnJvbGUoKSldKTtcclxuICAgIH1cclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH07XHJcbn07XHJcblxyXG4vKiogS2VlcHMgY29uc29sZSBzdWJkb21haW5zIGZyb20gcmVuZGVyaW5nIHRoZSBwdWJsaWMgbWFya2V0cGxhY2Ugc2hlbGwuICovXHJcbmV4cG9ydCBjb25zdCBtYXJrZXRpbmdQb3J0YWxHdWFyZDogQ2FuQWN0aXZhdGVGbiA9IChfcm91dGUsIHN0YXRlKSA9PiB7XHJcbiAgY29uc3QgYXV0aCA9IGluamVjdChBdXRoU2VydmljZSk7XHJcbiAgY29uc3Qgcm91dGVyID0gaW5qZWN0KFJvdXRlcik7XHJcbiAgY29uc3QgcG9ydGFsID0gaW5qZWN0KFBvcnRhbFNlcnZpY2UpO1xyXG4gIGNvbnN0IHJlcXVlc3RlZFBvcnRhbCA9IHBvcnRhbC5ob3N0UG9ydGFsKCk7XHJcblxyXG4gIGlmIChyZXF1ZXN0ZWRQb3J0YWwgPT09ICdtYXJrZXRwbGFjZScpIHtcclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH1cclxuXHJcbiAgbGV0IHRhcmdldCA9IHBvcnRhbC5sb2dpblBhdGgocmVxdWVzdGVkUG9ydGFsKTtcclxuICBpZiAocmVxdWVzdGVkUG9ydGFsID09PSAnYWRtaW4nICYmIGF1dGguaGFzUm9sZSgnc3VwZXJfYWRtaW4nKSkge1xyXG4gICAgdGFyZ2V0ID0gJy9hZG1pbic7XHJcbiAgfVxyXG4gIGlmIChyZXF1ZXN0ZWRQb3J0YWwgPT09ICd0ZW5hbnQnICYmIGF1dGguaGFzUm9sZSgndGVuYW50X293bmVyJywgJ3N0b3JlX3N0YWZmJykpIHtcclxuICAgIHRhcmdldCA9ICcvdGVuYW50JztcclxuICB9XHJcblxyXG4gIHJldHVybiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbdGFyZ2V0XSk7XHJcbn07XHJcbiIsImltcG9ydCB7IFJvdXRlcyB9IGZyb20gJ0Bhbmd1bGFyL3JvdXRlcic7XHJcbmltcG9ydCB7IGF1dGhHdWFyZCwgbWFya2V0aW5nUG9ydGFsR3VhcmQsIHJvbGVHdWFyZCB9IGZyb20gJy4vY29yZS9hdXRoLmd1YXJkJztcclxuXHJcbmNvbnN0IHRlbmFudENvbnNvbGVDaGlsZHJlbjogUm91dGVzID0gW1xyXG4gIHsgcGF0aDogJycsIGxvYWRDb21wb25lbnQ6ICgpID0+IGltcG9ydCgnLi9mZWF0dXJlcy9zZWxsZXIvZGFzaGJvYXJkLmNvbXBvbmVudCcpLnRoZW4oKG0pID0+IG0uU2VsbGVyRGFzaGJvYXJkQ29tcG9uZW50KSB9LFxyXG4gIHsgcGF0aDogJ3N0b3JlcycsIGxvYWRDb21wb25lbnQ6ICgpID0+IGltcG9ydCgnLi9mZWF0dXJlcy9zZWxsZXIvc3RvcmVzLmNvbXBvbmVudCcpLnRoZW4oKG0pID0+IG0uU2VsbGVyU3RvcmVzQ29tcG9uZW50KSB9LFxyXG4gIHsgcGF0aDogJ3N0b3Jlcy86aWQnLCBsb2FkQ29tcG9uZW50OiAoKSA9PiBpbXBvcnQoJy4vZmVhdHVyZXMvc2VsbGVyL3N0b3JlLWVkaXRvci5jb21wb25lbnQnKS50aGVuKChtKSA9PiBtLlN0b3JlRWRpdG9yQ29tcG9uZW50KSB9LFxyXG4gIHsgcGF0aDogJ3Byb2R1Y3RzJywgbG9hZENvbXBvbmVudDogKCkgPT4gaW1wb3J0KCcuL2ZlYXR1cmVzL3NlbGxlci9wcm9kdWN0cy5jb21wb25lbnQnKS50aGVuKChtKSA9PiBtLlNlbGxlclByb2R1Y3RzQ29tcG9uZW50KSB9LFxyXG4gIHsgcGF0aDogJ29yZGVycycsIGxvYWRDb21wb25lbnQ6ICgpID0+IGltcG9ydCgnLi9mZWF0dXJlcy9zZWxsZXIvb3JkZXJzLmNvbXBvbmVudCcpLnRoZW4oKG0pID0+IG0uU2VsbGVyT3JkZXJzQ29tcG9uZW50KSB9LFxyXG4gIHsgcGF0aDogJ2ludmVudG9yeScsIGxvYWRDb21wb25lbnQ6ICgpID0+IGltcG9ydCgnLi9mZWF0dXJlcy9zZWxsZXIvaW52ZW50b3J5LmNvbXBvbmVudCcpLnRoZW4oKG0pID0+IG0uU2VsbGVySW52ZW50b3J5Q29tcG9uZW50KSB9LFxyXG4gIHsgcGF0aDogJ2FkcycsIGxvYWRDb21wb25lbnQ6ICgpID0+IGltcG9ydCgnLi9mZWF0dXJlcy9zZWxsZXIvYWRzLmNvbXBvbmVudCcpLnRoZW4oKG0pID0+IG0uU2VsbGVyQWRzQ29tcG9uZW50KSB9LFxyXG4gIHsgcGF0aDogJ2RvbWFpbnMnLCBsb2FkQ29tcG9uZW50OiAoKSA9PiBpbXBvcnQoJy4vZmVhdHVyZXMvc2VsbGVyL2RvbWFpbnMuY29tcG9uZW50JykudGhlbigobSkgPT4gbS5TZWxsZXJEb21haW5zQ29tcG9uZW50KSB9LFxyXG4gIHsgcGF0aDogJ2FwaS1rZXlzJywgbG9hZENvbXBvbmVudDogKCkgPT4gaW1wb3J0KCcuL2ZlYXR1cmVzL3NlbGxlci9hcGkta2V5cy5jb21wb25lbnQnKS50aGVuKChtKSA9PiBtLlNlbGxlckFwaUtleXNDb21wb25lbnQpIH0sXHJcbiAgeyBwYXRoOiAnd2ViaG9va3MnLCBsb2FkQ29tcG9uZW50OiAoKSA9PiBpbXBvcnQoJy4vZmVhdHVyZXMvc2VsbGVyL3dlYmhvb2tzLmNvbXBvbmVudCcpLnRoZW4oKG0pID0+IG0uU2VsbGVyV2ViaG9va3NDb21wb25lbnQpIH0sXHJcbiAgeyBwYXRoOiAnYWknLCBsb2FkQ29tcG9uZW50OiAoKSA9PiBpbXBvcnQoJy4vZmVhdHVyZXMvc2VsbGVyL2FpLmNvbXBvbmVudCcpLnRoZW4oKG0pID0+IG0uU2VsbGVyQWlDb21wb25lbnQpIH0sXHJcbiAgeyBwYXRoOiAnYW5hbHl0aWNzJywgbG9hZENvbXBvbmVudDogKCkgPT4gaW1wb3J0KCcuL2ZlYXR1cmVzL3NlbGxlci9hbmFseXRpY3MuY29tcG9uZW50JykudGhlbigobSkgPT4gbS5TZWxsZXJBbmFseXRpY3NDb21wb25lbnQpIH0sXHJcbiAgeyBwYXRoOiAnZGVwYXJ0bWVudHMvZmluYW5jZScsIGxvYWRDb21wb25lbnQ6ICgpID0+IGltcG9ydCgnLi9mZWF0dXJlcy9zZWxsZXIvYWNjb3VudGluZy5jb21wb25lbnQnKS50aGVuKChtKSA9PiBtLlNlbGxlckFjY291bnRpbmdDb21wb25lbnQpLCBkYXRhOiB7IHBhZ2U6ICdvdmVydmlldycgfSB9LFxyXG4gIHsgcGF0aDogJ2FjY291bnRpbmcnLCByZWRpcmVjdFRvOiAnZGVwYXJ0bWVudHMvZmluYW5jZScsIHBhdGhNYXRjaDogJ2Z1bGwnIH0sXHJcbiAgeyBwYXRoOiAnYWNjb3VudGluZy9pbnZvaWNlcycsIGxvYWRDb21wb25lbnQ6ICgpID0+IGltcG9ydCgnLi9mZWF0dXJlcy9zZWxsZXIvYWNjb3VudGluZy5jb21wb25lbnQnKS50aGVuKChtKSA9PiBtLlNlbGxlckFjY291bnRpbmdDb21wb25lbnQpLCBkYXRhOiB7IHBhZ2U6ICdpbnZvaWNlcycgfSB9LFxyXG4gIHsgcGF0aDogJ2FjY291bnRpbmcvcGF5bWVudHMnLCBsb2FkQ29tcG9uZW50OiAoKSA9PiBpbXBvcnQoJy4vZmVhdHVyZXMvc2VsbGVyL2FjY291bnRpbmcuY29tcG9uZW50JykudGhlbigobSkgPT4gbS5TZWxsZXJBY2NvdW50aW5nQ29tcG9uZW50KSwgZGF0YTogeyBwYWdlOiAncGF5bWVudHMnIH0gfSxcclxuICB7IHBhdGg6ICdhY2NvdW50aW5nL2V4cGVuc2VzJywgbG9hZENvbXBvbmVudDogKCkgPT4gaW1wb3J0KCcuL2ZlYXR1cmVzL3NlbGxlci9hY2NvdW50aW5nLmNvbXBvbmVudCcpLnRoZW4oKG0pID0+IG0uU2VsbGVyQWNjb3VudGluZ0NvbXBvbmVudCksIGRhdGE6IHsgcGFnZTogJ2V4cGVuc2VzJyB9IH0sXHJcbiAgeyBwYXRoOiAnYWNjb3VudGluZy9wcm9jdXJlbWVudCcsIGxvYWRDb21wb25lbnQ6ICgpID0+IGltcG9ydCgnLi9mZWF0dXJlcy9zZWxsZXIvYWNjb3VudGluZy5jb21wb25lbnQnKS50aGVuKChtKSA9PiBtLlNlbGxlckFjY291bnRpbmdDb21wb25lbnQpLCBkYXRhOiB7IHBhZ2U6ICdwcm9jdXJlbWVudCcgfSB9LFxyXG4gIHsgcGF0aDogJ2FjY291bnRpbmcvdmVuZG9ycycsIGxvYWRDb21wb25lbnQ6ICgpID0+IGltcG9ydCgnLi9mZWF0dXJlcy9zZWxsZXIvYWNjb3VudGluZy5jb21wb25lbnQnKS50aGVuKChtKSA9PiBtLlNlbGxlckFjY291bnRpbmdDb21wb25lbnQpLCBkYXRhOiB7IHBhZ2U6ICd2ZW5kb3JzJyB9IH0sXHJcbiAgeyBwYXRoOiAnYWNjb3VudGluZy9jaGFydC1vZi1hY2NvdW50cycsIGxvYWRDb21wb25lbnQ6ICgpID0+IGltcG9ydCgnLi9mZWF0dXJlcy9zZWxsZXIvYWNjb3VudGluZy5jb21wb25lbnQnKS50aGVuKChtKSA9PiBtLlNlbGxlckFjY291bnRpbmdDb21wb25lbnQpLCBkYXRhOiB7IHBhZ2U6ICdhY2NvdW50cycgfSB9LFxyXG4gIHsgcGF0aDogJ2FjY291bnRpbmcvam91cm5hbHMnLCBsb2FkQ29tcG9uZW50OiAoKSA9PiBpbXBvcnQoJy4vZmVhdHVyZXMvc2VsbGVyL2FjY291bnRpbmcuY29tcG9uZW50JykudGhlbigobSkgPT4gbS5TZWxsZXJBY2NvdW50aW5nQ29tcG9uZW50KSwgZGF0YTogeyBwYWdlOiAnam91cm5hbHMnIH0gfSxcclxuICB7IHBhdGg6ICdhY2NvdW50aW5nL3JlcG9ydHMnLCBsb2FkQ29tcG9uZW50OiAoKSA9PiBpbXBvcnQoJy4vZmVhdHVyZXMvc2VsbGVyL2FjY291bnRpbmcuY29tcG9uZW50JykudGhlbigobSkgPT4gbS5TZWxsZXJBY2NvdW50aW5nQ29tcG9uZW50KSwgZGF0YTogeyBwYWdlOiAncmVwb3J0cycgfSB9LFxyXG4gIHsgcGF0aDogJ2FjY291bnRpbmcvcmVjb25jaWxpYXRpb24nLCBsb2FkQ29tcG9uZW50OiAoKSA9PiBpbXBvcnQoJy4vZmVhdHVyZXMvc2VsbGVyL2FjY291bnRpbmcuY29tcG9uZW50JykudGhlbigobSkgPT4gbS5TZWxsZXJBY2NvdW50aW5nQ29tcG9uZW50KSwgZGF0YTogeyBwYWdlOiAncmVjb25jaWxpYXRpb24nIH0gfSxcclxuICB7IHBhdGg6ICdkZXBhcnRtZW50cy9zYWxlcycsIGxvYWRDb21wb25lbnQ6ICgpID0+IGltcG9ydCgnLi9mZWF0dXJlcy9zZWxsZXIvc2FsZXMuY29tcG9uZW50JykudGhlbigobSkgPT4gbS5TZWxsZXJTYWxlc0NvbXBvbmVudCksIGRhdGE6IHsgcGFnZTogJ292ZXJ2aWV3JyB9IH0sXHJcbiAgeyBwYXRoOiAnc2FsZXMnLCByZWRpcmVjdFRvOiAnZGVwYXJ0bWVudHMvc2FsZXMnLCBwYXRoTWF0Y2g6ICdmdWxsJyB9LFxyXG4gIHsgcGF0aDogJ3NhbGVzL2xlYWRzJywgbG9hZENvbXBvbmVudDogKCkgPT4gaW1wb3J0KCcuL2ZlYXR1cmVzL3NlbGxlci9zYWxlcy5jb21wb25lbnQnKS50aGVuKChtKSA9PiBtLlNlbGxlclNhbGVzQ29tcG9uZW50KSwgZGF0YTogeyBwYWdlOiAnbGVhZHMnIH0gfSxcclxuICB7IHBhdGg6ICdzYWxlcy9waXBlbGluZScsIGxvYWRDb21wb25lbnQ6ICgpID0+IGltcG9ydCgnLi9mZWF0dXJlcy9zZWxsZXIvc2FsZXMuY29tcG9uZW50JykudGhlbigobSkgPT4gbS5TZWxsZXJTYWxlc0NvbXBvbmVudCksIGRhdGE6IHsgcGFnZTogJ3BpcGVsaW5lJyB9IH0sXHJcbiAgeyBwYXRoOiAnc2FsZXMvcXVvdGVzJywgbG9hZENvbXBvbmVudDogKCkgPT4gaW1wb3J0KCcuL2ZlYXR1cmVzL3NlbGxlci9zYWxlcy5jb21wb25lbnQnKS50aGVuKChtKSA9PiBtLlNlbGxlclNhbGVzQ29tcG9uZW50KSwgZGF0YTogeyBwYWdlOiAncXVvdGVzJyB9IH0sXHJcbiAgeyBwYXRoOiAnc2FsZXMvY3VzdG9tZXJzJywgbG9hZENvbXBvbmVudDogKCkgPT4gaW1wb3J0KCcuL2ZlYXR1cmVzL3NlbGxlci9zYWxlcy5jb21wb25lbnQnKS50aGVuKChtKSA9PiBtLlNlbGxlclNhbGVzQ29tcG9uZW50KSwgZGF0YTogeyBwYWdlOiAnY3VzdG9tZXJzJyB9IH0sXHJcbiAgeyBwYXRoOiAnZGVwYXJ0bWVudHMvb3BlcmF0aW9ucycsIGxvYWRDb21wb25lbnQ6ICgpID0+IGltcG9ydCgnLi9mZWF0dXJlcy9zZWxsZXIvb3BlcmF0aW9ucy5jb21wb25lbnQnKS50aGVuKChtKSA9PiBtLlNlbGxlck9wZXJhdGlvbnNDb21wb25lbnQpLCBkYXRhOiB7IHBhZ2U6ICdvdmVydmlldycgfSB9LFxyXG4gIHsgcGF0aDogJ29wZXJhdGlvbnMnLCByZWRpcmVjdFRvOiAnZGVwYXJ0bWVudHMvb3BlcmF0aW9ucycsIHBhdGhNYXRjaDogJ2Z1bGwnIH0sXHJcbiAgeyBwYXRoOiAnb3BlcmF0aW9ucy9mdWxmaWxsbWVudCcsIGxvYWRDb21wb25lbnQ6ICgpID0+IGltcG9ydCgnLi9mZWF0dXJlcy9zZWxsZXIvb3BlcmF0aW9ucy5jb21wb25lbnQnKS50aGVuKChtKSA9PiBtLlNlbGxlck9wZXJhdGlvbnNDb21wb25lbnQpLCBkYXRhOiB7IHBhZ2U6ICdmdWxmaWxsbWVudCcgfSB9LFxyXG4gIHsgcGF0aDogJ29wZXJhdGlvbnMvaW52ZW50b3J5JywgbG9hZENvbXBvbmVudDogKCkgPT4gaW1wb3J0KCcuL2ZlYXR1cmVzL3NlbGxlci9vcGVyYXRpb25zLmNvbXBvbmVudCcpLnRoZW4oKG0pID0+IG0uU2VsbGVyT3BlcmF0aW9uc0NvbXBvbmVudCksIGRhdGE6IHsgcGFnZTogJ2ludmVudG9yeScgfSB9LFxyXG4gIHsgcGF0aDogJ29wZXJhdGlvbnMvY2F0YWxvZycsIGxvYWRDb21wb25lbnQ6ICgpID0+IGltcG9ydCgnLi9mZWF0dXJlcy9zZWxsZXIvb3BlcmF0aW9ucy5jb21wb25lbnQnKS50aGVuKChtKSA9PiBtLlNlbGxlck9wZXJhdGlvbnNDb21wb25lbnQpLCBkYXRhOiB7IHBhZ2U6ICdjYXRhbG9nJyB9IH0sXHJcbiAgeyBwYXRoOiAnZGVwYXJ0bWVudHMvbWFya2V0aW5nJywgbG9hZENvbXBvbmVudDogKCkgPT4gaW1wb3J0KCcuL2ZlYXR1cmVzL3NlbGxlci9tYXJrZXRpbmcuY29tcG9uZW50JykudGhlbigobSkgPT4gbS5TZWxsZXJNYXJrZXRpbmdDb21wb25lbnQpLCBkYXRhOiB7IHBhZ2U6ICdvdmVydmlldycgfSB9LFxyXG4gIHsgcGF0aDogJ21hcmtldGluZycsIHJlZGlyZWN0VG86ICdkZXBhcnRtZW50cy9tYXJrZXRpbmcnLCBwYXRoTWF0Y2g6ICdmdWxsJyB9LFxyXG4gIHsgcGF0aDogJ21hcmtldGluZy9jYW1wYWlnbnMnLCBsb2FkQ29tcG9uZW50OiAoKSA9PiBpbXBvcnQoJy4vZmVhdHVyZXMvc2VsbGVyL21hcmtldGluZy5jb21wb25lbnQnKS50aGVuKChtKSA9PiBtLlNlbGxlck1hcmtldGluZ0NvbXBvbmVudCksIGRhdGE6IHsgcGFnZTogJ2NhbXBhaWducycgfSB9LFxyXG4gIHsgcGF0aDogJ21hcmtldGluZy9wZXJmb3JtYW5jZScsIGxvYWRDb21wb25lbnQ6ICgpID0+IGltcG9ydCgnLi9mZWF0dXJlcy9zZWxsZXIvbWFya2V0aW5nLmNvbXBvbmVudCcpLnRoZW4oKG0pID0+IG0uU2VsbGVyTWFya2V0aW5nQ29tcG9uZW50KSwgZGF0YTogeyBwYWdlOiAncGVyZm9ybWFuY2UnIH0gfSxcclxuICB7IHBhdGg6ICdkZXBhcnRtZW50cy86ZGVwdCcsIGxvYWRDb21wb25lbnQ6ICgpID0+IGltcG9ydCgnLi9mZWF0dXJlcy9zZWxsZXIvZGVwYXJ0bWVudC5jb21wb25lbnQnKS50aGVuKChtKSA9PiBtLlNlbGxlckRlcGFydG1lbnRDb21wb25lbnQpIH0sXHJcbiAgeyBwYXRoOiAndXNlcnMnLCBsb2FkQ29tcG9uZW50OiAoKSA9PiBpbXBvcnQoJy4vZmVhdHVyZXMvc2VsbGVyL3VzZXJzLmNvbXBvbmVudCcpLnRoZW4oKG0pID0+IG0uU2VsbGVyVXNlcnNDb21wb25lbnQpIH0sXHJcbiAgeyBwYXRoOiAnc2V0dGluZ3MnLCBsb2FkQ29tcG9uZW50OiAoKSA9PiBpbXBvcnQoJy4vZmVhdHVyZXMvc2VsbGVyL3NldHRpbmdzLmNvbXBvbmVudCcpLnRoZW4oKG0pID0+IG0uU2VsbGVyU2V0dGluZ3NDb21wb25lbnQpIH0sXHJcbiAgeyBwYXRoOiAnYmFja3VwcycsIGxvYWRDb21wb25lbnQ6ICgpID0+IGltcG9ydCgnLi9mZWF0dXJlcy9zZWxsZXIvYmFja3Vwcy5jb21wb25lbnQnKS50aGVuKChtKSA9PiBtLlNlbGxlckJhY2t1cHNDb21wb25lbnQpIH0sXHJcbiAgeyBwYXRoOiAnc3VwcG9ydCcsIGxvYWRDb21wb25lbnQ6ICgpID0+IGltcG9ydCgnLi9mZWF0dXJlcy9zZWxsZXIvc3VwcG9ydC5jb21wb25lbnQnKS50aGVuKChtKSA9PiBtLlRlbmFudFN1cHBvcnRDb21wb25lbnQpIH0sXHJcbl07XHJcblxyXG5leHBvcnQgY29uc3Qgcm91dGVzOiBSb3V0ZXMgPSBbXHJcbiAge1xyXG4gICAgcGF0aDogJ2FkbWluL2xvZ2luJyxcclxuICAgIGxvYWRDb21wb25lbnQ6ICgpID0+IGltcG9ydCgnLi9mZWF0dXJlcy9hdXRoL2NvbnNvbGUtbG9naW4uY29tcG9uZW50JykudGhlbigobSkgPT4gbS5Db25zb2xlTG9naW5Db21wb25lbnQpLFxyXG4gICAgZGF0YTogeyBwb3J0YWw6ICdhZG1pbicgfSxcclxuICB9LFxyXG4gIHtcclxuICAgIHBhdGg6ICd0ZW5hbnQvbG9naW4nLFxyXG4gICAgbG9hZENvbXBvbmVudDogKCkgPT4gaW1wb3J0KCcuL2ZlYXR1cmVzL2F1dGgvY29uc29sZS1sb2dpbi5jb21wb25lbnQnKS50aGVuKChtKSA9PiBtLkNvbnNvbGVMb2dpbkNvbXBvbmVudCksXHJcbiAgICBkYXRhOiB7IHBvcnRhbDogJ3RlbmFudCcgfSxcclxuICB9LFxyXG4gIHsgcGF0aDogJ3NlbGxlci9sb2dpbicsIHJlZGlyZWN0VG86ICd0ZW5hbnQvbG9naW4nIH0sXHJcbiAge1xyXG4gICAgcGF0aDogJycsXHJcbiAgICBjYW5BY3RpdmF0ZTogW21hcmtldGluZ1BvcnRhbEd1YXJkXSxcclxuICAgIGxvYWRDb21wb25lbnQ6ICgpID0+IGltcG9ydCgnLi9sYXlvdXQvc2hlbGwuY29tcG9uZW50JykudGhlbigobSkgPT4gbS5TaGVsbENvbXBvbmVudCksXHJcbiAgICBjaGlsZHJlbjogW1xyXG4gICAgICB7IHBhdGg6ICcnLCBsb2FkQ29tcG9uZW50OiAoKSA9PiBpbXBvcnQoJy4vZmVhdHVyZXMvbWFya2V0cGxhY2UvaG9tZS5jb21wb25lbnQnKS50aGVuKChtKSA9PiBtLkhvbWVDb21wb25lbnQpIH0sXHJcbiAgICAgIHsgcGF0aDogJ3Byb2R1Y3RzJywgbG9hZENvbXBvbmVudDogKCkgPT4gaW1wb3J0KCcuL2ZlYXR1cmVzL21hcmtldHBsYWNlL2NhdGFsb2cuY29tcG9uZW50JykudGhlbigobSkgPT4gbS5DYXRhbG9nQ29tcG9uZW50KSB9LFxyXG4gICAgICB7IHBhdGg6ICdwcm9kdWN0cy86c2x1ZycsIGxvYWRDb21wb25lbnQ6ICgpID0+IGltcG9ydCgnLi9mZWF0dXJlcy9tYXJrZXRwbGFjZS9wcm9kdWN0LmNvbXBvbmVudCcpLnRoZW4oKG0pID0+IG0uUHJvZHVjdENvbXBvbmVudCkgfSxcclxuICAgICAgeyBwYXRoOiAnc3RvcmVzJywgbG9hZENvbXBvbmVudDogKCkgPT4gaW1wb3J0KCcuL2ZlYXR1cmVzL21hcmtldHBsYWNlL3N0b3Jlcy5jb21wb25lbnQnKS50aGVuKChtKSA9PiBtLlN0b3Jlc0NvbXBvbmVudCkgfSxcclxuICAgICAgeyBwYXRoOiAnc3RvcmVzLzpzbHVnJywgbG9hZENvbXBvbmVudDogKCkgPT4gaW1wb3J0KCcuL2ZlYXR1cmVzL21hcmtldHBsYWNlL3N0b3JlLmNvbXBvbmVudCcpLnRoZW4oKG0pID0+IG0uU3RvcmVDb21wb25lbnQpIH0sXHJcbiAgICAgIHsgcGF0aDogJ2xvZ2luJywgbG9hZENvbXBvbmVudDogKCkgPT4gaW1wb3J0KCcuL2ZlYXR1cmVzL2F1dGgvbG9naW4uY29tcG9uZW50JykudGhlbigobSkgPT4gbS5Mb2dpbkNvbXBvbmVudCkgfSxcclxuICAgICAgeyBwYXRoOiAncmVnaXN0ZXInLCBsb2FkQ29tcG9uZW50OiAoKSA9PiBpbXBvcnQoJy4vZmVhdHVyZXMvYXV0aC9yZWdpc3Rlci5jb21wb25lbnQnKS50aGVuKChtKSA9PiBtLlJlZ2lzdGVyQ29tcG9uZW50KSB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgLy8gT0F1dGggcmVkaXJlY3QgdGFyZ2V0IGZvciBjdXN0b21lciBzb2NpYWwgbG9naW4uXHJcbiAgICAgICAgcGF0aDogJ2F1dGgvY2FsbGJhY2svOnByb3ZpZGVyJyxcclxuICAgICAgICBsb2FkQ29tcG9uZW50OiAoKSA9PiBpbXBvcnQoJy4vZmVhdHVyZXMvYXV0aC9zb2NpYWwtY2FsbGJhY2suY29tcG9uZW50JykudGhlbigobSkgPT4gbS5Tb2NpYWxDYWxsYmFja0NvbXBvbmVudCksXHJcbiAgICAgIH0sXHJcbiAgICAgIHsgcGF0aDogJ2NhcnQnLCBjYW5BY3RpdmF0ZTogW2F1dGhHdWFyZF0sIGxvYWRDb21wb25lbnQ6ICgpID0+IGltcG9ydCgnLi9mZWF0dXJlcy9jdXN0b21lci9jYXJ0LmNvbXBvbmVudCcpLnRoZW4oKG0pID0+IG0uQ2FydENvbXBvbmVudCkgfSxcclxuICAgICAgeyBwYXRoOiAnY2hlY2tvdXQnLCBjYW5BY3RpdmF0ZTogW2F1dGhHdWFyZF0sIGxvYWRDb21wb25lbnQ6ICgpID0+IGltcG9ydCgnLi9mZWF0dXJlcy9jdXN0b21lci9jaGVja291dC5jb21wb25lbnQnKS50aGVuKChtKSA9PiBtLkNoZWNrb3V0Q29tcG9uZW50KSB9LFxyXG4gICAgICB7IHBhdGg6ICdvcmRlcnMnLCBjYW5BY3RpdmF0ZTogW2F1dGhHdWFyZF0sIGxvYWRDb21wb25lbnQ6ICgpID0+IGltcG9ydCgnLi9mZWF0dXJlcy9jdXN0b21lci9vcmRlcnMuY29tcG9uZW50JykudGhlbigobSkgPT4gbS5PcmRlcnNDb21wb25lbnQpIH0sXHJcbiAgICAgIHsgcGF0aDogJ29yZGVycy86aWQnLCBjYW5BY3RpdmF0ZTogW2F1dGhHdWFyZF0sIGxvYWRDb21wb25lbnQ6ICgpID0+IGltcG9ydCgnLi9mZWF0dXJlcy9jdXN0b21lci9vcmRlci1kZXRhaWwuY29tcG9uZW50JykudGhlbigobSkgPT4gbS5PcmRlckRldGFpbENvbXBvbmVudCkgfSxcclxuICAgICAgeyBwYXRoOiAnc2VsbCcsIGNhbkFjdGl2YXRlOiBbYXV0aEd1YXJkXSwgbG9hZENvbXBvbmVudDogKCkgPT4gaW1wb3J0KCcuL2ZlYXR1cmVzL2F1dGgvc2VsbC5jb21wb25lbnQnKS50aGVuKChtKSA9PiBtLlNlbGxDb21wb25lbnQpIH0sXHJcbiAgICBdLFxyXG4gIH0sXHJcbiAge1xyXG4gICAgcGF0aDogJ3RlbmFudCcsXHJcbiAgICBjYW5BY3RpdmF0ZTogW3JvbGVHdWFyZCgndGVuYW50X293bmVyJywgJ3N0b3JlX3N0YWZmJyldLFxyXG4gICAgbG9hZENvbXBvbmVudDogKCkgPT4gaW1wb3J0KCcuL2xheW91dC9zZWxsZXItc2hlbGwuY29tcG9uZW50JykudGhlbigobSkgPT4gbS5TZWxsZXJTaGVsbENvbXBvbmVudCksXHJcbiAgICBjaGlsZHJlbjogdGVuYW50Q29uc29sZUNoaWxkcmVuLFxyXG4gIH0sXHJcbiAge1xyXG4gICAgcGF0aDogJ3NlbGxlcicsXHJcbiAgICBjYW5BY3RpdmF0ZTogW3JvbGVHdWFyZCgndGVuYW50X293bmVyJywgJ3N0b3JlX3N0YWZmJyldLFxyXG4gICAgbG9hZENvbXBvbmVudDogKCkgPT4gaW1wb3J0KCcuL2xheW91dC9zZWxsZXItc2hlbGwuY29tcG9uZW50JykudGhlbigobSkgPT4gbS5TZWxsZXJTaGVsbENvbXBvbmVudCksXHJcbiAgICBjaGlsZHJlbjogdGVuYW50Q29uc29sZUNoaWxkcmVuLFxyXG4gIH0sXHJcbiAge1xyXG4gICAgcGF0aDogJ2FkbWluJyxcclxuICAgIGNhbkFjdGl2YXRlOiBbcm9sZUd1YXJkKCdzdXBlcl9hZG1pbicpXSxcclxuICAgIGxvYWRDb21wb25lbnQ6ICgpID0+IGltcG9ydCgnLi9sYXlvdXQvYWRtaW4tc2hlbGwuY29tcG9uZW50JykudGhlbigobSkgPT4gbS5BZG1pblNoZWxsQ29tcG9uZW50KSxcclxuICAgIGNoaWxkcmVuOiBbXHJcbiAgICAgIHsgcGF0aDogJycsIGxvYWRDb21wb25lbnQ6ICgpID0+IGltcG9ydCgnLi9mZWF0dXJlcy9hZG1pbi9kYXNoYm9hcmQuY29tcG9uZW50JykudGhlbigobSkgPT4gbS5BZG1pbkRhc2hib2FyZENvbXBvbmVudCkgfSxcclxuICAgICAgeyBwYXRoOiAndGVuYW50cycsIGxvYWRDb21wb25lbnQ6ICgpID0+IGltcG9ydCgnLi9mZWF0dXJlcy9hZG1pbi90ZW5hbnRzLmNvbXBvbmVudCcpLnRoZW4oKG0pID0+IG0uQWRtaW5UZW5hbnRzQ29tcG9uZW50KSB9LFxyXG4gICAgICB7IHBhdGg6ICd1c2VycycsIGxvYWRDb21wb25lbnQ6ICgpID0+IGltcG9ydCgnLi9mZWF0dXJlcy9hZG1pbi91c2Vycy5jb21wb25lbnQnKS50aGVuKChtKSA9PiBtLkFkbWluVXNlcnNDb21wb25lbnQpIH0sXHJcbiAgICAgIHsgcGF0aDogJ3N1YnNjcmlwdGlvbnMnLCBsb2FkQ29tcG9uZW50OiAoKSA9PiBpbXBvcnQoJy4vZmVhdHVyZXMvYWRtaW4vc3Vic2NyaXB0aW9ucy5jb21wb25lbnQnKS50aGVuKChtKSA9PiBtLkFkbWluU3Vic2NyaXB0aW9uc0NvbXBvbmVudCkgfSxcclxuICAgICAgeyBwYXRoOiAnc2V0dGluZ3MnLCBsb2FkQ29tcG9uZW50OiAoKSA9PiBpbXBvcnQoJy4vZmVhdHVyZXMvYWRtaW4vc2V0dGluZ3MuY29tcG9uZW50JykudGhlbigobSkgPT4gbS5BZG1pblNldHRpbmdzQ29tcG9uZW50KSB9LFxyXG4gICAgICB7IHBhdGg6ICdzZWN1cml0eScsIGxvYWRDb21wb25lbnQ6ICgpID0+IGltcG9ydCgnLi9mZWF0dXJlcy9hZG1pbi9zZWN1cml0eS5jb21wb25lbnQnKS50aGVuKChtKSA9PiBtLkFkbWluU2VjdXJpdHlDb21wb25lbnQpIH0sXHJcbiAgICAgIHsgcGF0aDogJ29yZGVycycsIGxvYWRDb21wb25lbnQ6ICgpID0+IGltcG9ydCgnLi9mZWF0dXJlcy9hZG1pbi9vcmRlcnMuY29tcG9uZW50JykudGhlbigobSkgPT4gbS5BZG1pbk9yZGVyc0NvbXBvbmVudCkgfSxcclxuICAgICAgeyBwYXRoOiAnYXVkaXQnLCBsb2FkQ29tcG9uZW50OiAoKSA9PiBpbXBvcnQoJy4vZmVhdHVyZXMvYWRtaW4vYXVkaXQuY29tcG9uZW50JykudGhlbigobSkgPT4gbS5BZG1pbkF1ZGl0Q29tcG9uZW50KSB9LFxyXG4gICAgICB7IHBhdGg6ICdhbmFseXRpY3MnLCBsb2FkQ29tcG9uZW50OiAoKSA9PiBpbXBvcnQoJy4vZmVhdHVyZXMvYWRtaW4vYW5hbHl0aWNzLmNvbXBvbmVudCcpLnRoZW4oKG0pID0+IG0uQWRtaW5BbmFseXRpY3NDb21wb25lbnQpIH0sXHJcbiAgICAgIHsgcGF0aDogJ2RvbWFpbnMnLCBsb2FkQ29tcG9uZW50OiAoKSA9PiBpbXBvcnQoJy4vZmVhdHVyZXMvYWRtaW4vZG9tYWlucy5jb21wb25lbnQnKS50aGVuKChtKSA9PiBtLkFkbWluRG9tYWluc0NvbXBvbmVudCkgfSxcclxuICAgICAgeyBwYXRoOiAnYWRzJywgbG9hZENvbXBvbmVudDogKCkgPT4gaW1wb3J0KCcuL2ZlYXR1cmVzL2FkbWluL2Fkcy5jb21wb25lbnQnKS50aGVuKChtKSA9PiBtLkFkbWluQWRzQ29tcG9uZW50KSB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgcGF0aDogJ3N1cHBvcnQnLFxyXG4gICAgICAgIGxvYWRDb21wb25lbnQ6ICgpID0+IGltcG9ydCgnLi9mZWF0dXJlcy9hZG1pbi9zdXBwb3J0LW92ZXJ2aWV3LmNvbXBvbmVudCcpLnRoZW4oKG0pID0+IG0uQWRtaW5TdXBwb3J0T3ZlcnZpZXdDb21wb25lbnQpLFxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgcGF0aDogJ3N1cHBvcnQvdGlja2V0cycsXHJcbiAgICAgICAgbG9hZENvbXBvbmVudDogKCkgPT4gaW1wb3J0KCcuL2ZlYXR1cmVzL2FkbWluL3N1cHBvcnQtdGlja2V0cy5jb21wb25lbnQnKS50aGVuKChtKSA9PiBtLkFkbWluU3VwcG9ydFRpY2tldHNDb21wb25lbnQpLFxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgcGF0aDogJ3N1cHBvcnQvY2hhdHMnLFxyXG4gICAgICAgIGxvYWRDb21wb25lbnQ6ICgpID0+IGltcG9ydCgnLi9mZWF0dXJlcy9hZG1pbi9zdXBwb3J0LWNoYXRzLmNvbXBvbmVudCcpLnRoZW4oKG0pID0+IG0uQWRtaW5TdXBwb3J0Q2hhdHNDb21wb25lbnQpLFxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgcGF0aDogJ3N1cHBvcnQvdGFza3MnLFxyXG4gICAgICAgIGxvYWRDb21wb25lbnQ6ICgpID0+IGltcG9ydCgnLi9mZWF0dXJlcy9hZG1pbi9zdXBwb3J0LXRhc2tzLmNvbXBvbmVudCcpLnRoZW4oKG0pID0+IG0uQWRtaW5TdXBwb3J0VGFza3NDb21wb25lbnQpLFxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgcGF0aDogJ3N1cHBvcnQvZ3VpZGVzJyxcclxuICAgICAgICBsb2FkQ29tcG9uZW50OiAoKSA9PiBpbXBvcnQoJy4vZmVhdHVyZXMvYWRtaW4vc3VwcG9ydC1ndWlkZXMuY29tcG9uZW50JykudGhlbigobSkgPT4gbS5BZG1pblN1cHBvcnRHdWlkZXNDb21wb25lbnQpLFxyXG4gICAgICB9LFxyXG4gICAgXSxcclxuICB9LFxyXG4gIHsgcGF0aDogJyoqJywgcmVkaXJlY3RUbzogJycgfSxcclxuXTtcclxuIiwiaW1wb3J0IHsgSHR0cEVycm9yUmVzcG9uc2UsIEh0dHBJbnRlcmNlcHRvckZuIH0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uL2h0dHAnO1xyXG5pbXBvcnQgeyBpbmplY3QgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcclxuaW1wb3J0IHsgY2F0Y2hFcnJvciwgdGhyb3dFcnJvciB9IGZyb20gJ3J4anMnO1xyXG5pbXBvcnQgeyBBdXRoU2VydmljZSB9IGZyb20gJy4vYXV0aC5zZXJ2aWNlJztcclxuXHJcbmV4cG9ydCBjb25zdCBhcGlJbnRlcmNlcHRvcjogSHR0cEludGVyY2VwdG9yRm4gPSAocmVxLCBuZXh0KSA9PiB7XHJcbiAgY29uc3QgYXV0aCA9IGluamVjdChBdXRoU2VydmljZSk7XHJcbiAgY29uc3QgdG9rZW4gPSBhdXRoLnRva2VuKCk7XHJcbiAgY29uc3QgaGVhZGVyczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHsgQWNjZXB0OiAnYXBwbGljYXRpb24vanNvbicgfTtcclxuICBpZiAodG9rZW4pIHtcclxuICAgIGhlYWRlcnNbJ0F1dGhvcml6YXRpb24nXSA9IGBCZWFyZXIgJHt0b2tlbn1gO1xyXG4gIH1cclxuICBjb25zdCBjbG9uZWQgPSByZXEuY2xvbmUoeyBzZXRIZWFkZXJzOiBoZWFkZXJzIH0pO1xyXG4gIHJldHVybiBuZXh0KGNsb25lZCkucGlwZShcclxuICAgIGNhdGNoRXJyb3IoKGVycjogSHR0cEVycm9yUmVzcG9uc2UpID0+IHtcclxuICAgICAgaWYgKGVyci5zdGF0dXMgPT09IDQwMSAmJiAhcmVxLnVybC5pbmNsdWRlcygnL2F1dGgvbG9naW4nKSAmJiAhcmVxLnVybC5pbmNsdWRlcygnL2F1dGgvbG9nb3V0JykpIHtcclxuICAgICAgICBhdXRoLmxvZ291dCgpO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiB0aHJvd0Vycm9yKCgpID0+IGVycik7XHJcbiAgICB9KSxcclxuICApO1xyXG59O1xyXG4iLCJpbXBvcnQgeyBDb21wb25lbnQgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IFJvdXRlck91dGxldCB9IGZyb20gJ0Bhbmd1bGFyL3JvdXRlcic7XG5cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ2FwcC1yb290JyxcbiAgaW1wb3J0czogW1JvdXRlck91dGxldF0sXG4gIHRlbXBsYXRlOiAnPHJvdXRlci1vdXRsZXQgLz4nLFxufSlcbmV4cG9ydCBjbGFzcyBBcHBDb21wb25lbnQge31cbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUEsU0FBUyw0QkFBNEI7OztBQ0FyQyxTQUE0QixrQ0FBa0M7QUFDOUQsU0FBUyxxQkFBcUI7QUFDOUIsU0FBUyxtQkFBbUIsd0JBQXdCOzs7QUNGcEQsU0FBUyxjQUFjO0FBQ3ZCLFNBQXdCLGNBQWM7QUFJL0IsSUFBTSxZQUEyQixDQUFDLFFBQVEsVUFBVTtBQUN6RCxRQUFNLE9BQU8sT0FBTyxXQUFXO0FBQy9CLFFBQU0sU0FBUyxPQUFPLE1BQU07QUFDNUIsUUFBTSxTQUFTLE9BQU8sYUFBYTtBQUNuQyxNQUFJLEtBQUssV0FBVyxHQUFHO0FBQ3JCLFdBQU87QUFBQSxFQUNUO0FBQ0EsU0FBTyxPQUFPLGNBQWMsQ0FBQyxPQUFPLGdCQUFnQixNQUFNLEdBQUcsQ0FBQyxDQUFDO0FBQ2pFO0FBRU8sSUFBTSxZQUFZLElBQUksVUFBbUM7QUFDOUQsU0FBTyxDQUFDLFFBQVEsVUFBVTtBQUN4QixVQUFNLE9BQU8sT0FBTyxXQUFXO0FBQy9CLFVBQU0sU0FBUyxPQUFPLE1BQU07QUFDNUIsVUFBTSxTQUFTLE9BQU8sYUFBYTtBQUNuQyxRQUFJLENBQUMsS0FBSyxXQUFXLEdBQUc7QUFDdEIsYUFBTyxPQUFPLGNBQWMsQ0FBQyxPQUFPLGdCQUFnQixNQUFNLEdBQUcsQ0FBQyxDQUFDO0FBQUEsSUFDakU7QUFDQSxRQUFJLENBQUMsS0FBSyxRQUFRLEdBQUcsS0FBSyxHQUFHO0FBQzNCLGFBQU8sT0FBTyxjQUFjLENBQUMsT0FBTyxpQkFBaUIsS0FBSyxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBQUEsSUFDcEU7QUFDQSxXQUFPO0FBQUEsRUFDVDtBQUNGO0FBR08sSUFBTSx1QkFBc0MsQ0FBQyxRQUFRLFVBQVU7QUFDcEUsUUFBTSxPQUFPLE9BQU8sV0FBVztBQUMvQixRQUFNLFNBQVMsT0FBTyxNQUFN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O01BQ1YsU0FBUyxDQUFDLFlBQVk7TUFDdEIsVUFBVTtLQUNYOzs7O2dGQUNZLGNBQVksRUFBQSxXQUFBLGdCQUFBLFVBQUEsNEJBQUEsWUFBQSxFQUFBLENBQUE7QUFBQSxHQUFBOzs7Ozs7OzhEQUFaLGNBQVksRUFBQSxTQUFBLENBQUEsRUFBQSxHQUFBLENBQUEsY0FBQSxTQUFBLEdBQUEsYUFBQSxFQUFBLENBQUE7RUFBQTtBQUFBLEdBQUEsT0FBQSxjQUFBLGVBQUEsY0FBQSxxQkFBQSxLQUFBLElBQUEsQ0FBQTtBQUFBLEdBQUEsT0FBQSxjQUFBLGVBQUEsZUFBQSxZQUFBLE9BQUEsWUFBQSxJQUFBLEdBQUEsNEJBQUEsQ0FBQSxNQUFBLEVBQUEsT0FBQSxNQUFBLHFCQUFBLEVBQUEsU0FBQSxDQUFBO0FBQUEsR0FBQTs7O0FMSnpCLHFCQUFxQixjQUFjLFNBQVMsRUFDekMsTUFBTSxDQUFDLFFBQVEsUUFBUSxNQUFNLEdBQUcsQ0FBQzsiLCJuYW1lcyI6WyJpbmplY3QiLCJpbmplY3QiXSwiZGVidWdJZCI6ImM5OTcyNjdmLWY2NWQtNWM2Ni1hNDdlLTY5ZDA1ZTIzNjUyYyJ9