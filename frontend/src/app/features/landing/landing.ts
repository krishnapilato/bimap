/**
 * The landing page, and the way in.
 *
 * One screen: what the product is on the left, the way in on the right, and no scroll between
 * them. There is no marketing sequence to get past — a visitor who came to sign in can, and a
 * visitor who came to look does not have to move to do it.
 *
 * @author Khova Krishna Pilato
 */

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AUTH_API } from '../../core/api/adapters';
import { MOTION_DIRECTIVES } from '../../core/motion/motion';
import { OtpModalComponent } from './otp-modal';
import { SessionService } from '../../core/session.service';
import { isDemoMode } from '../../core/api/api.providers';
import { DEMO_PASSWORD } from '../../core/api/mock/auth.mock';
import { ProblemDetail } from '../../core/api/models';

type Mode = 'signIn' | 'signUp';


@Component({
  selector: 'bm-landing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, OtpModalComponent, ...MOTION_DIRECTIVES],
  templateUrl: './landing.html',
})
export class LandingComponent {
  protected readonly session = inject(SessionService);
  readonly #auth = inject(AUTH_API);
  readonly #router = inject(Router);

  protected readonly demo = isDemoMode;
  protected readonly demoPassword = DEMO_PASSWORD;

  protected readonly mode = signal<Mode>('signIn');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly firstName = signal('');
  protected readonly lastName = signal('');
  protected readonly email = signal(isDemoMode ? 'krishnak.pilato@gmail.com' : '');
  protected readonly password = signal(isDemoMode ? DEMO_PASSWORD : '');

  protected readonly otpFor = signal<string | null>(null);
  protected readonly otpError = signal<string | null>(null);
  protected readonly otpBusy = signal(false);

  protected readonly isSignUp = computed(() => this.mode() === 'signUp');
  protected readonly submitLabel = computed(() =>
    this.isSignUp() ? 'Create account' : 'Sign in',
  );

