import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { LoginRequest } from './loginrequest';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html'
})
export class LoginComponent {
  // Attribute

  loginRequest: LoginRequest;

  // Constructor

  constructor(private router: Router, private authService: AuthService) {
    this.loginRequest = new LoginRequest();
  }

  // On submit event

  onSubmit() {
    this.authService
      .login(this.loginRequest)
      .subscribe(() => this.router.navigate(['/main']));
  }
}