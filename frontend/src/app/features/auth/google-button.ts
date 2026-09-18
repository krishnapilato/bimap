import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

import { DEMO_CONTROLS } from '../../core/app-mode';
import { GoogleButtonText, GoogleIdentity } from '../../core/auth/google-identity';
import { Icon } from '../../ui/icon/icon';

/**
 * Google's own sign-in button, with the states around it: a placeholder of the same size while
 * Google's script loads, a spinner while the credential is exchanged for a session, and a plain
 * explanation when Google cannot be reached or is not set up for this build.
 */
@Component({
  selector: 'bm-google-button',
  imports: [Icon],
  template: `
    @if (unavailable(); as reason) {
      <p class="google-button__note">
        <svg lucideIcon="info" [size]="15"></svg>
        {{ reason }}
      </p>
    } @else {
      <div class="google-button__frame" [class.is-ready]="ready()" [class.is-busy]="busy()">
        <div #host class="google-button__host"></div>
        @if (!ready()) {
          <span class="google-button__placeholder" aria-hidden="true">
            <span class="google-button__logo"></span>
            <span class="google-button__line"></span>
          </span>
        }
        @if (busy()) {
          <span class="google-button__busy" role="status">
            <span class="google-button__spinner" aria-hidden="true"></span>
            Signing in with Google…
          </span>
        }
      </div>
    }
  `,
  styles: `
    :host { display: block; }
    .google-button__frame { position: relative; min-height: 44px; border-radius: 10px; }
    .google-button__host { display: flex; justify-content: center; min-height: 44px; opacity: 0; transition: opacity 320ms var(--bm-ease-standard); }
    .is-ready .google-button__host { opacity: 1; }
    .google-button__placeholder {
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 10px;
      border: 1px solid var(--bm-border); border-radius: 10px;
      background: linear-gradient(90deg, var(--bm-surface) 0%, var(--bm-surface-3) 50%, var(--bm-surface) 100%) 0 0 / 200% 100%;
      animation: bm-shimmer 1.4s linear infinite;
    }
    .google-button__logo { width: 18px; height: 18px; border-radius: 50%; background: var(--bm-surface-3); }
    .google-button__line { width: 150px; height: 10px; border-radius: 99px; background: var(--bm-surface-3); }
    .google-button__busy {
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 10px;
      border-radius: 10px; background: rgba(255, 255, 255, 0.92);
      font: var(--bm-text-small); font-weight: 600; color: var(--bm-text-2);
      animation: bm-fade var(--bm-duration-base) var(--bm-ease-standard) both;
    }
    .google-button__spinner { width: 16px; height: 16px; border: 2px solid var(--bm-accent-border); border-top-color: var(--bm-accent); border-radius: 50%; animation: bm-spin 700ms linear infinite; }
    .google-button__note {
      display: flex; align-items: flex-start; gap: 8px; margin: 0; padding: 10px 12px;
      border: 1px dashed var(--bm-border-strong); border-radius: 10px;
      font: var(--bm-text-caption); font-weight: 500; color: var(--bm-text-2);
    }
    .google-button__note svg { flex-shrink: 0; margin-top: 1px; color: var(--bm-text-3); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoogleButton {
  private readonly google = inject(GoogleIdentity);
  private readonly demo = inject(DEMO_CONTROLS, { optional: true });

  readonly text = input<GoogleButtonText>('continue_with');
  readonly busy = input(false);
  readonly credential = output<string>();

  private readonly host = viewChild<ElementRef<HTMLElement>>('host');

  protected readonly ready = signal(false);
  protected readonly unavailable = signal<string | null>(
    this.demo
      ? 'Google sign-in works against the live IAM service. In the demo, use an email address instead.'
      : this.google.enabled
        ? null
        : 'Google sign-in is not set up for this build.',
  );

  constructor() {
    afterNextRender(async () => {
      const host = this.host()?.nativeElement;
      if (!host) return;
      try {
        await this.google.renderButton(host, this.text(), (idToken) => this.credential.emit(idToken));
        this.ready.set(true);
      } catch {
        this.unavailable.set('Google could not be reached. Check the connection, or sign in with your email address.');
      }
    });
  }
}
