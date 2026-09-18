import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input } from '@angular/core';

import { PASSWORD_RULES } from '../../core/api/iam.models';
import { Icon } from '../icon/icon';

/**
 * The server's password policy, shown before anything is submitted: each rule ticks itself off
 * as it is met, and the bar underneath fills and warms from red to green.
 */
@Component({
  selector: 'bm-password-rules',
  imports: [Icon],
  template: `
    <div class="bm-password-rules__meter" aria-hidden="true">
      <span [style.transform]="'scaleX(' + ratio() + ')'" [attr.data-strength]="strength()"></span>
    </div>
    <ul class="bm-password-rules__list" aria-label="Password requirements">
      @for (rule of rules(); track rule.label) {
        <li [class.is-met]="rule.met">
          <span class="bm-password-rules__check" aria-hidden="true">
            <svg lucideIcon="check" [size]="12" [strokeWidth]="3"></svg>
          </span>
          {{ rule.label }}
          <span class="bm-visually-hidden">{{ rule.met ? '(met)' : '(not met)' }}</span>
        </li>
      }
    </ul>
  `,
  styles: `
    .bm-password-rules { display: grid; gap: 10px; }
    .bm-password-rules__meter { height: 4px; border-radius: 99px; background: var(--bm-surface-3); overflow: hidden; }
    .bm-password-rules__meter span {
      display: block; height: 100%; border-radius: inherit; transform-origin: left;
      background: var(--bm-negative);
      transition: transform var(--bm-duration-slow) var(--bm-ease-emphasized), background-color var(--bm-duration-slow) var(--bm-ease-standard);
    }
    .bm-password-rules__meter span[data-strength='fair'] { background: var(--bm-critical); }
    .bm-password-rules__meter span[data-strength='strong'] { background: var(--bm-positive); }
    .bm-password-rules__list { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 6px 14px; }
    .bm-password-rules__list li {
      display: flex; align-items: center; gap: 8px;
      font: var(--bm-text-caption); color: var(--bm-text-3);
      transition: color var(--bm-duration-base) var(--bm-ease-standard);
    }
    .bm-password-rules__list li.is-met { color: var(--bm-text-2); }
    .bm-password-rules__check {
      display: grid; place-items: center; width: 16px; height: 16px; flex-shrink: 0;
      border-radius: 50%; border: 1.5px solid var(--bm-border-strong); color: transparent;
      transition: background-color var(--bm-duration-base) var(--bm-ease-standard), border-color var(--bm-duration-base) var(--bm-ease-standard), transform var(--bm-duration-base) var(--bm-ease-spring);
    }
    .bm-password-rules__check svg { stroke-dasharray: 24; stroke-dashoffset: 24; transition: stroke-dashoffset var(--bm-duration-slow) var(--bm-ease-emphasized) 60ms; }
    .is-met .bm-password-rules__check { background: var(--bm-positive); border-color: var(--bm-positive); color: #fff; transform: scale(1.08); }
    .is-met .bm-password-rules__check svg { stroke-dashoffset: 0; }
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'bm-password-rules' },
})
export class PasswordRules {
  readonly value = input('');

  protected readonly rules = computed(() =>
    PASSWORD_RULES.map((rule) => ({ label: rule.label, met: rule.test(this.value()) })),
  );

  protected readonly ratio = computed(() => {
    const met = this.rules().filter((rule) => rule.met).length;
    return met / this.rules().length;
  });

  protected readonly strength = computed(() => {
    const ratio = this.ratio();
    return ratio === 1 ? 'strong' : ratio >= 0.5 ? 'fair' : 'weak';
  });
}
