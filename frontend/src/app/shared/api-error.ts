import { HttpErrorResponse } from '@angular/common/http';

export function apiError(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) return fallback;
  if (error.status === 0) return 'Cannot reach the server. Check your connection and try again.';
  if (error.status === 429) return 'Too many attempts. Please wait before trying again.';
  const body: unknown = error.error;
  if (body && typeof body === 'object') {
    if ('errors' in body && body.errors && typeof body.errors === 'object') {
      const messages = Object.entries(body.errors).filter((entry): entry is [string, string] => typeof entry[1] === 'string');
      if (messages.length) return messages.slice(0, 3).map(([field, message]) => `${field}: ${message}`).join(' ');
    }
    if ('detail' in body && typeof body.detail === 'string') return body.detail;
  }
  return fallback;
}
