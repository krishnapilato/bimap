import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { OperationResult } from './common.models';
import { iamUrl, queryParams } from './http-helpers';
import { PublicList, SubscribeRequest, Subscription } from './mailing.models';

/** `/api/v1/subscriptions` — what anyone can do from an email link, without an account. */
@Injectable({ providedIn: 'root' })
export class SubscriptionsApi {
  private readonly http = inject(HttpClient);
  private readonly base = iamUrl('/api/v1/subscriptions');

  publicList(listId: string): Promise<PublicList> {
    return firstValueFrom(this.http.get<PublicList>(`${this.base}/lists/${listId}`));
  }

  subscribe(request: SubscribeRequest): Promise<OperationResult> {
    return firstValueFrom(this.http.post<OperationResult>(this.base, request));
  }

  confirm(token: string): Promise<Subscription> {
    return firstValueFrom(this.http.post<Subscription>(`${this.base}/confirm`, { token }));
  }

  manage(token: string): Promise<Subscription> {
    return firstValueFrom(this.http.get<Subscription>(`${this.base}/manage`, { params: queryParams({ token }) }));
  }

  unsubscribe(token: string, reason?: string): Promise<Subscription> {
    return firstValueFrom(this.http.post<Subscription>(`${this.base}/unsubscribe`, { token, reason }));
  }

  resubscribe(token: string): Promise<Subscription> {
    return firstValueFrom(this.http.post<Subscription>(`${this.base}/resubscribe`, { token }));
  }
}
