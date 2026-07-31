import { TitleCasePipe } from '@angular/common';
import { AfterViewInit, Component, DestroyRef, OnInit, inject, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';

import { AppShellComponent } from '../shared/app-shell/app-shell';
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
    TitleCasePipe,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatDialogModule,
    AppShellComponent,
  ],
  templateUrl: './user-list.html',
  styleUrl: './user-list.scss',
})
export class UserListComponent implements OnInit, AfterViewInit {
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

  readonly paginator = viewChild(MatPaginator);
  readonly sort = viewChild(MatSort);

  get totalUsersCount(): number {
    return this.dataSource.data.length;
  }

  get activeUsersCount(): number {
    return this.dataSource.data.filter((user) => user.userStatus?.toLowerCase() === 'confirmed')
      .length;
  }

  get adminUsersCount(): number {
    return this.dataSource.data.filter(
      (user) => user.applicationRole?.toLowerCase() === 'administrator',
    ).length;
  }

  ngOnInit(): void {
    this.userService
      .findAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((users) => (this.dataSource.data = users));
  }

  ngAfterViewInit(): void {
    const paginator = this.paginator();
    const sort = this.sort();

    if (paginator) this.dataSource.paginator = paginator;
    if (sort) this.dataSource.sort = sort;
  }

  applyFilter(event: Event): void {
    this.dataSource.filter = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.dataSource.paginator?.firstPage();
  }

  /** Maps a backend status onto one of the shared chip variants. */
  statusChipClass(status: string | null | undefined): string {
    switch ((status || '').trim().toLowerCase()) {
      case 'confirmed':
      case 'active':
        return 'bm-chip--success';
      case 'pending':
        return 'bm-chip--warning';
      case 'not_confirmed':
      case 'notconfirmed':
      case 'inactive':
        return 'bm-chip--danger';
      default:
        return 'bm-chip--plain';
    }
  }

  formatStatus(status: string | null | undefined): string {
    return (status || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  openEditDialog(user: User): void {
    this.dialog.open(UserEditDialogComponent, {
      data: { user, dataSource: this.dataSource },
    });
  }

  confirmSendEmail(email: string): void {
    const data: ConfirmationDialogData = {
      title: 'Send confirmation email',
      message: 'Send the account confirmation email to this address?',
      detailsLabel: 'Email address',
      details: email,
      icon: 'mark_email_unread',
      tone: 'primary',
      confirmText: 'Send email',
      cancelText: 'Cancel',
    };

    this.dialog
      .open(ConfirmationDialogComponent, { data })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.userService.sendEmail(email).subscribe({
          next: () => this.snackBar.open(`Email sent to ${email}`, 'Close', { duration: 2500 }),
          error: (err) => {
            console.error('Error sending email:', err);
            this.snackBar.open(`Could not send email to ${email}`, 'Close', { duration: 3000 });
          },
        });
      });
  }

  confirmDeleteUser(user: User): void {
    const data: ConfirmationDialogData = {
      title: 'Delete user',
      message: 'This permanently removes the account and its access.',
      detailsLabel: 'Account',
      details: `${user.name} ${user.surname} · ${user.email}`,
      icon: 'delete',
      tone: 'warn',
      confirmText: 'Delete user',
      cancelText: 'Cancel',
    };

    this.dialog
      .open(ConfirmationDialogComponent, { data })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.userService
          .delete(user.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.dataSource.data = this.dataSource.data.filter((u) => u.id !== user.id);
              this.snackBar.open('User deleted', 'Close', { duration: 2500 });
            },
            error: (err) => {
              console.error(err);
              this.snackBar.open('Delete failed', 'Close', { duration: 3000 });
            },
          });
      });
  }
}
