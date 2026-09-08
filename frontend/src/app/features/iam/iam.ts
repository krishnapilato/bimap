/**
 * Identity and access management.
 *
 * Cards rather than a table: a person is a face, a status and two switches, and a grid of cards
 * says that better than a row of cells. The switches write straight through — lock, unlock,
 * disable, enable — and the drawer is for the edits that need a form.
 *
 * The lifecycle rules are the server's. Illegal moves are refused there and surfaced here.
 *
 * @author Khova Krishna Pilato
 */

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, of, startWith, switchMap } from 'rxjs';

import { IAM_API } from '../../core/api/adapters';
import { MOTION_DIRECTIVES } from '../../core/motion/motion';
import { SessionService } from '../../core/session.service';
import { AccountStatus, ApplicationRole, UserAccount } from '../../core/api/models';

const STATUS_STYLE: Record<AccountStatus, { badge: string; icon: string }> = {
  ACTIVE: { badge: 'badge-success', icon: 'check_circle' },
  PENDING_ACTIVATION: { badge: 'badge-warning', icon: 'hourglass_top' },
  LOCKED: { badge: 'badge-error', icon: 'lock' },
  DISABLED: { badge: 'badge-neutral', icon: 'block' },
  DELETED: { badge: 'badge-ghost', icon: 'delete' },
};

@Component({
  selector: 'bm-iam',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ...MOTION_DIRECTIVES],
  templateUrl: './iam.html',
})
export class IamComponent {
  readonly #iam = inject(IAM_API);
  protected readonly session = inject(SessionService);

  protected readonly search = signal('');
  protected readonly statusFilter = signal<AccountStatus | null>(null);
  protected readonly reloadToken = signal(0);

  protected readonly busyId = signal<string | null>(null);
  protected readonly failure = signal<string | null>(null);

  protected readonly editing = signal<UserAccount | null>(null);
  protected readonly draft = signal({ firstName: '', lastName: '', email: '', role: 'USER' as ApplicationRole });

  protected readonly statuses: readonly AccountStatus[] = [
    'ACTIVE',
    'PENDING_ACTIVATION',
    'LOCKED',
    'DISABLED',
  ];
  protected readonly roles: readonly ApplicationRole[] = ['USER', 'MANAGER', 'ADMINISTRATOR'];

  readonly #page = toSignal(
    toObservable(
      computed(() => ({
        search: this.search(),
        status: this.statusFilter(),
        token: this.reloadToken(),
      })),
    ).pipe(
      debounceTime(200),
      distinctUntilChanged(
        (a, b) => a.search === b.search && a.status === b.status && a.token === b.token,
      ),
      switchMap(({ search, status }) =>
        this.#iam.search({ search, status: status ?? undefined, size: 60 }).pipe(
          catchError((error) => {
            this.failure.set(reason(error));
            return of(null);
          }),
        ),
      ),
      startWith(null),
    ),
    { initialValue: null },
  );

  protected readonly users = computed(() => this.#page()?.content ?? []);
  protected readonly total = computed(() => this.#page()?.totalElements ?? 0);
  protected readonly loading = computed(() => this.#page() === null);

  protected readonly stats = toSignal(
    toObservable(this.reloadToken).pipe(
      switchMap(() => this.#iam.statistics().pipe(catchError(() => of(null)))),
    ),
    { initialValue: null },
  );

  /** The statistics endpoint names its fields for people; the filter is keyed by the enum. */
  protected countFor(status: AccountStatus): number {
    const counts = this.stats();
    if (!counts) {
      return 0;
    }
    switch (status) {
      case 'ACTIVE':
        return counts.active;
      case 'PENDING_ACTIVATION':
        return counts.pendingActivation;
      case 'LOCKED':
        return counts.locked;
      case 'DISABLED':
        return counts.disabled;
      default:
        return 0;
    }
  }

  protected style(status: AccountStatus) {
    return STATUS_STYLE[status];
  }

  protected initials(user: UserAccount): string {
    return ((user.firstName[0] ?? '') + (user.lastName[0] ?? '')).toUpperCase() || '··';
  }

  /** True when the row is the signed-in account: nobody gets to lock themselves out. */
  protected isSelf(user: UserAccount): boolean {
    return this.session.user()?.email.toLowerCase() === user.email.toLowerCase();
  }

  protected toggleEnabled(user: UserAccount): void {
    this.#move(user, user.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED');
  }

  protected toggleLocked(user: UserAccount): void {
    this.#move(user, user.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED');
  }

  protected activate(user: UserAccount): void {
    this.#move(user, 'ACTIVE');
  }

  #move(user: UserAccount, status: AccountStatus): void {
    if (this.isSelf(user) || this.busyId()) {
      return;
    }
    this.busyId.set(user.id);
    this.failure.set(null);

    this.#iam.changeStatus(user.id, status).subscribe({
      next: () => {
        this.busyId.set(null);
        this.refresh();
      },
      error: (error) => {
        this.busyId.set(null);
        this.failure.set(reason(error));
      },
    });
  }

  protected openDrawer(user: UserAccount): void {
    this.editing.set(user);
    this.draft.set({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    });
  }

  protected closeDrawer(): void {
    this.editing.set(null);
  }

  protected saveDrawer(): void {
    const user = this.editing();
    if (!user) {
      return;
    }
    this.busyId.set(user.id);
    this.failure.set(null);

    this.#iam.update(user.id, this.draft()).subscribe({
      next: () => {
        this.busyId.set(null);
        this.closeDrawer();
        this.refresh();
      },
      error: (error) => {
        this.busyId.set(null);
        this.failure.set(reason(error));
      },
    });
  }

  protected refresh(): void {
    this.reloadToken.update((value) => value + 1);
  }

  protected filterBy(status: AccountStatus | null): void {
    this.statusFilter.set(this.statusFilter() === status ? null : status);
  }
}

function reason(error: unknown): string {
  const problem = (error as { error?: { detail?: string; violations?: { message: string }[] } })
    ?.error;
  return problem?.violations?.[0]?.message ?? problem?.detail ?? 'That change could not be saved.';
}
