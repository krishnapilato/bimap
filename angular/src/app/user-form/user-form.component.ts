import { Component } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { User } from '../user';
import { UserService } from '../user-service.service';

@Component({
  selector: 'app-user-form',
  templateUrl: './user-form.component.html',
})
export class UserFormComponent {
  user: User;
  emailStatus!: boolean;

  constructor(
    private router: Router,
    private userService: UserService,
    private _snackbar: MatSnackBar
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
