import { TitleCasePipe } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterModule } from '@angular/router';
import { gsap } from 'gsap';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { CommandService } from '../core/commands/command.service';
import { BM_MOTION, MotionService } from '../core/motion';
import { AppShellComponent } from '../shared/app-shell/app-shell';
import { User } from '../user';
import {
  ConfirmationDialogComponent,
  ConfirmationDialogData,
} from '../shared/confirmation-dialog/confirmation-dialog';
import { UserEditDialogComponent } from './user-edit-dialog';
import { UserService } from './user-service.service';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    TitleCasePipe,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatDialogModule,
    AppShellComponent,
    ...BM_MOTION,
  ],
  templateUrl: './user-list.html',
  styleUrl: './user-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserListComponent implements OnInit, AfterViewInit {
  private readonly userService = inject(UserService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly motion = inject(MotionService);
  private readonly commands = inject(CommandService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly filterChanges = new Subject<string>();

  readonly displayedColumns = [
    'name',
    'surname',
    'email',
    'userStatus',
    'applicationRole',
    'actions',
  ] as const;

  readonly dataSource = new MatTableDataSource<User>();

  readonly paginator = viewChild(MatPaginator);
  readonly sort = viewChild(MatSort);

  /**
   * The table's own `data` array is not reactive, so the roster is also held in
   * a signal — that is what lets the stat tiles re-count themselves when a user
   * is deleted instead of silently going stale.
   */
  private readonly users = signal<ReadonlyArray<User>>([]);

  readonly stats = computed(() => {
    const users = this.users();
    const total = users.length;
    const confirmed = users.filter((user) => user.userStatus?.toLowerCase() === 'confirmed').length;
    const admins = users.filter(
      (user) => user.applicationRole?.toLowerCase() === 'administrator',
    ).length;

    // `share` drives each tile's bar. Total is the denominator the other two
    // are read against, so its bar is full whenever there is anyone at all —
    // but an empty roster must not render as a full bar reading zero.
    return [
      { label: 'Total users', value: total, share: total ? 1 : 0, icon: 'group', tone: 'neutral' },
      {
        label: 'Confirmed',
        value: confirmed,
        share: total ? confirmed / total : 0,
        icon: 'verified',
        tone: 'success',
      },
      {
        label: 'Administrators',
        value: admins,
        share: total ? admins / total : 0,
        icon: 'shield_person',
        tone: 'accent',
      },
    ];
  });

  ngOnInit(): void {
    this.userService
      .findAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((users) => {
        this.setUsers(users);
        this.changeDetector.markForCheck();
      });

    this.filterChanges
      .pipe(debounceTime(160), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((filter) => {
        this.dataSource.filter = filter;
        this.dataSource.paginator?.firstPage();
      });
  }

  constructor() {
    const dispose = this.commands.register([
      {
        id: 'users.add',
        label: 'Add a user',
        hint: 'Create a new account',
        group: 'Administration',
        icon: 'person_add',
        keywords: 'new invite create account',
        run: () => this.router.navigate(['/adduser']),
      },
    ]);

    this.destroyRef.onDestroy(dispose);

    afterNextRender(() => this.playEntrance());
  }

  ngAfterViewInit(): void {
    const paginator = this.paginator();
    const sort = this.sort();

    if (paginator) this.dataSource.paginator = paginator;
    if (sort) this.dataSource.sort = sort;
  }

  /** Keeps the reactive roster and the table's data array in step. */
  private setUsers(users: User[]): void {
    this.dataSource.data = users;
    this.users.set(users);
  }

  /**
   * The page builds top-down, then the rows cascade — a long list arriving all
   * at once is a wall, arriving in sequence it is a list.
   */
  private playEntrance(): void {
    if (!this.motion.enabled()) return;

    const context = gsap.context(() => {
      this.motion
        .timeline({ delay: 0.1 })
        .from('[data-stage]', { opacity: 0, y: 24, duration: 0.75, stagger: 0.09, ease: 'bmGlide' })
        .from('.stat', { opacity: 0, y: 18, duration: 0.6, stagger: 0.08 }, '-=0.5')
        .from(
          '.mat-mdc-row',
          { opacity: 0, x: -18, duration: 0.5, stagger: 0.035, ease: 'bmGlide' },
          '-=0.35',
        );
    }, this.host.nativeElement);

    this.destroyRef.onDestroy(() => context.revert());
  }

  applyFilter(event: Event): void {
    this.filterChanges.next((event.target as HTMLInputElement).value.trim().toLowerCase());
  }

  /** Maps a backend status onto one of the shared chip variants. */
  statusChipClass(status: string | null | undefined): string {
    switch ((status || '').trim().toLowerCase()) {
      case 'confirmed':
      case 'active':
        return 'bm-chip--success';
      case 'pending':
        return 'bm-chip--warning';
      case 'not_confirmed':
      case 'notconfirmed':
      case 'inactive':
        return 'bm-chip--danger';
      default:
        return 'bm-chip--plain';
    }
  }

  formatStatus(status: string | null | undefined): string {
    return (status || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  openEditDialog(user: User): void {
    this.dialog.open(UserEditDialogComponent, {
      data: { user, dataSource: this.dataSource },
    });
  }

  confirmSendEmail(email: string): void {
    const data: ConfirmationDialogData = {
      title: 'Send confirmation email',
      message: 'Send the account confirmation email to this address?',
      detailsLabel: 'Email address',
      details: email,
      icon: 'mark_email_unread',
      tone: 'primary',
      confirmText: 'Send email',
      cancelText: 'Cancel',
    };

    this.dialog
      .open(ConfirmationDialogComponent, { data })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.userService.sendEmail(email).subscribe({
          next: () => this.snackBar.open(`Email sent to ${email}`, 'Close', { duration: 2500 }),
          error: (err) => {
            console.error('Error sending email:', err);
            this.snackBar.open(`Could not send email to ${email}`, 'Close', { duration: 3000 });
          },
        });
      });
  }

  confirmDeleteUser(user: User): void {
    const data: ConfirmationDialogData = {
      title: 'Delete user',
      message: 'This permanently removes the account and its access.',
      detailsLabel: 'Account',
      details: `${user.name} ${user.surname} · ${user.email}`,
      icon: 'delete',
      tone: 'warn',
      confirmText: 'Delete user',
      cancelText: 'Cancel',
    };

    this.dialog
      .open(ConfirmationDialogComponent, { data })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.userService
          .delete(user.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.setUsers(this.dataSource.data.filter((u) => u.id !== user.id));
              this.changeDetector.markForCheck();
              this.snackBar.open('User deleted', 'Close', { duration: 2500 });
            },
            error: (err) => {
              console.error(err);
              this.snackBar.open('Delete failed', 'Close', { duration: 3000 });
            },
          });
      });
  }
}
