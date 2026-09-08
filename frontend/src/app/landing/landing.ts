import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

import { BootService } from '../core/boot.service';
import { CountUpDirective, MagneticDirective, MotionService } from '../core/motion';

/** The fix the whole page descends toward: Piazza della Scala, Milano. */
const TARGET = { lat: 45.469654, lng: 9.182206 };

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterModule, CountUpDirective, MagneticDirective],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent {
  private readonly motion = inject(MotionService);
  private readonly boot = inject(BootService);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private readonly headline = viewChild.required<ElementRef<HTMLElement>>('headline');
  private readonly reticle = viewChild.required<ElementRef<HTMLElement>>('reticle');
  private readonly readoutZoom = viewChild.required<ElementRef<HTMLElement>>('readoutZoom');
  private readonly readoutLat = viewChild.required<ElementRef<HTMLElement>>('readoutLat');
  private readonly readoutLon = viewChild.required<ElementRef<HTMLElement>>('readoutLon');
  private readonly readoutState = viewChild.required<ElementRef<HTMLElement>>('readoutState');
  private readonly sight = viewChild.required<ElementRef<HTMLElement>>('sight');
  private readonly actsTick = viewChild.required<ElementRef<HTMLElement>>('actsTick');
  private readonly method = viewChild.required<ElementRef<HTMLElement>>('method');
  private readonly plates = viewChild.required<ElementRef<HTMLElement>>('plates');
  private readonly dial = viewChild.required<ElementRef<HTMLElement>>('dial');

  // ── Narrative data ─────────────────────────────────────────────────────────

  readonly acts = [
    { id: 'act-problem', z: 'z08', label: 'Problem' },
    { id: 'act-method', z: 'z13', label: 'Method' },
    { id: 'act-sight', z: 'z17', label: 'Instrument' },
    { id: 'act-proof', z: 'z19', label: 'Provenance' },
  ];

  readonly currentAct = signal(this.acts[0].id);

  readonly faults = [
    {
      index: '01',
      title: 'Context is lost',
      body: 'The window that proved the building was the right one is closed by the time the number is pasted into the register.',
    },
    {
      index: '02',
      title: 'Precision is assumed',
      body: 'A geocoder returns a point for every address it is given, including the ones it guessed. Nothing in the output says which is which.',
    },
    {
      index: '03',
      title: 'Nothing is re-checkable',
      body: 'A year later there is no way to reopen the decision — only the coordinate survived, not the reasoning behind it.',
    },
  ];

  readonly surfaces = [
    {
      index: '01',
      title: 'Locate',
      body: 'Narrow from region to province to municipality, then street and civic number. The map does not move until you ask it to.',
      points: ['Type-ahead on all three administrative levels', 'Explicit geocoding, never silent'],
    },
    {
      index: '02',
      title: 'Verify',
      body: 'Map and Street View share the canvas on a divider you can drag — or resize from the keyboard — until the split suits the street.',
      points: ['Synchronised panes to zoom 21', 'Double-click captures the point'],
    },
    {
      index: '03',
      title: 'Register',
      body: 'Name the asset, attach its identifiers, and commit it. Any earlier record can be loaded straight back into the form.',
      points: ['Asset name, asset ID and ISTAT code', 'Reload and reuse a saved location'],
    },
  ];

  readonly figures = [
    { label: 'Coordinate precision', value: 6, unit: 'decimals' },
    { label: 'Administrative levels', value: 3, unit: 'resolved' },
    { label: 'Map zoom levels', value: 21, unit: 'to façade' },
  ];

  readonly recordRows = [
    { label: 'Municipality', value: 'Milano', fix: false },
    { label: 'Address', value: 'Piazza della Scala 2', fix: false },
    { label: 'ISTAT code', value: '015146', fix: false },
    { label: 'Latitude', value: '45.469654', fix: true },
    { label: 'Longitude', value: '9.182206', fix: true },
  ];

  /** Major ticks every 15°, drawn once rather than 24 hand-written spans. */
  readonly dialTicks = Array.from({ length: 24 }, (_, i) => i * 15);

  // ── The bearing dial ───────────────────────────────────────────────────────

  readonly heading = signal(148);

  readonly bearingLabel = computed(() => {
    const index = Math.round(this.heading() / 45) % COMPASS.length;

    return COMPASS[index];
  });

  private dragging = false;

  constructor() {
    afterNextRender(() => {
      // Held until the opening curtain lifts, so the hero is not performing to
      // an empty room.
      this.boot.whenReady().then(() => this.compose());
    });
  }

  // ── Dial interaction ───────────────────────────────────────────────────────
  //  Pointer events cover mouse, touch and pen in one path, and pointer capture
  //  keeps the drag alive when the pointer leaves the dial.

  onDialPointerDown(event: PointerEvent): void {
    event.preventDefault();
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    this.dragging = true;
    this.applyPointerHeading(event);
  }

  onDialPointerMove(event: PointerEvent): void {
    if (!this.dragging) return;

    this.applyPointerHeading(event);
  }

  onDialPointerUp(event: PointerEvent): void {
    if (!this.dragging) return;

    (event.target as HTMLElement).releasePointerCapture?.(event.pointerId);
    this.dragging = false;
  }

  /** Arrow keys turn the dial; Home snaps to north. Same affordance as a slider. */
  onDialKeydown(event: KeyboardEvent): void {
    const step = event.shiftKey ? 15 : 3;
    let next: number | null = null;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = this.heading() + step;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        next = this.heading() - step;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = 180;
        break;
      default:
        return;
    }

    event.preventDefault();
    this.heading.set(((next % 360) + 360) % 360);
  }

  private applyPointerHeading(event: PointerEvent): void {
    const rect = this.dial().nativeElement.getBoundingClientRect();
    const x = event.clientX - (rect.left + rect.width / 2);
    const y = event.clientY - (rect.top + rect.height / 2);

    // atan2 measures from the positive x-axis counter-clockwise; a compass
    // bearing is measured from north, clockwise.
    const bearing = (Math.atan2(x, -y) * 180) / Math.PI;

    this.heading.set(Math.round(((bearing % 360) + 360) % 360));
  }

  // ── Choreography ───────────────────────────────────────────────────────────

  private compose(): void {
    if (!this.motion.enabled()) {
      // Everything below only *adds* motion — the page is fully readable
      // without it, so there is nothing to restore here.
      this.trackCurrentAct();
      return;
    }

    const context = gsap.context(() => {
      this.playOverture();
      // Order matters: the pin adds a spacer, which changes total document
      // height. Anything measuring "bottom of the page" has to be created after
      // it, and a final refresh settles the whole set.
      this.convergeSurfaces();
      this.driveDescent();
      this.liftOnScroll();
      this.trackCurrentAct();
      this.followPointer();

      ScrollTrigger.refresh();
    }, this.host.nativeElement);

    this.destroyRef.onDestroy(() => context.revert());
  }

  /**
   * The overture: a focus pull.
   *
   * The headline arrives out of focus and sharpens, which is the page stating
   * its own thesis before the copy does — resolving something blurred into
   * something certain. The blur is animated on the two line wrappers rather
   * than per character: forty simultaneously blurred layers is a filter cost no
   * entrance is worth, and the read is identical.
   */
  private playOverture(): void {
    const headline = this.headline().nativeElement;
    const split = new SplitText(headline, { type: 'lines,chars', linesClass: 'line' });

    const timeline = this.motion.timeline({ delay: 0.1 });

    timeline
      .from('.masthead > *', { opacity: 0, y: -14, duration: 0.7, stagger: 0.07 })
      .from('.act--open .marker', { opacity: 0, x: -20, duration: 0.7 }, '-=0.4')
      .fromTo(
        split.lines,
        { filter: 'blur(14px)', opacity: 0 },
        { filter: 'blur(0px)', opacity: 1, duration: 1.1, stagger: 0.12, ease: 'bmGlide' },
        '-=0.35',
      )
      .from(
        split.chars,
        { yPercent: 60, duration: 0.9, stagger: 0.012, ease: 'bmArrive' },
        '<',
      )
      .from('.lede', { opacity: 0, y: 18, duration: 0.8 }, '-=0.65')
      .from('.entry > *', { opacity: 0, y: 16, duration: 0.7, stagger: 0.08 }, '-=0.55')
      .from('.descend', { opacity: 0, duration: 0.6 }, '-=0.35')
      .from(
        '.readout',
        { opacity: 0, x: 24, duration: 0.8 },
        '-=0.9',
      );

    // The reticle assembles once, then hands over to the scroll-driven descent.
    timeline.from(
      '.reticle',
      { scale: 1.6, opacity: 0, rotate: -40, duration: 1.4, ease: 'bmArrive' },
      0.3,
    );

    // A first impression has a budget. The choreography above is authored at a
    // comfortable reading pace and then played faster, which keeps the relative
    // timing intact while getting the hero to rest in about two seconds.
    timeline.timeScale(1.45);

    this.destroyRef.onDestroy(() => split.revert());
  }

  /**
   * The descent — the spine of the page.
   *
   * One scrubbed value, z, runs 3 → 21 across the whole document, and three
   * things read from it: the graticule subdivides, the reticle converges and
   * locks, and the coordinate readout gains decimal places. Precision rising
   * with zoom is exactly what a real map does, which makes the scrollbar itself
   * an explanation of the product.
   */
  private driveDescent(): void {
    const state = { z: 3 };
    const instrument = this.host.nativeElement.querySelector<HTMLElement>('.instrument');
    const reticle = this.reticle().nativeElement;
    if (!instrument) return;

    const paint = () => {
      const z = state.z;
      const progress = (z - 3) / 18;

      // Grid squares grow as you descend, as map features do when zooming in.
      instrument.style.setProperty('--grid-coarse', `${40 + progress * 120}px`);
      instrument.style.setProperty('--grid-fine', `${(40 + progress * 120) / 4}px`);
      instrument.style.setProperty('--fine-opacity', `${Math.min(1, progress * 1.6)}`);

      this.readoutZoom().nativeElement.textContent = `z${String(Math.round(z)).padStart(2, '0')}`;

      // One decimal at z03, six at z21 — the metre-level fix arrives exactly
      // when the reader reaches the call to action.
      const decimals = Math.min(6, 1 + Math.floor(progress * 5.999));
      this.readoutLat().nativeElement.textContent = `${TARGET.lat.toFixed(decimals)}° N`;
      this.readoutLon().nativeElement.textContent = `${TARGET.lng.toFixed(decimals)}° E`;

      const phase = progress > 0.92 ? 'Fixed' : progress > 0.45 ? 'Converging' : 'Unresolved';
      const phaseEl = this.readoutState().nativeElement;

      // Guarded: this runs on every scrubbed frame, and writing an unchanged
      // string still dirties the node.
      if (phaseEl.textContent !== phase) {
        phaseEl.textContent = phase;
        phaseEl.dataset['state'] = phase.toLowerCase();
      }
    };

    gsap.to(state, {
      z: 21,
      ease: 'none',
      onUpdate: paint,
      scrollTrigger: {
        trigger: this.host.nativeElement,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.7,
      },
    });

    // The reticle tightens and stops drifting as the fix is acquired.
    gsap.fromTo(
      reticle,
      { scale: 1.55, rotate: -22, opacity: 0.34 },
      {
        scale: 1,
        rotate: 0,
        // Capped below full strength: the reticle passes behind the bearing
        // dial, and two sets of concentric rings at equal weight read as noise
        // rather than as an instrument on a chart.
        opacity: 0.72,
        ease: 'none',
        scrollTrigger: {
          trigger: this.host.nativeElement,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.7,
        },
      },
    );

    paint();
  }

  /**
   * Section content rises as it is reached. `data-lift` marks a single element,
   * `data-lift-group` staggers its children — one convention for the page
   * rather than a bespoke trigger per block.
   */
  private liftOnScroll(): void {
    for (const element of gsap.utils.toArray<HTMLElement>('[data-lift]')) {
      gsap.from(element, {
        opacity: 0,
        y: 30,
        duration: 0.9,
        ease: 'bmGlide',
        scrollTrigger: { trigger: element, start: 'top 88%', once: true },
      });
    }

    for (const group of gsap.utils.toArray<HTMLElement>('[data-lift-group]')) {
      gsap.from(group.children, {
        opacity: 0,
        y: 36,
        duration: 0.9,
        stagger: 0.1,
        ease: 'bmArrive',
        scrollTrigger: { trigger: group, start: 'top 85%', once: true },
      });
    }
  }

  /**
   * The three surfaces converge.
   *
   * They begin spread apart in depth — three separate tools — and are drawn
   * into one overlapping stack as the section is scrolled. The claim of this
   * section is "three surfaces, one screen"; performing it is more convincing
   * than asserting it, and it costs three transforms.
   *
   * Pinned only where there is room. Below the tablet breakpoint the plates
   * stack in normal flow, because a pinned section on a phone steals the
   * scrollbar for a gesture that no longer reads.
   */
  private convergeSurfaces(): void {
    const section = this.method().nativeElement;
    const plates = Array.from(this.plates().nativeElement.children) as HTMLElement[];
    if (plates.length !== 3) return;

    ScrollTrigger.matchMedia({
      '(min-width: 901px)': () => {
        gsap.fromTo(
          plates,
          {
            // Scattered: rotated away from the reader, gapped, and dimmed —
            // three tools that do not know about each other.
            xPercent: (i: number) => (i - 1) * 26,
            yPercent: (i: number) => Math.abs(i - 1) * 9,
            rotateY: (i: number) => (i - 1) * -18,
            scale: 0.88,
            opacity: 0.45,
            borderRadius: 22,
          },
          {
            xPercent: 0,
            yPercent: 0,
            rotateY: 0,
            scale: 1,
            opacity: 1,
            // Square edges at the end: the three plates become one ruled panel.
            borderRadius: 0,
            ease: 'none',
            stagger: { each: 0.04, from: 'center' },
            scrollTrigger: {
              trigger: section,
              start: 'top top',
              end: '+=95%',
              scrub: 0.8,
              pin: true,
              anticipatePin: 1,
              // Pinned triggers must be measured before anything that reads
              // total document height — see `driveDescent`.
              refreshPriority: 1,
            },
          },
        );
      },
    });
  }

  /**
   * Keeps the masthead's act indicator on the section being read, and slides a
   * tick under it. Navigation that reports position is orientation, not
   * decoration — this page is long and mostly wordless in the margins.
   */
  private trackCurrentAct(): void {
    for (const act of this.acts) {
      const element = this.host.nativeElement.querySelector<HTMLElement>(`#${act.id}`);
      if (!element) continue;

      ScrollTrigger.create({
        trigger: element,
        start: 'top 55%',
        end: 'bottom 55%',
        onToggle: (self) => {
          if (self.isActive) {
            this.zone.run(() => this.currentAct.set(act.id));
            requestAnimationFrame(() => this.moveActTick());
          }
        },
      });
    }
  }

  private moveActTick(): void {
    const tick = this.actsTick().nativeElement;
    const active = this.host.nativeElement.querySelector<HTMLElement>('[data-act-link].is-current');

    if (!active) return;

    gsap.to(tick, {
      x: active.offsetLeft,
      width: active.offsetWidth,
      opacity: 1,
      duration: this.motion.enabled() ? 0.45 : 0,
      ease: 'bmArrive',
      overwrite: 'auto',
    });
  }

  /**
   * The sight: a survey target that trails the pointer and swells over anything
   * interactive. `quickTo` writes straight to the transform on each frame with
   * no timeline bookkeeping, which is what keeps a pointer follower off the
   * main thread's critical path.
   *
   * Fine pointers only — there is no hover to track on a touch screen.
   */
  private followPointer(): void {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const sight = this.sight().nativeElement;
    const moveX = gsap.quickTo(sight, 'x', { duration: 0.42, ease: 'power3' });
    const moveY = gsap.quickTo(sight, 'y', { duration: 0.42, ease: 'power3' });

    const onMove = (event: PointerEvent) => {
      moveX(event.clientX);
      moveY(event.clientY);

      const overTarget = !!(event.target as HTMLElement).closest?.(
        'a, button, [role="slider"], .plate',
      );

      sight.classList.toggle('is-target', overTarget);
    };

    this.zone.runOutsideAngular(() => {
      window.addEventListener('pointermove', onMove, { passive: true });
    });

    gsap.set(sight, { opacity: 1 });

    this.destroyRef.onDestroy(() => window.removeEventListener('pointermove', onMove));
  }
}
