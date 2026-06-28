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
  templateUrl: './user-form.html',
  styleUrls: ['./user-form.scss'],
})
export class UserFormComponent {
  user: User;
  emailStatus!: boolean;

  hidePassword = true;

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
