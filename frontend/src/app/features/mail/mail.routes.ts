import { Routes, UrlMatchResult, UrlSegment } from '@angular/router';

/** `/mail` and `/mail/:id` share one route, so opening a message keeps the log where it was. */
function log(segments: UrlSegment[]): UrlMatchResult | null {
  if (segments.length > 1) return null;
  return { consumed: segments, posParams: segments[0] ? { id: segments[0] } : {} };
}

export const MAIL_ROUTES: Routes = [
  {
    matcher: log,
    loadComponent: () => import('./mail').then((m) => m.Mail),
  },
];
