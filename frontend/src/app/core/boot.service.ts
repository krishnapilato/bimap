import { Injectable, signal } from '@angular/core';

/**
 * Tracks whether the opening route curtain has finished.
 *
 * The first page a visitor sees spends its opening second behind an opaque
 * curtain. Without this, a landing hero's entrance timeline plays out entirely
 * underneath it and the visitor arrives at a page that has already finished
 * introducing itself. Pages with a staged entrance await {@link whenReady}.
 */
@Injectable({ providedIn: 'root' })
export class BootService {
  private resolve!: () => void;

  private readonly ready = new Promise<void>((resolve) => {
    this.resolve = resolve;
  });

  /** True once the curtain has lifted. */
  readonly isReady = signal(false);

  /** Resolves immediately if the curtain has already lifted. */
  whenReady(): Promise<void> {
    return this.ready;
  }

  /** Called by the app frame when the opening sequence completes. */
  markReady(): void {
    if (this.isReady()) return;

    this.isReady.set(true);
    this.resolve();
  }
}
