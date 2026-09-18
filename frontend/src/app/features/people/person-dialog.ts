import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormField, TreeValidationResult, email, form, maxLength, required, submit } from '@angular/forms/signals';
import { QueryClient } from '@tanstack/angular-query-experimental';
import { toast } from 'ngx-sonner';

import { ApiError } from '../../core/api/api-error';
import { ApplicationRole, User } from '../../core/api/iam.models';
import { UsersApi } from '../../core/api/users.api';
import { keys } from '../../core/query/keys';
import { Haptics } from '../../core/ui/haptics';
import { Button } from '../../ui/button/button';
import { MessageStrip } from '../../ui/feedback/feedback';
import { Field, Input } from '../../ui/form/field';
import { Icon } from '../../ui/icon/icon';
import { ROLE } from '../../ui/status/status-tones';

export interface PersonDialogData {
  /** Absent to invite someone new. */
  user?: User;
}

const ROLES: ApplicationRole[] = ['USER', 'MANAGER', 'ADMINISTRATOR'];

/**
 * Invite someone, or change who they are and what they may do. An invitation creates the account
 * without a password and emails a link to choose one, so no password ever passes through here.
 */
@Component({
  selector: 'bm-person-dialog',
  imports: [FormField, Icon, Button, Field, Input, MessageStrip],
  template: `
    <form class="bm-dialog person-dialog" novalidate (submit)="save($event)">
      <div class="person-dialog__icon" aria-hidden="true">
        <svg [lucideIcon]="editing ? 'user-cog' : 'user-plus'" [size]="22"></svg>
      </div>
      <h2 class="bm-dialog__title">{{ editing ? 'Edit ' + data.user!.fullName : 'Invite someone' }}</h2>
      <p class="bm-dialog__text">
        @if (editing) {
          Changes to the role apply the next time they sign in.
        } @else {
          They get an email with a link to choose their own password and activate the account.
        }
      </p>

      @if (problem(); as message) {
        <bm-message-strip tone="negative">{{ message }}</bm-message-strip>
      }

      <div class="person-dialog__fields">
        <div class="person-dialog__row">
          <bm-field label="First name" [control]="form.firstName">
            <input bmInput autocomplete="off" [formField]="form.firstName" />
          </bm-field>
          <bm-field label="Last name" [control]="form.lastName">
            <input bmInput autocomplete="off" [formField]="form.lastName" />
          </bm-field>
        </div>

        <bm-field label="Email address" [control]="form.email">
          <svg bmPrefix lucideIcon="at-sign"></svg>
          <input bmInput type="email" autocomplete="off" autocapitalize="none" spellcheck="false" [formField]="form.email" />
        </bm-field>

        <fieldset class="person-dialog__roles">
          <legend>Role</legend>
          @for (role of roles; track role; let i = $index) {
            <label class="person-dialog__role" [class.is-selected]="model().role === role" [style.--bm-i]="i">
              <input type="radio" name="role" [value]="role" [checked]="model().role === role" (change)="setRole(role)" />
              <span class="person-dialog__role-icon"><svg [lucideIcon]="roleInfo[role].icon" [size]="17"></svg></span>
              <span class="person-dialog__role-text">
                <strong>{{ roleInfo[role].label }}</strong>
                <span>{{ roleInfo[role].description }}</span>
              </span>
              <span class="person-dialog__role-check" aria-hidden="true"><svg lucideIcon="check" [size]="13" [strokeWidth]="3"></svg></span>
            </label>
          }
        </fieldset>
      </div>

      <div class="bm-dialog__actions">
        <button bmButton type="button" variant="ghost" (click)="ref.close()">Cancel</button>
        <button bmButton type="submit" variant="primary" [loading]="saving()">
          <svg [lucideIcon]="editing ? 'check' : 'send'"></svg>
          {{ editing ? 'Save changes' : 'Send the invitation' }}
        </button>
      </div>
    </form>
  `,
  styles: `
    .person-dialog { width: 100%; }
    .person-dialog__icon { display: grid; place-items: center; width: 44px; height: 44px; margin-bottom: 14px; border-radius: 14px; background: var(--bm-accent-soft); color: var(--bm-accent); animation: bm-pop 360ms var(--bm-ease-spring) 80ms both; }
    .person-dialog__fields { display: grid; gap: 14px; margin-top: 18px; }
    .person-dialog__row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    @media (max-width: 600px) { .person-dialog__row { grid-template-columns: minmax(0, 1fr); } }
    .person-dialog__roles { display: grid; gap: 8px; margin: 0; padding: 0; border: 0; }
    .person-dialog__roles legend { margin-bottom: 6px; font: var(--bm-text-caption); font-weight: 650; color: var(--bm-text-2); }
    .person-dialog__role {
      position: relative; display: flex; align-items: center; gap: 12px; padding: 10px 12px; cursor: pointer;
      border: 1px solid var(--bm-border); border-radius: var(--bm-radius-md); background: var(--bm-surface);
      transition: border-color var(--bm-duration-fast) var(--bm-ease-standard), background-color var(--bm-duration-fast) var(--bm-ease-standard), box-shadow var(--bm-duration-base) var(--bm-ease-standard);
      animation: bm-rise var(--bm-duration-slow) var(--bm-ease-emphasized) both; animation-delay: calc(var(--bm-i, 0) * 50ms + 120ms);
    }
    .person-dialog__role:hover { border-color: var(--bm-border-strong); }
    .person-dialog__role:focus-within { box-shadow: 0 0 0 3px var(--bm-accent-glow); }
    .person-dialog__role.is-selected { border-color: var(--bm-accent); background: var(--bm-accent-softer); }
    .person-dialog__role input { position: absolute; opacity: 0; pointer-events: none; }
    .person-dialog__role-icon { display: grid; place-items: center; width: 34px; height: 34px; flex-shrink: 0; border-radius: 10px; background: var(--bm-surface-3); color: var(--bm-text-2); transition: background-color var(--bm-duration-base) var(--bm-ease-standard), color var(--bm-duration-base) var(--bm-ease-standard); }
    .is-selected .person-dialog__role-icon { background: var(--bm-accent); color: var(--bm-text-inverse); }
    .person-dialog__role-text { display: grid; gap: 1px; flex: 1; min-width: 0; }
    .person-dialog__role-text strong { font: var(--bm-text-subheading); }
    .person-dialog__role-text span { font: var(--bm-text-caption); font-weight: 500; color: var(--bm-text-3); }
    .person-dialog__role-check { display: grid; place-items: center; width: 20px; height: 20px; flex-shrink: 0; border-radius: 50%; border: 1.5px solid var(--bm-border-strong); color: transparent; transition: all var(--bm-duration-base) var(--bm-ease-spring); }
    .is-selected .person-dialog__role-check { border-color: var(--bm-accent); background: var(--bm-accent); color: #fff; transform: scale(1.08); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonDialog {
  protected readonly data = inject<PersonDialogData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<User>>(DialogRef);
  private readonly users = inject(UsersApi);
  private readonly queries = inject(QueryClient);
  private readonly haptics = inject(Haptics);

  protected readonly editing = !!this.data.user;
  protected readonly roles = ROLES;
  protected readonly roleInfo = ROLE;

  protected readonly model = signal({
    firstName: this.data.user?.firstName ?? '',
    lastName: this.data.user?.lastName ?? '',
    email: this.data.user?.email ?? '',
    role: this.data.user?.role ?? ('USER' as ApplicationRole),
  });

  protected readonly form = form(this.model, (path) => {
    required(path.firstName, { message: 'Enter their first name.' });
    maxLength(path.firstName, 64);
    required(path.lastName, { message: 'Enter their last name.' });
    maxLength(path.lastName, 64);
    required(path.email, { message: 'Enter the address the invitation goes to.' });
    email(path.email, { message: 'That does not look like an email address.' });
  });

  protected readonly saving = signal(false);
  protected readonly problem = signal<string | null>(null);

  protected setRole(role: ApplicationRole): void {
    this.model.update((model) => ({ ...model, role }));
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    if (this.saving()) return;
    this.saving.set(true);
    this.problem.set(null);
    try {
      await submit(this.form, async () => {
        try {
          const { firstName, lastName, email, role } = this.model();
          const request = { firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), role };
          const saved = this.editing ? await this.users.update(this.data.user!.id, request) : await this.users.create(request);
          this.haptics.success();
          toast.success(this.editing ? 'Changes saved' : 'Invitation sent', { description: saved.email });
          this.queries.setQueryData(keys.users.detail(saved.id), saved);
          void this.queries.invalidateQueries({ queryKey: keys.users.all, predicate: (query) => query.queryKey[1] !== 'detail' });
          this.ref.close(saved);
          return undefined;
        } catch (error) {
          return this.explain(error);
        }
      });
    } finally {
      this.saving.set(false);
    }
  }

  private explain(error: unknown): TreeValidationResult {
    const failure = ApiError.from(error);
    this.haptics.warning();
    if (failure.code === 'EMAIL_ALREADY_REGISTERED' || failure.status === 409) {
      return [{ kind: 'server', message: 'An account already uses this address.', fieldTree: this.form.email }];
    }
    this.problem.set(failure.message);
    return undefined;
  }
}
