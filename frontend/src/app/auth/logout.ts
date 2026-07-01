import { Location } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { ConfirmationDialogComponent } from '../shared/confirmation-dialog/confirmation-dialog';

@Component({
  selector: 'app-logout',
  standalone: true,
  imports: [MatDialogModule],
  template: '',
})
export class LogoutComponent implements OnInit {
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private location = inject(Location);

  ngOnInit(): void {
    this.dialog
      .open(ConfirmationDialogComponent, {
        data: {
          title: 'Confirm Logout',
          message: 'Are you sure you want to log out of the application?',
          icon: 'logout',
          tone: 'warn',
          confirmText: 'Logout',
          cancelText: 'Stay Signed In',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.authService.logout();
          return;
        }

        if (window.history.length > 1) {
          this.location.back();
        } else {
          this.router.navigate(['/']);
        }
      });
  }
}
