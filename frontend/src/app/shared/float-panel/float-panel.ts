import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  booleanAttribute,
  inject,
  input,
  model,
  viewChild,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Draggable } from 'gsap/Draggable';

/**
 * A tool palette that floats over a working surface.
 *
 * On a map-first screen every panel is in the operator's way at some point:
 * the record they are filling covers the façade they need to look at, and the
 * register covers everything. Rather than choosing a placement that is least
 * bad on average, both can be dragged aside and collapsed to a title bar — so
 * the map is never permanently obscured by anything.
 *
 * Collapsed, the panel keeps its position and its heading, which is what makes
 * it a palette rather than a dismissal: the work is still there, just parked.
 *
 * Deliberately has no entrance animation of its own — the host sequences it.
 * Two `gsap.from` tweens on one element is a trap: `from` captures the current
 * value as the tween's *end*, so a second one created while the first is still
 * at `opacity: 0` animates 0 → 0 and strands the panel invisible.
 */
@Component({
  selector: 'bm-float-panel',
  standalone: true,
  imports: [MatIconModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'bm-float',
    '[class.is-collapsed]': 'collapsed()',
  },
  template: `
    <header class="float-head" #handle (dblclick)="toggle()">
      <span class="float-grip" aria-hidden="true"></span>

      <span class="float-heading">{{ heading() }}</span>

      <ng-content select="[panelMeta]" />

      <button
        type="button"
        class="float-toggle"
        [attr.aria-expanded]="!collapsed()"
        [attr.aria-controls]="bodyId"
        [matTooltip]="collapsed() ? 'Expand' : 'Minimise'"
        [attr.aria-label]="collapsed() ? 'Expand ' + heading() : 'Minimise ' + heading()"
        (click)="toggle()"
      >
        <mat-icon>{{ collapsed() ? 'expand_more' : 'remove' }}</mat-icon>
      </button>

      <ng-content select="[panelActions]" />
    </header>

    @if (!collapsed()) {
      <div class="float-body" [id]="bodyId">
        <ng-content />
      </div>
    }
  `,
  styleUrl: './float-panel.scss',
})
export class FloatPanelComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly handle = viewChild.required<ElementRef<HTMLElement>>('handle');

  private static nextId = 0;

  /** Ties the toggle's `aria-controls` to the body it actually shows and hides. */
  readonly bodyId = `bm-float-body-${FloatPanelComponent.nextId++}`;

  readonly heading = input('');

  /** Two-way, so a host can collapse the panel from elsewhere (⌘K, a shortcut). */
  readonly collapsed = model(false);

  /** Set false for a panel that should stay where it is put. */
  readonly draggable = input(true, { transform: booleanAttribute });

  constructor() {
    afterNextRender(() => this.enableDrag());
  }

  toggle(): void {
    this.collapsed.update((value) => !value);
  }

  private enableDrag(): void {
    if (!this.draggable()) return;

    // Coarse pointers get no drag: the gesture competes with panning the map
    // underneath, and there is no cursor to signal which one is armed.
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const element = this.host.nativeElement;

    const [instance] = Draggable.create(element, {
      type: 'x,y',
      trigger: this.handle().nativeElement,
      // Kept inside the surface it floats over, so a panel can never be
      // dragged somewhere it cannot be dragged back from.
      bounds: element.parentElement ?? undefined,
      edgeResistance: 0.9,
      allowContextMenu: true,
      // Clicks on the toggle and any projected header buttons must still land.
      dragClickables: false,
      onPress: () => element.classList.add('is-dragging'),
      onRelease: () => element.classList.remove('is-dragging'),
    });

    this.destroyRef.onDestroy(() => instance?.kill());
  }
}
