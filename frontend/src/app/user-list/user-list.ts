import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  inject,
  OnInit,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { LoginResponse } from '../auth/loginresponse';
import { User } from '../user';
import {
  ConfirmationDialogComponent,
  ConfirmationDialogData,
} from '../shared/confirmation-dialog/confirmation-dialog';
import { UserEditDialogComponent } from './user-edit-dialog';
import { UserService } from './user-service.service';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,

    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatDialogModule,
  ],
  templateUrl: './user-list.html',
  styleUrls: ['./user-list.scss'],
  providers: [UserService],
})
export class UserListComponent implements OnInit, AfterViewInit {
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  readonly displayedColumns = [
    'name',
    'surname',
    'email',
    'userStatus',
    'applicationRole',
    'actions',
  ] as const;

  readonly dataSource = new MatTableDataSource<User>();

  whatUser!: LoginResponse;

  readonly paginator = viewChild(MatPaginator);
  readonly sort = viewChild(MatSort);

  get totalUsersCount(): number {
    return this.dataSource.data.length;
  }

  get filteredUsersCount(): number {
    return this.dataSource.filteredData.length;
  }

  get activeUsersCount(): number {
    return this.dataSource.data.filter((user) => user.userStatus?.toLowerCase() === 'active').length;
  }

  get adminUsersCount(): number {
    return this.dataSource.data.filter(
      (user) => user.applicationRole?.toLowerCase() === 'administrator',
    ).length;
  }

  ngOnInit(): void {
    this.whatUser = this.authService.loginResponseValue;

    this.userService
      .findAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((users) => {
        this.dataSource.data = users;
      });
  }

  ngAfterViewInit(): void {
    const paginator = this.paginator();
    const sort = this.sort();

    if (paginator) this.dataSource.paginator = paginator;
    if (sort) this.dataSource.sort = sort;
  }

  applyFilter(event: Event): void {
    const value = (event.target as HTMLInputElement).value;

    this.dataSource.filter = value.trim().toLowerCase();
    this.dataSource.paginator?.firstPage();
  }

  getInitials(user: User): string {
    const first = user.name?.trim().charAt(0) ?? '';
    const last = user.surname?.trim().charAt(0) ?? '';

    return `${first}${last}`.toUpperCase() || 'U';
  }

  openEditDialog(user: User): void {
    this.dialog.open(UserEditDialogComponent, {
      data: {
        user,
        dataSource: this.dataSource,
      },
    });
  }

  confirmSendEmail(email: string): void {
    const data: ConfirmationDialogData = {
      title: 'Send Confirmation Email',
      message: 'Are you sure you want to send the confirmation email to this address?',
      detailsLabel: 'Email address',
      details: email,
      icon: 'mark_email_unread',
      tone: 'primary',
      confirmText: 'Send Email',
      cancelText: 'Cancel',
    };

    this.dialog.open(ConfirmationDialogComponent, { data }).afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        this.snackBar.open('Operation cancelled', 'Close', { duration: 2000 });
        return;
      }

      this.snackBar.open(`Sending email to ${email}...`, 'Close', { duration: 1000 });

      this.userService.sendEmail(email).subscribe({
        next: () => {
          this.snackBar.open(`Email sent successfully to ${email}`, 'Close', {
            duration: 2000,
          });
        },
        error: (err) => {
          console.error('Error sending email:', err);

          this.snackBar.open(`Error sending email to ${email}`, 'Close', {
            duration: 3000,
          });
        },
      });
    });
  }

  confirmDeleteUser(user: User): void {
    const data: ConfirmationDialogData = {
      title: 'Delete User',
      message: 'Are you sure you want to delete this record?',
      icon: 'delete',
      tone: 'warn',
      confirmText: 'Delete User',
      cancelText: 'Cancel',
    };

    this.dialog.open(ConfirmationDialogComponent, { data }).afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        this.snackBar.open('Operation cancelled', 'Close', { duration: 2000 });
        return;
      }

      this.userService
        .delete(user.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.dataSource.data = this.dataSource.data.filter((u) => u.id !== user.id);

            this.snackBar.open('Record deleted successfully', 'Close', {
              duration: 2000,
            });
          },
          error: (err) => {
            console.error(err);

            this.snackBar.open('Delete failed', 'Close', {
              duration: 3000,
            });
          },
        });
    });
  }
}
