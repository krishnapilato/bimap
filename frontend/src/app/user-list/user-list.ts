import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  inject,
  Inject,
  OnInit,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { switchMap } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { LoginResponse } from '../auth/loginresponse';
import { User } from '../user';
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

  openDialog(user: User): void {
    this.dialog.open(DialogElementsExampleDialog, {
      data: {
        user,
        dataSource: this.dataSource,
      },
    });
  }

  openEmailDialog(email: string): void {
    this.dialog.open(EditingEmailDialog, {
      data: { email },
    });
  }

  deleteRow(user: User): void {
    const confirmed = confirm('Are you sure you want to delete this record?');
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
  }
}

@Component({
  selector: 'dialog-elements',
  templateUrl: 'dialog-elements.html',
  styleUrls: ['editing-email.scss'],
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    FormsModule,
    MatTooltipModule,
    MatIconModule,
    MatSelectModule,
    ReactiveFormsModule,
    CommonModule,
    RouterModule,
    MatDialogModule,
  ],
  standalone: true,
  providers: [UserService],
})
export class DialogElementsExampleDialog {
  name = new FormControl<string | null>(null);
  surname = new FormControl<string | null>(null);
  email = new FormControl<string | null>(null, [Validators.email]);
  applicationRole = new FormControl<string | null>(null);
  password = new FormControl<string | null>('', [
    Validators.required,
    Validators.minLength(8),
    Validators.maxLength(32),
  ]);

  showPassword = false;

  globalID!: number;
  globalDataSource!: MatTableDataSource<User>;

  approles = [
    { value: 'USER', viewValue: 'USER' },
    { value: 'MANAGER', viewValue: 'MANAGER' },
    { value: 'ADMINISTRATOR', viewValue: 'ADMINISTRATOR' },
  ];

  constructor(
    private userService: UserService,
    private dialogRef: MatDialogRef<DialogElementsExampleDialog>,
    @Inject(MAT_DIALOG_DATA)
    public data: { user: User; dataSource: MatTableDataSource<User> },
    private snackBar: MatSnackBar,
  ) {
    const user = data.user;

    this.globalID = user.id;
    this.globalDataSource = data.dataSource;

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
    const confirmUpdate = confirm('Are you sure you want to update this record?');
    if (!confirmUpdate) return;

    const updatedUser: User = {
      id: this.globalID,
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
      .update(updatedUser, this.globalID)
      .pipe(switchMap(() => this.userService.findAll()))
      .subscribe({
        next: (data) => {
          this.globalDataSource.data = data;

          this.dialogRef.close();

          this.snackBar.open(`Record with ID ${this.globalID} updated successfully`, 'Close', {
            duration: 2000,
          });
        },
        error: (err) => {
          console.error(err);

          this.snackBar.open('Update failed', 'Close', { duration: 3000 });
        },
      });
  }
}

@Component({
  selector: 'editing-email',
  templateUrl: 'editing-email.html',
  styleUrls: ['editing-email.scss'],
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    FormsModule,
    MatTooltipModule,
    MatIconModule,
    MatSelectModule,
    MatIconModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    CommonModule,
    RouterModule,
  ],
  providers: [UserService],
})
export class EditingEmailDialog {
  private readonly data = inject<{ email: string }>(MAT_DIALOG_DATA);
  public globalEmail = this.data.email;

  private readonly userService = inject(UserService);
  private readonly dialogRef = inject(MatDialogRef<EditingEmailDialog>);
  private readonly snackBar = inject(MatSnackBar);

  send(): void {
    console.log(`Sending email to ${this.globalEmail}...`);
    this.snackBar.open(`Sending email to ${this.globalEmail}...`, 'Close', { duration: 1000 });

    this.userService.sendEmail(this.globalEmail).subscribe({
      next: () => {
        this.snackBar.open(`Email sent successfully to ${this.globalEmail}`, 'Close', {
          duration: 2000,
        });
        this.dialogRef.close(true);
      },
      error: (err) => {
        console.error('Error sending email:', err);

        this.snackBar.open(`Error sending email to ${this.globalEmail}`, 'Close', {
          duration: 3000,
        });
        this.dialogRef.close(true);
      },
    });
  }

  cancel(): void {
    this.dialogRef.close(false);

    this.snackBar.open('Operation cancelled', 'Close', {
      duration: 2000,
    });
  }
}
