import { Dialog, DialogConfig, DialogRef } from '@angular/cdk/dialog';
import { ComponentType } from '@angular/cdk/portal';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

const LEAVE_MS = 170;

/**
 * Opens dialogs that arrive and leave: the panel rises and settles in, and on close it sinks away
 * before it is removed, instead of disappearing mid-frame.
 */
@Injectable({ providedIn: 'root' })
export class Dialogs {
  private readonly dialog = inject(Dialog);

  open<R, D = unknown, C = unknown>(component: ComponentType<C>, config: DialogConfig<D, DialogRef<R, C>> = {}): DialogRef<R, C> {
    const ref = this.dialog.open<R, D, C>(component, {
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      ...config,
      panelClass: ['bm-dialog-pane', ...toArray(config.panelClass)],
      backdropClass: ['bm-dialog-backdrop', ...toArray(config.backdropClass)],
      closeOnNavigation: true,
    });

    // Escape and backdrop clicks close through the same animated path as the buttons do.
    const close = ref.close.bind(ref);
    let closing = false;
    ref.close = (result?: R, options?: unknown) => {
      if (closing) return;
      closing = true;
      ref.overlayRef.hostElement.classList.add('is-leaving');
      ref.overlayRef.backdropElement?.classList.add('is-leaving');
      setTimeout(() => close(result, options as never), LEAVE_MS);
    };
    return ref;
  }

  async result<R, D = unknown, C = unknown>(component: ComponentType<C>, config: DialogConfig<D, DialogRef<R, C>> = {}): Promise<R | undefined> {
    return firstValueFrom(this.open<R, D, C>(component, config).closed);
  }
}

function toArray(value: string | string[] | undefined): string[] {
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}
