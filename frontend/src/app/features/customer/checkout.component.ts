import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { Address, CartGroup, CartPayload, DeliveryOption, PaymentMethodsPayload } from '../../core/models';
import { MoneyPipe } from '../../shared/money.pipe';

@Component({
  selector: 'app-checkout',
  imports: [FormsModule, MoneyPipe],
  template: `
    <div class="wrap page">
      <h1>Checkout</h1>
      @if (quote(); as q) {
        <p class="muted">
          {{ q.groups.length }} store(s) · items {{ +q.totals.subtotal | money }}
          @if (+(q.totals.discount_total || 0) > 0) { · <span class="save">discount −{{ +(q.totals.discount_total || 0) | money }}</span> }
          · delivery {{ +q.totals.delivery_total | money }}
          @if (+q.totals.tax_total > 0) { · tax {{ +q.totals.tax_total | money }} }
          · <b>total {{ +q.totals.grand_total | money }}</b>
        </p>
      }
      <section class="card pad">
        <h3>Shipping address</h3>
        @for (a of addresses(); track a.id) {
          <label class="addr"><input type="radio" name="addr" [value]="a.id" [(ngModel)]="addressId" (ngModelChange)="reprice()" /> {{ a.full_name }} — {{ a.line1 }}, {{ a.city }}</label>
        }
        <details>
          <summary>New address</summary>
          <div class="field"><label>Full name</label><input [(ngModel)]="newAddr.full_name" name="full_name" /></div>
          <div class="field"><label>Line 1</label><input [(ngModel)]="newAddr.line1" name="line1" /></div>
          <div class="field"><label>City</label><input [(ngModel)]="newAddr.city" name="city" /></div>
          <div class="field"><label>Country</label><input [(ngModel)]="newAddr.country" name="country" maxlength="2" /></div>
          <button type="button" class="btn ghost" (click)="saveAddress()">Save address</button>
        </details>
      </section>
      @if (hasDeliveryChoices()) {
        <section class="card pad">
          <h3>Delivery</h3>
          <p class="muted small">Options are priced against the address you selected above.</p>
          @for (g of quote()?.groups || []; track g.store.id) {
            @if (g.delivery_options?.length) {
              <div class="delivery-block">
                <p class="delivery-store">{{ g.store.name }}</p>
                <div class="payment-options" role="radiogroup" [attr.aria-label]="'Delivery for ' + g.store.name">
                  @for (option of g.delivery_options || []; track option.method_id) {
                    <label class="payment-option" [class.selected]="isChosen(g, option)">
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
                        @if (option.pickup_address) { <small>{{ option.pickup_address }}</small> }
                      </span>
                    </label>
                  }
                </div>
              </div>
            }
          }
        </section>
      }

      <section class="card pad">
        <div class="section-head">
          <div><h3>Payment method</h3><p class="muted small">Payments are processed securely by the configured provider.</p></div>
          @if (payment(); as p) { <span class="pill">{{ p.currency }} · {{ p.mode === 'live' ? 'Live' : 'Test' }}</span> }
        </div>
        @if (paymentMethods().length) {
          <div class="payment-options" role="radiogroup" aria-label="Payment method">
            @for (method of paymentMethods(); track method.key) {
              <label class="payment-option" [class.selected]="paymentMethod === method.key">
                <input type="radio" name="payment_method" [value]="method.key" [(ngModel)]="paymentMethod" />
                <span><strong>{{ method.label }}</strong><small>{{ method.description }}</small></span>
              </label>
            }
          </div>
        } @else {
          <p class="muted">No payment methods are available. Please try again later.</p>
        }
      </section>
      @if (error()) { <p class="err">{{ error() }}</p> }
      <button class="btn accent" [disabled]="busy() || !addressId || !paymentMethod || !paymentMethods().length" (click)="pay()">{{ isOffline() ? 'Place order' : 'Continue to secure payment' }}</button>
    </div>
  `,
  styles: [`
    .page { padding: 32px 0 64px; display:grid; gap: 16px; max-width: 720px; }
    .pad { padding: 18px; }
    .addr { display:block; margin: 8px 0; }
    .section-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
    .section-head h3 { margin:0; }
    .small { font-size:12px; }
    .payment-options { display:grid; grid-template-columns:repeat(auto-fit,minmax(210px,1fr)); gap:10px; margin-top:14px; }
    .payment-option { display:flex; gap:10px; align-items:flex-start; padding:13px; border:1px solid var(--line); border-radius:14px; cursor:pointer; background:var(--card); }
    .payment-option.selected { border-color:var(--accent); box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 14%,transparent); }
    .payment-option input { margin-top:3px; accent-color:var(--accent); }
    .payment-option strong, .payment-option small { display:block; }
    .payment-option small { color:var(--ink-soft); margin-top:3px; }
    .delivery-block { margin-top:14px; }
    .delivery-store { margin:0; font-size:11px; font-weight:750; letter-spacing:.08em; text-transform:uppercase; color:var(--ink-soft); }
    .save { color:var(--ok); font-weight:650; }
  `],
})
export class CheckoutComponent {
  private api = inject(ApiService);
  private router = inject(Router);
  quote = signal<CartPayload | null>(null);
  payment = signal<PaymentMethodsPayload | null>(null);
  paymentMethods = signal<PaymentMethodsPayload['methods']>([]);
  paymentMethod = 'card';
  addresses = signal<Address[]>([]);
  addressId: number | null = null;
  busy = signal(false);
  error = signal('');
  newAddr = { full_name: '', line1: '', city: '', country: 'GH' };
  deliveryChoices: Record<string, number> = {};

