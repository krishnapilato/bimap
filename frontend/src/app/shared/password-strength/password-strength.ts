import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { MotionService } from '../../core/motion';

/** 0 = nothing typed, 4 = everything we ask for. */
type Score = 0 | 1 | 2 | 3 | 4;

interface Requirement {
  label: string;
  met: boolean;
}

const LEVELS: ReadonlyArray<{ label: string; hint: string }> = [
  { label: 'Enter a password', hint: 'At least 8 characters.' },
  { label: 'Weak', hint: 'Add length — 12 characters or more is the single biggest win.' },
  { label: 'Fair', hint: 'Mix in a number or a symbol.' },
  { label: 'Strong', hint: 'Good. A little more length would make it stronger still.' },
  { label: 'Excellent', hint: 'This will hold up.' },
];

/**
 * Live feedback on password quality, shown while the field is being filled.
 *
 * Registration previously failed on submit with "use 8–32 characters", after the
 * user had already committed to a password. This turns that into guidance they
 * can act on as they type: the meter fills, and the unmet requirements are the
 * only ones shown, so the list shrinks to nothing as they succeed.
 */
@Component({
  selector: 'bm-password-strength',
  standalone: true,
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="meter" #meter role="img" [attr.aria-label]="'Password strength: ' + level().label">
      @for (segment of [0, 1, 2, 3]; track segment) {
        <span class="segment" [class.is-lit]="segment < score()" [attr.data-tier]="score()"></span>
      }
    </div>

    <p class="verdict" [attr.data-tier]="score()" aria-live="polite">
      <strong #verdictLabel>{{ level().label }}</strong>
      <span>{{ level().hint }}</span>
    </p>

    @if (unmet().length) {
      <ul class="requirements" #requirements>
        @for (requirement of unmet(); track requirement.label) {
          <li>
            <mat-icon aria-hidden="true">radio_button_unchecked</mat-icon>
            {{ requirement.label }}
          </li>
        }
      </ul>
    }
  `,
  styleUrl: './password-strength.scss',
})
export class PasswordStrengthComponent {
  private readonly motion = inject(MotionService);
  private readonly meter = viewChild<ElementRef<HTMLElement>>('meter');
  private readonly verdictLabel = viewChild<ElementRef<HTMLElement>>('verdictLabel');

  readonly password = input('');

  readonly requirements = computed<Requirement[]>(() => {
    const value = this.password() ?? '';

    return [
      { label: 'At least 8 characters', met: value.length >= 8 },
      { label: '12 characters or more', met: value.length >= 12 },
      { label: 'An upper and a lower case letter', met: /[a-z]/.test(value) && /[A-Z]/.test(value) },
      { label: 'A number or a symbol', met: /[\d\W_]/.test(value) },
    ];
  });

  readonly unmet = computed(() => this.requirements().filter((requirement) => !requirement.met));

  readonly score = computed<Score>(() => {
    if (!this.password()) return 0;

    // Below the hard minimum nothing else can lift the score — an unusable
    // password should never read as "fair".
    const met = this.requirements().filter((requirement) => requirement.met).length;

    return (this.requirements()[0].met ? Math.max(met, 1) : 1) as Score;
  });

  readonly level = computed(() => LEVELS[this.password() ? this.score() : 0]);

  constructor() {
    effect(() => {
      const score = this.score();
      this.animate(score);
    });
  }

  /**
   * The newly lit segment pops rather than fading, and the verdict swaps on a
   * short vertical wipe — the two together make a change of tier feel like a
   * threshold being crossed instead of a colour drifting.
   */
  private animate(score: Score): void {
    const meter = this.meter()?.nativeElement;
    const label = this.verdictLabel()?.nativeElement;

    if (!meter || !this.motion.enabled()) return;

    const segments = meter.querySelectorAll<HTMLElement>('.segment');
    const newest = segments[score - 1];

    if (newest) {
      this.motion.fromTo(
        newest,
        { scaleX: 0.2, transformOrigin: '0 50%' },
        { scaleX: 1, duration: 0.45, ease: 'bmArrive' },
      );
    }

    if (label) {
      this.motion.fromTo(
        label,
        { yPercent: 60, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 0.35, ease: 'bmGlide' },
      );
    }
  }
}
