import { injectQuery as __vite__injectQuery } from "/@vite/client";import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/chunk-FT6PNPYW.js");import {
  ThemeService
} from "/chunk-55WVZTZD.js";
import {
  AuthService
} from "/chunk-MGG753EG.js";
import {
  __spreadProps,
  __spreadValues
} from "/chunk-WDMUDEB6.js";

// src/app/layout/seller-shell.component.ts
import { Component, HostListener, computed, effect, inject, signal } from "/@fs/C:/xampp/htdocs/market/frontend/.angular/cache/22.2.0/frontend/vite/deps/@angular_core.js?v=97e7284e";
import { NgTemplateOutlet } from "/@fs/C:/xampp/htdocs/market/frontend/.angular/cache/22.2.0/frontend/vite/deps/@angular_common.js?v=97e7284e";
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from "/@fs/C:/xampp/htdocs/market/frontend/.angular/cache/22.2.0/frontend/vite/deps/@angular_router.js?v=97e7284e";
import * as i0 from "/@fs/C:/xampp/htdocs/market/frontend/.angular/cache/22.2.0/frontend/vite/deps/@angular_core.js?v=97e7284e";
var _c0 = () => ({ exact: true });
var _c1 = () => ({ $implicit: "home" });
var _c2 = () => ({ $implicit: "store" });
var _c3 = () => ({ $implicit: "chevron" });
var _c4 = () => ({ $implicit: "lifebuoy" });
var _c5 = () => ({ $implicit: "logout" });
var _c6 = () => ({ $implicit: "menu" });
var _c7 = () => ({ $implicit: "search" });
var _c8 = () => ({ $implicit: "bell" });
var _c9 = (a0) => ({ $implicit: a0 });
var _c10 = () => ({ $implicit: "finance" });
var _c11 = () => ({ $implicit: "sales" });
var _c12 = () => ({ $implicit: "operations" });
var _c13 = () => ({ $implicit: "marketing" });
var _c14 = () => ({ $implicit: "settings" });
var _forTrack0 = ($index, $item) => $item.key;
var _forTrack1 = ($index, $item) => $item.path;
var _forTrack2 = ($index, $item) => $item.id;
function SellerShellComponent_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = i0.\u0275\u0275getCurrentView();
    i0.\u0275\u0275elementStart(0, "div", 39);
    i0.\u0275\u0275listener("click", function SellerShellComponent_Conditional_1_Template_div_click_0_listener() {
      i0.\u0275\u0275restoreView(_r1);
      const ctx_r1 = i0.\u0275\u0275nextContext();
      return i0.\u0275\u0275resetView(ctx_r1.collapsed.set(true));
    });
    i0.\u0275\u0275elementEnd();
  }
}
function SellerShellComponent_Conditional_16_For_13_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = i0.\u0275\u0275getCurrentView();
    i0.\u0275\u0275elementStart(0, "a", 9);
    i0.\u0275\u0275listener("click", function SellerShellComponent_Conditional_16_For_13_Template_a_click_0_listener() {
      i0.\u0275\u0275restoreView(_r4);
      const ctx_r1 = i0.\u0275\u0275nextContext(2);
      return i0.\u0275\u0275resetView(ctx_r1.onNavigate());
    });
    i0.\u0275\u0275element(1, "i", 43);
    i0.\u0275\u0275elementStart(2, "span");
    i0.\u0275\u0275text(3);
    i0.\u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const item_r5 = ctx.$implicit;
    const ctx_r1 = i0.\u0275\u0275nextContext(2);
    i0.\u0275\u0275property("routerLink", ctx_r1.tenantLink(item_r5.key))("routerLinkActiveOptions", i0.\u0275\u0275pureFunction0(6, _c0))("title", ctx_r1.collapsed() ? item_r5.label : "");
    i0.\u0275\u0275advance();
    i0.\u0275\u0275classMap(item_r5.faIcon || "");
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275textInterpolate(item_r5.label);
  }
}
function SellerShellComponent_Conditional_16_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = i0.\u0275\u0275getCurrentView();
    i0.\u0275\u0275elementStart(0, "p", 11);
    i0.\u0275\u0275text(1, "Accounting");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275elementStart(2, "div", 12)(3, "button", 40);
    i0.\u0275\u0275listener("click", function SellerShellComponent_Conditional_16_Template_button_click_3_listener() {
      i0.\u0275\u0275restoreView(_r3);
      const ctx_r1 = i0.\u0275\u0275nextContext();
      return i0.\u0275\u0275resetView(ctx_r1.toggleAccounting());
    });
    i0.\u0275\u0275elementStart(4, "span", 14);
    i0.\u0275\u0275elementContainer(5, 10);
    i0.\u0275\u0275elementStart(6, "span", 7);
    i0.\u0275\u0275text(7, "Finance & accounts");
    i0.\u0275\u0275elementEnd()();
    i0.\u0275\u0275elementContainer(8, 10);
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275elementStart(9, "div", 41)(10, "div", 16);
    i0.\u0275\u0275text(11, "Finance & accounts");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275repeaterCreate(12, SellerShellComponent_Conditional_16_For_13_Template, 4, 7, "a", 42, _forTrack0);
    i0.\u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = i0.\u0275\u0275nextContext();
    const navIcon_r6 = i0.\u0275\u0275reference(75);
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275classProp("open", ctx_r1.accountingOpen());
    i0.\u0275\u0275advance();
    i0.\u0275\u0275classProp("open", ctx_r1.accountingOpen());
    i0.\u0275\u0275property("title", ctx_r1.collapsed() ? "Finance & accounts" : "");
    i0.\u0275\u0275attribute("aria-expanded", ctx_r1.accountingOpen());
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275property("ngTemplateOutlet", navIcon_r6)("ngTemplateOutletContext", i0.\u0275\u0275pureFunction0(12, _c10));
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275property("ngTemplateOutlet", navIcon_r6)("ngTemplateOutletContext", i0.\u0275\u0275pureFunction0(13, _c3));
    i0.\u0275\u0275advance();
    i0.\u0275\u0275classProp("open", ctx_r1.accountingOpen());
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275repeater(ctx_r1.accountingItems);
  }
}
function SellerShellComponent_Conditional_17_For_13_Template(rf, ctx) {
  if (rf & 1) {
    const _r8 = i0.\u0275\u0275getCurrentView();
    i0.\u0275\u0275elementStart(0, "a", 9);
    i0.\u0275\u0275listener("click", function SellerShellComponent_Conditional_17_For_13_Template_a_click_0_listener() {
      i0.\u0275\u0275restoreView(_r8);
      const ctx_r1 = i0.\u0275\u0275nextContext(2);
      return i0.\u0275\u0275resetView(ctx_r1.onNavigate());
    });
    i0.\u0275\u0275element(1, "i", 43);
    i0.\u0275\u0275elementStart(2, "span");
    i0.\u0275\u0275text(3);
    i0.\u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const item_r9 = ctx.$implicit;
    const ctx_r1 = i0.\u0275\u0275nextContext(2);
    i0.\u0275\u0275property("routerLink", ctx_r1.tenantLink(item_r9.key))("routerLinkActiveOptions", i0.\u0275\u0275pureFunction0(6, _c0))("title", ctx_r1.collapsed() ? item_r9.label : "");
    i0.\u0275\u0275advance();
    i0.\u0275\u0275classMap(item_r9.faIcon || "");
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275textInterpolate(item_r9.label);
  }
}
function SellerShellComponent_Conditional_17_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = i0.\u0275\u0275getCurrentView();
    i0.\u0275\u0275elementStart(0, "p", 11);
    i0.\u0275\u0275text(1, "Sales");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275elementStart(2, "div", 12)(3, "button", 44);
    i0.\u0275\u0275listener("click", function SellerShellComponent_Conditional_17_Template_button_click_3_listener() {
      i0.\u0275\u0275restoreView(_r7);
      const ctx_r1 = i0.\u0275\u0275nextContext();
      return i0.\u0275\u0275resetView(ctx_r1.toggleSales());
    });
    i0.\u0275\u0275elementStart(4, "span", 14);
    i0.\u0275\u0275elementContainer(5, 10);
    i0.\u0275\u0275elementStart(6, "span", 7);
    i0.\u0275\u0275text(7, "Sales workspace");
    i0.\u0275\u0275elementEnd()();
    i0.\u0275\u0275elementContainer(8, 10);
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275elementStart(9, "div", 41)(10, "div", 16);
    i0.\u0275\u0275text(11, "Sales workspace");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275repeaterCreate(12, SellerShellComponent_Conditional_17_For_13_Template, 4, 7, "a", 42, _forTrack0);
    i0.\u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = i0.\u0275\u0275nextContext();
    const navIcon_r6 = i0.\u0275\u0275reference(75);
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275classProp("open", ctx_r1.salesOpen());
    i0.\u0275\u0275advance();
    i0.\u0275\u0275classProp("open", ctx_r1.salesOpen());
    i0.\u0275\u0275property("title", ctx_r1.collapsed() ? "Sales workspace" : "");
    i0.\u0275\u0275attribute("aria-expanded", ctx_r1.salesOpen());
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275property("ngTemplateOutlet", navIcon_r6)("ngTemplateOutletContext", i0.\u0275\u0275pureFunction0(12, _c11));
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275property("ngTemplateOutlet", navIcon_r6)("ngTemplateOutletContext", i0.\u0275\u0275pureFunction0(13, _c3));
    i0.\u0275\u0275advance();
    i0.\u0275\u0275classProp("open", ctx_r1.salesOpen());
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275repeater(ctx_r1.salesItems);
  }
}
function SellerShellComponent_Conditional_18_For_13_Template(rf, ctx) {
  if (rf & 1) {
    const _r11 = i0.\u0275\u0275getCurrentView();
    i0.\u0275\u0275elementStart(0, "a", 9);
    i0.\u0275\u0275listener("click", function SellerShellComponent_Conditional_18_For_13_Template_a_click_0_listener() {
      i0.\u0275\u0275restoreView(_r11);
      const ctx_r1 = i0.\u0275\u0275nextContext(2);
      return i0.\u0275\u0275resetView(ctx_r1.onNavigate());
    });
    i0.\u0275\u0275element(1, "i", 43);
    i0.\u0275\u0275elementStart(2, "span");
    i0.\u0275\u0275text(3);
    i0.\u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const item_r12 = ctx.$implicit;
    const ctx_r1 = i0.\u0275\u0275nextContext(2);
    i0.\u0275\u0275property("routerLink", ctx_r1.tenantLink(item_r12.key))("routerLinkActiveOptions", i0.\u0275\u0275pureFunction0(6, _c0))("title", ctx_r1.collapsed() ? item_r12.label : "");
    i0.\u0275\u0275advance();
    i0.\u0275\u0275classMap(item_r12.faIcon || "");
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275textInterpolate(item_r12.label);
  }
}
function SellerShellComponent_Conditional_18_Template(rf, ctx) {
  if (rf & 1) {
    const _r10 = i0.\u0275\u0275getCurrentView();
    i0.\u0275\u0275elementStart(0, "p", 11);
    i0.\u0275\u0275text(1, "Operations");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275elementStart(2, "div", 12)(3, "button", 45);
    i0.\u0275\u0275listener("click", function SellerShellComponent_Conditional_18_Template_button_click_3_listener() {
      i0.\u0275\u0275restoreView(_r10);
      const ctx_r1 = i0.\u0275\u0275nextContext();
      return i0.\u0275\u0275resetView(ctx_r1.toggleOperations());
    });
    i0.\u0275\u0275elementStart(4, "span", 14);
    i0.\u0275\u0275elementContainer(5, 10);
    i0.\u0275\u0275elementStart(6, "span", 7);
    i0.\u0275\u0275text(7, "Operations");
    i0.\u0275\u0275elementEnd()();
    i0.\u0275\u0275elementContainer(8, 10);
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275elementStart(9, "div", 41)(10, "div", 16);
    i0.\u0275\u0275text(11, "Operations");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275repeaterCreate(12, SellerShellComponent_Conditional_18_For_13_Template, 4, 7, "a", 42, _forTrack0);
    i0.\u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = i0.\u0275\u0275nextContext();
    const navIcon_r6 = i0.\u0275\u0275reference(75);
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275classProp("open", ctx_r1.operationsOpen());
    i0.\u0275\u0275advance();
    i0.\u0275\u0275classProp("open", ctx_r1.operationsOpen());
    i0.\u0275\u0275property("title", ctx_r1.collapsed() ? "Operations" : "");
    i0.\u0275\u0275attribute("aria-expanded", ctx_r1.operationsOpen());
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275property("ngTemplateOutlet", navIcon_r6)("ngTemplateOutletContext", i0.\u0275\u0275pureFunction0(12, _c12));
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275property("ngTemplateOutlet", navIcon_r6)("ngTemplateOutletContext", i0.\u0275\u0275pureFunction0(13, _c3));
    i0.\u0275\u0275advance();
    i0.\u0275\u0275classProp("open", ctx_r1.operationsOpen());
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275repeater(ctx_r1.operationsItems);
  }
}
function SellerShellComponent_Conditional_19_For_13_Template(rf, ctx) {
  if (rf & 1) {
    const _r14 = i0.\u0275\u0275getCurrentView();
    i0.\u0275\u0275elementStart(0, "a", 9);
    i0.\u0275\u0275listener("click", function SellerShellComponent_Conditional_19_For_13_Template_a_click_0_listener() {
      i0.\u0275\u0275restoreView(_r14);
      const ctx_r1 = i0.\u0275\u0275nextContext(2);
      return i0.\u0275\u0275resetView(ctx_r1.onNavigate());
    });
    i0.\u0275\u0275element(1, "i", 43);
    i0.\u0275\u0275elementStart(2, "span");
    i0.\u0275\u0275text(3);
    i0.\u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const item_r15 = ctx.$implicit;
    const ctx_r1 = i0.\u0275\u0275nextContext(2);
    i0.\u0275\u0275property("routerLink", ctx_r1.tenantLink(item_r15.key))("routerLinkActiveOptions", i0.\u0275\u0275pureFunction0(6, _c0))("title", ctx_r1.collapsed() ? item_r15.label : "");
    i0.\u0275\u0275advance();
    i0.\u0275\u0275classMap(item_r15.faIcon || "");
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275textInterpolate(item_r15.label);
  }
}
function SellerShellComponent_Conditional_19_Template(rf, ctx) {
  if (rf & 1) {
    const _r13 = i0.\u0275\u0275getCurrentView();
    i0.\u0275\u0275elementStart(0, "p", 11);
    i0.\u0275\u0275text(1, "Marketing");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275elementStart(2, "div", 12)(3, "button", 46);
    i0.\u0275\u0275listener("click", function SellerShellComponent_Conditional_19_Template_button_click_3_listener() {
      i0.\u0275\u0275restoreView(_r13);
      const ctx_r1 = i0.\u0275\u0275nextContext();
      return i0.\u0275\u0275resetView(ctx_r1.toggleMarketing());
    });
    i0.\u0275\u0275elementStart(4, "span", 14);
    i0.\u0275\u0275elementContainer(5, 10);
    i0.\u0275\u0275elementStart(6, "span", 7);
    i0.\u0275\u0275text(7, "Marketing");
    i0.\u0275\u0275elementEnd()();
    i0.\u0275\u0275elementContainer(8, 10);
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275elementStart(9, "div", 41)(10, "div", 16);
    i0.\u0275\u0275text(11, "Marketing");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275repeaterCreate(12, SellerShellComponent_Conditional_19_For_13_Template, 4, 7, "a", 42, _forTrack0);
    i0.\u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = i0.\u0275\u0275nextContext();
    const navIcon_r6 = i0.\u0275\u0275reference(75);
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275classProp("open", ctx_r1.marketingOpen());
    i0.\u0275\u0275advance();
    i0.\u0275\u0275classProp("open", ctx_r1.marketingOpen());
    i0.\u0275\u0275property("title", ctx_r1.collapsed() ? "Marketing" : "");
    i0.\u0275\u0275attribute("aria-expanded", ctx_r1.marketingOpen());
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275property("ngTemplateOutlet", navIcon_r6)("ngTemplateOutletContext", i0.\u0275\u0275pureFunction0(12, _c13));
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275property("ngTemplateOutlet", navIcon_r6)("ngTemplateOutletContext", i0.\u0275\u0275pureFunction0(13, _c3));
    i0.\u0275\u0275advance();
    i0.\u0275\u0275classProp("open", ctx_r1.marketingOpen());
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275repeater(ctx_r1.marketingItems);
  }
}
function SellerShellComponent_For_33_Template(rf, ctx) {
  if (rf & 1) {
    const _r16 = i0.\u0275\u0275getCurrentView();
    i0.\u0275\u0275elementStart(0, "a", 18);
    i0.\u0275\u0275listener("click", function SellerShellComponent_For_33_Template_a_click_0_listener() {
      i0.\u0275\u0275restoreView(_r16);
      const ctx_r1 = i0.\u0275\u0275nextContext();
      return i0.\u0275\u0275resetView(ctx_r1.onNavigate());
    });
    i0.\u0275\u0275elementContainer(1, 10);
    i0.\u0275\u0275elementStart(2, "span");
    i0.\u0275\u0275text(3);
    i0.\u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const c_r17 = ctx.$implicit;
    const ctx_r1 = i0.\u0275\u0275nextContext();
    const navIcon_r6 = i0.\u0275\u0275reference(75);
    i0.\u0275\u0275property("routerLink", ctx_r1.tenantLink(c_r17.key))("title", ctx_r1.collapsed() ? c_r17.label : "");
    i0.\u0275\u0275advance();
    i0.\u0275\u0275property("ngTemplateOutlet", navIcon_r6)("ngTemplateOutletContext", i0.\u0275\u0275pureFunction1(5, _c9, c_r17.icon));
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275textInterpolate(c_r17.label);
  }
}
function SellerShellComponent_Conditional_34_For_13_Template(rf, ctx) {
  if (rf & 1) {
    const _r19 = i0.\u0275\u0275getCurrentView();
    i0.\u0275\u0275elementStart(0, "a", 18);
    i0.\u0275\u0275listener("click", function SellerShellComponent_Conditional_34_For_13_Template_a_click_0_listener() {
      i0.\u0275\u0275restoreView(_r19);
      const ctx_r1 = i0.\u0275\u0275nextContext(2);
      return i0.\u0275\u0275resetView(ctx_r1.onNavigate());
    });
    i0.\u0275\u0275elementContainer(1, 10);
    i0.\u0275\u0275elementStart(2, "span");
    i0.\u0275\u0275text(3);
    i0.\u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const a_r20 = ctx.$implicit;
    const ctx_r1 = i0.\u0275\u0275nextContext(2);
    const navIcon_r6 = i0.\u0275\u0275reference(75);
    i0.\u0275\u0275property("routerLink", ctx_r1.tenantLink(a_r20.key))("title", ctx_r1.collapsed() ? a_r20.label : "");
    i0.\u0275\u0275advance();
    i0.\u0275\u0275property("ngTemplateOutlet", navIcon_r6)("ngTemplateOutletContext", i0.\u0275\u0275pureFunction1(5, _c9, a_r20.icon));
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275textInterpolate(a_r20.label);
  }
}
function SellerShellComponent_Conditional_34_Template(rf, ctx) {
  if (rf & 1) {
    const _r18 = i0.\u0275\u0275getCurrentView();
    i0.\u0275\u0275elementStart(0, "p", 11);
    i0.\u0275\u0275text(1, "Admin");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275elementStart(2, "div", 47)(3, "button", 48);
    i0.\u0275\u0275listener("click", function SellerShellComponent_Conditional_34_Template_button_click_3_listener() {
      i0.\u0275\u0275restoreView(_r18);
      const ctx_r1 = i0.\u0275\u0275nextContext();
      return i0.\u0275\u0275resetView(ctx_r1.toggleAdmin());
    });
    i0.\u0275\u0275elementStart(4, "span", 14);
    i0.\u0275\u0275elementContainer(5, 10);
    i0.\u0275\u0275elementStart(6, "span", 7);
    i0.\u0275\u0275text(7, "Admin");
    i0.\u0275\u0275elementEnd()();
    i0.\u0275\u0275elementContainer(8, 10);
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275elementStart(9, "div", 15)(10, "div", 16);
    i0.\u0275\u0275text(11, "Admin");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275repeaterCreate(12, SellerShellComponent_Conditional_34_For_13_Template, 4, 7, "a", 17, _forTrack0);
    i0.\u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = i0.\u0275\u0275nextContext();
    const navIcon_r6 = i0.\u0275\u0275reference(75);
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275classProp("open", ctx_r1.adminOpen());
    i0.\u0275\u0275advance();
    i0.\u0275\u0275classProp("open", ctx_r1.adminOpen());
    i0.\u0275\u0275property("title", ctx_r1.collapsed() ? "Admin" : "");
    i0.\u0275\u0275attribute("aria-expanded", ctx_r1.adminOpen());
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275property("ngTemplateOutlet", navIcon_r6)("ngTemplateOutletContext", i0.\u0275\u0275pureFunction0(12, _c14));
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275property("ngTemplateOutlet", navIcon_r6)("ngTemplateOutletContext", i0.\u0275\u0275pureFunction0(13, _c3));
    i0.\u0275\u0275advance();
    i0.\u0275\u0275classProp("open", ctx_r1.adminOpen());
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275repeater(ctx_r1.adminItems);
  }
}
function SellerShellComponent_Conditional_52_Conditional_1_For_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r21 = i0.\u0275\u0275getCurrentView();
    i0.\u0275\u0275elementStart(0, "a", 51);
    i0.\u0275\u0275listener("click", function SellerShellComponent_Conditional_52_Conditional_1_For_1_Template_a_click_0_listener() {
      i0.\u0275\u0275restoreView(_r21);
      const ctx_r1 = i0.\u0275\u0275nextContext(3);
      return i0.\u0275\u0275resetView(ctx_r1.clearSearch());
    });
    i0.\u0275\u0275elementContainer(1, 10);
    i0.\u0275\u0275elementStart(2, "span")(3, "span", 52);
    i0.\u0275\u0275text(4);
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275elementStart(5, "span", 53);
    i0.\u0275\u0275text(6);
    i0.\u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const r_r22 = ctx.$implicit;
    i0.\u0275\u0275nextContext(3);
    const navIcon_r6 = i0.\u0275\u0275reference(75);
    i0.\u0275\u0275property("routerLink", r_r22.path);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275property("ngTemplateOutlet", navIcon_r6)("ngTemplateOutletContext", i0.\u0275\u0275pureFunction1(5, _c9, r_r22.icon));
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275textInterpolate(r_r22.label);
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275textInterpolate(r_r22.section);
  }
}
function SellerShellComponent_Conditional_52_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275repeaterCreate(0, SellerShellComponent_Conditional_52_Conditional_1_For_1_Template, 7, 7, "a", 50, _forTrack1);
  }
  if (rf & 2) {
    const ctx_r1 = i0.\u0275\u0275nextContext(2);
    i0.\u0275\u0275repeater(ctx_r1.searchResults());
  }
}
function SellerShellComponent_Conditional_52_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "p", 49);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = i0.\u0275\u0275nextContext(2);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate1('No matches for "', ctx_r1.searchTerm(), '"');
  }
}
function SellerShellComponent_Conditional_52_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "div", 25);
    i0.\u0275\u0275conditionalCreate(1, SellerShellComponent_Conditional_52_Conditional_1_Template, 2, 0)(2, SellerShellComponent_Conditional_52_Conditional_2_Template, 2, 1, "p", 49);
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = i0.\u0275\u0275nextContext();
    i0.\u0275\u0275advance();
    i0.\u0275\u0275conditional(ctx_r1.searchResults().length ? 1 : 2);
  }
}
function SellerShellComponent_Conditional_57_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "span", 29);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = i0.\u0275\u0275nextContext();
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate(ctx_r1.unreadCount());
  }
}
function SellerShellComponent_Conditional_58_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    const _r23 = i0.\u0275\u0275getCurrentView();
    i0.\u0275\u0275elementStart(0, "button", 56);
    i0.\u0275\u0275listener("click", function SellerShellComponent_Conditional_58_Conditional_4_Template_button_click_0_listener() {
      i0.\u0275\u0275restoreView(_r23);
      const ctx_r1 = i0.\u0275\u0275nextContext(2);
      return i0.\u0275\u0275resetView(ctx_r1.markAllRead());
    });
    i0.\u0275\u0275text(1, "Mark all read");
    i0.\u0275\u0275elementEnd();
  }
}
function SellerShellComponent_Conditional_58_Conditional_5_For_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r24 = i0.\u0275\u0275getCurrentView();
    i0.\u0275\u0275elementStart(0, "li", 58);
    i0.\u0275\u0275listener("click", function SellerShellComponent_Conditional_58_Conditional_5_For_2_Template_li_click_0_listener() {
      const n_r25 = i0.\u0275\u0275restoreView(_r24).$implicit;
      const ctx_r1 = i0.\u0275\u0275nextContext(3);
      return i0.\u0275\u0275resetView(ctx_r1.markRead(n_r25.id));
    });
    i0.\u0275\u0275element(1, "span", 59);
    i0.\u0275\u0275elementStart(2, "div", 60)(3, "p", 61);
    i0.\u0275\u0275text(4);
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275elementStart(5, "p", 62);
    i0.\u0275\u0275text(6);
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275elementStart(7, "p", 63);
    i0.\u0275\u0275text(8);
    i0.\u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const n_r25 = ctx.$implicit;
    i0.\u0275\u0275classProp("unread", !n_r25.read);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275classProp("hide", n_r25.read);
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275textInterpolate(n_r25.title);
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275textInterpolate(n_r25.message);
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275textInterpolate(n_r25.time);
  }
}
function SellerShellComponent_Conditional_58_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "ul");
    i0.\u0275\u0275repeaterCreate(1, SellerShellComponent_Conditional_58_Conditional_5_For_2_Template, 9, 7, "li", 57, _forTrack2);
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = i0.\u0275\u0275nextContext(2);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275repeater(ctx_r1.notifications());
  }
}
function SellerShellComponent_Conditional_58_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "p", 49);
    i0.\u0275\u0275text(1, "You're all caught up.");
    i0.\u0275\u0275elementEnd();
  }
}
function SellerShellComponent_Conditional_58_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "div", 30)(1, "div", 54)(2, "span");
    i0.\u0275\u0275text(3, "Notifications");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275conditionalCreate(4, SellerShellComponent_Conditional_58_Conditional_4_Template, 2, 0, "button", 55);
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275conditionalCreate(5, SellerShellComponent_Conditional_58_Conditional_5_Template, 3, 0, "ul")(6, SellerShellComponent_Conditional_58_Conditional_6_Template, 2, 0, "p", 49);
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = i0.\u0275\u0275nextContext();
    i0.\u0275\u0275advance(4);
    i0.\u0275\u0275conditional(ctx_r1.unreadCount() > 0 ? 4 : -1);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275conditional(ctx_r1.notifications().length ? 5 : 6);
  }
}
function SellerShellComponent_Conditional_71_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275elementStart(0, "p", 66);
    i0.\u0275\u0275text(1);
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = i0.\u0275\u0275nextContext(2);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275textInterpolate(ctx_r1.auth.user()?.tenant_name);
  }
}
function SellerShellComponent_Conditional_71_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    const _r27 = i0.\u0275\u0275getCurrentView();
    i0.\u0275\u0275elementStart(0, "a", 51);
    i0.\u0275\u0275listener("click", function SellerShellComponent_Conditional_71_Conditional_9_Template_a_click_0_listener() {
      i0.\u0275\u0275restoreView(_r27);
      const ctx_r1 = i0.\u0275\u0275nextContext(2);
      return i0.\u0275\u0275resetView(ctx_r1.closeMenus());
    });
    i0.\u0275\u0275text(1, "Account settings");
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = i0.\u0275\u0275nextContext(2);
    i0.\u0275\u0275property("routerLink", ctx_r1.tenantLink("settings"));
  }
}
function SellerShellComponent_Conditional_71_Template(rf, ctx) {
  if (rf & 1) {
    const _r26 = i0.\u0275\u0275getCurrentView();
    i0.\u0275\u0275elementStart(0, "div", 37)(1, "div", 64)(2, "p", 35);
    i0.\u0275\u0275text(3);
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275elementStart(4, "p", 65);
    i0.\u0275\u0275text(5);
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275conditionalCreate(6, SellerShellComponent_Conditional_71_Conditional_6_Template, 2, 1, "p", 66);
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275elementStart(7, "a", 51);
    i0.\u0275\u0275listener("click", function SellerShellComponent_Conditional_71_Template_a_click_7_listener() {
      i0.\u0275\u0275restoreView(_r26);
      const ctx_r1 = i0.\u0275\u0275nextContext();
      return i0.\u0275\u0275resetView(ctx_r1.closeMenus());
    });
    i0.\u0275\u0275text(8, "Dashboard");
    i0.\u0275\u0275elementEnd();
    i0.\u0275\u0275conditionalCreate(9, SellerShellComponent_Conditional_71_Conditional_9_Template, 2, 1, "a", 50);
    i0.\u0275\u0275elementStart(10, "button", 67);
    i0.\u0275\u0275listener("click", function SellerShellComponent_Conditional_71_Template_button_click_10_listener() {
      i0.\u0275\u0275restoreView(_r26);
      const ctx_r1 = i0.\u0275\u0275nextContext();
      return i0.\u0275\u0275resetView(ctx_r1.auth.logout());
    });
    i0.\u0275\u0275text(11, "Log out");
    i0.\u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = i0.\u0275\u0275nextContext();
    i0.\u0275\u0275advance(3);
    i0.\u0275\u0275textInterpolate(ctx_r1.auth.user()?.name);
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275textInterpolate(ctx_r1.auth.user()?.email);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275conditional(ctx_r1.auth.user()?.tenant_name ? 6 : -1);
    i0.\u0275\u0275advance();
    i0.\u0275\u0275property("routerLink", ctx_r1.tenantLink());
    i0.\u0275\u0275advance(2);
    i0.\u0275\u0275conditional(ctx_r1.isOwner() ? 9 : -1);
  }
}
function SellerShellComponent_ng_template_74_Case_1_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275namespaceSVG();
    i0.\u0275\u0275element(0, "path", 71)(1, "polyline", 72);
  }
}
function SellerShellComponent_ng_template_74_Case_2_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275namespaceSVG();
    i0.\u0275\u0275element(0, "circle", 73)(1, "circle", 74)(2, "line", 75)(3, "line", 76)(4, "line", 77)(5, "line", 78);
  }
}
function SellerShellComponent_ng_template_74_Case_3_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275namespaceSVG();
    i0.\u0275\u0275element(0, "circle", 73)(1, "path", 79);
  }
}
function SellerShellComponent_ng_template_74_Case_4_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275namespaceSVG();
    i0.\u0275\u0275element(0, "polyline", 80)(1, "polyline", 81);
  }
}
function SellerShellComponent_ng_template_74_Case_5_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275namespaceSVG();
    i0.\u0275\u0275element(0, "line", 82)(1, "line", 83)(2, "line", 84)(3, "line", 85)(4, "line", 86)(5, "line", 87)(6, "line", 88)(7, "line", 89)(8, "line", 90);
  }
}
function SellerShellComponent_ng_template_74_Case_6_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275namespaceSVG();
    i0.\u0275\u0275element(0, "path", 91)(1, "path", 92)(2, "path", 93);
  }
}
function SellerShellComponent_ng_template_74_Case_7_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275namespaceSVG();
    i0.\u0275\u0275element(0, "path", 94)(1, "path", 95)(2, "path", 96);
  }
}
function SellerShellComponent_ng_template_74_Case_8_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275namespaceSVG();
    i0.\u0275\u0275element(0, "path", 97)(1, "polyline", 98)(2, "line", 99)(3, "line", 100);
  }
}
function SellerShellComponent_ng_template_74_Case_9_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275namespaceSVG();
    i0.\u0275\u0275element(0, "path", 101)(1, "circle", 102);
  }
}
function SellerShellComponent_ng_template_74_Case_10_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275namespaceSVG();
    i0.\u0275\u0275element(0, "rect", 103)(1, "path", 104)(2, "line", 105);
  }
}
function SellerShellComponent_ng_template_74_Case_11_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275namespaceSVG();
    i0.\u0275\u0275element(0, "circle", 73)(1, "circle", 106)(2, "circle", 107);
  }
}
function SellerShellComponent_ng_template_74_Case_12_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275namespaceSVG();
    i0.\u0275\u0275element(0, "line", 108)(1, "rect", 109)(2, "rect", 110)(3, "rect", 111);
  }
}
function SellerShellComponent_ng_template_74_Case_13_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275namespaceSVG();
    i0.\u0275\u0275element(0, "path", 112)(1, "circle", 113)(2, "path", 114)(3, "path", 115);
  }
}
function SellerShellComponent_ng_template_74_Case_14_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275namespaceSVG();
    i0.\u0275\u0275element(0, "circle", 116)(1, "path", 117);
  }
}
function SellerShellComponent_ng_template_74_Case_15_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275namespaceSVG();
    i0.\u0275\u0275element(0, "ellipse", 118)(1, "path", 119)(2, "path", 120);
  }
}
function SellerShellComponent_ng_template_74_Case_16_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275namespaceSVG();
    i0.\u0275\u0275element(0, "circle", 73)(1, "line", 121)(2, "path", 122);
  }
}
function SellerShellComponent_ng_template_74_Case_17_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275namespaceSVG();
    i0.\u0275\u0275element(0, "circle", 123)(1, "path", 124);
  }
}
function SellerShellComponent_ng_template_74_Case_18_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275namespaceSVG();
    i0.\u0275\u0275element(0, "circle", 125)(1, "circle", 126)(2, "circle", 127)(3, "path", 128);
  }
}
function SellerShellComponent_ng_template_74_Case_19_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275namespaceSVG();
    i0.\u0275\u0275element(0, "path", 129)(1, "circle", 130);
  }
}
function SellerShellComponent_ng_template_74_Case_20_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275namespaceSVG();
    i0.\u0275\u0275element(0, "circle", 131)(1, "line", 132);
  }
}
function SellerShellComponent_ng_template_74_Case_21_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275namespaceSVG();
    i0.\u0275\u0275element(0, "path", 133)(1, "path", 134);
  }
}
function SellerShellComponent_ng_template_74_Case_22_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275namespaceSVG();
    i0.\u0275\u0275element(0, "circle", 135)(1, "path", 136);
  }
}
function SellerShellComponent_ng_template_74_Case_23_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275namespaceSVG();
    i0.\u0275\u0275element(0, "path", 69);
  }
}
function SellerShellComponent_ng_template_74_Case_24_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275namespaceSVG();
    i0.\u0275\u0275element(0, "polyline", 70);
  }
}
function SellerShellComponent_ng_template_74_Case_25_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275namespaceSVG();
    i0.\u0275\u0275element(0, "line", 137)(1, "line", 121)(2, "line", 138);
  }
}
function SellerShellComponent_ng_template_74_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275namespaceSVG();
    i0.\u0275\u0275elementStart(0, "svg", 68);
    i0.\u0275\u0275conditionalCreate(1, SellerShellComponent_ng_template_74_Case_1_Template, 2, 0)(2, SellerShellComponent_ng_template_74_Case_2_Template, 6, 0)(3, SellerShellComponent_ng_template_74_Case_3_Template, 2, 0)(4, SellerShellComponent_ng_template_74_Case_4_Template, 2, 0)(5, SellerShellComponent_ng_template_74_Case_5_Template, 9, 0)(6, SellerShellComponent_ng_template_74_Case_6_Template, 3, 0)(7, SellerShellComponent_ng_template_74_Case_7_Template, 3, 0)(8, SellerShellComponent_ng_template_74_Case_8_Template, 4, 0)(9, SellerShellComponent_ng_template_74_Case_9_Template, 2, 0)(10, SellerShellComponent_ng_template_74_Case_10_Template, 3, 0)(11, SellerShellComponent_ng_template_74_Case_11_Template, 3, 0)(12, SellerShellComponent_ng_template_74_Case_12_Template, 4, 0)(13, SellerShellComponent_ng_template_74_Case_13_Template, 4, 0)(14, SellerShellComponent_ng_template_74_Case_14_Template, 2, 0)(15, SellerShellComponent_ng_template_74_Case_15_Template, 3, 0)(16, SellerShellComponent_ng_template_74_Case_16_Template, 3, 0)(17, SellerShellComponent_ng_template_74_Case_17_Template, 2, 0)(18, SellerShellComponent_ng_template_74_Case_18_Template, 4, 0)(19, SellerShellComponent_ng_template_74_Case_19_Template, 2, 0)(20, SellerShellComponent_ng_template_74_Case_20_Template, 2, 0)(21, SellerShellComponent_ng_template_74_Case_21_Template, 2, 0)(22, SellerShellComponent_ng_template_74_Case_22_Template, 2, 0)(23, SellerShellComponent_ng_template_74_Case_23_Template, 1, 0, ":svg:path", 69)(24, SellerShellComponent_ng_template_74_Case_24_Template, 1, 0, ":svg:polyline", 70)(25, SellerShellComponent_ng_template_74_Case_25_Template, 3, 0);
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    let tmp_4_0;
    const name_r28 = ctx.$implicit;
    i0.\u0275\u0275advance();
    i0.\u0275\u0275conditional((tmp_4_0 = name_r28) === "home" ? 1 : tmp_4_0 === "lifebuoy" ? 2 : tmp_4_0 === "finance" ? 3 : tmp_4_0 === "sales" ? 4 : tmp_4_0 === "operations" ? 5 : tmp_4_0 === "marketing" ? 6 : tmp_4_0 === "store" ? 7 : tmp_4_0 === "orders" ? 8 : tmp_4_0 === "products" ? 9 : tmp_4_0 === "inventory" ? 10 : tmp_4_0 === "ads" ? 11 : tmp_4_0 === "analytics" ? 12 : tmp_4_0 === "users" ? 13 : tmp_4_0 === "settings" ? 14 : tmp_4_0 === "backups" ? 15 : tmp_4_0 === "domains" ? 16 : tmp_4_0 === "apikeys" ? 17 : tmp_4_0 === "webhooks" ? 18 : tmp_4_0 === "ai" ? 19 : tmp_4_0 === "search" ? 20 : tmp_4_0 === "bell" ? 21 : tmp_4_0 === "sun" ? 22 : tmp_4_0 === "moon" ? 23 : tmp_4_0 === "chevron" ? 24 : tmp_4_0 === "menu" ? 25 : -1);
  }
}
function SellerShellComponent_ng_template_76_Case_1_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275namespaceSVG();
    i0.\u0275\u0275element(0, "path", 139)(1, "polyline", 140)(2, "line", 141);
  }
}
function SellerShellComponent_ng_template_76_Template(rf, ctx) {
  if (rf & 1) {
    i0.\u0275\u0275namespaceSVG();
    i0.\u0275\u0275elementStart(0, "svg", 68);
    i0.\u0275\u0275conditionalCreate(1, SellerShellComponent_ng_template_76_Case_1_Template, 3, 0);
    i0.\u0275\u0275elementEnd();
  }
  if (rf & 2) {
    let tmp_4_0;
    const name_r29 = ctx.$implicit;
    i0.\u0275\u0275advance();
    i0.\u0275\u0275conditional((tmp_4_0 = name_r29) === "logout" ? 1 : -1);
  }
}
var SIDEBAR_KEY = "mh_tenant_sidebar_collapsed";
var MOBILE_BREAKPOINT = 900;
var SellerShellComponent = class _SellerShellComponent {
  auth = inject(AuthService);
  theme = inject(ThemeService);
  router = inject(Router);
  isOwner = computed(
    () => this.auth.hasRole("tenant_owner"),
    ...ngDevMode ? [{ debugName: "isOwner" }] : (
      /* istanbul ignore next */
      []
    )
  );
  canViewAccounting = computed(
    () => this.isOwner() || this.auth.user()?.department === "finance",
    ...ngDevMode ? [{ debugName: "canViewAccounting" }] : (
      /* istanbul ignore next */
      []
    )
  );
  canViewSales = computed(
    () => this.isOwner() || this.auth.user()?.department === "sales",
    ...ngDevMode ? [{ debugName: "canViewSales" }] : (
      /* istanbul ignore next */
      []
    )
  );
  canViewOperations = computed(
    () => this.isOwner() || this.auth.user()?.department === "operations",
    ...ngDevMode ? [{ debugName: "canViewOperations" }] : (
      /* istanbul ignore next */
      []
    )
  );
  canViewMarketing = computed(
    () => this.isOwner() || this.auth.user()?.department === "marketing",
    ...ngDevMode ? [{ debugName: "canViewMarketing" }] : (
      /* istanbul ignore next */
      []
    )
  );
  accountingItems = [
    { key: "departments/finance", faIcon: "fa-solid fa-table-columns", label: "Overview", icon: "finance" },
    { key: "accounting/invoices", faIcon: "fa-solid fa-file-invoice", label: "Invoices", icon: "finance" },
    { key: "accounting/payments", faIcon: "fa-solid fa-credit-card", label: "Payments", icon: "finance" },
    { key: "accounting/expenses", faIcon: "fa-solid fa-receipt", label: "Expenses", icon: "finance" },
    { key: "accounting/procurement", faIcon: "fa-solid fa-cart-shopping", label: "Procurement", icon: "operations" },
    { key: "accounting/vendors", faIcon: "fa-solid fa-handshake", label: "Customers & vendors", icon: "users" },
    { key: "accounting/reconciliation", faIcon: "fa-solid fa-building-columns", label: "Bank reconciliation", icon: "finance" },
    { key: "accounting/chart-of-accounts", faIcon: "fa-solid fa-book", label: "Chart of accounts", icon: "analytics" },
    { key: "accounting/journals", faIcon: "fa-solid fa-book-open", label: "General journal", icon: "finance" },
    { key: "accounting/reports", faIcon: "fa-solid fa-chart-column", label: "Financial reports", icon: "analytics" }
  ];
  salesItems = [
    { key: "departments/sales", faIcon: "fa-solid fa-table-columns", label: "Overview", icon: "sales" },
    { key: "sales/leads", faIcon: "fa-solid fa-user-plus", label: "Leads", icon: "users" },
    { key: "sales/pipeline", faIcon: "fa-solid fa-filter", label: "Pipeline", icon: "sales" },
    { key: "sales/quotes", faIcon: "fa-solid fa-file-lines", label: "Quotes", icon: "finance" },
    { key: "sales/customers", faIcon: "fa-solid fa-user-group", label: "Customers", icon: "users" }
  ];
  operationsItems = [
    { key: "departments/operations", faIcon: "fa-solid fa-table-columns", label: "Overview", icon: "operations" },
    { key: "operations/fulfillment", faIcon: "fa-solid fa-truck-fast", label: "Fulfilment", icon: "orders" },
    { key: "operations/inventory", faIcon: "fa-solid fa-boxes-stacked", label: "Inventory", icon: "inventory" },
    { key: "operations/catalog", faIcon: "fa-solid fa-folder-open", label: "Catalogue", icon: "products" }
  ];
  marketingItems = [
    { key: "departments/marketing", faIcon: "fa-solid fa-table-columns", label: "Overview", icon: "marketing" },
    { key: "marketing/campaigns", faIcon: "fa-solid fa-bullhorn", label: "Campaigns", icon: "ads" },
    { key: "marketing/performance", faIcon: "fa-solid fa-chart-line", label: "Performance", icon: "analytics" }
  ];
  commerceItems = [
    { key: "stores", label: "Stores", icon: "store" },
    { key: "orders", label: "Orders", icon: "orders" },
    { key: "products", label: "Products", icon: "products" },
    { key: "inventory", label: "Inventory", icon: "inventory" },
    { key: "ads", label: "Ads", icon: "ads" },
    { key: "analytics", label: "Analytics", icon: "analytics" }
  ];
  adminItems = [
    { key: "users", label: "Users & permissions", icon: "users" },
    { key: "settings", label: "Settings", icon: "settings" },
    { key: "backups", label: "Backups", icon: "backups" },
    { key: "domains", label: "Domains", icon: "domains" },
    { key: "api-keys", label: "API keys", icon: "apikeys" },
    { key: "webhooks", label: "Webhooks", icon: "webhooks" },
    { key: "ai", label: "AI", icon: "ai" }
  ];
  activeSection = signal(
    this.initialSection(),
    ...ngDevMode ? [{ debugName: "activeSection" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** Accordion menu state: opening one dropdown automatically closes the others. */
  accountingOpen = computed(
    () => this.activeSection() === "accounting",
    ...ngDevMode ? [{ debugName: "accountingOpen" }] : (
      /* istanbul ignore next */
      []
    )
  );
  salesOpen = computed(
    () => this.activeSection() === "sales",
    ...ngDevMode ? [{ debugName: "salesOpen" }] : (
      /* istanbul ignore next */
      []
    )
  );
  operationsOpen = computed(
    () => this.activeSection() === "operations",
    ...ngDevMode ? [{ debugName: "operationsOpen" }] : (
      /* istanbul ignore next */
      []
    )
  );
  marketingOpen = computed(
    () => this.activeSection() === "marketing",
    ...ngDevMode ? [{ debugName: "marketingOpen" }] : (
      /* istanbul ignore next */
      []
    )
  );
  commerceOpen = computed(
    () => this.activeSection() === "commerce",
    ...ngDevMode ? [{ debugName: "commerceOpen" }] : (
      /* istanbul ignore next */
      []
    )
  );
  adminOpen = computed(
    () => this.activeSection() === "admin",
    ...ngDevMode ? [{ debugName: "adminOpen" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** Sidebar collapse (icon rail on desktop, off-canvas drawer on mobile). */
  collapsed = signal(
    this.initialCollapsed(),
    ...ngDevMode ? [{ debugName: "collapsed" }] : (
      /* istanbul ignore next */
      []
    )
  );
  /** Backdrop only ever paints on small screens (hidden via CSS at desktop widths). */
  mobileOpen = computed(
    () => !this.collapsed(),
    ...ngDevMode ? [{ debugName: "mobileOpen" }] : (
      /* istanbul ignore next */
      []
    )
  );
  // ---- Search ----
  searchTerm = signal(
    "",
    ...ngDevMode ? [{ debugName: "searchTerm" }] : (
      /* istanbul ignore next */
      []
    )
  );
  searchFocused = signal(
    false,
    ...ngDevMode ? [{ debugName: "searchFocused" }] : (
      /* istanbul ignore next */
      []
    )
  );
  showSearchPanel = computed(
    () => this.searchFocused(),
    ...ngDevMode ? [{ debugName: "showSearchPanel" }] : (
      /* istanbul ignore next */
      []
    )
  );
  searchIndex = computed(
    () => {
      const items = [{ label: "Dashboard", path: this.tenantLink(), icon: "home", section: "Overview" }];
      if (this.canViewAccounting()) {
        for (const a of this.accountingItems) {
          items.push({ label: a.label, path: this.tenantLink(a.key), icon: a.icon, section: "Accounting" });
        }
      }
      if (this.canViewSales()) {
        for (const s of this.salesItems) {
          items.push({ label: s.label, path: this.tenantLink(s.key), icon: s.icon, section: "Sales" });
        }
      }
      if (this.canViewOperations()) {
        for (const item of this.operationsItems)
          items.push({ label: item.label, path: this.tenantLink(item.key), icon: item.icon, section: "Operations" });
      }
      if (this.canViewMarketing()) {
        for (const item of this.marketingItems)
          items.push({ label: item.label, path: this.tenantLink(item.key), icon: item.icon, section: "Marketing" });
      }
      for (const c of this.commerceItems) {
        items.push({ label: c.label, path: this.tenantLink(c.key), icon: c.icon, section: "Commerce" });
      }
      if (this.isOwner()) {
        for (const a of this.adminItems) {
          items.push({ label: a.label, path: this.tenantLink(a.key), icon: a.icon, section: "Admin" });
        }
      }
      return items;
    },
    ...ngDevMode ? [{ debugName: "searchIndex" }] : (
      /* istanbul ignore next */
      []
    )
  );
  searchResults = computed(
    () => {
      const term = this.searchTerm().trim().toLowerCase();
      if (!term)
        return [];
      return this.searchIndex().filter((i) => i.label.toLowerCase().includes(term));
    },
    ...ngDevMode ? [{ debugName: "searchResults" }] : (
      /* istanbul ignore next */
      []
    )
  );
  // ---- Notifications (demo data; wire to a real feed when the API exists) ----
  notifications = signal(
    [
      { id: 1, title: "New order received", message: "Order #10456 was just placed for $128.40.", time: "5m ago", read: false },
      { id: 2, title: "Low stock alert", message: "\u201CCeramic Mug \u2014 Sand\u201D has 3 units left.", time: "1h ago", read: false },
      { id: 3, title: "Payout sent", message: "Your weekly payout of $2,340.00 was sent.", time: "Yesterday", read: false },
      { id: 4, title: "Staff invite accepted", message: "A new teammate joined your store.", time: "2 days ago", read: true }
    ],
    ...ngDevMode ? [{ debugName: "notifications" }] : (
      /* istanbul ignore next */
      []
    )
  );
  unreadCount = computed(
    () => this.notifications().filter((n) => !n.read).length,
    ...ngDevMode ? [{ debugName: "unreadCount" }] : (
      /* istanbul ignore next */
      []
    )
  );
  notifOpen = signal(
    false,
    ...ngDevMode ? [{ debugName: "notifOpen" }] : (
      /* istanbul ignore next */
      []
    )
  );
  profileOpen = signal(
    false,
    ...ngDevMode ? [{ debugName: "profileOpen" }] : (
      /* istanbul ignore next */
      []
    )
  );
  initials = computed(
    () => {
      const name = this.auth.user()?.name ?? "";
      const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
      return parts.map((p) => p[0]?.toUpperCase()).join("") || "U";
    },
    ...ngDevMode ? [{ debugName: "initials" }] : (
      /* istanbul ignore next */
      []
    )
  );
  roleLabel = computed(
    () => {
      const user = this.auth.user();
      if (!user)
        return "";
      if (user.role === "tenant_owner")
        return "Tenant owner";
      if (user.role === "store_staff")
        return user.department ? `${user.department} staff` : "Store staff";
      return user.role;
    },
    ...ngDevMode ? [{ debugName: "roleLabel" }] : (
      /* istanbul ignore next */
      []
    )
  );
  constructor() {
    effect(() => {
      if (typeof window === "undefined" || this.isMobile())
        return;
      try {
        localStorage.setItem(SIDEBAR_KEY, this.collapsed() ? "1" : "0");
      } catch (e) {
      }
    });
  }
  tenantLink(path = "") {
    const base = this.router.url.startsWith("/seller") ? "/seller" : "/tenant";
    return path ? `${base}/${path}` : base;
  }
  toggleSidebar() {
    this.collapsed.update((v) => !v);
  }
  initialSection() {
    if (typeof window === "undefined")
      return "commerce";
    const url = window.location.pathname || this.router.url;
    if (url.includes("/accounting") || url.includes("/departments/finance"))
      return "accounting";
    if (url.includes("/sales") || url.includes("/departments/sales"))
      return "sales";
    if (url.includes("/operations") || url.includes("/departments/operations"))
      return "operations";
    if (url.includes("/marketing") || url.includes("/departments/marketing"))
      return "marketing";
    if (url.includes("/users") || url.includes("/settings") || url.includes("/backups") || url.includes("/domains") || url.includes("/api-keys") || url.includes("/webhooks") || url.includes("/ai")) {
      return "admin";
    }
    return "commerce";
  }
  toggleSection(section) {
    this.activeSection.update((current) => current === section ? null : section);
  }
  toggleAccounting() {
    this.toggleSection("accounting");
  }
  toggleSales() {
    this.toggleSection("sales");
  }
  toggleOperations() {
    this.toggleSection("operations");
  }
  toggleMarketing() {
    this.toggleSection("marketing");
  }
  toggleCommerce() {
    this.toggleSection("commerce");
  }
  toggleAdmin() {
    this.toggleSection("admin");
  }
  onNavigate() {
    this.closeMenus();
    if (this.isMobile())
      this.collapsed.set(true);
  }
  onSearchInput(event) {
    this.searchTerm.set(event.target.value);
  }
  onSearchFocus() {
    this.searchFocused.set(true);
    this.notifOpen.set(false);
    this.profileOpen.set(false);
  }
  clearSearch() {
    this.searchTerm.set("");
    this.searchFocused.set(false);
  }
  goToFirstResult() {
    const result = this.searchResults()[0];
    if (result) {
      this.router.navigateByUrl(result.path);
      this.clearSearch();
    }
  }
  toggleNotifications() {
    this.notifOpen.update((v) => !v);
    this.profileOpen.set(false);
    this.searchFocused.set(false);
  }
  markRead(id) {
    this.notifications.update((list) => list.map((n) => n.id === id ? __spreadProps(__spreadValues({}, n), { read: true }) : n));
  }
  markAllRead() {
    this.notifications.update((list) => list.map((n) => __spreadProps(__spreadValues({}, n), { read: true })));
  }
  toggleProfile() {
    this.profileOpen.update((v) => !v);
    this.notifOpen.set(false);
    this.searchFocused.set(false);
  }
  closeMenus() {
    this.notifOpen.set(false);
    this.profileOpen.set(false);
    this.searchFocused.set(false);
  }
  onDocumentClick() {
    this.closeMenus();
  }
  onEscape() {
    this.closeMenus();
  }
  isMobile() {
    return typeof window !== "undefined" && window.innerWidth <= MOBILE_BREAKPOINT;
  }
  initialCollapsed() {
    if (typeof window === "undefined")
      return false;
    if (this.isMobile())
      return true;
    try {
      return localStorage.getItem(SIDEBAR_KEY) === "1";
    } catch (e) {
      return false;
    }
  }
  static \u0275fac = function SellerShellComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _SellerShellComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ i0.\u0275\u0275defineComponent({ type: _SellerShellComponent, selectors: [["app-seller-shell"]], hostBindings: function SellerShellComponent_HostBindings(rf, ctx) {
    if (rf & 1) {
      i0.\u0275\u0275listener("click", function SellerShellComponent_click_HostBindingHandler() {
        return ctx.onDocumentClick();
      }, i0.\u0275\u0275resolveDocument)("keydown.escape", function SellerShellComponent_keydown_escape_HostBindingHandler() {
        return ctx.onEscape();
      }, i0.\u0275\u0275resolveDocument);
    }
  }, decls: 78, vars: 67, consts: [["navIcon", ""], ["miniIcon", ""], [1, "dash"], [1, "backdrop"], [1, "brand-row"], [1, "brand", "serif", 3, "click", "routerLink"], [1, "mark"], [1, "label-text"], [1, "muted", "subtitle", "label-text"], ["routerLinkActive", "on", 3, "click", "routerLink", "routerLinkActiveOptions", "title"], [3, "ngTemplateOutlet", "ngTemplateOutletContext"], [1, "section-label", "label-text"], [1, "nav-group-wrapper"], ["type", "button", "aria-label", "Toggle commerce menu", 1, "nav-group", 3, "click", "title"], [1, "nav-group-copy"], [1, "subnav", "grouped-subnav"], [1, "flyout-header"], ["routerLinkActive", "on", 3, "routerLink", "title"], ["routerLinkActive", "on", 3, "click", "routerLink", "title"], [1, "btn", "ghost", "logout", 3, "click", "title"], [1, "content"], [1, "topnav"], ["type", "button", "aria-label", "Toggle sidebar", 1, "icon-btn", "hamburger", 3, "click"], [1, "search", 3, "click"], ["type", "text", "placeholder", "Search\u2026", "aria-label", "Search the tenant console", 3, "input", "focus", "keydown.enter", "keydown.escape", "value"], [1, "dropdown", "search-results"], [1, "top-actions"], [1, "dropdown-wrap", 3, "click"], ["type", "button", "aria-label", "Notifications", 1, "icon-btn", 3, "click"], [1, "badge"], [1, "dropdown", "notif-panel"], ["type", "button", 1, "icon-btn", 3, "click"], ["type", "button", 1, "profile-btn", 3, "click"], [1, "avatar"], [1, "who"], [1, "who-name"], [1, "who-role", "muted"], [1, "dropdown", "profile-panel"], [1, "body"], [1, "backdrop", 3, "click"], ["type", "button", "aria-label", "Toggle accounting menu", 1, "nav-group", 3, "click", "title"], [1, "subnav"], ["routerLinkActive", "on", 3, "routerLink", "routerLinkActiveOptions", "title"], ["aria-hidden", "true"], ["type", "button", "aria-label", "Toggle sales menu", 1, "nav-group", 3, "click", "title"], ["type", "button", "aria-label", "Toggle operations menu", 1, "nav-group", 3, "click", "title"], ["type", "button", "aria-label", "Toggle marketing menu", 1, "nav-group", 3, "click", "title"], [1, "nav-group-wrapper", "nav-group-bottom"], ["type", "button", "aria-label", "Toggle admin menu", 1, "nav-group", 3, "click", "title"], [1, "empty-note", "muted"], [3, "routerLink"], [3, "click", "routerLink"], [1, "r-label"], [1, "r-section", "muted"], [1, "dropdown-head"], ["type", "button", 1, "link-btn"], ["type", "button", 1, "link-btn", 3, "click"], [3, "unread"], [3, "click"], [1, "dot"], [1, "n-body"], [1, "n-title"], [1, "n-msg", "muted"], [1, "n-time", "muted"], [1, "profile-info"], [1, "muted", "email"], [1, "pill"], ["type", "button", 1, "logout-btn", 3, "click"], ["viewBox", "0 0 24 24", "fill", "none", "stroke", "currentColor", "stroke-width", "1.8", "stroke-linecap", "round", "stroke-linejoin", "round", "aria-hidden", "true"], ["d", "M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"], ["points", "6 9 12 15 18 9"], ["d", "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"], ["points", "9 22 9 12 15 12 15 22"], ["cx", "12", "cy", "12", "r", "9"], ["cx", "12", "cy", "12", "r", "4"], ["x1", "4.9", "y1", "4.9", "x2", "9.2", "y2", "9.2"], ["x1", "14.8", "y1", "14.8", "x2", "19.1", "y2", "19.1"], ["x1", "14.8", "y1", "9.2", "x2", "19.1", "y2", "4.9"], ["x1", "4.9", "y1", "19.1", "x2", "9.2", "y2", "14.8"], ["d", "M12 7v10M9.5 9.5c0-1.1 1.1-2 2.5-2s2.5.9 2.5 2c0 2.5-5 1.5-5 4 0 1.1 1.1 2 2.5 2s2.5-.9 2.5-2"], ["points", "3 17 9 11 13 15 21 6"], ["points", "14 6 21 6 21 13"], ["x1", "4", "y1", "21", "x2", "4", "y2", "14"], ["x1", "4", "y1", "10", "x2", "4", "y2", "3"], ["x1", "12", "y1", "21", "x2", "12", "y2", "12"], ["x1", "12", "y1", "8", "x2", "12", "y2", "3"], ["x1", "20", "y1", "21", "x2", "20", "y2", "16"], ["x1", "20", "y1", "12", "x2", "20", "y2", "3"], ["x1", "1", "y1", "14", "x2", "7", "y2", "14"], ["x1", "9", "y1", "8", "x2", "15", "y2", "8"], ["x1", "17", "y1", "16", "x2", "23", "y2", "16"], ["d", "M3 11v3a1 1 0 0 0 1 1h3l4 4V6L7 10H4a1 1 0 0 0-1 1z"], ["d", "M15.5 8.5a5 5 0 0 1 0 7"], ["d", "M18.5 5.5a9 9 0 0 1 0 13"], ["d", "M3 9l1.5-5h15L21 9"], ["d", "M5 9v11h14V9"], ["d", "M9.5 20v-5.5h5V20"], ["d", "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"], ["points", "14 2 14 8 20 8"], ["x1", "16", "y1", "13", "x2", "8", "y2", "13"], ["x1", "16", "y1", "17", "x2", "8", "y2", "17"], ["d", "M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3.24L4 3v5.59a2 2 0 0 0 .59 1.42l9.58 9.58a2 2 0 0 0 2.83 0l3.59-3.59a2 2 0 0 0 0-2.59z"], ["cx", "8", "cy", "8", "r", "1.2"], ["x", "3", "y", "4", "width", "18", "height", "5", "rx", "1"], ["d", "M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9"], ["x1", "10", "y1", "13", "x2", "14", "y2", "13"], ["cx", "12", "cy", "12", "r", "5"], ["cx", "12", "cy", "12", "r", "1"], ["x1", "4", "y1", "20", "x2", "20", "y2", "20"], ["x", "6", "y", "11", "width", "3", "height", "7"], ["x", "13", "y", "7", "width", "3", "height", "11"], ["x", "17.5", "y", "13", "width", "3", "height", "5"], ["d", "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"], ["cx", "9", "cy", "7", "r", "4"], ["d", "M22 21v-2a4 4 0 0 0-3-3.87"], ["d", "M16 3.13a4 4 0 0 1 0 7.75"], ["cx", "12", "cy", "12", "r", "3"], ["d", "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .7.4 1.31 1.05 1.6.31.14.65.22 1 .25l.5.01a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"], ["cx", "12", "cy", "5", "rx", "8", "ry", "3"], ["d", "M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"], ["d", "M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"], ["x1", "3", "y1", "12", "x2", "21", "y2", "12"], ["d", "M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z"], ["cx", "7.5", "cy", "15.5", "r", "4.5"], ["d", "M10.9 12.1 20 3l1.5 1.5L20 6l1.5 1.5L20 9"], ["cx", "6", "cy", "6", "r", "3"], ["cx", "18", "cy", "6", "r", "3"], ["cx", "12", "cy", "18", "r", "3"], ["d", "M8.5 7.5 10 15M15.5 7.5 14 15"], ["d", "M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"], ["cx", "12", "cy", "12", "r", "3.2"], ["cx", "11", "cy", "11", "r", "7"], ["x1", "21", "y1", "21", "x2", "16.65", "y2", "16.65"], ["d", "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"], ["d", "M13.73 21a2 2 0 0 1-3.46 0"], ["cx", "12", "cy", "12", "r", "4.2"], ["d", "M12 2v2.2M12 19.8V22M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2 12h2.2M19.8 12H22M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"], ["x1", "3", "y1", "6", "x2", "21", "y2", "6"], ["x1", "3", "y1", "18", "x2", "21", "y2", "18"], ["d", "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"], ["points", "16 17 21 12 16 7"], ["x1", "21", "y1", "12", "x2", "9", "y2", "12"]], template: function SellerShellComponent_Template(rf, ctx) {
    if (rf & 1) {
      i0.\u0275\u0275elementStart(0, "div", 2);
      i0.\u0275\u0275conditionalCreate(1, SellerShellComponent_Conditional_1_Template, 1, 0, "div", 3);
      i0.\u0275\u0275elementStart(2, "aside")(3, "div", 4)(4, "a", 5);
      i0.\u0275\u0275listener("click", function SellerShellComponent_Template_a_click_4_listener() {
        return ctx.onNavigate();
      });
      i0.\u0275\u0275elementStart(5, "span", 6);
      i0.\u0275\u0275text(6, "M");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(7, "span", 7);
      i0.\u0275\u0275text(8, "arketHub");
      i0.\u0275\u0275elementEnd()()();
      i0.\u0275\u0275elementStart(9, "p", 8);
      i0.\u0275\u0275text(10, "Tenant console");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(11, "nav")(12, "a", 9);
      i0.\u0275\u0275listener("click", function SellerShellComponent_Template_a_click_12_listener() {
        return ctx.onNavigate();
      });
      i0.\u0275\u0275elementContainer(13, 10);
      i0.\u0275\u0275elementStart(14, "span", 7);
      i0.\u0275\u0275text(15, "Dashboard");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275conditionalCreate(16, SellerShellComponent_Conditional_16_Template, 14, 14);
      i0.\u0275\u0275conditionalCreate(17, SellerShellComponent_Conditional_17_Template, 14, 14);
      i0.\u0275\u0275conditionalCreate(18, SellerShellComponent_Conditional_18_Template, 14, 14);
      i0.\u0275\u0275conditionalCreate(19, SellerShellComponent_Conditional_19_Template, 14, 14);
      i0.\u0275\u0275elementStart(20, "p", 11);
      i0.\u0275\u0275text(21, "Commerce");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(22, "div", 12)(23, "button", 13);
      i0.\u0275\u0275listener("click", function SellerShellComponent_Template_button_click_23_listener() {
        return ctx.toggleCommerce();
      });
      i0.\u0275\u0275elementStart(24, "span", 14);
      i0.\u0275\u0275elementContainer(25, 10);
      i0.\u0275\u0275elementStart(26, "span", 7);
      i0.\u0275\u0275text(27, "Commerce");
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementContainer(28, 10);
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(29, "div", 15)(30, "div", 16);
      i0.\u0275\u0275text(31, "Commerce");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275repeaterCreate(32, SellerShellComponent_For_33_Template, 4, 7, "a", 17, _forTrack0);
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275conditionalCreate(34, SellerShellComponent_Conditional_34_Template, 14, 14);
      i0.\u0275\u0275elementStart(35, "p", 11);
      i0.\u0275\u0275text(36, "Support");
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(37, "a", 18);
      i0.\u0275\u0275listener("click", function SellerShellComponent_Template_a_click_37_listener() {
        return ctx.onNavigate();
      });
      i0.\u0275\u0275elementContainer(38, 10);
      i0.\u0275\u0275elementStart(39, "span", 7);
      i0.\u0275\u0275text(40, "Help centre");
      i0.\u0275\u0275elementEnd()()();
      i0.\u0275\u0275elementStart(41, "button", 19);
      i0.\u0275\u0275listener("click", function SellerShellComponent_Template_button_click_41_listener() {
        return ctx.auth.logout();
      });
      i0.\u0275\u0275elementContainer(42, 10);
      i0.\u0275\u0275elementStart(43, "span", 7);
      i0.\u0275\u0275text(44, "Log out");
      i0.\u0275\u0275elementEnd()()();
      i0.\u0275\u0275elementStart(45, "div", 20)(46, "header", 21)(47, "button", 22);
      i0.\u0275\u0275listener("click", function SellerShellComponent_Template_button_click_47_listener() {
        return ctx.toggleSidebar();
      });
      i0.\u0275\u0275elementContainer(48, 10);
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(49, "div", 23);
      i0.\u0275\u0275listener("click", function SellerShellComponent_Template_div_click_49_listener($event) {
        return $event.stopPropagation();
      });
      i0.\u0275\u0275elementContainer(50, 10);
      i0.\u0275\u0275elementStart(51, "input", 24);
      i0.\u0275\u0275listener("input", function SellerShellComponent_Template_input_input_51_listener($event) {
        return ctx.onSearchInput($event);
      })("focus", function SellerShellComponent_Template_input_focus_51_listener() {
        return ctx.onSearchFocus();
      })("keydown.enter", function SellerShellComponent_Template_input_keydown_enter_51_listener() {
        return ctx.goToFirstResult();
      })("keydown.escape", function SellerShellComponent_Template_input_keydown_escape_51_listener() {
        return ctx.clearSearch();
      });
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275conditionalCreate(52, SellerShellComponent_Conditional_52_Template, 3, 1, "div", 25);
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(53, "div", 26)(54, "div", 27);
      i0.\u0275\u0275listener("click", function SellerShellComponent_Template_div_click_54_listener($event) {
        return $event.stopPropagation();
      });
      i0.\u0275\u0275elementStart(55, "button", 28);
      i0.\u0275\u0275listener("click", function SellerShellComponent_Template_button_click_55_listener() {
        return ctx.toggleNotifications();
      });
      i0.\u0275\u0275elementContainer(56, 10);
      i0.\u0275\u0275conditionalCreate(57, SellerShellComponent_Conditional_57_Template, 2, 1, "span", 29);
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275conditionalCreate(58, SellerShellComponent_Conditional_58_Template, 7, 2, "div", 30);
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(59, "button", 31);
      i0.\u0275\u0275listener("click", function SellerShellComponent_Template_button_click_59_listener() {
        return ctx.theme.toggle();
      });
      i0.\u0275\u0275elementContainer(60, 10);
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(61, "div", 27);
      i0.\u0275\u0275listener("click", function SellerShellComponent_Template_div_click_61_listener($event) {
        return $event.stopPropagation();
      });
      i0.\u0275\u0275elementStart(62, "button", 32);
      i0.\u0275\u0275listener("click", function SellerShellComponent_Template_button_click_62_listener() {
        return ctx.toggleProfile();
      });
      i0.\u0275\u0275elementStart(63, "span", 33);
      i0.\u0275\u0275text(64);
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(65, "span", 34)(66, "span", 35);
      i0.\u0275\u0275text(67);
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275elementStart(68, "span", 36);
      i0.\u0275\u0275text(69);
      i0.\u0275\u0275elementEnd()();
      i0.\u0275\u0275elementContainer(70, 10);
      i0.\u0275\u0275elementEnd();
      i0.\u0275\u0275conditionalCreate(71, SellerShellComponent_Conditional_71_Template, 12, 5, "div", 37);
      i0.\u0275\u0275elementEnd()()();
      i0.\u0275\u0275elementStart(72, "section", 38);
      i0.\u0275\u0275element(73, "router-outlet");
      i0.\u0275\u0275elementEnd()()();
      i0.\u0275\u0275template(74, SellerShellComponent_ng_template_74_Template, 26, 1, "ng-template", null, 0, i0.\u0275\u0275templateRefExtractor)(76, SellerShellComponent_ng_template_76_Template, 2, 1, "ng-template", null, 1, i0.\u0275\u0275templateRefExtractor);
    }
    if (rf & 2) {
      const navIcon_r6 = i0.\u0275\u0275reference(75);
      const miniIcon_r30 = i0.\u0275\u0275reference(77);
      i0.\u0275\u0275advance();
      i0.\u0275\u0275conditional(ctx.mobileOpen() ? 1 : -1);
      i0.\u0275\u0275advance();
      i0.\u0275\u0275classProp("collapsed", ctx.collapsed());
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275property("routerLink", ctx.tenantLink());
      i0.\u0275\u0275advance(8);
      i0.\u0275\u0275property("routerLink", ctx.tenantLink())("routerLinkActiveOptions", i0.\u0275\u0275pureFunction0(55, _c0))("title", ctx.collapsed() ? "Dashboard" : "");
      i0.\u0275\u0275advance();
      i0.\u0275\u0275property("ngTemplateOutlet", navIcon_r6)("ngTemplateOutletContext", i0.\u0275\u0275pureFunction0(56, _c1));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275conditional(ctx.canViewAccounting() ? 16 : -1);
      i0.\u0275\u0275advance();
      i0.\u0275\u0275conditional(ctx.canViewSales() ? 17 : -1);
      i0.\u0275\u0275advance();
      i0.\u0275\u0275conditional(ctx.canViewOperations() ? 18 : -1);
      i0.\u0275\u0275advance();
      i0.\u0275\u0275conditional(ctx.canViewMarketing() ? 19 : -1);
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275classProp("open", ctx.commerceOpen());
      i0.\u0275\u0275advance();
      i0.\u0275\u0275classProp("open", ctx.commerceOpen());
      i0.\u0275\u0275property("title", ctx.collapsed() ? "Commerce" : "");
      i0.\u0275\u0275attribute("aria-expanded", ctx.commerceOpen());
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275property("ngTemplateOutlet", navIcon_r6)("ngTemplateOutletContext", i0.\u0275\u0275pureFunction0(57, _c2));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275property("ngTemplateOutlet", navIcon_r6)("ngTemplateOutletContext", i0.\u0275\u0275pureFunction0(58, _c3));
      i0.\u0275\u0275advance();
      i0.\u0275\u0275classProp("open", ctx.commerceOpen());
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275repeater(ctx.commerceItems);
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275conditional(ctx.isOwner() ? 34 : -1);
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275property("routerLink", ctx.tenantLink("support"))("title", ctx.collapsed() ? "Help centre" : "");
      i0.\u0275\u0275advance();
      i0.\u0275\u0275property("ngTemplateOutlet", navIcon_r6)("ngTemplateOutletContext", i0.\u0275\u0275pureFunction0(59, _c4));
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275property("title", ctx.collapsed() ? "Log out" : "");
      i0.\u0275\u0275advance();
      i0.\u0275\u0275property("ngTemplateOutlet", miniIcon_r30)("ngTemplateOutletContext", i0.\u0275\u0275pureFunction0(60, _c5));
      i0.\u0275\u0275advance(5);
      i0.\u0275\u0275attribute("aria-expanded", !ctx.collapsed());
      i0.\u0275\u0275advance();
      i0.\u0275\u0275property("ngTemplateOutlet", navIcon_r6)("ngTemplateOutletContext", i0.\u0275\u0275pureFunction0(61, _c6));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275property("ngTemplateOutlet", navIcon_r6)("ngTemplateOutletContext", i0.\u0275\u0275pureFunction0(62, _c7));
      i0.\u0275\u0275advance();
      i0.\u0275\u0275property("value", ctx.searchTerm());
      i0.\u0275\u0275advance();
      i0.\u0275\u0275conditional(ctx.searchTerm() && ctx.showSearchPanel() ? 52 : -1);
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275attribute("aria-expanded", ctx.notifOpen());
      i0.\u0275\u0275advance();
      i0.\u0275\u0275property("ngTemplateOutlet", navIcon_r6)("ngTemplateOutletContext", i0.\u0275\u0275pureFunction0(63, _c8));
      i0.\u0275\u0275advance();
      i0.\u0275\u0275conditional(ctx.unreadCount() > 0 ? 57 : -1);
      i0.\u0275\u0275advance();
      i0.\u0275\u0275conditional(ctx.notifOpen() ? 58 : -1);
      i0.\u0275\u0275advance();
      i0.\u0275\u0275attribute("aria-label", ctx.theme.theme() === "dark" ? "Switch to light mode" : "Switch to dark mode");
      i0.\u0275\u0275advance();
      i0.\u0275\u0275property("ngTemplateOutlet", navIcon_r6)("ngTemplateOutletContext", i0.\u0275\u0275pureFunction1(64, _c9, ctx.theme.theme() === "dark" ? "sun" : "moon"));
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275attribute("aria-expanded", ctx.profileOpen());
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate(ctx.initials());
      i0.\u0275\u0275advance(3);
      i0.\u0275\u0275textInterpolate(ctx.auth.user()?.name);
      i0.\u0275\u0275advance(2);
      i0.\u0275\u0275textInterpolate(ctx.roleLabel());
      i0.\u0275\u0275advance();
      i0.\u0275\u0275property("ngTemplateOutlet", navIcon_r6)("ngTemplateOutletContext", i0.\u0275\u0275pureFunction0(66, _c3));
      i0.\u0275\u0275advance();
      i0.\u0275\u0275conditional(ctx.profileOpen() ? 71 : -1);
    }
  }, dependencies: [RouterOutlet, RouterLink, RouterLinkActive, NgTemplateOutlet], styles: ['\n.dash[_ngcontent-%COMP%] {\n  display: flex;\n  min-height: 100vh;\n  position: relative;\n  background: var(--%NS%paper);\n}\naside[_ngcontent-%COMP%] {\n  width: 240px;\n  flex: none;\n  position: sticky;\n  top: 0;\n  height: 100vh;\n  overflow: hidden;\n  padding: 24px 16px 16px 16px;\n  border-right: 1px solid var(--%NS%line);\n  background: #f7f1e4;\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n  transition: width 0.2s ease, transform 0.2s ease;\n  z-index: 10;\n}\n[data-theme=dark][_nghost-%COMP%]   aside[_ngcontent-%COMP%], [data-theme=dark]   [_nghost-%COMP%]   aside[_ngcontent-%COMP%] {\n  background: #1a1712;\n}\n.brand-row[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  flex: none;\n}\n.brand[_ngcontent-%COMP%] {\n  font-size: 22px;\n  display: flex;\n  align-items: center;\n  gap: 2px;\n}\n.brand[_ngcontent-%COMP%]   .mark[_ngcontent-%COMP%] {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  width: 30px;\n  height: 30px;\n  border-radius: 9px;\n  background: var(--%NS%ink);\n  color: var(--%NS%paper);\n  font-size: 16px;\n  flex: none;\n}\n.subtitle[_ngcontent-%COMP%] {\n  margin: 2px 0 4px;\n  font-size: 13px;\n  flex: none;\n}\nnav[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n  margin: 8px -16px 0 -16px;\n  padding: 0 16px 8px 16px;\n  overflow-y: auto;\n  overflow-x: hidden;\n  flex: 1 1 auto;\n  min-height: 0;\n  scrollbar-width: thin;\n  scrollbar-color: rgba(0, 0, 0, 0.18) transparent;\n}\n[data-theme=dark][_nghost-%COMP%]   nav[_ngcontent-%COMP%], [data-theme=dark]   [_nghost-%COMP%]   nav[_ngcontent-%COMP%] {\n  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;\n}\nnav[_ngcontent-%COMP%]::-webkit-scrollbar, \naside[_ngcontent-%COMP%]::-webkit-scrollbar {\n  width: 4px;\n}\nnav[_ngcontent-%COMP%]::-webkit-scrollbar-track, \naside[_ngcontent-%COMP%]::-webkit-scrollbar-track {\n  background: transparent;\n}\nnav[_ngcontent-%COMP%]::-webkit-scrollbar-thumb, \naside[_ngcontent-%COMP%]::-webkit-scrollbar-thumb {\n  background: rgba(0, 0, 0, 0.18);\n  border-radius: 999px;\n}\n[data-theme=dark][_nghost-%COMP%]   nav[_ngcontent-%COMP%]::-webkit-scrollbar-thumb, [data-theme=dark]   [_nghost-%COMP%]   nav[_ngcontent-%COMP%]::-webkit-scrollbar-thumb, \n[data-theme=dark][_nghost-%COMP%]   aside[_ngcontent-%COMP%]::-webkit-scrollbar-thumb, [data-theme=dark]   [_nghost-%COMP%]   aside[_ngcontent-%COMP%]::-webkit-scrollbar-thumb {\n  background: rgba(255, 255, 255, 0.2);\n}\nnav[_ngcontent-%COMP%]::-webkit-scrollbar-thumb:hover, \naside[_ngcontent-%COMP%]::-webkit-scrollbar-thumb:hover {\n  background: rgba(0, 0, 0, 0.35);\n}\n[data-theme=dark][_nghost-%COMP%]   nav[_ngcontent-%COMP%]::-webkit-scrollbar-thumb:hover, [data-theme=dark]   [_nghost-%COMP%]   nav[_ngcontent-%COMP%]::-webkit-scrollbar-thumb:hover, \n[data-theme=dark][_nghost-%COMP%]   aside[_ngcontent-%COMP%]::-webkit-scrollbar-thumb:hover, [data-theme=dark]   [_nghost-%COMP%]   aside[_ngcontent-%COMP%]::-webkit-scrollbar-thumb:hover {\n  background: rgba(255, 255, 255, 0.38);\n}\n.section-label[_ngcontent-%COMP%] {\n  margin: 14px 10px 4px;\n  font-size: 11px;\n  letter-spacing: 0.08em;\n  text-transform: uppercase;\n  color: var(--%NS%ink-soft);\n  font-weight: 700;\n  white-space: nowrap;\n}\nnav[_ngcontent-%COMP%]   a[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 11px;\n  padding: 9px 12px;\n  border-radius: 12px;\n  font-weight: 600;\n  color: var(--%NS%ink);\n  white-space: nowrap;\n}\nnav[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]   svg[_ngcontent-%COMP%] {\n  width: 18px;\n  height: 18px;\n  flex: none;\n}\nnav[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]:hover {\n  background: rgba(0, 0, 0, 0.06);\n}\n[data-theme=dark][_nghost-%COMP%]   nav[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]:hover, [data-theme=dark]   [_nghost-%COMP%]   nav[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]:hover {\n  background: rgba(255, 255, 255, 0.07);\n}\nnav[_ngcontent-%COMP%]   a.on[_ngcontent-%COMP%] {\n  background: var(--%NS%ink);\n  color: var(--%NS%paper);\n}\n.nav-group[_ngcontent-%COMP%] {\n  width: 100%;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 8px;\n  padding: 9px 10px;\n  border: 0;\n  border-radius: 12px;\n  background: transparent;\n  color: var(--%NS%ink);\n  font: inherit;\n  font-size: 13.5px;\n  font-weight: 700;\n  cursor: pointer;\n}\n.nav-group[_ngcontent-%COMP%]:hover {\n  background: rgba(0, 0, 0, 0.06);\n}\n[data-theme=dark][_nghost-%COMP%]   .nav-group[_ngcontent-%COMP%]:hover, [data-theme=dark]   [_nghost-%COMP%]   .nav-group[_ngcontent-%COMP%]:hover {\n  background: rgba(255, 255, 255, 0.07);\n}\n.nav-group-copy[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 11px;\n}\n.nav-group[_ngcontent-%COMP%]   svg[_ngcontent-%COMP%] {\n  width: 18px;\n  height: 18px;\n  flex: none;\n}\n.nav-group[_ngcontent-%COMP%]    > svg[_ngcontent-%COMP%] {\n  width: 13px;\n  height: 13px;\n  transition: transform 0.18s ease;\n}\n.nav-group.open[_ngcontent-%COMP%]    > svg[_ngcontent-%COMP%] {\n  transform: rotate(180deg);\n}\n.subnav[_ngcontent-%COMP%] {\n  display: none;\n  flex-direction: column;\n  gap: 1px;\n  margin: 1px 0 4px 15px;\n  padding-left: 11px;\n  border-left: 1px solid var(--%NS%line);\n}\n.subnav.open[_ngcontent-%COMP%] {\n  display: flex;\n}\n.flyout-header[_ngcontent-%COMP%] {\n  display: none;\n}\n.subnav[_ngcontent-%COMP%]   a[_ngcontent-%COMP%] {\n  min-height: 30px;\n  padding: 6px 9px;\n  gap: 8px;\n  border-radius: 9px;\n  color: var(--%NS%ink-soft);\n  font-size: 12px;\n  display: flex;\n  align-items: center;\n  text-decoration: none;\n}\n.subnav[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]:hover {\n  background: rgba(0, 0, 0, 0.06);\n}\n[data-theme=dark][_nghost-%COMP%]   .subnav[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]:hover, [data-theme=dark]   [_nghost-%COMP%]   .subnav[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]:hover {\n  background: rgba(255, 255, 255, 0.07);\n}\n.subnav[_ngcontent-%COMP%]   a.on[_ngcontent-%COMP%] {\n  background: color-mix(in srgb, var(--%NS%accent-2) 14%, transparent);\n  color: var(--%NS%accent-2);\n}\n.subnav[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]   i[_ngcontent-%COMP%] {\n  width: 15px;\n  text-align: center;\n  font-size: 11px;\n  flex: none;\n}\n.subnav[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]   svg[_ngcontent-%COMP%] {\n  width: 15px;\n  height: 15px;\n  flex: none;\n}\n.logout[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  justify-content: flex-start;\n  background: transparent;\n  color: var(--%NS%ink);\n  border: 1px solid var(--%NS%line);\n  margin-top: auto;\n  flex: none;\n}\n.logout[_ngcontent-%COMP%]   svg[_ngcontent-%COMP%] {\n  width: 18px;\n  height: 18px;\n  flex: none;\n}\n@media (min-width: 901px) {\n  aside.collapsed[_ngcontent-%COMP%] {\n    width: 76px;\n    padding-left: 14px;\n    padding-right: 14px;\n    overflow: visible;\n    z-index: 30;\n  }\n  aside.collapsed[_ngcontent-%COMP%]   .label-text[_ngcontent-%COMP%] {\n    display: none;\n  }\n  aside.collapsed[_ngcontent-%COMP%]   .brand[_ngcontent-%COMP%] {\n    justify-content: center;\n  }\n  aside.collapsed[_ngcontent-%COMP%]   nav[_ngcontent-%COMP%]   a[_ngcontent-%COMP%] {\n    justify-content: center;\n    padding: 10px;\n  }\n  aside.collapsed[_ngcontent-%COMP%]   nav[_ngcontent-%COMP%] {\n    margin-left: -14px;\n    margin-right: -14px;\n    padding-left: 14px;\n    padding-right: 14px;\n    overflow: visible;\n  }\n  aside.collapsed[_ngcontent-%COMP%]   .section-label[_ngcontent-%COMP%] {\n    display: none;\n  }\n  aside.collapsed[_ngcontent-%COMP%]   .logout[_ngcontent-%COMP%] {\n    justify-content: center;\n  }\n  aside.collapsed[_ngcontent-%COMP%]   .nav-group-wrapper[_ngcontent-%COMP%] {\n    position: relative;\n    width: 100%;\n  }\n  aside.collapsed[_ngcontent-%COMP%]   .nav-group[_ngcontent-%COMP%] {\n    justify-content: center;\n    padding: 10px;\n    border-radius: 12px;\n  }\n  aside.collapsed[_ngcontent-%COMP%]   .nav-group[_ngcontent-%COMP%]    > svg[_ngcontent-%COMP%] {\n    display: none;\n  }\n  aside.collapsed[_ngcontent-%COMP%]   .nav-group-copy[_ngcontent-%COMP%] {\n    justify-content: center;\n  }\n  aside.collapsed[_ngcontent-%COMP%]   .subnav[_ngcontent-%COMP%] {\n    display: none !important;\n  }\n  aside.collapsed[_ngcontent-%COMP%]   .nav-group-wrapper[_ngcontent-%COMP%]:hover   .nav-group[_ngcontent-%COMP%] {\n    background: rgba(0, 0, 0, 0.06);\n  }\n  [data-theme=dark][_nghost-%COMP%]   aside.collapsed[_ngcontent-%COMP%]   .nav-group-wrapper[_ngcontent-%COMP%]:hover   .nav-group[_ngcontent-%COMP%], [data-theme=dark]   [_nghost-%COMP%]   aside.collapsed[_ngcontent-%COMP%]   .nav-group-wrapper[_ngcontent-%COMP%]:hover   .nav-group[_ngcontent-%COMP%] {\n    background: rgba(255, 255, 255, 0.07);\n  }\n  aside.collapsed[_ngcontent-%COMP%]   .nav-group-wrapper[_ngcontent-%COMP%]:hover   .subnav[_ngcontent-%COMP%] {\n    display: flex !important;\n    flex-direction: column;\n    position: absolute;\n    left: calc(100% + 8px);\n    top: 0;\n    min-width: 220px;\n    max-height: calc(100vh - 40px);\n    overflow-y: auto;\n    background: #f7f1e4;\n    border: 1px solid var(--%NS%line);\n    border-radius: 14px;\n    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);\n    padding: 8px;\n    margin: 0;\n    z-index: 1000;\n  }\n  [data-theme=dark][_nghost-%COMP%]   aside.collapsed[_ngcontent-%COMP%]   .nav-group-wrapper[_ngcontent-%COMP%]:hover   .subnav[_ngcontent-%COMP%], [data-theme=dark]   [_nghost-%COMP%]   aside.collapsed[_ngcontent-%COMP%]   .nav-group-wrapper[_ngcontent-%COMP%]:hover   .subnav[_ngcontent-%COMP%] {\n    background: #1f1c16;\n    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.55);\n  }\n  aside.collapsed[_ngcontent-%COMP%]   .nav-group-wrapper.nav-group-bottom[_ngcontent-%COMP%]:hover   .subnav[_ngcontent-%COMP%] {\n    top: auto;\n    bottom: 0;\n  }\n  aside.collapsed[_ngcontent-%COMP%]   .nav-group-wrapper[_ngcontent-%COMP%]:hover   .subnav[_ngcontent-%COMP%]::before {\n    content: "";\n    position: absolute;\n    top: 0;\n    bottom: 0;\n    left: -12px;\n    width: 12px;\n  }\n  aside.collapsed[_ngcontent-%COMP%]   .nav-group-wrapper[_ngcontent-%COMP%]   .flyout-header[_ngcontent-%COMP%] {\n    display: block;\n    padding: 6px 10px 8px;\n    font-size: 11px;\n    font-weight: 700;\n    letter-spacing: 0.08em;\n    text-transform: uppercase;\n    color: var(--%NS%ink-soft);\n    border-bottom: 1px solid var(--%NS%line);\n    margin-bottom: 4px;\n  }\n  aside.collapsed[_ngcontent-%COMP%]   .nav-group-wrapper[_ngcontent-%COMP%]   .subnav[_ngcontent-%COMP%]   a[_ngcontent-%COMP%] {\n    justify-content: flex-start !important;\n    padding: 7px 10px !important;\n    min-height: 32px;\n    gap: 10px;\n    border-radius: 8px;\n    font-size: 12.5px;\n    font-weight: 600;\n    color: var(--%NS%ink);\n    white-space: nowrap;\n  }\n  aside.collapsed[_ngcontent-%COMP%]   .nav-group-wrapper[_ngcontent-%COMP%]   .subnav[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]   svg[_ngcontent-%COMP%], \n   aside.collapsed[_ngcontent-%COMP%]   .nav-group-wrapper[_ngcontent-%COMP%]   .subnav[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]   i[_ngcontent-%COMP%] {\n    width: 15px;\n    height: 15px;\n    font-size: 12px;\n    text-align: center;\n    flex: none;\n  }\n  aside.collapsed[_ngcontent-%COMP%]   .nav-group-wrapper[_ngcontent-%COMP%]   .subnav[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]:hover {\n    background: rgba(0, 0, 0, 0.06);\n  }\n  [data-theme=dark][_nghost-%COMP%]   aside.collapsed[_ngcontent-%COMP%]   .nav-group-wrapper[_ngcontent-%COMP%]   .subnav[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]:hover, [data-theme=dark]   [_nghost-%COMP%]   aside.collapsed[_ngcontent-%COMP%]   .nav-group-wrapper[_ngcontent-%COMP%]   .subnav[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]:hover {\n    background: rgba(255, 255, 255, 0.08);\n  }\n  aside.collapsed[_ngcontent-%COMP%]   .nav-group-wrapper[_ngcontent-%COMP%]   .subnav[_ngcontent-%COMP%]   a.on[_ngcontent-%COMP%] {\n    background: var(--%NS%ink);\n    color: var(--%NS%paper);\n  }\n}\n@media (max-width: 900px) {\n  aside[_ngcontent-%COMP%] {\n    position: fixed;\n    top: 0;\n    left: 0;\n    height: 100vh;\n    width: 264px;\n    transform: translateX(-100%);\n    box-shadow: var(--%NS%shadow);\n    z-index: 40;\n  }\n  aside[_ngcontent-%COMP%]:not(.collapsed) {\n    transform: translateX(0);\n  }\n  .backdrop[_ngcontent-%COMP%] {\n    position: fixed;\n    inset: 0;\n    background: rgba(10, 8, 5, 0.45);\n    z-index: 35;\n  }\n}\n@media (min-width: 901px) {\n  .backdrop[_ngcontent-%COMP%] {\n    display: none;\n  }\n}\n.content[_ngcontent-%COMP%] {\n  flex: 1;\n  min-width: 0;\n  display: flex;\n  flex-direction: column;\n}\n.body[_ngcontent-%COMP%] {\n  padding: 28px;\n}\n.topnav[_ngcontent-%COMP%] {\n  position: sticky;\n  top: 0;\n  z-index: 20;\n  display: flex;\n  align-items: center;\n  gap: 14px;\n  padding: 12px 24px;\n  border-bottom: 1px solid var(--%NS%line);\n  background: rgba(244, 239, 230, 0.92);\n  -webkit-backdrop-filter: blur(10px);\n  backdrop-filter: blur(10px);\n}\n[data-theme=dark][_nghost-%COMP%]   .topnav[_ngcontent-%COMP%], [data-theme=dark]   [_nghost-%COMP%]   .topnav[_ngcontent-%COMP%] {\n  background: rgba(21, 19, 15, 0.92);\n}\n.icon-btn[_ngcontent-%COMP%] {\n  position: relative;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  width: 40px;\n  height: 40px;\n  border-radius: 12px;\n  border: 1px solid var(--%NS%line);\n  background: var(--%NS%card);\n  color: var(--%NS%ink);\n  cursor: pointer;\n  flex: none;\n}\n.icon-btn[_ngcontent-%COMP%]:hover {\n  background: var(--%NS%paper-2);\n}\n.icon-btn[_ngcontent-%COMP%]   svg[_ngcontent-%COMP%] {\n  width: 19px;\n  height: 19px;\n}\n.hamburger[_ngcontent-%COMP%] {\n  margin-right: 2px;\n}\n.search[_ngcontent-%COMP%] {\n  position: relative;\n  flex: 1;\n  max-width: 480px;\n  display: flex;\n  align-items: center;\n}\n.search[_ngcontent-%COMP%]   svg[_ngcontent-%COMP%] {\n  position: absolute;\n  left: 13px;\n  width: 17px;\n  height: 17px;\n  color: var(--%NS%ink-soft);\n  pointer-events: none;\n}\n.search[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] {\n  width: 100%;\n  padding: 10px 14px 10px 38px;\n  border-radius: 999px;\n  border: 1px solid var(--%NS%line);\n  background: var(--%NS%card);\n  color: var(--%NS%ink);\n  font: inherit;\n}\n.search[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:focus {\n  outline: 2px solid var(--%NS%accent);\n  outline-offset: 1px;\n}\n.dropdown[_ngcontent-%COMP%] {\n  position: absolute;\n  top: calc(100% + 8px);\n  right: 0;\n  background: var(--%NS%card);\n  border: 1px solid var(--%NS%line);\n  border-radius: 14px;\n  box-shadow: var(--%NS%shadow);\n  overflow: hidden;\n  z-index: 30;\n}\n.search-results[_ngcontent-%COMP%] {\n  left: 0;\n  right: auto;\n  width: 100%;\n  max-height: 360px;\n  overflow-y: auto;\n  padding: 6px;\n}\n.search-results[_ngcontent-%COMP%]   a[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  padding: 9px 10px;\n  border-radius: 10px;\n}\n.search-results[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]:hover {\n  background: var(--%NS%paper-2);\n}\n.search-results[_ngcontent-%COMP%]   svg[_ngcontent-%COMP%] {\n  width: 16px;\n  height: 16px;\n  flex: none;\n  color: var(--%NS%ink-soft);\n}\n.search-results[_ngcontent-%COMP%]   .r-label[_ngcontent-%COMP%] {\n  display: block;\n  font-weight: 600;\n  font-size: 14px;\n}\n.search-results[_ngcontent-%COMP%]   .r-section[_ngcontent-%COMP%] {\n  display: block;\n  font-size: 11px;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n}\n.empty-note[_ngcontent-%COMP%] {\n  padding: 14px;\n  font-size: 13px;\n  margin: 0;\n}\n.top-actions[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  margin-left: auto;\n}\n.dropdown-wrap[_ngcontent-%COMP%] {\n  position: relative;\n}\n.badge[_ngcontent-%COMP%] {\n  position: absolute;\n  top: -4px;\n  right: -4px;\n  min-width: 17px;\n  height: 17px;\n  padding: 0 4px;\n  border-radius: 999px;\n  background: var(--%NS%accent);\n  color: #fff;\n  font-size: 10px;\n  font-weight: 700;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  line-height: 1;\n}\n.notif-panel[_ngcontent-%COMP%] {\n  width: 340px;\n  max-width: 86vw;\n}\n.dropdown-head[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 12px 14px;\n  border-bottom: 1px solid var(--%NS%line);\n  font-weight: 700;\n  font-size: 14px;\n}\n.link-btn[_ngcontent-%COMP%] {\n  background: none;\n  border: 0;\n  color: var(--%NS%accent);\n  font-weight: 600;\n  font-size: 12px;\n  cursor: pointer;\n}\n.notif-panel[_ngcontent-%COMP%]   ul[_ngcontent-%COMP%] {\n  list-style: none;\n  margin: 0;\n  padding: 4px;\n  max-height: 360px;\n  overflow-y: auto;\n}\n.notif-panel[_ngcontent-%COMP%]   li[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 10px;\n  padding: 10px;\n  border-radius: 10px;\n  cursor: pointer;\n}\n.notif-panel[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]:hover {\n  background: var(--%NS%paper-2);\n}\n.notif-panel[_ngcontent-%COMP%]   li.unread[_ngcontent-%COMP%]   .n-title[_ngcontent-%COMP%] {\n  font-weight: 700;\n}\n.dot[_ngcontent-%COMP%] {\n  width: 8px;\n  height: 8px;\n  border-radius: 999px;\n  background: var(--%NS%accent);\n  margin-top: 6px;\n  flex: none;\n}\n.dot.hide[_ngcontent-%COMP%] {\n  background: transparent;\n}\n.n-body[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  margin: 0;\n}\n.n-title[_ngcontent-%COMP%] {\n  font-size: 13.5px;\n}\n.n-msg[_ngcontent-%COMP%] {\n  font-size: 12.5px;\n  margin-top: 2px !important;\n}\n.n-time[_ngcontent-%COMP%] {\n  font-size: 11px;\n  margin-top: 4px !important;\n}\n.profile-btn[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 5px 10px 5px 5px;\n  border-radius: 999px;\n  border: 1px solid var(--%NS%line);\n  background: var(--%NS%card);\n  color: var(--%NS%ink);\n  cursor: pointer;\n}\n.profile-btn[_ngcontent-%COMP%]:hover {\n  background: var(--%NS%paper-2);\n}\n.profile-btn[_ngcontent-%COMP%]   svg[_ngcontent-%COMP%] {\n  width: 14px;\n  height: 14px;\n  color: var(--%NS%ink-soft);\n}\n.avatar[_ngcontent-%COMP%] {\n  width: 30px;\n  height: 30px;\n  border-radius: 999px;\n  background: var(--%NS%ink);\n  color: var(--%NS%paper);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 12px;\n  font-weight: 700;\n  flex: none;\n}\n.who[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  align-items: flex-start;\n  line-height: 1.2;\n}\n.who-name[_ngcontent-%COMP%] {\n  font-weight: 700;\n  font-size: 13px;\n}\n.who-role[_ngcontent-%COMP%] {\n  font-size: 11px;\n}\n.profile-panel[_ngcontent-%COMP%] {\n  width: 240px;\n  padding: 6px;\n}\n.profile-info[_ngcontent-%COMP%] {\n  padding: 10px 10px 12px;\n  border-bottom: 1px solid var(--%NS%line);\n  margin-bottom: 6px;\n}\n.profile-info[_ngcontent-%COMP%]   .who-name[_ngcontent-%COMP%] {\n  font-size: 14px;\n}\n.profile-info[_ngcontent-%COMP%]   .email[_ngcontent-%COMP%] {\n  font-size: 12px;\n  margin: 2px 0 6px;\n}\n.profile-panel[_ngcontent-%COMP%]   a[_ngcontent-%COMP%] {\n  display: block;\n  padding: 9px 10px;\n  border-radius: 10px;\n  font-weight: 600;\n  font-size: 13.5px;\n}\n.profile-panel[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]:hover {\n  background: var(--%NS%paper-2);\n}\n.logout-btn[_ngcontent-%COMP%] {\n  width: 100%;\n  text-align: left;\n  background: none;\n  border: 0;\n  padding: 9px 10px;\n  border-radius: 10px;\n  font-weight: 600;\n  font-size: 13.5px;\n  color: var(--%NS%danger);\n  cursor: pointer;\n}\n.logout-btn[_ngcontent-%COMP%]:hover {\n  background: var(--%NS%paper-2);\n}\n@media (max-width: 720px) {\n  .who[_ngcontent-%COMP%] {\n    display: none;\n  }\n  .topnav[_ngcontent-%COMP%] {\n    padding: 8px 12px;\n    gap: 8px;\n    width: 100%;\n    box-sizing: border-box;\n  }\n  .icon-btn[_ngcontent-%COMP%] {\n    width: 36px;\n    height: 36px;\n    border-radius: 10px;\n    flex: none;\n  }\n  .icon-btn[_ngcontent-%COMP%]   svg[_ngcontent-%COMP%] {\n    width: 17px;\n    height: 17px;\n  }\n  .top-actions[_ngcontent-%COMP%] {\n    gap: 6px;\n    flex: none;\n  }\n  .profile-btn[_ngcontent-%COMP%] {\n    height: 36px;\n    padding: 3px 6px 3px 3px;\n    gap: 4px;\n    flex: none;\n  }\n  .profile-btn[_ngcontent-%COMP%]   svg[_ngcontent-%COMP%] {\n    width: 12px;\n    height: 12px;\n  }\n  .avatar[_ngcontent-%COMP%] {\n    width: 28px;\n    height: 28px;\n    font-size: 11px;\n  }\n  .search[_ngcontent-%COMP%] {\n    position: relative;\n    flex: 1;\n    min-width: 0;\n  }\n  .search[_ngcontent-%COMP%]   svg[_ngcontent-%COMP%] {\n    left: 10px;\n    width: 15px;\n    height: 15px;\n  }\n  .search[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] {\n    height: 36px;\n    padding: 0 10px 0 32px;\n    font-size: 13px;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n    overflow: hidden;\n  }\n  .search-results[_ngcontent-%COMP%] {\n    position: absolute;\n    top: calc(100% + 8px);\n    left: 0;\n    width: min(340px, 100vw - 24px);\n    max-width: calc(100vw - 24px);\n  }\n  .notif-panel[_ngcontent-%COMP%] {\n    max-width: calc(100vw - 24px);\n    right: -40px;\n  }\n  .profile-panel[_ngcontent-%COMP%] {\n    max-width: calc(100vw - 24px);\n    right: 0;\n  }\n  .body[_ngcontent-%COMP%] {\n    padding: 16px 12px;\n  }\n}\n@media (max-width: 480px) {\n  .topnav[_ngcontent-%COMP%] {\n    padding: 8px 10px;\n    gap: 6px;\n  }\n  .top-actions[_ngcontent-%COMP%] {\n    gap: 4px;\n  }\n  .icon-btn[_ngcontent-%COMP%] {\n    width: 34px;\n    height: 34px;\n  }\n  .profile-btn[_ngcontent-%COMP%] {\n    height: 34px;\n    padding: 2px 4px 2px 2px;\n  }\n  .avatar[_ngcontent-%COMP%] {\n    width: 26px;\n    height: 26px;\n    font-size: 10.5px;\n  }\n  .profile-btn[_ngcontent-%COMP%]   svg[_ngcontent-%COMP%] {\n    display: none;\n  }\n  .search[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] {\n    height: 34px;\n    padding: 0 8px 0 28px;\n    font-size: 12.5px;\n  }\n  .search[_ngcontent-%COMP%]   svg[_ngcontent-%COMP%] {\n    left: 9px;\n    width: 13px;\n    height: 13px;\n  }\n  .notif-panel[_ngcontent-%COMP%] {\n    right: -80px;\n  }\n}\n.group-divider[_ngcontent-%COMP%] {\n  height: 1px;\n  margin: 8px 0 6px;\n  background: var(--%NS%line);\n}\n.subnav-title[_ngcontent-%COMP%] {\n  padding: 2px 8px 0;\n  font-size: 10px;\n  letter-spacing: 0.08em;\n  text-transform: uppercase;\n  color: var(--%NS%ink-soft);\n  font-weight: 700;\n}\n.grouped-subnav[_ngcontent-%COMP%] {\n  margin-top: 0;\n}\n.grouped-subnav[_ngcontent-%COMP%]   .subnav-title[_ngcontent-%COMP%] {\n  margin-top: 2px;\n}\n.grouped-subnav[_ngcontent-%COMP%]   a[_ngcontent-%COMP%] {\n  padding-left: 10px;\n}\n.grouped-subnav[_ngcontent-%COMP%]   .label-text[_ngcontent-%COMP%] {\n  overflow: visible;\n}\n/*# sourceMappingURL=seller-shell.component.css.map */'] });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i0.\u0275setClassMetadata(SellerShellComponent, [{
    type: Component,
    args: [{ selector: "app-seller-shell", imports: [RouterOutlet, RouterLink, RouterLinkActive, NgTemplateOutlet], template: `
    <div class="dash">
      @if (mobileOpen()) {
        <div class="backdrop" (click)="collapsed.set(true)"></div>
      }

      <aside [class.collapsed]="collapsed()">
        <div class="brand-row">
          <a [routerLink]="tenantLink()" class="brand serif" (click)="onNavigate()">
            <span class="mark">M</span><span class="label-text">arketHub</span>
          </a>
        </div>
        <p class="muted subtitle label-text">Tenant console</p>

        <nav>
          <a
            [routerLink]="tenantLink()"
            routerLinkActive="on"
            [routerLinkActiveOptions]="{ exact: true }"
            (click)="onNavigate()"
            [title]="collapsed() ? 'Dashboard' : ''"
          >
            <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: 'home' }" />
            <span class="label-text">Dashboard</span>
          </a>

          @if (canViewAccounting()) {
          <p class="section-label label-text">Accounting</p>
          <div class="nav-group-wrapper" [class.open]="accountingOpen()">
            <button type="button" class="nav-group" [class.open]="accountingOpen()" (click)="toggleAccounting()" aria-label="Toggle accounting menu" [attr.aria-expanded]="accountingOpen()" [title]="collapsed() ? 'Finance & accounts' : ''">
              <span class="nav-group-copy">
                <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: 'finance' }" />
                <span class="label-text">Finance & accounts</span>
              </span>
              <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: 'chevron' }" />
            </button>
            <div class="subnav" [class.open]="accountingOpen()">
              <div class="flyout-header">Finance & accounts</div>
              @for (item of accountingItems; track item.key) {
                <a [routerLink]="tenantLink(item.key)" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }" (click)="onNavigate()" [title]="collapsed() ? item.label : ''">
                  <i [class]="item.faIcon || ''" aria-hidden="true"></i><span>{{ item.label }}</span>
                </a>
              }
            </div>
          </div>
          }

          @if (canViewSales()) {
          <p class="section-label label-text">Sales</p>
          <div class="nav-group-wrapper" [class.open]="salesOpen()">
            <button type="button" class="nav-group" [class.open]="salesOpen()" (click)="toggleSales()" aria-label="Toggle sales menu" [attr.aria-expanded]="salesOpen()" [title]="collapsed() ? 'Sales workspace' : ''">
              <span class="nav-group-copy">
                <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: 'sales' }" />
                <span class="label-text">Sales workspace</span>
              </span>
              <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: 'chevron' }" />
            </button>
            <div class="subnav" [class.open]="salesOpen()">
              <div class="flyout-header">Sales workspace</div>
              @for (item of salesItems; track item.key) {
                <a [routerLink]="tenantLink(item.key)" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }" (click)="onNavigate()" [title]="collapsed() ? item.label : ''">
                  <i [class]="item.faIcon || ''" aria-hidden="true"></i><span>{{ item.label }}</span>
                </a>
              }
            </div>
          </div>
          }

          @if (canViewOperations()) {
          <p class="section-label label-text">Operations</p>
          <div class="nav-group-wrapper" [class.open]="operationsOpen()">
            <button type="button" class="nav-group" [class.open]="operationsOpen()" (click)="toggleOperations()" aria-label="Toggle operations menu" [attr.aria-expanded]="operationsOpen()" [title]="collapsed() ? 'Operations' : ''">
              <span class="nav-group-copy">
                <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: 'operations' }" />
                <span class="label-text">Operations</span>
              </span>
              <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: 'chevron' }" />
            </button>
            <div class="subnav" [class.open]="operationsOpen()">
              <div class="flyout-header">Operations</div>
              @for (item of operationsItems; track item.key) {
                <a [routerLink]="tenantLink(item.key)" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }" (click)="onNavigate()" [title]="collapsed() ? item.label : ''"><i [class]="item.faIcon || ''" aria-hidden="true"></i><span>{{ item.label }}</span></a>
              }
            </div>
          </div>
          }

          @if (canViewMarketing()) {
          <p class="section-label label-text">Marketing</p>
          <div class="nav-group-wrapper" [class.open]="marketingOpen()">
            <button type="button" class="nav-group" [class.open]="marketingOpen()" (click)="toggleMarketing()" aria-label="Toggle marketing menu" [attr.aria-expanded]="marketingOpen()" [title]="collapsed() ? 'Marketing' : ''">
              <span class="nav-group-copy">
                <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: 'marketing' }" />
                <span class="label-text">Marketing</span>
              </span>
              <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: 'chevron' }" />
            </button>
            <div class="subnav" [class.open]="marketingOpen()">
              <div class="flyout-header">Marketing</div>
              @for (item of marketingItems; track item.key) {
                <a [routerLink]="tenantLink(item.key)" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }" (click)="onNavigate()" [title]="collapsed() ? item.label : ''"><i [class]="item.faIcon || ''" aria-hidden="true"></i><span>{{ item.label }}</span></a>
              }
            </div>
          </div>
          }

          <p class="section-label label-text">Commerce</p>
          <div class="nav-group-wrapper" [class.open]="commerceOpen()">
            <button type="button" class="nav-group" [class.open]="commerceOpen()" (click)="toggleCommerce()" aria-label="Toggle commerce menu" [attr.aria-expanded]="commerceOpen()" [title]="collapsed() ? 'Commerce' : ''">
              <span class="nav-group-copy">
                <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: 'store' }" />
                <span class="label-text">Commerce</span>
              </span>
              <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: 'chevron' }" />
            </button>
            <div class="subnav grouped-subnav" [class.open]="commerceOpen()">
              <div class="flyout-header">Commerce</div>
              @for (c of commerceItems; track c.key) {
                <a [routerLink]="tenantLink(c.key)" routerLinkActive="on" (click)="onNavigate()" [title]="collapsed() ? c.label : ''">
                  <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: c.icon }" />
                  <span>{{ c.label }}</span>
                </a>
              }
            </div>
          </div>

          @if (isOwner()) {
            <p class="section-label label-text">Admin</p>
            <div class="nav-group-wrapper nav-group-bottom" [class.open]="adminOpen()">
              <button type="button" class="nav-group" [class.open]="adminOpen()" (click)="toggleAdmin()" aria-label="Toggle admin menu" [attr.aria-expanded]="adminOpen()" [title]="collapsed() ? 'Admin' : ''">
                <span class="nav-group-copy">
                  <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: 'settings' }" />
                  <span class="label-text">Admin</span>
                </span>
                <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: 'chevron' }" />
              </button>
              <div class="subnav grouped-subnav" [class.open]="adminOpen()">
                <div class="flyout-header">Admin</div>
                @for (a of adminItems; track a.key) {
                  <a [routerLink]="tenantLink(a.key)" routerLinkActive="on" (click)="onNavigate()" [title]="collapsed() ? a.label : ''">
                    <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: a.icon }" />
                    <span>{{ a.label }}</span>
                  </a>
                }
              </div>
            </div>
          }

          <p class="section-label label-text">Support</p>
          <a [routerLink]="tenantLink('support')" routerLinkActive="on" (click)="onNavigate()" [title]="collapsed() ? 'Help centre' : ''">
            <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: 'lifebuoy' }" />
            <span class="label-text">Help centre</span>
          </a>
        </nav>

        <button class="btn ghost logout" (click)="auth.logout()" [title]="collapsed() ? 'Log out' : ''">
          <ng-container [ngTemplateOutlet]="miniIcon" [ngTemplateOutletContext]="{ $implicit: 'logout' }" />
          <span class="label-text">Log out</span>
        </button>
      </aside>

      <div class="content">
        <header class="topnav">
          <button type="button" class="icon-btn hamburger" (click)="toggleSidebar()" [attr.aria-expanded]="!collapsed()" aria-label="Toggle sidebar">
            <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: 'menu' }" />
          </button>

          <div class="search" (click)="$event.stopPropagation()">
            <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: 'search' }" />
            <input
              type="text"
              placeholder="Search\u2026"
              [value]="searchTerm()"
              (input)="onSearchInput($event)"
              (focus)="onSearchFocus()"
              (keydown.enter)="goToFirstResult()"
              (keydown.escape)="clearSearch()"
              aria-label="Search the tenant console"
            />
            @if (searchTerm() && showSearchPanel()) {
              <div class="dropdown search-results">
                @if (searchResults().length) {
                  @for (r of searchResults(); track r.path) {
                    <a [routerLink]="r.path" (click)="clearSearch()">
                      <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: r.icon }" />
                      <span>
                        <span class="r-label">{{ r.label }}</span>
                        <span class="r-section muted">{{ r.section }}</span>
                      </span>
                    </a>
                  }
                } @else {
                  <p class="empty-note muted">No matches for "{{ searchTerm() }}"</p>
                }
              </div>
            }
          </div>

          <div class="top-actions">
            <div class="dropdown-wrap" (click)="$event.stopPropagation()">
              <button type="button" class="icon-btn" (click)="toggleNotifications()" aria-label="Notifications" [attr.aria-expanded]="notifOpen()">
                <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: 'bell' }" />
                @if (unreadCount() > 0) { <span class="badge">{{ unreadCount() }}</span> }
              </button>
              @if (notifOpen()) {
                <div class="dropdown notif-panel">
                  <div class="dropdown-head">
                    <span>Notifications</span>
                    @if (unreadCount() > 0) {
                      <button type="button" class="link-btn" (click)="markAllRead()">Mark all read</button>
                    }
                  </div>
                  @if (notifications().length) {
                    <ul>
                      @for (n of notifications(); track n.id) {
                        <li [class.unread]="!n.read" (click)="markRead(n.id)">
                          <span class="dot" [class.hide]="n.read"></span>
                          <div class="n-body">
                            <p class="n-title">{{ n.title }}</p>
                            <p class="n-msg muted">{{ n.message }}</p>
                            <p class="n-time muted">{{ n.time }}</p>
                          </div>
                        </li>
                      }
                    </ul>
                  } @else {
                    <p class="empty-note muted">You're all caught up.</p>
                  }
                </div>
              }
            </div>

            <button
              type="button"
              class="icon-btn"
              (click)="theme.toggle()"
              [attr.aria-label]="theme.theme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
            >
              <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: theme.theme() === 'dark' ? 'sun' : 'moon' }" />
            </button>

            <div class="dropdown-wrap" (click)="$event.stopPropagation()">
              <button type="button" class="profile-btn" (click)="toggleProfile()" [attr.aria-expanded]="profileOpen()">
                <span class="avatar">{{ initials() }}</span>
                <span class="who">
                  <span class="who-name">{{ auth.user()?.name }}</span>
                  <span class="who-role muted">{{ roleLabel() }}</span>
                </span>
                <ng-container [ngTemplateOutlet]="navIcon" [ngTemplateOutletContext]="{ $implicit: 'chevron' }" />
              </button>
              @if (profileOpen()) {
                <div class="dropdown profile-panel">
                  <div class="profile-info">
                    <p class="who-name">{{ auth.user()?.name }}</p>
                    <p class="muted email">{{ auth.user()?.email }}</p>
                    @if (auth.user()?.tenant_name) {
                      <p class="pill">{{ auth.user()?.tenant_name }}</p>
                    }
                  </div>
                  <a [routerLink]="tenantLink()" (click)="closeMenus()">Dashboard</a>
                  @if (isOwner()) {
                    <a [routerLink]="tenantLink('settings')" (click)="closeMenus()">Account settings</a>
                  }
                  <button type="button" class="logout-btn" (click)="auth.logout()">Log out</button>
                </div>
              }
            </div>
          </div>
        </header>

        <section class="body"><router-outlet /></section>
      </div>
    </div>

    <ng-template #navIcon let-name>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        @switch (name) {
          @case ('home') {
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
          }
          @case ('lifebuoy') {
            <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><line x1="4.9" y1="4.9" x2="9.2" y2="9.2" /><line x1="14.8" y1="14.8" x2="19.1" y2="19.1" /><line x1="14.8" y1="9.2" x2="19.1" y2="4.9" /><line x1="4.9" y1="19.1" x2="9.2" y2="14.8" />
          }
          @case ('finance') {
            <circle cx="12" cy="12" r="9" /><path d="M12 7v10M9.5 9.5c0-1.1 1.1-2 2.5-2s2.5.9 2.5 2c0 2.5-5 1.5-5 4 0 1.1 1.1 2 2.5 2s2.5-.9 2.5-2" />
          }
          @case ('sales') {
            <polyline points="3 17 9 11 13 15 21 6" /><polyline points="14 6 21 6 21 13" />
          }
          @case ('operations') {
            <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
          }
          @case ('marketing') {
            <path d="M3 11v3a1 1 0 0 0 1 1h3l4 4V6L7 10H4a1 1 0 0 0-1 1z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" />
          }
          @case ('store') {
            <path d="M3 9l1.5-5h15L21 9" /><path d="M5 9v11h14V9" /><path d="M9.5 20v-5.5h5V20" />
          }
          @case ('orders') {
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
          }
          @case ('products') {
            <path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3.24L4 3v5.59a2 2 0 0 0 .59 1.42l9.58 9.58a2 2 0 0 0 2.83 0l3.59-3.59a2 2 0 0 0 0-2.59z" /><circle cx="8" cy="8" r="1.2" />
          }
          @case ('inventory') {
            <rect x="3" y="4" width="18" height="5" rx="1" /><path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9" /><line x1="10" y1="13" x2="14" y2="13" />
          }
          @case ('ads') {
            <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" />
          }
          @case ('analytics') {
            <line x1="4" y1="20" x2="20" y2="20" /><rect x="6" y="11" width="3" height="7" /><rect x="13" y="7" width="3" height="11" /><rect x="17.5" y="13" width="3" height="5" />
          }
          @case ('users') {
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          }
          @case ('settings') {
            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .7.4 1.31 1.05 1.6.31.14.65.22 1 .25l.5.01a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          }
          @case ('backups') {
            <ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
          }
          @case ('domains') {
            <circle cx="12" cy="12" r="9" /><line x1="3" y1="12" x2="21" y2="12" /><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z" />
          }
          @case ('apikeys') {
            <circle cx="7.5" cy="15.5" r="4.5" /><path d="M10.9 12.1 20 3l1.5 1.5L20 6l1.5 1.5L20 9" />
          }
          @case ('webhooks') {
            <circle cx="6" cy="6" r="3" /><circle cx="18" cy="6" r="3" /><circle cx="12" cy="18" r="3" /><path d="M8.5 7.5 10 15M15.5 7.5 14 15" />
          }
          @case ('ai') {
            <path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" /><circle cx="12" cy="12" r="3.2" />
          }
          @case ('search') {
            <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          }
          @case ('bell') {
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
          }
          @case ('sun') {
            <circle cx="12" cy="12" r="4.2" /><path d="M12 2v2.2M12 19.8V22M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2 12h2.2M19.8 12H22M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" />
          }
          @case ('moon') {
            <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
          }
          @case ('chevron') {
            <polyline points="6 9 12 15 18 9" />
          }
          @case ('menu') {
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          }
        }
      </svg>
    </ng-template>

    <ng-template #miniIcon let-name>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        @switch (name) {
          @case ('logout') {
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          }
        }
      </svg>
    </ng-template>
  `, styles: ['/* angular:styles/component:scss;2e461d1efebc17a7;C:\\xampp\\htdocs\\market\\frontend\\src\\app\\layout\\seller-shell.component.ts */\n.dash {\n  display: flex;\n  min-height: 100vh;\n  position: relative;\n  background: var(--paper);\n}\naside {\n  width: 240px;\n  flex: none;\n  position: sticky;\n  top: 0;\n  height: 100vh;\n  overflow: hidden;\n  padding: 24px 16px 16px 16px;\n  border-right: 1px solid var(--line);\n  background: #f7f1e4;\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n  transition: width 0.2s ease, transform 0.2s ease;\n  z-index: 10;\n}\n:host-context([data-theme=dark]) aside {\n  background: #1a1712;\n}\n.brand-row {\n  display: flex;\n  align-items: center;\n  flex: none;\n}\n.brand {\n  font-size: 22px;\n  display: flex;\n  align-items: center;\n  gap: 2px;\n}\n.brand .mark {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  width: 30px;\n  height: 30px;\n  border-radius: 9px;\n  background: var(--ink);\n  color: var(--paper);\n  font-size: 16px;\n  flex: none;\n}\n.subtitle {\n  margin: 2px 0 4px;\n  font-size: 13px;\n  flex: none;\n}\nnav {\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n  margin: 8px -16px 0 -16px;\n  padding: 0 16px 8px 16px;\n  overflow-y: auto;\n  overflow-x: hidden;\n  flex: 1 1 auto;\n  min-height: 0;\n  scrollbar-width: thin;\n  scrollbar-color: rgba(0, 0, 0, 0.18) transparent;\n}\n:host-context([data-theme=dark]) nav {\n  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;\n}\nnav::-webkit-scrollbar,\naside::-webkit-scrollbar {\n  width: 4px;\n}\nnav::-webkit-scrollbar-track,\naside::-webkit-scrollbar-track {\n  background: transparent;\n}\nnav::-webkit-scrollbar-thumb,\naside::-webkit-scrollbar-thumb {\n  background: rgba(0, 0, 0, 0.18);\n  border-radius: 999px;\n}\n:host-context([data-theme=dark]) nav::-webkit-scrollbar-thumb,\n:host-context([data-theme=dark]) aside::-webkit-scrollbar-thumb {\n  background: rgba(255, 255, 255, 0.2);\n}\nnav::-webkit-scrollbar-thumb:hover,\naside::-webkit-scrollbar-thumb:hover {\n  background: rgba(0, 0, 0, 0.35);\n}\n:host-context([data-theme=dark]) nav::-webkit-scrollbar-thumb:hover,\n:host-context([data-theme=dark]) aside::-webkit-scrollbar-thumb:hover {\n  background: rgba(255, 255, 255, 0.38);\n}\n.section-label {\n  margin: 14px 10px 4px;\n  font-size: 11px;\n  letter-spacing: 0.08em;\n  text-transform: uppercase;\n  color: var(--ink-soft);\n  font-weight: 700;\n  white-space: nowrap;\n}\nnav a {\n  display: flex;\n  align-items: center;\n  gap: 11px;\n  padding: 9px 12px;\n  border-radius: 12px;\n  font-weight: 600;\n  color: var(--ink);\n  white-space: nowrap;\n}\nnav a svg {\n  width: 18px;\n  height: 18px;\n  flex: none;\n}\nnav a:hover {\n  background: rgba(0, 0, 0, 0.06);\n}\n:host-context([data-theme=dark]) nav a:hover {\n  background: rgba(255, 255, 255, 0.07);\n}\nnav a.on {\n  background: var(--ink);\n  color: var(--paper);\n}\n.nav-group {\n  width: 100%;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 8px;\n  padding: 9px 10px;\n  border: 0;\n  border-radius: 12px;\n  background: transparent;\n  color: var(--ink);\n  font: inherit;\n  font-size: 13.5px;\n  font-weight: 700;\n  cursor: pointer;\n}\n.nav-group:hover {\n  background: rgba(0, 0, 0, 0.06);\n}\n:host-context([data-theme=dark]) .nav-group:hover {\n  background: rgba(255, 255, 255, 0.07);\n}\n.nav-group-copy {\n  display: flex;\n  align-items: center;\n  gap: 11px;\n}\n.nav-group svg {\n  width: 18px;\n  height: 18px;\n  flex: none;\n}\n.nav-group > svg {\n  width: 13px;\n  height: 13px;\n  transition: transform 0.18s ease;\n}\n.nav-group.open > svg {\n  transform: rotate(180deg);\n}\n.subnav {\n  display: none;\n  flex-direction: column;\n  gap: 1px;\n  margin: 1px 0 4px 15px;\n  padding-left: 11px;\n  border-left: 1px solid var(--line);\n}\n.subnav.open {\n  display: flex;\n}\n.flyout-header {\n  display: none;\n}\n.subnav a {\n  min-height: 30px;\n  padding: 6px 9px;\n  gap: 8px;\n  border-radius: 9px;\n  color: var(--ink-soft);\n  font-size: 12px;\n  display: flex;\n  align-items: center;\n  text-decoration: none;\n}\n.subnav a:hover {\n  background: rgba(0, 0, 0, 0.06);\n}\n:host-context([data-theme=dark]) .subnav a:hover {\n  background: rgba(255, 255, 255, 0.07);\n}\n.subnav a.on {\n  background: color-mix(in srgb, var(--accent-2) 14%, transparent);\n  color: var(--accent-2);\n}\n.subnav a i {\n  width: 15px;\n  text-align: center;\n  font-size: 11px;\n  flex: none;\n}\n.subnav a svg {\n  width: 15px;\n  height: 15px;\n  flex: none;\n}\n.logout {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  justify-content: flex-start;\n  background: transparent;\n  color: var(--ink);\n  border: 1px solid var(--line);\n  margin-top: auto;\n  flex: none;\n}\n.logout svg {\n  width: 18px;\n  height: 18px;\n  flex: none;\n}\n@media (min-width: 901px) {\n  aside.collapsed {\n    width: 76px;\n    padding-left: 14px;\n    padding-right: 14px;\n    overflow: visible;\n    z-index: 30;\n  }\n  aside.collapsed .label-text {\n    display: none;\n  }\n  aside.collapsed .brand {\n    justify-content: center;\n  }\n  aside.collapsed nav a {\n    justify-content: center;\n    padding: 10px;\n  }\n  aside.collapsed nav {\n    margin-left: -14px;\n    margin-right: -14px;\n    padding-left: 14px;\n    padding-right: 14px;\n    overflow: visible;\n  }\n  aside.collapsed .section-label {\n    display: none;\n  }\n  aside.collapsed .logout {\n    justify-content: center;\n  }\n  aside.collapsed .nav-group-wrapper {\n    position: relative;\n    width: 100%;\n  }\n  aside.collapsed .nav-group {\n    justify-content: center;\n    padding: 10px;\n    border-radius: 12px;\n  }\n  aside.collapsed .nav-group > svg {\n    display: none;\n  }\n  aside.collapsed .nav-group-copy {\n    justify-content: center;\n  }\n  aside.collapsed .subnav {\n    display: none !important;\n  }\n  aside.collapsed .nav-group-wrapper:hover .nav-group {\n    background: rgba(0, 0, 0, 0.06);\n  }\n  :host-context([data-theme=dark]) aside.collapsed .nav-group-wrapper:hover .nav-group {\n    background: rgba(255, 255, 255, 0.07);\n  }\n  aside.collapsed .nav-group-wrapper:hover .subnav {\n    display: flex !important;\n    flex-direction: column;\n    position: absolute;\n    left: calc(100% + 8px);\n    top: 0;\n    min-width: 220px;\n    max-height: calc(100vh - 40px);\n    overflow-y: auto;\n    background: #f7f1e4;\n    border: 1px solid var(--line);\n    border-radius: 14px;\n    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);\n    padding: 8px;\n    margin: 0;\n    z-index: 1000;\n  }\n  :host-context([data-theme=dark]) aside.collapsed .nav-group-wrapper:hover .subnav {\n    background: #1f1c16;\n    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.55);\n  }\n  aside.collapsed .nav-group-wrapper.nav-group-bottom:hover .subnav {\n    top: auto;\n    bottom: 0;\n  }\n  aside.collapsed .nav-group-wrapper:hover .subnav::before {\n    content: "";\n    position: absolute;\n    top: 0;\n    bottom: 0;\n    left: -12px;\n    width: 12px;\n  }\n  aside.collapsed .nav-group-wrapper .flyout-header {\n    display: block;\n    padding: 6px 10px 8px;\n    font-size: 11px;\n    font-weight: 700;\n    letter-spacing: 0.08em;\n    text-transform: uppercase;\n    color: var(--ink-soft);\n    border-bottom: 1px solid var(--line);\n    margin-bottom: 4px;\n  }\n  aside.collapsed .nav-group-wrapper .subnav a {\n    justify-content: flex-start !important;\n    padding: 7px 10px !important;\n    min-height: 32px;\n    gap: 10px;\n    border-radius: 8px;\n    font-size: 12.5px;\n    font-weight: 600;\n    color: var(--ink);\n    white-space: nowrap;\n  }\n  aside.collapsed .nav-group-wrapper .subnav a svg,\n  aside.collapsed .nav-group-wrapper .subnav a i {\n    width: 15px;\n    height: 15px;\n    font-size: 12px;\n    text-align: center;\n    flex: none;\n  }\n  aside.collapsed .nav-group-wrapper .subnav a:hover {\n    background: rgba(0, 0, 0, 0.06);\n  }\n  :host-context([data-theme=dark]) aside.collapsed .nav-group-wrapper .subnav a:hover {\n    background: rgba(255, 255, 255, 0.08);\n  }\n  aside.collapsed .nav-group-wrapper .subnav a.on {\n    background: var(--ink);\n    color: var(--paper);\n  }\n}\n@media (max-width: 900px) {\n  aside {\n    position: fixed;\n    top: 0;\n    left: 0;\n    height: 100vh;\n    width: 264px;\n    transform: translateX(-100%);\n    box-shadow: var(--shadow);\n    z-index: 40;\n  }\n  aside:not(.collapsed) {\n    transform: translateX(0);\n  }\n  .backdrop {\n    position: fixed;\n    inset: 0;\n    background: rgba(10, 8, 5, 0.45);\n    z-index: 35;\n  }\n}\n@media (min-width: 901px) {\n  .backdrop {\n    display: none;\n  }\n}\n.content {\n  flex: 1;\n  min-width: 0;\n  display: flex;\n  flex-direction: column;\n}\n.body {\n  padding: 28px;\n}\n.topnav {\n  position: sticky;\n  top: 0;\n  z-index: 20;\n  display: flex;\n  align-items: center;\n  gap: 14px;\n  padding: 12px 24px;\n  border-bottom: 1px solid var(--line);\n  background: rgba(244, 239, 230, 0.92);\n  -webkit-backdrop-filter: blur(10px);\n  backdrop-filter: blur(10px);\n}\n:host-context([data-theme=dark]) .topnav {\n  background: rgba(21, 19, 15, 0.92);\n}\n.icon-btn {\n  position: relative;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  width: 40px;\n  height: 40px;\n  border-radius: 12px;\n  border: 1px solid var(--line);\n  background: var(--card);\n  color: var(--ink);\n  cursor: pointer;\n  flex: none;\n}\n.icon-btn:hover {\n  background: var(--paper-2);\n}\n.icon-btn svg {\n  width: 19px;\n  height: 19px;\n}\n.hamburger {\n  margin-right: 2px;\n}\n.search {\n  position: relative;\n  flex: 1;\n  max-width: 480px;\n  display: flex;\n  align-items: center;\n}\n.search svg {\n  position: absolute;\n  left: 13px;\n  width: 17px;\n  height: 17px;\n  color: var(--ink-soft);\n  pointer-events: none;\n}\n.search input {\n  width: 100%;\n  padding: 10px 14px 10px 38px;\n  border-radius: 999px;\n  border: 1px solid var(--line);\n  background: var(--card);\n  color: var(--ink);\n  font: inherit;\n}\n.search input:focus {\n  outline: 2px solid var(--accent);\n  outline-offset: 1px;\n}\n.dropdown {\n  position: absolute;\n  top: calc(100% + 8px);\n  right: 0;\n  background: var(--card);\n  border: 1px solid var(--line);\n  border-radius: 14px;\n  box-shadow: var(--shadow);\n  overflow: hidden;\n  z-index: 30;\n}\n.search-results {\n  left: 0;\n  right: auto;\n  width: 100%;\n  max-height: 360px;\n  overflow-y: auto;\n  padding: 6px;\n}\n.search-results a {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  padding: 9px 10px;\n  border-radius: 10px;\n}\n.search-results a:hover {\n  background: var(--paper-2);\n}\n.search-results svg {\n  width: 16px;\n  height: 16px;\n  flex: none;\n  color: var(--ink-soft);\n}\n.search-results .r-label {\n  display: block;\n  font-weight: 600;\n  font-size: 14px;\n}\n.search-results .r-section {\n  display: block;\n  font-size: 11px;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n}\n.empty-note {\n  padding: 14px;\n  font-size: 13px;\n  margin: 0;\n}\n.top-actions {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  margin-left: auto;\n}\n.dropdown-wrap {\n  position: relative;\n}\n.badge {\n  position: absolute;\n  top: -4px;\n  right: -4px;\n  min-width: 17px;\n  height: 17px;\n  padding: 0 4px;\n  border-radius: 999px;\n  background: var(--accent);\n  color: #fff;\n  font-size: 10px;\n  font-weight: 700;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  line-height: 1;\n}\n.notif-panel {\n  width: 340px;\n  max-width: 86vw;\n}\n.dropdown-head {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 12px 14px;\n  border-bottom: 1px solid var(--line);\n  font-weight: 700;\n  font-size: 14px;\n}\n.link-btn {\n  background: none;\n  border: 0;\n  color: var(--accent);\n  font-weight: 600;\n  font-size: 12px;\n  cursor: pointer;\n}\n.notif-panel ul {\n  list-style: none;\n  margin: 0;\n  padding: 4px;\n  max-height: 360px;\n  overflow-y: auto;\n}\n.notif-panel li {\n  display: flex;\n  gap: 10px;\n  padding: 10px;\n  border-radius: 10px;\n  cursor: pointer;\n}\n.notif-panel li:hover {\n  background: var(--paper-2);\n}\n.notif-panel li.unread .n-title {\n  font-weight: 700;\n}\n.dot {\n  width: 8px;\n  height: 8px;\n  border-radius: 999px;\n  background: var(--accent);\n  margin-top: 6px;\n  flex: none;\n}\n.dot.hide {\n  background: transparent;\n}\n.n-body p {\n  margin: 0;\n}\n.n-title {\n  font-size: 13.5px;\n}\n.n-msg {\n  font-size: 12.5px;\n  margin-top: 2px !important;\n}\n.n-time {\n  font-size: 11px;\n  margin-top: 4px !important;\n}\n.profile-btn {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 5px 10px 5px 5px;\n  border-radius: 999px;\n  border: 1px solid var(--line);\n  background: var(--card);\n  color: var(--ink);\n  cursor: pointer;\n}\n.profile-btn:hover {\n  background: var(--paper-2);\n}\n.profile-btn svg {\n  width: 14px;\n  height: 14px;\n  color: var(--ink-soft);\n}\n.avatar {\n  width: 30px;\n  height: 30px;\n  border-radius: 999px;\n  background: var(--ink);\n  color: var(--paper);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 12px;\n  font-weight: 700;\n  flex: none;\n}\n.who {\n  display: flex;\n  flex-direction: column;\n  align-items: flex-start;\n  line-height: 1.2;\n}\n.who-name {\n  font-weight: 700;\n  font-size: 13px;\n}\n.who-role {\n  font-size: 11px;\n}\n.profile-panel {\n  width: 240px;\n  padding: 6px;\n}\n.profile-info {\n  padding: 10px 10px 12px;\n  border-bottom: 1px solid var(--line);\n  margin-bottom: 6px;\n}\n.profile-info .who-name {\n  font-size: 14px;\n}\n.profile-info .email {\n  font-size: 12px;\n  margin: 2px 0 6px;\n}\n.profile-panel a {\n  display: block;\n  padding: 9px 10px;\n  border-radius: 10px;\n  font-weight: 600;\n  font-size: 13.5px;\n}\n.profile-panel a:hover {\n  background: var(--paper-2);\n}\n.logout-btn {\n  width: 100%;\n  text-align: left;\n  background: none;\n  border: 0;\n  padding: 9px 10px;\n  border-radius: 10px;\n  font-weight: 600;\n  font-size: 13.5px;\n  color: var(--danger);\n  cursor: pointer;\n}\n.logout-btn:hover {\n  background: var(--paper-2);\n}\n@media (max-width: 720px) {\n  .who {\n    display: none;\n  }\n  .topnav {\n    padding: 8px 12px;\n    gap: 8px;\n    width: 100%;\n    box-sizing: border-box;\n  }\n  .icon-btn {\n    width: 36px;\n    height: 36px;\n    border-radius: 10px;\n    flex: none;\n  }\n  .icon-btn svg {\n    width: 17px;\n    height: 17px;\n  }\n  .top-actions {\n    gap: 6px;\n    flex: none;\n  }\n  .profile-btn {\n    height: 36px;\n    padding: 3px 6px 3px 3px;\n    gap: 4px;\n    flex: none;\n  }\n  .profile-btn svg {\n    width: 12px;\n    height: 12px;\n  }\n  .avatar {\n    width: 28px;\n    height: 28px;\n    font-size: 11px;\n  }\n  .search {\n    position: relative;\n    flex: 1;\n    min-width: 0;\n  }\n  .search svg {\n    left: 10px;\n    width: 15px;\n    height: 15px;\n  }\n  .search input {\n    height: 36px;\n    padding: 0 10px 0 32px;\n    font-size: 13px;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n    overflow: hidden;\n  }\n  .search-results {\n    position: absolute;\n    top: calc(100% + 8px);\n    left: 0;\n    width: min(340px, 100vw - 24px);\n    max-width: calc(100vw - 24px);\n  }\n  .notif-panel {\n    max-width: calc(100vw - 24px);\n    right: -40px;\n  }\n  .profile-panel {\n    max-width: calc(100vw - 24px);\n    right: 0;\n  }\n  .body {\n    padding: 16px 12px;\n  }\n}\n@media (max-width: 480px) {\n  .topnav {\n    padding: 8px 10px;\n    gap: 6px;\n  }\n  .top-actions {\n    gap: 4px;\n  }\n  .icon-btn {\n    width: 34px;\n    height: 34px;\n  }\n  .profile-btn {\n    height: 34px;\n    padding: 2px 4px 2px 2px;\n  }\n  .avatar {\n    width: 26px;\n    height: 26px;\n    font-size: 10.5px;\n  }\n  .profile-btn svg {\n    display: none;\n  }\n  .search input {\n    height: 34px;\n    padding: 0 8px 0 28px;\n    font-size: 12.5px;\n  }\n  .search svg {\n    left: 9px;\n    width: 13px;\n    height: 13px;\n  }\n  .notif-panel {\n    right: -80px;\n  }\n}\n.group-divider {\n  height: 1px;\n  margin: 8px 0 6px;\n  background: var(--line);\n}\n.subnav-title {\n  padding: 2px 8px 0;\n  font-size: 10px;\n  letter-spacing: 0.08em;\n  text-transform: uppercase;\n  color: var(--ink-soft);\n  font-weight: 700;\n}\n.grouped-subnav {\n  margin-top: 0;\n}\n.grouped-subnav .subnav-title {\n  margin-top: 2px;\n}\n.grouped-subnav a {\n  padding-left: 10px;\n}\n.grouped-subnav .label-text {\n  overflow: visible;\n}\n/*# sourceMappingURL=seller-shell.component.css.map */\n'] }]
  }], () => [], { onDocumentClick: [{
    type: HostListener,
    args: ["document:click"]
  }], onEscape: [{
    type: HostListener,
    args: ["document:keydown.escape"]
  }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && i0.\u0275setClassDebugInfo(SellerShellComponent, { className: "SellerShellComponent", filePath: "src/app/layout/seller-shell.component.ts", lineNumber: 869 });
})();
(() => {
  const id = "src%2Fapp%2Flayout%2Fseller-shell.component.ts%40SellerShellComponent";
  function SellerShellComponent_HmrLoad(t) {
    import(
      /* @vite-ignore */
      __vite__injectQuery(i0.\u0275\u0275getReplaceMetadataURL(id, t, import.meta.url), 'import')
    ).then((m) => m.default && i0.\u0275\u0275replaceMetadata(SellerShellComponent, m.default, [i0], [RouterOutlet, RouterLink, RouterLinkActive, NgTemplateOutlet, Component, HostListener], import.meta, id));
  }
  (typeof ngDevMode === "undefined" || ngDevMode) && SellerShellComponent_HmrLoad(Date.now());
  (typeof ngDevMode === "undefined" || ngDevMode) && (import.meta.hot && import.meta.hot.on("angular:component-update", (d) => d.id === id && SellerShellComponent_HmrLoad(d.timestamp)));
})();
export {
  SellerShellComponent
};
//# debugId=1f004c3b-a800-5cc4-bc5a-aa9b8b0770d6


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9hcHAvbGF5b3V0L3NlbGxlci1zaGVsbC5jb21wb25lbnQudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9uZW50LCBIb3N0TGlzdGVuZXIsIGNvbXB1dGVkLCBlZmZlY3QsIGluamVjdCwgc2lnbmFsIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XHJcbmltcG9ydCB7IE5nVGVtcGxhdGVPdXRsZXQgfSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xyXG5pbXBvcnQgeyBSb3V0ZXIsIFJvdXRlckxpbmssIFJvdXRlckxpbmtBY3RpdmUsIFJvdXRlck91dGxldCB9IGZyb20gJ0Bhbmd1bGFyL3JvdXRlcic7XHJcbmltcG9ydCB7IEF1dGhTZXJ2aWNlIH0gZnJvbSAnLi4vY29yZS9hdXRoLnNlcnZpY2UnO1xyXG5pbXBvcnQgeyBUaGVtZVNlcnZpY2UgfSBmcm9tICcuLi9jb3JlL3RoZW1lLnNlcnZpY2UnO1xyXG5cclxudHlwZSBJY29uTmFtZSA9XHJcbiAgfCAnaG9tZScgfCAnZmluYW5jZScgfCAnc2FsZXMnIHwgJ29wZXJhdGlvbnMnIHwgJ21hcmtldGluZycgfCAnc3RvcmUnIHwgJ29yZGVycycgfCAncHJvZHVjdHMnXHJcbiAgfCAnaW52ZW50b3J5JyB8ICdhZHMnIHwgJ2FuYWx5dGljcycgfCAndXNlcnMnIHwgJ3NldHRpbmdzJyB8ICdiYWNrdXBzJyB8ICdkb21haW5zJyB8ICdhcGlrZXlzJ1xyXG4gIHwgJ3dlYmhvb2tzJyB8ICdhaScgfCAnc2VhcmNoJyB8ICdiZWxsJyB8ICdzdW4nIHwgJ21vb24nIHwgJ2NoZXZyb24nIHwgJ21lbnUnIHwgJ2xpZmVidW95JztcclxuXHJcbmludGVyZmFjZSBOYXZFbnRyeSB7XHJcbiAga2V5OiBzdHJpbmc7XHJcbiAgbGFiZWw6IHN0cmluZztcclxuICBpY29uOiBJY29uTmFtZTtcclxuICBmYUljb24/OiBzdHJpbmc7XHJcbn1cclxuXHJcbmludGVyZmFjZSBTZWFyY2hFbnRyeSB7XHJcbiAgbGFiZWw6IHN0cmluZztcclxuICBwYXRoOiBzdHJpbmc7XHJcbiAgaWNvbjogSWNvbk5hbWU7XHJcbiAgc2VjdGlvbjogc3RyaW5nO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgTm90aWZpY2F0aW9uSXRlbSB7XHJcbiAgaWQ6IG51bWJlcjtcclxuICB0aXRsZTogc3RyaW5nO1xyXG4gIG1lc3NhZ2U6IHN0cmluZztcclxuICB0aW1lOiBzdHJpbmc7XHJcbiAgcmVhZDogYm9vbGVhbjtcclxufVxyXG5cclxuY29uc3QgU0lERUJBUl9LRVkgPSAnbWhfdGVuYW50X3NpZGViYXJfY29sbGFwc2VkJztcclxuY29uc3QgTU9CSUxFX0JSRUFLUE9JTlQgPSA5MDA7XHJcblxyXG50eXBlIFNpZGViYXJTZWN0aW9uID0gJ2FjY291bnRpbmcnIHwgJ3NhbGVzJyB8ICdvcGVyYXRpb25zJyB8ICdtYXJrZXRpbmcnIHwgJ2NvbW1lcmNlJyB8ICdhZG1pbic7XHJcblxyXG5AQ29tcG9uZW50KHtcclxuICBzZWxlY3RvcjogJ2FwcC1zZWxsZXItc2hlbGwnLFxyXG4gIGltcG9ydHM6IFtSb3V0ZXJPdXRsZXQsIFJvdXRlckxpbmssIFJvdXRlckxpbmtBY3RpdmUsIE5nVGVtcGxhdGVPdXRsZXRdLFxyXG4gIHRlbXBsYXRlOiBgXHJcbiAgICA8ZGl2IGNsYXNzPVwiZGFzaFwiPlxyXG4gICAgICBAaWYgKG1vYmlsZU9wZW4oKSkge1xyXG4gICAgICAgIDxkaXYgY2xhc3M9XCJiYWNrZHJvcFwiIChjbGljayk9XCJjb2xsYXBzZWQuc2V0KHRydWUpXCI+PC9kaXY+XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIDxhc2lkZSBbY2xhc3MuY29sbGFwc2VkXT1cImNvbGxhcHNlZCgpXCI+XHJcbiAgICAgICAgPGRpdiBjbGFzcz1cImJyYW5kLXJvd1wiPlxyXG4gICAgICAgICAgPGEgW3JvdXRlckxpbmtdPVwidGVuYW50TGluaygpXCIgY2xhc3M9XCJicmFuZCBzZXJpZlwiIChjbGljayk9XCJvbk5hdmlnYXRlKClcIj5cclxuICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJtYXJrXCI+TTwvc3Bhbj48c3BhbiBjbGFzcz1cImxhYmVsLXRleHRcIj5hcmtldEh1Yjwvc3Bhbj5cclxuICAgICAgICAgIDwvYT5cclxuICAgICAgICA8L2Rpdj5cclxuICAgICAgICA8cCBjbGFzcz1cIm11dGVkIHN1YnRpdGxlIGxhYmVsLXRleHRcIj5UZW5hbnQgY29uc29sZTwvcD5cclxuXHJcbiAgICAgICAgPG5hdj5cclxuICAgICAgICAgIDxhXHJcbiAgICAgICAgICAgIFtyb3V0ZXJMaW5rXT1cInRlbmFudExpbmsoKVwiXHJcbiAgICAgICAgICAgIHJvdXRlckxpbmtBY3RpdmU9XCJvblwiXHJcbiAgICAgICAgICAgIFtyb3V0ZXJMaW5rQWN0aXZlT3B0aW9uc109XCJ7IGV4YWN0OiB0cnVlIH1cIlxyXG4gICAgICAgICAgICAoY2xpY2spPVwib25OYXZpZ2F0ZSgpXCJcclxuICAgICAgICAgICAgW3RpdGxlXT1cImNvbGxhcHNlZCgpID8gJ0Rhc2hib2FyZCcgOiAnJ1wiXHJcbiAgICAgICAgICA+XHJcbiAgICAgICAgICAgIDxuZy1jb250YWluZXIgW25nVGVtcGxhdGVPdXRsZXRdPVwibmF2SWNvblwiIFtuZ1RlbXBsYXRlT3V0bGV0Q29udGV4dF09XCJ7ICRpbXBsaWNpdDogJ2hvbWUnIH1cIiAvPlxyXG4gICAgICAgICAgICA8c3BhbiBjbGFzcz1cImxhYmVsLXRleHRcIj5EYXNoYm9hcmQ8L3NwYW4+XHJcbiAgICAgICAgICA8L2E+XHJcblxyXG4gICAgICAgICAgQGlmIChjYW5WaWV3QWNjb3VudGluZygpKSB7XHJcbiAgICAgICAgICA8cCBjbGFzcz1cInNlY3Rpb24tbGFiZWwgbGFiZWwtdGV4dFwiPkFjY291bnRpbmc8L3A+XHJcbiAgICAgICAgICA8ZGl2IGNsYXNzPVwibmF2LWdyb3VwLXdyYXBwZXJcIiBbY2xhc3Mub3Blbl09XCJhY2NvdW50aW5nT3BlbigpXCI+XHJcbiAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwibmF2LWdyb3VwXCIgW2NsYXNzLm9wZW5dPVwiYWNjb3VudGluZ09wZW4oKVwiIChjbGljayk9XCJ0b2dnbGVBY2NvdW50aW5nKClcIiBhcmlhLWxhYmVsPVwiVG9nZ2xlIGFjY291bnRpbmcgbWVudVwiIFthdHRyLmFyaWEtZXhwYW5kZWRdPVwiYWNjb3VudGluZ09wZW4oKVwiIFt0aXRsZV09XCJjb2xsYXBzZWQoKSA/ICdGaW5hbmNlICYgYWNjb3VudHMnIDogJydcIj5cclxuICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cIm5hdi1ncm91cC1jb3B5XCI+XHJcbiAgICAgICAgICAgICAgICA8bmctY29udGFpbmVyIFtuZ1RlbXBsYXRlT3V0bGV0XT1cIm5hdkljb25cIiBbbmdUZW1wbGF0ZU91dGxldENvbnRleHRdPVwieyAkaW1wbGljaXQ6ICdmaW5hbmNlJyB9XCIgLz5cclxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwibGFiZWwtdGV4dFwiPkZpbmFuY2UgJiBhY2NvdW50czwvc3Bhbj5cclxuICAgICAgICAgICAgICA8L3NwYW4+XHJcbiAgICAgICAgICAgICAgPG5nLWNvbnRhaW5lciBbbmdUZW1wbGF0ZU91dGxldF09XCJuYXZJY29uXCIgW25nVGVtcGxhdGVPdXRsZXRDb250ZXh0XT1cInsgJGltcGxpY2l0OiAnY2hldnJvbicgfVwiIC8+XHJcbiAgICAgICAgICAgIDwvYnV0dG9uPlxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwic3VibmF2XCIgW2NsYXNzLm9wZW5dPVwiYWNjb3VudGluZ09wZW4oKVwiPlxyXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmbHlvdXQtaGVhZGVyXCI+RmluYW5jZSAmIGFjY291bnRzPC9kaXY+XHJcbiAgICAgICAgICAgICAgQGZvciAoaXRlbSBvZiBhY2NvdW50aW5nSXRlbXM7IHRyYWNrIGl0ZW0ua2V5KSB7XHJcbiAgICAgICAgICAgICAgICA8YSBbcm91dGVyTGlua109XCJ0ZW5hbnRMaW5rKGl0ZW0ua2V5KVwiIHJvdXRlckxpbmtBY3RpdmU9XCJvblwiIFtyb3V0ZXJMaW5rQWN0aXZlT3B0aW9uc109XCJ7IGV4YWN0OiB0cnVlIH1cIiAoY2xpY2spPVwib25OYXZpZ2F0ZSgpXCIgW3RpdGxlXT1cImNvbGxhcHNlZCgpID8gaXRlbS5sYWJlbCA6ICcnXCI+XHJcbiAgICAgICAgICAgICAgICAgIDxpIFtjbGFzc109XCJpdGVtLmZhSWNvbiB8fCAnJ1wiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPjwvaT48c3Bhbj57eyBpdGVtLmxhYmVsIH19PC9zcGFuPlxyXG4gICAgICAgICAgICAgICAgPC9hPlxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBAaWYgKGNhblZpZXdTYWxlcygpKSB7XHJcbiAgICAgICAgICA8cCBjbGFzcz1cInNlY3Rpb24tbGFiZWwgbGFiZWwtdGV4dFwiPlNhbGVzPC9wPlxyXG4gICAgICAgICAgPGRpdiBjbGFzcz1cIm5hdi1ncm91cC13cmFwcGVyXCIgW2NsYXNzLm9wZW5dPVwic2FsZXNPcGVuKClcIj5cclxuICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJuYXYtZ3JvdXBcIiBbY2xhc3Mub3Blbl09XCJzYWxlc09wZW4oKVwiIChjbGljayk9XCJ0b2dnbGVTYWxlcygpXCIgYXJpYS1sYWJlbD1cIlRvZ2dsZSBzYWxlcyBtZW51XCIgW2F0dHIuYXJpYS1leHBhbmRlZF09XCJzYWxlc09wZW4oKVwiIFt0aXRsZV09XCJjb2xsYXBzZWQoKSA/ICdTYWxlcyB3b3Jrc3BhY2UnIDogJydcIj5cclxuICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cIm5hdi1ncm91cC1jb3B5XCI+XHJcbiAgICAgICAgICAgICAgICA8bmctY29udGFpbmVyIFtuZ1RlbXBsYXRlT3V0bGV0XT1cIm5hdkljb25cIiBbbmdUZW1wbGF0ZU91dGxldENvbnRleHRdPVwieyAkaW1wbGljaXQ6ICdzYWxlcycgfVwiIC8+XHJcbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cImxhYmVsLXRleHRcIj5TYWxlcyB3b3Jrc3BhY2U8L3NwYW4+XHJcbiAgICAgICAgICAgICAgPC9zcGFuPlxyXG4gICAgICAgICAgICAgIDxuZy1jb250YWluZXIgW25nVGVtcGxhdGVPdXRsZXRdPVwibmF2SWNvblwiIFtuZ1RlbXBsYXRlT3V0bGV0Q29udGV4dF09XCJ7ICRpbXBsaWNpdDogJ2NoZXZyb24nIH1cIiAvPlxyXG4gICAgICAgICAgICA8L2J1dHRvbj5cclxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInN1Ym5hdlwiIFtjbGFzcy5vcGVuXT1cInNhbGVzT3BlbigpXCI+XHJcbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZseW91dC1oZWFkZXJcIj5TYWxlcyB3b3Jrc3BhY2U8L2Rpdj5cclxuICAgICAgICAgICAgICBAZm9yIChpdGVtIG9mIHNhbGVzSXRlbXM7IHRyYWNrIGl0ZW0ua2V5KSB7XHJcbiAgICAgICAgICAgICAgICA8YSBbcm91dGVyTGlua109XCJ0ZW5hbnRMaW5rKGl0ZW0ua2V5KVwiIHJvdXRlckxpbmtBY3RpdmU9XCJvblwiIFtyb3V0ZXJMaW5rQWN0aXZlT3B0aW9uc109XCJ7IGV4YWN0OiB0cnVlIH1cIiAoY2xpY2spPVwib25OYXZpZ2F0ZSgpXCIgW3RpdGxlXT1cImNvbGxhcHNlZCgpID8gaXRlbS5sYWJlbCA6ICcnXCI+XHJcbiAgICAgICAgICAgICAgICAgIDxpIFtjbGFzc109XCJpdGVtLmZhSWNvbiB8fCAnJ1wiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPjwvaT48c3Bhbj57eyBpdGVtLmxhYmVsIH19PC9zcGFuPlxyXG4gICAgICAgICAgICAgICAgPC9hPlxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBAaWYgKGNhblZpZXdPcGVyYXRpb25zKCkpIHtcclxuICAgICAgICAgIDxwIGNsYXNzPVwic2VjdGlvbi1sYWJlbCBsYWJlbC10ZXh0XCI+T3BlcmF0aW9uczwvcD5cclxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJuYXYtZ3JvdXAtd3JhcHBlclwiIFtjbGFzcy5vcGVuXT1cIm9wZXJhdGlvbnNPcGVuKClcIj5cclxuICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJuYXYtZ3JvdXBcIiBbY2xhc3Mub3Blbl09XCJvcGVyYXRpb25zT3BlbigpXCIgKGNsaWNrKT1cInRvZ2dsZU9wZXJhdGlvbnMoKVwiIGFyaWEtbGFiZWw9XCJUb2dnbGUgb3BlcmF0aW9ucyBtZW51XCIgW2F0dHIuYXJpYS1leHBhbmRlZF09XCJvcGVyYXRpb25zT3BlbigpXCIgW3RpdGxlXT1cImNvbGxhcHNlZCgpID8gJ09wZXJhdGlvbnMnIDogJydcIj5cclxuICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cIm5hdi1ncm91cC1jb3B5XCI+XHJcbiAgICAgICAgICAgICAgICA8bmctY29udGFpbmVyIFtuZ1RlbXBsYXRlT3V0bGV0XT1cIm5hdkljb25cIiBbbmdUZW1wbGF0ZU91dGxldENvbnRleHRdPVwieyAkaW1wbGljaXQ6ICdvcGVyYXRpb25zJyB9XCIgLz5cclxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwibGFiZWwtdGV4dFwiPk9wZXJhdGlvbnM8L3NwYW4+XHJcbiAgICAgICAgICAgICAgPC9zcGFuPlxyXG4gICAgICAgICAgICAgIDxuZy1jb250YWluZXIgW25nVGVtcGxhdGVPdXRsZXRdPVwibmF2SWNvblwiIFtuZ1RlbXBsYXRlT3V0bGV0Q29udGV4dF09XCJ7ICRpbXBsaWNpdDogJ2NoZXZyb24nIH1cIiAvPlxyXG4gICAgICAgICAgICA8L2J1dHRvbj5cclxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInN1Ym5hdlwiIFtjbGFzcy5vcGVuXT1cIm9wZXJhdGlvbnNPcGVuKClcIj5cclxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmx5b3V0LWhlYWRlclwiPk9wZXJhdGlvbnM8L2Rpdj5cclxuICAgICAgICAgICAgICBAZm9yIChpdGVtIG9mIG9wZXJhdGlvbnNJdGVtczsgdHJhY2sgaXRlbS5rZXkpIHtcclxuICAgICAgICAgICAgICAgIDxhIFtyb3V0ZXJMaW5rXT1cInRlbmFudExpbmsoaXRlbS5rZXkpXCIgcm91dGVyTGlua0FjdGl2ZT1cIm9uXCIgW3JvdXRlckxpbmtBY3RpdmVPcHRpb25zXT1cInsgZXhhY3Q6IHRydWUgfVwiIChjbGljayk9XCJvbk5hdmlnYXRlKClcIiBbdGl0bGVdPVwiY29sbGFwc2VkKCkgPyBpdGVtLmxhYmVsIDogJydcIj48aSBbY2xhc3NdPVwiaXRlbS5mYUljb24gfHwgJydcIiBhcmlhLWhpZGRlbj1cInRydWVcIj48L2k+PHNwYW4+e3sgaXRlbS5sYWJlbCB9fTwvc3Bhbj48L2E+XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIEBpZiAoY2FuVmlld01hcmtldGluZygpKSB7XHJcbiAgICAgICAgICA8cCBjbGFzcz1cInNlY3Rpb24tbGFiZWwgbGFiZWwtdGV4dFwiPk1hcmtldGluZzwvcD5cclxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJuYXYtZ3JvdXAtd3JhcHBlclwiIFtjbGFzcy5vcGVuXT1cIm1hcmtldGluZ09wZW4oKVwiPlxyXG4gICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cIm5hdi1ncm91cFwiIFtjbGFzcy5vcGVuXT1cIm1hcmtldGluZ09wZW4oKVwiIChjbGljayk9XCJ0b2dnbGVNYXJrZXRpbmcoKVwiIGFyaWEtbGFiZWw9XCJUb2dnbGUgbWFya2V0aW5nIG1lbnVcIiBbYXR0ci5hcmlhLWV4cGFuZGVkXT1cIm1hcmtldGluZ09wZW4oKVwiIFt0aXRsZV09XCJjb2xsYXBzZWQoKSA/ICdNYXJrZXRpbmcnIDogJydcIj5cclxuICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cIm5hdi1ncm91cC1jb3B5XCI+XHJcbiAgICAgICAgICAgICAgICA8bmctY29udGFpbmVyIFtuZ1RlbXBsYXRlT3V0bGV0XT1cIm5hdkljb25cIiBbbmdUZW1wbGF0ZU91dGxldENvbnRleHRdPVwieyAkaW1wbGljaXQ6ICdtYXJrZXRpbmcnIH1cIiAvPlxyXG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJsYWJlbC10ZXh0XCI+TWFya2V0aW5nPC9zcGFuPlxyXG4gICAgICAgICAgICAgIDwvc3Bhbj5cclxuICAgICAgICAgICAgICA8bmctY29udGFpbmVyIFtuZ1RlbXBsYXRlT3V0bGV0XT1cIm5hdkljb25cIiBbbmdUZW1wbGF0ZU91dGxldENvbnRleHRdPVwieyAkaW1wbGljaXQ6ICdjaGV2cm9uJyB9XCIgLz5cclxuICAgICAgICAgICAgPC9idXR0b24+XHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJzdWJuYXZcIiBbY2xhc3Mub3Blbl09XCJtYXJrZXRpbmdPcGVuKClcIj5cclxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmx5b3V0LWhlYWRlclwiPk1hcmtldGluZzwvZGl2PlxyXG4gICAgICAgICAgICAgIEBmb3IgKGl0ZW0gb2YgbWFya2V0aW5nSXRlbXM7IHRyYWNrIGl0ZW0ua2V5KSB7XHJcbiAgICAgICAgICAgICAgICA8YSBbcm91dGVyTGlua109XCJ0ZW5hbnRMaW5rKGl0ZW0ua2V5KVwiIHJvdXRlckxpbmtBY3RpdmU9XCJvblwiIFtyb3V0ZXJMaW5rQWN0aXZlT3B0aW9uc109XCJ7IGV4YWN0OiB0cnVlIH1cIiAoY2xpY2spPVwib25OYXZpZ2F0ZSgpXCIgW3RpdGxlXT1cImNvbGxhcHNlZCgpID8gaXRlbS5sYWJlbCA6ICcnXCI+PGkgW2NsYXNzXT1cIml0ZW0uZmFJY29uIHx8ICcnXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+PC9pPjxzcGFuPnt7IGl0ZW0ubGFiZWwgfX08L3NwYW4+PC9hPlxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICA8cCBjbGFzcz1cInNlY3Rpb24tbGFiZWwgbGFiZWwtdGV4dFwiPkNvbW1lcmNlPC9wPlxyXG4gICAgICAgICAgPGRpdiBjbGFzcz1cIm5hdi1ncm91cC13cmFwcGVyXCIgW2NsYXNzLm9wZW5dPVwiY29tbWVyY2VPcGVuKClcIj5cclxuICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJuYXYtZ3JvdXBcIiBbY2xhc3Mub3Blbl09XCJjb21tZXJjZU9wZW4oKVwiIChjbGljayk9XCJ0b2dnbGVDb21tZXJjZSgpXCIgYXJpYS1sYWJlbD1cIlRvZ2dsZSBjb21tZXJjZSBtZW51XCIgW2F0dHIuYXJpYS1leHBhbmRlZF09XCJjb21tZXJjZU9wZW4oKVwiIFt0aXRsZV09XCJjb2xsYXBzZWQoKSA/ICdDb21tZXJjZScgOiAnJ1wiPlxyXG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwibmF2LWdyb3VwLWNvcHlcIj5cclxuICAgICAgICAgICAgICAgIDxuZy1jb250YWluZXIgW25nVGVtcGxhdGVPdXRsZXRdPVwibmF2SWNvblwiIFtuZ1RlbXBsYXRlT3V0bGV0Q29udGV4dF09XCJ7ICRpbXBsaWNpdDogJ3N0b3JlJyB9XCIgLz5cclxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwibGFiZWwtdGV4dFwiPkNvbW1lcmNlPC9zcGFuPlxyXG4gICAgICAgICAgICAgIDwvc3Bhbj5cclxuICAgICAgICAgICAgICA8bmctY29udGFpbmVyIFtuZ1RlbXBsYXRlT3V0bGV0XT1cIm5hdkljb25cIiBbbmdUZW1wbGF0ZU91dGxldENvbnRleHRdPVwieyAkaW1wbGljaXQ6ICdjaGV2cm9uJyB9XCIgLz5cclxuICAgICAgICAgICAgPC9idXR0b24+XHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJzdWJuYXYgZ3JvdXBlZC1zdWJuYXZcIiBbY2xhc3Mub3Blbl09XCJjb21tZXJjZU9wZW4oKVwiPlxyXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmbHlvdXQtaGVhZGVyXCI+Q29tbWVyY2U8L2Rpdj5cclxuICAgICAgICAgICAgICBAZm9yIChjIG9mIGNvbW1lcmNlSXRlbXM7IHRyYWNrIGMua2V5KSB7XHJcbiAgICAgICAgICAgICAgICA8YSBbcm91dGVyTGlua109XCJ0ZW5hbnRMaW5rKGMua2V5KVwiIHJvdXRlckxpbmtBY3RpdmU9XCJvblwiIChjbGljayk9XCJvbk5hdmlnYXRlKClcIiBbdGl0bGVdPVwiY29sbGFwc2VkKCkgPyBjLmxhYmVsIDogJydcIj5cclxuICAgICAgICAgICAgICAgICAgPG5nLWNvbnRhaW5lciBbbmdUZW1wbGF0ZU91dGxldF09XCJuYXZJY29uXCIgW25nVGVtcGxhdGVPdXRsZXRDb250ZXh0XT1cInsgJGltcGxpY2l0OiBjLmljb24gfVwiIC8+XHJcbiAgICAgICAgICAgICAgICAgIDxzcGFuPnt7IGMubGFiZWwgfX08L3NwYW4+XHJcbiAgICAgICAgICAgICAgICA8L2E+XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgIDwvZGl2PlxyXG5cclxuICAgICAgICAgIEBpZiAoaXNPd25lcigpKSB7XHJcbiAgICAgICAgICAgIDxwIGNsYXNzPVwic2VjdGlvbi1sYWJlbCBsYWJlbC10ZXh0XCI+QWRtaW48L3A+XHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJuYXYtZ3JvdXAtd3JhcHBlciBuYXYtZ3JvdXAtYm90dG9tXCIgW2NsYXNzLm9wZW5dPVwiYWRtaW5PcGVuKClcIj5cclxuICAgICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cIm5hdi1ncm91cFwiIFtjbGFzcy5vcGVuXT1cImFkbWluT3BlbigpXCIgKGNsaWNrKT1cInRvZ2dsZUFkbWluKClcIiBhcmlhLWxhYmVsPVwiVG9nZ2xlIGFkbWluIG1lbnVcIiBbYXR0ci5hcmlhLWV4cGFuZGVkXT1cImFkbWluT3BlbigpXCIgW3RpdGxlXT1cImNvbGxhcHNlZCgpID8gJ0FkbWluJyA6ICcnXCI+XHJcbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cIm5hdi1ncm91cC1jb3B5XCI+XHJcbiAgICAgICAgICAgICAgICAgIDxuZy1jb250YWluZXIgW25nVGVtcGxhdGVPdXRsZXRdPVwibmF2SWNvblwiIFtuZ1RlbXBsYXRlT3V0bGV0Q29udGV4dF09XCJ7ICRpbXBsaWNpdDogJ3NldHRpbmdzJyB9XCIgLz5cclxuICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJsYWJlbC10ZXh0XCI+QWRtaW48L3NwYW4+XHJcbiAgICAgICAgICAgICAgICA8L3NwYW4+XHJcbiAgICAgICAgICAgICAgICA8bmctY29udGFpbmVyIFtuZ1RlbXBsYXRlT3V0bGV0XT1cIm5hdkljb25cIiBbbmdUZW1wbGF0ZU91dGxldENvbnRleHRdPVwieyAkaW1wbGljaXQ6ICdjaGV2cm9uJyB9XCIgLz5cclxuICAgICAgICAgICAgICA8L2J1dHRvbj5cclxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwic3VibmF2IGdyb3VwZWQtc3VibmF2XCIgW2NsYXNzLm9wZW5dPVwiYWRtaW5PcGVuKClcIj5cclxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmbHlvdXQtaGVhZGVyXCI+QWRtaW48L2Rpdj5cclxuICAgICAgICAgICAgICAgIEBmb3IgKGEgb2YgYWRtaW5JdGVtczsgdHJhY2sgYS5rZXkpIHtcclxuICAgICAgICAgICAgICAgICAgPGEgW3JvdXRlckxpbmtdPVwidGVuYW50TGluayhhLmtleSlcIiByb3V0ZXJMaW5rQWN0aXZlPVwib25cIiAoY2xpY2spPVwib25OYXZpZ2F0ZSgpXCIgW3RpdGxlXT1cImNvbGxhcHNlZCgpID8gYS5sYWJlbCA6ICcnXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgPG5nLWNvbnRhaW5lciBbbmdUZW1wbGF0ZU91dGxldF09XCJuYXZJY29uXCIgW25nVGVtcGxhdGVPdXRsZXRDb250ZXh0XT1cInsgJGltcGxpY2l0OiBhLmljb24gfVwiIC8+XHJcbiAgICAgICAgICAgICAgICAgICAgPHNwYW4+e3sgYS5sYWJlbCB9fTwvc3Bhbj5cclxuICAgICAgICAgICAgICAgICAgPC9hPlxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICA8cCBjbGFzcz1cInNlY3Rpb24tbGFiZWwgbGFiZWwtdGV4dFwiPlN1cHBvcnQ8L3A+XHJcbiAgICAgICAgICA8YSBbcm91dGVyTGlua109XCJ0ZW5hbnRMaW5rKCdzdXBwb3J0JylcIiByb3V0ZXJMaW5rQWN0aXZlPVwib25cIiAoY2xpY2spPVwib25OYXZpZ2F0ZSgpXCIgW3RpdGxlXT1cImNvbGxhcHNlZCgpID8gJ0hlbHAgY2VudHJlJyA6ICcnXCI+XHJcbiAgICAgICAgICAgIDxuZy1jb250YWluZXIgW25nVGVtcGxhdGVPdXRsZXRdPVwibmF2SWNvblwiIFtuZ1RlbXBsYXRlT3V0bGV0Q29udGV4dF09XCJ7ICRpbXBsaWNpdDogJ2xpZmVidW95JyB9XCIgLz5cclxuICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJsYWJlbC10ZXh0XCI+SGVscCBjZW50cmU8L3NwYW4+XHJcbiAgICAgICAgICA8L2E+XHJcbiAgICAgICAgPC9uYXY+XHJcblxyXG4gICAgICAgIDxidXR0b24gY2xhc3M9XCJidG4gZ2hvc3QgbG9nb3V0XCIgKGNsaWNrKT1cImF1dGgubG9nb3V0KClcIiBbdGl0bGVdPVwiY29sbGFwc2VkKCkgPyAnTG9nIG91dCcgOiAnJ1wiPlxyXG4gICAgICAgICAgPG5nLWNvbnRhaW5lciBbbmdUZW1wbGF0ZU91dGxldF09XCJtaW5pSWNvblwiIFtuZ1RlbXBsYXRlT3V0bGV0Q29udGV4dF09XCJ7ICRpbXBsaWNpdDogJ2xvZ291dCcgfVwiIC8+XHJcbiAgICAgICAgICA8c3BhbiBjbGFzcz1cImxhYmVsLXRleHRcIj5Mb2cgb3V0PC9zcGFuPlxyXG4gICAgICAgIDwvYnV0dG9uPlxyXG4gICAgICA8L2FzaWRlPlxyXG5cclxuICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cclxuICAgICAgICA8aGVhZGVyIGNsYXNzPVwidG9wbmF2XCI+XHJcbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cImljb24tYnRuIGhhbWJ1cmdlclwiIChjbGljayk9XCJ0b2dnbGVTaWRlYmFyKClcIiBbYXR0ci5hcmlhLWV4cGFuZGVkXT1cIiFjb2xsYXBzZWQoKVwiIGFyaWEtbGFiZWw9XCJUb2dnbGUgc2lkZWJhclwiPlxyXG4gICAgICAgICAgICA8bmctY29udGFpbmVyIFtuZ1RlbXBsYXRlT3V0bGV0XT1cIm5hdkljb25cIiBbbmdUZW1wbGF0ZU91dGxldENvbnRleHRdPVwieyAkaW1wbGljaXQ6ICdtZW51JyB9XCIgLz5cclxuICAgICAgICAgIDwvYnV0dG9uPlxyXG5cclxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJzZWFyY2hcIiAoY2xpY2spPVwiJGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpXCI+XHJcbiAgICAgICAgICAgIDxuZy1jb250YWluZXIgW25nVGVtcGxhdGVPdXRsZXRdPVwibmF2SWNvblwiIFtuZ1RlbXBsYXRlT3V0bGV0Q29udGV4dF09XCJ7ICRpbXBsaWNpdDogJ3NlYXJjaCcgfVwiIC8+XHJcbiAgICAgICAgICAgIDxpbnB1dFxyXG4gICAgICAgICAgICAgIHR5cGU9XCJ0ZXh0XCJcclxuICAgICAgICAgICAgICBwbGFjZWhvbGRlcj1cIlNlYXJjaOKAplwiXHJcbiAgICAgICAgICAgICAgW3ZhbHVlXT1cInNlYXJjaFRlcm0oKVwiXHJcbiAgICAgICAgICAgICAgKGlucHV0KT1cIm9uU2VhcmNoSW5wdXQoJGV2ZW50KVwiXHJcbiAgICAgICAgICAgICAgKGZvY3VzKT1cIm9uU2VhcmNoRm9jdXMoKVwiXHJcbiAgICAgICAgICAgICAgKGtleWRvd24uZW50ZXIpPVwiZ29Ub0ZpcnN0UmVzdWx0KClcIlxyXG4gICAgICAgICAgICAgIChrZXlkb3duLmVzY2FwZSk9XCJjbGVhclNlYXJjaCgpXCJcclxuICAgICAgICAgICAgICBhcmlhLWxhYmVsPVwiU2VhcmNoIHRoZSB0ZW5hbnQgY29uc29sZVwiXHJcbiAgICAgICAgICAgIC8+XHJcbiAgICAgICAgICAgIEBpZiAoc2VhcmNoVGVybSgpICYmIHNob3dTZWFyY2hQYW5lbCgpKSB7XHJcbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImRyb3Bkb3duIHNlYXJjaC1yZXN1bHRzXCI+XHJcbiAgICAgICAgICAgICAgICBAaWYgKHNlYXJjaFJlc3VsdHMoKS5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgQGZvciAociBvZiBzZWFyY2hSZXN1bHRzKCk7IHRyYWNrIHIucGF0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgIDxhIFtyb3V0ZXJMaW5rXT1cInIucGF0aFwiIChjbGljayk9XCJjbGVhclNlYXJjaCgpXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICA8bmctY29udGFpbmVyIFtuZ1RlbXBsYXRlT3V0bGV0XT1cIm5hdkljb25cIiBbbmdUZW1wbGF0ZU91dGxldENvbnRleHRdPVwieyAkaW1wbGljaXQ6IHIuaWNvbiB9XCIgLz5cclxuICAgICAgICAgICAgICAgICAgICAgIDxzcGFuPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cInItbGFiZWxcIj57eyByLmxhYmVsIH19PC9zcGFuPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cInItc2VjdGlvbiBtdXRlZFwiPnt7IHIuc2VjdGlvbiB9fTwvc3Bhbj5cclxuICAgICAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cclxuICAgICAgICAgICAgICAgICAgICA8L2E+XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gQGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICA8cCBjbGFzcz1cImVtcHR5LW5vdGUgbXV0ZWRcIj5ObyBtYXRjaGVzIGZvciBcInt7IHNlYXJjaFRlcm0oKSB9fVwiPC9wPlxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICA8L2Rpdj5cclxuXHJcbiAgICAgICAgICA8ZGl2IGNsYXNzPVwidG9wLWFjdGlvbnNcIj5cclxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImRyb3Bkb3duLXdyYXBcIiAoY2xpY2spPVwiJGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpXCI+XHJcbiAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJpY29uLWJ0blwiIChjbGljayk9XCJ0b2dnbGVOb3RpZmljYXRpb25zKClcIiBhcmlhLWxhYmVsPVwiTm90aWZpY2F0aW9uc1wiIFthdHRyLmFyaWEtZXhwYW5kZWRdPVwibm90aWZPcGVuKClcIj5cclxuICAgICAgICAgICAgICAgIDxuZy1jb250YWluZXIgW25nVGVtcGxhdGVPdXRsZXRdPVwibmF2SWNvblwiIFtuZ1RlbXBsYXRlT3V0bGV0Q29udGV4dF09XCJ7ICRpbXBsaWNpdDogJ2JlbGwnIH1cIiAvPlxyXG4gICAgICAgICAgICAgICAgQGlmICh1bnJlYWRDb3VudCgpID4gMCkgeyA8c3BhbiBjbGFzcz1cImJhZGdlXCI+e3sgdW5yZWFkQ291bnQoKSB9fTwvc3Bhbj4gfVxyXG4gICAgICAgICAgICAgIDwvYnV0dG9uPlxyXG4gICAgICAgICAgICAgIEBpZiAobm90aWZPcGVuKCkpIHtcclxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJkcm9wZG93biBub3RpZi1wYW5lbFwiPlxyXG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZHJvcGRvd24taGVhZFwiPlxyXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuPk5vdGlmaWNhdGlvbnM8L3NwYW4+XHJcbiAgICAgICAgICAgICAgICAgICAgQGlmICh1bnJlYWRDb3VudCgpID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJsaW5rLWJ0blwiIChjbGljayk9XCJtYXJrQWxsUmVhZCgpXCI+TWFyayBhbGwgcmVhZDwvYnV0dG9uPlxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgIEBpZiAobm90aWZpY2F0aW9ucygpLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgIDx1bD5cclxuICAgICAgICAgICAgICAgICAgICAgIEBmb3IgKG4gb2Ygbm90aWZpY2F0aW9ucygpOyB0cmFjayBuLmlkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxsaSBbY2xhc3MudW5yZWFkXT1cIiFuLnJlYWRcIiAoY2xpY2spPVwibWFya1JlYWQobi5pZClcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cImRvdFwiIFtjbGFzcy5oaWRlXT1cIm4ucmVhZFwiPjwvc3Bhbj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibi1ib2R5XCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzcz1cIm4tdGl0bGVcIj57eyBuLnRpdGxlIH19PC9wPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3M9XCJuLW1zZyBtdXRlZFwiPnt7IG4ubWVzc2FnZSB9fTwvcD5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzPVwibi10aW1lIG11dGVkXCI+e3sgbi50aW1lIH19PC9wPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2xpPlxyXG4gICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIDwvdWw+XHJcbiAgICAgICAgICAgICAgICAgIH0gQGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzPVwiZW1wdHktbm90ZSBtdXRlZFwiPllvdSdyZSBhbGwgY2F1Z2h0IHVwLjwvcD5cclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuXHJcbiAgICAgICAgICAgIDxidXR0b25cclxuICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcclxuICAgICAgICAgICAgICBjbGFzcz1cImljb24tYnRuXCJcclxuICAgICAgICAgICAgICAoY2xpY2spPVwidGhlbWUudG9nZ2xlKClcIlxyXG4gICAgICAgICAgICAgIFthdHRyLmFyaWEtbGFiZWxdPVwidGhlbWUudGhlbWUoKSA9PT0gJ2RhcmsnID8gJ1N3aXRjaCB0byBsaWdodCBtb2RlJyA6ICdTd2l0Y2ggdG8gZGFyayBtb2RlJ1wiXHJcbiAgICAgICAgICAgID5cclxuICAgICAgICAgICAgICA8bmctY29udGFpbmVyIFtuZ1RlbXBsYXRlT3V0bGV0XT1cIm5hdkljb25cIiBbbmdUZW1wbGF0ZU91dGxldENvbnRleHRdPVwieyAkaW1wbGljaXQ6IHRoZW1lLnRoZW1lKCkgPT09ICdkYXJrJyA/ICdzdW4nIDogJ21vb24nIH1cIiAvPlxyXG4gICAgICAgICAgICA8L2J1dHRvbj5cclxuXHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJkcm9wZG93bi13cmFwXCIgKGNsaWNrKT1cIiRldmVudC5zdG9wUHJvcGFnYXRpb24oKVwiPlxyXG4gICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwicHJvZmlsZS1idG5cIiAoY2xpY2spPVwidG9nZ2xlUHJvZmlsZSgpXCIgW2F0dHIuYXJpYS1leHBhbmRlZF09XCJwcm9maWxlT3BlbigpXCI+XHJcbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cImF2YXRhclwiPnt7IGluaXRpYWxzKCkgfX08L3NwYW4+XHJcbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cIndob1wiPlxyXG4gICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cIndoby1uYW1lXCI+e3sgYXV0aC51c2VyKCk/Lm5hbWUgfX08L3NwYW4+XHJcbiAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwid2hvLXJvbGUgbXV0ZWRcIj57eyByb2xlTGFiZWwoKSB9fTwvc3Bhbj5cclxuICAgICAgICAgICAgICAgIDwvc3Bhbj5cclxuICAgICAgICAgICAgICAgIDxuZy1jb250YWluZXIgW25nVGVtcGxhdGVPdXRsZXRdPVwibmF2SWNvblwiIFtuZ1RlbXBsYXRlT3V0bGV0Q29udGV4dF09XCJ7ICRpbXBsaWNpdDogJ2NoZXZyb24nIH1cIiAvPlxyXG4gICAgICAgICAgICAgIDwvYnV0dG9uPlxyXG4gICAgICAgICAgICAgIEBpZiAocHJvZmlsZU9wZW4oKSkge1xyXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImRyb3Bkb3duIHByb2ZpbGUtcGFuZWxcIj5cclxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInByb2ZpbGUtaW5mb1wiPlxyXG4gICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzPVwid2hvLW5hbWVcIj57eyBhdXRoLnVzZXIoKT8ubmFtZSB9fTwvcD5cclxuICAgICAgICAgICAgICAgICAgICA8cCBjbGFzcz1cIm11dGVkIGVtYWlsXCI+e3sgYXV0aC51c2VyKCk/LmVtYWlsIH19PC9wPlxyXG4gICAgICAgICAgICAgICAgICAgIEBpZiAoYXV0aC51c2VyKCk/LnRlbmFudF9uYW1lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzcz1cInBpbGxcIj57eyBhdXRoLnVzZXIoKT8udGVuYW50X25hbWUgfX08L3A+XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgPGEgW3JvdXRlckxpbmtdPVwidGVuYW50TGluaygpXCIgKGNsaWNrKT1cImNsb3NlTWVudXMoKVwiPkRhc2hib2FyZDwvYT5cclxuICAgICAgICAgICAgICAgICAgQGlmIChpc093bmVyKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICA8YSBbcm91dGVyTGlua109XCJ0ZW5hbnRMaW5rKCdzZXR0aW5ncycpXCIgKGNsaWNrKT1cImNsb3NlTWVudXMoKVwiPkFjY291bnQgc2V0dGluZ3M8L2E+XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJsb2dvdXQtYnRuXCIgKGNsaWNrKT1cImF1dGgubG9nb3V0KClcIj5Mb2cgb3V0PC9idXR0b24+XHJcbiAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgPC9oZWFkZXI+XHJcblxyXG4gICAgICAgIDxzZWN0aW9uIGNsYXNzPVwiYm9keVwiPjxyb3V0ZXItb3V0bGV0IC8+PC9zZWN0aW9uPlxyXG4gICAgICA8L2Rpdj5cclxuICAgIDwvZGl2PlxyXG5cclxuICAgIDxuZy10ZW1wbGF0ZSAjbmF2SWNvbiBsZXQtbmFtZT5cclxuICAgICAgPHN2ZyB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgZmlsbD1cIm5vbmVcIiBzdHJva2U9XCJjdXJyZW50Q29sb3JcIiBzdHJva2Utd2lkdGg9XCIxLjhcIiBzdHJva2UtbGluZWNhcD1cInJvdW5kXCIgc3Ryb2tlLWxpbmVqb2luPVwicm91bmRcIiBhcmlhLWhpZGRlbj1cInRydWVcIj5cclxuICAgICAgICBAc3dpdGNoIChuYW1lKSB7XHJcbiAgICAgICAgICBAY2FzZSAoJ2hvbWUnKSB7XHJcbiAgICAgICAgICAgIDxwYXRoIGQ9XCJNMyA5bDktNyA5IDd2MTFhMiAyIDAgMCAxLTIgMkg1YTIgMiAwIDAgMS0yLTJ6XCIgLz48cG9seWxpbmUgcG9pbnRzPVwiOSAyMiA5IDEyIDE1IDEyIDE1IDIyXCIgLz5cclxuICAgICAgICAgIH1cclxuICAgICAgICAgIEBjYXNlICgnbGlmZWJ1b3knKSB7XHJcbiAgICAgICAgICAgIDxjaXJjbGUgY3g9XCIxMlwiIGN5PVwiMTJcIiByPVwiOVwiIC8+PGNpcmNsZSBjeD1cIjEyXCIgY3k9XCIxMlwiIHI9XCI0XCIgLz48bGluZSB4MT1cIjQuOVwiIHkxPVwiNC45XCIgeDI9XCI5LjJcIiB5Mj1cIjkuMlwiIC8+PGxpbmUgeDE9XCIxNC44XCIgeTE9XCIxNC44XCIgeDI9XCIxOS4xXCIgeTI9XCIxOS4xXCIgLz48bGluZSB4MT1cIjE0LjhcIiB5MT1cIjkuMlwiIHgyPVwiMTkuMVwiIHkyPVwiNC45XCIgLz48bGluZSB4MT1cIjQuOVwiIHkxPVwiMTkuMVwiIHgyPVwiOS4yXCIgeTI9XCIxNC44XCIgLz5cclxuICAgICAgICAgIH1cclxuICAgICAgICAgIEBjYXNlICgnZmluYW5jZScpIHtcclxuICAgICAgICAgICAgPGNpcmNsZSBjeD1cIjEyXCIgY3k9XCIxMlwiIHI9XCI5XCIgLz48cGF0aCBkPVwiTTEyIDd2MTBNOS41IDkuNWMwLTEuMSAxLjEtMiAyLjUtMnMyLjUuOSAyLjUgMmMwIDIuNS01IDEuNS01IDQgMCAxLjEgMS4xIDIgMi41IDJzMi41LS45IDIuNS0yXCIgLz5cclxuICAgICAgICAgIH1cclxuICAgICAgICAgIEBjYXNlICgnc2FsZXMnKSB7XHJcbiAgICAgICAgICAgIDxwb2x5bGluZSBwb2ludHM9XCIzIDE3IDkgMTEgMTMgMTUgMjEgNlwiIC8+PHBvbHlsaW5lIHBvaW50cz1cIjE0IDYgMjEgNiAyMSAxM1wiIC8+XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBAY2FzZSAoJ29wZXJhdGlvbnMnKSB7XHJcbiAgICAgICAgICAgIDxsaW5lIHgxPVwiNFwiIHkxPVwiMjFcIiB4Mj1cIjRcIiB5Mj1cIjE0XCIgLz48bGluZSB4MT1cIjRcIiB5MT1cIjEwXCIgeDI9XCI0XCIgeTI9XCIzXCIgLz48bGluZSB4MT1cIjEyXCIgeTE9XCIyMVwiIHgyPVwiMTJcIiB5Mj1cIjEyXCIgLz48bGluZSB4MT1cIjEyXCIgeTE9XCI4XCIgeDI9XCIxMlwiIHkyPVwiM1wiIC8+PGxpbmUgeDE9XCIyMFwiIHkxPVwiMjFcIiB4Mj1cIjIwXCIgeTI9XCIxNlwiIC8+PGxpbmUgeDE9XCIyMFwiIHkxPVwiMTJcIiB4Mj1cIjIwXCIgeTI9XCIzXCIgLz48bGluZSB4MT1cIjFcIiB5MT1cIjE0XCIgeDI9XCI3XCIgeTI9XCIxNFwiIC8+PGxpbmUgeDE9XCI5XCIgeTE9XCI4XCIgeDI9XCIxNVwiIHkyPVwiOFwiIC8+PGxpbmUgeDE9XCIxN1wiIHkxPVwiMTZcIiB4Mj1cIjIzXCIgeTI9XCIxNlwiIC8+XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBAY2FzZSAoJ21hcmtldGluZycpIHtcclxuICAgICAgICAgICAgPHBhdGggZD1cIk0zIDExdjNhMSAxIDAgMCAwIDEgMWgzbDQgNFY2TDcgMTBINGExIDEgMCAwIDAtMSAxelwiIC8+PHBhdGggZD1cIk0xNS41IDguNWE1IDUgMCAwIDEgMCA3XCIgLz48cGF0aCBkPVwiTTE4LjUgNS41YTkgOSAwIDAgMSAwIDEzXCIgLz5cclxuICAgICAgICAgIH1cclxuICAgICAgICAgIEBjYXNlICgnc3RvcmUnKSB7XHJcbiAgICAgICAgICAgIDxwYXRoIGQ9XCJNMyA5bDEuNS01aDE1TDIxIDlcIiAvPjxwYXRoIGQ9XCJNNSA5djExaDE0VjlcIiAvPjxwYXRoIGQ9XCJNOS41IDIwdi01LjVoNVYyMFwiIC8+XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBAY2FzZSAoJ29yZGVycycpIHtcclxuICAgICAgICAgICAgPHBhdGggZD1cIk0xNCAySDZhMiAyIDAgMCAwLTIgMnYxNmEyIDIgMCAwIDAgMiAyaDEyYTIgMiAwIDAgMCAyLTJWOHpcIiAvPjxwb2x5bGluZSBwb2ludHM9XCIxNCAyIDE0IDggMjAgOFwiIC8+PGxpbmUgeDE9XCIxNlwiIHkxPVwiMTNcIiB4Mj1cIjhcIiB5Mj1cIjEzXCIgLz48bGluZSB4MT1cIjE2XCIgeTE9XCIxN1wiIHgyPVwiOFwiIHkyPVwiMTdcIiAvPlxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgQGNhc2UgKCdwcm9kdWN0cycpIHtcclxuICAgICAgICAgICAgPHBhdGggZD1cIk0yMC41OSAxMy40MSAxMSAzLjgzQTIgMiAwIDAgMCA5LjU5IDMuMjRMNCAzdjUuNTlhMiAyIDAgMCAwIC41OSAxLjQybDkuNTggOS41OGEyIDIgMCAwIDAgMi44MyAwbDMuNTktMy41OWEyIDIgMCAwIDAgMC0yLjU5elwiIC8+PGNpcmNsZSBjeD1cIjhcIiBjeT1cIjhcIiByPVwiMS4yXCIgLz5cclxuICAgICAgICAgIH1cclxuICAgICAgICAgIEBjYXNlICgnaW52ZW50b3J5Jykge1xyXG4gICAgICAgICAgICA8cmVjdCB4PVwiM1wiIHk9XCI0XCIgd2lkdGg9XCIxOFwiIGhlaWdodD1cIjVcIiByeD1cIjFcIiAvPjxwYXRoIGQ9XCJNNSA5djlhMiAyIDAgMCAwIDIgMmgxMGEyIDIgMCAwIDAgMi0yVjlcIiAvPjxsaW5lIHgxPVwiMTBcIiB5MT1cIjEzXCIgeDI9XCIxNFwiIHkyPVwiMTNcIiAvPlxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgQGNhc2UgKCdhZHMnKSB7XHJcbiAgICAgICAgICAgIDxjaXJjbGUgY3g9XCIxMlwiIGN5PVwiMTJcIiByPVwiOVwiIC8+PGNpcmNsZSBjeD1cIjEyXCIgY3k9XCIxMlwiIHI9XCI1XCIgLz48Y2lyY2xlIGN4PVwiMTJcIiBjeT1cIjEyXCIgcj1cIjFcIiAvPlxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgQGNhc2UgKCdhbmFseXRpY3MnKSB7XHJcbiAgICAgICAgICAgIDxsaW5lIHgxPVwiNFwiIHkxPVwiMjBcIiB4Mj1cIjIwXCIgeTI9XCIyMFwiIC8+PHJlY3QgeD1cIjZcIiB5PVwiMTFcIiB3aWR0aD1cIjNcIiBoZWlnaHQ9XCI3XCIgLz48cmVjdCB4PVwiMTNcIiB5PVwiN1wiIHdpZHRoPVwiM1wiIGhlaWdodD1cIjExXCIgLz48cmVjdCB4PVwiMTcuNVwiIHk9XCIxM1wiIHdpZHRoPVwiM1wiIGhlaWdodD1cIjVcIiAvPlxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgQGNhc2UgKCd1c2VycycpIHtcclxuICAgICAgICAgICAgPHBhdGggZD1cIk0xNiAyMXYtMmE0IDQgMCAwIDAtNC00SDZhNCA0IDAgMCAwLTQgNHYyXCIgLz48Y2lyY2xlIGN4PVwiOVwiIGN5PVwiN1wiIHI9XCI0XCIgLz48cGF0aCBkPVwiTTIyIDIxdi0yYTQgNCAwIDAgMC0zLTMuODdcIiAvPjxwYXRoIGQ9XCJNMTYgMy4xM2E0IDQgMCAwIDEgMCA3Ljc1XCIgLz5cclxuICAgICAgICAgIH1cclxuICAgICAgICAgIEBjYXNlICgnc2V0dGluZ3MnKSB7XHJcbiAgICAgICAgICAgIDxjaXJjbGUgY3g9XCIxMlwiIGN5PVwiMTJcIiByPVwiM1wiIC8+PHBhdGggZD1cIk0xOS40IDE1YTEuNjUgMS42NSAwIDAgMCAuMzMgMS44MmwuMDYuMDZhMiAyIDAgMCAxLTIuODMgMi44M2wtLjA2LS4wNmExLjY1IDEuNjUgMCAwIDAtMS44Mi0uMzMgMS42NSAxLjY1IDAgMCAwLTEgMS41MVYyMWEyIDIgMCAwIDEtNCAwdi0uMDlBMS42NSAxLjY1IDAgMCAwIDkgMTkuNGExLjY1IDEuNjUgMCAwIDAtMS44Mi4zM2wtLjA2LjA2YTIgMiAwIDAgMS0yLjgzLTIuODNsLjA2LS4wNmExLjY1IDEuNjUgMCAwIDAgLjMzLTEuODIgMS42NSAxLjY1IDAgMCAwLTEuNTEtMUgzYTIgMiAwIDAgMSAwLTRoLjA5QTEuNjUgMS42NSAwIDAgMCA0LjYgOWExLjY1IDEuNjUgMCAwIDAtLjMzLTEuODJsLS4wNi0uMDZhMiAyIDAgMCAxIDIuODMtMi44M2wuMDYuMDZhMS42NSAxLjY1IDAgMCAwIDEuODIuMzNIOWExLjY1IDEuNjUgMCAwIDAgMS0xLjUxVjNhMiAyIDAgMCAxIDQgMHYuMDlhMS42NSAxLjY1IDAgMCAwIDEgMS41MSAxLjY1IDEuNjUgMCAwIDAgMS44Mi0uMzNsLjA2LS4wNmEyIDIgMCAwIDEgMi44MyAyLjgzbC0uMDYuMDZhMS42NSAxLjY1IDAgMCAwLS4zMyAxLjgyVjljMCAuNy40IDEuMzEgMS4wNSAxLjYuMzEuMTQuNjUuMjIgMSAuMjVsLjUuMDFhMiAyIDAgMCAxIDIgMiAyIDIgMCAwIDEtMiAyaC0uMDlhMS42NSAxLjY1IDAgMCAwLTEuNTEgMXpcIiAvPlxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgQGNhc2UgKCdiYWNrdXBzJykge1xyXG4gICAgICAgICAgICA8ZWxsaXBzZSBjeD1cIjEyXCIgY3k9XCI1XCIgcng9XCI4XCIgcnk9XCIzXCIgLz48cGF0aCBkPVwiTTQgNXY2YzAgMS43IDMuNiAzIDggM3M4LTEuMyA4LTNWNVwiIC8+PHBhdGggZD1cIk00IDExdjZjMCAxLjcgMy42IDMgOCAzczgtMS4zIDgtM3YtNlwiIC8+XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBAY2FzZSAoJ2RvbWFpbnMnKSB7XHJcbiAgICAgICAgICAgIDxjaXJjbGUgY3g9XCIxMlwiIGN5PVwiMTJcIiByPVwiOVwiIC8+PGxpbmUgeDE9XCIzXCIgeTE9XCIxMlwiIHgyPVwiMjFcIiB5Mj1cIjEyXCIgLz48cGF0aCBkPVwiTTEyIDNhMTQgMTQgMCAwIDEgMCAxOGExNCAxNCAwIDAgMSAwLTE4elwiIC8+XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBAY2FzZSAoJ2FwaWtleXMnKSB7XHJcbiAgICAgICAgICAgIDxjaXJjbGUgY3g9XCI3LjVcIiBjeT1cIjE1LjVcIiByPVwiNC41XCIgLz48cGF0aCBkPVwiTTEwLjkgMTIuMSAyMCAzbDEuNSAxLjVMMjAgNmwxLjUgMS41TDIwIDlcIiAvPlxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgQGNhc2UgKCd3ZWJob29rcycpIHtcclxuICAgICAgICAgICAgPGNpcmNsZSBjeD1cIjZcIiBjeT1cIjZcIiByPVwiM1wiIC8+PGNpcmNsZSBjeD1cIjE4XCIgY3k9XCI2XCIgcj1cIjNcIiAvPjxjaXJjbGUgY3g9XCIxMlwiIGN5PVwiMThcIiByPVwiM1wiIC8+PHBhdGggZD1cIk04LjUgNy41IDEwIDE1TTE1LjUgNy41IDE0IDE1XCIgLz5cclxuICAgICAgICAgIH1cclxuICAgICAgICAgIEBjYXNlICgnYWknKSB7XHJcbiAgICAgICAgICAgIDxwYXRoIGQ9XCJNMTIgMnY0TTEyIDE4djRNNC45IDQuOWwyLjggMi44TTE2LjMgMTYuM2wyLjggMi44TTIgMTJoNE0xOCAxMmg0TTQuOSAxOS4xbDIuOC0yLjhNMTYuMyA3LjdsMi44LTIuOFwiIC8+PGNpcmNsZSBjeD1cIjEyXCIgY3k9XCIxMlwiIHI9XCIzLjJcIiAvPlxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgQGNhc2UgKCdzZWFyY2gnKSB7XHJcbiAgICAgICAgICAgIDxjaXJjbGUgY3g9XCIxMVwiIGN5PVwiMTFcIiByPVwiN1wiIC8+PGxpbmUgeDE9XCIyMVwiIHkxPVwiMjFcIiB4Mj1cIjE2LjY1XCIgeTI9XCIxNi42NVwiIC8+XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBAY2FzZSAoJ2JlbGwnKSB7XHJcbiAgICAgICAgICAgIDxwYXRoIGQ9XCJNMTggOGE2IDYgMCAwIDAtMTIgMGMwIDctMyA5LTMgOWgxOHMtMy0yLTMtOVwiIC8+PHBhdGggZD1cIk0xMy43MyAyMWEyIDIgMCAwIDEtMy40NiAwXCIgLz5cclxuICAgICAgICAgIH1cclxuICAgICAgICAgIEBjYXNlICgnc3VuJykge1xyXG4gICAgICAgICAgICA8Y2lyY2xlIGN4PVwiMTJcIiBjeT1cIjEyXCIgcj1cIjQuMlwiIC8+PHBhdGggZD1cIk0xMiAydjIuMk0xMiAxOS44VjIyTTQuMiA0LjJsMS42IDEuNk0xOC4yIDE4LjJsMS42IDEuNk0yIDEyaDIuMk0xOS44IDEySDIyTTQuMiAxOS44bDEuNi0xLjZNMTguMiA1LjhsMS42LTEuNlwiIC8+XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBAY2FzZSAoJ21vb24nKSB7XHJcbiAgICAgICAgICAgIDxwYXRoIGQ9XCJNMjEgMTIuOEE5IDkgMCAxIDEgMTEuMiAzIDcgNyAwIDAgMCAyMSAxMi44elwiIC8+XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBAY2FzZSAoJ2NoZXZyb24nKSB7XHJcbiAgICAgICAgICAgIDxwb2x5bGluZSBwb2ludHM9XCI2IDkgMTIgMTUgMTggOVwiIC8+XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBAY2FzZSAoJ21lbnUnKSB7XHJcbiAgICAgICAgICAgIDxsaW5lIHgxPVwiM1wiIHkxPVwiNlwiIHgyPVwiMjFcIiB5Mj1cIjZcIiAvPjxsaW5lIHgxPVwiM1wiIHkxPVwiMTJcIiB4Mj1cIjIxXCIgeTI9XCIxMlwiIC8+PGxpbmUgeDE9XCIzXCIgeTE9XCIxOFwiIHgyPVwiMjFcIiB5Mj1cIjE4XCIgLz5cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIDwvc3ZnPlxyXG4gICAgPC9uZy10ZW1wbGF0ZT5cclxuXHJcbiAgICA8bmctdGVtcGxhdGUgI21pbmlJY29uIGxldC1uYW1lPlxyXG4gICAgICA8c3ZnIHZpZXdCb3g9XCIwIDAgMjQgMjRcIiBmaWxsPVwibm9uZVwiIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIHN0cm9rZS13aWR0aD1cIjEuOFwiIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIiBzdHJva2UtbGluZWpvaW49XCJyb3VuZFwiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPlxyXG4gICAgICAgIEBzd2l0Y2ggKG5hbWUpIHtcclxuICAgICAgICAgIEBjYXNlICgnbG9nb3V0Jykge1xyXG4gICAgICAgICAgICA8cGF0aCBkPVwiTTkgMjFINWEyIDIgMCAwIDEtMi0yVjVhMiAyIDAgMCAxIDItMmg0XCIgLz48cG9seWxpbmUgcG9pbnRzPVwiMTYgMTcgMjEgMTIgMTYgN1wiIC8+PGxpbmUgeDE9XCIyMVwiIHkxPVwiMTJcIiB4Mj1cIjlcIiB5Mj1cIjEyXCIgLz5cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIDwvc3ZnPlxyXG4gICAgPC9uZy10ZW1wbGF0ZT5cclxuICBgLFxyXG4gIHN0eWxlczogW2BcclxuICAgIC5kYXNoIHsgZGlzcGxheTogZmxleDsgbWluLWhlaWdodDogMTAwdmg7IHBvc2l0aW9uOiByZWxhdGl2ZTsgYmFja2dyb3VuZDogdmFyKC0tcGFwZXIpOyB9XHJcblxyXG4gICAgLyogLS0tLS0tLS0tLSBTaWRlYmFyIC0tLS0tLS0tLS0gKi9cclxuICAgIGFzaWRlIHtcclxuICAgICAgd2lkdGg6IDI0MHB4OyBmbGV4OiBub25lO1xyXG4gICAgICBwb3NpdGlvbjogc3RpY2t5OyB0b3A6IDA7IGhlaWdodDogMTAwdmg7XHJcbiAgICAgIG92ZXJmbG93OiBoaWRkZW47XHJcbiAgICAgIHBhZGRpbmc6IDI0cHggMTZweCAxNnB4IDE2cHg7IGJvcmRlci1yaWdodDogMXB4IHNvbGlkIHZhcigtLWxpbmUpO1xyXG4gICAgICBiYWNrZ3JvdW5kOiAjZjdmMWU0OyBkaXNwbGF5OiBmbGV4OyBmbGV4LWRpcmVjdGlvbjogY29sdW1uOyBnYXA6IDhweDtcclxuICAgICAgdHJhbnNpdGlvbjogd2lkdGggLjJzIGVhc2UsIHRyYW5zZm9ybSAuMnMgZWFzZTtcclxuICAgICAgei1pbmRleDogMTA7XHJcbiAgICB9XHJcbiAgICAvKiBEYXJrLWNocm9tZSBydWxlcyB1c2UgOmhvc3QtY29udGV4dCwgTk9UIDpyb290W2RhdGEtdGhlbWU9XCJkYXJrXCJdOiBBbmd1bGFyJ3MgdmlldyBlbmNhcHN1bGF0aW9uIHNjb3BlcyA6cm9vdCBpbnNpZGUgY29tcG9uZW50IHN0eWxlcywgc28gOnJvb3RbZGF0YS10aGVtZV0gY2FuIG5ldmVyIG1hdGNoIGFuZCB0aGVzZSBydWxlcyB1c2VkIHRvIGJlIGRlYWQuICovXHJcbiAgICA6aG9zdC1jb250ZXh0KFtkYXRhLXRoZW1lPVwiZGFya1wiXSkgYXNpZGUgeyBiYWNrZ3JvdW5kOiAjMWExNzEyOyB9XHJcbiAgICAuYnJhbmQtcm93IHsgZGlzcGxheTogZmxleDsgYWxpZ24taXRlbXM6IGNlbnRlcjsgZmxleDogbm9uZTsgfVxyXG4gICAgLmJyYW5kIHsgZm9udC1zaXplOiAyMnB4OyBkaXNwbGF5OiBmbGV4OyBhbGlnbi1pdGVtczogY2VudGVyOyBnYXA6IDJweDsgfVxyXG4gICAgLmJyYW5kIC5tYXJrIHtcclxuICAgICAgZGlzcGxheTogaW5saW5lLWZsZXg7IGFsaWduLWl0ZW1zOiBjZW50ZXI7IGp1c3RpZnktY29udGVudDogY2VudGVyO1xyXG4gICAgICB3aWR0aDogMzBweDsgaGVpZ2h0OiAzMHB4OyBib3JkZXItcmFkaXVzOiA5cHg7IGJhY2tncm91bmQ6IHZhcigtLWluayk7IGNvbG9yOiB2YXIoLS1wYXBlcik7XHJcbiAgICAgIGZvbnQtc2l6ZTogMTZweDsgZmxleDogbm9uZTtcclxuICAgIH1cclxuICAgIC5zdWJ0aXRsZSB7IG1hcmdpbjogMnB4IDAgNHB4OyBmb250LXNpemU6IDEzcHg7IGZsZXg6IG5vbmU7IH1cclxuICAgIG5hdiB7XHJcbiAgICAgIGRpc3BsYXk6IGZsZXg7IGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47IGdhcDogMnB4O1xyXG4gICAgICBtYXJnaW46IDhweCAtMTZweCAwIC0xNnB4OyBwYWRkaW5nOiAwIDE2cHggOHB4IDE2cHg7XHJcbiAgICAgIG92ZXJmbG93LXk6IGF1dG87IG92ZXJmbG93LXg6IGhpZGRlbjtcclxuICAgICAgZmxleDogMSAxIGF1dG87IG1pbi1oZWlnaHQ6IDA7XHJcbiAgICAgIHNjcm9sbGJhci13aWR0aDogdGhpbjtcclxuICAgICAgc2Nyb2xsYmFyLWNvbG9yOiByZ2JhKDAsMCwwLC4xOCkgdHJhbnNwYXJlbnQ7XHJcbiAgICB9XHJcbiAgICA6aG9zdC1jb250ZXh0KFtkYXRhLXRoZW1lPVwiZGFya1wiXSkgbmF2IHtcclxuICAgICAgc2Nyb2xsYmFyLWNvbG9yOiByZ2JhKDI1NSwyNTUsMjU1LC4yKSB0cmFuc3BhcmVudDtcclxuICAgIH1cclxuICAgIG5hdjo6LXdlYmtpdC1zY3JvbGxiYXIsXHJcbiAgICBhc2lkZTo6LXdlYmtpdC1zY3JvbGxiYXIge1xyXG4gICAgICB3aWR0aDogNHB4O1xyXG4gICAgfVxyXG4gICAgbmF2Ojotd2Via2l0LXNjcm9sbGJhci10cmFjayxcclxuICAgIGFzaWRlOjotd2Via2l0LXNjcm9sbGJhci10cmFjayB7XHJcbiAgICAgIGJhY2tncm91bmQ6IHRyYW5zcGFyZW50O1xyXG4gICAgfVxyXG4gICAgbmF2Ojotd2Via2l0LXNjcm9sbGJhci10aHVtYixcclxuICAgIGFzaWRlOjotd2Via2l0LXNjcm9sbGJhci10aHVtYiB7XHJcbiAgICAgIGJhY2tncm91bmQ6IHJnYmEoMCwwLDAsLjE4KTtcclxuICAgICAgYm9yZGVyLXJhZGl1czogOTk5cHg7XHJcbiAgICB9XHJcbiAgICA6aG9zdC1jb250ZXh0KFtkYXRhLXRoZW1lPVwiZGFya1wiXSkgbmF2Ojotd2Via2l0LXNjcm9sbGJhci10aHVtYixcclxuICAgIDpob3N0LWNvbnRleHQoW2RhdGEtdGhlbWU9XCJkYXJrXCJdKSBhc2lkZTo6LXdlYmtpdC1zY3JvbGxiYXItdGh1bWIge1xyXG4gICAgICBiYWNrZ3JvdW5kOiByZ2JhKDI1NSwyNTUsMjU1LC4yKTtcclxuICAgIH1cclxuICAgIG5hdjo6LXdlYmtpdC1zY3JvbGxiYXItdGh1bWI6aG92ZXIsXHJcbiAgICBhc2lkZTo6LXdlYmtpdC1zY3JvbGxiYXItdGh1bWI6aG92ZXIge1xyXG4gICAgICBiYWNrZ3JvdW5kOiByZ2JhKDAsMCwwLC4zNSk7XHJcbiAgICB9XHJcbiAgICA6aG9zdC1jb250ZXh0KFtkYXRhLXRoZW1lPVwiZGFya1wiXSkgbmF2Ojotd2Via2l0LXNjcm9sbGJhci10aHVtYjpob3ZlcixcclxuICAgIDpob3N0LWNvbnRleHQoW2RhdGEtdGhlbWU9XCJkYXJrXCJdKSBhc2lkZTo6LXdlYmtpdC1zY3JvbGxiYXItdGh1bWI6aG92ZXIge1xyXG4gICAgICBiYWNrZ3JvdW5kOiByZ2JhKDI1NSwyNTUsMjU1LC4zOCk7XHJcbiAgICB9XHJcbiAgICAuc2VjdGlvbi1sYWJlbCB7IG1hcmdpbjogMTRweCAxMHB4IDRweDsgZm9udC1zaXplOiAxMXB4OyBsZXR0ZXItc3BhY2luZzogLjA4ZW07IHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7IGNvbG9yOiB2YXIoLS1pbmstc29mdCk7IGZvbnQtd2VpZ2h0OiA3MDA7IHdoaXRlLXNwYWNlOiBub3dyYXA7IH1cclxuICAgIG5hdiBhIHtcclxuICAgICAgZGlzcGxheTogZmxleDsgYWxpZ24taXRlbXM6IGNlbnRlcjsgZ2FwOiAxMXB4O1xyXG4gICAgICBwYWRkaW5nOiA5cHggMTJweDsgYm9yZGVyLXJhZGl1czogMTJweDsgZm9udC13ZWlnaHQ6IDYwMDsgY29sb3I6IHZhcigtLWluayk7XHJcbiAgICAgIHdoaXRlLXNwYWNlOiBub3dyYXA7XHJcbiAgICB9XHJcbiAgICBuYXYgYSBzdmcgeyB3aWR0aDogMThweDsgaGVpZ2h0OiAxOHB4OyBmbGV4OiBub25lOyB9XHJcbiAgICBuYXYgYTpob3ZlciB7IGJhY2tncm91bmQ6IHJnYmEoMCwwLDAsLjA2KTsgfVxyXG4gICAgOmhvc3QtY29udGV4dChbZGF0YS10aGVtZT1cImRhcmtcIl0pIG5hdiBhOmhvdmVyIHsgYmFja2dyb3VuZDogcmdiYSgyNTUsMjU1LDI1NSwuMDcpOyB9XHJcbiAgICBuYXYgYS5vbiB7IGJhY2tncm91bmQ6IHZhcigtLWluayk7IGNvbG9yOiB2YXIoLS1wYXBlcik7IH1cclxuICAgIC5uYXYtZ3JvdXAge1xyXG4gICAgICB3aWR0aDogMTAwJTsgZGlzcGxheTogZmxleDsgYWxpZ24taXRlbXM6IGNlbnRlcjsganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuOyBnYXA6IDhweDtcclxuICAgICAgcGFkZGluZzogOXB4IDEwcHg7IGJvcmRlcjogMDsgYm9yZGVyLXJhZGl1czogMTJweDsgYmFja2dyb3VuZDogdHJhbnNwYXJlbnQ7IGNvbG9yOiB2YXIoLS1pbmspO1xyXG4gICAgICBmb250OiBpbmhlcml0OyBmb250LXNpemU6IDEzLjVweDsgZm9udC13ZWlnaHQ6IDcwMDsgY3Vyc29yOiBwb2ludGVyO1xyXG4gICAgfVxyXG4gICAgLm5hdi1ncm91cDpob3ZlciB7IGJhY2tncm91bmQ6IHJnYmEoMCwwLDAsLjA2KTsgfVxyXG4gICAgOmhvc3QtY29udGV4dChbZGF0YS10aGVtZT1cImRhcmtcIl0pIC5uYXYtZ3JvdXA6aG92ZXIgeyBiYWNrZ3JvdW5kOiByZ2JhKDI1NSwyNTUsMjU1LC4wNyk7IH1cclxuICAgIC5uYXYtZ3JvdXAtY29weSB7IGRpc3BsYXk6IGZsZXg7IGFsaWduLWl0ZW1zOiBjZW50ZXI7IGdhcDogMTFweDsgfVxyXG4gICAgLm5hdi1ncm91cCBzdmcgeyB3aWR0aDogMThweDsgaGVpZ2h0OiAxOHB4OyBmbGV4OiBub25lOyB9XHJcbiAgICAubmF2LWdyb3VwID4gc3ZnIHsgd2lkdGg6IDEzcHg7IGhlaWdodDogMTNweDsgdHJhbnNpdGlvbjogdHJhbnNmb3JtIC4xOHMgZWFzZTsgfVxyXG4gICAgLm5hdi1ncm91cC5vcGVuID4gc3ZnIHsgdHJhbnNmb3JtOiByb3RhdGUoMTgwZGVnKTsgfVxyXG4gICAgLnN1Ym5hdiB7XHJcbiAgICAgIGRpc3BsYXk6IG5vbmU7XHJcbiAgICAgIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XHJcbiAgICAgIGdhcDogMXB4O1xyXG4gICAgICBtYXJnaW46IDFweCAwIDRweCAxNXB4O1xyXG4gICAgICBwYWRkaW5nLWxlZnQ6IDExcHg7XHJcbiAgICAgIGJvcmRlci1sZWZ0OiAxcHggc29saWQgdmFyKC0tbGluZSk7XHJcbiAgICB9XHJcbiAgICAuc3VibmF2Lm9wZW4geyBkaXNwbGF5OiBmbGV4OyB9XHJcbiAgICAuZmx5b3V0LWhlYWRlciB7IGRpc3BsYXk6IG5vbmU7IH1cclxuICAgIC5zdWJuYXYgYSB7XHJcbiAgICAgIG1pbi1oZWlnaHQ6IDMwcHg7IHBhZGRpbmc6IDZweCA5cHg7IGdhcDogOHB4OyBib3JkZXItcmFkaXVzOiA5cHg7XHJcbiAgICAgIGNvbG9yOiB2YXIoLS1pbmstc29mdCk7IGZvbnQtc2l6ZTogMTJweDsgZGlzcGxheTogZmxleDsgYWxpZ24taXRlbXM6IGNlbnRlcjtcclxuICAgICAgdGV4dC1kZWNvcmF0aW9uOiBub25lO1xyXG4gICAgfVxyXG4gICAgLnN1Ym5hdiBhOmhvdmVyIHsgYmFja2dyb3VuZDogcmdiYSgwLDAsMCwuMDYpOyB9XHJcbiAgICA6aG9zdC1jb250ZXh0KFtkYXRhLXRoZW1lPVwiZGFya1wiXSkgLnN1Ym5hdiBhOmhvdmVyIHsgYmFja2dyb3VuZDogcmdiYSgyNTUsMjU1LDI1NSwuMDcpOyB9XHJcbiAgICAuc3VibmF2IGEub24geyBiYWNrZ3JvdW5kOiBjb2xvci1taXgoaW4gc3JnYiwgdmFyKC0tYWNjZW50LTIpIDE0JSwgdHJhbnNwYXJlbnQpOyBjb2xvcjogdmFyKC0tYWNjZW50LTIpOyB9XHJcbiAgICAuc3VibmF2IGEgaSB7IHdpZHRoOiAxNXB4OyB0ZXh0LWFsaWduOiBjZW50ZXI7IGZvbnQtc2l6ZTogMTFweDsgZmxleDogbm9uZTsgfVxyXG4gICAgLnN1Ym5hdiBhIHN2ZyB7IHdpZHRoOiAxNXB4OyBoZWlnaHQ6IDE1cHg7IGZsZXg6IG5vbmU7IH1cclxuICAgIC5sb2dvdXQge1xyXG4gICAgICBkaXNwbGF5OiBmbGV4OyBhbGlnbi1pdGVtczogY2VudGVyOyBnYXA6IDEwcHg7IGp1c3RpZnktY29udGVudDogZmxleC1zdGFydDtcclxuICAgICAgYmFja2dyb3VuZDogdHJhbnNwYXJlbnQ7IGNvbG9yOiB2YXIoLS1pbmspOyBib3JkZXI6IDFweCBzb2xpZCB2YXIoLS1saW5lKTtcclxuICAgICAgbWFyZ2luLXRvcDogYXV0bzsgZmxleDogbm9uZTtcclxuICAgIH1cclxuICAgIC5sb2dvdXQgc3ZnIHsgd2lkdGg6IDE4cHg7IGhlaWdodDogMThweDsgZmxleDogbm9uZTsgfVxyXG5cclxuICAgIC8qIENvbGxhcHNlZCA9IGljb24tb25seSByYWlsIChkZXNrdG9wKSAqL1xyXG4gICAgQG1lZGlhIChtaW4td2lkdGg6IDkwMXB4KSB7XHJcbiAgICAgIGFzaWRlLmNvbGxhcHNlZCB7XHJcbiAgICAgICAgd2lkdGg6IDc2cHg7XHJcbiAgICAgICAgcGFkZGluZy1sZWZ0OiAxNHB4O1xyXG4gICAgICAgIHBhZGRpbmctcmlnaHQ6IDE0cHg7XHJcbiAgICAgICAgb3ZlcmZsb3c6IHZpc2libGU7XHJcbiAgICAgICAgei1pbmRleDogMzA7XHJcbiAgICAgIH1cclxuICAgICAgYXNpZGUuY29sbGFwc2VkIC5sYWJlbC10ZXh0IHsgZGlzcGxheTogbm9uZTsgfVxyXG4gICAgICBhc2lkZS5jb2xsYXBzZWQgLmJyYW5kIHsganVzdGlmeS1jb250ZW50OiBjZW50ZXI7IH1cclxuICAgICAgYXNpZGUuY29sbGFwc2VkIG5hdiBhIHsganVzdGlmeS1jb250ZW50OiBjZW50ZXI7IHBhZGRpbmc6IDEwcHg7IH1cclxuICAgICAgYXNpZGUuY29sbGFwc2VkIG5hdiB7XHJcbiAgICAgICAgbWFyZ2luLWxlZnQ6IC0xNHB4O1xyXG4gICAgICAgIG1hcmdpbi1yaWdodDogLTE0cHg7XHJcbiAgICAgICAgcGFkZGluZy1sZWZ0OiAxNHB4O1xyXG4gICAgICAgIHBhZGRpbmctcmlnaHQ6IDE0cHg7XHJcbiAgICAgICAgb3ZlcmZsb3c6IHZpc2libGU7XHJcbiAgICAgIH1cclxuICAgICAgYXNpZGUuY29sbGFwc2VkIC5zZWN0aW9uLWxhYmVsIHsgZGlzcGxheTogbm9uZTsgfVxyXG4gICAgICBhc2lkZS5jb2xsYXBzZWQgLmxvZ291dCB7IGp1c3RpZnktY29udGVudDogY2VudGVyOyB9XHJcbiAgICAgIGFzaWRlLmNvbGxhcHNlZCAubmF2LWdyb3VwLXdyYXBwZXIge1xyXG4gICAgICAgIHBvc2l0aW9uOiByZWxhdGl2ZTtcclxuICAgICAgICB3aWR0aDogMTAwJTtcclxuICAgICAgfVxyXG4gICAgICBhc2lkZS5jb2xsYXBzZWQgLm5hdi1ncm91cCB7XHJcbiAgICAgICAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7XHJcbiAgICAgICAgcGFkZGluZzogMTBweDtcclxuICAgICAgICBib3JkZXItcmFkaXVzOiAxMnB4O1xyXG4gICAgICB9XHJcbiAgICAgIGFzaWRlLmNvbGxhcHNlZCAubmF2LWdyb3VwID4gc3ZnIHsgZGlzcGxheTogbm9uZTsgfVxyXG4gICAgICBhc2lkZS5jb2xsYXBzZWQgLm5hdi1ncm91cC1jb3B5IHsganVzdGlmeS1jb250ZW50OiBjZW50ZXI7IH1cclxuXHJcbiAgICAgIC8qIEluIGNvbGxhcHNlZCBtb2RlLCBoaWRlIGlubGluZSBzdWJuYXYgYnkgZGVmYXVsdCAqL1xyXG4gICAgICBhc2lkZS5jb2xsYXBzZWQgLnN1Ym5hdiB7XHJcbiAgICAgICAgZGlzcGxheTogbm9uZSAhaW1wb3J0YW50O1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvKiBIb3ZlciBzdGF0ZSByZXZlYWxzIHRoZSBmbG9hdGluZyBmbHlvdXQgbWVudSB0byB0aGUgcmlnaHQgKi9cclxuICAgICAgYXNpZGUuY29sbGFwc2VkIC5uYXYtZ3JvdXAtd3JhcHBlcjpob3ZlciAubmF2LWdyb3VwIHtcclxuICAgICAgICBiYWNrZ3JvdW5kOiByZ2JhKDAsMCwwLC4wNik7XHJcbiAgICAgIH1cclxuICAgICAgOmhvc3QtY29udGV4dChbZGF0YS10aGVtZT1cImRhcmtcIl0pIGFzaWRlLmNvbGxhcHNlZCAubmF2LWdyb3VwLXdyYXBwZXI6aG92ZXIgLm5hdi1ncm91cCB7XHJcbiAgICAgICAgYmFja2dyb3VuZDogcmdiYSgyNTUsMjU1LDI1NSwuMDcpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBhc2lkZS5jb2xsYXBzZWQgLm5hdi1ncm91cC13cmFwcGVyOmhvdmVyIC5zdWJuYXYge1xyXG4gICAgICAgIGRpc3BsYXk6IGZsZXggIWltcG9ydGFudDtcclxuICAgICAgICBmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xyXG4gICAgICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcclxuICAgICAgICBsZWZ0OiBjYWxjKDEwMCUgKyA4cHgpO1xyXG4gICAgICAgIHRvcDogMDtcclxuICAgICAgICBtaW4td2lkdGg6IDIyMHB4O1xyXG4gICAgICAgIG1heC1oZWlnaHQ6IGNhbGMoMTAwdmggLSA0MHB4KTtcclxuICAgICAgICBvdmVyZmxvdy15OiBhdXRvO1xyXG4gICAgICAgIGJhY2tncm91bmQ6ICNmN2YxZTQ7XHJcbiAgICAgICAgYm9yZGVyOiAxcHggc29saWQgdmFyKC0tbGluZSk7XHJcbiAgICAgICAgYm9yZGVyLXJhZGl1czogMTRweDtcclxuICAgICAgICBib3gtc2hhZG93OiAwIDEycHggMzJweCByZ2JhKDAsMCwwLDAuMTgpO1xyXG4gICAgICAgIHBhZGRpbmc6IDhweDtcclxuICAgICAgICBtYXJnaW46IDA7XHJcbiAgICAgICAgei1pbmRleDogMTAwMDtcclxuICAgICAgfVxyXG4gICAgICA6aG9zdC1jb250ZXh0KFtkYXRhLXRoZW1lPVwiZGFya1wiXSkgYXNpZGUuY29sbGFwc2VkIC5uYXYtZ3JvdXAtd3JhcHBlcjpob3ZlciAuc3VibmF2IHtcclxuICAgICAgICBiYWNrZ3JvdW5kOiAjMWYxYzE2O1xyXG4gICAgICAgIGJveC1zaGFkb3c6IDAgMTJweCAzMnB4IHJnYmEoMCwwLDAsMC41NSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8qIEJvdHRvbS1hbmNob3JlZCBmbHlvdXQgZm9yIGxvd2VyIGdyb3VwcyBsaWtlIEFkbWluICovXHJcbiAgICAgIGFzaWRlLmNvbGxhcHNlZCAubmF2LWdyb3VwLXdyYXBwZXIubmF2LWdyb3VwLWJvdHRvbTpob3ZlciAuc3VibmF2IHtcclxuICAgICAgICB0b3A6IGF1dG87XHJcbiAgICAgICAgYm90dG9tOiAwO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvKiBJbnZpc2libGUgaG92ZXIgYnJpZGdlIHRvIHByZXZlbnQgbG9zaW5nIGhvdmVyIHdoZW4gbW92aW5nIG1vdXNlIHRvd2FyZHMgdGhlIGZseW91dCAqL1xyXG4gICAgICBhc2lkZS5jb2xsYXBzZWQgLm5hdi1ncm91cC13cmFwcGVyOmhvdmVyIC5zdWJuYXY6OmJlZm9yZSB7XHJcbiAgICAgICAgY29udGVudDogJyc7XHJcbiAgICAgICAgcG9zaXRpb246IGFic29sdXRlO1xyXG4gICAgICAgIHRvcDogMDtcclxuICAgICAgICBib3R0b206IDA7XHJcbiAgICAgICAgbGVmdDogLTEycHg7XHJcbiAgICAgICAgd2lkdGg6IDEycHg7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8qIEZseW91dCBoZWFkZXIgaW4gY29sbGFwc2VkIG1vZGUgKi9cclxuICAgICAgYXNpZGUuY29sbGFwc2VkIC5uYXYtZ3JvdXAtd3JhcHBlciAuZmx5b3V0LWhlYWRlciB7XHJcbiAgICAgICAgZGlzcGxheTogYmxvY2s7XHJcbiAgICAgICAgcGFkZGluZzogNnB4IDEwcHggOHB4O1xyXG4gICAgICAgIGZvbnQtc2l6ZTogMTFweDtcclxuICAgICAgICBmb250LXdlaWdodDogNzAwO1xyXG4gICAgICAgIGxldHRlci1zcGFjaW5nOiAuMDhlbTtcclxuICAgICAgICB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlO1xyXG4gICAgICAgIGNvbG9yOiB2YXIoLS1pbmstc29mdCk7XHJcbiAgICAgICAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkIHZhcigtLWxpbmUpO1xyXG4gICAgICAgIG1hcmdpbi1ib3R0b206IDRweDtcclxuICAgICAgfVxyXG5cclxuICAgICAgLyogU3VibmF2IGxpbmtzIGluc2lkZSBmbHlvdXQgKi9cclxuICAgICAgYXNpZGUuY29sbGFwc2VkIC5uYXYtZ3JvdXAtd3JhcHBlciAuc3VibmF2IGEge1xyXG4gICAgICAgIGp1c3RpZnktY29udGVudDogZmxleC1zdGFydCAhaW1wb3J0YW50O1xyXG4gICAgICAgIHBhZGRpbmc6IDdweCAxMHB4ICFpbXBvcnRhbnQ7XHJcbiAgICAgICAgbWluLWhlaWdodDogMzJweDtcclxuICAgICAgICBnYXA6IDEwcHg7XHJcbiAgICAgICAgYm9yZGVyLXJhZGl1czogOHB4O1xyXG4gICAgICAgIGZvbnQtc2l6ZTogMTIuNXB4O1xyXG4gICAgICAgIGZvbnQtd2VpZ2h0OiA2MDA7XHJcbiAgICAgICAgY29sb3I6IHZhcigtLWluayk7XHJcbiAgICAgICAgd2hpdGUtc3BhY2U6IG5vd3JhcDtcclxuICAgICAgfVxyXG4gICAgICBhc2lkZS5jb2xsYXBzZWQgLm5hdi1ncm91cC13cmFwcGVyIC5zdWJuYXYgYSBzdmcsXHJcbiAgICAgIGFzaWRlLmNvbGxhcHNlZCAubmF2LWdyb3VwLXdyYXBwZXIgLnN1Ym5hdiBhIGkge1xyXG4gICAgICAgIHdpZHRoOiAxNXB4O1xyXG4gICAgICAgIGhlaWdodDogMTVweDtcclxuICAgICAgICBmb250LXNpemU6IDEycHg7XHJcbiAgICAgICAgdGV4dC1hbGlnbjogY2VudGVyO1xyXG4gICAgICAgIGZsZXg6IG5vbmU7XHJcbiAgICAgIH1cclxuICAgICAgYXNpZGUuY29sbGFwc2VkIC5uYXYtZ3JvdXAtd3JhcHBlciAuc3VibmF2IGE6aG92ZXIge1xyXG4gICAgICAgIGJhY2tncm91bmQ6IHJnYmEoMCwwLDAsLjA2KTtcclxuICAgICAgfVxyXG4gICAgICA6aG9zdC1jb250ZXh0KFtkYXRhLXRoZW1lPVwiZGFya1wiXSkgYXNpZGUuY29sbGFwc2VkIC5uYXYtZ3JvdXAtd3JhcHBlciAuc3VibmF2IGE6aG92ZXIge1xyXG4gICAgICAgIGJhY2tncm91bmQ6IHJnYmEoMjU1LDI1NSwyNTUsLjA4KTtcclxuICAgICAgfVxyXG4gICAgICBhc2lkZS5jb2xsYXBzZWQgLm5hdi1ncm91cC13cmFwcGVyIC5zdWJuYXYgYS5vbiB7XHJcbiAgICAgICAgYmFja2dyb3VuZDogdmFyKC0taW5rKTtcclxuICAgICAgICBjb2xvcjogdmFyKC0tcGFwZXIpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyogQ29sbGFwc2VkID0gaGlkZGVuIG9mZi1jYW52YXMgZHJhd2VyIChtb2JpbGUpICovXHJcbiAgICBAbWVkaWEgKG1heC13aWR0aDogOTAwcHgpIHtcclxuICAgICAgYXNpZGUge1xyXG4gICAgICAgIHBvc2l0aW9uOiBmaXhlZDsgdG9wOiAwOyBsZWZ0OiAwOyBoZWlnaHQ6IDEwMHZoOyB3aWR0aDogMjY0cHg7XHJcbiAgICAgICAgdHJhbnNmb3JtOiB0cmFuc2xhdGVYKC0xMDAlKTsgYm94LXNoYWRvdzogdmFyKC0tc2hhZG93KTsgei1pbmRleDogNDA7XHJcbiAgICAgIH1cclxuICAgICAgYXNpZGU6bm90KC5jb2xsYXBzZWQpIHsgdHJhbnNmb3JtOiB0cmFuc2xhdGVYKDApOyB9XHJcbiAgICAgIC5iYWNrZHJvcCB7IHBvc2l0aW9uOiBmaXhlZDsgaW5zZXQ6IDA7IGJhY2tncm91bmQ6IHJnYmEoMTAsIDgsIDUsIC40NSk7IHotaW5kZXg6IDM1OyB9XHJcbiAgICB9XHJcbiAgICBAbWVkaWEgKG1pbi13aWR0aDogOTAxcHgpIHsgLmJhY2tkcm9wIHsgZGlzcGxheTogbm9uZTsgfSB9XHJcblxyXG4gICAgLyogLS0tLS0tLS0tLSBDb250ZW50IGNvbHVtbiAtLS0tLS0tLS0tICovXHJcbiAgICAuY29udGVudCB7IGZsZXg6IDE7IG1pbi13aWR0aDogMDsgZGlzcGxheTogZmxleDsgZmxleC1kaXJlY3Rpb246IGNvbHVtbjsgfVxyXG4gICAgLmJvZHkgeyBwYWRkaW5nOiAyOHB4OyB9XHJcblxyXG4gICAgLyogLS0tLS0tLS0tLSBUb3AgbmF2IC0tLS0tLS0tLS0gKi9cclxuICAgIC50b3BuYXYge1xyXG4gICAgICBwb3NpdGlvbjogc3RpY2t5OyB0b3A6IDA7IHotaW5kZXg6IDIwO1xyXG4gICAgICBkaXNwbGF5OiBmbGV4OyBhbGlnbi1pdGVtczogY2VudGVyOyBnYXA6IDE0cHg7XHJcbiAgICAgIHBhZGRpbmc6IDEycHggMjRweDsgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkIHZhcigtLWxpbmUpO1xyXG4gICAgICBiYWNrZ3JvdW5kOiByZ2JhKDI0NCwyMzksMjMwLC45Mik7IGJhY2tkcm9wLWZpbHRlcjogYmx1cigxMHB4KTtcclxuICAgIH1cclxuICAgIDpob3N0LWNvbnRleHQoW2RhdGEtdGhlbWU9XCJkYXJrXCJdKSAudG9wbmF2IHsgYmFja2dyb3VuZDogcmdiYSgyMSwxOSwxNSwuOTIpOyB9XHJcblxyXG4gICAgLmljb24tYnRuIHtcclxuICAgICAgcG9zaXRpb246IHJlbGF0aXZlOyBkaXNwbGF5OiBpbmxpbmUtZmxleDsgYWxpZ24taXRlbXM6IGNlbnRlcjsganVzdGlmeS1jb250ZW50OiBjZW50ZXI7XHJcbiAgICAgIHdpZHRoOiA0MHB4OyBoZWlnaHQ6IDQwcHg7IGJvcmRlci1yYWRpdXM6IDEycHg7IGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLWxpbmUpO1xyXG4gICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1jYXJkKTsgY29sb3I6IHZhcigtLWluayk7IGN1cnNvcjogcG9pbnRlcjsgZmxleDogbm9uZTtcclxuICAgIH1cclxuICAgIC5pY29uLWJ0bjpob3ZlciB7IGJhY2tncm91bmQ6IHZhcigtLXBhcGVyLTIpOyB9XHJcbiAgICAuaWNvbi1idG4gc3ZnIHsgd2lkdGg6IDE5cHg7IGhlaWdodDogMTlweDsgfVxyXG4gICAgLmhhbWJ1cmdlciB7IG1hcmdpbi1yaWdodDogMnB4OyB9XHJcblxyXG4gICAgLnNlYXJjaCB7IHBvc2l0aW9uOiByZWxhdGl2ZTsgZmxleDogMTsgbWF4LXdpZHRoOiA0ODBweDsgZGlzcGxheTogZmxleDsgYWxpZ24taXRlbXM6IGNlbnRlcjsgfVxyXG4gICAgLnNlYXJjaCBzdmcgeyBwb3NpdGlvbjogYWJzb2x1dGU7IGxlZnQ6IDEzcHg7IHdpZHRoOiAxN3B4OyBoZWlnaHQ6IDE3cHg7IGNvbG9yOiB2YXIoLS1pbmstc29mdCk7IHBvaW50ZXItZXZlbnRzOiBub25lOyB9XHJcbiAgICAuc2VhcmNoIGlucHV0IHtcclxuICAgICAgd2lkdGg6IDEwMCU7IHBhZGRpbmc6IDEwcHggMTRweCAxMHB4IDM4cHg7IGJvcmRlci1yYWRpdXM6IDk5OXB4O1xyXG4gICAgICBib3JkZXI6IDFweCBzb2xpZCB2YXIoLS1saW5lKTsgYmFja2dyb3VuZDogdmFyKC0tY2FyZCk7IGNvbG9yOiB2YXIoLS1pbmspOyBmb250OiBpbmhlcml0O1xyXG4gICAgfVxyXG4gICAgLnNlYXJjaCBpbnB1dDpmb2N1cyB7IG91dGxpbmU6IDJweCBzb2xpZCB2YXIoLS1hY2NlbnQpOyBvdXRsaW5lLW9mZnNldDogMXB4OyB9XHJcblxyXG4gICAgLmRyb3Bkb3duIHtcclxuICAgICAgcG9zaXRpb246IGFic29sdXRlOyB0b3A6IGNhbGMoMTAwJSArIDhweCk7IHJpZ2h0OiAwO1xyXG4gICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1jYXJkKTsgYm9yZGVyOiAxcHggc29saWQgdmFyKC0tbGluZSk7IGJvcmRlci1yYWRpdXM6IDE0cHg7XHJcbiAgICAgIGJveC1zaGFkb3c6IHZhcigtLXNoYWRvdyk7IG92ZXJmbG93OiBoaWRkZW47IHotaW5kZXg6IDMwO1xyXG4gICAgfVxyXG4gICAgLnNlYXJjaC1yZXN1bHRzIHsgbGVmdDogMDsgcmlnaHQ6IGF1dG87IHdpZHRoOiAxMDAlOyBtYXgtaGVpZ2h0OiAzNjBweDsgb3ZlcmZsb3cteTogYXV0bzsgcGFkZGluZzogNnB4OyB9XHJcbiAgICAuc2VhcmNoLXJlc3VsdHMgYSB7IGRpc3BsYXk6IGZsZXg7IGFsaWduLWl0ZW1zOiBjZW50ZXI7IGdhcDogMTBweDsgcGFkZGluZzogOXB4IDEwcHg7IGJvcmRlci1yYWRpdXM6IDEwcHg7IH1cclxuICAgIC5zZWFyY2gtcmVzdWx0cyBhOmhvdmVyIHsgYmFja2dyb3VuZDogdmFyKC0tcGFwZXItMik7IH1cclxuICAgIC5zZWFyY2gtcmVzdWx0cyBzdmcgeyB3aWR0aDogMTZweDsgaGVpZ2h0OiAxNnB4OyBmbGV4OiBub25lOyBjb2xvcjogdmFyKC0taW5rLXNvZnQpOyB9XHJcbiAgICAuc2VhcmNoLXJlc3VsdHMgLnItbGFiZWwgeyBkaXNwbGF5OiBibG9jazsgZm9udC13ZWlnaHQ6IDYwMDsgZm9udC1zaXplOiAxNHB4OyB9XHJcbiAgICAuc2VhcmNoLXJlc3VsdHMgLnItc2VjdGlvbiB7IGRpc3BsYXk6IGJsb2NrOyBmb250LXNpemU6IDExcHg7IHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7IGxldHRlci1zcGFjaW5nOiAuMDVlbTsgfVxyXG4gICAgLmVtcHR5LW5vdGUgeyBwYWRkaW5nOiAxNHB4OyBmb250LXNpemU6IDEzcHg7IG1hcmdpbjogMDsgfVxyXG5cclxuICAgIC50b3AtYWN0aW9ucyB7IGRpc3BsYXk6IGZsZXg7IGFsaWduLWl0ZW1zOiBjZW50ZXI7IGdhcDogMTBweDsgbWFyZ2luLWxlZnQ6IGF1dG87IH1cclxuICAgIC5kcm9wZG93bi13cmFwIHsgcG9zaXRpb246IHJlbGF0aXZlOyB9XHJcblxyXG4gICAgLmJhZGdlIHtcclxuICAgICAgcG9zaXRpb246IGFic29sdXRlOyB0b3A6IC00cHg7IHJpZ2h0OiAtNHB4O1xyXG4gICAgICBtaW4td2lkdGg6IDE3cHg7IGhlaWdodDogMTdweDsgcGFkZGluZzogMCA0cHg7IGJvcmRlci1yYWRpdXM6IDk5OXB4O1xyXG4gICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1hY2NlbnQpOyBjb2xvcjogI2ZmZjsgZm9udC1zaXplOiAxMHB4OyBmb250LXdlaWdodDogNzAwO1xyXG4gICAgICBkaXNwbGF5OiBmbGV4OyBhbGlnbi1pdGVtczogY2VudGVyOyBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjsgbGluZS1oZWlnaHQ6IDE7XHJcbiAgICB9XHJcblxyXG4gICAgLm5vdGlmLXBhbmVsIHsgd2lkdGg6IDM0MHB4OyBtYXgtd2lkdGg6IDg2dnc7IH1cclxuICAgIC5kcm9wZG93bi1oZWFkIHsgZGlzcGxheTogZmxleDsgYWxpZ24taXRlbXM6IGNlbnRlcjsganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuOyBwYWRkaW5nOiAxMnB4IDE0cHg7IGJvcmRlci1ib3R0b206IDFweCBzb2xpZCB2YXIoLS1saW5lKTsgZm9udC13ZWlnaHQ6IDcwMDsgZm9udC1zaXplOiAxNHB4OyB9XHJcbiAgICAubGluay1idG4geyBiYWNrZ3JvdW5kOiBub25lOyBib3JkZXI6IDA7IGNvbG9yOiB2YXIoLS1hY2NlbnQpOyBmb250LXdlaWdodDogNjAwOyBmb250LXNpemU6IDEycHg7IGN1cnNvcjogcG9pbnRlcjsgfVxyXG4gICAgLm5vdGlmLXBhbmVsIHVsIHsgbGlzdC1zdHlsZTogbm9uZTsgbWFyZ2luOiAwOyBwYWRkaW5nOiA0cHg7IG1heC1oZWlnaHQ6IDM2MHB4OyBvdmVyZmxvdy15OiBhdXRvOyB9XHJcbiAgICAubm90aWYtcGFuZWwgbGkgeyBkaXNwbGF5OiBmbGV4OyBnYXA6IDEwcHg7IHBhZGRpbmc6IDEwcHg7IGJvcmRlci1yYWRpdXM6IDEwcHg7IGN1cnNvcjogcG9pbnRlcjsgfVxyXG4gICAgLm5vdGlmLXBhbmVsIGxpOmhvdmVyIHsgYmFja2dyb3VuZDogdmFyKC0tcGFwZXItMik7IH1cclxuICAgIC5ub3RpZi1wYW5lbCBsaS51bnJlYWQgLm4tdGl0bGUgeyBmb250LXdlaWdodDogNzAwOyB9XHJcbiAgICAuZG90IHsgd2lkdGg6IDhweDsgaGVpZ2h0OiA4cHg7IGJvcmRlci1yYWRpdXM6IDk5OXB4OyBiYWNrZ3JvdW5kOiB2YXIoLS1hY2NlbnQpOyBtYXJnaW4tdG9wOiA2cHg7IGZsZXg6IG5vbmU7IH1cclxuICAgIC5kb3QuaGlkZSB7IGJhY2tncm91bmQ6IHRyYW5zcGFyZW50OyB9XHJcbiAgICAubi1ib2R5IHAgeyBtYXJnaW46IDA7IH1cclxuICAgIC5uLXRpdGxlIHsgZm9udC1zaXplOiAxMy41cHg7IH1cclxuICAgIC5uLW1zZyB7IGZvbnQtc2l6ZTogMTIuNXB4OyBtYXJnaW4tdG9wOiAycHggIWltcG9ydGFudDsgfVxyXG4gICAgLm4tdGltZSB7IGZvbnQtc2l6ZTogMTFweDsgbWFyZ2luLXRvcDogNHB4ICFpbXBvcnRhbnQ7IH1cclxuXHJcbiAgICAucHJvZmlsZS1idG4ge1xyXG4gICAgICBkaXNwbGF5OiBmbGV4OyBhbGlnbi1pdGVtczogY2VudGVyOyBnYXA6IDhweDsgcGFkZGluZzogNXB4IDEwcHggNXB4IDVweDtcclxuICAgICAgYm9yZGVyLXJhZGl1czogOTk5cHg7IGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLWxpbmUpOyBiYWNrZ3JvdW5kOiB2YXIoLS1jYXJkKTsgY29sb3I6IHZhcigtLWluayk7IGN1cnNvcjogcG9pbnRlcjtcclxuICAgIH1cclxuICAgIC5wcm9maWxlLWJ0bjpob3ZlciB7IGJhY2tncm91bmQ6IHZhcigtLXBhcGVyLTIpOyB9XHJcbiAgICAucHJvZmlsZS1idG4gc3ZnIHsgd2lkdGg6IDE0cHg7IGhlaWdodDogMTRweDsgY29sb3I6IHZhcigtLWluay1zb2Z0KTsgfVxyXG4gICAgLmF2YXRhciB7XHJcbiAgICAgIHdpZHRoOiAzMHB4OyBoZWlnaHQ6IDMwcHg7IGJvcmRlci1yYWRpdXM6IDk5OXB4OyBiYWNrZ3JvdW5kOiB2YXIoLS1pbmspOyBjb2xvcjogdmFyKC0tcGFwZXIpO1xyXG4gICAgICBkaXNwbGF5OiBmbGV4OyBhbGlnbi1pdGVtczogY2VudGVyOyBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjsgZm9udC1zaXplOiAxMnB4OyBmb250LXdlaWdodDogNzAwOyBmbGV4OiBub25lO1xyXG4gICAgfVxyXG4gICAgLndobyB7IGRpc3BsYXk6IGZsZXg7IGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47IGFsaWduLWl0ZW1zOiBmbGV4LXN0YXJ0OyBsaW5lLWhlaWdodDogMS4yOyB9XHJcbiAgICAud2hvLW5hbWUgeyBmb250LXdlaWdodDogNzAwOyBmb250LXNpemU6IDEzcHg7IH1cclxuICAgIC53aG8tcm9sZSB7IGZvbnQtc2l6ZTogMTFweDsgfVxyXG5cclxuICAgIC5wcm9maWxlLXBhbmVsIHsgd2lkdGg6IDI0MHB4OyBwYWRkaW5nOiA2cHg7IH1cclxuICAgIC5wcm9maWxlLWluZm8geyBwYWRkaW5nOiAxMHB4IDEwcHggMTJweDsgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkIHZhcigtLWxpbmUpOyBtYXJnaW4tYm90dG9tOiA2cHg7IH1cclxuICAgIC5wcm9maWxlLWluZm8gLndoby1uYW1lIHsgZm9udC1zaXplOiAxNHB4OyB9XHJcbiAgICAucHJvZmlsZS1pbmZvIC5lbWFpbCB7IGZvbnQtc2l6ZTogMTJweDsgbWFyZ2luOiAycHggMCA2cHg7IH1cclxuICAgIC5wcm9maWxlLXBhbmVsIGEgeyBkaXNwbGF5OiBibG9jazsgcGFkZGluZzogOXB4IDEwcHg7IGJvcmRlci1yYWRpdXM6IDEwcHg7IGZvbnQtd2VpZ2h0OiA2MDA7IGZvbnQtc2l6ZTogMTMuNXB4OyB9XHJcbiAgICAucHJvZmlsZS1wYW5lbCBhOmhvdmVyIHsgYmFja2dyb3VuZDogdmFyKC0tcGFwZXItMik7IH1cclxuICAgIC5sb2dvdXQtYnRuIHsgd2lkdGg6IDEwMCU7IHRleHQtYWxpZ246IGxlZnQ7IGJhY2tncm91bmQ6IG5vbmU7IGJvcmRlcjogMDsgcGFkZGluZzogOXB4IDEwcHg7IGJvcmRlci1yYWRpdXM6IDEwcHg7IGZvbnQtd2VpZ2h0OiA2MDA7IGZvbnQtc2l6ZTogMTMuNXB4OyBjb2xvcjogdmFyKC0tZGFuZ2VyKTsgY3Vyc29yOiBwb2ludGVyOyB9XHJcbiAgICAubG9nb3V0LWJ0bjpob3ZlciB7IGJhY2tncm91bmQ6IHZhcigtLXBhcGVyLTIpOyB9XHJcblxyXG4gICAgQG1lZGlhIChtYXgtd2lkdGg6IDcyMHB4KSB7XHJcbiAgICAgIC53aG8geyBkaXNwbGF5OiBub25lOyB9XHJcbiAgICAgIC50b3BuYXYge1xyXG4gICAgICAgIHBhZGRpbmc6IDhweCAxMnB4O1xyXG4gICAgICAgIGdhcDogOHB4O1xyXG4gICAgICAgIHdpZHRoOiAxMDAlO1xyXG4gICAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7XHJcbiAgICAgIH1cclxuICAgICAgLmljb24tYnRuIHtcclxuICAgICAgICB3aWR0aDogMzZweDtcclxuICAgICAgICBoZWlnaHQ6IDM2cHg7XHJcbiAgICAgICAgYm9yZGVyLXJhZGl1czogMTBweDtcclxuICAgICAgICBmbGV4OiBub25lO1xyXG4gICAgICB9XHJcbiAgICAgIC5pY29uLWJ0biBzdmcge1xyXG4gICAgICAgIHdpZHRoOiAxN3B4O1xyXG4gICAgICAgIGhlaWdodDogMTdweDtcclxuICAgICAgfVxyXG4gICAgICAudG9wLWFjdGlvbnMge1xyXG4gICAgICAgIGdhcDogNnB4O1xyXG4gICAgICAgIGZsZXg6IG5vbmU7XHJcbiAgICAgIH1cclxuICAgICAgLnByb2ZpbGUtYnRuIHtcclxuICAgICAgICBoZWlnaHQ6IDM2cHg7XHJcbiAgICAgICAgcGFkZGluZzogM3B4IDZweCAzcHggM3B4O1xyXG4gICAgICAgIGdhcDogNHB4O1xyXG4gICAgICAgIGZsZXg6IG5vbmU7XHJcbiAgICAgIH1cclxuICAgICAgLnByb2ZpbGUtYnRuIHN2ZyB7XHJcbiAgICAgICAgd2lkdGg6IDEycHg7XHJcbiAgICAgICAgaGVpZ2h0OiAxMnB4O1xyXG4gICAgICB9XHJcbiAgICAgIC5hdmF0YXIge1xyXG4gICAgICAgIHdpZHRoOiAyOHB4O1xyXG4gICAgICAgIGhlaWdodDogMjhweDtcclxuICAgICAgICBmb250LXNpemU6IDExcHg7XHJcbiAgICAgIH1cclxuICAgICAgLnNlYXJjaCB7XHJcbiAgICAgICAgcG9zaXRpb246IHJlbGF0aXZlO1xyXG4gICAgICAgIGZsZXg6IDE7XHJcbiAgICAgICAgbWluLXdpZHRoOiAwO1xyXG4gICAgICB9XHJcbiAgICAgIC5zZWFyY2ggc3ZnIHtcclxuICAgICAgICBsZWZ0OiAxMHB4O1xyXG4gICAgICAgIHdpZHRoOiAxNXB4O1xyXG4gICAgICAgIGhlaWdodDogMTVweDtcclxuICAgICAgfVxyXG4gICAgICAuc2VhcmNoIGlucHV0IHtcclxuICAgICAgICBoZWlnaHQ6IDM2cHg7XHJcbiAgICAgICAgcGFkZGluZzogMCAxMHB4IDAgMzJweDtcclxuICAgICAgICBmb250LXNpemU6IDEzcHg7XHJcbiAgICAgICAgdGV4dC1vdmVyZmxvdzogZWxsaXBzaXM7XHJcbiAgICAgICAgd2hpdGUtc3BhY2U6IG5vd3JhcDtcclxuICAgICAgICBvdmVyZmxvdzogaGlkZGVuO1xyXG4gICAgICB9XHJcbiAgICAgIC5zZWFyY2gtcmVzdWx0cyB7XHJcbiAgICAgICAgcG9zaXRpb246IGFic29sdXRlO1xyXG4gICAgICAgIHRvcDogY2FsYygxMDAlICsgOHB4KTtcclxuICAgICAgICBsZWZ0OiAwO1xyXG4gICAgICAgIHdpZHRoOiBtaW4oMzQwcHgsIGNhbGMoMTAwdncgLSAyNHB4KSk7XHJcbiAgICAgICAgbWF4LXdpZHRoOiBjYWxjKDEwMHZ3IC0gMjRweCk7XHJcbiAgICAgIH1cclxuICAgICAgLm5vdGlmLXBhbmVsIHtcclxuICAgICAgICBtYXgtd2lkdGg6IGNhbGMoMTAwdncgLSAyNHB4KTtcclxuICAgICAgICByaWdodDogLTQwcHg7XHJcbiAgICAgIH1cclxuICAgICAgLnByb2ZpbGUtcGFuZWwge1xyXG4gICAgICAgIG1heC13aWR0aDogY2FsYygxMDB2dyAtIDI0cHgpO1xyXG4gICAgICAgIHJpZ2h0OiAwO1xyXG4gICAgICB9XHJcbiAgICAgIC5ib2R5IHsgcGFkZGluZzogMTZweCAxMnB4OyB9XHJcbiAgICB9XHJcblxyXG4gICAgQG1lZGlhIChtYXgtd2lkdGg6IDQ4MHB4KSB7XHJcbiAgICAgIC50b3BuYXYge1xyXG4gICAgICAgIHBhZGRpbmc6IDhweCAxMHB4O1xyXG4gICAgICAgIGdhcDogNnB4O1xyXG4gICAgICB9XHJcbiAgICAgIC50b3AtYWN0aW9ucyB7XHJcbiAgICAgICAgZ2FwOiA0cHg7XHJcbiAgICAgIH1cclxuICAgICAgLmljb24tYnRuIHtcclxuICAgICAgICB3aWR0aDogMzRweDtcclxuICAgICAgICBoZWlnaHQ6IDM0cHg7XHJcbiAgICAgIH1cclxuICAgICAgLnByb2ZpbGUtYnRuIHtcclxuICAgICAgICBoZWlnaHQ6IDM0cHg7XHJcbiAgICAgICAgcGFkZGluZzogMnB4IDRweCAycHggMnB4O1xyXG4gICAgICB9XHJcbiAgICAgIC5hdmF0YXIge1xyXG4gICAgICAgIHdpZHRoOiAyNnB4O1xyXG4gICAgICAgIGhlaWdodDogMjZweDtcclxuICAgICAgICBmb250LXNpemU6IDEwLjVweDtcclxuICAgICAgfVxyXG4gICAgICAucHJvZmlsZS1idG4gc3ZnIHtcclxuICAgICAgICBkaXNwbGF5OiBub25lO1xyXG4gICAgICB9XHJcbiAgICAgIC5zZWFyY2ggaW5wdXQge1xyXG4gICAgICAgIGhlaWdodDogMzRweDtcclxuICAgICAgICBwYWRkaW5nOiAwIDhweCAwIDI4cHg7XHJcbiAgICAgICAgZm9udC1zaXplOiAxMi41cHg7XHJcbiAgICAgIH1cclxuICAgICAgLnNlYXJjaCBzdmcge1xyXG4gICAgICAgIGxlZnQ6IDlweDtcclxuICAgICAgICB3aWR0aDogMTNweDtcclxuICAgICAgICBoZWlnaHQ6IDEzcHg7XHJcbiAgICAgIH1cclxuICAgICAgLm5vdGlmLXBhbmVsIHtcclxuICAgICAgICByaWdodDogLTgwcHg7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAuZ3JvdXAtZGl2aWRlciB7XHJcbiAgICAgIGhlaWdodDogMXB4OyBtYXJnaW46IDhweCAwIDZweDsgYmFja2dyb3VuZDogdmFyKC0tbGluZSk7IH1cclxuICAgIC5zdWJuYXYtdGl0bGUge1xyXG4gICAgICBwYWRkaW5nOiAycHggOHB4IDA7IGZvbnQtc2l6ZTogMTBweDsgbGV0dGVyLXNwYWNpbmc6IC4wOGVtOyB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlOyBjb2xvcjogdmFyKC0taW5rLXNvZnQpOyBmb250LXdlaWdodDogNzAwOyB9XHJcbiAgICAuZ3JvdXBlZC1zdWJuYXYgeyBtYXJnaW4tdG9wOiAwOyB9XHJcbiAgICAuZ3JvdXBlZC1zdWJuYXYgLnN1Ym5hdi10aXRsZSB7IG1hcmdpbi10b3A6IDJweDsgfVxyXG4gICAgLmdyb3VwZWQtc3VibmF2IGEge1xyXG4gICAgICBwYWRkaW5nLWxlZnQ6IDEwcHg7XHJcbiAgICB9XHJcbiAgICAuZ3JvdXBlZC1zdWJuYXYgLmxhYmVsLXRleHQgeyBvdmVyZmxvdzogdmlzaWJsZTsgfVxyXG4gIGBdLFxyXG59KVxyXG5leHBvcnQgY2xhc3MgU2VsbGVyU2hlbGxDb21wb25lbnQge1xyXG4gIGF1dGggPSBpbmplY3QoQXV0aFNlcnZpY2UpO1xyXG4gIHRoZW1lID0gaW5qZWN0KFRoZW1lU2VydmljZSk7XHJcbiAgcHJpdmF0ZSByb3V0ZXIgPSBpbmplY3QoUm91dGVyKTtcclxuXHJcbiAgaXNPd25lciA9IGNvbXB1dGVkKCgpID0+IHRoaXMuYXV0aC5oYXNSb2xlKCd0ZW5hbnRfb3duZXInKSk7XHJcbiAgY2FuVmlld0FjY291bnRpbmcgPSBjb21wdXRlZCgoKSA9PiB0aGlzLmlzT3duZXIoKSB8fCB0aGlzLmF1dGgudXNlcigpPy5kZXBhcnRtZW50ID09PSAnZmluYW5jZScpO1xyXG4gIGNhblZpZXdTYWxlcyA9IGNvbXB1dGVkKCgpID0+IHRoaXMuaXNPd25lcigpIHx8IHRoaXMuYXV0aC51c2VyKCk/LmRlcGFydG1lbnQgPT09ICdzYWxlcycpO1xyXG4gIGNhblZpZXdPcGVyYXRpb25zID0gY29tcHV0ZWQoKCkgPT4gdGhpcy5pc093bmVyKCkgfHwgdGhpcy5hdXRoLnVzZXIoKT8uZGVwYXJ0bWVudCA9PT0gJ29wZXJhdGlvbnMnKTtcclxuICBjYW5WaWV3TWFya2V0aW5nID0gY29tcHV0ZWQoKCkgPT4gdGhpcy5pc093bmVyKCkgfHwgdGhpcy5hdXRoLnVzZXIoKT8uZGVwYXJ0bWVudCA9PT0gJ21hcmtldGluZycpO1xyXG5cclxuICByZWFkb25seSBhY2NvdW50aW5nSXRlbXM6IE5hdkVudHJ5W10gPSBbXHJcbiAgICB7IGtleTogJ2RlcGFydG1lbnRzL2ZpbmFuY2UnLCBmYUljb246ICdmYS1zb2xpZCBmYS10YWJsZS1jb2x1bW5zJywgbGFiZWw6ICdPdmVydmlldycsIGljb246ICdmaW5hbmNlJyB9LFxyXG4gICAgeyBrZXk6ICdhY2NvdW50aW5nL2ludm9pY2VzJywgZmFJY29uOiAnZmEtc29saWQgZmEtZmlsZS1pbnZvaWNlJywgbGFiZWw6ICdJbnZvaWNlcycsIGljb246ICdmaW5hbmNlJyB9LFxyXG4gICAgeyBrZXk6ICdhY2NvdW50aW5nL3BheW1lbnRzJywgZmFJY29uOiAnZmEtc29saWQgZmEtY3JlZGl0LWNhcmQnLCBsYWJlbDogJ1BheW1lbnRzJywgaWNvbjogJ2ZpbmFuY2UnIH0sXHJcbiAgICB7IGtleTogJ2FjY291bnRpbmcvZXhwZW5zZXMnLCBmYUljb246ICdmYS1zb2xpZCBmYS1yZWNlaXB0JywgbGFiZWw6ICdFeHBlbnNlcycsIGljb246ICdmaW5hbmNlJyB9LFxyXG4gICAgeyBrZXk6ICdhY2NvdW50aW5nL3Byb2N1cmVtZW50JywgZmFJY29uOiAnZmEtc29saWQgZmEtY2FydC1zaG9wcGluZycsIGxhYmVsOiAnUHJvY3VyZW1lbnQnLCBpY29uOiAnb3BlcmF0aW9ucycgfSxcclxuICAgIHsga2V5OiAnYWNjb3VudGluZy92ZW5kb3JzJywgZmFJY29uOiAnZmEtc29saWQgZmEtaGFuZHNoYWtlJywgbGFiZWw6ICdDdXN0b21lcnMgJiB2ZW5kb3JzJywgaWNvbjogJ3VzZXJzJyB9LFxyXG4gICAgeyBrZXk6ICdhY2NvdW50aW5nL3JlY29uY2lsaWF0aW9uJywgZmFJY29uOiAnZmEtc29saWQgZmEtYnVpbGRpbmctY29sdW1ucycsIGxhYmVsOiAnQmFuayByZWNvbmNpbGlhdGlvbicsIGljb246ICdmaW5hbmNlJyB9LFxyXG4gICAgeyBrZXk6ICdhY2NvdW50aW5nL2NoYXJ0LW9mLWFjY291bnRzJywgZmFJY29uOiAnZmEtc29saWQgZmEtYm9vaycsIGxhYmVsOiAnQ2hhcnQgb2YgYWNjb3VudHMnLCBpY29uOiAnYW5hbHl0aWNzJyB9LFxyXG4gICAgeyBrZXk6ICdhY2NvdW50aW5nL2pvdXJuYWxzJywgZmFJY29uOiAnZmEtc29saWQgZmEtYm9vay1vcGVuJywgbGFiZWw6ICdHZW5lcmFsIGpvdXJuYWwnLCBpY29uOiAnZmluYW5jZScgfSxcclxuICAgIHsga2V5OiAnYWNjb3VudGluZy9yZXBvcnRzJywgZmFJY29uOiAnZmEtc29saWQgZmEtY2hhcnQtY29sdW1uJywgbGFiZWw6ICdGaW5hbmNpYWwgcmVwb3J0cycsIGljb246ICdhbmFseXRpY3MnIH0sXHJcbiAgXTtcclxuXHJcbiAgcmVhZG9ubHkgc2FsZXNJdGVtczogTmF2RW50cnlbXSA9IFtcclxuICAgIHsga2V5OiAnZGVwYXJ0bWVudHMvc2FsZXMnLCBmYUljb246ICdmYS1zb2xpZCBmYS10YWJsZS1jb2x1bW5zJywgbGFiZWw6ICdPdmVydmlldycsIGljb246ICdzYWxlcycgfSxcclxuICAgIHsga2V5OiAnc2FsZXMvbGVhZHMnLCBmYUljb246ICdmYS1zb2xpZCBmYS11c2VyLXBsdXMnLCBsYWJlbDogJ0xlYWRzJywgaWNvbjogJ3VzZXJzJyB9LFxyXG4gICAgeyBrZXk6ICdzYWxlcy9waXBlbGluZScsIGZhSWNvbjogJ2ZhLXNvbGlkIGZhLWZpbHRlcicsIGxhYmVsOiAnUGlwZWxpbmUnLCBpY29uOiAnc2FsZXMnIH0sXHJcbiAgICB7IGtleTogJ3NhbGVzL3F1b3RlcycsIGZhSWNvbjogJ2ZhLXNvbGlkIGZhLWZpbGUtbGluZXMnLCBsYWJlbDogJ1F1b3RlcycsIGljb246ICdmaW5hbmNlJyB9LFxyXG4gICAgeyBrZXk6ICdzYWxlcy9jdXN0b21lcnMnLCBmYUljb246ICdmYS1zb2xpZCBmYS11c2VyLWdyb3VwJywgbGFiZWw6ICdDdXN0b21lcnMnLCBpY29uOiAndXNlcnMnIH0sXHJcbiAgXTtcclxuXHJcbiAgcmVhZG9ubHkgb3BlcmF0aW9uc0l0ZW1zOiBOYXZFbnRyeVtdID0gW1xyXG4gICAgeyBrZXk6ICdkZXBhcnRtZW50cy9vcGVyYXRpb25zJywgZmFJY29uOiAnZmEtc29saWQgZmEtdGFibGUtY29sdW1ucycsIGxhYmVsOiAnT3ZlcnZpZXcnLCBpY29uOiAnb3BlcmF0aW9ucycgfSxcclxuICAgIHsga2V5OiAnb3BlcmF0aW9ucy9mdWxmaWxsbWVudCcsIGZhSWNvbjogJ2ZhLXNvbGlkIGZhLXRydWNrLWZhc3QnLCBsYWJlbDogJ0Z1bGZpbG1lbnQnLCBpY29uOiAnb3JkZXJzJyB9LFxyXG4gICAgeyBrZXk6ICdvcGVyYXRpb25zL2ludmVudG9yeScsIGZhSWNvbjogJ2ZhLXNvbGlkIGZhLWJveGVzLXN0YWNrZWQnLCBsYWJlbDogJ0ludmVudG9yeScsIGljb246ICdpbnZlbnRvcnknIH0sXHJcbiAgICB7IGtleTogJ29wZXJhdGlvbnMvY2F0YWxvZycsIGZhSWNvbjogJ2ZhLXNvbGlkIGZhLWZvbGRlci1vcGVuJywgbGFiZWw6ICdDYXRhbG9ndWUnLCBpY29uOiAncHJvZHVjdHMnIH0sXHJcbiAgXTtcclxuXHJcbiAgcmVhZG9ubHkgbWFya2V0aW5nSXRlbXM6IE5hdkVudHJ5W10gPSBbXHJcbiAgICB7IGtleTogJ2RlcGFydG1lbnRzL21hcmtldGluZycsIGZhSWNvbjogJ2ZhLXNvbGlkIGZhLXRhYmxlLWNvbHVtbnMnLCBsYWJlbDogJ092ZXJ2aWV3JywgaWNvbjogJ21hcmtldGluZycgfSxcclxuICAgIHsga2V5OiAnbWFya2V0aW5nL2NhbXBhaWducycsIGZhSWNvbjogJ2ZhLXNvbGlkIGZhLWJ1bGxob3JuJywgbGFiZWw6ICdDYW1wYWlnbnMnLCBpY29uOiAnYWRzJyB9LFxyXG4gICAgeyBrZXk6ICdtYXJrZXRpbmcvcGVyZm9ybWFuY2UnLCBmYUljb246ICdmYS1zb2xpZCBmYS1jaGFydC1saW5lJywgbGFiZWw6ICdQZXJmb3JtYW5jZScsIGljb246ICdhbmFseXRpY3MnIH0sXHJcbiAgXTtcclxuXHJcbiAgcmVhZG9ubHkgY29tbWVyY2VJdGVtczogTmF2RW50cnlbXSA9IFtcclxuICAgIHsga2V5OiAnc3RvcmVzJywgbGFiZWw6ICdTdG9yZXMnLCBpY29uOiAnc3RvcmUnIH0sXHJcbiAgICB7IGtleTogJ29yZGVycycsIGxhYmVsOiAnT3JkZXJzJywgaWNvbjogJ29yZGVycycgfSxcclxuICAgIHsga2V5OiAncHJvZHVjdHMnLCBsYWJlbDogJ1Byb2R1Y3RzJywgaWNvbjogJ3Byb2R1Y3RzJyB9LFxyXG4gICAgeyBrZXk6ICdpbnZlbnRvcnknLCBsYWJlbDogJ0ludmVudG9yeScsIGljb246ICdpbnZlbnRvcnknIH0sXHJcbiAgICB7IGtleTogJ2FkcycsIGxhYmVsOiAnQWRzJywgaWNvbjogJ2FkcycgfSxcclxuICAgIHsga2V5OiAnYW5hbHl0aWNzJywgbGFiZWw6ICdBbmFseXRpY3MnLCBpY29uOiAnYW5hbHl0aWNzJyB9LFxyXG4gIF07XHJcblxyXG4gIHJlYWRvbmx5IGFkbWluSXRlbXM6IE5hdkVudHJ5W10gPSBbXHJcbiAgICB7IGtleTogJ3VzZXJzJywgbGFiZWw6ICdVc2VycyAmIHBlcm1pc3Npb25zJywgaWNvbjogJ3VzZXJzJyB9LFxyXG4gICAgeyBrZXk6ICdzZXR0aW5ncycsIGxhYmVsOiAnU2V0dGluZ3MnLCBpY29uOiAnc2V0dGluZ3MnIH0sXHJcbiAgICB7IGtleTogJ2JhY2t1cHMnLCBsYWJlbDogJ0JhY2t1cHMnLCBpY29uOiAnYmFja3VwcycgfSxcclxuICAgIHsga2V5OiAnZG9tYWlucycsIGxhYmVsOiAnRG9tYWlucycsIGljb246ICdkb21haW5zJyB9LFxyXG4gICAgeyBrZXk6ICdhcGkta2V5cycsIGxhYmVsOiAnQVBJIGtleXMnLCBpY29uOiAnYXBpa2V5cycgfSxcclxuICAgIHsga2V5OiAnd2ViaG9va3MnLCBsYWJlbDogJ1dlYmhvb2tzJywgaWNvbjogJ3dlYmhvb2tzJyB9LFxyXG4gICAgeyBrZXk6ICdhaScsIGxhYmVsOiAnQUknLCBpY29uOiAnYWknIH0sXHJcbiAgXTtcclxuXHJcbiAgYWN0aXZlU2VjdGlvbiA9IHNpZ25hbDxTaWRlYmFyU2VjdGlvbiB8IG51bGw+KHRoaXMuaW5pdGlhbFNlY3Rpb24oKSk7XHJcblxyXG4gIC8qKiBBY2NvcmRpb24gbWVudSBzdGF0ZTogb3BlbmluZyBvbmUgZHJvcGRvd24gYXV0b21hdGljYWxseSBjbG9zZXMgdGhlIG90aGVycy4gKi9cclxuICBhY2NvdW50aW5nT3BlbiA9IGNvbXB1dGVkKCgpID0+IHRoaXMuYWN0aXZlU2VjdGlvbigpID09PSAnYWNjb3VudGluZycpO1xyXG4gIHNhbGVzT3BlbiA9IGNvbXB1dGVkKCgpID0+IHRoaXMuYWN0aXZlU2VjdGlvbigpID09PSAnc2FsZXMnKTtcclxuICBvcGVyYXRpb25zT3BlbiA9IGNvbXB1dGVkKCgpID0+IHRoaXMuYWN0aXZlU2VjdGlvbigpID09PSAnb3BlcmF0aW9ucycpO1xyXG4gIG1hcmtldGluZ09wZW4gPSBjb21wdXRlZCgoKSA9PiB0aGlzLmFjdGl2ZVNlY3Rpb24oKSA9PT0gJ21hcmtldGluZycpO1xyXG4gIGNvbW1lcmNlT3BlbiA9IGNvbXB1dGVkKCgpID0+IHRoaXMuYWN0aXZlU2VjdGlvbigpID09PSAnY29tbWVyY2UnKTtcclxuICBhZG1pbk9wZW4gPSBjb21wdXRlZCgoKSA9PiB0aGlzLmFjdGl2ZVNlY3Rpb24oKSA9PT0gJ2FkbWluJyk7XHJcblxyXG4gIC8qKiBTaWRlYmFyIGNvbGxhcHNlIChpY29uIHJhaWwgb24gZGVza3RvcCwgb2ZmLWNhbnZhcyBkcmF3ZXIgb24gbW9iaWxlKS4gKi9cclxuICBjb2xsYXBzZWQgPSBzaWduYWwodGhpcy5pbml0aWFsQ29sbGFwc2VkKCkpO1xyXG4gIC8qKiBCYWNrZHJvcCBvbmx5IGV2ZXIgcGFpbnRzIG9uIHNtYWxsIHNjcmVlbnMgKGhpZGRlbiB2aWEgQ1NTIGF0IGRlc2t0b3Agd2lkdGhzKS4gKi9cclxuICBtb2JpbGVPcGVuID0gY29tcHV0ZWQoKCkgPT4gIXRoaXMuY29sbGFwc2VkKCkpO1xyXG5cclxuICAvLyAtLS0tIFNlYXJjaCAtLS0tXHJcbiAgc2VhcmNoVGVybSA9IHNpZ25hbCgnJyk7XHJcbiAgc2VhcmNoRm9jdXNlZCA9IHNpZ25hbChmYWxzZSk7XHJcbiAgc2hvd1NlYXJjaFBhbmVsID0gY29tcHV0ZWQoKCkgPT4gdGhpcy5zZWFyY2hGb2N1c2VkKCkpO1xyXG5cclxuICBzZWFyY2hJbmRleCA9IGNvbXB1dGVkPFNlYXJjaEVudHJ5W10+KCgpID0+IHtcclxuICAgIGNvbnN0IGl0ZW1zOiBTZWFyY2hFbnRyeVtdID0gW3sgbGFiZWw6ICdEYXNoYm9hcmQnLCBwYXRoOiB0aGlzLnRlbmFudExpbmsoKSwgaWNvbjogJ2hvbWUnLCBzZWN0aW9uOiAnT3ZlcnZpZXcnIH1dO1xyXG4gICAgaWYgKHRoaXMuY2FuVmlld0FjY291bnRpbmcoKSkge1xyXG4gICAgICBmb3IgKGNvbnN0IGEgb2YgdGhpcy5hY2NvdW50aW5nSXRlbXMpIHtcclxuICAgICAgICBpdGVtcy5wdXNoKHsgbGFiZWw6IGEubGFiZWwsIHBhdGg6IHRoaXMudGVuYW50TGluayhhLmtleSksIGljb246IGEuaWNvbiwgc2VjdGlvbjogJ0FjY291bnRpbmcnIH0pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5jYW5WaWV3U2FsZXMoKSkge1xyXG4gICAgICBmb3IgKGNvbnN0IHMgb2YgdGhpcy5zYWxlc0l0ZW1zKSB7XHJcbiAgICAgICAgaXRlbXMucHVzaCh7IGxhYmVsOiBzLmxhYmVsLCBwYXRoOiB0aGlzLnRlbmFudExpbmsocy5rZXkpLCBpY29uOiBzLmljb24sIHNlY3Rpb246ICdTYWxlcycgfSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGlmICh0aGlzLmNhblZpZXdPcGVyYXRpb25zKCkpIHtcclxuICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHRoaXMub3BlcmF0aW9uc0l0ZW1zKSBpdGVtcy5wdXNoKHsgbGFiZWw6IGl0ZW0ubGFiZWwsIHBhdGg6IHRoaXMudGVuYW50TGluayhpdGVtLmtleSksIGljb246IGl0ZW0uaWNvbiwgc2VjdGlvbjogJ09wZXJhdGlvbnMnIH0pO1xyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMuY2FuVmlld01hcmtldGluZygpKSB7XHJcbiAgICAgIGZvciAoY29uc3QgaXRlbSBvZiB0aGlzLm1hcmtldGluZ0l0ZW1zKSBpdGVtcy5wdXNoKHsgbGFiZWw6IGl0ZW0ubGFiZWwsIHBhdGg6IHRoaXMudGVuYW50TGluayhpdGVtLmtleSksIGljb246IGl0ZW0uaWNvbiwgc2VjdGlvbjogJ01hcmtldGluZycgfSk7XHJcbiAgICB9XHJcbiAgICBmb3IgKGNvbnN0IGMgb2YgdGhpcy5jb21tZXJjZUl0ZW1zKSB7XHJcbiAgICAgIGl0ZW1zLnB1c2goeyBsYWJlbDogYy5sYWJlbCwgcGF0aDogdGhpcy50ZW5hbnRMaW5rKGMua2V5KSwgaWNvbjogYy5pY29uLCBzZWN0aW9uOiAnQ29tbWVyY2UnIH0pO1xyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMuaXNPd25lcigpKSB7XHJcbiAgICAgIGZvciAoY29uc3QgYSBvZiB0aGlzLmFkbWluSXRlbXMpIHtcclxuICAgICAgICBpdGVtcy5wdXNoKHsgbGFiZWw6IGEubGFiZWwsIHBhdGg6IHRoaXMudGVuYW50TGluayhhLmtleSksIGljb246IGEuaWNvbiwgc2VjdGlvbjogJ0FkbWluJyB9KTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGl0ZW1zO1xyXG4gIH0pO1xyXG5cclxuICBzZWFyY2hSZXN1bHRzID0gY29tcHV0ZWQoKCkgPT4ge1xyXG4gICAgY29uc3QgdGVybSA9IHRoaXMuc2VhcmNoVGVybSgpLnRyaW0oKS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgaWYgKCF0ZXJtKSByZXR1cm4gW107XHJcbiAgICByZXR1cm4gdGhpcy5zZWFyY2hJbmRleCgpLmZpbHRlcigoaSkgPT4gaS5sYWJlbC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHRlcm0pKTtcclxuICB9KTtcclxuXHJcbiAgLy8gLS0tLSBOb3RpZmljYXRpb25zIChkZW1vIGRhdGE7IHdpcmUgdG8gYSByZWFsIGZlZWQgd2hlbiB0aGUgQVBJIGV4aXN0cykgLS0tLVxyXG4gIG5vdGlmaWNhdGlvbnMgPSBzaWduYWw8Tm90aWZpY2F0aW9uSXRlbVtdPihbXHJcbiAgICB7IGlkOiAxLCB0aXRsZTogJ05ldyBvcmRlciByZWNlaXZlZCcsIG1lc3NhZ2U6ICdPcmRlciAjMTA0NTYgd2FzIGp1c3QgcGxhY2VkIGZvciAkMTI4LjQwLicsIHRpbWU6ICc1bSBhZ28nLCByZWFkOiBmYWxzZSB9LFxyXG4gICAgeyBpZDogMiwgdGl0bGU6ICdMb3cgc3RvY2sgYWxlcnQnLCBtZXNzYWdlOiAn4oCcQ2VyYW1pYyBNdWcg4oCUIFNhbmTigJ0gaGFzIDMgdW5pdHMgbGVmdC4nLCB0aW1lOiAnMWggYWdvJywgcmVhZDogZmFsc2UgfSxcclxuICAgIHsgaWQ6IDMsIHRpdGxlOiAnUGF5b3V0IHNlbnQnLCBtZXNzYWdlOiAnWW91ciB3ZWVrbHkgcGF5b3V0IG9mICQyLDM0MC4wMCB3YXMgc2VudC4nLCB0aW1lOiAnWWVzdGVyZGF5JywgcmVhZDogZmFsc2UgfSxcclxuICAgIHsgaWQ6IDQsIHRpdGxlOiAnU3RhZmYgaW52aXRlIGFjY2VwdGVkJywgbWVzc2FnZTogJ0EgbmV3IHRlYW1tYXRlIGpvaW5lZCB5b3VyIHN0b3JlLicsIHRpbWU6ICcyIGRheXMgYWdvJywgcmVhZDogdHJ1ZSB9LFxyXG4gIF0pO1xyXG4gIHVucmVhZENvdW50ID0gY29tcHV0ZWQoKCkgPT4gdGhpcy5ub3RpZmljYXRpb25zKCkuZmlsdGVyKChuKSA9PiAhbi5yZWFkKS5sZW5ndGgpO1xyXG4gIG5vdGlmT3BlbiA9IHNpZ25hbChmYWxzZSk7XHJcbiAgcHJvZmlsZU9wZW4gPSBzaWduYWwoZmFsc2UpO1xyXG5cclxuICBpbml0aWFscyA9IGNvbXB1dGVkKCgpID0+IHtcclxuICAgIGNvbnN0IG5hbWUgPSB0aGlzLmF1dGgudXNlcigpPy5uYW1lID8/ICcnO1xyXG4gICAgY29uc3QgcGFydHMgPSBuYW1lLnRyaW0oKS5zcGxpdCgvXFxzKy8pLmZpbHRlcihCb29sZWFuKS5zbGljZSgwLCAyKTtcclxuICAgIHJldHVybiBwYXJ0cy5tYXAoKHApID0+IHBbMF0/LnRvVXBwZXJDYXNlKCkpLmpvaW4oJycpIHx8ICdVJztcclxuICB9KTtcclxuXHJcbiAgcm9sZUxhYmVsID0gY29tcHV0ZWQoKCkgPT4ge1xyXG4gICAgY29uc3QgdXNlciA9IHRoaXMuYXV0aC51c2VyKCk7XHJcbiAgICBpZiAoIXVzZXIpIHJldHVybiAnJztcclxuICAgIGlmICh1c2VyLnJvbGUgPT09ICd0ZW5hbnRfb3duZXInKSByZXR1cm4gJ1RlbmFudCBvd25lcic7XHJcbiAgICBpZiAodXNlci5yb2xlID09PSAnc3RvcmVfc3RhZmYnKSByZXR1cm4gdXNlci5kZXBhcnRtZW50ID8gYCR7dXNlci5kZXBhcnRtZW50fSBzdGFmZmAgOiAnU3RvcmUgc3RhZmYnO1xyXG4gICAgcmV0dXJuIHVzZXIucm9sZTtcclxuICB9KTtcclxuXHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICBlZmZlY3QoKCkgPT4ge1xyXG4gICAgICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgfHwgdGhpcy5pc01vYmlsZSgpKSByZXR1cm47XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oU0lERUJBUl9LRVksIHRoaXMuY29sbGFwc2VkKCkgPyAnMScgOiAnMCcpO1xyXG4gICAgICB9IGNhdGNoIHtcclxuICAgICAgICAvKiBpZ25vcmUgc3RvcmFnZSBmYWlsdXJlcyAocHJpdmF0ZSBtb2RlLCBldGMuKSAqL1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHRlbmFudExpbmsocGF0aCA9ICcnKTogc3RyaW5nIHtcclxuICAgIGNvbnN0IGJhc2UgPSB0aGlzLnJvdXRlci51cmwuc3RhcnRzV2l0aCgnL3NlbGxlcicpID8gJy9zZWxsZXInIDogJy90ZW5hbnQnO1xyXG4gICAgcmV0dXJuIHBhdGggPyBgJHtiYXNlfS8ke3BhdGh9YCA6IGJhc2U7XHJcbiAgfVxyXG5cclxuICB0b2dnbGVTaWRlYmFyKCkge1xyXG4gICAgdGhpcy5jb2xsYXBzZWQudXBkYXRlKCh2KSA9PiAhdik7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGluaXRpYWxTZWN0aW9uKCk6IFNpZGViYXJTZWN0aW9uIHwgbnVsbCB7XHJcbiAgICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcpIHJldHVybiAnY29tbWVyY2UnO1xyXG4gICAgY29uc3QgdXJsID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lIHx8IHRoaXMucm91dGVyLnVybDtcclxuICAgIGlmICh1cmwuaW5jbHVkZXMoJy9hY2NvdW50aW5nJykgfHwgdXJsLmluY2x1ZGVzKCcvZGVwYXJ0bWVudHMvZmluYW5jZScpKSByZXR1cm4gJ2FjY291bnRpbmcnO1xyXG4gICAgaWYgKHVybC5pbmNsdWRlcygnL3NhbGVzJykgfHwgdXJsLmluY2x1ZGVzKCcvZGVwYXJ0bWVudHMvc2FsZXMnKSkgcmV0dXJuICdzYWxlcyc7XHJcbiAgICBpZiAodXJsLmluY2x1ZGVzKCcvb3BlcmF0aW9ucycpIHx8IHVybC5pbmNsdWRlcygnL2RlcGFydG1lbnRzL29wZXJhdGlvbnMnKSkgcmV0dXJuICdvcGVyYXRpb25zJztcclxuICAgIGlmICh1cmwuaW5jbHVkZXMoJy9tYXJrZXRpbmcnKSB8fCB1cmwuaW5jbHVkZXMoJy9kZXBhcnRtZW50cy9tYXJrZXRpbmcnKSkgcmV0dXJuICdtYXJrZXRpbmcnO1xyXG4gICAgaWYgKFxyXG4gICAgICB1cmwuaW5jbHVkZXMoJy91c2VycycpIHx8XHJcbiAgICAgIHVybC5pbmNsdWRlcygnL3NldHRpbmdzJykgfHxcclxuICAgICAgdXJsLmluY2x1ZGVzKCcvYmFja3VwcycpIHx8XHJcbiAgICAgIHVybC5pbmNsdWRlcygnL2RvbWFpbnMnKSB8fFxyXG4gICAgICB1cmwuaW5jbHVkZXMoJy9hcGkta2V5cycpIHx8XHJcbiAgICAgIHVybC5pbmNsdWRlcygnL3dlYmhvb2tzJykgfHxcclxuICAgICAgdXJsLmluY2x1ZGVzKCcvYWknKVxyXG4gICAgKSB7XHJcbiAgICAgIHJldHVybiAnYWRtaW4nO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuICdjb21tZXJjZSc7XHJcbiAgfVxyXG5cclxuICB0b2dnbGVTZWN0aW9uKHNlY3Rpb246IFNpZGViYXJTZWN0aW9uKSB7XHJcbiAgICB0aGlzLmFjdGl2ZVNlY3Rpb24udXBkYXRlKChjdXJyZW50KSA9PiAoY3VycmVudCA9PT0gc2VjdGlvbiA/IG51bGwgOiBzZWN0aW9uKSk7XHJcbiAgfVxyXG5cclxuICB0b2dnbGVBY2NvdW50aW5nKCkge1xyXG4gICAgdGhpcy50b2dnbGVTZWN0aW9uKCdhY2NvdW50aW5nJyk7XHJcbiAgfVxyXG5cclxuICB0b2dnbGVTYWxlcygpIHtcclxuICAgIHRoaXMudG9nZ2xlU2VjdGlvbignc2FsZXMnKTtcclxuICB9XHJcblxyXG4gIHRvZ2dsZU9wZXJhdGlvbnMoKSB7XHJcbiAgICB0aGlzLnRvZ2dsZVNlY3Rpb24oJ29wZXJhdGlvbnMnKTtcclxuICB9XHJcblxyXG4gIHRvZ2dsZU1hcmtldGluZygpIHtcclxuICAgIHRoaXMudG9nZ2xlU2VjdGlvbignbWFya2V0aW5nJyk7XHJcbiAgfVxyXG5cclxuICB0b2dnbGVDb21tZXJjZSgpIHtcclxuICAgIHRoaXMudG9nZ2xlU2VjdGlvbignY29tbWVyY2UnKTtcclxuICB9XHJcblxyXG4gIHRvZ2dsZUFkbWluKCkge1xyXG4gICAgdGhpcy50b2dnbGVTZWN0aW9uKCdhZG1pbicpO1xyXG4gIH1cclxuXHJcbiAgb25OYXZpZ2F0ZSgpIHtcclxuICAgIHRoaXMuY2xvc2VNZW51cygpO1xyXG4gICAgaWYgKHRoaXMuaXNNb2JpbGUoKSkgdGhpcy5jb2xsYXBzZWQuc2V0KHRydWUpO1xyXG4gIH1cclxuXHJcbiAgb25TZWFyY2hJbnB1dChldmVudDogRXZlbnQpIHtcclxuICAgIHRoaXMuc2VhcmNoVGVybS5zZXQoKGV2ZW50LnRhcmdldCBhcyBIVE1MSW5wdXRFbGVtZW50KS52YWx1ZSk7XHJcbiAgfVxyXG5cclxuICBvblNlYXJjaEZvY3VzKCkge1xyXG4gICAgdGhpcy5zZWFyY2hGb2N1c2VkLnNldCh0cnVlKTtcclxuICAgIHRoaXMubm90aWZPcGVuLnNldChmYWxzZSk7XHJcbiAgICB0aGlzLnByb2ZpbGVPcGVuLnNldChmYWxzZSk7XHJcbiAgfVxyXG5cclxuICBjbGVhclNlYXJjaCgpIHtcclxuICAgIHRoaXMuc2VhcmNoVGVybS5zZXQoJycpO1xyXG4gICAgdGhpcy5zZWFyY2hGb2N1c2VkLnNldChmYWxzZSk7XHJcbiAgfVxyXG5cclxuICBnb1RvRmlyc3RSZXN1bHQoKSB7XHJcbiAgICBjb25zdCByZXN1bHQgPSB0aGlzLnNlYXJjaFJlc3VsdHMoKVswXTtcclxuICAgIGlmIChyZXN1bHQpIHtcclxuICAgICAgdGhpcy5yb3V0ZXIubmF2aWdhdGVCeVVybChyZXN1bHQucGF0aCk7XHJcbiAgICAgIHRoaXMuY2xlYXJTZWFyY2goKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHRvZ2dsZU5vdGlmaWNhdGlvbnMoKSB7XHJcbiAgICB0aGlzLm5vdGlmT3Blbi51cGRhdGUoKHYpID0+ICF2KTtcclxuICAgIHRoaXMucHJvZmlsZU9wZW4uc2V0KGZhbHNlKTtcclxuICAgIHRoaXMuc2VhcmNoRm9jdXNlZC5zZXQoZmFsc2UpO1xyXG4gIH1cclxuXHJcbiAgbWFya1JlYWQoaWQ6IG51bWJlcikge1xyXG4gICAgdGhpcy5ub3RpZmljYXRpb25zLnVwZGF0ZSgobGlzdCkgPT4gbGlzdC5tYXAoKG4pID0+IChuLmlkID09PSBpZCA/IHsgLi4ubiwgcmVhZDogdHJ1ZSB9IDogbikpKTtcclxuICB9XHJcblxyXG4gIG1hcmtBbGxSZWFkKCkge1xyXG4gICAgdGhpcy5ub3RpZmljYXRpb25zLnVwZGF0ZSgobGlzdCkgPT4gbGlzdC5tYXAoKG4pID0+ICh7IC4uLm4sIHJlYWQ6IHRydWUgfSkpKTtcclxuICB9XHJcblxyXG4gIHRvZ2dsZVByb2ZpbGUoKSB7XHJcbiAgICB0aGlzLnByb2ZpbGVPcGVuLnVwZGF0ZSgodikgPT4gIXYpO1xyXG4gICAgdGhpcy5ub3RpZk9wZW4uc2V0KGZhbHNlKTtcclxuICAgIHRoaXMuc2VhcmNoRm9jdXNlZC5zZXQoZmFsc2UpO1xyXG4gIH1cclxuXHJcbiAgY2xvc2VNZW51cygpIHtcclxuICAgIHRoaXMubm90aWZPcGVuLnNldChmYWxzZSk7XHJcbiAgICB0aGlzLnByb2ZpbGVPcGVuLnNldChmYWxzZSk7XHJcbiAgICB0aGlzLnNlYXJjaEZvY3VzZWQuc2V0KGZhbHNlKTtcclxuICB9XHJcblxyXG4gIEBIb3N0TGlzdGVuZXIoJ2RvY3VtZW50OmNsaWNrJylcclxuICBvbkRvY3VtZW50Q2xpY2soKSB7XHJcbiAgICB0aGlzLmNsb3NlTWVudXMoKTtcclxuICB9XHJcblxyXG4gIEBIb3N0TGlzdGVuZXIoJ2RvY3VtZW50OmtleWRvd24uZXNjYXBlJylcclxuICBvbkVzY2FwZSgpIHtcclxuICAgIHRoaXMuY2xvc2VNZW51cygpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBpc01vYmlsZSgpOiBib29sZWFuIHtcclxuICAgIHJldHVybiB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cuaW5uZXJXaWR0aCA8PSBNT0JJTEVfQlJFQUtQT0lOVDtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgaW5pdGlhbENvbGxhcHNlZCgpOiBib29sZWFuIHtcclxuICAgIGlmICh0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJykgcmV0dXJuIGZhbHNlO1xyXG4gICAgaWYgKHRoaXMuaXNNb2JpbGUoKSkgcmV0dXJuIHRydWU7XHJcbiAgICB0cnkge1xyXG4gICAgICByZXR1cm4gbG9jYWxTdG9yYWdlLmdldEl0ZW0oU0lERUJBUl9LRVkpID09PSAnMSc7XHJcbiAgICB9IGNhdGNoIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG4iXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLFNBQVMsV0FBVyxjQUFjLFVBQVUsUUFBUSxRQUFRLGNBQWM7QUFDMUUsU0FBUyx3QkFBd0I7QUFDakMsU0FBUyxRQUFRLFlBQVksa0JBQWtCLG9CQUFvQjtBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBMEMzRCxJQUFBLDRCQUFBLEdBQUEsT0FBQSxFQUFBO0FBQXNCLElBQUEsd0JBQUEsU0FBQSxTQUFBLG1FQUFBO0FBQUEsTUFBQSwyQkFBQSxHQUFBO0FBQUEs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QUEsS0FBQSxLQUFBLEdBQUEsSUFBQTtBQUNNLE1BQUEsdUJBQUEsQ0FBQTtBQUFBLE1BQUEsK0JBQUEsSUFBQSxVQUFBLENBQUE7QUFFakIsTUFBQSx1QkFBQTtBQUFBLE1BQUEsd0JBQUEsb0JBQUEsVUFBQSxFQUE0QiwyQkFBQSw2QkFBQSxJQUFBLEdBQUEsQ0FBQTtBQUU1QyxNQUFBLHVCQUFBO0FBQUEsTUFBQSwyQkFBQSxJQUFBLFlBQUEsSUFBQSxLQUFBLEVBQUE7O29CQTNQRixjQUFjLFlBQVksa0JBQWtCLGdCQUFnQixHQUFBLFFBQUEsQ0FBQSxza3RCQUFBLEVBQUEsQ0FBQTs7OytFQTR6QjNELHNCQUFvQixDQUFBO1VBOXpCaEM7dUJBQ1csb0JBQWtCLFNBQ25CLENBQUMsY0FBYyxZQUFZLGtCQUFrQixnQkFBZ0IsR0FBQyxVQUM3RDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7S0E2V1QsUUFBQSxDQUFBLHUwZ0JBQUEsRUFBQSxDQUFBOztVQXl0QkE7V0FBYSxnQkFBZ0I7O1VBSzdCO1dBQWEseUJBQXlCOzs7O2dGQWhSNUIsc0JBQW9CLEVBQUEsV0FBQSx3QkFBQSxVQUFBLDRDQUFBLFlBQUEsSUFBQSxDQUFBO0FBQUEsR0FBQTs7Ozs7Ozs4REFBcEIsc0JBQW9CLEVBQUEsU0FBQSxDQUFBLEVBQUEsR0FBQSxDQUFBLGNBQUEsWUFBQSxrQkFBQSxrQkFBQSxXQUFBLFlBQUEsR0FBQSxhQUFBLEVBQUEsQ0FBQTtFQUFBO0FBQUEsR0FBQSxPQUFBLGNBQUEsZUFBQSxjQUFBLDZCQUFBLEtBQUEsSUFBQSxDQUFBO0FBQUEsR0FBQSxPQUFBLGNBQUEsZUFBQSxlQUFBLFlBQUEsT0FBQSxZQUFBLElBQUEsR0FBQSw0QkFBQSxDQUFBLE1BQUEsRUFBQSxPQUFBLE1BQUEsNkJBQUEsRUFBQSxTQUFBLENBQUE7QUFBQSxHQUFBOyIsIm5hbWVzIjpbXSwiZGVidWdJZCI6IjFmMDA0YzNiLWE4MDAtNWNjNC1iYzVhLWFhOWI4YjA3NzBkNiJ9