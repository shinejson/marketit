import { Pipe, PipeTransform, inject } from '@angular/core';
import { CurrencyService } from '../core/currency.service';

/**
 * Currency-aware replacement for Angular's `currency` pipe.
 *
 * `{{ amount | money }}` renders in the active display currency (the tenant's
 * settings currency in the console, the store's currency on a storefront).
 * `{{ amount | money:row.currency }}` says "this number is denominated in
 * row.currency" — the pipe converts it into the display currency through the
 * shared rate table before formatting, so one page never mixes denominations.
 *
 * Impure on purpose: the display currency is a signal that changes the moment
 * someone saves a new currency in settings, and every price on screen has to
 * follow without a reload.
 */
@Pipe({ name: 'money', standalone: true, pure: false })
export class MoneyPipe implements PipeTransform {
  private currency = inject(CurrencyService);

  transform(
    value: number | string | null | undefined,
    sourceCurrency?: string | null,
    _display: string = 'symbol',
    digits?: string,
  ): string {
    return this.currency.format(value ?? 0, sourceCurrency || null, digits);
  }
}
