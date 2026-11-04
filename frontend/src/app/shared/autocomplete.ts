import { afterRenderEffect, Component, computed, ElementRef, inject, input, model, output, signal, viewChild } from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';

let nextId = 0;

@Component({
  selector: 'app-autocomplete',
  host: { class: 'relative block min-w-0' },
  template: `
    <label class="mb-1 block text-xs font-medium text-base-content/70" [for]="id">{{ label() }}</label>
    <div class="relative">
      <input #input class="input w-full pr-9" role="combobox" autocomplete="off" autocapitalize="none"
        [id]="id" [name]="name()" [value]="value()" [attr.aria-label]="label()" [placeholder]="available() ? label() : hint() || label()"
        [disabled]="disabled() || !available()" [required]="required()" [class.input-error]="invalid() && touched()"
        aria-autocomplete="list" aria-haspopup="listbox" [attr.aria-expanded]="open()"
        [attr.aria-controls]="id + '-list'" [attr.aria-activedescendant]="activeId()"
        [attr.aria-invalid]="invalid() && touched()" (focus)="show()" (input)="type(input.value)"
        (blur)="blur()" (keydown)="keydown($event)" />
      <svg class="pointer-events-none absolute right-3 top-3.5 size-4 text-base-content/50" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m5 7.5 5 5 5-5" /></svg>
    </div>
    @if (open()) {
      <div class="absolute left-0 right-0 top-full z-[1050] mt-2 overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-xl">
        <div role="listbox" [id]="id + '-list'" [attr.aria-label]="label() + ' options'" class="max-h-56 overflow-y-auto overscroll-contain p-1.5">
          @for (option of filtered(); track option; let index = $index) {
            <button type="button" role="option" tabindex="-1" [id]="id + '-option-' + index"
              class="block w-full rounded-lg px-3 py-2.5 text-left text-sm whitespace-normal transition-colors hover:bg-base-200"
              [class.bg-base-200]="active() === index" [class.font-medium]="value() === option"
              [attr.aria-selected]="value() === option" (pointerenter)="active.set(index)"
              (pointerdown)="$event.preventDefault()" (click)="choose(option)">{{ option }}</button>
          } @empty {
            <p class="px-3 py-4 text-sm text-base-content/60" role="status">No matching places.</p>
          }
        </div>
      </div>
    }
  `,
})
export class Autocomplete implements FormValueControl<string> {
  readonly value = model('');
  readonly label = input.required<string>();
  readonly options = input<readonly string[]>([]);
  readonly hint = input('');
  readonly available = input(true);
  readonly disabled = input(false);
  readonly required = input(false);
  readonly invalid = input(false);
  readonly touched = input(false);
  readonly name = input('');
  readonly touch = output();
  readonly selected = output<string>();
  protected readonly id = `place-${++nextId}`;
  protected readonly open = signal(false);
  protected readonly active = signal(-1);
  private readonly search = signal('');
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly inputElement = viewChild.required<ElementRef<HTMLInputElement>>('input');
  protected readonly filtered = computed(() => {
    const query = this.search().trim().toLocaleLowerCase('it');
    return this.options().filter((option) => option.toLocaleLowerCase('it').includes(query));
  });
  protected readonly activeId = computed(() => this.open() && this.filtered()[this.active()] !== undefined ? `${this.id}-option-${this.active()}` : null);

  constructor() {
    afterRenderEffect(() => {
      const id = this.activeId();
      if (id) this.element.nativeElement.querySelector(`#${id}`)?.scrollIntoView({ block: 'nearest' });
    });
  }

  focus(options?: FocusOptions): void { this.inputElement().nativeElement.focus(options); }

  protected show(): void {
    if (this.disabled() || !this.available()) return;
    this.search.set('');
    this.active.set(-1);
    this.open.set(true);
  }

  protected type(value: string): void {
    this.change(value);
    this.search.set(value);
    this.active.set(-1);
    this.open.set(true);
  }

  protected blur(): void { this.open.set(false); this.touch.emit(); }

  protected choose(option: string): void {
    this.change(option);
    this.open.set(false);
    this.touch.emit();
  }

  private change(value: string): void {
    if (value === this.value()) return;
    this.value.set(value);
    this.selected.emit(value);
  }

  protected keydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.open.set(false);
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.key === 'Tab') { this.open.set(false); return; }
    if (event.key === 'Enter' && this.open()) {
      const option = this.filtered()[this.active()];
      if (option !== undefined) this.choose(option);
      event.preventDefault();
      return;
    }
    if (this.open() && (event.key === 'Home' || event.key === 'End')) {
      event.preventDefault();
      this.active.set(event.key === 'Home' ? 0 : this.filtered().length - 1);
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    this.move(event.key === 'ArrowDown');
  }

  private move(down: boolean): void {
    if (!this.open()) this.show();
    const count = this.filtered().length;
    if (!count) return;
    if (this.active() < 0) this.active.set(down ? 0 : count - 1);
    else this.active.update((index) => (index + (down ? 1 : count - 1)) % count);
  }
}
