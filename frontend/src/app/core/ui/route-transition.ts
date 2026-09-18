import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ViewTransitionInfo } from '@angular/router';

import { PreferencesStore } from './preferences';

/**
 * Marks each navigation as a `route` transition and gives it a direction: going deeper slides the
 * page in from the side, anything else rises in place. Reduced motion skips the transition.
 */
export function routeTransition(info: ViewTransitionInfo): void {
  // Skipped transitions, and ones a hidden tab never runs, reject; the navigation is unaffected.
  info.transition.ready.catch(() => undefined);
  info.transition.finished.catch(() => undefined);

  if (inject(PreferencesStore).reducedMotion()) {
    info.transition.skipTransition();
    return;
  }

  // The same page answering a new address — a filter, a page number, a saved record getting its
  // id — stays put rather than animating as if it were somewhere new.
  if (leaf(info.from).routeConfig === leaf(info.to).routeConfig) {
    info.transition.skipTransition();
    return;
  }

  const from = segments(info.from);
  const to = segments(info.to);

  const types = (info.transition as ViewTransition & { types?: Set<string> }).types;
  if (!types) return;
  types.add('route');
  if (to.length > from.length) types.add('forward');
}

function segments(root: ActivatedRouteSnapshot): string[] {
  const path: string[] = [];
  for (let route: ActivatedRouteSnapshot | null = root; route; route = route.firstChild) {
    path.push(...route.url.map((segment) => segment.path));
  }
  return path;
}

function leaf(root: ActivatedRouteSnapshot): ActivatedRouteSnapshot {
  let route = root;
  while (route.firstChild) route = route.firstChild;
  return route;
}
