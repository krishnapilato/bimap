import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject, input, output } from '@angular/core';
import { QueryClient, injectQuery } from '@tanstack/angular-query-experimental';

import { ApiError } from '../../core/api/api-error';
import { Page } from '../../core/api/common.models';
import { SentEmail, TEMPLATE_LABELS } from '../../core/api/notification.models';
import { NotificationsApi } from '../../core/api/notifications.api';
import { SessionStore } from '../../core/auth/session.store';
import { keys } from '../../core/query/keys';
import { dateTime, formatBytes, relativeTime } from '../../core/ui/format';
import { Button } from '../../ui/button/button';
import { CopyButton, Property } from '../../ui/data/properties';
import { EmptyState, ErrorState, MessageStrip, Skeleton } from '../../ui/feedback/feedback';
import { Icon } from '../../ui/icon/icon';
import { StatusBadge } from '../../ui/status/status-badge';
import { DELIVERY_STATUS } from '../../ui/status/status-tones';
import { MailFrame } from '../../shared/mail/mail-frame';
import { messageDocument } from '../../shared/mail/mail-render';
import { ComposerData } from './composer-dialog';

/**
 * One message as it was sent: who it went to, what happened, the files that went with it, and the
 * message itself in a sandboxed frame. A message written by hand can be sent again from here;
 * transactional ones cannot, since their links belong to the moment they were issued.
 */
