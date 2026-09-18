import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormField, TreeValidationResult, email, form, maxLength, required, submit } from '@angular/forms/signals';
import { QueryClient } from '@tanstack/angular-query-experimental';
import { toast } from 'ngx-sonner';

import { ApiError } from '../../core/api/api-error';
import { SentEmail } from '../../core/api/notification.models';
import { NotificationsApi } from '../../core/api/notifications.api';
import { keys } from '../../core/query/keys';
import { readAsBase64 } from '../../core/ui/files';
import { formatBytes } from '../../core/ui/format';
import { Haptics } from '../../core/ui/haptics';
import { Button } from '../../ui/button/button';
import { MessageStrip } from '../../ui/feedback/feedback';
import { Field, Input } from '../../ui/form/field';
import { Segmented, SegmentOption } from '../../ui/form/segmented';
import { MailFrame } from '../../shared/mail/mail-frame';
import { isMarkup, messageDocument } from '../../shared/mail/mail-render';
import { Icon } from '../../ui/icon/icon';

export interface ComposerData {
  to?: string;
  subject?: string;
  body?: string;
  /** How many files the message being sent again had, since the log does not keep them. */
  attachmentsLost?: number;
}

/** The IAM service accepts ten files; the size limit is ours, kept well under what mail servers take. */
const MAX_FILES = 10;
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * A message written by hand and sent at once. The body can be prose or markup, and the preview
 * shows which one the server will decide it is. Files are read in the browser and travel with the
 * request, so nothing is uploaded until Send is pressed.
 */
