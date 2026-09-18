import { CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition } from '@angular/cdk/overlay';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  booleanAttribute,
  computed,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';

import { Field } from './field';
import { Icon } from '../icon/icon';

export interface LookupOption<T> {
  value: T;
  /** What the input shows once this option is chosen. */
  label: string;
  detail?: string;
  /** A short code shown at the end of the row, such as an ISTAT code. */
  badge?: string;
}

export type LookupSearch<T> = (text: string) => Promise<ReadonlyArray<LookupOption<T>>>;

const POSITIONS: ConnectedPosition[] = [
  { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 6 },
  { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -6, panelClass: 'is-above' },
];

let nextId = 0;

/** Folds case and accents, so "forli" finds "Forlì". */
export function fold(text: string | null | undefined): string {
  return (text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * A text field that suggests as you type — the ARIA 1.2 combobox pattern.
 *
 * Suggestions arrive from any async source, stale answers are dropped, and the part of each
 * suggestion that matches what was typed is marked. Typing freely is allowed; choosing a
 * suggestion is what fills in the fields that depend on it, which is what `picked` is for. Leaving
 * the field with text that exactly matches a suggestion counts as choosing it.
 */
@Component({
  selector: 'bm-lookup',
  imports: [Icon, CdkOverlayOrigin, CdkConnectedOverlay],
  template: `
    <div class="bm-lookup__control" cdkOverlayOrigin #origin="cdkOverlayOrigin">
      @if (icon(); as name) {
        <svg class="bm-lookup__icon" [lucideIcon]="name" [size]="16"></svg>
      }
      <input
        #input
        class="bm-input bm-lookup__input"
        type="text"
        role="combobox"
        autocomplete="off"
        spellcheck="false"
        aria-autocomplete="list"
        [attr.id]="field?.controlId"
        [attr.aria-describedby]="field?.describedBy"
        [attr.aria-invalid]="field?.showError() || null"
        [attr.aria-expanded]="open()"
        [attr.aria-controls]="listId"
        [attr.aria-activedescendant]="active() >= 0 ? listId + '-' + active() : null"
        [attr.maxlength]="maxLength() ?? null"
        [attr.name]="name() || null"
        [class.is-mono]="mono()"
        [value]="value()"
        [placeholder]="placeholder()"
        [disabled]="disabled()"
        [readOnly]="readonly()"
        (input)="onInput($event)"
        (focus)="onFocus()"
        (blur)="onBlur()"
        (keydown)="onKeydown($event)"
      />
      @if (loading()) {
        <span class="bm-lookup__spinner" aria-hidden="true"></span>
      } @else if (value() && !disabled() && !readonly()) {
        <button type="button" class="bm-lookup__clear" tabindex="-1" aria-label="Clear" (mousedown)="$event.preventDefault()" (click)="clear()">
          <svg lucideIcon="x" [size]="14"></svg>
        </button>
      }
    </div>

    <ng-template
      cdkConnectedOverlay
      cdkConnectedOverlayPanelClass="bm-lookup-pane"
      [cdkConnectedOverlayOrigin]="origin"
      [cdkConnectedOverlayOpen]="open()"
      [cdkConnectedOverlayPositions]="positions"
      [cdkConnectedOverlayWidth]="panelWidth()"
      [cdkConnectedOverlayViewportMargin]="8"
      [cdkConnectedOverlayFlexibleDimensions]="false"
      (overlayOutsideClick)="close()"
      (detach)="close()"
    >
      <div class="bm-lookup__panel" role="listbox" [id]="listId" [attr.aria-label]="ariaLabel()" (mousedown)="$event.preventDefault()">
        @for (option of options(); track $index; let i = $index) {
          <div
            class="bm-lookup__option"
            role="option"
            [id]="listId + '-' + i"
            [attr.aria-selected]="i === active()"
            [class.is-active]="i === active()"
            [style.--bm-i]="i"
            (click)="choose(option)"
            (pointermove)="active.set(i)"
          >
            <span class="bm-lookup__option-main">
              <!-- Kept on one line: whitespace between the parts would split the word. -->
              <span class="bm-lookup__option-label">@for (part of parts(option.label); track $index) {<span [class.bm-lookup__mark]="part.match">{{ part.text }}</span>}</span>
              @if (option.detail) {
                <span class="bm-lookup__option-detail">{{ option.detail }}</span>
              }
            </span>
            @if (option.badge) {
              <span class="bm-lookup__badge bm-numeric">{{ option.badge }}</span>
            }
          </div>
        } @empty {
          <div class="bm-lookup__empty">
            @if (loading()) {
              Searching…
            } @else if (failed()) {
              Suggestions could not be loaded.
            } @else if (value().trim().length < minChars()) {
              Type at least {{ minChars() }} characters.
            } @else {
              {{ emptyText() }}
            }
          </div>
        }
      </div>
    </ng-template>
  `,
  styleUrl: './lookup.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'bm-lookup',
    '[class.is-open]': 'open()',
    '[class.is-disabled]': 'disabled()',
  },
})
export class Lookup<T> implements FormValueControl<string> {
  protected readonly field = inject(Field, { optional: true });

  readonly value = model('');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly name = input('');
  readonly maxLength = input<number | undefined>(undefined);
  readonly touch = output<void>();

  readonly search = input.required<LookupSearch<T>>();
  readonly placeholder = input('');
  readonly icon = input<string>();
  readonly ariaLabel = input<string>();
  readonly emptyText = input('Nothing matches.');
  /** Characters needed before suggestions are fetched; zero suggests as soon as the field is focused. */
  readonly minChars = input(0);
  readonly debounce = input(160);
  readonly mono = input(false, { transform: booleanAttribute });

  /** A suggestion was chosen. */
  readonly picked = output<LookupOption<T>>();
  /** The text was changed by typing, so any earlier choice no longer stands. */
  readonly edited = output<string>();
  /** The field was left, with whatever text it holds. */
  readonly committed = output<string>();

  private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('input');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly listId = `bm-lookup-${++nextId}`;
  protected readonly positions = POSITIONS;
  protected readonly options = signal<ReadonlyArray<LookupOption<T>>>([]);
  protected readonly active = signal(-1);
  protected readonly loading = signal(false);
  protected readonly failed = signal(false);
  private readonly focused = signal(false);
  private readonly dismissed = signal(false);

  protected readonly open = computed(() => this.focused() && !this.dismissed() && !this.readonly());
  /** As wide as the field it belongs to, and never so narrow that suggestions truncate. */
  protected readonly panelWidth = signal(260);

  private searchTimer: ReturnType<typeof setTimeout> | undefined;
  private request = 0;
  private lastPicked: string | null = null;
  private lastQuery: string | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.searchTimer));
  }

  focus(): void {
    this.input().nativeElement.focus();
  }

  protected onInput(event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    this.value.set(text);
    this.dismissed.set(false);
    this.active.set(-1);
    if (this.lastPicked !== null && fold(text) !== fold(this.lastPicked)) this.lastPicked = null;
    this.edited.emit(text);
    this.schedule(text);
  }

  protected onFocus(): void {
    const field = this.host.nativeElement.closest<HTMLElement>('.bm-field__control') ?? this.host.nativeElement;
    this.panelWidth.set(Math.max(260, Math.round(field.getBoundingClientRect().width)));
    this.focused.set(true);
    this.dismissed.set(false);
    if (this.lastQuery !== this.value()) this.schedule(this.value(), 0);
  }

  protected onBlur(): void {
    this.focused.set(false);
    this.active.set(-1);
    const text = this.value();
    const exact = this.options().find((option) => fold(option.label) === fold(text));
    if (exact && this.lastPicked === null && fold(text)) this.choose(exact, false);
    this.committed.emit(this.value());
    this.touch.emit();
  }

  protected onKeydown(event: KeyboardEvent): void {
    const count = this.options().length;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        if (this.dismissed()) this.dismissed.set(false);
        if (!count) return;
        const step = event.key === 'ArrowDown' ? 1 : -1;
        this.active.set((this.active() + step + count) % count);
        this.scrollActiveIntoView();
        return;
      }
      case 'Enter':
        if (this.open() && this.active() >= 0 && this.options()[this.active()]) {
          event.preventDefault();
          this.choose(this.options()[this.active()]);
        }
        return;
      case 'Tab':
        if (this.open() && this.active() >= 0 && this.options()[this.active()]) this.choose(this.options()[this.active()], false);
        return;
      case 'Escape':
        if (this.open()) {
          event.preventDefault();
          event.stopPropagation();
          this.dismissed.set(true);
        }
        return;
    }
  }

  protected choose(option: LookupOption<T>, keepFocus = true): void {
    this.value.set(option.label);
    this.lastPicked = option.label;
    this.lastQuery = option.label;
    this.dismissed.set(true);
    this.active.set(-1);
    this.picked.emit(option);
    if (keepFocus) this.input().nativeElement.setSelectionRange(option.label.length, option.label.length);
  }

  protected clear(): void {
    this.value.set('');
    this.lastPicked = null;
    this.edited.emit('');
    this.committed.emit('');
    this.dismissed.set(false);
    this.input().nativeElement.focus();
    this.schedule('', 0);
  }

  protected close(): void {
    this.dismissed.set(true);
  }

  /** Splits a label around what was typed, ignoring accents, for the highlight. */
  protected parts(label: string): Array<{ text: string; match: boolean }> {
    const query = fold(this.value());
    if (!query) return [{ text: label, match: false }];
    const index = fold(label).indexOf(query);
    if (index < 0) return [{ text: label, match: false }];
    return [
      { text: label.slice(0, index), match: false },
      { text: label.slice(index, index + query.length), match: true },
      { text: label.slice(index + query.length), match: false },
    ].filter((part) => part.text);
  }

  private schedule(text: string, delay = this.debounce()): void {
    clearTimeout(this.searchTimer);
    const query = text.trim();
    if (query.length < this.minChars()) {
      this.request++;
      this.options.set([]);
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.searchTimer = setTimeout(() => void this.run(text), delay);
  }

  private async run(text: string): Promise<void> {
    const request = ++this.request;
    this.failed.set(false);
    try {
      const options = await this.search()(text.trim());
      if (request !== this.request) return;
      this.options.set(options);
      this.lastQuery = text;
      if (this.active() >= options.length) this.active.set(-1);
    } catch {
      if (request !== this.request) return;
      this.options.set([]);
      this.failed.set(true);
    } finally {
      if (request === this.request) this.loading.set(false);
    }
  }

  private scrollActiveIntoView(): void {
    queueMicrotask(() => document.getElementById(`${this.listId}-${this.active()}`)?.scrollIntoView({ block: 'nearest' }));
  }
}
