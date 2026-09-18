import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input, signal } from '@angular/core';

import { initials } from '../../core/ui/format';

const HUES = [214, 188, 262, 152, 28, 340, 198, 232];

/**
 * A person at a glance: their photo when there is one and it loads, otherwise initials on a colour
 * derived from the name, so the same person is always the same colour.
 */
@Component({
  selector: 'bm-avatar',
  template: `
    @if (src() && !failed()) {
      <img [src]="src()" [alt]="''" referrerpolicy="no-referrer" (error)="failed.set(true)" />
    } @else {
      <span aria-hidden="true">{{ letters() }}</span>
    }
  `,
  styles: `
    .bm-avatar {
      --bm-avatar-size: 32px;
      position: relative;
      display: inline-grid;
      place-items: center;
      flex-shrink: 0;
      width: var(--bm-avatar-size);
      height: var(--bm-avatar-size);
      border-radius: 50%;
      background: hsl(var(--bm-avatar-hue) 72% 94%);
      color: hsl(var(--bm-avatar-hue) 58% 34%);
      font: 650 calc(var(--bm-avatar-size) * 0.38) / 1 var(--bm-font-sans);
      letter-spacing: -0.02em;
      box-shadow: inset 0 0 0 1px hsl(var(--bm-avatar-hue) 60% 86%);
      overflow: hidden;
      user-select: none;
    }
    .bm-avatar[data-size='sm'] { --bm-avatar-size: 26px; }
    .bm-avatar[data-size='lg'] { --bm-avatar-size: 44px; }
    .bm-avatar[data-size='xl'] { --bm-avatar-size: 72px; }
    .bm-avatar img { width: 100%; height: 100%; object-fit: cover; }
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'bm-avatar',
    role: 'img',
    '[attr.aria-label]': 'name()',
    '[attr.data-size]': 'size()',
    '[style.--bm-avatar-hue]': 'hue()',
  },
})
export class Avatar {
  readonly name = input.required<string>();
  readonly src = input<string | undefined>();
  readonly size = input<'sm' | 'md' | 'lg' | 'xl'>('md');

  protected readonly failed = signal(false);
  protected readonly letters = computed(() => initials(this.name()));
  protected readonly hue = computed(() => {
    let hash = 0;
    for (const char of this.name()) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    return HUES[hash % HUES.length];
  });
}
