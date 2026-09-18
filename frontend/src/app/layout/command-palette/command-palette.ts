import { DialogRef } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';

import { GeoApi } from '../../core/api/geo.api';
import { RegistrationsApi } from '../../core/api/registrations.api';
import { UsersApi } from '../../core/api/users.api';
import { SessionStore } from '../../core/auth/session.store';
import { bindShortcuts } from '../../core/ui/shortcuts';
import { Viewport } from '../../core/ui/viewport';
import { Icon } from '../../ui/icon/icon';
import { Dialogs } from '../../ui/overlay/dialog';
import { REGISTRATION_STATUS } from '../../ui/status/status-tones';
import { NAVIGATION } from '../shell/navigation';

interface Command {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: string;
  keywords?: string;
  run: () => void;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/**
 * Everything in two keystrokes: jump to a section, start an action, or find a registration, a
 * comune or a person by typing a few letters of it. `⌘K` or `Ctrl K` from anywhere.
 */
@Component({
  selector: 'bm-command-palette-dialog',
  imports: [Icon],
  templateUrl: './command-palette.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandPaletteDialog {
  private readonly ref = inject(DialogRef);
  private readonly router = inject(Router);
  private readonly sessions = inject(SessionStore);
  private readonly registrations = inject(RegistrationsApi);
  private readonly geo = inject(GeoApi);
  private readonly users = inject(UsersApi);

  private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('input');
  private readonly list = viewChild.required<ElementRef<HTMLElement>>('list');

  protected readonly query = signal('');
  protected readonly active = signal(0);
  protected readonly searching = signal(false);
  private readonly remote = signal<Command[]>([]);
  private searchTimer: ReturnType<typeof setTimeout> | undefined;
  private searchToken = 0;

  private readonly staticCommands = computed<Command[]>(() => {
    const go = (path: string) => () => this.go(path);
    const navigation = NAVIGATION.filter((item) => item.allowed(this.sessions)).map((item) => ({
      id: `nav:${item.id}`,
      group: 'Go to',
      label: item.label,
      hint: item.description,
      icon: item.icon,
      run: go(item.path),
    }));

    const actions: Command[] = [];
    if (this.sessions.can('registration:write')) {
      actions.push({ id: 'act:survey', group: 'Actions', label: 'New registration', hint: 'Open the survey workspace', icon: 'map-pin-plus', keywords: 'create add asset', run: go('/survey') });
    }
    if (this.sessions.can('user:write')) {
      actions.push({ id: 'act:invite', group: 'Actions', label: 'Invite someone', hint: 'Create an account and send the invitation', icon: 'user-plus', keywords: 'user create people', run: () => this.go('/people', { invite: 1 }) });
    }
    if (this.sessions.isAtLeast('ADMINISTRATOR')) {
      actions.push({ id: 'act:compose', group: 'Actions', label: 'Compose an email', hint: 'Send a message now', icon: 'send', keywords: 'mail message write', run: () => this.go('/mail', { compose: 1 }) });
    }
    if (this.sessions.can('mailing:write')) {
      actions.push({ id: 'act:list', group: 'Actions', label: 'New mailing list', icon: 'megaphone', keywords: 'audience subscribers', run: () => this.go('/audiences', { create: 1 }) });
    }
    actions.push({ id: 'act:account', group: 'Actions', label: 'Change your password', icon: 'key-round', keywords: 'security account', run: go('/account') });
    return [...navigation, ...actions];
  });

  protected readonly results = computed(() => {
    const words = this.query().toLowerCase().split(/\s+/).filter(Boolean);
    const local = this.staticCommands().filter((command) => {
      const haystack = `${command.label} ${command.hint ?? ''} ${command.keywords ?? ''}`.toLowerCase();
      return words.every((word) => haystack.includes(word));
    });
    return [...local, ...this.remote()];
  });

  protected readonly groups = computed(() => {
    const groups = new Map<string, Array<Command & { index: number }>>();
    this.results().forEach((command, index) => {
      if (!groups.has(command.group)) groups.set(command.group, []);
      groups.get(command.group)!.push({ ...command, index });
    });
    return [...groups.entries()].map(([name, items]) => ({ name, items }));
  });

  constructor() {
    afterNextRender(() => this.input().nativeElement.focus());

    effect(() => {
      const count = this.results().length;
      if (this.active() >= count) this.active.set(Math.max(count - 1, 0));
    });

    inject(DestroyRef).onDestroy(() => clearTimeout(this.searchTimer));
  }

  protected type(text: string): void {
    this.query.set(text);
    this.active.set(0);
    clearTimeout(this.searchTimer);
    if (text.trim().length < 2) {
      this.remote.set([]);
      this.searching.set(false);
      return;
    }
    this.searching.set(true);
    this.searchTimer = setTimeout(() => void this.searchRemote(text.trim()), 220);
  }

  protected move(event: Event, delta: number): void {
    event.preventDefault();
    const count = this.results().length;
    if (!count) return;
    this.active.set((this.active() + delta + count) % count);
    queueMicrotask(() =>
      this.list().nativeElement.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' }),
    );
  }

  protected runActive(event: Event): void {
    event.preventDefault();
    this.results()[this.active()]?.run();
  }

  protected close(): void {
    this.ref.close();
  }

  private async searchRemote(text: string): Promise<void> {
    const token = ++this.searchToken;
    const found: Command[] = [];
    const tasks: Array<Promise<void>> = [];

    if (this.sessions.can('registration:read')) {
      tasks.push(
        this.registrations.search({ q: text }, { page: 0, size: 5 }).then((page) => {
          for (const registration of page.content) {
            found.push({
              id: `reg:${registration.id}`,
              group: 'Registrations',
              label: registration.assetName,
              hint: `${registration.fullAddress}, ${registration.municipality} · ${REGISTRATION_STATUS[registration.status].label}`,
              icon: 'landmark',
              run: () => this.go(`/registry/${registration.id}`),
            });
          }
        }),
      );
    }

    tasks.push(
      this.geo.municipalities(text, {}, 5).then((places) => {
        for (const place of places) {
          found.push({
            id: `geo:${place.istatCode}`,
            group: 'Places',
            label: place.name,
            hint: `${place.province ?? ''} (${place.provinceCode ?? ''}) · ISTAT ${place.istatCode}`,
            icon: 'map-pin',
            run: () => this.go('/geography', { istat: place.istatCode }),
          });
        }
      }),
    );

    if (this.sessions.can('user:read')) {
      tasks.push(
        this.users.search({ q: text }, { page: 0, size: 4 }).then((page) => {
          for (const user of page.content) {
            found.push({
              id: `user:${user.id}`,
              group: 'People',
              label: user.fullName,
              hint: user.email,
              icon: 'user-round',
              run: () => this.go(`/people/${user.id}`),
            });
          }
        }),
      );
    }

    await Promise.allSettled(tasks);
    if (token !== this.searchToken) return;

    const order = ['Registrations', 'Places', 'People'];
    this.remote.set(found.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group)));
    this.searching.set(false);
  }

