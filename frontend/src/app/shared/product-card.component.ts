import { Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { ProductCard } from '../core/models';
import { ApiService } from '../core/api.service';

@Component({
  selector: 'app-product-card',
  imports: [RouterLink, CurrencyPipe],
  template: `
    <a class="card item" [routerLink]="['/products', product.slug]" (click)="onClick()">
      <div class="thumb" [style.backgroundImage]="bg">
        @if (product.on_sale) { <span class="sale">−{{ product.discount_percent }}%</span> }
      </div>
      <div class="meta">
        <span class="pill">{{ product.sponsored ? 'Sponsored' : product.store?.name }}</span>
        <h3>{{ product.name }}</h3>
        <p class="price">
          {{ +product.price | currency }}
          @if (product.on_sale && product.compare_at_price) { <s>{{ +product.compare_at_price | currency }}</s> }
        </p>
      </div>
    </a>
  `,
  styles: [`
    .item { overflow:hidden; display:block; height:100%; }
    .thumb { aspect-ratio: 1; background: #d9d0c0 center/cover no-repeat; position: relative; }
    .sale { position: absolute; top: 10px; left: 10px; background: var(--accent); color: #fff; font-size: 12px; font-weight: 800; padding: 4px 9px; border-radius: 999px; }
    .meta { padding: 14px 16px 18px; }
    h3 { margin: 8px 0 4px; font-size: 18px; }
    .price { margin: 0; font-size: 20px; }
    .price s { margin-left: 7px; font-size: 14px; color: var(--ink-soft); font-weight: 400; }
  `],
})
export class ProductCardComponent {
  private api = inject(ApiService);
  @Input({ required: true }) product!: ProductCard;
  get bg() {
    return this.product.image ? `url('${this.product.image}')` : 'linear-gradient(135deg,#1f4b3a,#c45c26)';
  }
  onClick() {
    if (this.product.sponsored && this.product.impression_id) {
      this.api.clickAd(this.product.impression_id).subscribe();
    }
  }
}
