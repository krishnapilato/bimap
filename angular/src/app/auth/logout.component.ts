import { Component, OnInit } from '@angular/core';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-logout',
  template: '<div></div>'
})
export class LogoutComponent implements OnInit {
  // Constructor

  constructor(private loginService: AuthService) {}

  // On Initialization event

  ngOnInit(): void {
    this.loginService.logout();
  }
}