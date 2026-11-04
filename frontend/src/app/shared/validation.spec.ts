import { computed, signal } from '@angular/core';
import { passwordError, integerError } from './validation';
import { pageIndex } from './pagination';
import { safeReturnUrl } from '../features/login/login';
import { apiPath } from '../core/auth/api-path';

describe('Frontend validation and navigation', () => {
  it('matches the BCrypt UTF-8 byte boundary', () => {
    expect(passwordError('é'.repeat(36))).toBeNull();
    expect(passwordError('é'.repeat(37))?.kind).toBe('bytes');
    expect(passwordError('😀'.repeat(18))).toBeNull();
    expect(passwordError('😀'.repeat(19))?.kind).toBe('bytes');
  });

  it('rejects fractional, negative and out-of-range asset numbers', () => {
    for (const number of [-1, 1.5, NaN, Infinity, 2_147_483_648]) expect(integerError(number)).not.toBeNull();
    for (const number of [null, 0, 42, 2_147_483_647]) expect(integerError(number)).toBeNull();
  });

  it('clamps pagination after deleting the last row and resets it when searching', () => {
    const count = signal(11);
    const query = signal('');
    const pages = computed(() => Math.max(1, Math.ceil(count() / 5)));
    const page = pageIndex(query, pages);
    page.set(2);
    count.set(10);
    expect(page()).toBe(1);
    query.set('other');
    expect(page()).toBe(0);
  });

  it('only returns to permitted application pages', () => {
    expect(safeReturnUrl('/assets?q=house', false)).toBe('/assets?q=house');
    expect(safeReturnUrl('/users', true)).toBe('/users');
    for (const url of ['/users', '/logout', '/login', '//evil.example', '/\\evil.example', 'https://evil.example']) {
      expect(safeReturnUrl(url, false)).toBe('/assets');
    }
  });

  it('scopes API requests by origin and path boundary', () => {
    expect(apiPath('/api/users?x=1', '/api')).toBe('/users');
    expect(apiPath('/api-other', '/api')).toBeNull();
    expect(apiPath('https://evil.example/api/users', '/api')).toBeNull();
    expect(apiPath('http://localhost:8080.evil.example/users', 'http://localhost:8080')).toBeNull();
    expect(apiPath('http://localhost:8080/users', 'http://localhost:8080')).toBe('/users');
  });
});
