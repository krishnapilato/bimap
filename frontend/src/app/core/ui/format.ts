import { differenceInCalendarDays, format, formatDistanceToNowStrict, isToday, isYesterday } from 'date-fns';

/** "3 minutes ago", "Yesterday, 14:02", "12 Sep 2026" — whichever reads best at that distance. */
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  const days = Math.abs(differenceInCalendarDays(new Date(), date));

  if (isMoment(date)) return 'Just now';
  if (isToday(date)) return formatDistanceToNowStrict(date, { addSuffix: true });
  if (isYesterday(date)) return `Yesterday, ${format(date, 'HH:mm')}`;
  if (days < 7) return format(date, 'EEEE, HH:mm');
  return format(date, 'd MMM yyyy');
}

/** The same distance, phrased to follow a verb: "saved just now", "saved on 12 Sep 2026". */
export function relativeClause(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  const days = Math.abs(differenceInCalendarDays(new Date(), date));

  if (isMoment(date)) return 'just now';
  if (isToday(date)) return formatDistanceToNowStrict(date, { addSuffix: true });
  if (isYesterday(date)) return `yesterday at ${format(date, 'HH:mm')}`;
  if (days < 7) return `on ${format(date, 'EEEE')} at ${format(date, 'HH:mm')}`;
  return `on ${format(date, 'd MMM yyyy')}`;
}

/** The last 45 seconds, or a few minutes ahead when a server clock runs slightly fast. */
function isMoment(date: Date): boolean {
  const age = Date.now() - date.getTime();
  return age < 45_000 && age > -5 * 60_000;
}

export function dateTime(iso: string | null | undefined): string {
  return iso ? format(new Date(iso), 'd MMM yyyy, HH:mm') : '—';
}

export function shortDate(iso: string | null | undefined): string {
  return iso ? format(new Date(iso), 'd MMM yyyy') : '—';
}

const integer = new Intl.NumberFormat('en-GB');
const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

export function formatNumber(value: number | null | undefined): string {
  return value == null ? '—' : integer.format(Math.round(value));
}

export function formatCompact(value: number | null | undefined): string {
  return value == null ? '—' : compact.format(value);
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function formatPercent(ratio: number | null | undefined, digits = 0): string {
  return ratio == null || ratio < 0 ? '—' : `${(ratio * 100).toFixed(digits)}%`;
}

export function formatCoordinate(value: number | null | undefined, digits = 6): string {
  return value == null ? '—' : value.toFixed(digits);
}

export function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '';
  return (first + last).toUpperCase();
}

/** Title case for an enum constant: `PENDING_ACTIVATION` becomes "Pending activation". */
export function humanize(constant: string | null | undefined): string {
  if (!constant) return '—';
  const lower = constant.toLowerCase().replace(/_/g, ' ');
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
