import { ChangeDetectionStrategy, Component, ViewEncapsulation, input, model } from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import { Icon } from '../icon/icon';

export interface ChoiceOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
  icon?: string;
}

let nextGroup = 0;

/**
 * A choice that needs a sentence to explain each option: radio buttons drawn as cards. The chosen
 * card takes the accent, its icon fills in and the tick springs into place.
 */
@Component({
  selector: 'bm-choice-cards',
  imports: [Icon],
  template: `
    @if (legend()) {
      <span class="bm-choice__legend" aria-hidden="true">{{ legend() }}</span>
    }
    @for (option of options(); track option.value; let i = $index) {
      <label class="bm-choice" [class.is-selected]="value() === option.value" [class.is-disabled]="disabled()" [style.--bm-i]="i">
        <input type="radio" [name]="group" [value]="option.value" [checked]="value() === option.value" [disabled]="disabled()" (change)="value.set(option.value)" />
        @if (option.icon) {
          <span class="bm-choice__icon"><svg [lucideIcon]="option.icon" [size]="17"></svg></span>
        }
        <span class="bm-choice__text">
          <strong>{{ option.label }}</strong>
          @if (option.description) {
            <span>{{ option.description }}</span>
          }
        </span>
        <span class="bm-choice__check" aria-hidden="true"><svg lucideIcon="check" [size]="13" [strokeWidth]="3"></svg></span>
      </label>
    }
  `,
  styles: `
    .bm-choice-cards { display: grid; gap: 8px; margin: 0; padding: 0; border: 0; min-width: 0; }
    .bm-choice-cards[data-columns='2'] { grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr)); }
    .bm-choice__legend { grid-column: 1 / -1; margin-bottom: -2px; font: var(--bm-text-caption); font-weight: 650; color: var(--bm-text-2); }
    .bm-choice {
      position: relative; display: flex; align-items: center; gap: 12px; padding: 10px 12px; cursor: pointer;
      border: 1px solid var(--bm-border); border-radius: var(--bm-radius-md); background: var(--bm-surface);
      transition: border-color var(--bm-duration-fast) var(--bm-ease-standard), background-color var(--bm-duration-fast) var(--bm-ease-standard), box-shadow var(--bm-duration-base) var(--bm-ease-standard), transform var(--bm-duration-base) var(--bm-ease-spring);
      animation: bm-rise var(--bm-duration-slow) var(--bm-ease-emphasized) both; animation-delay: calc(var(--bm-i, 0) * 50ms + 100ms);
    }
    @media (hover: hover) and (pointer: fine) { .bm-choice:not(.is-disabled):hover { border-color: var(--bm-border-strong); } }
    .bm-choice:not(.is-disabled):active { transform: scale(0.99); }
    .bm-choice:focus-within { box-shadow: 0 0 0 3px var(--bm-accent-glow); }
    .bm-choice.is-selected { border-color: var(--bm-accent); background: var(--bm-accent-softer); }
    .bm-choice.is-disabled { cursor: default; opacity: 0.6; }
    .bm-choice input { position: absolute; opacity: 0; pointer-events: none; }
    .bm-choice__icon {
      display: grid; place-items: center; width: 34px; height: 34px; flex-shrink: 0; border-radius: 10px; background: var(--bm-surface-3); color: var(--bm-text-2);
      transition: background-color var(--bm-duration-base) var(--bm-ease-standard), color var(--bm-duration-base) var(--bm-ease-standard), transform var(--bm-duration-base) var(--bm-ease-spring);
    }
    .is-selected .bm-choice__icon { background: var(--bm-accent); color: var(--bm-text-inverse); transform: rotate(-4deg); }
    .bm-choice__text { display: grid; gap: 1px; flex: 1; min-width: 0; }
    .bm-choice__text strong { font: var(--bm-text-subheading); }
    .bm-choice__text span { font: var(--bm-text-caption); font-weight: 500; color: var(--bm-text-3); }
    .bm-choice__check {
      display: grid; place-items: center; width: 20px; height: 20px; flex-shrink: 0; border-radius: 50%; border: 1.5px solid var(--bm-border-strong); color: transparent;
      transition: all var(--bm-duration-base) var(--bm-ease-spring);
    }
    .is-selected .bm-choice__check { border-color: var(--bm-accent); background: var(--bm-accent); color: #fff; transform: scale(1.08); }
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'bm-choice-cards', role: 'radiogroup', '[attr.aria-label]': 'legend()', '[attr.data-columns]': 'columns()' },
})
export class ChoiceCards<T extends string = string> implements FormValueControl<T> {
  readonly value = model.required<T>();
  readonly options = input.required<ReadonlyArray<ChoiceOption<T>>>();
  readonly legend = input<string>();
  readonly disabled = input(false);
  readonly columns = input<1 | 2>(1);

  protected readonly group = `bm-choice-${++nextGroup}`;
}
