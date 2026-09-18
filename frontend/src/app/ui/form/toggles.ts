import { ChangeDetectionStrategy, Component, ViewEncapsulation, booleanAttribute, inject, input, model } from '@angular/core';
import { FormCheckboxControl } from '@angular/forms/signals';

import { Haptics } from '../../core/ui/haptics';

/** An on/off setting that takes effect at once. The thumb springs across; the track fills. */
@Component({
  selector: 'bm-switch',
  template: `
    <button
      type="button"
      role="switch"
      class="bm-switch__track"
      [attr.aria-checked]="checked()"
      [attr.aria-label]="ariaLabel()"
      [disabled]="disabled()"
      (click)="toggle()"
    >
      <span class="bm-switch__thumb"></span>
    </button>
    <span class="bm-switch__label" (click)="toggle()"><ng-content /></span>
  `,
  styleUrl: './toggles.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'bm-switch', '[class.is-on]': 'checked()', '[class.is-disabled]': 'disabled()' },
})
export class Switch implements FormCheckboxControl {
  private readonly haptics = inject(Haptics);

  readonly checked = model(false);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly ariaLabel = input<string>();

  toggle(): void {
    if (this.disabled()) return;
    this.checked.update((value) => !value);
    this.haptics.tap();
  }
}

/** A box that draws its own tick. */
@Component({
  selector: 'bm-checkbox',
  template: `
    <button
      type="button"
      role="checkbox"
      class="bm-checkbox__box"
      [attr.aria-checked]="indeterminate() ? 'mixed' : checked()"
      [attr.aria-label]="ariaLabel()"
      [disabled]="disabled()"
      (click)="toggle()"
    >
      <svg viewBox="0 0 16 16" aria-hidden="true">
        @if (indeterminate()) {
          <path d="M4 8h8" />
        } @else {
          <path d="M3.5 8.5 6.5 11.5 12.5 5" />
        }
      </svg>
    </button>
    <span class="bm-checkbox__label" (click)="toggle()"><ng-content /></span>
  `,
  styleUrl: './toggles.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'bm-checkbox',
    '[class.is-checked]': 'checked() || indeterminate()',
    '[class.is-disabled]': 'disabled()',
  },
})
export class Checkbox implements FormCheckboxControl {
  readonly checked = model(false);
  readonly indeterminate = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly ariaLabel = input<string>();

  toggle(): void {
    if (!this.disabled()) this.checked.update((value) => !value);
  }
}
