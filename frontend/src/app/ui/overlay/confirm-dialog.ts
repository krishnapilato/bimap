import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, Injectable, inject, signal } from '@angular/core';

import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import { Dialogs } from './dialog';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  icon?: string;
  /** Asks for a reason, kept with the change (a lock, a rejection, an opt-out). */
  reason?: { label: string; placeholder?: string; required?: boolean };
}

export interface ConfirmResult {
  confirmed: boolean;
  reason?: string;
}

@Component({
  selector: 'bm-confirm-dialog',
  imports: [Icon, Button],
  template: `
    <div class="bm-dialog" role="alertdialog" aria-labelledby="bm-confirm-title" aria-describedby="bm-confirm-message">
      <div class="bm-confirm__icon" [attr.data-tone]="data.tone ?? 'primary'" aria-hidden="true">
        <svg [lucideIcon]="data.icon ?? (data.tone === 'danger' ? 'triangle-alert' : 'circle-question-mark')" [size]="22"></svg>
      </div>
      <h2 id="bm-confirm-title" class="bm-dialog__title">{{ data.title }}</h2>
      <p id="bm-confirm-message" class="bm-dialog__text">{{ data.message }}</p>

      @if (data.reason; as reason) {
        <label class="bm-confirm__reason">
          <span>{{ reason.label }}@if (!reason.required) { <em>Optional</em> }</span>
          <textarea
            class="bm-input"
            rows="3"
            maxlength="256"
            [placeholder]="reason.placeholder ?? ''"
            [value]="text()"
            (input)="text.set($any($event.target).value)"
          ></textarea>
        </label>
      }

      <div class="bm-dialog__actions">
        <button bmButton type="button" variant="ghost" (click)="ref.close({ confirmed: false })">Cancel</button>
        <button
          bmButton
          type="button"
          [variant]="data.tone === 'danger' ? 'danger' : 'primary'"
          [disabled]="!!data.reason?.required && !text().trim()"
          (click)="ref.close({ confirmed: true, reason: text().trim() || undefined })"
        >
          {{ data.confirmLabel }}
        </button>
      </div>
    </div>
  `,
  styles: `
    .bm-confirm__icon { display: grid; place-items: center; width: 44px; height: 44px; margin-bottom: 14px; border-radius: 14px;
      background: var(--bm-accent-soft); color: var(--bm-accent); animation: bm-pop 360ms var(--bm-ease-spring) 80ms both; }
    .bm-confirm__icon[data-tone='danger'] { background: var(--bm-negative-soft); color: var(--bm-negative); }
    .bm-confirm__reason { display: grid; gap: 6px; margin-top: 16px; font: var(--bm-text-caption); font-weight: 650; color: var(--bm-text-2); }
    .bm-confirm__reason em { margin-left: 6px; font-style: normal; font-weight: 500; color: var(--bm-text-3); }
    .bm-confirm__reason textarea { border: 1px solid var(--bm-border); border-radius: var(--bm-radius-md); min-height: 84px; }
    .bm-confirm__reason textarea:focus { border-color: var(--bm-accent); box-shadow: 0 0 0 3px var(--bm-accent-glow); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  protected readonly data = inject<ConfirmOptions>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<ConfirmResult>>(DialogRef);
  protected readonly text = signal('');
}

/** Asks before anything that cannot be taken back, and optionally why. */
@Injectable({ providedIn: 'root' })
export class Confirm {
  private readonly dialogs = inject(Dialogs);

  async ask(options: ConfirmOptions): Promise<ConfirmResult> {
    const result = await this.dialogs.result<ConfirmResult, ConfirmOptions>(ConfirmDialog, {
      data: options,
      width: '440px',
      maxWidth: 'calc(100vw - 32px)',
    });
    return result ?? { confirmed: false };
  }
}
