import { HttpErrorResponse } from '@angular/common/http';
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
import { Router, RouterModule } from '@angular/router';
import { gsap } from 'gsap';
import { finalize } from 'rxjs';

import { MotionService } from '../core/motion';
import { PasswordStrengthComponent } from '../shared/password-strength/password-strength';
import { User } from '../user';
import { UserService } from '../user-list/user-service.service';
import { AccessConsoleComponent } from './access-console';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    FormsModule,
    RouterModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    AccessConsoleComponent,
    PasswordStrengthComponent,
  ],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class RegisterComponent {
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly motion = inject(MotionService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private readonly errorBanner = viewChild<ElementRef<HTMLElement>>('errorBanner');

  readonly hidePassword = signal(true);
  readonly hideConfirmation = signal(true);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');

  readonly user = new User();
  passwordConfirmation = '';

  constructor() {
    afterNextRender(() => this.playEntrance());

    effect(() => {
      if (!this.errorMessage()) return;

      requestAnimationFrame(() => {
        const banner = this.errorBanner()?.nativeElement;
        if (!banner) return;

        this.motion
          .timeline()
          .from(banner, { opacity: 0, y: -10, duration: 0.35 })
          .fromTo(banner, { x: -7 }, { x: 0, duration: 0.55, ease: 'elastic.out(1, 0.35)' }, '-=0.15');
      });
    });
  }

  get passwordsMatch(): boolean {
    return !!this.user.password && this.user.password === this.passwordConfirmation;
  }

  togglePassword(): void {
    this.hidePassword.update((hidden) => !hidden);
  }

  toggleConfirmation(): void {
    this.hideConfirmation.update((hidden) => !hidden);
  }

  onSubmit(): void {
    if (this.isSubmitting() || !this.passwordsMatch) return;

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.userService
      .save(this.user)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmitting.set(false)),
      )
      .subscribe({
        next: () =>
          this.router.navigate(['/login'], {
            queryParams: { registered: 'true' },
          }),
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            error.status === 409
              ? 'An account already uses this email address.'
              : 'We could not create your account. Check your details and try again.',
          );
        },
      });
  }

  private playEntrance(): void {
    if (!this.motion.enabled()) return;

    const context = gsap.context(() => {
      this.motion
        .timeline({ delay: 0.2 })
        .from('[data-access-stage]', {
          opacity: 0,
          y: 24,
          duration: 0.75,
          stagger: 0.07,
          ease: 'bmGlide',
        })
        .from('.access-console', { opacity: 0, x: 40, duration: 1, ease: 'bmArrive' }, 0.1);
    }, this.host.nativeElement);

    this.destroyRef.onDestroy(() => context.revert());
  }
}
