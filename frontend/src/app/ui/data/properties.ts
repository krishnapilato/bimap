import { ChangeDetectionStrategy, Component, ViewEncapsulation, booleanAttribute, input, signal } from '@angular/core';

import { copyToClipboard } from '../../core/ui/files';
import { Icon } from '../icon/icon';

/** Copies a value, and answers with a tick that draws itself in place of the icon. */
@Component({
  selector: 'bm-copy-button',
  imports: [Icon],
  template: `
    <button type="button" class="bm-copy" [attr.aria-label]="'Copy ' + (label() || value())" (click)="copy($event)">
      @if (done()) {
        <svg lucideIcon="check" [size]="14" class="bm-copy__done"></svg>
      } @else {
        <svg lucideIcon="copy" [size]="14"></svg>
      }
    </button>
  `,
  styles: `
    .bm-copy { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 7px; color: var(--bm-text-3);
      transition: background-color var(--bm-duration-fast), color var(--bm-duration-fast), transform var(--bm-duration-base) var(--bm-ease-spring); }
    .bm-copy:hover { background: var(--bm-surface-3); color: var(--bm-text); }
    .bm-copy:active { transform: scale(0.88); }
    .bm-copy__done { color: var(--bm-positive); animation: bm-pop 280ms var(--bm-ease-spring) both; }
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CopyButton {
  readonly value = input.required<string>();
  readonly label = input('');
  protected readonly done = signal(false);

  protected async copy(event: Event): Promise<void> {
    event.stopPropagation();
    await copyToClipboard(this.value(), `${this.label() || 'Value'} copied`);
    this.done.set(true);
    setTimeout(() => this.done.set(false), 1400);
  }
}

/** A labelled value in an object page. Codes are set in the mono face and can be copied. */
@Component({
  selector: 'bm-property',
  imports: [CopyButton],
  template: `
    <dt>{{ label() }}</dt>
    <dd [class.bm-mono]="mono()">
      @if (value() != null && value() !== '') {
        <span class="bm-property__value">{{ value() }}</span>
        @if (copyable()) {
          <bm-copy-button [value]="'' + value()" [label]="label()" />
        }
      } @else {
        <ng-content>
          <span class="bm-property__empty">Not recorded</span>
        </ng-content>
      }
    </dd>
  `,
  styles: `
    .bm-property { display: grid; gap: 3px; min-width: 0; }
    .bm-property dt { font: var(--bm-text-caption); color: var(--bm-text-3); font-weight: 600; }
    .bm-property dd { display: flex; align-items: center; gap: 4px; min-height: 26px; min-width: 0; margin: 0; font: var(--bm-text-body); color: var(--bm-text); }
    .bm-property dd.bm-mono { font-size: 13.5px; }
    .bm-property__value { overflow-wrap: anywhere; }
    .bm-property__empty { color: var(--bm-text-3); font-style: italic; font-family: var(--bm-font-sans); font-size: 13px; }
    .bm-properties { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(210px, 100%), 1fr)); gap: 16px 24px; margin: 0; }
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'bm-property' },
})
export class Property {
  readonly label = input.required<string>();
  readonly value = input<string | number | null | undefined>();
  readonly mono = input(false, { transform: booleanAttribute });
  readonly copyable = input(false, { transform: booleanAttribute });
}
