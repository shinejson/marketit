import { Injectable, effect, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const THEME_KEY = 'mh_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly themeSignal = signal<Theme>(this.readInitial());
  readonly theme = this.themeSignal.asReadonly();

  constructor() {
    effect(() => {
      const value = this.themeSignal();
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', value);
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(THEME_KEY, value);
      }
    });
  }

  toggle() {
    this.themeSignal.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  set(theme: Theme) {
    this.themeSignal.set(theme);
  }

  private readInitial(): Theme {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    }
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }
}
