import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';

import { Haptics } from '../../core/ui/haptics';

export type SheetSnap = 'peek' | 'half' | 'full';

const ORDER: SheetSnap[] = ['peek', 'half', 'full'];

/**
 * A bottom sheet over a full-screen surface, for phones.
 *
 * It rests at a peek, half or nearly full height. Drag the handle and it follows the finger; let
 * go and it settles on the height the flick was heading for, so a quick flick travels further
 * than a slow drag. Tapping the handle, or Enter and the arrow keys on it, do the same without a
 * gesture. The visible height is reported so what is underneath can keep its content clear.
 */
@Component({
  selector: 'bm-sheet',
  template: `
    <div
      class="bm-sheet__handle"
      (pointerdown)="grab($event)"
      (pointermove)="drag($event)"
      (pointerup)="release($event)"
      (pointercancel)="release($event)"
    >
      <button
        type="button"
        class="bm-sheet__grip"
        [attr.aria-expanded]="snap() !== 'peek'"
        [attr.aria-label]="snap() === 'peek' ? 'Expand ' + label() : 'Collapse ' + label()"
        (keydown)="key($event)"
      ></button>
      <ng-content select="[bmSheetHeader]" />
    </div>
    <div class="bm-sheet__body" #body>
      <ng-content />
    </div>
    <ng-content select="[bmSheetFooter]" />
  `,
  styleUrl: './sheet.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'bm-sheet',
    '[class.is-dragging]': 'dragging()',
    '[attr.data-snap]': 'snap()',
    '[style.height.px]': 'height()',
  },
})
export class Sheet {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly haptics = inject(Haptics);
  private readonly destroyRef = inject(DestroyRef);

  readonly snap = model<SheetSnap>('peek');
  readonly label = input('the panel');
  /** Height at rest when peeking; the handle and header decide it when left out. */
  readonly peekHeight = input<number | null>(null);
  readonly visible = output<number>();

  private readonly body = viewChild.required<ElementRef<HTMLElement>>('body');

  private readonly container = signal(0);
  private readonly handleHeight = signal(96);
  private readonly dragHeight = signal<number | null>(null);
  protected readonly dragging = signal(false);

  private readonly heights = computed<Record<SheetSnap, number>>(() => {
    const container = this.container();
    const peek = Math.min(this.peekHeight() ?? this.handleHeight(), container * 0.4);
    return {
      peek,
      half: Math.max(peek + 120, Math.round(container * 0.56)),
      full: Math.max(peek, container - 8),
    };
  });

  protected readonly height = computed(() => this.dragHeight() ?? this.heights()[this.snap()]);

  private start = { y: 0, height: 0, time: 0 };
  private last = { y: 0, time: 0 };
  private velocity = 0;
  private moved = false;

  constructor() {
    afterNextRender(() => {
      const element = this.host.nativeElement;
      const parent = element.parentElement;
      const handle = element.querySelector<HTMLElement>('.bm-sheet__handle');
      const observer = new ResizeObserver(() => {
        if (parent) this.container.set(parent.clientHeight);
        if (handle) this.handleHeight.set(Math.ceil(handle.offsetHeight + 8));
      });
      if (parent) observer.observe(parent);
      if (handle) observer.observe(handle);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });

    effect(() => this.visible.emit(this.height()));
  }

  expand(to: SheetSnap = 'full'): void {
    this.snap.set(to);
  }

  protected grab(event: PointerEvent): void {
    const target = event.target as HTMLElement;
    // Controls inside the header keep their own clicks; only the grip and bare header drag.
    if (event.button !== 0 || (target.closest('button, a, input, textarea, select, [role="button"]') && !target.closest('.bm-sheet__grip'))) return;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.start = { y: event.clientY, height: this.height(), time: event.timeStamp };
    this.last = { y: event.clientY, time: event.timeStamp };
    this.velocity = 0;
    this.moved = false;
    this.dragging.set(true);
  }

  protected drag(event: PointerEvent): void {
    if (!this.dragging()) return;
    const travelled = this.start.y - event.clientY;
    if (Math.abs(travelled) > 5) this.moved = true;
    if (!this.moved) return;

    const { peek, full } = this.heights();
    let next = this.start.height + travelled;
    // Past either end the sheet resists, so the limit is felt rather than hit.
    if (next > full) next = full + (next - full) * 0.25;
    if (next < peek) next = peek - (peek - next) * 0.25;
    this.dragHeight.set(Math.round(next));

    const elapsed = event.timeStamp - this.last.time;
    if (elapsed > 0) this.velocity = (this.last.y - event.clientY) / elapsed;
    this.last = { y: event.clientY, time: event.timeStamp };
  }

  protected release(event: PointerEvent): void {
    if (!this.dragging()) return;
    (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
    this.dragging.set(false);
    const current = this.dragHeight();
    this.dragHeight.set(null);

    if (!this.moved || current === null) {
      this.toggle();
      return;
    }

    // Where the flick would come to rest a fifth of a second from now.
    const projected = current + this.velocity * 200;
    const heights = this.heights();
    const next = ORDER.reduce((best, snap) => (Math.abs(heights[snap] - projected) < Math.abs(heights[best] - projected) ? snap : best));
    if (next !== this.snap()) this.haptics.tap();
    this.snap.set(next);
    if (next !== 'full') this.body().nativeElement.scrollTo({ top: 0 });
  }

  protected key(event: KeyboardEvent): void {
    const moves: Record<string, () => void> = {
      Enter: () => this.toggle(),
      ' ': () => this.toggle(),
      ArrowUp: () => this.step(1),
      ArrowDown: () => this.step(-1),
      Home: () => this.snap.set('full'),
      End: () => this.snap.set('peek'),
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    move();
  }

  /** Peeking opens to half; anything taller folds back to the peek. */
  private toggle(): void {
    this.snap.set(this.snap() === 'peek' ? 'half' : 'peek');
    this.haptics.tap();
  }

  private step(by: number): void {
    const index = Math.max(0, Math.min(ORDER.length - 1, ORDER.indexOf(this.snap()) + by));
    this.snap.set(ORDER[index]);
    this.haptics.tap();
  }
}
