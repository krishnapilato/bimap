/**
 * Geography straight from the public APIs, for the GitHub Pages build.
 *
 * There is no BiMap backend in demo mode, so this adapter does the work the business-core service
 * normally does: folding accents away, ranking prefix matches above mid-word ones, and cutting
 * the result to five. All three upstreams answer with `Access-Control-Allow-Origin: *`, which is
 * the only reason a static page can call them at all.
 *
 * Comuni-ITA has no search endpoint — `/comuni` is one document of every municipality in Italy —
 * so it is fetched once and held with `shareReplay`. Without that, every keystroke would pull
 * three megabytes.
 *
 * @author Khova Krishna Pilato
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of, shareReplay, switchMap } from 'rxjs';

import { GeoApi } from '../adapters';
import { EntityCode, GeoScope, Municipality, Province, Region, ResolvedAddress } from '../models';

const COMUNI = 'https://comuni-ita.nicolorebaioli.dev';
const NOMINATIM = 'https://nominatim.openstreetmap.org';
const CODICE_UNIVOCO = 'https://codiceunivoco.it';
const DEFAULT_LIMIT = 5;

interface ComuneResource {
  codice: string;
  nome: string;
  codiceCatastale: string | null;
  cap: string | null;
  popolazione: number | null;
  provincia: { nome: string; sigla: string; codice: string; regione: string } | null;
  coordinate: { lat: number | null; lng: number | null } | null;
}

interface ProvinciaResource {
  codice: string;
  nome: string;
  sigla: string;
  regione: string;
}

interface NominatimPlace {
  display_name: string;
  lat: string;
  lon: string;
  importance?: number;
  address?: Record<string, string | undefined>;
}

interface CodiceUnivocoEntry {
  denominazione: string;
  codice_ipa: string | null;
  codice_fiscale: string | null;
  categoria: string | null;
  codice_principale: string | null;
  n_uffici: number | null;
  comune: { nome: string; provincia: string; regione: string } | null;
  url: string | null;
}

@Injectable()
export class PublicGeoAdapter implements GeoApi {
  readonly #http = inject(HttpClient);

  /** Fetched once per session, then shared. Roughly 3 MB, so never per keystroke. */
  readonly #allMunicipalities$ = this.#http
    .get<ComuneResource[]>(`${COMUNI}/comuni`)
    .pipe(shareReplay({ bufferSize: 1, refCount: false }));

  readonly #regions$ = this.#http
    .get<string[]>(`${COMUNI}/regioni`)
    .pipe(shareReplay({ bufferSize: 1, refCount: false }));

  readonly #provinces$ = this.#http
    .get<ProvinciaResource[]>(`${COMUNI}/province`)
    .pipe(shareReplay({ bufferSize: 1, refCount: false }));

  regions(query: string, limit = DEFAULT_LIMIT): Observable<readonly Region[]> {
    const folded = fold(query);
    return this.#regions$.pipe(
      map((names) =>
        best(
          names.map((name) => ({ value: { name }, rank: rank(name, folded), key: name })),
          limit,
        ),
      ),
    );
  }

  provinces(query: string, scope: GeoScope, limit = DEFAULT_LIMIT): Observable<readonly Province[]> {
    const folded = fold(query);
    return this.#provinces$.pipe(
      map((rows) =>
        best(
          rows
            .filter((row) => matchesRegion(row.regione, scope.region))
            .map((row) => ({
              value: toProvince(row),
              rank: bestRank(folded, row.nome, row.sigla),
              key: row.nome,
            })),
          limit,
        ),
      ),
    );
  }

  municipalities(
    query: string,
    scope: GeoScope,
    limit = DEFAULT_LIMIT,
  ): Observable<readonly Municipality[]> {
    const folded = fold(query);
    // Naming a region turns a nationwide read into a regional one, exactly as the backend does.
    const source$ = scope.region
      ? this.#http.get<ComuneResource[]>(`${COMUNI}/comuni/${slug(scope.region)}`)
      : this.#allMunicipalities$;

    return source$.pipe(
      map((rows) =>
        best(
          rows
            .filter((row) => matchesProvince(row, scope.province))
            .map((row) => ({
              value: toMunicipality(row),
              rank: bestRank(folded, row.nome, row.codice, row.codiceCatastale ?? ''),
              key: row.nome,
            })),
          limit,
        ),
      ),
    );
  }

  municipalityByIstat(istatCode: string): Observable<Municipality> {
    return this.#allMunicipalities$.pipe(
      map((rows) => {
        const found = rows.find((row) => row.codice === istatCode);
        if (!found) {
          throw new Error(`Municipality with ISTAT code ${istatCode} was not found`);
        }
        return toMunicipality(found);
      }),
    );
  }

  addresses(
    street: string,
    scope: GeoScope,
    limit = DEFAULT_LIMIT,
  ): Observable<readonly ResolvedAddress[]> {
    const query = new URLSearchParams({
      format: 'json',
      addressdetails: '1',
      countrycodes: 'it',
      limit: String(limit),
      street,
    });
    if (scope.municipality) {
      query.set('city', scope.municipality);
    }
    if (scope.province) {
      query.set('county', scope.province);
    }
    if (scope.region) {
      query.set('state', scope.region);
    }

    return this.#http
      .get<NominatimPlace[]>(`${NOMINATIM}/search?${query.toString()}`)
      .pipe(map((places) => places.map(toAddress)));
  }

  postalCodes(scope: GeoScope, limit = DEFAULT_LIMIT): Observable<readonly string[]> {
    if (!scope.municipality) {
      return of([]);
    }

    const fromStreet$ = scope.street
      ? this.addresses(scope.street, scope, limit).pipe(
          map((rows) => rows.map((row) => row.postalCode).filter(isPresent)),
        )
      : of<string[]>([]);

    return fromStreet$.pipe(
      switchMap((streetCodes) =>
        this.municipalities(scope.municipality!, scope, 1).pipe(
          map((matches) => {
            const fallback = matches[0]?.postalCode;
            const merged = [...streetCodes, ...(fallback ? [fallback] : [])];
            return [...new Set(merged)].slice(0, limit);
          }),
        ),
      ),
    );
  }

  entityCodes(
    query: string,
    scope: GeoScope,
    limit = DEFAULT_LIMIT,
  ): Observable<readonly EntityCode[]> {
    // The directory has no location parameter, so the place is folded into the free-text query;
    // it is the only way its ranking surfaces bodies seated there at all.
    const place = scope.municipality ?? scope.province ?? scope.region;
    const upstream = place ? `${query} ${place}` : query;

    return this.#http
      .get<{ risultati: CodiceUnivocoEntry[] }>(
        `${CODICE_UNIVOCO}/api/v1/search?q=${encodeURIComponent(upstream)}`,
      )
      .pipe(
        map((response) =>
          (response.risultati ?? [])
            .filter((entry) => matchesPlace(entry, scope))
            .slice(0, limit)
            .map(toEntityCode),
        ),
      );
  }
}

