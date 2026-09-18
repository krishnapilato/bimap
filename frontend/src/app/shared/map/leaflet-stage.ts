import * as L from 'leaflet';

import { Basemap } from '../../core/ui/preferences';
import { basemapLayer, coverageLayer } from './basemaps';
import { Insets, LatLng, MapPoint, MapView, NO_INSETS, distance } from './geo';
import { assetIcon, cameraIcon, selfIcon } from './markers';

export interface LeafletHandlers {
  /** A double-click, or the asset pin dropped somewhere new. */
  capture(position: LatLng): void;
  /** A single click, once it is certain no second click is coming. */
  click(position: LatLng): void;
  /** A right-click or a long press, with where on the canvas it happened. */
  context(position: LatLng, at: { x: number; y: number }): void;
  cameraDropped(position: LatLng): void;
  cursor(position: LatLng | null): void;
  view(view: MapView): void;
  point(point: MapPoint): void;
}

const CLICK_DELAY = 240;
const SIGHT_LINE_RANGE = 400;

/**
 * Leaflet, configured for surveying and wrapped in the handful of verbs the canvas needs.
 *
 * Tiles come straight from Google's tile servers; Street View is a separate stage. This class
 * knows nothing about Angular, so it is created and destroyed with the element it draws into.
 */
export class LeafletStage {
  readonly map: L.Map;

  private base: L.TileLayer;
  private baseZ = 1;
  private readonly coverage = coverageLayer();
  private readonly camera = L.marker([0, 0], { icon: cameraIcon(), draggable: true, keyboard: false, zIndexOffset: 400 });
  private asset: L.Marker | null = null;
  private sightLine: L.Polyline | null = null;
  private self: L.LayerGroup | null = null;
  private readonly points = L.layerGroup();

  private heading = 0;
  private clickTimer: ReturnType<typeof setTimeout> | undefined;
  private cursorFrame = 0;
  private resizeFrame = 0;
  private readonly resizeObserver: ResizeObserver;
  private readonly reducedMotion: () => boolean;
  private readonly insets: () => Insets;

