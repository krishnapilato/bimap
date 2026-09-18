import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  OnDestroy,
  ViewEncapsulation,
  inject,
  input,
  signal,
} from '@angular/core';

import { Viewport } from '../../core/ui/viewport';

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

@Component({
  selector: 'bm-tooltip-panel',
  template: `{{ text() }}`,
  styleUrl: './tooltip.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'bm-tooltip', role: 'tooltip', '[attr.data-placement]': 'placement()' },
})
export class TooltipPanel {
  readonly text = signal('');
  readonly placement = signal<TooltipPlacement>('top');
}

const OFFSETS: Record<TooltipPlacement, { originX: 'start' | 'center' | 'end'; originY: 'top' | 'center' | 'bottom'; overlayX: 'start' | 'center' | 'end'; overlayY: 'top' | 'center' | 'bottom'; offsetX?: number; offsetY?: number }> = {
  top: { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom', offsetY: -8 },
  bottom: { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: 8 },
  left: { originX: 'start', originY: 'center', overlayX: 'end', overlayY: 'center', offsetX: -8 },
  right: { originX: 'end', originY: 'center', overlayX: 'start', overlayY: 'center', offsetX: 8 },
};

const OPPOSITE: Record<TooltipPlacement, TooltipPlacement> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

/**
 * A label that arrives after a short, deliberate pause on hover or at once on keyboard focus.
 * Touch never shows one: a tooltip under a finger is a tooltip nobody can read.
 */
@Directive({
  selector: '[bmTooltip]',
  host: {
    '(pointerenter)': 'schedule($event)',
    '(pointerleave)': 'hide()',
    '(focusin)': 'showFromFocus()',
    '(focusout)': 'hide()',
    '(pointerdown)': 'hide()',
    '(keydown.escape)': 'hide()',
    '[attr.aria-label]': 'ariaLabel()',
  },
})
export class Tooltip implements OnDestroy {
  private readonly overlay = inject(Overlay);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly viewport = inject(Viewport);
  private overlayRef: OverlayRef | null = null;
  private panel: TooltipPanel | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;

  readonly bmTooltip = input.required<string>();
  readonly bmTooltipPlacement = input<TooltipPlacement>('top');
  readonly bmTooltipDelay = input(420);
  /** Name the element after its tooltip, for icon-only controls. */
  readonly bmTooltipLabels = input(true);

  protected ariaLabel(): string | null {
    return this.bmTooltipLabels() ? this.bmTooltip() : null;
  }

  schedule(event: PointerEvent): void {
    if (event.pointerType !== 'mouse' || !this.bmTooltip()) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.show(), this.bmTooltipDelay());
  }

  showFromFocus(): void {
    if (this.viewport.isCoarsePointer() || !this.host.nativeElement.matches(':focus-visible')) return;
    this.show();
  }

  hide(): void {
    clearTimeout(this.timer);
    const ref = this.overlayRef;
    if (!ref?.hasAttached()) return;
    const element = ref.overlayElement.firstElementChild as HTMLElement | null;
    element?.classList.add('is-leaving');
    setTimeout(() => ref.detach(), 110);
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
    this.overlayRef?.dispose();
  }

  private show(): void {
    if (!this.bmTooltip()) return;
    const placement = this.bmTooltipPlacement();
    this.overlayRef ??= this.overlay.create({
      positionStrategy: this.overlay
        .position()
        .flexibleConnectedTo(this.host)
        .withPositions([OFFSETS[placement], OFFSETS[OPPOSITE[placement]]])
        .withFlexibleDimensions(false)
        .withViewportMargin(8),
      scrollStrategy: this.overlay.scrollStrategies.close(),
      panelClass: 'bm-tooltip-pane',
    });

    if (!this.overlayRef.hasAttached()) {
      this.panel = this.overlayRef.attach(new ComponentPortal(TooltipPanel)).instance;
    }
    this.panel?.text.set(this.bmTooltip());
    this.panel?.placement.set(placement);
    (this.overlayRef.overlayElement.firstElementChild as HTMLElement | null)?.classList.remove('is-leaving');
  }
}
