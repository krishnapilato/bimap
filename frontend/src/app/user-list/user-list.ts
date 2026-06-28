import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, DestroyRef, inject, Inject, OnInit, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, ReactiveFormsModule, UntypedFormControl } from '@angular/forms';
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

  public whatUser!: LoginResponse;

  readonly paginator = viewChild(MatPaginator);
  readonly sort = viewChild(MatSort);

  ngOnInit(): void {
    this.whatUser = this.authService.loginResponseValue;

    this.userService
      .findAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((users: User[]) => {
        this.dataSource.data = users;
      });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator()!;
    this.dataSource.sort = this.sort()!;
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
    const dialogRef = this.dialog.open(EditingEmailDialog);

    dialogRef.componentInstance.globalEmail = email;
  }

  send(email: string): void {
    this.openEmailDialog(email);
  }

  deleteRow(user: User): void {
    if (!confirm('Are you sure you want to delete this record?')) {
      this.snackBar.open('Operation cancelled', 'Close', {
        duration: 2000,
      });
      return;
    }

    this.userService
      .delete(user.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.dataSource.data = this.dataSource.data.filter((u) => u.id !== user.id);

        this.snackBar.open('Record deleted successfully', '', {
          duration: 2000,
        });
      });
  }
}

@Component({
  selector: 'dialog-elements',
  templateUrl: 'dialog-elements.html',
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
  // Declare controls but initialize them in the constructor with injected data
  public surname: UntypedFormControl;
  public name: UntypedFormControl;
  public email: UntypedFormControl;
  public applicationRole: UntypedFormControl;
  public password: UntypedFormControl;

  public globalID!: number;
  public globalDataSource!: MatTableDataSource<User>;

  private newUser: User = new User();

  approles: any[] = [
    { value: 'USER', viewValue: 'USER' },
    { value: 'MANAGER', viewValue: 'MANAGER' },
    { value: 'ADMINISTRATOR', viewValue: 'ADMINISTRATOR' },
  ];

  constructor(
    private userService: UserService,
    public dialogRef: MatDialogRef<DialogElementsExampleDialog>, // Inject DialogRef
    @Inject(MAT_DIALOG_DATA) public data: any, // Inject Passed Data
    private _snackbar: MatSnackBar,
  ) {
    // 1. Assign the global variables from the injected data
    this.globalID = this.data.user.id;
    this.globalDataSource = this.data.dataSource;

    // 2. Precompile the form values using the injected user data
    this.name = new UntypedFormControl(this.data.user.name);
    this.surname = new UntypedFormControl(this.data.user.surname);
    this.email = new UntypedFormControl(this.data.user.email);
    this.applicationRole = new UntypedFormControl(this.data.user.applicationRole);
    this.password = new UntypedFormControl('');
  }

  cancel(): void {
    this.dialogRef.close(); // Only close this specific dialog
    this._snackbar.open('Operation cancelled', 'Close', { duration: 2000 });
  }

  onNoClick(event: any): void {
    if (confirm('Are you sure to update this record?')) {
      this.newUser.name = this.name.value;
      this.newUser.surname = this.surname.value;
      this.newUser.email = this.email.value;
      this.newUser.applicationRole = this.applicationRole.value;
      this.newUser.password = this.password.value;

      this.userService.update(this.newUser, this.globalID).subscribe(() => {
        this.userService.findAll().subscribe((data) => {
          this.globalDataSource.data = data;
        });

        this.dialogRef.close(); // Only close this specific dialog

        this._snackbar.open('Record with ID ' + this.globalID + ' updated successfully', '', {
          duration: 2000,
        });
      });
    } else {
      this.dialogRef.close();
      this._snackbar.open('Operation cancelled', 'Close', { duration: 2000 });
    }
  }
}

@Component({
  selector: 'editing-email',
  templateUrl: 'editing-email.html',
  styles: [
    `
      /* Container Layout */
      .dialog-container {
        width: 100%;
        max-width: 400px; /* Ensures the dialog doesn't stretch too wide on desktop */
        padding: 32px 24px;
        box-sizing: border-box;
        text-align: center;
        font-family: 'Roboto', 'Helvetica Neue', sans-serif;
        background-color: #ffffff;
      }

      /* -----------------------------
   HEADER & ICON
------------------------------ */
      .dialog-header {
        margin-bottom: 24px;
      }

      .icon-wrapper {
        display: inline-flex;
        justify-content: center;
        align-items: center;
        width: 64px;
        height: 64px;
        background-color: #eef2ff; /* Soft primary tint */
        border-radius: 50%;
        margin-bottom: 16px;
      }

      .icon-wrapper mat-icon {
        transform: scale(1.3);
      }

      .dialog-title {
        margin: 0;
        font-size: 22px;
        font-weight: 600;
        color: #1e293b;
        letter-spacing: -0.5px;
      }

      /* -----------------------------
   BODY & TEXT
------------------------------ */
      .dialog-body {
        margin-bottom: 32px;
      }

      .dialog-message {
        margin: 0 0 16px 0;
        font-size: 15px;
        color: #64748b;
        line-height: 1.5;
      }

      /* Highlighting the target email */
      .email-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        font-weight: 500;
        color: #334155;
        font-size: 15px;
        word-break: break-all; /* Prevents long emails from breaking the layout */
      }

      .badge-icon {
        font-size: 18px;
        height: 18px;
        width: 18px;
        color: #94a3b8;
      }

      /* -----------------------------
   BUTTON ACTIONS
------------------------------ */
      .dialog-actions {
        display: flex;
        justify-content: center;
        gap: 16px;
      }

      .action-btn {
        height: 48px;
        border-radius: 8px;
        padding: 0 24px;
        font-weight: 600;
        font-size: 15px;
        letter-spacing: 0.5px;
        flex: 1; /* Makes buttons equal width */
      }

      .cancel-btn {
        color: #64748b;
        border-color: #cbd5e1;
      }

      .send-btn mat-icon {
        margin-right: 6px;
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      /* -----------------------------
   RESPONSIVE (MOBILE)
------------------------------ */
      @media (max-width: 400px) {
        .dialog-actions {
          flex-direction: column-reverse; /* Puts primary action on top for mobile */
          gap: 12px;
        }
        .action-btn {
          width: 100%;
        }
      }
    `,
  ],
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
  public globalEmail!: string;

  constructor(
    private userService: UserService,
    public dialog: MatDialog,
    private _snackbar: MatSnackBar,
  ) {}

  public send(): void {
    this.dialog.closeAll();
    this._snackbar.open('Trying to send email to ' + this.globalEmail, 'Close', {
      duration: 1000,
    });
    this.userService.sendEmail(this.globalEmail).subscribe({
      next: (data) => {
        this._snackbar.open('Email sent successfully to ' + this.globalEmail, 'Close', {
          duration: 2000,
        });
      },
      error: (err) => {
        console.error('Error sending email:', err);
        this._snackbar.open('Error sending email to ' + this.globalEmail, 'Close', {
          duration: 3000,
        });
      },
    });
  }

  cancel() {
    this.dialog.closeAll();
    this._snackbar.open('Operation cancelled', 'Close', { duration: 2000 });
  }
}
