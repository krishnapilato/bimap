import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewEncapsulation,
  booleanAttribute,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * Search as you type, without a request per keystroke: `search` fires once typing pauses, and at
 * once on Enter. Escape clears it, and `/` anywhere on the page puts the cursor here.
 */
@Component({
  selector: 'bm-search-box',
  imports: [Icon],
  template: `
    <svg lucideIcon="search" class="bm-search-box__icon" [size]="17" aria-hidden="true"></svg>
    <input
      #field
      type="search"
      class="bm-search-box__input"
      [placeholder]="placeholder()"
      [value]="value()"
      [attr.aria-label]="placeholder()"
      autocomplete="off"
      spellcheck="false"
      (input)="type(field.value)"
      (keydown.enter)="flush()"
      (keydown.escape)="clear()"
    />
    @if (busy()) {
      <span class="bm-search-box__busy" aria-hidden="true"></span>
    } @else if (value()) {
      <button type="button" class="bm-search-box__clear" aria-label="Clear search" (click)="clear()">
        <svg lucideIcon="x" [size]="15"></svg>
      </button>
    } @else if (shortcut()) {
      <kbd class="bm-search-box__kbd" aria-hidden="true">/</kbd>
    }
  `,
  styleUrl: './search-box.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'bm-search-box', '[class.has-value]': '!!value()', '(document:keydown)': 'focusOnSlash($event)' },
})
export class SearchBox implements OnDestroy {
  readonly value = model('');
  readonly placeholder = input('Search');
  readonly debounce = input(280);
  readonly busy = input(false, { transform: booleanAttribute });
  readonly shortcut = input(false, { transform: booleanAttribute });
  readonly search = output<string>();

  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');
  private timer: ReturnType<typeof setTimeout> | undefined;

  type(text: string): void {
    this.value.set(text);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.search.emit(text.trim()), this.debounce());
  }

  flush(): void {
    clearTimeout(this.timer);
    this.search.emit(this.value().trim());
  }

  clear(): void {
    if (!this.value()) return;
    this.value.set('');
    this.flush();
    this.field().nativeElement.focus();
  }

  focus(): void {
    this.field().nativeElement.focus();
  }

  focusOnSlash(event: KeyboardEvent): void {
    if (!this.shortcut() || event.key !== '/' || event.defaultPrevented) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
    event.preventDefault();
    this.focus();
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
  }
}
