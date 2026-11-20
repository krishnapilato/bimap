import { linkedSignal, Signal } from '@angular/core';

export function pageIndex(query: Signal<string>, pages: Signal<number>) {
  return linkedSignal<{ query: string; pages: number }, number>({
    source: () => ({ query: query(), pages: pages() }),
    computation: (source, previous) => previous?.source.query === source.query
      ? Math.min(previous.value, Math.max(0, source.pages - 1))
      : 0,
  });
}
