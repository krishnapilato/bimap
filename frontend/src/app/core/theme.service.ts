import { DOCUMENT, Injectable, inject, signal } from '@angular/core';

export type ResolvedTheme = 'light';

/**
 * Enforces the application's light-only visual system.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  readonly resolved = signal<ResolvedTheme>('light').asReadonly();

  constructor() {
    this.document.documentElement.dataset['theme'] = 'light';
    this.document.documentElement.style.colorScheme = 'light';
    try {
      this.document.defaultView?.localStorage.removeItem('bimap.theme');
    } catch {
      // Storage can be unavailable in restricted browsing contexts.
    }
  }
}
