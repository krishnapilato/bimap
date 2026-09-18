import { Directive, ElementRef, OnDestroy, inject } from '@angular/core';

/**
 * Feeds the pointer position to CSS as `--bm-mx` and `--bm-my`, for surfaces that catch a soft
 * light where the cursor rests. Throttled to one write per frame and never on touch.
 */
@Directive({ selector: '[bmSpotlight]' })
export class Spotlight implements OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private frame = 0;

  private readonly onMove = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      const bounds = this.host.getBoundingClientRect();
      this.host.style.setProperty('--bm-mx', `${event.clientX - bounds.left}px`);
      this.host.style.setProperty('--bm-my', `${event.clientY - bounds.top}px`);
    });
  };

  constructor() {
    this.host.addEventListener('pointermove', this.onMove, { passive: true });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frame);
    this.host.removeEventListener('pointermove', this.onMove);
  }
}
