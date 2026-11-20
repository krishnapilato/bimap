import { Component, ElementRef, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  host: { '(document:click)': 'closeOutside($event)', '(document:keydown.escape)': 'open.set(false)' },
  template: `
    <nav class="relative flex items-center justify-between gap-2">
      <a class="badge badge-soft badge-primary" routerLink="/">BiMap</a>
      <button
        type="button"
        class="btn btn-ghost btn-sm btn-square sm:hidden"
        aria-controls="nav-links"
        [attr.aria-expanded]="open()"
        [attr.aria-label]="open() ? 'Close menu' : 'Open menu'"
        (click)="open.set(!open())"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
          @if (open()) {
            <path stroke-linecap="round" d="M6 6l12 12M18 6L6 18" />
          } @else {
            <path stroke-linecap="round" d="M4 7h16M4 12h16M4 17h16" />
          }
        </svg>
      </button>
      <div
        id="nav-links"
        class="absolute right-0 top-full z-[1100] mt-2 w-48 flex-col gap-1 rounded-box bg-base-100 p-2 shadow-md sm:static sm:z-auto sm:mt-0 sm:flex sm:w-auto sm:flex-row sm:bg-transparent sm:p-0 sm:shadow-none"
        [class.flex]="open()"
        [class.hidden]="!open()"
      >
        <a class="btn btn-ghost btn-sm justify-start" (click)="open.set(false)" routerLink="/assets" routerLinkActive="btn-active" ariaCurrentWhenActive="page">Assets</a>
        <a class="btn btn-ghost btn-sm justify-start" (click)="open.set(false)" routerLink="/street-view" routerLinkActive="btn-active" ariaCurrentWhenActive="page">Street View</a>
        @if (auth.isAdmin()) {
          <a class="btn btn-ghost btn-sm justify-start" (click)="open.set(false)" routerLink="/users" routerLinkActive="btn-active" ariaCurrentWhenActive="page">Users</a>
        }
        <a class="btn btn-ghost btn-sm justify-start" (click)="open.set(false)" routerLink="/logout">Sign out</a>
      </div>
    </nav>
  `,
})
export class Navbar {
  protected readonly auth = inject(AuthService);
  protected readonly open = signal(false);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected closeOutside(event: Event): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.open.set(false);
  }
}
