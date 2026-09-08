/**
 * The user directory on the live IAM service.
 *
 * @author Khova Krishna Pilato
 */

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { IamApi, UserQuery } from '../adapters';
import { AccountStatus, CreateUser, Page, UpdateUser, UserAccount, UserStatistics } from '../models';

@Injectable()
export class HttpIamAdapter implements IamApi {
  readonly #http = inject(HttpClient);
  readonly #base = `${environment.iamApiUrl}/api/v1/users`;

  search(query: UserQuery): Observable<Page<UserAccount>> {
    let params = new HttpParams()
      .set('page', String(query.page ?? 0))
      .set('size', String(query.size ?? 24));

    if (query.search) {
      params = params.set('q', query.search);
    }
    if (query.status) {
      params = params.set('status', query.status);
    }
    return this.#http.get<Page<UserAccount>>(this.#base, { params });
  }

  statistics(): Observable<UserStatistics> {
    return this.#http.get<UserStatistics>(`${this.#base}/statistics`);
  }

  findOne(id: string): Observable<UserAccount> {
    return this.#http.get<UserAccount>(`${this.#base}/${id}`);
  }

  create(request: CreateUser): Observable<UserAccount> {
    return this.#http.post<UserAccount>(this.#base, request);
  }

  update(id: string, request: UpdateUser): Observable<UserAccount> {
    return this.#http.patch<UserAccount>(`${this.#base}/${id}`, request);
  }

  changeStatus(id: string, status: AccountStatus, reason?: string): Observable<UserAccount> {
    return this.#http.put<UserAccount>(`${this.#base}/${id}/status`, { status, reason });
  }

  remove(id: string): Observable<void> {
    return this.#http.delete<void>(`${this.#base}/${id}`);
  }
}
