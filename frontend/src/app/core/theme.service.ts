import { DOCUMENT, Injectable, computed, effect, inject, signal } from '@angular/core';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'bimap.theme';

/**
 * Owns the colour scheme for the whole app.
 *
 * The resolved theme is written to `data-theme` on <html>, which is the single
 * switch every token in `_tokens.scss` keys off. A matching inline script in
 * index.html applies the same attribute before first paint so there is no flash
 * of the wrong scheme on load.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  private readonly systemPrefersDark = signal(false);

  readonly preference = signal<ThemePreference>(this.readStoredPreference());

  /** The scheme actually in effect, with 'system' already resolved. */
  readonly resolved = computed<ResolvedTheme>(() => {
    const preference = this.preference();

    if (preference !== 'system') return preference;

    return this.systemPrefersDark() ? 'dark' : 'light';
  });

  constructor() {
    const media = this.document.defaultView?.matchMedia('(prefers-color-scheme: dark)');

    if (media) {
      this.systemPrefersDark.set(media.matches);
      media.addEventListener('change', (event) => this.systemPrefersDark.set(event.matches));
    }

    effect(() => {
      this.document.documentElement.dataset['theme'] = this.resolved();
    });
  }

  /** Cycles light → dark → light, pinning the choice for future sessions. */
  toggle(): void {
    this.set(this.resolved() === 'dark' ? 'light' : 'dark');
  }

  set(preference: ThemePreference): void {
    this.preference.set(preference);

    try {
      this.document.defaultView?.localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // Private browsing or a blocked storage partition — the theme still
      // applies for this session, it just won't be remembered.
    }
  }

  private readStoredPreference(): ThemePreference {
    try {
      const stored = this.document.defaultView?.localStorage.getItem(STORAGE_KEY);

      if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
    } catch {
      // Ignore and fall through to the default.
    }

    return 'system';
  }
}
