import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormField, TreeValidationResult, email, form, maxLength, required, submit } from '@angular/forms/signals';
import { QueryClient } from '@tanstack/angular-query-experimental';
import { toast } from 'ngx-sonner';

import { ApiError } from '../../core/api/api-error';
import { MailingApi } from '../../core/api/mailing.api';
import { ConsentMode, MailingList, Subscriber } from '../../core/api/mailing.models';
import { keys } from '../../core/query/keys';
import { Haptics } from '../../core/ui/haptics';
import { Button } from '../../ui/button/button';
import { MessageStrip } from '../../ui/feedback/feedback';
import { ChoiceCards, ChoiceOption } from '../../ui/form/choice-cards';
import { Field, Input } from '../../ui/form/field';
import { Switch } from '../../ui/form/toggles';
import { Icon } from '../../ui/icon/icon';
import { CONSENT, CONSENT_ORDER } from './audience-presentation';

const CONSENT_OPTIONS: ChoiceOption<ConsentMode>[] = CONSENT_ORDER.map((value) => ({ value, ...CONSENT[value] }));

/** A new list: what it is called, what it is for, and how people get onto it. */
@Component({
  selector: 'bm-list-dialog',
  imports: [FormField, Icon, Button, Field, Input, MessageStrip, Switch],
  template: `
    <form class="bm-dialog audience-dialog" novalidate (submit)="save($event)">
      <div class="audience-dialog__icon" aria-hidden="true"><svg lucideIcon="megaphone" [size]="22"></svg></div>
      <h2 class="bm-dialog__title">New mailing list</h2>
      <p class="bm-dialog__text">A list is one audience with its own subscribers and campaigns. People can be on several lists.</p>

      @if (problem(); as message) {
        <bm-message-strip tone="negative">{{ message }}</bm-message-strip>
      }

      <div class="audience-dialog__fields">
        <bm-field label="Name" hint="How subscribers see it, in emails and on the sign-up page." [control]="form.name">
          <input bmInput autocomplete="off" [formField]="form.name" />
          <span bmMeta class="audience-dialog__count">{{ model().name.length }}/120</span>
        </bm-field>

        <bm-field label="What it is for" optional [control]="form.description">
          <textarea bmInput rows="3" [formField]="form.description" placeholder="Monthly notes for the surveyors working in Lombardy"></textarea>
          <span bmMeta class="audience-dialog__count">{{ model().description.length }}/500</span>
        </bm-field>

        <div class="audience-dialog__switches">
          <div class="audience-dialog__switch">
            <bm-switch [formField]="form.doubleOptIn">Ask new addresses to confirm</bm-switch>
            <p>Anyone who joins gets a link first, and receives nothing until they click it. Recommended.</p>
          </div>
          <div class="audience-dialog__switch">
            <bm-switch [formField]="form.publicSignup">Open a public sign-up page</bm-switch>
            <p>A page anyone with the link can use to join. You can open or close it later.</p>
          </div>
        </div>
      </div>

      <div class="bm-dialog__actions">
        <button bmButton type="button" variant="ghost" (click)="ref.close()">Cancel</button>
        <button bmButton type="submit" variant="primary" [loading]="saving()">
          <svg lucideIcon="plus"></svg>
          Create the list
        </button>
      </div>
    </form>
  `,
  styleUrl: './audience-dialogs.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListDialog {
  protected readonly ref = inject<DialogRef<MailingList>>(DialogRef);
  private readonly api = inject(MailingApi);
  private readonly queries = inject(QueryClient);
  private readonly haptics = inject(Haptics);

  protected readonly model = signal({ name: '', description: '', doubleOptIn: true, publicSignup: false });
  protected readonly form = form(this.model, (path) => {
    required(path.name, { message: 'Give the list a name people will recognise.' });
    maxLength(path.name, 120);
    maxLength(path.description, 500);
  });

  protected readonly saving = signal(false);
  protected readonly problem = signal<string | null>(null);

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    if (this.saving()) return;
    this.saving.set(true);
    this.problem.set(null);
    try {
      await submit(this.form, async () => {
        try {
          const { name, description, doubleOptIn, publicSignup } = this.model();
          const list = await this.api.createList({ name: name.trim(), description: description.trim() || undefined, doubleOptIn, publicSignup });
          this.haptics.success();
          toast.success('List created', { description: list.name });
          this.queries.setQueryData(keys.mailing.list(list.id), list);
          void this.queries.invalidateQueries({ queryKey: keys.mailing.all, predicate: (query) => query.queryKey[1] !== 'list' });
          this.ref.close(list);
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
    if (failure.status === 409) return [{ kind: 'server', message: 'Another list already has this name.', fieldTree: this.form.name }];
    this.problem.set(failure.message);
    return undefined;
  }
}

export interface SubscriberDialogData {
  list: MailingList;
}

/** One address, added by hand, with an honest answer to whether its owner agreed. */
@Component({
  selector: 'bm-subscriber-dialog',
  imports: [FormField, Icon, Button, Field, Input, MessageStrip, ChoiceCards],
  template: `
    <form class="bm-dialog audience-dialog" novalidate (submit)="save($event)">
      <div class="audience-dialog__icon" aria-hidden="true"><svg lucideIcon="user-plus" [size]="22"></svg></div>
      <h2 class="bm-dialog__title">Add someone to {{ data.list.name }}</h2>
      <p class="bm-dialog__text">For a whole spreadsheet of addresses, import it instead.</p>

      @if (problem(); as message) {
        <bm-message-strip tone="negative">{{ message }}</bm-message-strip>
      }

      <div class="audience-dialog__fields">
        <bm-field label="Email address" [control]="form.email">
          <svg bmPrefix lucideIcon="at-sign"></svg>
          <input bmInput type="email" autocomplete="off" autocapitalize="none" spellcheck="false" [formField]="form.email" />
        </bm-field>

        <div class="audience-dialog__row">
          <bm-field label="First name" optional [control]="form.firstName">
            <input bmInput autocomplete="off" [formField]="form.firstName" />
          </bm-field>
          <bm-field label="Last name" optional [control]="form.lastName">
            <input bmInput autocomplete="off" [formField]="form.lastName" />
          </bm-field>
        </div>

        <bm-choice-cards legend="Did they agree to receive this list?" [options]="consentOptions" [formField]="form.consent" />
      </div>

      <div class="bm-dialog__actions">
        <button bmButton type="button" variant="ghost" (click)="ref.close()">Cancel</button>
        <button bmButton type="submit" variant="primary" [loading]="saving()">
          <svg [lucideIcon]="model().consent === 'CONFIRMED' ? 'user-plus' : 'send'"></svg>
          {{ model().consent === 'CONFIRMED' ? 'Add them' : 'Add and send the link' }}
        </button>
      </div>
    </form>
  `,
  styleUrl: './audience-dialogs.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubscriberDialog {
  protected readonly data = inject<SubscriberDialogData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<Subscriber>>(DialogRef);
  private readonly api = inject(MailingApi);
  private readonly queries = inject(QueryClient);
  private readonly haptics = inject(Haptics);

  protected readonly consentOptions = CONSENT_OPTIONS;

  protected readonly model = signal({ email: '', firstName: '', lastName: '', consent: 'REQUEST_CONFIRMATION' as ConsentMode });
  protected readonly form = form(this.model, (path) => {
    required(path.email, { message: 'Enter the address to add.' });
    email(path.email, { message: 'That does not look like an email address.' });
    maxLength(path.email, 254);
    maxLength(path.firstName, 80);
    maxLength(path.lastName, 80);
  });

  protected readonly saving = signal(false);
  protected readonly problem = signal<string | null>(null);

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    if (this.saving()) return;
    this.saving.set(true);
    this.problem.set(null);
    try {
      await submit(this.form, async () => {
        try {
          const { email, firstName, lastName, consent } = this.model();
          const subscriber = await this.api.addSubscriber(this.data.list.id, {
            email: email.trim(),
            firstName: firstName.trim() || undefined,
            lastName: lastName.trim() || undefined,
            consent,
          });
          this.haptics.success();
          toast.success(consent === 'CONFIRMED' ? 'Added to the list' : 'Added, and the confirmation link is on its way', { description: subscriber.email });
          this.queries.setQueryData(keys.mailing.subscriber(subscriber.listId, subscriber.id), subscriber);
          void this.queries.invalidateQueries({ queryKey: keys.mailing.all, predicate: (query) => query.queryKey[1] !== 'subscriber' });
          this.ref.close(subscriber);
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
    if (failure.status === 409) return [{ kind: 'server', message: 'This address is already on the list.', fieldTree: this.form.email }];
    if (failure.violations.some((violation) => violation.field === 'email')) {
      return [{ kind: 'server', message: 'That address was refused as invalid.', fieldTree: this.form.email }];
    }
    this.problem.set(failure.message);
    return undefined;
  }
}
