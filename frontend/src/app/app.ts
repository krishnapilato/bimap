import { Component, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class App {
  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();

    if (key === 'f12') return e.preventDefault();

    if (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(key)) return e.preventDefault();

    if (e.ctrlKey && ['u', 'c'].includes(key)) return e.preventDefault();
  }
}
