import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { Page, PageRequest } from './common.models';
import { iamUrl, pageParams, queryParams } from './http-helpers';
import {
  Campaign,
  CampaignRequest,
  CampaignStatus,
  GrowthPoint,
  MailingList,
  MailingListRequest,
  MailingListStatus,
  MailingListUpdate,
  MailingOverview,
  Subscriber,
  SubscriberImportReport,
  SubscriberImportRequest,
  SubscriberRequest,
  SubscriptionStatus,
} from './mailing.models';
import { DeliveryStatus, SentEmail } from './notification.models';

/** `/api/v1/mailing-lists` — lists, the people on them, and the campaigns sent to them. */
@Injectable({ providedIn: 'root' })
export class MailingApi {
  private readonly http = inject(HttpClient);
  private readonly base = iamUrl('/api/v1/mailing-lists');

  overview(): Promise<MailingOverview> {
    return firstValueFrom(this.http.get<MailingOverview>(`${this.base}/overview`));
  }

  lists(query: { q?: string; status?: MailingListStatus }, page: PageRequest): Promise<Page<MailingList>> {
    return firstValueFrom(this.http.get<Page<MailingList>>(this.base, { params: pageParams(page, query) }));
  }

  list(listId: string): Promise<MailingList> {
    return firstValueFrom(this.http.get<MailingList>(`${this.base}/${listId}`));
  }

  createList(request: MailingListRequest): Promise<MailingList> {
    return firstValueFrom(this.http.post<MailingList>(this.base, request));
  }

  updateList(listId: string, update: MailingListUpdate): Promise<MailingList> {
    return firstValueFrom(this.http.patch<MailingList>(`${this.base}/${listId}`, update));
  }

  changeListStatus(listId: string, status: MailingListStatus): Promise<MailingList> {
    return firstValueFrom(this.http.put<MailingList>(`${this.base}/${listId}/status`, { status }));
  }

  deleteList(listId: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}/${listId}`));
  }

  growth(listId: string, days = 30): Promise<GrowthPoint[]> {
    return firstValueFrom(
      this.http.get<GrowthPoint[]>(`${this.base}/${listId}/growth`, { params: queryParams({ days }) }),
    );
  }

  // ── Subscribers ────────────────────────────────────────────────────────────

  subscribers(
    listId: string,
    query: { q?: string; status?: SubscriptionStatus },
    page: PageRequest,
  ): Promise<Page<Subscriber>> {
    return firstValueFrom(
      this.http.get<Page<Subscriber>>(`${this.base}/${listId}/subscribers`, { params: pageParams(page, query) }),
    );
  }

  subscriber(listId: string, subscriberId: string): Promise<Subscriber> {
    return firstValueFrom(this.http.get<Subscriber>(`${this.base}/${listId}/subscribers/${subscriberId}`));
  }

  addSubscriber(listId: string, request: SubscriberRequest): Promise<Subscriber> {
    return firstValueFrom(this.http.post<Subscriber>(`${this.base}/${listId}/subscribers`, request));
  }

  importSubscribers(listId: string, request: SubscriberImportRequest): Promise<SubscriberImportReport> {
    return firstValueFrom(
      this.http.post<SubscriberImportReport>(`${this.base}/${listId}/subscribers/import`, request),
    );
  }

  exportSubscribers(listId: string, status?: SubscriptionStatus): Promise<Blob> {
    return firstValueFrom(
      this.http.get(`${this.base}/${listId}/subscribers/export`, {
        params: queryParams({ status }),
        responseType: 'blob',
      }),
    );
  }

  updateSubscriber(
    listId: string,
    subscriberId: string,
    names: { firstName?: string; lastName?: string },
  ): Promise<Subscriber> {
    return firstValueFrom(
      this.http.patch<Subscriber>(`${this.base}/${listId}/subscribers/${subscriberId}`, names),
    );
  }

  changeSubscriberStatus(
    listId: string,
    subscriberId: string,
    status: SubscriptionStatus,
    reason?: string,
  ): Promise<Subscriber> {
    return firstValueFrom(
      this.http.put<Subscriber>(`${this.base}/${listId}/subscribers/${subscriberId}/status`, { status, reason }),
    );
  }

  resendConfirmation(listId: string, subscriberId: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(`${this.base}/${listId}/subscribers/${subscriberId}/confirmation`, null),
    );
  }

  removeSubscriber(listId: string, subscriberId: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}/${listId}/subscribers/${subscriberId}`));
  }

  // ── Campaigns ──────────────────────────────────────────────────────────────

  campaigns(listId: string, status: CampaignStatus | undefined, page: PageRequest): Promise<Page<Campaign>> {
    return firstValueFrom(
      this.http.get<Page<Campaign>>(`${this.base}/${listId}/campaigns`, { params: pageParams(page, { status }) }),
    );
  }

  campaign(listId: string, campaignId: string): Promise<Campaign> {
    return firstValueFrom(this.http.get<Campaign>(`${this.base}/${listId}/campaigns/${campaignId}`));
  }

  createCampaign(listId: string, request: CampaignRequest): Promise<Campaign> {
    return firstValueFrom(this.http.post<Campaign>(`${this.base}/${listId}/campaigns`, request));
  }

  updateCampaign(listId: string, campaignId: string, request: Partial<CampaignRequest>): Promise<Campaign> {
    return firstValueFrom(
      this.http.patch<Campaign>(`${this.base}/${listId}/campaigns/${campaignId}`, request),
    );
  }

  deleteCampaign(listId: string, campaignId: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}/${listId}/campaigns/${campaignId}`));
  }

  duplicateCampaign(listId: string, campaignId: string): Promise<Campaign> {
    return firstValueFrom(
      this.http.post<Campaign>(`${this.base}/${listId}/campaigns/${campaignId}/duplicate`, null),
    );
  }

  scheduleCampaign(listId: string, campaignId: string, sendAt: string): Promise<Campaign> {
    return firstValueFrom(
      this.http.post<Campaign>(`${this.base}/${listId}/campaigns/${campaignId}/schedule`, { sendAt }),
    );
  }

  unscheduleCampaign(listId: string, campaignId: string): Promise<Campaign> {
    return firstValueFrom(
      this.http.post<Campaign>(`${this.base}/${listId}/campaigns/${campaignId}/unschedule`, null),
    );
  }

  sendCampaign(listId: string, campaignId: string): Promise<Campaign> {
    return firstValueFrom(this.http.post<Campaign>(`${this.base}/${listId}/campaigns/${campaignId}/send`, null));
  }

  cancelCampaign(listId: string, campaignId: string): Promise<Campaign> {
    return firstValueFrom(
      this.http.post<Campaign>(`${this.base}/${listId}/campaigns/${campaignId}/cancel`, null),
    );
  }

  testCampaign(listId: string, campaignId: string, to: string): Promise<SentEmail> {
    return firstValueFrom(
      this.http.post<SentEmail>(`${this.base}/${listId}/campaigns/${campaignId}/test`, { to }),
    );
  }

  deliveries(
    listId: string,
    campaignId: string,
    status: DeliveryStatus | undefined,
    page: PageRequest,
  ): Promise<Page<SentEmail>> {
    return firstValueFrom(
      this.http.get<Page<SentEmail>>(`${this.base}/${listId}/campaigns/${campaignId}/deliveries`, {
        params: pageParams(page, { status }),
      }),
    );
  }
}
