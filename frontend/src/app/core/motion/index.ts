/**
 * BiMap motion kit.
 *
 * Import `BM_MOTION` into a standalone component's `imports` to get the whole
 * vocabulary, or pick individual directives when a component only needs one.
 */
export { MotionService } from './motion.service';
export { RevealDirective, type RevealFrom } from './reveal.directive';
export { MagneticDirective } from './magnetic.directive';
export { TiltDirective } from './tilt.directive';
export { CountUpDirective } from './count-up.directive';
export { SplitTextDirective } from './split-text.directive';
export { ParallaxDirective } from './parallax.directive';

import { CountUpDirective } from './count-up.directive';
import { MagneticDirective } from './magnetic.directive';
import { ParallaxDirective } from './parallax.directive';
import { RevealDirective } from './reveal.directive';
import { SplitTextDirective } from './split-text.directive';
import { TiltDirective } from './tilt.directive';

export const BM_MOTION = [
  RevealDirective,
  MagneticDirective,
  TiltDirective,
  CountUpDirective,
  SplitTextDirective,
  ParallaxDirective,
] as const;
