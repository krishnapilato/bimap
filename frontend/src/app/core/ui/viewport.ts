import { DestroyRef, Injectable, Signal, computed, inject, signal } from '@angular/core';

/**
 * The layout breakpoints and input capabilities, as signals.
 *
 *   handset  < 905px   bottom navigation, sheets, one pane at a time
 *   tablet   905–1239  navigation rail, two panes where they fit
 *   desktop  ≥ 1240    full side navigation, list and detail side by side
 */
@Injectable({ providedIn: 'root' })
export class Viewport {
  private readonly destroyRef = inject(DestroyRef);

  readonly isHandset = this.query('(max-width: 904.98px)');
  readonly isDesktop = this.query('(min-width: 1240px)');
  readonly isWide = this.query('(min-width: 1440px)');
  readonly isTablet = computed(() => !this.isHandset() && !this.isDesktop());
  readonly isCoarsePointer = this.query('(pointer: coarse)');
  readonly canHover = this.query('(hover: hover) and (pointer: fine)');
  readonly prefersReducedMotion = this.query('(prefers-reduced-motion: reduce)');

  private query(media: string): Signal<boolean> {
    const list = window.matchMedia(media);
    const value = signal(list.matches);
    const onChange = (event: MediaQueryListEvent) => value.set(event.matches);
    list.addEventListener('change', onChange);
    this.destroyRef.onDestroy(() => list.removeEventListener('change', onChange));
    return value.asReadonly();
  }
}
