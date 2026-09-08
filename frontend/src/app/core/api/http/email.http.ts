/**
 * The delivery log and the composer, against the real service.
 *
 * `GET/POST /api/v1/notifications` is backed by the `sent_email` table in iam-service, which records
 * every transactional message as well as anything composed by hand. There is no fallback to the
 * in-browser log here: a 404 from this adapter means the route is wrong, and quietly answering with
 * invented history would hide that. Demo builds get the mock adapter instead, chosen once in
 * `api.providers.ts`.
 *
 * @author Khova Krishna Pilato
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { EmailApi } from '../adapters';
import { ComposeEmail, EmailMessage, Page } from '../models';

@Injectable()
export class HttpEmailAdapter implements EmailApi {
  readonly #http = inject(HttpClient);
  readonly #base = `${environment.iamApiUrl}/api/v1/notifications`;

  history(): Observable<readonly EmailMessage[]> {
    return this.#http
      .get<Page<EmailMessage>>(this.#base, { params: { size: 50 } })
      .pipe(map((page) => page.content));
  }

  send(message: ComposeEmail): Observable<EmailMessage> {
    return this.#http.post<EmailMessage>(this.#base, message);
  }
}
