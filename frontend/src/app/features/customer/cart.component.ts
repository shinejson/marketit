import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { CartGroup, CartPayload, DeliveryOption } from '../../core/models';
import { MoneyPipe } from '../../shared/money.pipe';

@Component({
  selector: 'app-cart',
  imports: [FormsModule, RouterLink, MoneyPipe],
  template: `
    <div class="wrap page">
      <h1>Cart</h1>

      @if (message()) { <div class="note ok" role="status">{{ message() }}</div> }
      @if (error()) { <div class="note bad" role="alert">{{ error() }}</div> }

      @if (!cart() || !cart()!.groups.length) {
        <div class="empty card">Your cart is empty. <a routerLink="/products">Browse products</a></div>
      } @else {
        @for (g of cart()!.groups; track g.store.id) {
          <section class="card group">
            <h3>{{ g.store.name }}</h3>
            @for (item of g.items; track item.id) {
              <div class="row">
                <div>
                  <strong>{{ item.product_name }}</strong>
                  <p class="muted">{{ item.sku }} · {{ +item.unit_price | money }}</p>
                </div>
                <div class="qty">
                  <button class="btn ghost" (click)="setQty(item.id, item.qty - 1)">-</button>
                  <span>{{ item.qty }}</span>
                  <button class="btn ghost" (click)="setQty(item.id, item.qty + 1)">+</button>
                </div>
                <strong>{{ +item.line_total | money }}</strong>
              </div>
            }

            @if (g.delivery_options?.length) {
              <div class="delivery">
                <p class="delivery-head">Delivery</p>
                <div class="delivery-grid" role="radiogroup" [attr.aria-label]="'Delivery for ' + g.store.name">
                  @for (option of g.delivery_options || []; track option.method_id) {
                    <label class="delivery-option" [class.selected]="isChosen(g, option)">
                      <input
                        type="radio"
                        [name]="'delivery-' + g.store.id"
                        [checked]="isChosen(g, option)"
                        (change)="chooseDelivery(g, option)"
                      />
                      <span>
                        <strong>{{ option.name }}</strong>
                        <small>
                          {{ +option.fee > 0 ? (+option.fee | money) : 'Free' }}
                          @if (option.min_days !== null && option.min_days !== undefined) {
                            · {{ option.min_days }}–{{ option.max_days }} days
                          }
                        </small>
                        @if (option.pickup_address) { <small class="muted">{{ option.pickup_address }}</small> }
                      </span>
                    </label>
                  }
                </div>
              </div>
            }

            <p class="muted">
              Store subtotal {{ +g.subtotal | money }}
              @if (+(g.discount || 0) > 0) { · discount −{{ +(g.discount || 0) | money }} }
              · delivery {{ +(g.delivery_fee ?? g.store.delivery_fee) | money }}
              @if (+(g.tax || 0) > 0) { · tax {{ +(g.tax || 0) | money }} }
            </p>
          </section>
        }

        <section class="card coupon">
          <h3>Have a coupon?</h3>
          @if (cart()!.coupon; as applied) {
            <div class="applied" [class.invalid]="applied.invalid">
              <div>
                <strong>{{ applied.code }}</strong>
                <p class="muted">
                  @if (applied.invalid) { {{ applied.message || 'This code no longer applies to your basket.' }} }
                  @else { {{ applied.name || 'Discount applied' }} — you save {{ +applied.amount | money }} }
                </p>
              </div>
              <button class="btn ghost" type="button" (click)="removeCoupon()" [disabled]="busy()">Remove</button>
            </div>
          } @else {
            <div class="coupon-row">
              <input [(ngModel)]="code" name="code" placeholder="Enter code" (keyup.enter)="applyCoupon()" aria-label="Coupon code" />
              <button class="btn" type="button" (click)="applyCoupon()" [disabled]="busy() || !code.trim()">Apply</button>
            </div>
          }
        </section>

        <aside class="card totals">
          <p>Items {{ +cart()!.totals.subtotal | money }}</p>
          @if (discountTotal() > 0) { <p class="save">Discount −{{ discountTotal() | money }}</p> }
          <p>Delivery {{ +cart()!.totals.delivery_total | money }}</p>
          @if (+cart()!.totals.tax_total > 0) { <p>Tax {{ +cart()!.totals.tax_total | money }}</p> }
          <h2>Total {{ +cart()!.totals.grand_total | money }}</h2>
          <a routerLink="/checkout" class="btn accent">Checkout</a>
        </aside>
      }
    </div>
  `,
  styles: [
    `
      .page { padding: 32px 0 64px; display: grid; gap: 16px; }
      .group { padding: 18px; }
      .row { display: flex; justify-content: space-between; gap: 12px; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--line); }
      .qty { display: flex; gap: 8px; align-items: center; }
      .totals { padding: 18px; }
      .save { color: var(--ok); font-weight: 650; }
      .delivery { margin: 14px 0 6px; }
      .delivery-head { margin: 0 0 7px; font-size: 11px; font-weight: 750; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-soft); }
      .delivery-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 9px; }
      .delivery-option { display: flex; gap: 9px; align-items: flex-start; padding: 11px 13px; border: 1px solid var(--line); border-radius: 13px; cursor: pointer; background: var(--paper-2); }
      .delivery-option.selected { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 7%, var(--card)); }
      .delivery-option input { margin-top: 3px; accent-color: var(--accent); }
      .delivery-option strong, .delivery-option small { display: block; }
      .delivery-option small { color: var(--ink-soft); margin-top: 2px; font-size: 11.5px; }
      .coupon { padding: 18px; }
      .coupon h3 { margin: 0 0 10px; }
      .coupon-row { display: flex; gap: 8px; flex-wrap: wrap; }
      .coupon-row input { flex: 1 1 180px; padding: 9px 12px; border: 1px solid var(--line); border-radius: 10px; background: var(--paper-2); color: var(--ink); font: inherit; }
      .applied { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; border: 1px solid color-mix(in srgb, var(--ok) 40%, var(--line)); border-radius: 12px; background: var(--paper-2); }
      .applied.invalid { border-color: color-mix(in srgb, var(--danger) 40%, var(--line)); }
      .applied p { margin: 3px 0 0; font-size: 12.5px; }
      .note { padding: 11px 14px; border: 1px solid var(--line); border-radius: 12px; font-size: 13px; }
      .note.ok { border-color: color-mix(in srgb, var(--ok) 40%, var(--line)); color: var(--ok); }
      .note.bad { border-color: color-mix(in srgb, var(--danger) 40%, var(--line)); color: var(--danger); }
    `,
  ],
})
export class CartComponent {
  private api = inject(ApiService);