  constructor() {
    this.reprice();
    this.api.paymentMethods().subscribe({
      next: (res) => {
        this.payment.set(res.data);
        this.paymentMethods.set(res.data.methods);
        if (!res.data.methods.some((method) => method.key === this.paymentMethod)) {
          this.paymentMethod = res.data.methods[0]?.key || '';
        }
      },
      error: () => this.error.set('Could not load payment methods.'),
    });
    this.api.addresses().subscribe((res) => {
      this.addresses.set(res.data);
      const def = res.data.find((a) => a.is_default) || res.data[0];
      this.addressId = def?.id ?? null;
      if (this.addressId) this.reprice();
    });
  }

  /** Re-quote the basket against the chosen address and delivery options. */
  reprice() {
    this.api.checkoutQuote(this.addressId, this.deliveryChoices).subscribe({
      next: (res) => this.quote.set(res.data),
      error: (e) => this.error.set(e.error?.error?.message || 'Cart issue'),
    });
  }

  hasDeliveryChoices(): boolean {
    return (this.quote()?.groups ?? []).some((group) => (group.delivery_options?.length ?? 0) > 1);
  }

  isChosen(group: CartGroup, option: DeliveryOption): boolean {
    const chosen = group.delivery;
    if (!chosen) return !!option.is_default;
    return (chosen.method_id ?? null) === (option.method_id ?? null);
  }

  chooseDelivery(group: CartGroup, option: DeliveryOption) {
    if (option.method_id) this.deliveryChoices[String(group.store.id)] = option.method_id;
    else delete this.deliveryChoices[String(group.store.id)];
    this.reprice();
  }

  isOffline(): boolean {
    return this.paymentMethod === 'bank_transfer' || this.paymentMethod === 'cash_on_delivery';
  }

  saveAddress() {
    this.api.createAddress({ ...this.newAddr, is_default: !this.addresses().length }).subscribe((res) => {
      this.addresses.set([...this.addresses(), res.data]);
      this.addressId = res.data.id;
      this.reprice();
    });
  }

  pay() {
    if (!this.addressId) return;
    this.busy.set(true);
    const key = crypto.randomUUID();
    this.api.checkout(this.addressId, key, this.paymentMethod, this.deliveryChoices).subscribe({
      next: (res) => {
        const url = res.payment?.url as string;
        if (url?.startsWith('/api/payments/mock')) {
          this.api.mockPay(url).subscribe({
            next: () => this.router.navigate(['/orders', res.order.id]),
            error: () => this.router.navigate(['/orders', res.order.id]),
          });
        } else if (url) {
          // Real providers own the hosted checkout page. Do not proxy or
          // attempt to read their response from the browser.
          window.location.assign(url);
        } else {
          this.router.navigate(['/orders', res.order.id]);
        }
      },
      error: (e) => {
        this.error.set(e.error?.error?.message || 'Checkout failed');
        this.busy.set(false);
      },
    });
  }
}
