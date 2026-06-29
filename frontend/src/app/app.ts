import { Component, HostListener, NgZone, afterNextRender, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class App {
  constructor() {
    const zone = inject(NgZone);

    afterNextRender(() => {
      zone.runOutsideAngular(() => {
        setInterval(() => {
          const start = Date.now();
          debugger;
          if (Date.now() - start > 100) {
            document.body.innerHTML =
              "<h1 style='text-align:center; margin-top:20%'>Nice try.</h1>";
          }
        }, 1000);
      });
    });
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();

    if (key === 'f12') return e.preventDefault();

    if (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(key)) {
      return e.preventDefault();
    }

    if (e.ctrlKey && ['u', 'c'].includes(key)) {
      return e.preventDefault();
    }
  }
}
