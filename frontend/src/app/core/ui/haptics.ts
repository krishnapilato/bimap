import { Injectable, inject } from '@angular/core';

import { PreferencesStore } from './preferences';
import { Viewport } from './viewport';

/**
 * Gentle vibration on touch devices, for the moments that deserve to be felt: a captured point,
 * a completed save, a refused action. Never on every tap, and never where it is switched off.
 */
@Injectable({ providedIn: 'root' })
export class Haptics {
  private readonly preferences = inject(PreferencesStore);
  private readonly viewport = inject(Viewport);

  tap(): void {
    this.vibrate(8);
  }

  success(): void {
    this.vibrate([10, 60, 14]);
  }

  warning(): void {
    this.vibrate([24, 40, 24]);
  }

  private vibrate(pattern: number | number[]): void {
    if (!this.preferences.haptics() || !this.viewport.isCoarsePointer()) return;
    if (typeof navigator.vibrate === 'function') navigator.vibrate(pattern);
  }
}
