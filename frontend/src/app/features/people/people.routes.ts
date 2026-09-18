import { Routes, UrlMatchResult, UrlSegment } from '@angular/router';

/** `/people` and `/people/:id` share one route, so opening a person keeps the directory in place. */
function directory(segments: UrlSegment[]): UrlMatchResult | null {
  if (segments.length > 1) return null;
  return { consumed: segments, posParams: segments[0] ? { id: segments[0] } : {} };
}

export const PEOPLE_ROUTES: Routes = [
  {
    matcher: directory,
    loadComponent: () => import('./people').then((m) => m.People),
  },
];
