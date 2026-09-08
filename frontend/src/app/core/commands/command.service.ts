import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../auth/auth.service';

/** One thing the user can do from the command palette. */
export interface Command {
  id: string;
  label: string;
  /** Secondary line — what the command will actually do. */
  hint?: string;
  /** Heading the command is filed under in the palette. */
  group: string;
  icon: string;
  /** Extra words that should match this command but are not worth showing. */
  keywords?: string;
  /** Rendered on the right, e.g. `⌘K`. */
  shortcut?: string;
  run: () => void;
}

/**
 * The registry behind the ⌘K palette.
 *
 * Global commands (navigation, session) are derived here from the current auth
 * state. Pages contribute their own through {@link register} and get a disposer
 * back, so the palette always offers exactly what the visible screen can do —
 * the workspace adds "capture position" and "clear form", the user list adds
 * "add user", and neither leaks into the other.
 */
@Injectable({ providedIn: 'root' })
export class CommandService {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  private readonly contextual = signal<ReadonlyArray<Command>>([]);

  /** Whether the palette is on screen. */
  readonly isOpen = signal(false);

  /** Page commands first: they are what the user is most likely to want. */
  readonly commands = computed<ReadonlyArray<Command>>(() => [
    ...this.contextual(),
    ...this.globalCommands(),
  ]);

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  toggle(): void {
    this.isOpen.update((open) => !open);
  }

  /**
   * Adds page-scoped commands. Call the returned function on destroy — the
   * component that owns the command is the only thing that knows when it stops
   * being possible.
   */
  register(commands: ReadonlyArray<Command>): () => void {
    this.contextual.update((current) => [...current, ...commands]);

    const ids = new Set(commands.map((command) => command.id));

    return () => this.contextual.update((current) => current.filter((c) => !ids.has(c.id)));
  }

  /** Runs a command and dismisses the palette. */
  execute(command: Command): void {
    this.close();
    command.run();
  }

  private globalCommands(): Command[] {
    const signedIn = this.auth.isLogged;
    const isAdmin = this.auth.loginResponseValue?.user?.applicationRole === 'ADMINISTRATOR';

    if (!signedIn) {
      return [
        {
          id: 'nav.home',
          label: 'Overview',
          hint: 'Back to the product overview',
          group: 'Go to',
          icon: 'home',
          run: () => this.router.navigate(['/']),
        },
        {
          id: 'nav.login',
          label: 'Sign in',
          hint: 'Open your workspace',
          group: 'Account',
          icon: 'login',
          run: () => this.router.navigate(['/login']),
        },
        {
          id: 'nav.register',
          label: 'Create an account',
          group: 'Account',
          icon: 'person_add',
          run: () => this.router.navigate(['/register']),
        },
      ];
    }

    return [
      {
        id: 'nav.workspace',
        label: 'Asset workspace',
        hint: 'Locate, verify and register an asset',
        group: 'Go to',
        icon: 'travel_explore',
        keywords: 'map register main street view',
        run: () => this.router.navigate(['/main']),
      },
      ...(isAdmin
        ? [
            {
              id: 'nav.users',
              label: 'User administration',
              hint: 'Roles, status and access',
              group: 'Go to',
              icon: 'manage_accounts',
              keywords: 'accounts admin people',
              run: () => this.router.navigate(['/listuser']),
            },
            {
              id: 'nav.adduser',
              label: 'Add user',
              hint: 'Create an account',
              group: 'Administration',
              icon: 'person_add',
              keywords: 'new account invite',
              run: () => this.router.navigate(['/adduser']),
            },
          ]
        : []),
      {
        id: 'session.logout',
        label: 'Sign out',
        hint: 'End this session',
        group: 'Account',
        icon: 'logout',
        keywords: 'log out exit leave',
        run: () => this.router.navigate(['/logout']),
      },
    ];
  }
}
