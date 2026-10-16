import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AerialMapComponent } from './aerial-map.component';
import { AuthService } from './auth/auth.service';

@Component({
  selector: 'app-hero',
  imports: [AerialMapComponent, RouterLink],
  template: `
    <main class="grid min-h-dvh bg-base-100 lg:grid-cols-2">
      <section class="z-10 -mt-16 flex flex-col gap-6 px-6 pb-12 sm:px-12 lg:mt-0 lg:justify-center lg:px-16 lg:py-12 xl:px-24">
        <span class="badge badge-soft badge-primary">BiMap</span>
        <h1 class="text-4xl font-semibold leading-tight tracking-tight text-balance sm:text-5xl xl:text-7xl">Italy's heritage, on one map.</h1>
        <p class="max-w-md text-base text-base-content/70 sm:text-lg">
          Find a place, check it in Street View and register its heritage assets in a few clicks.
        </p>
        <div class="flex flex-wrap gap-3">
          @if (auth.isLoggedIn()) {
            <a class="btn btn-primary sm:btn-lg" routerLink="/main">Open the map</a>
          } @else {
            <a class="btn btn-primary sm:btn-lg" routerLink="/login" [queryParams]="{ mode: 'signup' }">Create account</a>
            <a class="btn btn-ghost sm:btn-lg" routerLink="/login">Sign in</a>
          }
        </div>
      </section>
      <section class="relative order-first h-[40svh] max-h-112 min-h-40 mask-b-from-50% lg:order-last lg:h-auto lg:max-h-none lg:mask-b-from-100% lg:mask-l-from-50%">
        <app-aerial-map />
      </section>
    </main>
  `,
})
export class HeroComponent {
  protected readonly auth = inject(AuthService);
}
