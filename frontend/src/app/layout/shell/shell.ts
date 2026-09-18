import { CdkMenu, CdkMenuItem, CdkMenuItemRadio, CdkMenuTrigger } from '@angular/cdk/menu';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  afterRenderEffect,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChildren,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { injectIsFetching } from '@tanstack/angular-query-experimental';
import { filter, map } from 'rxjs';

import { DEMO_CONTROLS } from '../../core/app-mode';
import { ApplicationRole } from '../../core/api/iam.models';
import { SessionStore } from '../../core/auth/session.store';
import { SignOut } from '../../core/auth/sign-out';
import { Connectivity } from '../../core/ui/connectivity';
import { Haptics } from '../../core/ui/haptics';
import { Immersive } from '../../core/ui/immersive';
import { MotionPreference, PreferencesStore } from '../../core/ui/preferences';
import { Viewport } from '../../core/ui/viewport';
import { Avatar } from '../../ui/avatar/avatar';
import { Button } from '../../ui/button/button';
import { Icon } from '../../ui/icon/icon';
import { Ripple } from '../../ui/interaction/ripple';
import { ROLE } from '../../ui/status/status-tones';
import { Tooltip } from '../../ui/tooltip/tooltip';
import { CommandPalette } from '../command-palette/command-palette';
import { NAVIGATION, NavItem } from './navigation';

/**
 * The frame around every signed-in screen.
 *
 * Desktop gets a full side navigation that folds into a rail; tablets get the rail; phones get a
 * bottom bar within thumb's reach, with the less frequent destinations behind "More". The page
 * itself is the only thing that transitions when you move between sections.
 */
@Component({
  selector: 'bm-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    Icon,
    CdkMenuTrigger,
    CdkMenu,
    CdkMenuItem,
    CdkMenuItemRadio,
    Avatar,
    Button,
    Ripple,
    Tooltip,
    CommandPalette,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'bm-shell',
    '[class.is-collapsed]': 'collapsed()',
    '[class.is-handset]': 'viewport.isHandset()',
    '[class.is-immersive]': 'immersive.active()',
  },
})
export class Shell {
  protected readonly sessions = inject(SessionStore);
  protected readonly viewport = inject(Viewport);
  protected readonly connectivity = inject(Connectivity);
  protected readonly demo = inject(DEMO_CONTROLS, { optional: true });
  protected readonly immersive = inject(Immersive);
  private readonly preferences = inject(PreferencesStore);
  private readonly signOut = inject(SignOut);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly haptics = inject(Haptics);

  protected readonly roles: ApplicationRole[] = ['ADMINISTRATOR', 'MANAGER', 'USER'];

  protected readonly motionOptions: ReadonlyArray<{ value: MotionPreference; label: string; icon: string }> = [
    { value: 'system', label: 'Match this device', icon: 'monitor' },
    { value: 'full', label: 'Full', icon: 'sparkles' },
    { value: 'reduced', label: 'Reduced', icon: 'pause' },
  ];
  protected readonly motion = computed(() => this.preferences.value().motion);
  protected readonly roleInfo = ROLE;

  private readonly fetching = injectIsFetching();
  private readonly busySince = signal<number | null>(null);
  protected readonly busy = signal(false);

  protected readonly moreOpen = signal(false);

  protected readonly allowed = computed(() => {
    this.sessions.user();
    return NAVIGATION.filter((item) => item.allowed(this.sessions));
  });
  protected readonly workspace = computed(() => this.allowed().filter((item) => item.section === 'workspace'));
  protected readonly administration = computed(() => this.allowed().filter((item) => item.section === 'administration'));
  protected readonly primary = computed(() => this.allowed().filter((item) => item.primary).slice(0, 4));
  protected readonly secondary = computed(() => this.allowed().filter((item) => !this.primary().includes(item)));

  /** Tablets always get the rail; desktops get what the person chose last. */
  protected readonly collapsed = computed(() => this.viewport.isTablet() || (this.viewport.isDesktop() && this.preferences.navCollapsed()));

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly sectionTitle = computed(() => {
    this.url();
    let route = this.route.snapshot;
    while (route.firstChild) route = route.firstChild;
    return route.title ?? 'BiMap';
  });

  protected readonly moreActive = computed(() => {
    const url = this.url();
    return this.secondary().some((item) => url.startsWith(item.path)) || url.startsWith('/account');
  });

  private readonly navLinks = viewChildren<ElementRef<HTMLAnchorElement>>('navLink');
  protected readonly indicator = signal<{ top: number; height: number; visible: boolean }>({ top: 0, height: 0, visible: false });

  constructor() {
    // Moves the one indicator to whichever link is active, so it glides instead of blinking. The
    // offset is measured against the nav, which positions the indicator: `offsetTop` would be
    // relative to the link's own group and put Administration links on the wrong row.
    afterRenderEffect(() => {
      this.url();
      this.collapsed();
      const active = this.navLinks().find((link) => link.nativeElement.classList.contains('is-active'))?.nativeElement;
      const nav = active?.closest<HTMLElement>('.bm-sidenav');
      if (!active || !nav) {
        this.indicator.update((indicator) => ({ ...indicator, visible: false }));
        return;
      }
      const top = active.getBoundingClientRect().top - nav.getBoundingClientRect().top + nav.scrollTop - nav.clientTop;
      this.indicator.set({ top, height: active.offsetHeight, visible: true });
    });

    // The activity bar only appears for requests that take long enough to notice.
    effect(() => {
      const fetching = this.fetching() > 0;
      untracked(() => {
        if (fetching && this.busySince() === null) {
          this.busySince.set(Date.now());
          setTimeout(() => this.busy.set(this.fetching() > 0), 180);
        } else if (!fetching) {
          this.busySince.set(null);
          this.busy.set(false);
        }
      });
    });

    effect(() => {
      this.url();
      untracked(() => this.moreOpen.set(false));
    });

    // Full screen belongs to the workspace it was opened in; leaving that section ends it.
    let section: string | null = null;
    effect(() => {
      const next = this.url().split(/[?#]/)[0].split('/')[1] ?? '';
      untracked(() => {
        if (section !== null && section !== next && this.immersive.active()) void this.immersive.exit();
        section = next;
      });
    });
  }

  protected setMotion(motion: MotionPreference): void {
    this.preferences.set('motion', motion);
  }

  protected toggleCollapsed(): void {
    this.preferences.set('navCollapsed', !this.preferences.navCollapsed());
  }

  protected toggleMore(): void {
    this.haptics.tap();
    this.moreOpen.update((open) => !open);
  }

  protected isActive(item: NavItem): boolean {
    const url = this.url().split('?')[0];
    return item.exact ? url === item.path : url === item.path || url.startsWith(`${item.path}/`);
  }

  protected newRegistration(): void {
    void this.router.navigate(['/survey']);
  }

  protected async leave(): Promise<void> {
    await this.signOut.run();
  }
}
