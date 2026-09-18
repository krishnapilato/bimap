import { ChangeDetectionStrategy, Component, DestroyRef, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { FormField, TreeValidationResult, form, required, submit, validate } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { toast } from 'ngx-sonner';

import { ApiError } from '../../core/api/api-error';
import { AuthApi } from '../../core/api/auth.api';
import { Permission, isStrongPassword } from '../../core/api/iam.models';
import { UsersApi } from '../../core/api/users.api';
import { SessionStore } from '../../core/auth/session.store';
import { SignOut } from '../../core/auth/sign-out';
import { keys } from '../../core/query/keys';
import { dateTime, relativeClause, relativeTime } from '../../core/ui/format';
import { Haptics } from '../../core/ui/haptics';
import { Basemap, Density, MapMode, MotionPreference, PreferencesStore } from '../../core/ui/preferences';
import { Viewport } from '../../core/ui/viewport';
import { Avatar } from '../../ui/avatar/avatar';
import { Button } from '../../ui/button/button';
import { Property } from '../../ui/data/properties';
import { MessageStrip } from '../../ui/feedback/feedback';
import { Field, Input } from '../../ui/form/field';
import { PasswordRules } from '../../ui/form/password-rules';
import { Segmented, SegmentOption } from '../../ui/form/segmented';
import { Switch } from '../../ui/form/toggles';
import { Icon } from '../../ui/icon/icon';
import { PageHeader, Panel } from '../../ui/layout/page';
import { Confirm } from '../../ui/overlay/confirm-dialog';
import { StatusBadge } from '../../ui/status/status-badge';
import { ACCOUNT_STATUS, PERMISSION, ROLE } from '../../ui/status/status-tones';

const EVERY_PERMISSION = Object.keys(PERMISSION) as Permission[];
const LINK_COOLDOWN_MS = 30_000;

/**
 * The signed-in person's own page: who they are to BiMap, what their role lets them do and what
 * it does not, how they sign in, and the choices that belong to this device rather than the account.
 */
@Component({
  selector: 'bm-account',
  imports: [FormField, RouterLink, Icon, PageHeader, Panel, Avatar, Button, Property, MessageStrip, Field, Input, PasswordRules, Segmented, Switch, StatusBadge],
  templateUrl: './account.html',
  styleUrl: './account.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Account {
  private readonly users = inject(UsersApi);
  private readonly auth = inject(AuthApi);
  private readonly signOut = inject(SignOut);
  private readonly confirm = inject(Confirm);
  private readonly haptics = inject(Haptics);
  protected readonly sessions = inject(SessionStore);
  protected readonly preferences = inject(PreferencesStore);
  protected readonly viewport = inject(Viewport);

  protected readonly statusInfo = ACCOUNT_STATUS;
  protected readonly roleInfo = ROLE;
  protected readonly dateTime = dateTime;
  protected readonly relativeTime = relativeTime;
  protected readonly relativeClause = relativeClause;

  /** The account as the server has it now, falling back to the copy kept with the session. */
  protected readonly me = injectQuery(() => ({
    queryKey: keys.me,
    queryFn: async () => {
      const user = await this.users.me();
      this.sessions.updateUser(user);
      return user;
    },
    initialData: this.sessions.user() ?? undefined,
    initialDataUpdatedAt: 0,
  }));

  protected readonly user = computed(() => this.me.data() ?? this.sessions.user());

  protected readonly permissions = computed(() => {
    const granted = new Set(this.user()?.permissions ?? []);
    return EVERY_PERMISSION.map((permission) => ({ permission, granted: granted.has(permission), ...PERMISSION[permission] })).sort(
      (a, b) => Number(b.granted) - Number(a.granted),
    );
  });

  protected readonly grantedCount = computed(() => this.permissions().filter((entry) => entry.granted).length);

  // ── Password ───────────────────────────────────────────────────────────────

  protected readonly passwords = signal({ current: '', next: '', confirm: '' });
  protected readonly passwordForm = form(this.passwords, (path) => {
    required(path.current, { message: 'Enter the password you use now.' });
    required(path.next, { message: 'Choose a new password.' });
    validate(path.next, ({ value }) => (value() && !isStrongPassword(value()) ? { kind: 'weak', message: 'Meet every rule below.' } : null));
    validate(path.next, ({ value, valueOf }) =>
      value() && value() === valueOf(path.current) ? { kind: 'same', message: 'Choose something different from the current password.' } : null,
    );
    validate(path.confirm, ({ value, valueOf }) => (value() !== valueOf(path.next) ? { kind: 'mismatch', message: 'The two new passwords do not match.' } : null));
  });
  protected readonly reveal = signal(false);
  protected readonly changing = signal(false);
  protected readonly passwordProblem = signal<string | null>(null);
  protected readonly changedAt = signal<string | null>(null);

  protected readonly linkSentAt = signal<number | null>(null);
  protected readonly sendingLink = signal(false);
  private readonly now = signal(Date.now());
  protected readonly linkCooldown = computed(() => {
    const sent = this.linkSentAt();
    return sent ? Math.max(0, Math.ceil((LINK_COOLDOWN_MS - (this.now() - sent)) / 1000)) : 0;
  });

  // ── This device ────────────────────────────────────────────────────────────

  protected readonly motionOptions: SegmentOption<MotionPreference>[] = [
    { value: 'system', label: 'Like the device', icon: 'monitor' },
    { value: 'full', label: 'Full', icon: 'sparkles' },
    { value: 'reduced', label: 'Reduced', icon: 'pause' },
  ];
  protected readonly densityOptions: SegmentOption<Density>[] = [
    { value: 'comfortable', label: 'Comfortable', icon: 'rows-3' },
    { value: 'compact', label: 'Compact', icon: 'list-checks' },
  ];
  protected readonly basemapOptions: SegmentOption<Basemap>[] = [
    { value: 'road', label: 'Road', icon: 'map' },
    { value: 'satellite', label: 'Satellite', icon: 'satellite' },
    { value: 'hybrid', label: 'Hybrid', icon: 'layers' },
    { value: 'terrain', label: 'Terrain', icon: 'mountain' },
  ];
  protected readonly modeOptions: SegmentOption<MapMode>[] = [
    { value: 'map', label: 'Map', icon: 'map' },
    { value: 'split', label: 'Split', icon: 'columns-3' },
    { value: 'street', label: 'Street View', icon: 'scan-search' },
  ];

  protected readonly motionText = computed(() => {
    const choice = this.preferences.value().motion;
    const reduced = this.preferences.reducedMotion();
    if (choice === 'system') return reduced ? 'This device asks for less motion, so movement is kept to gentle fades.' : 'This device is happy with motion, so everything moves as designed.';
    return reduced ? 'Movement is kept to gentle fades, whatever the device asks for.' : 'Every transition plays in full, whatever the device asks for.';
  });

  private cooldownTimer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearInterval(this.cooldownTimer));
  }

  protected async changePassword(event: Event): Promise<void> {
    event.preventDefault();
    if (this.changing()) return;
    this.changing.set(true);
    this.passwordProblem.set(null);
    try {
      await submit(this.passwordForm, async () => {
        try {
          const { current, next } = this.passwords();
          await this.auth.changePassword({ currentPassword: current, newPassword: next });
          this.haptics.success();
          toast.success('Password changed', { description: 'Use the new one the next time you sign in.' });
          this.passwords.set({ current: '', next: '', confirm: '' });
          this.passwordForm().reset();
          this.reveal.set(false);
          this.changedAt.set(new Date().toISOString());
          return undefined;
        } catch (error) {
          return this.explain(error);
        }
      });
    } finally {
      this.changing.set(false);
    }
  }

  /** For an account without a password: the reset link doubles as a way to choose a first one. */
  protected async sendPasswordLink(): Promise<void> {
    const email = this.user()?.email;
    if (!email || this.sendingLink() || this.linkCooldown()) return;
    this.sendingLink.set(true);
    try {
      await this.auth.forgotPassword(email);
      this.linkSentAt.set(Date.now());
      this.now.set(Date.now());
      // The countdown only needs a clock while it is counting.
      clearInterval(this.cooldownTimer);
      this.cooldownTimer = setInterval(() => {
        this.now.set(Date.now());
        if (!this.linkCooldown()) clearInterval(this.cooldownTimer);
      }, 1000);
      this.haptics.success();
      toast.success('Check your inbox', { description: `A link to choose a password is on its way to ${email}.` });
    } catch (error) {
      this.haptics.warning();
      toast.error('The link was not sent', { description: ApiError.from(error).message });
    } finally {
      this.sendingLink.set(false);
    }
  }

  protected async signOutEverywhere(): Promise<void> {
    const answer = await this.confirm.ask({
      title: 'Sign out of every device?',
      message: 'Every session ends, including this one: phones, tablets and other browsers will ask for your password or Google account again.',
      confirmLabel: 'Sign out everywhere',
      tone: 'danger',
      icon: 'log-out',
    });
    if (answer.confirmed) await this.signOut.run();
  }

  protected resetPreferences(): void {
    this.preferences.set('motion', 'system');
    this.preferences.set('density', 'comfortable');
    this.preferences.set('haptics', true);
    this.preferences.set('basemap', 'road');
    this.preferences.set('mapMode', 'map');
    this.haptics.tap();
    toast('Preferences reset', { description: 'This device is back to the defaults.' });
  }

  private explain(error: unknown): TreeValidationResult {
    const failure = ApiError.from(error);
    this.haptics.warning();
    if (failure.status === 401 || failure.code === 'INVALID_CREDENTIALS') {
      return [{ kind: 'server', message: 'That is not your current password.', fieldTree: this.passwordForm.current }];
    }
    const violation = failure.violations.find((entry) => entry.field === 'newPassword');
    if (violation) return [{ kind: 'server', message: violation.message, fieldTree: this.passwordForm.next }];
    this.passwordProblem.set(failure.message);
    return undefined;
  }
}
