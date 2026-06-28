import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterModule } from '@angular/router';
import { User } from '../user';
import { UserService } from '../user-list/user-service.service';

@Component({
  selector: 'app-user-form',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    FormsModule,
    MatTooltipModule,
    MatIconModule,
    CommonModule,
    RouterModule,
  ],
  providers: [UserService],
  templateUrl: './user-form.component.html',
  styles: [
    `
      /* GLOBAL RESETS */
      :host {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        background-color: #f4f7f9;
        font-family: 'Roboto', 'Helvetica Neue', sans-serif;
      }

      .text-primary {
        color: #3f51b5;
      }
      .spacer {
        flex: 1 1 auto;
      }
      .w-100 {
        width: 100%;
      }

      /* -----------------------------
   APP HEADER
------------------------------ */
      .app-header {
        display: flex;
        align-items: center;
        padding: 0 24px;
        height: 64px;
        background: #ffffff;
        border-bottom: 1px solid #e2e8f0;
        z-index: 10;
      }

      .brand-container {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .brand-logo {
        font-size: 28px;
        height: 28px;
        width: 28px;
      }
      .brand-title {
        font-size: 20px;
        font-weight: 700;
        letter-spacing: -0.5px;
        color: #1e293b;
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .divider {
        width: 1px;
        height: 24px;
        background-color: #cbd5e1;
        margin: 0 8px;
      }

      .logout-btn {
        border-radius: 20px;
      }

      /* -----------------------------
   FOCUS WORKSPACE & CARD
------------------------------ */
      .focus-workspace {
        flex: 1;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        padding: 48px 24px;
      }

      .form-card {
        width: 100%;
        max-width: 520px;
        background-color: #ffffff;
        border-radius: 16px;
        border: 1px solid #f1f5f9;
        padding: 40px;
        box-sizing: border-box;
      }

      /* -----------------------------
   FORM HEADER
------------------------------ */
      .form-header {
        text-align: center;
        margin-bottom: 32px;
      }

      .icon-wrapper {
        display: inline-flex;
        justify-content: center;
        align-items: center;
        width: 56px;
        height: 56px;
        background-color: #eef2ff;
        border-radius: 50%;
        margin-bottom: 16px;
      }
      .icon-wrapper mat-icon {
        transform: scale(1.2);
      }

      .form-header h1 {
        margin: 0;
        font-size: 24px;
        font-weight: 600;
        color: #1e293b;
      }

      .form-header p {
        margin: 8px 0 0;
        color: #64748b;
        font-size: 15px;
      }

      /* -----------------------------
   MODERN FORM STYLES
------------------------------ */
      .modern-form {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .form-row {
        display: flex;
        gap: 16px;
      }

      /* Remove bottom padding on Angular Material fields to tighten spacing */
      .modern-form ::ng-deep .mat-mdc-form-field-subscript-wrapper {
        margin-bottom: -16px; /* Adjust based on material version */
      }

      .field-icon {
        color: #94a3b8 !important;
        margin-right: 8px;
      }

      /* Custom Email Error Styling */
      .email-group {
        display: flex;
        flex-direction: column;
      }

      .has-error ::ng-deep .mat-mdc-text-field-wrapper {
        border: 1px solid #ef4444; /* Subtle red border when duplicate is found */
        border-radius: 4px;
      }

      .custom-error {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #ef4444;
        font-size: 13px;
        font-weight: 500;
        margin-top: 4px;
        padding-left: 16px;
      }
      .custom-error mat-icon {
        font-size: 16px;
        height: 16px;
        width: 16px;
      }

      /* -----------------------------
   BUTTONS
------------------------------ */
      .submit-btn {
        height: 52px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 16px;
        margin-top: 16px;
        letter-spacing: 0.5px;
      }

      /* -----------------------------
   RESPONSIVE (MOBILE)
------------------------------ */
      @media (max-width: 600px) {
        .focus-workspace {
          padding: 24px 16px;
        }
        .form-card {
          padding: 24px;
        }
        .form-row {
          flex-direction: column;
          gap: 20px;
        }
        .hide-on-mobile {
          display: none;
        }
      }
    `,
  ],
})
export class UserFormComponent {
  user: User;
  emailStatus!: boolean;

  hidePassword = true; // Default to hidden

  // Add this method
  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  constructor(
    private router: Router,
    private userService: UserService,
    private _snackbar: MatSnackBar,
  ) {
    this.user = new User();
  }

  ngOnInit() {
    this.userService
      .checkIfEmailExists(this.user.email)
      .subscribe((data) => (this.emailStatus = data));
  }

  onFocusOutEvent(): void {
    this.userService
      .checkIfEmailExists(this.user.email)
      .subscribe((data) => (this.emailStatus = data));
    console.log('' + this.emailStatus);
  }

  onSubmit(): void {
    this.userService.save(this.user).subscribe({
      next: () => {
        this.router.navigate(['/listuser']);
      },
      error: (err) => {
        console.log(err);
        this._snackbar.open("Can't save new user: retry!", 'Close', {
          duration: 3000,
        });
      },
    });
  }
}
