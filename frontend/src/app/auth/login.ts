import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { gsap } from 'gsap';
import { finalize } from 'rxjs';

import { MotionService } from '../core/motion';
import { AccessConsoleComponent } from './access-console';
import { AuthService } from './auth.service';
import { LoginRequest } from './loginrequest';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    RouterModule,
    AccessConsoleComponent,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly motion = inject(MotionService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private readonly errorBanner = viewChild<ElementRef<HTMLElement>>('errorBanner');

  readonly hidePassword = signal(true);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly registrationComplete = signal(
    this.route.snapshot.queryParamMap.get('registered') === 'true',
  );

  loginRequest = new LoginRequest();

  constructor() {
    afterNextRender(() => this.playEntrance());

    // A rejected sign-in needs to be *felt*, not just read — the banner arrives
    // with a short lateral shake, which is the one place in the product where
    // motion carries meaning rather than polish.
    effect(() => {
      if (!this.errorMessage()) return;

      requestAnimationFrame(() => {
        const banner = this.errorBanner()?.nativeElement;
        if (!banner) return;

        this.motion
          .timeline()
          .from(banner, { opacity: 0, y: -10, duration: 0.35 })
          .fromTo(
            banner,
            { x: -7 },
            { x: 0, duration: 0.55, ease: 'elastic.out(1, 0.35)' },
            '-=0.15',
          );
      });
    });
  }

  togglePassword(): void {
    this.hidePassword.update((hidden) => !hidden);
  }

  onSubmit(): void {
    if (this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.authService
      .login(this.loginRequest)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmitting.set(false)),
      )
      .subscribe({
        // Both guards redirect here with a `returnUrl`, so send people back to
        // the page they were actually trying to reach.
        next: () => this.router.navigateByUrl(this.returnUrl()),
        error: () =>
          this.errorMessage.set(
            'We could not sign you in. Check your username and password, then try again.',
          ),
      });
  }

  /** The column arrives one element at a time, top to bottom, as it is read. */
  private playEntrance(): void {
    if (!this.motion.enabled()) return;

    const context = gsap.context(() => {
      this.motion
        .timeline({ delay: 0.2 })
        .from('[data-access-stage]', {
          opacity: 0,
          y: 24,
          duration: 0.75,
          stagger: 0.075,
          ease: 'bmGlide',
        })
        .from('.access-console', { opacity: 0, x: 40, duration: 1, ease: 'bmArrive' }, 0.1);
    }, this.host.nativeElement);

    this.destroyRef.onDestroy(() => context.revert());
  }

  private returnUrl(): string {
    const requested = this.route.snapshot.queryParamMap.get('returnUrl');

    // Only ever follow same-origin, in-app paths — never an absolute URL from
    // the query string.
    return requested?.startsWith('/') && !requested.startsWith('//') ? requested : '/main';
  }
}
