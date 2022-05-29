import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { LoginRequest } from './loginrequest';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username!: string;
  password!: string;
  loginRequest: LoginRequest;

  constructor(private route: ActivatedRoute, 
    private router: Router, 
     private authService: AuthService) { 
    this.loginRequest = new LoginRequest();
  }

  onSubmit() {
    this.authService.login(this.loginRequest).subscribe(result => this.gotoUserList());
  }

  gotoUserList() {
    this.router.navigate(['/main']);
  }

}
