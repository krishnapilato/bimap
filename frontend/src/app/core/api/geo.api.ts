import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AddressQuery, Address, EntityCode, Municipality, Province, Region } from './geo.models';
import { coreUrl, queryParams } from './http-helpers';

/**
 * `/api/v1/geo` — the guided cascade.
 *
 * Every lookup takes the answers above it as optional filters, so choosing Lombardia means the
 * province search never offers Verona.
 */
@Injectable({ providedIn: 'root' })
export class GeoApi {
  private readonly http = inject(HttpClient);
  private readonly base = coreUrl('/api/v1/geo');

  regions(q = '', limit = 5): Promise<Region[]> {
    return firstValueFrom(this.http.get<Region[]>(`${this.base}/regions`, { params: queryParams({ q, limit }) }));
  }

  provinces(q = '', region?: string, limit = 5): Promise<Province[]> {
    return firstValueFrom(
      this.http.get<Province[]>(`${this.base}/provinces`, { params: queryParams({ q, region, limit }) }),
    );
  }

  municipalities(q = '', filters: { region?: string; province?: string } = {}, limit = 5): Promise<Municipality[]> {
    return firstValueFrom(
      this.http.get<Municipality[]>(`${this.base}/municipalities`, {
        params: queryParams({ q, region: filters.region, province: filters.province, limit }),
      }),
    );
  }

  municipality(istatCode: string): Promise<Municipality> {
    return firstValueFrom(this.http.get<Municipality>(`${this.base}/municipalities/${istatCode}`));
  }

  addresses(query: AddressQuery): Promise<Address[]> {
    return firstValueFrom(
      this.http.get<Address[]>(`${this.base}/addresses`, {
        params: queryParams({
          street: query.street,
          municipality: query.municipality,
          province: query.province,
          region: query.region,
          q: query.q,
          limit: query.limit ?? 5,
        }),
      }),
    );
  }

  postalCodes(municipality: string, filters: { province?: string; street?: string } = {}, limit = 5): Promise<string[]> {
    return firstValueFrom(
      this.http.get<string[]>(`${this.base}/postal-codes`, {
        params: queryParams({ municipality, province: filters.province, street: filters.street, limit }),
      }),
    );
  }

  entityCodes(
    q: string,
    filters: { municipality?: string; province?: string; region?: string } = {},
    limit = 5,
  ): Promise<EntityCode[]> {
    return firstValueFrom(
      this.http.get<EntityCode[]>(`${this.base}/entity-codes`, {
        params: queryParams({ q, ...filters, limit }),
      }),
    );
  }
}
