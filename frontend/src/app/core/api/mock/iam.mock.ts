/**
 * The user directory, in the browser.
 *
 * Writes persist to localStorage, so locking a user in the demo survives a reload.
 *
 * @author Khova Krishna Pilato
 */

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { IamApi, UserQuery } from '../adapters';
import { AccountStatus, CreateUser, Page, UpdateUser, UserAccount, UserStatistics } from '../models';
import { fail, respond, saveUsers, users } from './mock-store';

/** Mirrors ApplicationRole.permissions() on the server. */
const PERMISSIONS: Record<string, readonly string[]> = {
  USER: ['registration:read', 'registration:write'],
  MANAGER: [
    'registration:read',
    'registration:write',
    'registration:read-all',
    'registration:export',
    'user:read',
  ],
  ADMINISTRATOR: [
    'registration:read',
    'registration:write',
    'registration:read-all',
    'registration:export',
    'user:read',
    'user:write',
    'user:lifecycle',
  ],
};

/** The same lifecycle graph the server enforces, so the demo refuses the same moves. */
const TRANSITIONS: Record<AccountStatus, readonly AccountStatus[]> = {
  PENDING_ACTIVATION: ['ACTIVE', 'DISABLED', 'DELETED'],
  ACTIVE: ['LOCKED', 'DISABLED', 'DELETED'],
  LOCKED: ['ACTIVE', 'DISABLED', 'DELETED'],
  DISABLED: ['ACTIVE', 'DELETED'],
  DELETED: [],
};

@Injectable()
export class MockIamAdapter implements IamApi {
  search(query: UserQuery): Observable<Page<UserAccount>> {
    const term = (query.search ?? '').trim().toLowerCase();
    const size = query.size ?? 24;
    const page = query.page ?? 0;

    const matching = users()
      .filter((user) => user.status !== 'DELETED')
      .filter((user) => !query.status || user.status === query.status)
      .filter(
        (user) =>
          !term ||
          user.firstName.toLowerCase().includes(term) ||
          user.lastName.toLowerCase().includes(term) ||
          user.email.toLowerCase().includes(term),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const start = page * size;
    const content = matching.slice(start, start + size);
    const totalPages = Math.max(1, Math.ceil(matching.length / size));

    return respond<Page<UserAccount>>({
      content,
      page,
      size,
      totalElements: matching.length,
      totalPages,
      first: page === 0,
      last: page >= totalPages - 1,
    });
  }

  statistics(): Observable<UserStatistics> {
    const all = users().filter((user) => user.status !== 'DELETED');
    const count = (status: AccountStatus) => all.filter((user) => user.status === status).length;

    return respond<UserStatistics>({
      total: all.length,
      active: count('ACTIVE'),
      pendingActivation: count('PENDING_ACTIVATION'),
      locked: count('LOCKED'),
      disabled: count('DISABLED'),
    });
  }

  findOne(id: string): Observable<UserAccount> {
    const found = users().find((user) => user.id === id);
    return found
      ? respond(found)
      : fail(404, 'Resource not found', `User ${id} was not found`, 'RESOURCE_NOT_FOUND');
  }

  create(request: CreateUser): Observable<UserAccount> {
    const all = users();
    if (all.some((user) => user.email.toLowerCase() === request.email.toLowerCase())) {
      return fail(
        409,
        'Email address already registered',
        'An account already exists for this email address.',
        'EMAIL_ALREADY_REGISTERED',
      );
    }

    const nowIso = new Date().toISOString();
    const created: UserAccount = {
      id: crypto.randomUUID(),
      firstName: request.firstName,
      lastName: request.lastName,
      fullName: `${request.firstName} ${request.lastName}`.trim(),
      email: request.email.toLowerCase(),
      status: 'PENDING_ACTIVATION',
      role: request.role,
      authProvider: 'LOCAL',
      permissions: PERMISSIONS[request.role] ?? PERMISSIONS['USER'],
      locale: 'it-IT',
      lastLoginAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    saveUsers([created, ...all]);
    return respond(created);
  }

  update(id: string, request: UpdateUser): Observable<UserAccount> {
    return this.#mutate(id, (user) => {
      const firstName = request.firstName ?? user.firstName;
      const lastName = request.lastName ?? user.lastName;
      const role = request.role ?? user.role;

      return {
        ...user,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim(),
        email: request.email?.toLowerCase() ?? user.email,
        role,
        permissions: PERMISSIONS[role] ?? user.permissions,
        locale: request.locale ?? user.locale,
        updatedAt: new Date().toISOString(),
      };
    });
  }

  changeStatus(id: string, status: AccountStatus): Observable<UserAccount> {
    const current = users().find((user) => user.id === id);
    if (!current) {
      return fail(404, 'Resource not found', `User ${id} was not found`, 'RESOURCE_NOT_FOUND');
    }
    if (current.status !== status && !TRANSITIONS[current.status].includes(status)) {
      return fail(
        422,
        'Business rule violated',
        `An account cannot move from ${current.status} to ${status}.`,
        'BUSINESS_RULE_VIOLATED',
      );
    }
    return this.#mutate(id, (user) => ({
      ...user,
      status,
      updatedAt: new Date().toISOString(),
    }));
  }

  remove(id: string): Observable<void> {
    saveUsers(
      users().map((user) =>
        user.id === id
          ? { ...user, status: 'DELETED' as AccountStatus, updatedAt: new Date().toISOString() }
          : user,
      ),
    );
    return respond(undefined as void);
  }

  #mutate(id: string, change: (user: UserAccount) => UserAccount): Observable<UserAccount> {
    const all = users();
    const index = all.findIndex((user) => user.id === id);
    if (index < 0) {
      return fail(404, 'Resource not found', `User ${id} was not found`, 'RESOURCE_NOT_FOUND');
    }

    const updated = change(all[index]);
    const next = [...all];
    next[index] = updated;
    saveUsers(next);
    return respond(updated);
  }
}