  constructor(
    private readonly element: HTMLElement,
    options: { view: MapView; basemap: Basemap; coverage: boolean; insets: () => Insets; reducedMotion: () => boolean },
    private readonly handlers: LeafletHandlers,
  ) {
    this.reducedMotion = options.reducedMotion;
    this.insets = options.insets;
    this.map = L.map(element, {
      zoomControl: false,
      attributionControl: false,
      doubleClickZoom: false,
      tapHold: true,
      minZoom: 4,
      maxZoom: 21,
      zoomSnap: 0.5,
      wheelPxPerZoomLevel: 110,
      maxBounds: [
        [-85, -180],
        [85, 180],
      ],
      maxBoundsViscosity: 1,
    }).setView(options.view.center, options.view.zoom);

    L.control.attribution({ prefix: false, position: 'bottomleft' }).addTo(this.map);
    this.base = basemapLayer(options.basemap, this.baseZ).addTo(this.map);
    if (options.coverage) this.coverage.addTo(this.map);
    this.points.addTo(this.map);

    this.listen();

    this.resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = requestAnimationFrame(() => this.map.invalidateSize({ debounceMoveend: true }));
    });
    this.resizeObserver.observe(element);
  }

  // ── Layers ─────────────────────────────────────────────────────────────────

  /** The new basemap dissolves in over the old one, tile by tile, before the old one goes. */
  setBasemap(basemap: Basemap): void {
    const previous = this.base;
    this.base = basemapLayer(basemap, ++this.baseZ).addTo(this.map);
    const retire = () => previous.remove();
    this.base.once('load', () => setTimeout(retire, 250));
    setTimeout(retire, 2500);
  }

  setCoverage(visible: boolean): void {
    if (visible) this.coverage.addTo(this.map);
    else this.coverage.remove();
  }

  setPoints(points: readonly MapPoint[]): void {
    this.points.clearLayers();
    // A crowd of points gets smaller dots, so a province of comuni stays readable.
    const radius = points.length > 80 ? 4.5 : 6;
    for (const point of points) {
      L.circleMarker(point.position, {
        radius: point.tone === 'signal' ? radius + 2 : radius,
        weight: 2,
        fillOpacity: 1,
        className: `bm-point is-${point.tone}`,
      })
        .bindTooltip(point.detail ? `<strong>${escape(point.label)}</strong><span>${escape(point.detail)}</span>` : escape(point.label), {
          direction: 'top',
          offset: [0, -8],
          className: 'bm-map-tooltip',
        })
        .on('click', (event) => {
          L.DomEvent.stopPropagation(event);
          this.handlers.point(point);
        })
        .addTo(this.points);
    }
  }

  // ── Marks ──────────────────────────────────────────────────────────────────

  setAsset(position: LatLng | null): void {
    if (!position) {
      const leaving = this.asset;
      this.asset = null;
      leaving?.getElement()?.classList.add('is-leaving');
      setTimeout(() => leaving?.remove(), 220);
      this.updateSightLine();
      return;
    }

    if (!this.asset) {
      this.asset = L.marker(position, { icon: assetIcon(), draggable: true, autoPan: true, zIndexOffset: 1000, title: 'Asset position' });
      this.asset.on('dragstart', () => this.asset?.getElement()?.classList.add('is-lifted'));
      this.asset.on('drag', () => this.updateSightLine());
      this.asset.on('dragend', () => {
        const element = this.asset?.getElement();
        element?.classList.remove('is-lifted');
        replay(element, 'is-landing');
        const { lat, lng } = this.asset!.getLatLng();
        this.handlers.capture({ lat, lng });
      });
      this.asset.addTo(this.map);
      replay(this.asset.getElement(), 'is-dropping');
    } else if (distance(this.asset.getLatLng(), position) > 0.05) {
      this.asset.setLatLng(position);
      replay(this.asset.getElement(), 'is-landing');
    }
    this.updateSightLine();
  }

  setCamera(position: LatLng | null): void {
    if (!position) {
      this.camera.remove();
    } else if (!this.map.hasLayer(this.camera)) {
      this.camera.setLatLng(position).addTo(this.map);
      this.setHeading(this.heading);
      replay(this.camera.getElement(), 'is-arriving');
    } else {
      this.camera.setLatLng(position);
    }
    this.updateSightLine();
  }

  setHeading(heading: number): void {
    this.heading = heading;
    this.camera.getElement()?.style.setProperty('--bm-heading', `${heading}deg`);
  }

  showSelf(position: LatLng, accuracy: number): void {
    this.self?.remove();
    this.self = L.layerGroup([
      L.circle(position, { radius: accuracy, className: 'bm-self-accuracy', interactive: false, weight: 1 }),
      L.marker(position, { icon: selfIcon(), interactive: false, keyboard: false, zIndexOffset: 300 }),
    ]).addTo(this.map);
  }

  // ── Camera moves ───────────────────────────────────────────────────────────

  /**
   * A flight whose length follows the distance travelled, landing so the target sits in the
   * middle of whatever the floating panels leave visible.
   */
  flyTo(position: LatLng, zoom: number, insets: Insets = NO_INSETS): void {
    const target = this.offset(position, zoom, insets);
    if (this.reducedMotion()) {
      this.map.setView(target, zoom, { animate: false });
      return;
    }
    const kilometres = distance(this.map.getCenter(), position) / 1000;
    const zoomChange = Math.abs(this.map.getZoom() - zoom);
    if (kilometres < 0.3 && zoomChange <= 1) {
      this.map.setView(target, zoom, { animate: true, duration: 0.45 });
      return;
    }
    const duration = Math.min(2.6, 0.7 + Math.log10(kilometres + 1) * 0.5 + zoomChange * 0.04);
    this.map.flyTo(target, zoom, { duration, easeLinearity: 0.2 });
  }

  /** Moves at once, with the same allowance for floating panels as a flight. */
  jumpTo(position: LatLng, zoom: number, insets: Insets = NO_INSETS): void {
    this.map.setView(this.offset(position, zoom, insets), zoom, { animate: false });
  }

  /**
   * Moves only when one of the positions has drifted out of the comfortable middle of the view:
   * one position is panned back to the middle, several are framed together without zooming in.
   */
  keepInView(positions: readonly LatLng[], insets: Insets = NO_INSETS): void {
    const size = this.map.getSize();
    const margin = 0.15;
    const width = size.x - insets.left - insets.right;
    const height = size.y - insets.top - insets.bottom;
    const comfortable = positions.every((position) => {
      const point = this.map.latLngToContainerPoint([position.lat, position.lng]);
      return (
        point.x >= insets.left + width * margin &&
        point.x <= size.x - insets.right - width * margin &&
        point.y >= insets.top + height * margin &&
        point.y <= size.y - insets.bottom - height * margin
      );
    });
    if (comfortable || !positions.length) return;
    if (positions.length === 1) {
      this.map.panTo(this.offset(positions[0], this.map.getZoom(), insets), { animate: !this.reducedMotion(), duration: 0.5 });
    } else {
      this.fitTo(positions, insets, this.map.getZoom());
    }
  }

  fitTo(positions: readonly LatLng[], insets: Insets = NO_INSETS, maxZoom = 17): void {
    if (!positions.length) return;
    const bounds = L.latLngBounds(positions.map((p) => [p.lat, p.lng] as L.LatLngTuple));
    const options: L.FitBoundsOptions = {
      paddingTopLeft: [insets.left + 56, insets.top + 56],
      paddingBottomRight: [insets.right + 56, insets.bottom + 56],
      maxZoom,
    };
    if (this.reducedMotion()) this.map.fitBounds(bounds, { ...options, animate: false });
    else this.map.flyToBounds(bounds, { ...options, duration: 1.2 });
  }

  zoomBy(delta: number): void {
    this.map.setZoom(this.map.getZoom() + delta, { animate: !this.reducedMotion() });
  }

  view(): MapView {
    const { lat, lng } = this.map.getCenter();
    return { center: { lat, lng }, zoom: this.map.getZoom() };
  }

  /** The geographic point under the middle of the visible area. */
  visibleCenter(insets: Insets): LatLng {
    const size = this.map.getSize();
    const x = insets.left + (size.x - insets.left - insets.right) / 2;
    const y = insets.top + (size.y - insets.top - insets.bottom) / 2;
    const { lat, lng } = this.map.containerPointToLatLng([x, y]);
    return { lat, lng };
  }

  destroy(): void {
    clearTimeout(this.clickTimer);
    cancelAnimationFrame(this.cursorFrame);
    cancelAnimationFrame(this.resizeFrame);
    this.resizeObserver.disconnect();
    this.map.remove();
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private listen(): void {
    this.camera.on('dragstart', () => this.camera.getElement()?.classList.add('is-dragging'));
    this.camera.on('drag', () => this.updateSightLine());
    this.camera.on('dragend', () => {
      this.camera.getElement()?.classList.remove('is-dragging');
      const { lat, lng } = this.camera.getLatLng();
      this.handlers.cameraDropped({ lat, lng });
    });

    this.map.on('click', (event: L.LeafletMouseEvent) => {
      clearTimeout(this.clickTimer);
      const { lat, lng } = event.latlng;
      this.clickTimer = setTimeout(() => this.handlers.click({ lat, lng }), CLICK_DELAY);
    });

    this.map.on('dblclick', (event: L.LeafletMouseEvent) => {
      clearTimeout(this.clickTimer);
      const { lat, lng } = event.latlng;
      this.handlers.capture({ lat, lng });
    });

    this.map.on('contextmenu', (event: L.LeafletMouseEvent) => {
      L.DomEvent.preventDefault(event.originalEvent);
      clearTimeout(this.clickTimer);
      const { lat, lng } = event.latlng;
      this.handlers.context({ lat, lng }, { x: event.containerPoint.x, y: event.containerPoint.y });
    });

    this.map.on('mousemove', (event: L.LeafletMouseEvent) => {
      cancelAnimationFrame(this.cursorFrame);
      this.cursorFrame = requestAnimationFrame(() => this.handlers.cursor({ lat: event.latlng.lat, lng: event.latlng.lng }));
    });
    this.map.on('mouseout', () => {
      cancelAnimationFrame(this.cursorFrame);
      this.handlers.cursor(null);
    });

    this.map.on('moveend zoomend', () => this.handlers.view(this.view()));

    // Enter on the focused map places the asset under the crosshair: the keyboard route to capture.
    this.element.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' || event.target !== this.element) return;
      event.preventDefault();
      this.handlers.capture(this.visibleCenter(this.insets()));
    });
  }

  private updateSightLine(): void {
    const camera = this.map.hasLayer(this.camera) ? this.camera.getLatLng() : null;
    const asset = this.asset?.getLatLng() ?? null;
    const span = camera && asset ? distance(camera, asset) : 0;

    if (!camera || !asset || span < 3 || span > SIGHT_LINE_RANGE) {
      this.sightLine?.remove();
      this.sightLine = null;
      return;
    }
    if (this.sightLine) {
      this.sightLine.setLatLngs([camera, asset]);
    } else {
      this.sightLine = L.polyline([camera, asset], {
        className: 'bm-sightline',
        interactive: false,
        weight: 2,
        dashArray: '1 7',
        lineCap: 'round',
      }).addTo(this.map);
    }
  }

  private offset(position: LatLng, zoom: number, insets: Insets): L.LatLng {
    const dx = (insets.left - insets.right) / 2;
    const dy = (insets.top - insets.bottom) / 2;
    if (!dx && !dy) return L.latLng(position.lat, position.lng);
    const projected = this.map.project([position.lat, position.lng], zoom).subtract([dx, dy]);
    return this.map.unproject(projected, zoom);
  }
}

const replays = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

/** Restarts a one-shot CSS animation class, and takes it off once every part has played. */
function replay(element: HTMLElement | undefined, className: string, duration = 1000): void {
  if (!element) return;
  clearTimeout(replays.get(element));
  element.classList.remove('is-dropping', 'is-landing', 'is-arriving');
  void element.offsetWidth;
  element.classList.add(className);
  replays.set(element, setTimeout(() => element.classList.remove(className), duration));
}

function escape(text: string): string {
  return text.replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);
}
