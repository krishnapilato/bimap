import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  booleanAttribute,
  computed,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';

import { AuthService } from '../../auth/auth.service';
import { MotionService } from '../../core/motion';
/**
 * The chrome shared by every authenticated page.
 *
 * Each page used to render its own header — two brand lockups, two sets of
 * action buttons, duplicated CSS. Centralising it means the bar is identical
 * everywhere and page-specific controls are projected in through the
 * `shellActions` slot.
 *
 * The bar is also where the command palette is advertised: a keyboard shortcut
 * nobody can see is a keyboard shortcut nobody uses.
 */
@Component({
  selector: 'bm-app-shell',
  standalone: true,
  imports: [RouterModule, MatIconModule, MatTooltipModule],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShellComponent {
  private readonly auth = inject(AuthService);
  //private readonly commands = inject(CommandService);
  private readonly motion = inject(MotionService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly shellBar = viewChild<ElementRef<HTMLElement>>('shellBar');

  /** Short context label shown beside the wordmark, e.g. "Administration". */
  readonly section = input<string>('');

  /** Lets a page opt out of the default max-width content frame (the map view). */
  readonly wide = input(false, { transform: booleanAttribute });

  /**
   * Full-bleed, non-scrolling: the page owns the viewport below the bar and
   * manages its own internal scrolling.
   *
   * The workspace needs this. A tool whose primary surface is a map should
   * never put that map on a scrolling page — the operator would be panning a
   * document to see the thing they are panning.
   */
  readonly flush = input(false, { transform: booleanAttribute });

  readonly user = computed(() => this.auth.loginResponseValue?.user);

  readonly isAdmin = computed(() => this.user()?.applicationRole === 'ADMINISTRATOR');

  readonly displayName = computed(() => {
    const user = this.user();
    const full = user?.fullName?.trim();

    if (full) return full;

    return [user?.name, user?.surname].filter(Boolean).join(' ').trim() || 'Signed in';
  });

  readonly initials = computed(() => {
    const user = this.user();
    const letters = `${user?.name?.trim().charAt(0) ?? ''}${user?.surname?.trim().charAt(0) ?? ''}`;

    return letters.toUpperCase() || 'U';
  });

  readonly roleLabel = computed(() => {
    const role = this.user()?.applicationRole ?? '';

    return role ? role.charAt(0) + role.slice(1).toLowerCase() : '';
  });

  /** Name and role, for the avatar's tooltip and its accessible name. */
  readonly identityTooltip = computed(() => {
    const role = this.roleLabel();

    return role ? `${this.displayName()} · ${role}` : this.displayName();
  });

  constructor() {
    afterNextRender(() => this.playEntrance());
  }

  /**
   * The bar drops in ahead of the page it frames, so the workspace assembles
   * from its chrome inward rather than everything appearing at once.
   */
  private playEntrance(): void {
    const bar = this.shellBar()?.nativeElement;

    if (!bar || !this.motion.enabled()) return;

    const timeline = this.motion
      .timeline()
      .from(bar, { y: -22, opacity: 0, duration: 0.7, ease: 'bmGlide' })
      .from(
        bar.querySelectorAll('.shell-rail > *'),
        { opacity: 0, y: -10, duration: 0.5, stagger: 0.06 },
        '-=0.4',
      );

    this.destroyRef.onDestroy(() => timeline.kill());
  }
}
