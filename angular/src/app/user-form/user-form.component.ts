import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '../user';
import { UserService } from '../user-service.service';

@Component({
  selector: 'app-user-form',
  templateUrl: './user-form.component.html'
})
export class UserFormComponent {
  // User Object Attribute

  user: User;

  // Constructor

  constructor(private router: Router, private userService: UserService) {
    this.user = new User();
  }

  // On submit event

  onSubmit() {
    this.userService
      .save(this.user)
      .subscribe(() => this.router.navigate(['/listuser']));
  }
}