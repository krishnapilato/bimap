import { ChangeDetectionStrategy, Component, effect, inject, untracked } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { NgxSonnerToaster, toast } from 'ngx-sonner';

import { SessionStore } from './core/auth/session.store';
import { Viewport } from './core/ui/viewport';

const PUBLIC_PREFIXES = ['/auth', '/subscribe', '/subscriptions'];

const END_MESSAGES = {
  expired: 'Your session expired. Sign in again to carry on.',
  revoked: 'Your session was ended for safety. Sign in again.',
  elsewhere: 'You signed out in another tab.',
} as const;

@Component({
  selector: 'bm-root',
  imports: [RouterOutlet, NgxSonnerToaster],
  template: `
    <router-outlet />
    <ngx-sonner-toaster
      [position]="viewport.isHandset() ? 'top-center' : 'bottom-right'"
      [visibleToasts]="3"
      [duration]="4200"
      closeButton
      [offset]="viewport.isHandset() ? '12px' : '20px'"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly viewport = inject(Viewport);
  private readonly sessions = inject(SessionStore);
  private readonly router = inject(Router);

  constructor() {
    // A session that ends on its own — expiry, revocation, another tab — sends the person back to
    // sign in, and says why, instead of leaving them on a page whose every request now fails.
    effect(() => {
      const signedIn = this.sessions.isAuthenticated();
      const reason = this.sessions.endReason();
      untracked(() => {
        if (signedIn || !reason || reason === 'signed-out') return;
        const url = this.router.url;
        if (PUBLIC_PREFIXES.some((prefix) => url.startsWith(prefix))) return;
        toast.info(END_MESSAGES[reason]);
        void this.router.navigate(['/auth/sign-in'], { queryParams: { returnUrl: url } });
      });
    });
  }
}
