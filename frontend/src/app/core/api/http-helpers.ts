import { HttpParams } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { PageRequest } from './common.models';

type ParamValue = string | number | boolean | null | undefined;

/** A URL on the IAM service, as the browser reaches it. */
export const iamUrl = (path: string): string => `${environment.api.iam}${path}`;

/** A URL on the business service, as the browser reaches it. */
export const coreUrl = (path: string): string => `${environment.api.core}${path}`;

/** Query parameters with empty values left out, so optional filters never reach the server blank. */
export function queryParams(values: Record<string, ParamValue>): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === undefined || value === '') continue;
    params = params.set(key, String(value));
  }
  return params;
}

/** Spring Data's paging parameters: `page`, `size` and `sort=field,direction`. */
export function pageParams(request: PageRequest, filters: Record<string, ParamValue> = {}): HttpParams {
  return queryParams({
    ...filters,
    page: request.page,
    size: request.size,
    sort: request.sort ? `${request.sort.field},${request.sort.direction}` : undefined,
  });
}