  cart = signal<CartPayload | null>(null);
  busy = signal(false);
  error = signal('');
  message = signal('');
  code = '';

  discountTotal = computed(() => Number(this.cart()?.totals?.discount_total ?? 0));

  constructor() {
    this.refresh();
  }

  refresh() {
    this.api.cart().subscribe((res) => this.cart.set(res.data));
  }

  setQty(id: number, qty: number) {
    this.api.updateCartItem(id, qty).subscribe((res) => this.cart.set(res.data));
  }

  isChosen(group: CartGroup, option: DeliveryOption): boolean {
    const chosen = group.delivery;
    if (!chosen) return !!option.is_default;
    return (chosen.method_id ?? null) === (option.method_id ?? null);
  }

  chooseDelivery(group: CartGroup, option: DeliveryOption) {
    const choices: Record<string, number> = {};
    for (const g of this.cart()?.groups ?? []) {
      const picked = g.store.id === group.store.id ? option : g.delivery;
      if (picked?.method_id) choices[String(g.store.id)] = picked.method_id;
    }
    this.busy.set(true);
    this.api.priceCart(null, choices).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.cart.set(res.data);
      },
      error: () => {
        this.busy.set(false);
        this.error.set('We could not price that delivery option.');
      },
    });
  }

  applyCoupon() {
    const code = this.code.trim();
    if (!code) return;
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    this.api.applyCartCoupon(code).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.cart.set(res.data);
        this.code = '';
        this.message.set(`Coupon applied — you save ${res.data.coupon?.amount ?? ''}.`);
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.errors?.coupon?.[0] || err?.error?.message || 'That code could not be applied.');
      },
    });
  }

  removeCoupon() {
    this.busy.set(true);
    this.api.removeCartCoupon().subscribe({
      next: (res) => {
        this.busy.set(false);
        this.cart.set(res.data);
        this.message.set('Coupon removed.');
      },
      error: () => {
        this.busy.set(false);
        this.error.set('We could not remove that coupon.');
      },
    });
  }
}
