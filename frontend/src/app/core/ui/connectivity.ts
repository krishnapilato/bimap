import { DestroyRef, Injectable, inject, signal } from '@angular/core';

/** Whether the browser believes it is online — worth knowing for a surveyor in the field. */
@Injectable({ providedIn: 'root' })
export class Connectivity {
  private readonly state = signal(navigator.onLine);
  readonly online = this.state.asReadonly();

  constructor() {
    const update = () => this.state.set(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    });
  }
}
