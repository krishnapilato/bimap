import { HttpParams } from '@angular/common/http';

import { DemoRequest, csvCell, daysAgo, fold, paginate, rank } from './demo-http';

function request(query: Record<string, string>): DemoRequest {
  return { method: 'GET', service: 'iam', path: '/', params: {}, query: new HttpParams({ fromObject: query }), body: null, caller: null };
}

describe('demo backend helpers', () => {
  it('folds accents and punctuation like the business service', () => {
    expect(fold("Forlì-Cesena")).toBe('forli cesena');
    expect(fold("Valle d'Aosta")).toBe('valle d aosta');
  });

  it('ranks a prefix above a word start above anywhere', () => {
    expect(rank('Varese', 'var')).toBe(0);
    expect(rank('Busto Arsizio', 'ars')).toBe(1);
    expect(rank('Gallarate', 'lar')).toBe(2);
    expect(rank('Como', 'lecco')).toBeNull();
  });

  it('pages and sorts like Spring Data', () => {
    const items = ['a', 'c', 'b', 'e', 'd'].map((name) => ({ name }));
    const page = paginate(items, request({ page: '1', size: '2', sort: 'name,desc' }), { size: 20 });
    expect(page.content.map((item) => item.name)).toEqual(['c', 'b']);
    expect(page).toMatchObject({ page: 1, size: 2, totalElements: 5, totalPages: 3, first: false, last: false });
  });

  it('keeps exported cells from being run as spreadsheet formulas', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell(null)).toBe('""');
  });

  it('never seeds a past moment later than now, but keeps future ones in the future', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-17T08:00:00Z'));
    try {
      expect(Date.parse(daysAgo(0, 18))).toBeLessThanOrEqual(Date.now());
      expect(Date.parse(daysAgo(-3, 8))).toBeGreaterThan(Date.now());
    } finally {
      vi.useRealTimers();
    }
  });
});
