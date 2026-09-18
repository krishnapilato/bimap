import { ChangeDetectionStrategy, Component, ViewEncapsulation, booleanAttribute, input } from '@angular/core';

import { Ripple } from '../interaction/ripple';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle' | 'signal';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * The one button. A native `<button>` or `<a>` keeps its semantics; this adds the look and the
 * feel — a lift on hover, a spring on press, a ripple where it was touched, and a spinner that
 * takes the label's place without the button changing size.
 */
@Component({
  selector: 'button[bmButton], a[bmButton]',
  hostDirectives: [Ripple],
  template: `
    <span class="bm-button__content"><ng-content /></span>
    @if (loading()) {
      <span class="bm-button__spinner" aria-hidden="true"></span>
    }
  `,
  styleUrl: './button.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'bm-button',
    '[attr.data-variant]': 'variant()',
    '[attr.data-size]': 'size()',
    '[attr.data-icon-only]': 'iconOnly() || null',
    '[class.is-loading]': 'loading()',
    '[attr.aria-busy]': 'loading() || null',
    '[attr.aria-disabled]': 'loading() || null',
  },
})
export class Button {
  readonly variant = input<ButtonVariant>('secondary');
  readonly size = input<ButtonSize>('md');
  readonly loading = input(false, { transform: booleanAttribute });
  readonly iconOnly = input(false, { transform: booleanAttribute });
}
