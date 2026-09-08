/**
 * Recording a registration when there is nowhere to record it.
 *
 * The demo build has no database, and quietly dropping a surveyor's work while showing a green
 * tick would be a lie. So the draft is written to a CSV and handed straight back — the same
 * columns the business-core service exports, so the file is genuinely useful rather than a
 * consolation prize.
 *
 * @author Khova Krishna Pilato
 */

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { RegistryApi } from '../adapters';
import { AssetRegistrationDraft, RegistrationOutcome } from '../models';
import { respond } from './mock-store';

/** The column order of the server's own export, so the two files interchange. */
const COLUMNS: readonly (keyof AssetRegistrationDraft | 'recorded_at')[] = [
  'region',
  'provinceName',
  'provinceCode',
  'municipality',
  'istatCode',
  'cadastralCode',
  'postalCode',
  'address',
  'houseNumber',
  'latitude',
  'longitude',
  'assetName',
  'entityName',
  'entityBillingCode',
  'recorded_at',
];

const HEADERS: Record<string, string> = {
  region: 'region',
  provinceName: 'province',
  provinceCode: 'province_code',
  municipality: 'municipality',
  istatCode: 'istat_code',
  cadastralCode: 'cadastral_code',
  postalCode: 'postal_code',
  address: 'address',
  houseNumber: 'house_number',
  latitude: 'latitude',
  longitude: 'longitude',
  assetName: 'asset_name',
  entityName: 'entity_name',
  entityBillingCode: 'entity_billing_code',
  recorded_at: 'recorded_at',
};

@Injectable()
export class MockRegistryAdapter implements RegistryApi {
  create(draft: AssetRegistrationDraft): Observable<RegistrationOutcome> {
    const filename = `bimap-registration-${draft.istatCode}-${Date.now()}.csv`;
    download(filename, toCsv(draft));

    return respond<RegistrationOutcome>({
      id: crypto.randomUUID(),
      persisted: false,
      downloadedAs: filename,
    });
  }
}

function toCsv(draft: AssetRegistrationDraft): string {
  const row: Record<string, unknown> = { ...draft, recorded_at: new Date().toISOString() };

  const header = COLUMNS.map((key) => quote(HEADERS[key as string])).join(',');
  const values = COLUMNS.map((key) => quote(row[key as string])).join(',');

  // A byte order mark, without which Excel opens accented Italian names as mojibake.
  return `﻿${header}\r\n${values}\r\n`;
}

/** RFC 4180: wrap everything, and double any quote inside. */
function quote(value: unknown): string {
  if (value === undefined || value === null) {
    return '""';
  }
  return `"${String(value).replace(/"/g, '""')}"`;
}

function download(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  // Revoking immediately can cancel the download in some browsers; a tick is enough.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
