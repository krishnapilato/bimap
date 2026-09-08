/**
 * Geography through the business-core service on :9844.
 *
 * The server already does the folding, the ranking and the row limit, so this adapter is a thin
 * translation of a `GeoScope` into query parameters.
 *
 * @author Khova Krishna Pilato
 */

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { GeoApi } from '../adapters';
import { EntityCode, GeoScope, Municipality, Province, Region, ResolvedAddress } from '../models';

const DEFAULT_LIMIT = 5;

@Injectable()
export class HttpGeoAdapter implements GeoApi {
  readonly #http = inject(HttpClient);
  readonly #base = `${environment.businessApiUrl}/api/v1/geo`;

  regions(query: string, limit = DEFAULT_LIMIT): Observable<readonly Region[]> {
    return this.#http.get<Region[]>(`${this.#base}/regions`, {
      params: params({ q: query, limit }),
    });
  }

  provinces(query: string, scope: GeoScope, limit = DEFAULT_LIMIT): Observable<readonly Province[]> {
    return this.#http.get<Province[]>(`${this.#base}/provinces`, {
      params: params({ q: query, region: scope.region, limit }),
    });
  }

  municipalities(
    query: string,
    scope: GeoScope,
    limit = DEFAULT_LIMIT,
  ): Observable<readonly Municipality[]> {
    return this.#http.get<Municipality[]>(`${this.#base}/municipalities`, {
      params: params({ q: query, region: scope.region, province: scope.province, limit }),
    });
  }

  municipalityByIstat(istatCode: string): Observable<Municipality> {
    return this.#http.get<Municipality>(`${this.#base}/municipalities/${istatCode}`);
  }

  addresses(
    street: string,
    scope: GeoScope,
    limit = DEFAULT_LIMIT,
  ): Observable<readonly ResolvedAddress[]> {
    return this.#http.get<ResolvedAddress[]>(`${this.#base}/addresses`, {
      params: params({
        street,
        municipality: scope.municipality,
        province: scope.province,
        region: scope.region,
        limit,
      }),
    });
  }

  postalCodes(scope: GeoScope, limit = DEFAULT_LIMIT): Observable<readonly string[]> {
    return this.#http.get<string[]>(`${this.#base}/postal-codes`, {
      params: params({
        municipality: scope.municipality,
        province: scope.province,
        street: scope.street,
        limit,
      }),
    });
  }

  entityCodes(
    query: string,
    scope: GeoScope,
    limit = DEFAULT_LIMIT,
  ): Observable<readonly EntityCode[]> {
    return this.#http.get<EntityCode[]>(`${this.#base}/entity-codes`, {
      params: params({
        q: query,
        municipality: scope.municipality,
        province: scope.province,
        region: scope.region,
        limit,
      }),
    });
  }
}

/** Drops empty members, so an unset step of the cascade simply does not narrow anything. */
function params(source: Record<string, string | number | undefined | null>): HttpParams {
  return Object.entries(source).reduce((acc, [key, value]) => {
    if (value === undefined || value === null || value === '') {
      return acc;
    }
    return acc.set(key, String(value));
  }, new HttpParams());
}
