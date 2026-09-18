import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { Page, PageRequest } from './common.models';
import { iamUrl, pageParams } from './http-helpers';
import { DeliveryQuery, SendEmailRequest, SentEmail } from './notification.models';

/** `/api/v1/notifications` — the delivery log, and sending a message by hand. */
@Injectable({ providedIn: 'root' })
export class NotificationsApi {
  private readonly http = inject(HttpClient);
  private readonly base = iamUrl('/api/v1/notifications');

  history(query: DeliveryQuery, page: PageRequest): Promise<Page<SentEmail>> {
    return firstValueFrom(
      this.http.get<Page<SentEmail>>(this.base, {
        params: pageParams(page, { recipient: query.recipient, status: query.status }),
      }),
    );
  }

  findOne(id: string): Promise<SentEmail> {
    return firstValueFrom(this.http.get<SentEmail>(`${this.base}/${id}`));
  }

  send(request: SendEmailRequest): Promise<SentEmail> {
    return firstValueFrom(this.http.post<SentEmail>(this.base, request));
  }
}
