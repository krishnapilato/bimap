import { Directive, ElementRef, inject, input } from '@angular/core';

import { PreferencesStore } from '../../core/ui/preferences';

/**
 * A soft wave from wherever the element was pressed — finger, pen or mouse — so every tap is
 * answered at the exact point it landed. Keyboard activation starts the wave from the centre.
 */
@Directive({
  selector: '[bmRipple]',
  host: {
    '(pointerdown)': 'fromPointer($event)',
    '(keydown.enter)': 'fromCentre()',
    '(keydown.space)': 'fromCentre()',
  },
})
export class Ripple {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly preferences = inject(PreferencesStore);

  readonly bmRippleDisabled = input(false);

  fromPointer(event: PointerEvent): void {
    if (event.button !== 0) return;
    const bounds = this.host.getBoundingClientRect();
    this.wave(event.clientX - bounds.left, event.clientY - bounds.top, bounds);
  }

  fromCentre(): void {
    const bounds = this.host.getBoundingClientRect();
    this.wave(bounds.width / 2, bounds.height / 2, bounds);
  }

  private wave(x: number, y: number, bounds: DOMRect): void {
    const interactive = this.host.matches('button, a[href], [role="button"], [role="tab"], [role="radio"], [role="menuitem"], [role="option"]');
    if (!interactive || this.bmRippleDisabled() || this.preferences.reducedMotion() || this.host.matches(':disabled,[aria-disabled="true"]')) {
      return;
    }
    const radius = Math.hypot(Math.max(x, bounds.width - x), Math.max(y, bounds.height - y));
    const wave = document.createElement('span');
    wave.className = 'bm-ripple';
    wave.style.cssText = `left:${x}px;top:${y}px;width:${radius * 2}px;height:${radius * 2}px`;
    wave.addEventListener('animationend', () => wave.remove(), { once: true });
    this.host.appendChild(wave);
  }
}
