import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { FormModel } from './formdata';
import { Tables } from './tables';

const COMUNI = 'https://comuni-ita.nicolorebaioli.dev/v5';
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

interface Place {
  lat: string;
  lon: string;
  address: { city?: string; town?: string; village?: string };
}

export interface Municipality {
  nome: string;
  codice: string;
  coordinate: { lat: number; lng: number };
  provincia: { nome: string; sigla: string; regione: string };
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly url = environment.baseApiUrl;

  regions(): Observable<string[]> {
    return this.http.get<string[]>(`${COMUNI}/regioni`);
  }

  provinces(region: string): Observable<string[]> {
    return this.http
      .get<{ nome: string }[]>(`${COMUNI}/province/${encodeURIComponent(region)}`, { params: { fields: 'nome', sort: 'nome' } })
      .pipe(map((provinces) => provinces.map((province) => province.nome)));
  }

  municipalities(province: string): Observable<Municipality[]> {
    return this.http.get<Municipality[]>(`${COMUNI}/comuni/provincia/${encodeURIComponent(province)}`, { params: { sort: 'nome' } });
  }

  findMunicipality(name: string, provinceCode: string): Observable<Municipality | undefined> {
    return this.http
      .get<Municipality[]>(`${COMUNI}/comuni`, { params: { q: name } })
      .pipe(map((found) => found.find((place) => place.nome.toLowerCase() === name.toLowerCase() && place.provincia.sigla === provinceCode)));
  }

  findAll(): Observable<Tables[]> {
    return this.http.get<Tables[]>(`${this.url}/assets`);
  }

  save(form: FormModel): Observable<FormModel> {
    return this.http.post<FormModel>(`${this.url}/forms`, form);
  }

  exportForms(): Observable<Blob> {
    return this.http.get(`${this.url}/forms/export.csv`, { responseType: 'blob' });
  }

  geocode(street: string, city: string): Observable<{ lat: number; lng: number } | undefined> {
    return this.http
      .get<Place[]>(NOMINATIM, { params: { format: 'json', addressdetails: 1, limit: 5, street, city, country: 'Italia', 'accept-language': 'it' } })
      .pipe(
        map((places) => places.find(({ address }) => [address.city, address.town, address.village].some((name) => name?.toLowerCase() === city.toLowerCase()))),
        map((place) => place && { lat: Number(place.lat), lng: Number(place.lon) }),
      );
  }
}
