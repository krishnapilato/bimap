import { gsap } from 'gsap';

import { LatLng, distance } from './geo';
import { StreetViewKit } from './google-maps';

export type PanoramaStatus = 'idle' | 'loading' | 'ready' | 'no-imagery' | 'unavailable';

export interface PanoramaDetails {
  description: string | null;
  /** `YYYY-MM`, when Google says. */
  imageDate: string | null;
}

export interface PanoramaHandlers {
  position(position: LatLng): void;
  heading(heading: number): void;
  status(status: PanoramaStatus): void;
  details(details: PanoramaDetails): void;
  /** No imagery near the requested point while an earlier view is still showing. */
  missed(): void;
}

/** Searched in turn until one finds imagery, so a point in a courtyard still gets the street. */
const SEARCH_RADII = [35, 120, 400];

/**
 * Street View, driven the way a surveyor needs it: stand at the nearest panorama and turn to face
 * the asset. Everything Google-specific stays in here.
 */
export class PanoramaStage {
  private readonly panorama: google.maps.StreetViewPanorama;
  private readonly service: google.maps.StreetViewService;
  private readonly listeners: google.maps.MapsEventListener[] = [];
  private readonly details = new Map<string, PanoramaDetails>();
  private positionFrame = 0;
  private headingFrame = 0;
  private turn: gsap.core.Tween | null = null;
  private request = 0;
  private resizeFrame = 0;
  private nudge = 0.05;
  private readonly resizeObserver: ResizeObserver;

  constructor(
    private readonly kit: StreetViewKit,
    element: HTMLElement,
    private readonly handlers: PanoramaHandlers,
    private readonly reducedMotion: () => boolean,
    touch: boolean,
  ) {
    this.service = new kit.StreetViewService();
    this.panorama = new kit.StreetViewPanorama(element, {
      visible: false,
      disableDefaultUI: true,
      linksControl: true,
      clickToGo: true,
      showRoadLabels: true,
      motionTracking: false,
      motionTrackingControl: touch,
      zoomControl: false,
      panControl: false,
      addressControl: false,
      fullscreenControl: false,
      enableCloseButton: false,
    });

    this.listeners.push(
      this.panorama.addListener('position_changed', () => {
        cancelAnimationFrame(this.positionFrame);
        this.positionFrame = requestAnimationFrame(() => {
          const position = this.position();
          if (position) this.handlers.position(position);
        });
      }),
      this.panorama.addListener('pov_changed', () => {
        cancelAnimationFrame(this.headingFrame);
        this.headingFrame = requestAnimationFrame(() => this.handlers.heading(this.panorama.getPov().heading));
      }),
      this.panorama.addListener('pano_changed', () => void this.describe(this.panorama.getPano())),
      this.panorama.addListener('status_changed', () => {
        if (this.panorama.getStatus() === 'OK') this.resize();
      }),
    );

    // The panorama keeps the size it was drawn at until told otherwise, so every change to its
    // box — a mode switch, the splitter, full screen — is passed on.
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(element);
  }

  position(): LatLng | null {
    const position = this.panorama.getPosition();
    return position ? { lat: position.lat(), lng: position.lng() } : null;
  }

  heading(): number {
    return this.panorama.getPov().heading;
  }

  /**
   * Stands at the panorama nearest `near` and, when there is something to look at, faces it.
   * Resolves to false when no imagery exists close enough, leaving the previous view in place.
   */
  async show(near: LatLng, face: LatLng | null = null): Promise<boolean> {
    const request = ++this.request;
    this.handlers.status('loading');

    let found: google.maps.StreetViewPanoramaData | null;
    try {
      found = await this.nearest(near);
    } catch {
      if (request === this.request) this.handlers.status('unavailable');
      return false;
    }
    if (request !== this.request) return false;

    const location = found?.location;
    if (!location?.pano || !location.latLng) {
      if (this.panorama.getVisible()) {
        this.handlers.status('ready');
        this.handlers.missed();
      } else {
        this.handlers.status('no-imagery');
      }
      return false;
    }

    const origin = { lat: location.latLng.lat(), lng: location.latLng.lng() };
    this.details.set(location.pano, { description: location.description ?? null, imageDate: found?.imageDate ?? null });

    if (location.pano === this.panorama.getPano() && this.panorama.getVisible()) {
      if (face) this.turnTo(origin, face);
    } else {
      this.turn?.kill();
      this.panorama.setPano(location.pano);
      this.panorama.setPov(face ? this.povFacing(origin, face) : { heading: this.heading(), pitch: 0 });
      this.panorama.setZoom(face ? this.zoomFor(distance(origin, face)) : 1);
      this.panorama.setVisible(true);
      this.resize();
    }

    this.handlers.details(this.details.get(location.pano)!);
    this.handlers.status('ready');
    return true;
  }

