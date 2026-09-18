import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewEncapsulation,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { DEMO_CONTROLS } from '../../core/app-mode';

interface Scene {
  landmark: string;
  place: string;
  region: string;
  lat: number;
  lng: number;
}

interface Frame {
  key: string;
  scene: Scene;
  tiles: string[];
  /** Where the landmark falls inside the tile grid, in pixels. */
  focus: { x: number; y: number };
}

/** Places a surveyor might stand in front of, seen from above. */
const SCENES: readonly Scene[] = [
  { landmark: 'Santa Maria del Fiore', place: 'Firenze', region: 'Toscana', lat: 43.77314, lng: 11.25597 },
  { landmark: 'Piazza San Marco', place: 'Venezia', region: 'Veneto', lat: 45.43419, lng: 12.33902 },
  { landmark: 'Colosseo', place: 'Roma', region: 'Lazio', lat: 41.89021, lng: 12.49223 },
  { landmark: 'Sassi di Matera', place: 'Matera', region: 'Basilicata', lat: 40.66647, lng: 16.61093 },
  { landmark: 'Reggia di Caserta', place: 'Caserta', region: 'Campania', lat: 41.07325, lng: 14.32714 },
];

const ZOOM = 17;
const GRID = 4;
const DWELL = 9000;

/**
 * The frame around signing in, signing up and recovering an account: the form on one side, and
 * on the other the kind of place the product is for, drifting slowly under satellite light.
 */
@Component({
  selector: 'bm-auth-layout',
  imports: [RouterOutlet],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'bm-auth' },
})
export class AuthLayout {
  protected readonly demo = inject(DEMO_CONTROLS, { optional: true });
  protected readonly year = new Date().getFullYear();

  private readonly index = signal(Math.floor(Math.random() * SCENES.length));
  protected readonly frame = computed(() => frameOf(SCENES[this.index()]));
  protected readonly scenes = SCENES;
  protected readonly current = this.index.asReadonly();

  constructor() {
    const timer = setInterval(() => void this.advance(), DWELL);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
    void preload(frameOf(SCENES[(this.index() + 1) % SCENES.length]));
  }

  protected formatCoordinate(value: number): string {
    return value.toFixed(5);
  }

  /** Moves on only once the next place has downloaded, so the crossfade never shows empty tiles. */
  private async advance(): Promise<void> {
    if (document.hidden) return;
    const next = (this.index() + 1) % SCENES.length;
    await preload(frameOf(SCENES[next]));
    this.index.set(next);
    void preload(frameOf(SCENES[(next + 1) % SCENES.length]));
  }
}

function frameOf(scene: Scene): Frame {
  const n = 2 ** ZOOM;
  const x = ((scene.lng + 180) / 360) * n;
  const latitude = (scene.lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(latitude) + 1 / Math.cos(latitude)) / Math.PI) / 2) * n;
  const left = Math.floor(x) - GRID / 2;
  const top = Math.floor(y) - GRID / 2;

  const tiles: string[] = [];
  for (let row = 0; row < GRID; row++) {
    for (let column = 0; column < GRID; column++) {
      tiles.push(`https://mt${(row + column) % 4}.google.com/vt/lyrs=s&x=${left + column}&y=${top + row}&z=${ZOOM}`);
    }
  }
  return { key: scene.place, scene, tiles, focus: { x: (x - left) * 256, y: (y - top) * 256 } };
}

function preload(frame: Frame): Promise<void> {
  const loads = frame.tiles.map(
    (src) =>
      new Promise<void>((resolve) => {
        const image = new Image();
        image.onload = image.onerror = () => resolve();
        image.src = src;
      }),
  );
  return Promise.race([Promise.all(loads).then(() => undefined), new Promise<void>((resolve) => setTimeout(resolve, 4000))]);
}