// ── Ranking, ported from the server so both modes order results identically ──

const RANK_PREFIX = 0;
const RANK_WORD_START = 1;
const RANK_CONTAINS = 2;
const NO_MATCH = Number.MAX_SAFE_INTEGER;

/** Strips diacritics and punctuation, so Forlì matches "forli" and Sant'Agata matches "sant agata". */
export function fold(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function rank(candidate: string, foldedQuery: string): number {
  const folded = fold(candidate);
  if (!foldedQuery) {
    return RANK_PREFIX;
  }
  if (folded.startsWith(foldedQuery)) {
    return RANK_PREFIX;
  }
  if (folded.includes(` ${foldedQuery}`)) {
    return RANK_WORD_START;
  }
  return folded.includes(foldedQuery) ? RANK_CONTAINS : NO_MATCH;
}

/** Best rank across several fields, so one input finds a name, an ISTAT code or a cadastral code. */
function bestRank(foldedQuery: string, ...candidates: string[]): number {
  return Math.min(...candidates.map((candidate) => rank(candidate, foldedQuery)));
}

/** Keeps the best `limit` without sorting the whole list, then orders only the survivors. */
function best<T>(scored: { value: T; rank: number; key: string }[], limit: number): T[] {
  return scored
    .filter((entry) => entry.rank !== NO_MATCH)
    .sort((a, b) => a.rank - b.rank || a.key.localeCompare(b.key, 'it'))
    .slice(0, limit)
    .map((entry) => entry.value);
}

// ── Mapping ──────────────────────────────────────────────────────────────────

function toProvince(row: ProvinciaResource): Province {
  return { code: row.codice, name: row.nome, abbreviation: row.sigla, region: row.regione };
}

function toMunicipality(row: ComuneResource): Municipality {
  return {
    istatCode: row.codice,
    name: row.nome,
    cadastralCode: row.codiceCatastale,
    postalCode: row.cap,
    province: row.provincia?.nome ?? null,
    provinceCode: row.provincia?.sigla ?? null,
    region: row.provincia?.regione ?? null,
    population: row.popolazione,
    latitude: row.coordinate?.lat ?? null,
    longitude: row.coordinate?.lng ?? null,
  };
}

function toAddress(place: NominatimPlace): ResolvedAddress {
  const address = place.address ?? {};
  const settlement =
    address['city'] ?? address['town'] ?? address['village'] ?? address['municipality'] ?? null;

  return {
    label: place.display_name,
    street: address['road'] ?? null,
    houseNumber: address['house_number'] ?? null,
    postalCode: address['postcode'] ?? null,
    municipality: settlement,
    province: address['county'] ?? null,
    region: address['state'] ?? null,
    latitude: Number.parseFloat(place.lat),
    longitude: Number.parseFloat(place.lon),
  };
}

function toEntityCode(entry: CodiceUnivocoEntry): EntityCode {
  return {
    name: entry.denominazione,
    billingCode: entry.codice_principale,
    ipaCode: entry.codice_ipa,
    taxCode: entry.codice_fiscale,
    category: entry.categoria,
    municipality: entry.comune?.nome ?? null,
    province: entry.comune?.provincia ?? null,
    region: entry.comune?.regione ?? null,
    offices: entry.n_uffici,
    reference: entry.url,
  };
}

// ── Narrowing ────────────────────────────────────────────────────────────────

function matchesRegion(candidate: string, region?: string): boolean {
  return !region || fold(candidate) === fold(region);
}

function matchesProvince(row: ComuneResource, province?: string): boolean {
  if (!province) {
    return true;
  }
  const wanted = fold(province);
  return fold(row.provincia?.sigla) === wanted || fold(row.provincia?.nome) === wanted;
}

function matchesPlace(entry: CodiceUnivocoEntry, scope: GeoScope): boolean {
  const comune = entry.comune;
  if (!comune) {
    return !scope.municipality && !scope.province && !scope.region;
  }
  const equal = (candidate: string, filter?: string) => !filter || fold(candidate) === fold(filter);
  return (
    equal(comune.nome, scope.municipality) &&
    equal(comune.provincia, scope.province) &&
    equal(comune.regione, scope.region)
  );
}

function slug(region: string): string {
  return region.toLowerCase().replace(/\s+/g, '-');
}

function isPresent(value: string | null): value is string {
  return value !== null && value !== '';
}
