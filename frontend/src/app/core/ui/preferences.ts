import { Injectable, computed, effect, inject, signal } from '@angular/core';

import { Viewport } from './viewport';

export type Density = 'comfortable' | 'compact';
export type MotionPreference = 'system' | 'full' | 'reduced';
export type Basemap = 'road' | 'satellite' | 'hybrid' | 'terrain';
export type MapMode = 'map' | 'split' | 'street';

export interface Preferences {
  density: Density;
  motion: MotionPreference;
  haptics: boolean;
  navCollapsed: boolean;
  basemap: Basemap;
  mapMode: MapMode;
  /** Visible column ids per table, keyed by table schema id. */
  columns: Record<string, string[]>;
}

const STORAGE_KEY = 'bimap.preferences';

const DEFAULTS: Preferences = {
  density: 'comfortable',
  motion: 'system',
  haptics: true,
  navCollapsed: false,
  basemap: 'road',
  mapMode: 'map',
  columns: {},
};

/** Choices that belong to this device rather than to the account, kept in local storage. */
@Injectable({ providedIn: 'root' })
export class PreferencesStore {
  private readonly viewport = inject(Viewport);
  private readonly state = signal<Preferences>({ ...DEFAULTS, ...read() });

  readonly value = this.state.asReadonly();
  readonly density = computed(() => this.state().density);
  readonly haptics = computed(() => this.state().haptics);
  readonly navCollapsed = computed(() => this.state().navCollapsed);
  readonly basemap = computed(() => this.state().basemap);
  readonly mapMode = computed(() => this.state().mapMode);

  /** Whether movement should be kept to a minimum, from the setting or from the system. */
  readonly reducedMotion = computed(() => {
    const choice = this.state().motion;
    return choice === 'reduced' || (choice === 'system' && this.viewport.prefersReducedMotion());
  });

  constructor() {
    effect(() => {
      const preferences = this.state();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      } catch {
        // Preferences simply do not persist when storage is unavailable.
      }
      document.documentElement.dataset['density'] = preferences.density;
    });

    effect(() => document.documentElement.classList.toggle('bm-reduced-motion', this.reducedMotion()));
  }

  set<K extends keyof Preferences>(key: K, value: Preferences[K]): void {
    this.state.update((current) => ({ ...current, [key]: value }));
  }

  columnsFor(tableId: string): string[] | undefined {
    return this.state().columns[tableId];
  }

  setColumns(tableId: string, columns: string[]): void {
    this.state.update((current) => ({ ...current, columns: { ...current.columns, [tableId]: columns } }));
  }
}

function read(): Partial<Preferences> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<Preferences>) : {};
  } catch {
    return {};
  }
}
