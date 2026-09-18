import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormField, email, form, required, submit, validate } from '@angular/forms/signals';
import { addDays, addMinutes, format, nextMonday, setHours, setMinutes } from 'date-fns';

import { ApiError } from '../../core/api/api-error';
import { MailingApi } from '../../core/api/mailing.api';
import { Campaign } from '../../core/api/mailing.models';
import { SessionStore } from '../../core/auth/session.store';
import { dateTime } from '../../core/ui/format';
import { Button } from '../../ui/button/button';
import { MessageStrip } from '../../ui/feedback/feedback';
import { Field, Input } from '../../ui/form/field';
import { Icon } from '../../ui/icon/icon';

const LOCAL_FORMAT = "yyyy-MM-dd'T'HH:mm";

export interface ScheduleDialogData {
  campaign: Campaign;
  recipients: number;
}

/** When a campaign should go out: a few sensible moments one tap away, or any future time. */
@Component({
  selector: 'bm-schedule-dialog',
  imports: [FormField, Icon, Button, Field, Input, MessageStrip],
  template: `
    <form class="bm-dialog campaign-dialog" novalidate (submit)="save($event)">
      <div class="campaign-dialog__icon" aria-hidden="true"><svg lucideIcon="calendar-clock" [size]="22"></svg></div>
      <h2 class="bm-dialog__title">Schedule the campaign</h2>
      <p class="bm-dialog__text">It goes to everyone subscribed at that moment, currently {{ data.recipients }} {{ data.recipients === 1 ? 'person' : 'people' }}. Until then it can still be edited or moved back to drafts.</p>

      @if (problem(); as message) {
        <bm-message-strip tone="negative">{{ message }}</bm-message-strip>
      }

      <div class="campaign-dialog__picks" role="group" aria-label="Suggested times">
        @for (pick of picks; track pick.label; let i = $index) {
          <button type="button" class="campaign-dialog__pick" [class.is-selected]="model().when === pick.value" [style.--bm-i]="i" (click)="choose(pick.value)">
            <strong>{{ pick.label }}</strong>
            <span>{{ pick.hint }}</span>
          </button>
        }
      </div>

      <bm-field label="Or choose a time" [hint]="'Your time zone: ' + zone" [control]="form.when">
        <svg bmPrefix lucideIcon="calendar"></svg>
        <input bmInput type="datetime-local" [min]="minimum" [formField]="form.when" />
      </bm-field>

      <div class="bm-dialog__actions">
        <button bmButton type="button" variant="ghost" (click)="ref.close()">Cancel</button>
        <button bmButton type="submit" variant="primary" [loading]="saving()">
          <svg lucideIcon="calendar-clock"></svg>
          {{ chosen() ? 'Schedule for ' + chosen() : 'Schedule' }}
        </button>
      </div>
    </form>
  `,
  styleUrl: './campaign-dialogs.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleDialog {
  protected readonly data = inject<ScheduleDialogData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<Campaign>>(DialogRef);
  private readonly api = inject(MailingApi);

  protected readonly zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  protected readonly minimum = format(new Date(), LOCAL_FORMAT);

  protected readonly picks = (() => {
    const now = new Date();
    const later = addMinutes(now, 60);
    const inAnHour = setMinutes(later, Math.ceil(later.getMinutes() / 15) * 15);
    const tomorrow = setMinutes(setHours(addDays(now, 1), 9), 0);
    const monday = setMinutes(setHours(nextMonday(now), 9), 0);
    return [
      { label: 'In about an hour', hint: format(inAnHour, 'HH:mm'), value: format(inAnHour, LOCAL_FORMAT) },
      { label: 'Tomorrow morning', hint: format(tomorrow, 'EEE d MMM, HH:mm'), value: format(tomorrow, LOCAL_FORMAT) },
      { label: 'Next Monday', hint: format(monday, 'EEE d MMM, HH:mm'), value: format(monday, LOCAL_FORMAT) },
    ];
  })();

  protected readonly model = signal({
    when: this.data.campaign.scheduledAt ? format(new Date(this.data.campaign.scheduledAt), LOCAL_FORMAT) : '',
  });

  protected readonly form = form(this.model, (path) => {
    required(path.when, { message: 'Choose when it goes out.' });
    validate(path.when, ({ value }) =>
      value() && new Date(value()).getTime() < Date.now() + 60_000 ? { kind: 'past', message: 'Choose a time in the future.' } : undefined,
    );
  });

  protected readonly chosen = computed(() => {
    const when = this.model().when;
    return when && !Number.isNaN(new Date(when).getTime()) ? dateTime(new Date(when).toISOString()) : '';
  });

  protected readonly saving = signal(false);
  protected readonly problem = signal<string | null>(null);

  protected choose(value: string): void {
    this.model.set({ when: value });
    this.form.when().markAsTouched();
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    if (this.saving()) return;
    this.saving.set(true);
    this.problem.set(null);
    try {
      await submit(this.form, async () => {
        try {
          const { campaign } = this.data;
          const updated = await this.api.scheduleCampaign(campaign.listId, campaign.id, new Date(this.model().when).toISOString());
          this.ref.close(updated);
        } catch (error) {
          this.problem.set(ApiError.from(error).message);
        }
        return undefined;
      });
    } finally {
      this.saving.set(false);
    }
  }
}

/** Sends one copy to an inbox of your choice, with your own name in the merge tags. */
@Component({
  selector: 'bm-test-send-dialog',
  imports: [FormField, Icon, Button, Field, Input, MessageStrip],
  template: `
    <form class="bm-dialog campaign-dialog" novalidate (submit)="send($event)">
      <div class="campaign-dialog__icon" aria-hidden="true"><svg lucideIcon="mail-check" [size]="22"></svg></div>
      <h2 class="bm-dialog__title">Send a test</h2>
      <p class="bm-dialog__text">One copy of the saved version, marked as a test in the subject. Merge tags are filled with your own name, and nobody on the list receives anything.</p>

      @if (problem(); as message) {
        <bm-message-strip tone="negative">{{ message }}</bm-message-strip>
      }

      <bm-field label="Send it to" [control]="form.to">
        <svg bmPrefix lucideIcon="at-sign"></svg>
        <input bmInput type="email" autocomplete="email" autocapitalize="none" spellcheck="false" [formField]="form.to" />
      </bm-field>

      <div class="bm-dialog__actions">
        <button bmButton type="button" variant="ghost" (click)="ref.close()">Cancel</button>
        <button bmButton type="submit" variant="primary" [loading]="sending()">
          <svg lucideIcon="send"></svg>
          Send the test
        </button>
      </div>
    </form>
  `,
  styleUrl: './campaign-dialogs.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestSendDialog {
  protected readonly data = inject<{ campaign: Campaign }>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<string>>(DialogRef);
  private readonly api = inject(MailingApi);

  protected readonly model = signal({ to: inject(SessionStore).user()?.email ?? '' });
  protected readonly form = form(this.model, (path) => {
    required(path.to, { message: 'Enter the address the test goes to.' });
    email(path.to, { message: 'That does not look like an email address.' });
  });

  protected readonly sending = signal(false);
  protected readonly problem = signal<string | null>(null);

  protected async send(event: Event): Promise<void> {
    event.preventDefault();
    if (this.sending()) return;
    this.sending.set(true);
    this.problem.set(null);
    try {
      await submit(this.form, async () => {
        try {
          const { campaign } = this.data;
          const to = this.model().to.trim();
          await this.api.testCampaign(campaign.listId, campaign.id, to);
          this.ref.close(to);
        } catch (error) {
          this.problem.set(ApiError.from(error).message);
        }
        return undefined;
      });
    } finally {
      this.sending.set(false);
    }
  }
}
