import { Component, OnInit } from '@angular/core';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-logout',
  template: '<div></div>'
})
export class LogoutComponent implements OnInit {
  constructor(private loginService: AuthService) {}

  ngOnInit(): void {
    this.loginService.logout();
  }
}