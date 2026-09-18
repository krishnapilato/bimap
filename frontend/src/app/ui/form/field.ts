import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ViewEncapsulation,
  booleanAttribute,
  computed,
  inject,
  input,
} from '@angular/core';
import { FieldTree } from '@angular/forms/signals';

let nextId = 0;

const DEFAULT_MESSAGES: Record<string, (error: Record<string, unknown>) => string> = {
  required: () => 'This field is required.',
  email: () => 'Enter a valid email address.',
  maxLength: (error) => `Keep it under ${String(error['maxLength'] ?? 'the limit')} characters.`,
  minLength: (error) => `Use at least ${String(error['minLength'] ?? 'more')} characters.`,
  pattern: () => 'This does not match the expected format.',
  min: () => 'This value is too small.',
  max: () => 'This value is too large.',
};

/**
 * Label, control, hint and error, laid out once. The error replaces the hint rather than pushing
 * the form down, and it only appears after the field was touched, never while someone is typing
 * their first character.
 */
@Component({
  selector: 'bm-field',
  template: `
    @if (label()) {
      <label class="bm-field__label" [attr.for]="controlId">
        {{ label() }}
        @if (isRequired()) {
          <span class="bm-field__required" aria-hidden="true">*</span>
        }
        @if (optional()) {
          <span class="bm-field__optional">Optional</span>
        }
      </label>
    }
    <div class="bm-field__control" [class.has-error]="showError()" [class.is-pending]="pending()">
      <ng-content select="[bmPrefix]" />
      <ng-content />
      <ng-content select="[bmSuffix]" />
      @if (pending()) {
        <span class="bm-field__pending" aria-hidden="true"></span>
      }
    </div>
    <div class="bm-field__meta" [id]="describedBy" aria-live="polite">
      @if (showError()) {
        <span class="bm-field__error" animate.enter="bm-enter-fade">{{ errorText() }}</span>
      } @else if (hint()) {
        <span class="bm-field__hint">{{ hint() }}</span>
      }
      <ng-content select="[bmMeta]" />
    </div>
  `,
  styleUrl: './field.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'bm-field', '[class.is-disabled]': 'disabled()' },
})
export class Field {
  readonly label = input<string>();
  readonly hint = input<string>();
  readonly control = input<FieldTree<unknown>>();
  readonly required = input(false, { transform: booleanAttribute });
  readonly optional = input(false, { transform: booleanAttribute });
  /** An error from outside the form, such as a server refusal for this field. */
  readonly error = input<string | null>(null);

  readonly controlId = `bm-field-${++nextId}`;
  readonly describedBy = `${this.controlId}-meta`;

  private readonly state = computed(() => this.control()?.());

  protected readonly isRequired = computed(() => this.required() || (this.state()?.required() ?? false));
  protected readonly pending = computed(() => this.state()?.pending() ?? false);
  protected readonly disabled = computed(() => this.state()?.disabled() ?? false);

  readonly showError = computed(() => {
    if (this.error()) return true;
    const state = this.state();
    return !!state && state.touched() && state.invalid();
  });

  protected readonly errorText = computed(() => {
    if (this.error()) return this.error();
    const error = this.state()?.errors()[0];
    if (!error) return '';
    return error.message ?? DEFAULT_MESSAGES[error.kind]?.(error as unknown as Record<string, unknown>) ?? 'Check this value.';
  });
}

/** Styles a native control and connects it to the surrounding field's label, hint and error. */
@Directive({
  selector: 'input[bmInput], textarea[bmInput], select[bmInput]',
  host: {
    class: 'bm-input',
    '[attr.id]': 'field?.controlId',
    '[attr.aria-describedby]': 'field?.describedBy',
    '[attr.aria-invalid]': 'field?.showError() || null',
  },
})
export class Input {
  protected readonly field = inject(Field, { optional: true });
}
