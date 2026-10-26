import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { environment } from '../../environments/environment';
import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <a class="badge badge-soft badge-primary" routerLink="/">BiMap</a>
        @if (demo) {
          <span class="badge badge-soft badge-warning">Demo data</span>
        }
      </div>
      <div class="flex flex-wrap justify-end gap-1">
        <a class="btn btn-ghost btn-sm" routerLink="/assets" routerLinkActive="btn-active">Assets</a>
        <a class="btn btn-ghost btn-sm" routerLink="/street-view" routerLinkActive="btn-active">Street View</a>
        @if (auth.isAdmin()) {
          <a class="btn btn-ghost btn-sm" routerLink="/users" routerLinkActive="btn-active">Users</a>
        }
        <a class="btn btn-ghost btn-sm" routerLink="/logout">Sign out</a>
      </div>
    </nav>
  `,
})
export class Navbar {
  protected readonly auth = inject(AuthService);
  protected readonly demo = environment.demo;
}
