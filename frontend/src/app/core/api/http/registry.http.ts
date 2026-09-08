/**
 * Records a registration against the live business-core service.
 *
 * @author Khova Krishna Pilato
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { RegistryApi } from '../adapters';
import { AssetRegistrationDraft, RegistrationOutcome } from '../models';

@Injectable()
export class HttpRegistryAdapter implements RegistryApi {
  readonly #http = inject(HttpClient);
  readonly #base = `${environment.businessApiUrl}/api/v1/registrations`;

  create(draft: AssetRegistrationDraft): Observable<RegistrationOutcome> {
    return this.#http
      .post<{ id: string }>(this.#base, draft)
      .pipe(map((saved) => ({ id: saved.id, persisted: true })));
  }
}
