import { Injectable, inject } from '@angular/core';
import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';

import { PreferencesStore } from './preferences';

gsap.registerPlugin(CustomEase);

// The same three curves as the CSS tokens, so GSAP choreography and CSS transitions agree.
CustomEase.create('bm-standard', '0.2, 0, 0, 1');
CustomEase.create('bm-emphasized', '0.05, 0.7, 0.1, 1');
CustomEase.create('bm-exit', '0.3, 0, 0.8, 0.15');

gsap.defaults({ ease: 'bm-emphasized', duration: 0.4 });

/**
 * The single entry point for scripted motion.
 *
 * Every helper collapses to an instant state change when reduced motion is on, so callers never
 * have to check for it themselves.
 */
@Injectable({ providedIn: 'root' })
export class Motion {
  private readonly preferences = inject(PreferencesStore);

  get reduced(): boolean {
    return this.preferences.reducedMotion();
  }

  /** Rolls a number from its previous value to the next, formatted on every frame. */
  countTo(element: HTMLElement, to: number, format: (value: number) => string, from = 0): void {
    if (this.reduced || from === to) {
      element.textContent = format(to);
      return;
    }
    const counter = { value: from };
    gsap.to(counter, {
      value: to,
      duration: Math.min(0.9, 0.35 + Math.log10(Math.abs(to - from) + 1) * 0.15),
      ease: 'bm-standard',
      overwrite: true,
      onUpdate: () => {
        element.textContent = format(counter.value);
      },
    });
  }

  to(target: gsap.TweenTarget, vars: gsap.TweenVars): gsap.core.Tween {
    return gsap.to(target, this.reduced ? { ...vars, duration: 0, delay: 0, stagger: 0 } : vars);
  }

  fromTo(target: gsap.TweenTarget, from: gsap.TweenVars, to: gsap.TweenVars): gsap.core.Tween {
    return gsap.fromTo(target, from, this.reduced ? { ...to, duration: 0, delay: 0, stagger: 0 } : to);
  }
}
