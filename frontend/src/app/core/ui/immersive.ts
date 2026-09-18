import { DestroyRef, Injectable, inject, signal } from '@angular/core';

/**
 * Full screen for the map workspaces.
 *
 * The shell folds its bars away and the document goes full screen where the browser allows it.
 * The whole document, not the map element, is what goes full screen: menus, dialogs and toasts
 * render outside the map and would otherwise disappear with everything else. Where the API is
 * missing, as on iPhone, folding the bars away is the whole effect.
 */
@Injectable({ providedIn: 'root' })
export class Immersive {
  private readonly state = signal(false);

  readonly active = this.state.asReadonly();
  readonly native = typeof document !== 'undefined' && !!document.fullscreenEnabled;

  constructor() {
    const onChange = () => {
      if (!document.fullscreenElement) this.state.set(false);
    };
    document.addEventListener('fullscreenchange', onChange);
    inject(DestroyRef).onDestroy(() => document.removeEventListener('fullscreenchange', onChange));
  }

  async enter(): Promise<void> {
    this.state.set(true);
    if (!this.native || document.fullscreenElement) return;
    try {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    } catch {
      // Refused, for example without a user gesture: the folded shell still gives the room.
    }
  }

  async exit(): Promise<void> {
    this.state.set(false);
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
  }

  toggle(): Promise<void> {
    return this.state() ? this.exit() : this.enter();
  }
}
