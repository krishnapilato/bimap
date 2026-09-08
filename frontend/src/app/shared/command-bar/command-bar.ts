/**
 * The only persistent chrome: a corner, and a key.
 *
 * There is no navbar and no rail. A rail costs 3.5rem of every screen forever to serve a jump most
 * people make twice a session, and its icons repeat what the view below them already says. This
 * costs a pill in the corner, and everything else lives behind ⌘K.
 *
 * The palette lists only what the caller can actually open. Modules behind a permission are shown
 * and marked rather than hidden — a door you cannot open is information; a door that is not there
 * is confusing.
 *
 * @author Khova Krishna Pilato
 */

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';

import { SessionService } from '../../core/session.service';
import { isDemoMode } from '../../core/api/api.providers';

interface Command {
  readonly path: string;
  readonly label: string;
  readonly hint: string;
  readonly icon: string;
  /** Commands behind a permission are listed, but not offered. */
  readonly requires?: string;
}

const COMMANDS: readonly Command[] = [
  { path: '/hub', label: 'Modules', hint: 'Everything on the platform', icon: 'grid_view' },
  { path: '/geo', label: 'Geographic asset engine', hint: 'The guided cascade', icon: 'public' },
  {
    path: '/iam',
    label: 'Identity and access',
    hint: 'Accounts, roles, lifecycle',
    icon: 'group',
    requires: 'user:read',
  },
  { path: '/email', label: 'Email dispatcher', hint: 'The delivery log', icon: 'outgoing_mail' },
  { path: '/health', label: 'System health', hint: 'Both services, live', icon: 'monitor_heart' },
];

@Component({
  selector: 'bm-command-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (session.isAuthenticated()) {
      <button
        type="button"
        class="bm-corner"
        [attr.aria-expanded]="open()"
        aria-haspopup="dialog"
        aria-label="Open the command palette"
        (click)="show($event)"
      >
        <span
          class="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-[0.7rem]
                 font-bold text-primary"
        >
          {{ session.initials() }}
        </span>
        <span class="bm-reading text-label text-ink-3">{{ shortcut }}</span>
      </button>

      @if (open()) {
        <div
          class="fixed inset-0 z-50 grid place-items-start justify-center bg-ink/20 pt-[12vh]
                 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          (click)="hide()"
        >
          <div
            class="bm-panel w-[min(34rem,calc(100vw-2rem))] overflow-hidden shadow-float
                   motion-safe:animate-[palette_160ms_cubic-bezier(0.16,1,0.3,1)]"
            (click)="$event.stopPropagation()"
          >
            <div class="flex items-center gap-2 border-b border-hairline px-4 py-3">
              <span class="material-symbols-rounded text-[1.2rem] text-ink-3">search</span>
              <input
                #field
                class="w-full bg-transparent text-subtitle outline-none placeholder:text-ink-3"
                placeholder="Go to…"
                [value]="term()"
                (input)="term.set($any($event.target).value)"
                (keydown)="onKey($event)"
              />
              <kbd class="bm-reading rounded border border-hairline px-1.5 py-0.5 text-label text-ink-3">
                esc
              </kbd>
            </div>

            <ul class="max-h-[50vh] overflow-y-auto p-2">
              @for (command of matches(); track command.path; let i = $index) {
                @let locked = command.requires && !session.has(command.requires);

                <li>
                  <button
                    type="button"
                    class="bm-row"
                    [class.bm-row-active]="i === cursor()"
                    [disabled]="locked"
                    [class.opacity-40]="locked"
                    (mouseenter)="cursor.set(i)"
                    (click)="go(command)"
                  >
                    <span class="material-symbols-rounded text-[1.15rem]">{{ command.icon }}</span>
                    <span class="min-w-0 flex-1">
                      <span class="block truncate font-semibold">{{ command.label }}</span>
                      <span class="block truncate text-label text-ink-3">{{ command.hint }}</span>
                    </span>
                    @if (locked) {
                      <span class="badge badge-sm badge-ghost shrink-0 font-medium">no access</span>
                    }
                  </button>
                </li>
              } @empty {
                <li class="px-3 py-8 text-center text-ink-3">Nothing matches that.</li>
              }
            </ul>

            <div class="flex items-center gap-2 border-t border-hairline px-4 py-2">
              <span class="truncate text-label text-ink-3">
                {{ session.user()?.fullName }} · {{ session.user()?.role }}
              </span>
              @if (demo) {
                <span class="badge badge-xs badge-ghost font-semibold">DEMO</span>
              }
              <button
                type="button"
                class="btn btn-ghost btn-xs ml-auto gap-1 font-semibold text-error"
                (click)="signOut()"
              >
                <span class="material-symbols-rounded text-[1rem]">logout</span>
                Sign out
              </button>
            </div>
          </div>
        </div>
      }
    }
  `,
  styles: `
    @keyframes palette {
      from {
        opacity: 0;
        transform: translateY(-8px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
  `,
})
export class CommandBarComponent {
  protected readonly session = inject(SessionService);
  readonly #router = inject(Router);

  protected readonly demo = isDemoMode;
  protected readonly open = signal(false);
  protected readonly term = signal('');
  protected readonly cursor = signal(0);

  /** Mac says ⌘K and everyone else says Ctrl K; printing the wrong one is worse than printing none. */
  protected readonly shortcut =
    typeof navigator !== 'undefined' && /mac/i.test(navigator.platform) ? '⌘K' : 'Ctrl K';

  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');

  protected readonly matches = computed(() => {
    const term = this.term().trim().toLowerCase();
    if (term.length === 0) {
      return COMMANDS;
    }
    return COMMANDS.filter(
      (command) =>
        command.label.toLowerCase().includes(term) || command.hint.toLowerCase().includes(term),
    );
  });

  constructor() {
    effect(() => {
      if (this.open()) {
        // The field only exists once the dialog is rendered.
        queueMicrotask(() => this.field()?.nativeElement.focus());
      }
    });
  }

  protected show(event: MouseEvent): void {
    event.stopPropagation();
    this.term.set('');
    this.cursor.set(0);
    this.open.set(true);
  }

  protected hide(): void {
    this.open.set(false);
  }

  protected go(command: Command): void {
    if (command.requires && !this.session.has(command.requires)) {
      return;
    }
    this.hide();
    void this.#router.navigate([command.path]);
  }

  protected signOut(): void {
    this.hide();
    this.session.signOut();
  }

  protected onKey(event: KeyboardEvent): void {
    const rows = this.matches();

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.cursor.update((i) => (i + 1) % Math.max(1, rows.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.cursor.update((i) => (i - 1 + rows.length) % Math.max(1, rows.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const chosen = rows[this.cursor()];
      if (chosen) {
        this.go(chosen);
      }
    }
  }

  @HostListener('document:keydown', ['$event'])
  protected onShortcut(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.term.set('');
      this.cursor.set(0);
      this.open.update((value) => !value);
    } else if (event.key === 'Escape' && this.open()) {
      this.hide();
    }
  }
}
