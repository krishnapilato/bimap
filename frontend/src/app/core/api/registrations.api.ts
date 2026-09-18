import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { Page, PageRequest } from './common.models';
import { coreUrl, pageParams, queryParams } from './http-helpers';
import {
  FormSchema,
  Registration,
  RegistrationQuery,
  RegistrationRequest,
  RegistrationStatistics,
  RegistrationStatusChange,
  TableSchema,
} from './registry.models';

/**
 * `/api/v1/registrations` — asset registrations, their form and their table.
 *
 * Every read is scoped by the caller: without `registration:read-all` only your own come back.
 */
@Injectable({ providedIn: 'root' })
export class RegistrationsApi {
  private readonly http = inject(HttpClient);
  private readonly base = coreUrl('/api/v1/registrations');

  formSchema(): Promise<FormSchema> {
    return firstValueFrom(this.http.get<FormSchema>(`${this.base}/schema/form`));
  }

  tableSchema(): Promise<TableSchema> {
    return firstValueFrom(this.http.get<TableSchema>(`${this.base}/schema/table`));
  }

  search(query: RegistrationQuery, page: PageRequest): Promise<Page<Registration>> {
    return firstValueFrom(
      this.http.get<Page<Registration>>(this.base, { params: pageParams(page, { ...query }) }),
    );
  }

  findOne(id: string): Promise<Registration> {
    return firstValueFrom(this.http.get<Registration>(`${this.base}/${id}`));
  }

  create(request: RegistrationRequest): Promise<Registration> {
    return firstValueFrom(this.http.post<Registration>(this.base, request));
  }

  update(id: string, request: RegistrationRequest): Promise<Registration> {
    return firstValueFrom(this.http.put<Registration>(`${this.base}/${id}`, request));
  }

  changeStatus(id: string, change: RegistrationStatusChange): Promise<Registration> {
    return firstValueFrom(this.http.put<Registration>(`${this.base}/${id}/status`, change));
  }

  delete(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}/${id}`));
  }

  statistics(): Promise<RegistrationStatistics> {
    return firstValueFrom(this.http.get<RegistrationStatistics>(`${this.base}/statistics`));
  }

  /** The current filter as CSV, fetched with the bearer token rather than through a plain link. */
  exportCsv(query: RegistrationQuery): Promise<Blob> {
    return firstValueFrom(
      this.http.get(`${this.base}/export`, {
        params: queryParams({ q: query.q, region: query.region, provinceCode: query.provinceCode, status: query.status }),
        responseType: 'blob',
      }),
    );
  }
}
