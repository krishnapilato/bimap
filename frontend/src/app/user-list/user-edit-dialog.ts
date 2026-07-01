import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { switchMap } from 'rxjs';
import { MatTableDataSource } from '@angular/material/table';
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
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatIconModule,
    MatSelectModule,
  ],
  providers: [UserService],
  templateUrl: './user-edit-dialog.html',
  styleUrls: ['./user-edit-dialog.scss'],
})
export class UserEditDialogComponent {
  private readonly dialog = inject(MatDialog);

  readonly name = new FormControl<string | null>(null);
  readonly surname = new FormControl<string | null>(null);
  readonly email = new FormControl<string | null>(null, [Validators.email]);
  readonly applicationRole = new FormControl<string | null>(null);
  readonly password = new FormControl<string | null>('', [
    Validators.required,
    Validators.minLength(8),
    Validators.maxLength(32),
  ]);

  showPassword = false;

  readonly approles = [
    { value: 'USER', viewValue: 'USER' },
    { value: 'MANAGER', viewValue: 'MANAGER' },
    { value: 'ADMINISTRATOR', viewValue: 'ADMINISTRATOR' },
  ];

  private readonly userService = inject(UserService);
  private readonly dialogRef = inject(MatDialogRef<UserEditDialogComponent>);
  private readonly snackBar = inject(MatSnackBar);

  readonly data = inject<{ user: User; dataSource: MatTableDataSource<User> }>(MAT_DIALOG_DATA);

  readonly userId = this.data.user.id;
  readonly dataSource = this.data.dataSource;

  constructor() {
    const user = this.data.user;

    this.name.setValue(user.name);
    this.surname.setValue(user.surname);
    this.email.setValue(user.email);
    this.applicationRole.setValue(user.applicationRole);
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  cancel(): void {
    this.dialogRef.close();
    this.snackBar.open('Operation cancelled', 'Close', { duration: 2000 });
  }

  update(): void {
    const data: ConfirmationDialogData = {
      title: 'Update User',
      message: 'Are you sure you want to update this record?',
      icon: 'edit',
      tone: 'primary',
      confirmText: 'Update User',
      cancelText: 'Cancel',
    };

    this.dialog.open(ConfirmationDialogComponent, { data }).afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;

      const updatedUser: User = {
        id: this.userId,
        name: this.name.value ?? '',
        surname: this.surname.value ?? '',
        email: this.email.value ?? '',
        applicationRole: this.applicationRole.value ?? '',
        password: this.password.value ?? '',
        userStatus: '',
        created: this.data.user.created,
        lastModified: this.data.user.lastModified,
      };

      this.userService
        .update(updatedUser, this.userId)
        .pipe(switchMap(() => this.userService.findAll()))
        .subscribe({
          next: (rows) => {
            this.dataSource.data = rows;
            this.dialogRef.close();
            this.snackBar.open(`Record with ID ${this.userId} updated successfully`, 'Close', {
              duration: 2000,
            });
          },
          error: (err) => {
            console.error(err);
            this.snackBar.open('Update failed', 'Close', { duration: 3000 });
          },
        });
    });
  }
}