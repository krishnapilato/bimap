import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { switchMap } from 'rxjs';

import { User } from '../user';
import {
  ConfirmationDialogComponent,
  ConfirmationDialogData,
} from '../shared/confirmation-dialog/confirmation-dialog';
import { UserService } from './user-service.service';

@Component({
  selector: 'app-user-edit-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
  ],
  templateUrl: './user-edit-dialog.html',
  styleUrl: './user-edit-dialog.scss',
})
export class UserEditDialogComponent {
  private readonly dialog = inject(MatDialog);
  private readonly userService = inject(UserService);
  private readonly dialogRef = inject(MatDialogRef<UserEditDialogComponent>);
  private readonly snackBar = inject(MatSnackBar);

  readonly data = inject<{ user: User; dataSource: MatTableDataSource<User> }>(MAT_DIALOG_DATA);

  readonly userId = this.data.user.id;
  readonly dataSource = this.data.dataSource;

  readonly name = new FormControl<string | null>(null, [Validators.required]);
  readonly surname = new FormControl<string | null>(null, [Validators.required]);
  readonly email = new FormControl<string | null>(null, [Validators.required, Validators.email]);
  readonly applicationRole = new FormControl<string | null>(null, [Validators.required]);
  readonly password = new FormControl<string | null>('', [
    Validators.required,
    Validators.minLength(8),
    Validators.maxLength(32),
  ]);

  readonly showPassword = signal(false);
  readonly isSaving = signal(false);

  readonly approles = [
    { value: 'USER', viewValue: 'User' },
    { value: 'MANAGER', viewValue: 'Manager' },
    { value: 'ADMINISTRATOR', viewValue: 'Administrator' },
  ];

  constructor() {
    const user = this.data.user;

    this.name.setValue(user.name);
    this.surname.setValue(user.surname);
    this.email.setValue(user.email);
    this.applicationRole.setValue(user.applicationRole);
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((shown) => !shown);
  }

  cancel(): void {
    this.dialogRef.close();
  }

  update(): void {
    if (this.isSaving()) return;

    const data: ConfirmationDialogData = {
      title: 'Update user',
      message: 'Save these changes to the account?',
      detailsLabel: 'Account',
      details: this.email.value ?? '',
      icon: 'edit',
      tone: 'primary',
      confirmText: 'Save changes',
      cancelText: 'Cancel',
    };

    this.dialog
      .open(ConfirmationDialogComponent, { data })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;

        const updatedUser: User = {
          id: this.userId,
          name: this.name.value ?? '',
          surname: this.surname.value ?? '',
          email: this.email.value ?? '',
          applicationRole: this.applicationRole.value ?? '',
          password: this.password.value ?? '',
          // Preserve the existing status — an edit here must not silently
          // reset whether the account has been confirmed.
          userStatus: this.data.user.userStatus,
          created: this.data.user.created,
          lastModified: this.data.user.lastModified,
        };

        this.isSaving.set(true);

        this.userService
          .update(updatedUser, this.userId)
          .pipe(switchMap(() => this.userService.findAll()))
          .subscribe({
            next: (rows) => {
              this.isSaving.set(false);
              this.dataSource.data = rows;
              this.dialogRef.close();
              this.snackBar.open('User updated', 'Close', { duration: 2500 });
            },
            error: (err) => {
              console.error(err);
              this.isSaving.set(false);
              this.snackBar.open('Update failed', 'Close', { duration: 3000 });
            },
          });
      });
  }
}