@Component({
  selector: 'bm-composer-dialog',
  imports: [FormField, Icon, Button, MessageStrip, Field, Input, Segmented, MailFrame],
  template: `
    <form class="bm-dialog composer" novalidate (submit)="send($event)">
      <div class="composer__head">
        <span class="composer__icon" aria-hidden="true"><svg lucideIcon="send" [size]="20"></svg></span>
        <div>
          <h2 class="bm-dialog__title">Write a message</h2>
          <p class="bm-dialog__text">It goes out at once from the platform's address, and is kept in the delivery log.</p>
        </div>
      </div>

      @if (data.attachmentsLost) {
        <bm-message-strip icon="paperclip">The original had {{ data.attachmentsLost }} {{ data.attachmentsLost === 1 ? 'attachment' : 'attachments' }}. The log does not keep files, so add them again if they should go with this copy.</bm-message-strip>
      }
      @if (problem(); as message) {
        <bm-message-strip tone="negative">{{ message }}</bm-message-strip>
      }

      <div class="composer__fields">
        <bm-field label="To" [control]="form.to">
          <svg bmPrefix lucideIcon="at-sign"></svg>
          <input bmInput type="email" autocomplete="off" autocapitalize="none" spellcheck="false" [formField]="form.to" />
        </bm-field>
        <bm-field label="Subject" [control]="form.subject">
          <input bmInput autocomplete="off" [formField]="form.subject" />
        </bm-field>

        <div class="composer__body">
          <div class="composer__body-bar">
            <bm-segmented size="sm" ariaLabel="Write or preview" [options]="panes" [value]="pane()" (valueChange)="pane.set($event)" />
            <span class="composer__format" [class.is-markup]="markup()">
              <svg [lucideIcon]="markup() ? 'code' : 'type'" [size]="13"></svg>
              {{ markup() ? 'Sent as HTML' : 'Sent as plain text' }}
            </span>
          </div>
          @if (pane() === 'write') {
            <textarea
              class="composer__textarea"
              [class.is-markup]="markup()"
              [class.has-error]="form.body().touched() && form.body().invalid()"
              aria-label="Message"
              placeholder="Write the message. Plain text is sent as written; include HTML tags to send formatted mail."
              [formField]="form.body"
            ></textarea>
            @if (form.body().touched() && form.body().invalid()) {
              <p class="composer__error" animate.enter="bm-enter-fade">{{ form.body().errors()[0]?.message }}</p>
            }
          } @else {
            <div class="composer__preview" animate.enter="bm-enter-fade">
              <bm-mail-frame label="Message preview" [html]="preview()" [minHeight]="240" />
            </div>
          }
        </div>

        <div class="composer__files">
          <div
            class="composer__drop"
            role="button"
            tabindex="0"
            [class.is-dragging]="dragging()"
            (click)="fileInput.click()"
            (keydown.enter)="fileInput.click()"
            (keydown.space)="$event.preventDefault(); fileInput.click()"
            (dragover)="over($event)"
            (dragleave)="dragging.set(false)"
            (drop)="drop($event)"
          >
            <input #fileInput type="file" multiple class="bm-visually-hidden" tabindex="-1" (change)="picked($event)" (click)="$event.stopPropagation()" />
            <svg lucideIcon="paperclip" [size]="16"></svg>
            <span><strong>Attach files</strong> or drop them here</span>
            <span class="composer__limit">{{ files().length }}/{{ maxFiles }} · {{ formatBytes(totalBytes()) }} of {{ formatBytes(maxBytes) }}</span>
          </div>
          @if (files().length) {
            <ul class="composer__file-list">
              @for (file of files(); track file; let i = $index) {
                <li animate.enter="bm-enter-rise" animate.leave="bm-leave-collapse">
                  <svg lucideIcon="file-text" [size]="15"></svg>
                  <span class="composer__file-name">{{ file.name }}</span>
                  <span class="composer__file-size">{{ formatBytes(file.size) }}</span>
                  <button type="button" bmButton variant="ghost" size="sm" iconOnly [attr.aria-label]="'Remove ' + file.name" (click)="remove(i)">
                    <svg lucideIcon="x"></svg>
                  </button>
                </li>
              }
            </ul>
          }
        </div>
      </div>

      <div class="bm-dialog__actions">
        <button bmButton type="button" variant="ghost" (click)="ref.close()">Cancel</button>
        <button bmButton type="submit" variant="primary" [loading]="sending()">
          <svg lucideIcon="send"></svg>
          Send
        </button>
      </div>
    </form>
  `,
  styleUrl: './composer-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComposerDialog {
  protected readonly data = inject<ComposerData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<SentEmail>>(DialogRef);
  private readonly api = inject(NotificationsApi);
  private readonly queries = inject(QueryClient);
  private readonly haptics = inject(Haptics);

  protected readonly formatBytes = formatBytes;
  protected readonly maxFiles = MAX_FILES;
  protected readonly maxBytes = MAX_BYTES;

  protected readonly model = signal({ to: this.data.to ?? '', subject: this.data.subject ?? '', body: this.data.body ?? '' });
  protected readonly form = form(this.model, (path) => {
    required(path.to, { message: 'Enter the address it goes to.' });
    email(path.to, { message: 'That does not look like an email address.' });
    maxLength(path.to, 320);
    required(path.subject, { message: 'Write a subject line.' });
    maxLength(path.subject, 255);
    required(path.body, { message: 'The message is empty.' });
    maxLength(path.body, 100_000);
  });

  protected readonly panes: SegmentOption<'write' | 'preview'>[] = [
    { value: 'write', label: 'Write', icon: 'pencil' },
    { value: 'preview', label: 'Preview', icon: 'eye' },
  ];
  protected readonly pane = signal<'write' | 'preview'>('write');
  protected readonly markup = computed(() => isMarkup(this.model().body));
  protected readonly preview = computed(() => messageDocument(this.model().body || 'Nothing written yet.', this.model().subject));

  protected readonly files = signal<File[]>([]);
  protected readonly totalBytes = computed(() => this.files().reduce((sum, file) => sum + file.size, 0));
  protected readonly dragging = signal(false);
  protected readonly sending = signal(false);
  protected readonly problem = signal<string | null>(null);

  protected over(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected drop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    this.add(Array.from(event.dataTransfer?.files ?? []));
  }

  protected picked(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.add(Array.from(input.files ?? []));
    input.value = '';
  }

  protected remove(index: number): void {
    this.files.update((files) => files.filter((_, position) => position !== index));
  }

  protected async send(event: Event): Promise<void> {
    event.preventDefault();
    if (this.sending()) return;
    this.sending.set(true);
    this.problem.set(null);
    try {
      await submit(this.form, async () => {
        try {
          const { to, subject, body } = this.model();
          const attachments = await Promise.all(
            this.files().map(async (file) => ({ filename: file.name, contentType: file.type || 'application/octet-stream', content: await readAsBase64(file) })),
          );
          const sent = await this.api.send({ to: to.trim(), subject: subject.trim(), body, attachments });
          void this.queries.invalidateQueries({ queryKey: keys.mail.all });
          if (sent.status === 'FAILED') {
            this.haptics.warning();
            toast.error('The mail server refused it', { description: sent.failureReason ?? 'See the delivery log for details.' });
          } else {
            this.haptics.success();
            toast.success(sent.status === 'QUEUED' ? 'On its way' : 'Sent', { description: `To ${sent.to}` });
          }
          this.ref.close(sent);
          return undefined;
        } catch (error) {
          return this.explain(error);
        }
      });
    } finally {
      this.sending.set(false);
    }
  }

  private add(incoming: File[]): void {
    if (!incoming.length) return;
    const next = [...this.files(), ...incoming];
    if (next.length > MAX_FILES) {
      this.haptics.warning();
      toast.error(`Up to ${MAX_FILES} files`, { description: 'Remove some before adding more.' });
      return;
    }
    if (next.reduce((sum, file) => sum + file.size, 0) > MAX_BYTES) {
      this.haptics.warning();
      toast.error('Too large to send', { description: `Attachments can add up to ${formatBytes(MAX_BYTES)} in all.` });
      return;
    }
    this.files.set(next);
    this.haptics.tap();
  }

  private explain(error: unknown): TreeValidationResult {
    const failure = ApiError.from(error);
    this.haptics.warning();
    const field = failure.violations[0]?.field;
    if (field === 'to') return [{ kind: 'server', message: 'That address was refused.', fieldTree: this.form.to }];
    if (field === 'subject') return [{ kind: 'server', message: failure.violations[0].message, fieldTree: this.form.subject }];
    this.problem.set(failure.message);
    return undefined;
  }
}
