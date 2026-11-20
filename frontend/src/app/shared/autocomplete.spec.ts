import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { form, FormField, required } from '@angular/forms/signals';
import { Autocomplete } from './autocomplete';

@Component({
  imports: [Autocomplete, FormField],
  template: `<app-autocomplete label="Region" [options]="options" [available]="available()" [formField]="form.region" />`,
})
class Host {
  readonly model = signal({ region: '' });
  readonly available = signal(true);
  readonly options = ['Abruzzo', 'Lazio', 'Lombardia', 'Piemonte'];
  readonly form = form(this.model, (fields) => required(fields.region));
}

describe('Autocomplete', () => {
  let fixture: ComponentFixture<Host>;
  let host: HTMLElement;
  let input: HTMLInputElement;

  beforeEach(async () => {
    Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
    await TestBed.configureTestingModule({}).compileComponents();
    fixture = TestBed.createComponent(Host);
    host = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    const found = host.querySelector('input');
    if (!found) throw new Error('Missing combobox');
    input = found;
  });

  function key(key: string) { input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })); fixture.detectChanges(); }

  it('filters themed options and updates Signal Forms when an option is selected', () => {
    input.dispatchEvent(new FocusEvent('focus'));
    input.value = 'L'; input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(host.querySelectorAll('[role="option"]')).toHaveLength(2);
    host.querySelector<HTMLButtonElement>('[role="option"]')?.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.model().region).toBe('Lazio');
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });

  it('supports arrows, Enter and Escape without submitting the surrounding form', () => {
    key('ArrowUp');
    expect(input.getAttribute('aria-activedescendant')).toContain('option-3');
    key('Enter');
    expect(fixture.componentInstance.model().region).toBe('Piemonte');
    key('ArrowDown');
    expect(input.getAttribute('aria-expanded')).toBe('true');
    key('Escape');
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });

  it('disables a dependent place until its parent is available', () => {
    fixture.componentInstance.available.set(false);
    fixture.detectChanges();
    expect(input.disabled).toBe(true);
  });

  it('marks the field touched on blur and removes the options', () => {
    input.dispatchEvent(new FocusEvent('focus'));
    fixture.detectChanges();
    expect(host.querySelector('[role="listbox"]')).not.toBeNull();
    input.dispatchEvent(new FocusEvent('blur'));
    fixture.detectChanges();
    expect(fixture.componentInstance.form.region().touched()).toBe(true);
    expect(host.querySelector('[role="listbox"]')).toBeNull();
  });
});
