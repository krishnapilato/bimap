import { environment } from '../../../environments/environment';

/** Match the API origin and path boundary, never lookalike URLs or external services. */
export function apiPath(url: string, base = environment.baseApiUrl): string | null {
  try {
    const api = new URL(base, location.origin);
    const target = new URL(url, location.origin);
    const prefix = api.pathname.replace(/\/$/, '');
    if (target.origin !== api.origin || (target.pathname !== prefix && !target.pathname.startsWith(`${prefix}/`))) return null;
    return target.pathname.slice(prefix.length);
  } catch {
    return null;
  }
}
