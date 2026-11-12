import { Injectable } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'sm-theme';

/** Tema claro/escuro: segue o sistema até o utilizador escolher; a escolha fica guardada no browser. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private current: Theme = 'light';

  init(): void {
    this.apply(this.stored() ?? (this.systemPrefersDark() ? 'dark' : 'light'));
  }

  get theme(): Theme {
    return this.current;
  }

  toggle(): void {
    const next: Theme = this.current === 'dark' ? 'light' : 'dark';
    this.apply(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* armazenamento indisponível */ }
  }

  private apply(theme: Theme): void {
    this.current = theme;
    document.documentElement.setAttribute('data-theme', theme);
  }

  private stored(): Theme | null {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return value === 'light' || value === 'dark' ? value : null;
    } catch {
      return null;
    }
  }

  private systemPrefersDark(): boolean {
    return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
}
