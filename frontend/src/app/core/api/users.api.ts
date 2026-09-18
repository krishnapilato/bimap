import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { Page, PageRequest } from './common.models';
import { iamUrl, pageParams } from './http-helpers';
import {
  AccountStatusChange,
  CreateUserRequest,
  UpdateUserRequest,
  User,
  UserQuery,
  UserStatistics,
} from './iam.models';

/** `/api/v1/users` — the account directory and its lifecycle. */
@Injectable({ providedIn: 'root' })
export class UsersApi {
  private readonly http = inject(HttpClient);
  private readonly base = iamUrl('/api/v1/users');

  me(): Promise<User> {
    return firstValueFrom(this.http.get<User>(`${this.base}/me`));
  }

  search(query: UserQuery, page: PageRequest): Promise<Page<User>> {
    return firstValueFrom(
      this.http.get<Page<User>>(this.base, { params: pageParams(page, { q: query.q, status: query.status }) }),
    );
  }

  statistics(): Promise<UserStatistics> {
    return firstValueFrom(this.http.get<UserStatistics>(`${this.base}/statistics`));
  }

  findOne(id: string): Promise<User> {
    return firstValueFrom(this.http.get<User>(`${this.base}/${id}`));
  }

  create(request: CreateUserRequest): Promise<User> {
    return firstValueFrom(this.http.post<User>(this.base, request));
  }

  update(id: string, request: UpdateUserRequest): Promise<User> {
    return firstValueFrom(this.http.patch<User>(`${this.base}/${id}`, request));
  }

  changeStatus(id: string, change: AccountStatusChange): Promise<User> {
    return firstValueFrom(this.http.put<User>(`${this.base}/${id}/status`, change));
  }

  delete(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}/${id}`));
  }
}