  /** Deliberately permissive: something, an @, something, a dot, something. Anything stricter
      rejects addresses that exist. The server is the real authority. */
  protected readonly emailError = computed(() => {
    const value = this.email().trim();
    if (value.length === 0) {
      return 'Enter your email address.';
    }
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) ? null : 'That is not an email address.';
  });

  /** The four rules the server enforces, checked here so nobody learns them from a 400. */
  protected readonly passwordRules = computed(() => {
    const value = this.password();
    return [
      { label: 'Twelve characters', met: value.length >= 12 },
      { label: 'A capital letter', met: /[A-Z]/.test(value) },
      { label: 'A digit', met: /[0-9]/.test(value) },
      { label: 'A symbol', met: /[^A-Za-z0-9]/.test(value) },
    ];
  });

  protected readonly passwordError = computed(() => {
    if (this.password().length === 0) {
      return 'Enter your password.';
    }
    if (!this.isSignUp()) {
      return null;
    }
    return this.passwordRules().every((rule) => rule.met) ? null : 'That password is too weak.';
  });

  protected readonly firstNameError = computed(() =>
    this.isSignUp() && this.firstName().trim().length === 0 ? 'Enter your first name.' : null,
  );

  protected readonly lastNameError = computed(() =>
    this.isSignUp() && this.lastName().trim().length === 0 ? 'Enter your last name.' : null,
  );

  protected readonly canSubmit = computed(
    () =>
      this.emailError() === null &&
      this.passwordError() === null &&
      this.firstNameError() === null &&
      this.lastNameError() === null,
  );

  /** A field complains once it has been left, or once submit has been pressed — never while the
      visitor is still typing into it for the first time. */
  protected readonly touched = signal<Record<string, boolean>>({});
  protected readonly attempted = signal(false);

  protected touch(field: string): void {
    this.touched.update((current) => ({ ...current, [field]: true }));
  }

  protected shows(field: string, error: string | null): string | null {
    return error !== null && (this.attempted() || this.touched()[field] === true) ? error : null;
  }

  protected readonly metrics = [
    { value: 7896, label: 'Italian municipalities', suffix: '' },
    { value: 110, label: 'Provinces', suffix: '' },
    { value: 20, label: 'Regions', suffix: '' },
    { value: 102, label: 'End-to-end checks passing', suffix: '' },
  ] as const;


  /**
   * The hero card shows one real comune rather than a stock illustration. Varese genuinely is
   * ISTAT 012133, cadastral L682, CAP 21100 — the same values the cascade resolves at runtime — so
   * the marketing surface cannot quietly disagree with the product.
   */
  protected readonly preview = [
    { label: 'ISTAT', value: '012133' },
    { label: 'Cadastral', value: 'L682' },
    { label: 'CAP', value: '21100' },
  ] as const;

  protected readonly previewRows = [
    { field: 'Region', value: 'Lombardia', done: true },
    { field: 'Province', value: 'Varese (VA)', done: true },
    { field: 'Street', value: 'Via Luigi Sacco', done: true },
    { field: 'Asset name', value: 'Palazzo Estense', done: true },
    { field: 'Responsible body', value: 'Not chosen yet', done: false },
  ] as const;

  protected setMode(mode: Mode): void {
    this.mode.set(mode);
    this.error.set(null);
    this.attempted.set(false);
    this.touched.set({});
  }

  protected submit(): void {
    this.attempted.set(true);

    if (!this.canSubmit() || this.busy()) {
      return;
    }
    this.error.set(null);
    this.busy.set(true);

    if (this.isSignUp()) {
      this.session
        .signUp({
          firstName: this.firstName().trim(),
          lastName: this.lastName().trim(),
          email: this.email().trim(),
          password: this.password(),
        })
        .subscribe({
          next: () => {
            this.busy.set(false);
            // Registration never opens a session: the address has to be confirmed first.
            this.otpFor.set(this.email().trim());
          },
          error: (failure) => {
            this.busy.set(false);
            this.error.set(describe(failure));
          },
        });
      return;
    }

    this.session.signIn({ email: this.email().trim(), password: this.password() }).subscribe({
      next: () => {
        this.busy.set(false);
        void this.#router.navigate(['/hub']);
      },
      error: (failure) => {
        this.busy.set(false);
        this.error.set(describe(failure));

        // An unactivated account is not a failure, it is the next step.
        if (failure?.error?.code === 'ACCOUNT_NOT_ACTIVATED') {
          this.otpFor.set(this.email().trim());
        }
      },
    });
  }

  protected verifyOtp(code: string): void {
    const email = this.otpFor();
    if (!email) {
      return;
    }
    this.otpBusy.set(true);
    this.otpError.set(null);

    this.session.verifyOtp(email, code).subscribe({
      next: () => {
        this.otpBusy.set(false);
        this.otpFor.set(null);
        void this.#router.navigate(['/hub']);
      },
      error: (failure) => {
        this.otpBusy.set(false);
        this.otpError.set(describe(failure));
      },
    });
  }

  protected resendOtp(): void {
    const email = this.otpFor();
    if (!email) {
      return;
    }
    this.otpError.set(null);
    this.#auth.resendOtp(email).subscribe({ error: () => undefined });
  }

  protected signInWithGoogle(): void {
    this.busy.set(true);
    this.error.set(null);

    // The demo has no Google to talk to, so the adapter signs in as the Google-linked account.
    this.session.signInWithGoogle('demo-id-token').subscribe({
      next: () => {
        this.busy.set(false);
        void this.#router.navigate(['/hub']);
      },
      error: (failure) => {
        this.busy.set(false);
        this.error.set(describe(failure));
      },
    });
  }

}

/** Turns an RFC 7807 problem into the one sentence a person needs. */
function describe(failure: unknown): string {
  const problem = (failure as { error?: ProblemDetail })?.error;

  if (problem?.violations?.length) {
    return problem.violations[0].message;
  }
  if (problem?.detail) {
    return problem.detail;
  }
  return 'Something went wrong. Try again in a moment.';
}
