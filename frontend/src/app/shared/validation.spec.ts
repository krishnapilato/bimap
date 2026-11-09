import { computed, signal } from '@angular/core';
import { EMAIL, integerError, passwordError, PERSON_NAME, PLAIN_TEXT, singleLine } from './validation';
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
    expect(safeReturnUrl('/street-view?x=<script>', false)).toBe('/street-view');
    expect(safeReturnUrl('/users', true)).toBe('/users');
    for (const url of ['/users', '/logout', '/login', '//evil.example', '/\\evil.example', 'https://evil.example', 'javascript:alert(1)', '/street-view%0d%0a']) {
      expect(safeReturnUrl(url, false)).toBe('/assets');
    }
  });

  it('accepts real names and catalogue text but rejects markup and control characters', () => {
    for (const name of ["D'Angelo", 'José María', 'Anne-Marie', 'Rossi Jr.']) expect(PERSON_NAME.test(name)).toBe(true);
    for (const name of ['<b>', 'Robert"); DROP', '=cmd', 'Mario\u0000', '1337']) expect(PERSON_NAME.test(name)).toBe(false);
    for (const text of ['Palazzo Da Franchi o De Franchi (oggi Palazzo Peloso)', 'Roma , via', 'Valle d\'Aosta/Vallée d\'Aoste']) expect(PLAIN_TEXT.test(text)).toBe(true);
    for (const text of ['<img src=x onerror=alert(1)>', '=HYPERLINK("x")', '{{ constructor }}', 'a\nb', '${x}', '@SUM(A1)', '-1+1']) expect(PLAIN_TEXT.test(text)).toBe(false);
    expect(singleLine('  Via\n  Roma  1 ')).toBe('Via Roma 1');
    expect(EMAIL.test('giulia.rossi@example.com')).toBe(true);
    expect(EMAIL.test('a@mail.example.co.uk')).toBe(true);
    for (const email of ['"a b"@example.com', 'a@b', 'a@b..c', 'a@b.c.', 'a@example.com\r\nBcc: x@y.z']) expect(EMAIL.test(email)).toBe(false);
  });

  it('scopes API requests by origin and path boundary', () => {
    expect(apiPath('/api/users?x=1', '/api')).toBe('/users');
    expect(apiPath('/api-other', '/api')).toBeNull();
    expect(apiPath('https://evil.example/api/users', '/api')).toBeNull();
    expect(apiPath('http://localhost:8080.evil.example/users', 'http://localhost:8080')).toBeNull();
    expect(apiPath('http://localhost:8080/users', 'http://localhost:8080')).toBe('/users');
  });
});
