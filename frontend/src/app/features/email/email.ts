/**
 * The email dispatcher.
 *
 * The log on the left, the composer on the right. There is no format to pick: you write one
 * message, and the MIME type is derived from what you actually wrote. Markup makes it text/html,
 * prose makes it text/plain, and either becomes multipart/mixed the moment a file is attached —
 * which is what a mail library would decide anyway, so asking the sender to declare it twice only
 * creates a way to get it wrong.
 *
 * The preview renders into a sandboxed iframe rather than into the page, because pasting arbitrary
 * markup straight into the DOM is how a composer becomes an XSS hole — and because an iframe is
 * the only honest preview of what a mail client will do with it.
 *
 * @author Khova Krishna Pilato
 */

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap } from 'rxjs';

import { EMAIL_API } from '../../core/api/adapters';
import { DispatchFormat, DispatchStatus, EmailAttachment } from '../../core/api/models';

const STATUS_STYLE: Record<DispatchStatus, { badge: string; icon: string }> = {
  SENT: { badge: 'badge-success', icon: 'mark_email_read' },
  QUEUED: { badge: 'badge-warning', icon: 'schedule_send' },
  FAILED: { badge: 'badge-error', icon: 'error' },
};

const STARTER_BODY = `<h1 style="font-family:sans-serif;color:#0b1524">Registrations export</h1>
<p style="font-family:sans-serif;color:#47566b;line-height:1.6">
  Hello, the export you asked for is attached.
</p>`;

/** A tag with a known name and a closing bracket. Loose enough for real markup, tight enough that
    prose containing a "<" or an arrow is still prose. */
const MARKUP = /<([a-z][a-z0-9]*)\b[^>]*>/i;

@Component({
  selector: 'bm-email',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, FormsModule],
  templateUrl: './email.html',
})
export class EmailComponent {
  readonly #email = inject(EMAIL_API);
  readonly #sanitizer = inject(DomSanitizer);

  protected readonly reloadToken = signal(0);
  protected readonly sending = signal(false);
  protected readonly failure = signal<string | null>(null);
  protected readonly justSent = signal<string | null>(null);

  protected readonly to = signal('');
  protected readonly subject = signal('');
  protected readonly body = signal(STARTER_BODY);
  protected readonly attachments = signal<EmailAttachment[]>([]);

  /** What the message turns out to be, rather than what somebody claimed it was. */
  protected readonly isHtml = computed(() => MARKUP.test(this.body()));
  protected readonly format = computed<DispatchFormat>(() => (this.isHtml() ? 'HTML' : 'TEXT'));

  protected readonly contentType = computed(() =>
    this.attachments().length > 0
      ? 'multipart/mixed'
      : this.isHtml()
        ? 'text/html'
        : 'text/plain',
  );

  /** The part list, spelled out, so the sender can see why it resolved the way it did. */
  protected readonly structure = computed(() => {
    const body = this.isHtml() ? 'text/html' : 'text/plain';
    const files = this.attachments().length;

    return files === 0 ? body : `${body} + ${files} attachment${files === 1 ? '' : 's'}`;
  });

  protected readonly canSend = computed(
    () => /.+@.+\..+/.test(this.to()) && this.subject().trim().length > 0 && !this.sending(),
  );

  readonly #history = toSignal(
    toObservable(this.reloadToken).pipe(
      switchMap(() =>
        this.#email.history().pipe(
          catchError((error) => {
            this.failure.set(reason(error));
            return of([]);
          }),
        ),
      ),
    ),
    { initialValue: null },
  );

  protected readonly messages = computed(() => this.#history() ?? []);
  protected readonly loading = computed(() => this.#history() === null);

  protected readonly sentCount = computed(
    () => this.messages().filter((message) => message.status === 'SENT').length,
  );
  protected readonly failedCount = computed(
    () => this.messages().filter((message) => message.status === 'FAILED').length,
  );

  /**
   * The preview is a data: URL in a sandboxed iframe. `bypassSecurityTrustResourceUrl` is safe
   * here precisely because the sandbox has no `allow-scripts` and no `allow-same-origin`: the
   * document cannot run anything or reach back into the application.
   */
  protected readonly preview = computed<SafeResourceUrl>(() => {
    const content = this.isHtml()
      ? this.body()
      : `<pre style="margin:0;white-space:pre-wrap;font:inherit">${escapeHtml(this.body())}</pre>`;

    const document = `<!doctype html><meta charset="utf-8">
      <base target="_blank">
      <body style="margin:0;padding:20px;background:#fff;font-family:system-ui;color:#0b1524">
      ${content}</body>`;

    return this.#sanitizer.bypassSecurityTrustResourceUrl(
      `data:text/html;charset=utf-8,${encodeURIComponent(document)}`,
    );
  });

  protected style(status: DispatchStatus) {
    return STATUS_STYLE[status];
  }

  protected async addFiles(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const chosen = await Promise.all(
      Array.from(input.files ?? []).map(async (file) => ({
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        // The server needs the bytes to attach them; the log it writes keeps only the name.
        content: await base64(file),
      })),
    );

    this.attachments.update((current) => [...current, ...chosen]);
    input.value = '';
  }

  protected removeFile(filename: string): void {
    this.attachments.update((current) => current.filter((file) => file.filename !== filename));
  }

  protected send(): void {
    if (!this.canSend()) {
      return;
    }
    this.sending.set(true);
    this.failure.set(null);
    this.justSent.set(null);

    this.#email
      .send({
        to: this.to().trim(),
        subject: this.subject().trim(),
        body: this.body(),
        attachments: this.attachments(),
      })
      .subscribe({
        next: (message) => {
          this.sending.set(false);
          this.justSent.set(
            message.status === 'FAILED'
              ? `The relay rejected ${message.to}.`
              : `Delivered to ${message.to}.`,
          );
          this.to.set('');
          this.subject.set('');
          this.attachments.set([]);
          this.reloadToken.update((value) => value + 1);
        },
        error: (error) => {
          this.sending.set(false);
          this.failure.set(reason(error));
        },
      });
  }

  protected humanBytes(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
}

/** Reads a file as base64 without the `data:` prefix the FileReader adds. */
async function base64(file: File): Promise<string> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (const byte of buffer) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>]/g,
    (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[character] ?? character,
  );
}

function reason(error: unknown): string {
  const detail = (error as { error?: { detail?: string } })?.error?.detail;
  return detail ?? 'The message could not be dispatched.';
}
