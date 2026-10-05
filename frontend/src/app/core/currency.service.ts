import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
  /** Units of this currency per one unit of the platform base currency. */
  rate: number;
  decimals: number;
  source?: string;
  updated_at?: string | null;
}

export interface CurrencyCatalog {
  base: string;
  currencies: CurrencyOption[];
}

const DISPLAY_KEY = 'mh_display_currency';

/**
 * Built-in catalog so prices still render with the right symbol before
 * /api/currency answers (and if it never does). Mirrors the PHP
 * App\Services\Currency\CurrencyService::DEFAULTS table.
 */
const FALLBACK: CurrencyOption[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', rate: 1, decimals: 2 },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH\u20b5', rate: 12.45, decimals: 2 },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '\u20a6', rate: 1545, decimals: 2 },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', rate: 129, decimals: 2 },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', rate: 18.1, decimals: 2 },
  { code: 'XOF', name: 'West African CFA Franc', symbol: 'CFA', rate: 605, decimals: 0 },
  { code: 'EUR', name: 'Euro', symbol: '\u20ac', rate: 0.92, decimals: 2 },
  { code: 'GBP', name: 'British Pound', symbol: '\u00a3', rate: 0.78, decimals: 2 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', rate: 1.37, decimals: 2 },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E\u00a3', rate: 48.5, decimals: 2 },
];

/**
 * One place that answers "which currency are we showing, and what is this
 * amount worth in it?".
 *
 * `display` is the active currency of the surface you are on — the tenant's
 * settings currency inside the console, the store's currency on a storefront.
 * Amounts that arrive tagged with a different currency are converted through
 * the shared rate table before they are formatted, so a page never mixes
 * dollars and cedis behind one symbol.
 */
@Injectable({ providedIn: 'root' })
export class CurrencyService {
  private http = inject(HttpClient);

  private readonly catalogSignal = signal<CurrencyOption[]>(FALLBACK);
  private readonly baseSignal = signal<string>('USD');
  private readonly displaySignal = signal<string>(this.readStored() ?? 'USD');
  private loaded = false;

  /** Every currency the platform knows about. */
  readonly currencies = this.catalogSignal.asReadonly();
  /** Platform base currency — the denomination rates are quoted against. */
  readonly base = this.baseSignal.asReadonly();
  /** The currency the current surface renders money in. */
  readonly display = this.displaySignal.asReadonly();
  readonly symbol = computed(() => this.meta(this.displaySignal()).symbol);
  readonly decimals = computed(() => this.meta(this.displaySignal()).decimals);
  readonly displayMeta = computed(() => this.meta(this.displaySignal()));

  /** Fetch the rate table once per app load. */
  load(force = false): Observable<CurrencyCatalog> {
    if (this.loaded && !force) {
      return of({ base: this.baseSignal(), currencies: this.catalogSignal() });
    }

    return this.http.get<{ data: CurrencyCatalog }>('/api/currency').pipe(
      map((res) => res.data),
      tap((data) => this.applyCatalog(data)),
      catchError(() => of({ base: this.baseSignal(), currencies: this.catalogSignal() })),
    );
  }

  applyCatalog(data: Partial<CurrencyCatalog> | null | undefined): void {
    if (!data) return;
    if (data.currencies?.length) {
      this.catalogSignal.set(
        data.currencies.map((c) => ({ ...c, code: c.code.toUpperCase(), rate: Number(c.rate) || 1, decimals: c.decimals ?? 2 })),
      );
      this.loaded = true;
    }
    if (data.base) this.baseSignal.set(data.base.toUpperCase());
  }

  /** Point the UI at a currency (tenant settings, store page, user choice). */
  setDisplay(code: string | null | undefined, remember = true): void {
    const next = (code || this.baseSignal()).toUpperCase();
    if (next === this.displaySignal()) return;
    this.displaySignal.set(next);
    if (remember) {
      try {
        localStorage.setItem(DISPLAY_KEY, next);
      } catch {
        /* storage disabled — session-only display currency */
      }
    }
  }

  meta(code?: string | null): CurrencyOption {
    const wanted = (code || this.displaySignal()).toUpperCase();
    return (
      this.catalogSignal().find((c) => c.code === wanted) ??
      FALLBACK.find((c) => c.code === wanted) ?? {
        code: wanted,
        name: wanted,
        symbol: wanted,
        rate: 1,
        decimals: 2,
      }
    );
  }

  rate(code?: string | null): number {
    const rate = this.meta(code).rate;
    return rate > 0 ? rate : 1;
  }

  /** Multiplier that takes an amount from one currency into another. */
  factor(from?: string | null, to?: string | null): number {
    const source = (from || this.displaySignal()).toUpperCase();
    const target = (to || this.displaySignal()).toUpperCase();
    if (source === target) return 1;
    return this.rate(target) / this.rate(source);
  }

  convert(amount: number | string | null | undefined, from?: string | null, to?: string | null): number {
    const value = Number(amount ?? 0);
    if (!Number.isFinite(value)) return 0;
    const target = (to || this.displaySignal()).toUpperCase();
    const converted = value * this.factor(from, target);
    const decimals = this.meta(target).decimals;
    return Math.round(converted * 10 ** decimals) / 10 ** decimals;
  }

  /**
   * Convert (when the amount is tagged with another currency) and format.
   * `digits` follows the Angular DecimalPipe syntax, e.g. '1.0-0'.
   */
  format(amount: number | string | null | undefined, from?: string | null, digits?: string): string {
    const target = this.displaySignal();
    const value = this.convert(amount, from, target);
    const meta = this.meta(target);
    const { min, max } = this.digits(digits, meta.decimals);
    const body = value.toLocaleString(undefined, { minimumFractionDigits: min, maximumFractionDigits: max });
    return `${meta.symbol}${body}`;
  }

  private digits(digits: string | undefined, fallback: number): { min: number; max: number } {
    if (!digits) return { min: fallback, max: fallback };
    const match = /^(\d+)\.(\d+)-(\d+)$/.exec(digits);
    if (!match) return { min: fallback, max: fallback };
    return { min: Number(match[2]), max: Number(match[3]) };
  }

  private readStored(): string | null {
    try {
      return localStorage.getItem(DISPLAY_KEY);
    } catch {
      return null;
    }
  }
}