@Component({
  selector: 'bm-mail-reader',
  imports: [Icon, Button, CopyButton, Property, StatusBadge, MessageStrip, EmptyState, ErrorState, Skeleton, MailFrame],
  template: `
    <article class="reader">
      <header class="reader__bar">
        <button type="button" bmButton variant="ghost" size="sm" iconOnly aria-label="Close" (click)="closed.emit()">
          <svg lucideIcon="x"></svg>
        </button>
      </header>

      @if (query.isPending()) {
        <div class="reader__loading">
          <bm-skeleton width="70%" height="22px" />
          <bm-skeleton width="45%" height="14px" />
          <bm-skeleton height="320px" />
        </div>
      } @else if (query.isError()) {
        @if (notFound()) {
          <bm-empty-state icon="mail-x" title="This message is not on record" description="It may have been removed from the log." compact />
        } @else {
          <bm-error-state [error]="query.error()" (retry)="query.refetch()" />
        }
      } @else if (query.data(); as m) {
        <section class="reader__head">
          <div class="reader__badges">
            <bm-status [label]="status(m).label" [tone]="status(m).tone" [live]="m.status === 'QUEUED'" />
            <span class="reader__kind">
              <svg [lucideIcon]="m.template ? 'zap' : 'pencil'" [size]="13"></svg>
              {{ m.template ? (labels[m.template] ?? m.template) : 'Written by hand' }}
            </span>
          </div>
          <h2 class="reader__subject">{{ m.subject }}</h2>
          <dl class="reader__meta">
            <div>
              <dt>To</dt>
              <dd>
                <a [href]="'mailto:' + m.to">{{ m.to }}</a>
                <bm-copy-button [value]="m.to" label="Address" />
              </dd>
            </div>
            <div>
              <dt>Sent</dt>
              <dd>{{ when(m.sentAt) }}</dd>
            </div>
          </dl>
        </section>

        @if (m.status === 'FAILED') {
          <bm-message-strip tone="negative" icon="mail-x">
            <strong>The mail server did not accept it.</strong>
            @if (m.failureReason) {
              <code class="reader__reason">{{ m.failureReason }}</code>
            }
          </bm-message-strip>
        } @else if (m.status === 'QUEUED') {
          <bm-message-strip tone="critical" icon="clock">Waiting for the mail server. This page updates by itself when it is handed over.</bm-message-strip>
        }

        @if (canResend(m)) {
          <div class="reader__actions">
            <button type="button" bmButton size="sm" [variant]="m.status === 'FAILED' ? 'primary' : 'secondary'" (click)="again(m)">
              <svg [lucideIcon]="m.status === 'FAILED' ? 'rotate-ccw' : 'forward'"></svg>
              {{ m.status === 'FAILED' ? 'Try sending it again' : 'Send it again' }}
            </button>
            <button type="button" bmButton size="sm" variant="ghost" (click)="resend.emit({ to: m.to })">
              <svg lucideIcon="reply"></svg>
              Write to {{ m.to }}
            </button>
          </div>
        }

        @if (m.attachments.length) {
          <section class="reader__section">
            <h3>Attachments</h3>
            <ul class="reader__files">
              @for (file of m.attachments; track file.filename; let i = $index) {
                <li [style.--bm-i]="i">
                  <span class="reader__file-icon"><svg lucideIcon="paperclip" [size]="15"></svg></span>
                  <span class="reader__file-name">{{ file.filename }}</span>
                  <span class="reader__file-size">{{ formatBytes(file.sizeBytes) }}</span>
                </li>
              }
            </ul>
            <p class="reader__note">The log keeps the name and size of each file, not the file itself.</p>
          </section>
        }

        <section class="reader__section">
          <h3>The message</h3>
          <div class="reader__frame">
            <bm-mail-frame [label]="'Message: ' + m.subject" [html]="html()" [minHeight]="260" />
          </div>
        </section>

        <section class="reader__section">
          <h3>Record</h3>
          <dl class="bm-properties">
            <bm-property label="Format" [value]="m.format === 'HTML' ? 'HTML' : 'Plain text'" />
            <bm-property label="Reference" [value]="m.id" mono copyable />
          </dl>
        </section>
      }
    </article>
  `,
  styles: `
    .reader { display: grid; align-content: start; gap: 16px; padding: 8px 20px 28px; background: var(--bm-surface); border: 1px solid var(--bm-border); border-radius: var(--bm-radius-lg); min-height: 100%; }
    .bm-split__detail .reader { border-radius: inherit; }
    .reader__bar { display: flex; justify-content: flex-end; margin: 0 -12px -8px; }
    .reader__loading { display: grid; gap: 12px; }
    .reader__head { display: grid; gap: 10px; animation: bm-rise var(--bm-duration-slow) var(--bm-ease-emphasized) both; }
    .reader__badges { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    .reader__kind { display: inline-flex; align-items: center; gap: 5px; height: 24px; padding: 0 9px; border-radius: 999px; background: var(--bm-surface-3); font: var(--bm-text-caption); font-weight: 650; color: var(--bm-text-2); }
    .reader__subject { font: var(--bm-text-title); letter-spacing: var(--bm-tracking-tight); overflow-wrap: anywhere; }
    .reader__meta { display: grid; gap: 6px; margin: 0; }
    .reader__meta > div { display: grid; grid-template-columns: 48px minmax(0, 1fr); align-items: center; gap: 8px; }
    .reader__meta dt { font: var(--bm-text-caption); font-weight: 650; color: var(--bm-text-3); }
    .reader__meta dd { display: flex; align-items: center; gap: 4px; min-width: 0; margin: 0; font: var(--bm-text-small); color: var(--bm-text); overflow-wrap: anywhere; }
    .reader__reason { display: block; margin-top: 6px; padding: 8px 10px; border-radius: var(--bm-radius-sm); background: var(--bm-surface); font: 12px/1.5 var(--bm-font-mono); color: var(--bm-negative); overflow-wrap: anywhere; }
    .reader__actions { display: flex; flex-wrap: wrap; gap: 6px; animation: bm-rise var(--bm-duration-slow) var(--bm-ease-emphasized) 80ms both; }
    .reader__section { display: grid; gap: 10px; animation: bm-rise var(--bm-duration-slow) var(--bm-ease-emphasized) 140ms both; }
    .reader__section h3 { font: var(--bm-text-subheading); }
    .reader__files { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
    .reader__files li {
      display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 10px; padding: 8px 10px;
      border: 1px solid var(--bm-border); border-radius: var(--bm-radius-md);
      animation: bm-rise var(--bm-duration-slow) var(--bm-ease-emphasized) both; animation-delay: calc(var(--bm-i, 0) * 50ms + 180ms);
    }
    .reader__file-icon { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; background: var(--bm-surface-3); color: var(--bm-text-2); }
    .reader__file-name { font: var(--bm-text-small); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .reader__file-size { font: var(--bm-text-caption); color: var(--bm-text-3); font-variant-numeric: tabular-nums; }
    .reader__note { font: var(--bm-text-caption); font-weight: 500; color: var(--bm-text-3); }
    .reader__frame { overflow: hidden; border: 1px solid var(--bm-border); border-radius: var(--bm-radius-md); }
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MailReader {
  readonly id = input.required<string>();
  readonly closed = output<void>();
  /** Asks the page to open the composer with this draft. */
  readonly resend = output<ComposerData>();

  private readonly api = inject(NotificationsApi);
  private readonly queries = inject(QueryClient);
  private readonly sessions = inject(SessionStore);

  protected readonly labels = TEMPLATE_LABELS;
  protected readonly dateTime = dateTime;
  protected readonly formatBytes = formatBytes;

  protected readonly query = injectQuery(() => {
    const id = this.id();
    return {
      queryKey: keys.mail.detail(id),
      queryFn: () => this.api.findOne(id),
      initialData: () => this.fromLog(id),
      initialDataUpdatedAt: 0,
      refetchInterval: (state: { state: { data?: SentEmail } }) => (state.state.data?.status === 'QUEUED' ? 3000 : false),
    };
  });

  protected readonly notFound = computed(() => ApiError.from(this.query.error()).status === 404);
  protected readonly html = computed(() => {
    const message = this.query.data();
    return messageDocument(message?.body, message?.subject);
  });

  /** "2 hours ago · 17 Sep 2026, 11:02" while recent; just the date and time once it is not. */
  protected when(iso: string): string {
    const recent = Date.now() - Date.parse(iso) < 7 * 86_400_000;
    return recent ? `${relativeTime(iso)} · ${dateTime(iso)}` : dateTime(iso);
  }

  protected status(message: SentEmail) {
    return DELIVERY_STATUS[message.status];
  }

  protected canResend(message: SentEmail): boolean {
    return !message.template && !message.campaignId && this.sessions.isAtLeast('ADMINISTRATOR');
  }

  protected again(message: SentEmail): void {
    this.resend.emit({ to: message.to, subject: message.subject, body: message.body ?? '', attachmentsLost: message.attachments.length });
  }

  private fromLog(id: string): SentEmail | undefined {
    return this.queries
      .getQueriesData<Page<SentEmail>>({ queryKey: ['mail', 'list'] })
      .flatMap(([, page]) => page?.content ?? [])
      .find((message) => message.id === id);
  }
}