  private go(path: string, queryParams?: Record<string, unknown>): void {
    this.ref.close();
    void this.router.navigate([path], { queryParams });
  }
}

/** The trigger in the top bar, and the keyboard shortcut that works everywhere. */
@Component({
  selector: 'bm-command-palette',
  imports: [Icon],
  template: `
    @if (viewport.isHandset()) {
      <button type="button" class="bm-command-trigger is-compact" aria-label="Search and commands" (click)="open()">
        <svg lucideIcon="search" [size]="20"></svg>
      </button>
    } @else {
      <button type="button" class="bm-command-trigger" (click)="open()">
        <svg lucideIcon="search" [size]="16"></svg>
        <span class="bm-command-trigger__text">Search registrations, places, people…</span>
        <kbd>{{ shortcut }}</kbd>
      </button>
    }
  `,
  styleUrl: './command-palette.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandPalette {
  protected readonly viewport = inject(Viewport);
  private readonly dialogs = inject(Dialogs);
  protected readonly shortcut = isMac ? '⌘K' : 'Ctrl K';
  private opened: DialogRef<unknown, CommandPaletteDialog> | null = null;

  constructor() {
    const unsubscribe = bindShortcuts({
      '$mod+KeyK': (event) => {
        event.preventDefault();
        this.open();
      },
    });
    inject(DestroyRef).onDestroy(unsubscribe);
  }

  open(): void {
    if (this.opened) return;
    const ref = this.dialogs.open<unknown, unknown, CommandPaletteDialog>(CommandPaletteDialog, {
      width: '640px',
      maxWidth: 'calc(100vw - 24px)',
      panelClass: 'bm-command-pane',
      ariaLabel: 'Search and commands',
    });
    this.opened = ref;
    ref.closed.subscribe(() => (this.opened = null));
  }
}
