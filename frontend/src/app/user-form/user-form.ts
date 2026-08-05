import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterModule } from '@angular/router';
import { gsap } from 'gsap';

import { BM_MOTION, MotionService } from '../core/motion';
import { AppShellComponent } from '../shared/app-shell/app-shell';
import { PasswordStrengthComponent } from '../shared/password-strength/password-strength';
import { User } from '../user';
import { UserService } from '../user-list/user-service.service';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [
    FormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
    AppShellComponent,
    PasswordStrengthComponent,
    ...BM_MOTION,
  ],
  templateUrl: './user-form.html',
  styleUrl: './user-form.scss',
})
export class UserFormComponent {
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);
  private readonly snackbar = inject(MatSnackBar);
  private readonly motion = inject(MotionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  user = new User();

  readonly emailTaken = signal(false);
  readonly hidePassword = signal(true);
  readonly isSubmitting = signal(false);

  constructor() {
    afterNextRender(() => this.playEntrance());
  }

  /** Preview name, falling back to a placeholder while the form is empty. */
  previewName(): string {
    const full = [this.user.name, this.user.surname].filter(Boolean).join(' ').trim();

    return full || 'New account';
  }

  previewInitials(): string {
    const letters = `${this.user.name?.trim().charAt(0) ?? ''}${
      this.user.surname?.trim().charAt(0) ?? ''
    }`;

    return letters.toUpperCase() || '—';
  }

  private playEntrance(): void {
    if (!this.motion.enabled()) return;

    const context = gsap.context(() => {
      this.motion
        .timeline({ delay: 0.1 })
        .from('[data-stage]', { opacity: 0, y: 24, duration: 0.75, stagger: 0.09, ease: 'bmGlide' })
        .from(
          '.form-body > *',
          { opacity: 0, y: 16, duration: 0.55, stagger: 0.06, ease: 'bmGlide' },
          '-=0.45',
        );
    }, this.host.nativeElement);

    this.destroyRef.onDestroy(() => context.revert());
  }

  togglePasswordVisibility(): void {
    this.hidePassword.update((hidden) => !hidden);
  }

  /** Checks availability on blur so the clash surfaces before submission. */
  onFocusOutEvent(): void {
    const email = this.user.email?.trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.emailTaken.set(false);
      return;
    }

    this.userService.checkIfEmailExists(email).subscribe({
      next: (exists) => this.emailTaken.set(exists),
      error: () => this.emailTaken.set(false),
    });
  }

  onSubmit(): void {
    if (this.isSubmitting()) return;

    this.isSubmitting.set(true);

    // Re-check immediately before writing: the address may have been claimed
    // between the blur check and submission.
    this.userService.checkIfEmailExists(this.user.email).subscribe({
      next: (exists) => {
        if (exists) {
          this.emailTaken.set(true);
          this.isSubmitting.set(false);
          this.snackbar.open('That email is already registered', 'Close', { duration: 3000 });
          return;
        }

        this.userService.save(this.user).subscribe({
          next: () => {
            this.isSubmitting.set(false);
            this.snackbar.open('User created', 'Close', { duration: 2500 });
            this.router.navigate(['/listuser']);
          },
          error: (err) => {
            console.error(err);
            this.isSubmitting.set(false);
            this.snackbar.open('Could not create the user. Please try again.', 'Close', {
              duration: 3000,
            });
          },
        });
      },
      error: (err) => {
        console.error(err);
        this.isSubmitting.set(false);
        this.snackbar.open('Could not verify the email address', 'Close', { duration: 3000 });
      },
    });
  }
}
