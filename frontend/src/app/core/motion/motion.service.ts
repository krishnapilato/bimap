import { DOCUMENT, Injectable, inject, signal } from '@angular/core';
import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { Draggable } from 'gsap/Draggable';
import { Flip } from 'gsap/Flip';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { Observer } from 'gsap/Observer';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

/**
 * The single place GSAP is configured.
 *
 * Two things every animation in BiMap depends on live here: the named eases
 * (so a "BiMap move" looks the same whether it is a panel arriving or a chip
 * settling) and the reduced-motion switch. Components never call
 * `gsap.registerPlugin` or read the media query themselves — they ask this
 * service for a timeline and get an inert one when motion is unwanted.
 */
@Injectable({ providedIn: 'root' })
export class MotionService {
  private readonly document = inject(DOCUMENT);

  /** False when the OS asks for reduced motion; every helper degrades to a cut. */
  readonly enabled = signal(true);

  constructor() {
    gsap.registerPlugin(
      ScrollTrigger,
      Observer,
      Flip,
      CustomEase,
      ScrambleTextPlugin,
      MotionPathPlugin,
      SplitText,
      Draggable,
    );

    // ── Named eases ──────────────────────────────────────────────────────────
    // A camera settling on its subject: fast departure, long quiet landing.
    CustomEase.create('bmGlide', 'M0,0 C0.12,0.72 0.16,1 1,1');
    // Surfaces arriving — slightly overshoots so cards feel physical.
    CustomEase.create('bmArrive', 'M0,0 C0.2,0.9 0.24,1.06 1,1');
    // Instrument readouts: decisive, no bounce, used for data and numbers.
    CustomEase.create('bmInstrument', 'M0,0 C0.4,0 0,1 1,1');
    // Sweeps across the viewport — the route curtain and the map reticle.
    CustomEase.create('bmSweep', 'M0,0 C0.66,0 0.1,1 1,1');

    gsap.defaults({ ease: 'bmGlide', duration: 0.72 });

    // ScrollTrigger caches element positions when a trigger is created. Web
    // fonts land after that, and Manrope is enough heavier than the fallback to
    // shift a page by tens of pixels — which would leave triggers armed at the
    // wrong scroll offsets and, in the worst case, content that never reveals.
    this.document.fonts?.ready.then(() => ScrollTrigger.refresh());

    const view = this.document.defaultView;
    const query = view?.matchMedia?.('(prefers-reduced-motion: reduce)');

    if (query) {
      this.enabled.set(!query.matches);
      query.addEventListener('change', (event) => this.enabled.set(!event.matches));
    }
  }

  /**
   * A timeline that respects the motion preference.
   *
   * When motion is off the timeline still runs — so `onComplete` callbacks and
   * any state they flip still happen — but every tween collapses to zero, which
   * leaves elements at their end values instead of stranded mid-animation.
   */
  timeline(vars: gsap.TimelineVars = {}): gsap.core.Timeline {
    const timeline = gsap.timeline(vars);

    if (!this.enabled()) timeline.timeScale(1000);

    return timeline;
  }

  /**
   * Scopes selector-based animations to one host element and reverts them all
   * when the caller is destroyed. Returns the context so callers can `revert()`
   * early if they need to.
   */
  context(scope: Element, build: (self: gsap.Context) => void): gsap.Context {
    return gsap.context(build, scope);
  }

  /** Sets final-state properties without animating — safe under reduced motion. */
  set(target: gsap.TweenTarget, vars: gsap.TweenVars): void {
    gsap.set(target, vars);
  }

  /** `gsap.to`, silenced to an instant set when motion is off. */
  to(target: gsap.TweenTarget, vars: gsap.TweenVars): gsap.core.Tween {
    if (!this.enabled()) return gsap.to(target, { ...vars, duration: 0, delay: 0 });

    return gsap.to(target, vars);
  }

  /** `gsap.from`, silenced to a no-op when motion is off. */
  from(target: gsap.TweenTarget, vars: gsap.TweenVars): gsap.core.Tween {
    if (!this.enabled()) return gsap.to(target, { clearProps: 'all', duration: 0 });

    return gsap.from(target, vars);
  }

  /** `gsap.fromTo`, snapping straight to the end state when motion is off. */
  fromTo(
    target: gsap.TweenTarget,
    from: gsap.TweenVars,
    to: gsap.TweenVars,
  ): gsap.core.Tween {
    if (!this.enabled()) return gsap.to(target, { ...to, duration: 0, delay: 0 });

    return gsap.fromTo(target, from, to);
  }

  /**
   * Splits an element's text into per-word and per-character spans for
   * typographic reveals.
   *
   * GSAP ships SplitText, but it rewrites the DOM on every resize and pulls in
   * a second measurement pass; for headline-sized runs of text a one-shot split
   * is both smaller and more predictable. The original text is preserved on the
   * element so it can be restored.
   */
  splitChars(element: HTMLElement): HTMLElement[] {
    const original = element.dataset['bmText'] ?? element.textContent ?? '';
    element.dataset['bmText'] = original;

    const fragment = this.document.createDocumentFragment();
    const characters: HTMLElement[] = [];

    for (const word of original.split(/(\s+)/)) {
      if (!word) continue;

      if (/^\s+$/.test(word)) {
        fragment.appendChild(this.document.createTextNode(word));
        continue;
      }

      const wordSpan = this.document.createElement('span');
      wordSpan.className = 'bm-split-word';

      for (const character of Array.from(word)) {
        const charSpan = this.document.createElement('span');
        charSpan.className = 'bm-split-char';
        charSpan.textContent = character;
        wordSpan.appendChild(charSpan);
        characters.push(charSpan);
      }

      fragment.appendChild(wordSpan);
    }

    element.textContent = '';
    element.appendChild(fragment);

    return characters;
  }

  /** Restores an element split by {@link splitChars} to plain text. */
  restoreText(element: HTMLElement): void {
    const original = element.dataset['bmText'];
    if (original === undefined) return;

    element.textContent = original;
    delete element.dataset['bmText'];
  }

  /** Kills every ScrollTrigger a destroyed view left behind. */
  refreshScroll(): void {
    ScrollTrigger.refresh();
  }
}
