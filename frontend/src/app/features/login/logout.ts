import { Component, inject, OnInit } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-logout',
  template: '',
})
export class Logout implements OnInit {
  private readonly authService = inject(AuthService);

  ngOnInit(): void {
    this.authService.logout();
  }
}
