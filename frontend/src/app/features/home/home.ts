import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { LandmarkGallery } from '../../shared/landmark-gallery';

@Component({
  selector: 'app-home',
  imports: [LandmarkGallery, RouterLink],
  template: `
    <main class="grid min-h-dvh bg-base-100 lg:grid-cols-2">
      <section class="z-10 flex flex-col gap-6 px-6 py-10 sm:px-12 lg:mt-0 lg:justify-center lg:px-16 lg:py-12 xl:px-24">
        <span class="badge badge-soft badge-primary">BiMap</span>
        <h1 class="text-4xl font-semibold leading-tight tracking-tight text-balance sm:text-5xl xl:text-7xl">Italy's heritage, on one map.</h1>
        <p class="max-w-md text-base text-base-content/70 sm:text-lg">
          Find a place, check it in Street View and register its heritage assets in a few clicks.
        </p>
        <div class="flex flex-wrap gap-3">
          @if (auth.isLoggedIn()) {
            <a class="btn btn-primary sm:btn-lg" routerLink="/assets">Open the map</a>
          } @else {
            <a class="btn btn-primary sm:btn-lg" routerLink="/login" [queryParams]="{ mode: 'signup' }">Create account</a>
            <a class="btn btn-ghost sm:btn-lg" routerLink="/login">Sign in</a>
          }
        </div>
      </section>
      <section class="relative order-first h-[44svh] min-h-72 lg:order-last lg:h-auto lg:min-h-dvh">
        <app-landmark-gallery />
      </section>
    </main>
  `,
})
export class Home {
  protected readonly auth = inject(AuthService);
}
