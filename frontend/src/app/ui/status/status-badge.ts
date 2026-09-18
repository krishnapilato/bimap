import { ChangeDetectionStrategy, Component, ViewEncapsulation, booleanAttribute, input } from '@angular/core';

export type Tone = 'positive' | 'critical' | 'negative' | 'info' | 'neutral' | 'special' | 'signal';

/**
 * A state, said with colour and a word — never colour alone. Changing state cross-fades the
 * colours, and live states (a campaign sending, a service polling) carry a quiet pulse.
 */
@Component({
  selector: 'bm-status',
  template: `
    <span class="bm-status__dot" aria-hidden="true"></span>
    <span class="bm-status__label">{{ label() }}</span>
  `,
  styleUrl: './status-badge.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'bm-status',
    '[attr.data-tone]': 'tone()',
    '[attr.data-size]': 'size()',
    '[class.is-live]': 'live()',
    '[class.is-quiet]': 'quiet()',
  },
})
export class StatusBadge {
  readonly label = input.required<string>();
  readonly tone = input<Tone>('neutral');
  readonly size = input<'sm' | 'md'>('md');
  readonly live = input(false, { transform: booleanAttribute });
  /** Dot and text only, for dense tables. */
  readonly quiet = input(false, { transform: booleanAttribute });
}
