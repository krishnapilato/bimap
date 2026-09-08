/**
 * The email log, in the browser.
 *
 * @author Khova Krishna Pilato
 */

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { EmailApi } from '../adapters';
import { ComposeEmail, EmailMessage } from '../models';
import { emails, respond, saveEmails } from './mock-store';

/** The same test the server applies: a tag with a known name and a closing bracket. */
const MARKUP = /<([a-z][a-z0-9]*)\b[^>]*>/i;

@Injectable()
export class MockEmailAdapter implements EmailApi {
  history(): Observable<readonly EmailMessage[]> {
    return respond([...emails()].sort((a, b) => b.sentAt.localeCompare(a.sentAt)));
  }

  send(message: ComposeEmail): Observable<EmailMessage> {
    // An address nobody could deliver to fails, so the failed state is reachable in a demo.
    const undeliverable = /^(no-such|bounce|invalid)/i.test(message.to);

    const sent: EmailMessage = {
      id: `m-${Date.now()}`,
      to: message.to,
      subject: message.subject,
      // Derived, exactly as the server derives it, so both modes agree about the same message.
      format: MARKUP.test(message.body) ? 'HTML' : 'TEXT',
      body: message.body,
      attachments: message.attachments.map(({ filename, contentType, sizeBytes }) => ({
        filename,
        contentType,
        sizeBytes,
      })),
      status: undeliverable ? 'FAILED' : 'SENT',
      failureReason: undeliverable ? '550 5.1.1 Recipient address rejected: User unknown' : null,
      sentAt: new Date().toISOString(),
    };

    saveEmails([sent, ...emails()]);
    return respond(sent);
  }
}
