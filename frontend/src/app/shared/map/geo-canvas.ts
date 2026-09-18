import { CdkMenu, CdkMenuItem, CdkMenuItemCheckbox, CdkMenuItemRadio, CdkMenuTrigger } from '@angular/cdk/menu';
import {
  ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { toast } from 'ngx-sonner';

import { copyToClipboard } from '../../core/ui/files';
import { Haptics } from '../../core/ui/haptics';
import { Immersive } from '../../core/ui/immersive';
import { Basemap, MapMode, PreferencesStore } from '../../core/ui/preferences';
import { bindShortcuts } from '../../core/ui/shortcuts';
import { Viewport } from '../../core/ui/viewport';
import { Button } from '../../ui/button/button';
import { SegmentOption, Segmented } from '../../ui/form/segmented';
import { Icon } from '../../ui/icon/icon';
import { Ripple } from '../../ui/interaction/ripple';
import { Tooltip } from '../../ui/tooltip/tooltip';
import { BASEMAPS, basemapPreview } from './basemaps';
import { ITALY, Insets, LatLng, MapPoint, MapView, NO_INSETS, ZOOM, distance, formatDistance, formatPosition } from './geo';
import { GoogleMaps, loadLeafletStyles } from './google-maps';
import { LeafletStage } from './leaflet-stage';
import { PanoramaDetails, PanoramaStage, PanoramaStatus } from './panorama-stage';

const MIN_SPLIT = 22;
const MAX_SPLIT = 78;
/** Street View turns towards the asset from a clicked point only when the asset is this close. */
const FACING_RANGE = 250;

/**
 * The map and Street View, together.
 *
 * Map only, split, or Street View only. The panes are never collapsed to nothing: a panorama
 * squeezed to zero width loses its imagery for good, so in the single modes the hidden pane is
 * layered underneath at full size instead. Switching modes morphs one layout into the next with a
 * view transition, so the map visibly makes room rather than jumping.
 *
 * Street View follows the map and the map follows Street View: the amber cone stands where the
 * panorama is and turns as it turns, and walking in the panorama walks the cone.
 */
@Component({
  selector: 'bm-geo-canvas',
  imports: [Icon, CdkMenuTrigger, CdkMenu, CdkMenuItem, CdkMenuItemRadio, CdkMenuItemCheckbox, Button, Segmented, Tooltip, Ripple],
  templateUrl: './geo-canvas.html',
  styleUrl: './geo-canvas.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'bm-geo-canvas',
    '[attr.data-mode]': 'mode()',
    '[class.is-vertical]': 'vertical()',
    '[class.is-dragging]': 'dragging()',
    '[style.--bm-inset-top.px]': 'visibleInsets().top',
    '[style.--bm-inset-right.px]': 'visibleInsets().right',
    '[style.--bm-inset-bottom.px]': 'visibleInsets().bottom',
    '[style.--bm-inset-left.px]': 'visibleInsets().left',
    '[style.--bm-panel-left.px]': 'insets().left',
    '[style.--bm-street-inset-left.px]': 'streetInsets().left',
    '[style.--bm-street-inset-right.px]': 'streetInsets().right',
    '[style.--bm-street-inset-bottom.px]': 'streetInsets().bottom',
    '[style.--bm-split]': 'split() + "%"',
  },
})
export class GeoCanvas {
  private readonly maps = inject(GoogleMaps);
  private readonly preferences = inject(PreferencesStore);
  private readonly haptics = inject(Haptics);
  private readonly appRef = inject(ApplicationRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly viewport = inject(Viewport);
  protected readonly immersive = inject(Immersive);

  readonly mode = model<MapMode>('map');
  readonly basemap = model<Basemap>('road');
  readonly coverage = model(true);
  /** The position being recorded, drawn as the amber pin. */
  readonly asset = input<LatLng | null>(null);
  readonly points = input<readonly MapPoint[]>([]);
  /** Space taken by floating panels, so flights land in the visible middle. */
  readonly insets = input<Insets>(NO_INSETS);
  readonly editable = input(false, { transform: booleanAttribute });
  readonly initialView = input<MapView>(ITALY);
  readonly shortcuts = input(true, { transform: booleanAttribute });
  /** Off where the canvas sits inside a page rather than filling a workspace. */
  readonly fullscreenable = input(true, { transform: booleanAttribute });

  readonly capture = output<LatLng>();
  readonly pointSelected = output<MapPoint>();

  private readonly mapElement = viewChild.required<ElementRef<HTMLElement>>('mapElement');
  private readonly panoramaElement = viewChild.required<ElementRef<HTMLElement>>('panoramaElement');
  private readonly splitElement = viewChild.required<ElementRef<HTMLElement>>('splitArea');
  private readonly contextMenu = viewChild<ElementRef<HTMLElement>>('contextMenu');

  private stage: LeafletStage | null = null;
  private readonly stageReady = signal(false);
  private readonly queued: Array<(stage: LeafletStage) => void> = [];
  private panorama: Promise<PanoramaStage | null> | null = null;
  private panoramaInstance: PanoramaStage | null = null;
  private destroyed = false;
  private lastAsset: LatLng | null = null;

  protected readonly view = signal<MapView>(ITALY);
  protected readonly cursor = signal<LatLng | null>(null);
  protected readonly street = signal<PanoramaStatus>('idle');
  protected readonly streetShown = signal(false);
  protected readonly streetDetails = signal<PanoramaDetails | null>(null);
  protected readonly camera = signal<LatLng | null>(null);
  protected readonly facing = signal(true);
  protected readonly split = signal(50);
  protected readonly dragging = signal(false);
  protected readonly locating = signal(false);
  protected readonly menu = signal<{ position: LatLng; x: number; y: number } | null>(null);
  protected readonly notice = signal<string | null>(null);
  private noticeTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly basemaps = BASEMAPS;
  protected readonly vertical = computed(() => this.viewport.isHandset());
  protected readonly refused = this.maps.refused;

  protected readonly modes = computed<SegmentOption<MapMode>[]>(() => [
    { value: 'map', label: 'Map', icon: 'map' },
    { value: 'split', label: 'Split', icon: this.vertical() ? 'rows-3' : 'columns-3' },
    { value: 'street', label: 'Street', icon: 'scan-search' },
  ]);

  protected readonly readout = computed(() => this.cursor() ?? this.view().center);

  /**
   * What floating panels cover of the map pane. Side by side, the panes already start clear of a
   * left panel; stacked, a bottom sheet covers Street View below rather than the map.
   */
  protected readonly visibleInsets = computed<Insets>(() => {
    const insets = this.insets();
    if (this.mode() !== 'split') return insets;
    return this.vertical() ? { ...insets, bottom: 0 } : { ...insets, left: 0 };
  });

  /** The same for the Street View pane, which a left panel only covers when it fills the canvas. */
  protected readonly streetInsets = computed<Insets>(() =>
    this.mode() === 'split' ? { ...this.insets(), left: 0, top: this.vertical() ? 0 : this.insets().top } : this.insets(),
  );

  protected readonly imageDate = computed(() => {
    const date = this.streetDetails()?.imageDate;
    if (!date) return null;
    const [year, month] = date.split('-').map(Number);
    return new Date(year, (month || 1) - 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  });

  protected readonly cameraDistance = computed(() => {
    const camera = this.camera();
    const asset = this.asset();
    return camera && asset ? formatDistance(distance(camera, asset)) : null;
  });

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => void this.start());

    effect(() => {
      const asset = this.asset();
      if (!this.stageReady()) return;
      untracked(() => this.placeAsset(asset));
    });

    effect(() => {
      const points = this.points();
      if (this.stageReady()) untracked(() => this.stage?.setPoints(points));
    });

    let shownBasemap: Basemap | null = null;
    effect(() => {
      const basemap = this.basemap();
      if (!this.stageReady()) return;
      if (shownBasemap && shownBasemap !== basemap) untracked(() => this.stage?.setBasemap(basemap));
      shownBasemap = basemap;
    });

    effect(() => {
      const coverage = this.coverage();
      if (this.stageReady()) untracked(() => this.stage?.setCoverage(coverage));
    });

    // A new layout keeps the asset in the middle of whatever the map pane has become.
    effect(() => {
      const mode = this.mode();
      untracked(() => {
        this.menu.set(null);
        if (mode !== 'map' && this.stageReady()) void this.ensurePanorama();
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            const asset = this.asset();
            if (asset && mode !== 'street') this.stage?.jumpTo(asset, this.view().zoom, this.visibleInsets());
          }),
        );
      });
    });

    if (typeof window !== 'undefined') {
      const unsubscribe = bindShortcuts({
        KeyM: (event) => this.shortcut(event, () => this.setMode('map')),
        KeyB: (event) => this.shortcut(event, () => this.setMode('split')),
        KeyV: (event) => this.shortcut(event, () => this.setMode('street')),
        KeyF: (event) => this.shortcut(event, () => this.fullscreenable() && void this.immersive.toggle()),
        KeyL: (event) => this.shortcut(event, () => this.locate()),
        Escape: () => this.menu.set(null),
      });
      destroyRef.onDestroy(unsubscribe);
    }

    destroyRef.onDestroy(() => {
      this.destroyed = true;
      clearTimeout(this.noticeTimer);
      this.panoramaInstance?.destroy();
      this.stage?.destroy();
    });
  }

  // ── Public verbs ───────────────────────────────────────────────────────────

  flyTo(position: LatLng, zoom: number): void {
    this.whenReady((stage) => stage.flyTo(position, zoom, this.visibleInsets()));
  }

  fitTo(positions: readonly LatLng[], maxZoom?: number): void {
    this.whenReady((stage) => stage.fitTo(positions, this.visibleInsets(), maxZoom));
  }

  focusAsset(): void {
    const asset = this.asset();
    if (asset) this.flyTo(asset, Math.max(this.view().zoom, ZOOM.asset - 1));
  }

  /** The point in the middle of what is visible, for "place it here" from a keyboard or a crosshair. */
  visibleCenter(): LatLng | null {
    return this.stage?.visibleCenter(this.visibleInsets()) ?? null;
  }

  /** Stands Street View near a point and, when the asset is close by, turns to face it. */
  async look(near: LatLng, face: LatLng | null = this.asset()): Promise<boolean> {
    const panorama = await this.ensurePanorama();
    if (!panorama) return false;
    const target = face && distance(near, face) <= FACING_RANGE ? face : null;
    return panorama.show(near, target);
  }

  setMode(next: MapMode): void {
    if (next === this.mode()) return;
    this.haptics.tap();
    this.morph(() => this.mode.set(next));
  }

  // ── Template actions ───────────────────────────────────────────────────────

  protected zoomBy(delta: number): void {
    this.stage?.zoomBy(delta);
  }

  protected faceAsset(): void {
    const asset = this.asset();
    if (!asset) return;
    const camera = this.camera();
    if (camera && distance(camera, asset) <= FACING_RANGE) this.panoramaInstance?.face(asset);
    else void this.look(asset, asset);
  }

  protected showCoverage(): void {
    this.coverage.set(true);
    if (this.mode() === 'street') this.setMode('split');
  }

  protected retryStreetView(): void {
    this.panorama = null;
    this.street.set('idle');
    const near = this.camera() ?? this.asset();
    if (near) void this.look(near);
    else void this.ensurePanorama();
  }

  protected preview(basemap: Basemap): string {
    const { center, zoom } = this.view();
    return basemapPreview(basemap, center, zoom);
  }

  protected locate(): void {
    if (!('geolocation' in navigator)) {
      toast.error('Location is not available', { description: 'This browser cannot share where you are.' });
      return;
    }
    this.locating.set(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        this.locating.set(false);
        const position = { lat: coords.latitude, lng: coords.longitude };
        this.stage?.showSelf(position, coords.accuracy);
        this.flyTo(position, coords.accuracy < 60 ? ZOOM.asset - 1 : ZOOM.street - 1);
        this.haptics.success();
        toast('You are here', {
          description: `Accurate to about ${formatDistance(coords.accuracy)}.`,
          action: this.editable() ? { label: 'Place asset here', onClick: () => this.capture.emit(position) } : undefined,
        });
      },
      (error) => {
        this.locating.set(false);
        this.haptics.warning();
        toast.error(error.code === error.PERMISSION_DENIED ? 'Location permission was refused' : 'Your location could not be found', {
          description: error.code === error.PERMISSION_DENIED ? 'Allow location for this site in the browser, then try again.' : 'Move somewhere with a clearer signal and try again.',
        });
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
    );
  }

  protected copyReadout(): void {
    void copyToClipboard(formatPosition(this.readout()), 'Coordinates copied');
  }

  protected menuPlace(): void {
    const menu = this.menu();
    this.menu.set(null);
    if (menu) this.capture.emit(menu.position);
  }

  protected menuLook(): void {
    const menu = this.menu();
    this.menu.set(null);
    if (!menu) return;
    if (this.mode() === 'map') this.setMode(this.vertical() ? 'street' : 'split');
    void this.look(menu.position);
  }

  protected menuCentre(): void {
    const menu = this.menu();
    this.menu.set(null);
    if (menu) this.flyTo(menu.position, Math.max(this.view().zoom, ZOOM.street));
  }

  protected menuCopy(): void {
    const menu = this.menu();
    this.menu.set(null);
    if (menu) void copyToClipboard(formatPosition(menu.position), 'Coordinates copied');
  }

  protected menuGoogle(): void {
    const menu = this.menu();
    this.menu.set(null);
    if (menu) window.open(`https://www.google.com/maps/search/?api=1&query=${menu.position.lat},${menu.position.lng}`, '_blank', 'noopener');
  }

  protected formatPosition = formatPosition;

  // ── Splitter ───────────────────────────────────────────────────────────────

  protected startDrag(event: PointerEvent): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.dragging.set(true);
  }

  protected drag(event: PointerEvent): void {
    if (!this.dragging()) return;
    const rect = this.splitElement().nativeElement.getBoundingClientRect();
    const ratio = this.vertical() ? (event.clientY - rect.top) / rect.height : (event.clientX - rect.left) / rect.width;
    this.split.set(clamp(Math.round(ratio * 1000) / 10, MIN_SPLIT, MAX_SPLIT));
  }

  protected endDrag(event: PointerEvent): void {
    if (!this.dragging()) return;
    (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
    this.dragging.set(false);
  }

  protected nudge(event: KeyboardEvent): void {
    const back = this.vertical() ? 'ArrowUp' : 'ArrowLeft';
    const forward = this.vertical() ? 'ArrowDown' : 'ArrowRight';
    const step = event.shiftKey ? 10 : 2;
    const next: Record<string, number> = {
      [back]: this.split() - step,
      [forward]: this.split() + step,
      Home: MIN_SPLIT,
      End: MAX_SPLIT,
      Enter: 50,
    };
    if (!(event.key in next)) return;
    event.preventDefault();
    this.split.set(clamp(next[event.key], MIN_SPLIT, MAX_SPLIT));
  }

  protected resetSplit(): void {
    this.split.set(50);
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private async start(): Promise<void> {
    await loadLeafletStyles();
    if (this.destroyed) return;

    this.stage = new LeafletStage(
      this.mapElement().nativeElement,
      {
        view: this.initialView(),
        basemap: this.basemap(),
        coverage: this.coverage(),
        insets: () => this.visibleInsets(),
        reducedMotion: () => this.preferences.reducedMotion(),
      },
      {
        capture: (position) => {
          if (!this.editable()) return;
          this.haptics.success();
          this.capture.emit(position);
        },
        click: (position) => {
          this.menu.set(null);
          if (this.mode() === 'split') void this.look(position);
        },
        context: (position, at) => {
          this.haptics.tap();
          const bounds = this.host.nativeElement.getBoundingClientRect();
          const mapBounds = this.mapElement().nativeElement.getBoundingClientRect();
          const x = clamp(at.x + mapBounds.left - bounds.left, 8, bounds.width - 248);
          const y = clamp(at.y + mapBounds.top - bounds.top, 8, bounds.height - 236);
          this.menu.set({ position, x, y });
          requestAnimationFrame(() => this.contextMenu()?.nativeElement.querySelector<HTMLElement>('[cdkMenuItem]')?.focus());
        },
        cameraDropped: (position) => void this.look(position),
        cursor: (position) => this.cursor.set(position),
        view: (view) => {
          this.view.set(view);
          if (this.menu()) this.menu.set(null);
        },
        point: (point) => this.pointSelected.emit(point),
      },
    );
    const { center, zoom } = this.initialView();
    this.stage.jumpTo(center, zoom, this.visibleInsets());
    this.view.set(this.stage.view());
    this.stageReady.set(true);
    this.queued.splice(0).forEach((run) => run(this.stage!));
    if (this.mode() !== 'map') void this.ensurePanorama();
  }

  private whenReady(run: (stage: LeafletStage) => void): void {
    if (this.stage) run(this.stage);
    else this.queued.push(run);
  }

  private placeAsset(asset: LatLng | null): void {
    this.stage?.setAsset(asset);
    const previous = this.lastAsset;
    this.lastAsset = asset;
    if (!asset || (previous && distance(previous, asset) < 0.05)) return;

    const camera = this.camera();
    if (camera && this.streetShown() && distance(camera, asset) <= FACING_RANGE / 2) {
      this.panoramaInstance?.face(asset);
      void this.look(camera, asset);
    } else {
      void this.look(asset, asset);
    }
  }

  private ensurePanorama(): Promise<PanoramaStage | null> {
    this.panorama ??= this.createPanorama();
    return this.panorama;
  }

  private async createPanorama(): Promise<PanoramaStage | null> {
    this.street.set('loading');
    try {
      const kit = await this.maps.streetView();
      if (this.destroyed) return null;
      const stage = new PanoramaStage(
        kit,
        this.panoramaElement().nativeElement,
        {
          position: (position) => {
            this.camera.set(position);
            this.stage?.setCamera(position);
            if (this.mode() !== 'map') {
              const asset = this.asset();
              const both = asset && distance(asset, position) <= FACING_RANGE ? [position, asset] : [position];
              this.stage?.keepInView(both, this.visibleInsets());
            }
            this.updateFacing();
          },
          heading: (heading) => {
            this.stage?.setHeading(heading);
            this.updateFacing();
          },
          status: (status) => {
            if (status === 'ready') this.streetShown.set(true);
            this.street.set(status);
          },
          details: (details) => this.streetDetails.set(details),
          missed: () => this.notify('No Street View within 400 m of that point'),
        },
        () => this.preferences.reducedMotion(),
        this.viewport.isCoarsePointer(),
      );
      this.panoramaInstance = stage;
      if (!this.camera() && !this.asset()) this.street.set('idle');
      return stage;
    } catch {
      this.street.set('unavailable');
      this.panorama = null;
      return null;
    }
  }

  private notify(message: string): void {
    clearTimeout(this.noticeTimer);
    this.notice.set(message);
    this.noticeTimer = setTimeout(() => this.notice.set(null), 3200);
  }

  private updateFacing(): void {
    const asset = this.asset();
    this.facing.set(!asset || !this.panoramaInstance || this.panoramaInstance.isFacing(asset));
  }

  /**
   * Runs a layout change inside a view transition. Only the panes are named while it runs, so the
   * page transition styles never catch it.
   */
  private morph(change: () => void): void {
    const start = (document as Document & { startViewTransition?: unknown }).startViewTransition;
    if (this.preferences.reducedMotion() || typeof start !== 'function') {
      change();
      return;
    }
    const host = this.host.nativeElement;
    host.classList.add('is-morphing');
    const update = () => {
      change();
      this.appRef.tick();
    };
    let transition: ViewTransition;
    try {
      transition = document.startViewTransition({ update, types: ['canvas'] });
    } catch {
      transition = document.startViewTransition(update);
    }
    // A skipped transition rejects its promises; the change itself has still happened.
    transition.ready.catch(() => undefined);
    transition.finished.catch(() => undefined).finally(() => host.classList.remove('is-morphing'));
  }

  private shortcut(event: KeyboardEvent, run: () => void): void {
    if (!this.shortcuts() || event.metaKey || event.ctrlKey || event.altKey || isTyping(event)) return;
    event.preventDefault();
    run();
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isTyping(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null;
  if (!target) return false;
  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || !!target.closest('[role="dialog"], .cdk-overlay-pane');
}
