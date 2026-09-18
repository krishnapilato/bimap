import { formatBytes, formatNumber, formatPercent, humanize, initials, relativeClause, relativeTime } from './format';

describe('format', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-17T10:00:00Z'));
  });

  afterEach(() => vi.useRealTimers());

  it('calls the last few seconds "just now"', () => {
    expect(relativeTime('2026-09-17T09:59:50Z')).toBe('Just now');
    expect(relativeClause('2026-09-17T09:59:50Z')).toBe('just now');
  });

  it('does not say "in 2 minutes" when a server clock runs slightly fast', () => {
    expect(relativeTime('2026-09-17T10:02:00Z')).toBe('Just now');
  });

  it('writes a missing moment as a dash or nothing', () => {
    expect(relativeTime(null)).toBe('—');
    expect(relativeClause(undefined)).toBe('');
  });

  it('formats figures in British English', () => {
    expect(formatNumber(11842)).toBe('11,842');
    expect(formatNumber(null)).toBe('—');
    expect(formatPercent(0.958, 1)).toBe('95.8%');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(12 * 1024 * 1024)).toBe('12 MB');
  });

  it('turns constants and names into something to read', () => {
    expect(humanize('PENDING_ACTIVATION')).toBe('Pending activation');
    expect(initials('Elena Maria Ferrari')).toBe('EF');
    expect(initials('   ')).toBe('?');
  });
});