  /** Turns in place to face a point, the short way round. */
  face(target: LatLng): void {
    const origin = this.position();
    if (origin) this.turnTo(origin, target);
  }

  /** Whether the view is already pointing at the target, within a few degrees. */
  isFacing(target: LatLng, tolerance = 12): boolean {
    const origin = this.position();
    if (!origin || !this.panorama.getVisible()) return true;
    const wanted = this.kit.spherical.computeHeading(origin, target);
    return Math.abs(shortestTurn(this.heading(), wanted)) <= tolerance;
  }

  /**
   * Redraws at the current size, once now and once more after Google's own layout has settled.
   * Resizing a WebGL canvas clears it and the panorama only paints again when the view moves, so
   * the heading is nudged by an invisible amount to make it.
   */
  resize(): void {
    cancelAnimationFrame(this.resizeFrame);
    const repaint = () => {
      google.maps.event.trigger(this.panorama, 'resize');
      if (!this.panorama.getVisible()) return;
      // Until the first panorama settles its zoom is NaN, and Maps refuses a POV built from it.
      const { heading, pitch } = this.panorama.getPov();
      if (!Number.isFinite(heading) || !Number.isFinite(this.panorama.getZoom())) return;
      this.nudge = -this.nudge;
      this.panorama.setPov({ heading: heading + this.nudge, pitch });
    };
    this.resizeFrame = requestAnimationFrame(() => {
      repaint();
      this.resizeFrame = requestAnimationFrame(() => {
        this.resizeFrame = requestAnimationFrame(repaint);
      });
    });
  }

  destroy(): void {
    this.resizeObserver.disconnect();
    cancelAnimationFrame(this.resizeFrame);
    this.turn?.kill();
    cancelAnimationFrame(this.positionFrame);
    cancelAnimationFrame(this.headingFrame);
    this.listeners.forEach((listener) => listener.remove());
    google.maps.event.clearInstanceListeners(this.panorama);
    this.panorama.setVisible(false);
  }

  private async nearest(near: LatLng): Promise<google.maps.StreetViewPanoramaData | null> {
    for (const radius of SEARCH_RADII) {
      try {
        const { data } = await this.service.getPanorama({
          location: near,
          radius,
          preference: this.kit.StreetViewPreference.NEAREST,
          source: this.kit.StreetViewSource.OUTDOOR,
        });
        if (data?.location?.pano) return data;
      } catch (error) {
        if ((error as { code?: string }).code !== 'ZERO_RESULTS') throw error;
      }
    }
    return null;
  }

  private async describe(pano: string): Promise<void> {
    if (!pano) return;
    const known = this.details.get(pano);
    if (known) {
      this.handlers.details(known);
      return;
    }
    try {
      const { data } = await this.service.getPanorama({ pano });
      const details = { description: data.location?.description ?? null, imageDate: data.imageDate ?? null };
      this.details.set(pano, details);
      if (this.panorama.getPano() === pano) this.handlers.details(details);
    } catch {
      // The view still works without its caption.
    }
  }

  private povFacing(origin: LatLng, target: LatLng): google.maps.StreetViewPov {
    const heading = this.kit.spherical.computeHeading(origin, target);
    // Close façades need a slight upward look to show more than the ground floor.
    const pitch = distance(origin, target) < 40 ? 8 : 3;
    return { heading, pitch };
  }

  private zoomFor(metres: number): number {
    if (metres > 120) return 2;
    if (metres > 50) return 1.5;
    return 1;
  }

  private turnTo(origin: LatLng, target: LatLng): void {
    const goal = this.povFacing(origin, target);
    const start = this.panorama.getPov();
    const turn = shortestTurn(start.heading, goal.heading);
    this.turn?.kill();

    if (this.reducedMotion() || Math.abs(turn) < 1) {
      this.panorama.setPov(goal);
      return;
    }
    const state = { heading: start.heading, pitch: start.pitch };
    this.turn = gsap.to(state, {
      heading: start.heading + turn,
      pitch: goal.pitch,
      duration: Math.min(1.1, 0.35 + (Math.abs(turn) / 180) * 0.75),
      ease: 'bm-emphasized',
      onUpdate: () => this.panorama.setPov({ heading: state.heading, pitch: state.pitch }),
    });
  }
}

/** The signed turn, between -180 and 180 degrees, from one heading to another. */
function shortestTurn(from: number, to: number): number {
  return ((((to - from) % 360) + 540) % 360) - 180;
}
