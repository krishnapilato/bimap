import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { FormModel } from './formdata';
import { Tables } from './tables';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  private readonly baseUrl = `${environment.baseApiUrl}/`;

  public searchRegions(keyword: string): Observable<string[]> {
    return this.http
      .get<string[]>(`${this.baseUrl}regions/${keyword}`)
      .pipe(map((data) => (data?.length ? data : ['No data found'])));
  }

  public searchProvinces(keyword: string): Observable<string[]> {
    return this.http
      .get<string[]>(`${this.baseUrl}provinces/${keyword}`)
      .pipe(map((data) => (data?.length ? data : ['No data found'])));
  }

  public searchMunicipalities(keyword: string): Observable<string[]> {
    return this.http
      .get<string[]>(`${this.baseUrl}municipalities/${keyword}`)
      .pipe(map((data) => (data?.length ? data : ['No data found'])));
  }

  public findAll(): Observable<Tables[]> {
    return this.http.get<Tables[]>(`${this.baseUrl}tables`);
  }

  public save(formdata: FormModel): Observable<FormModel> {
    return this.http.post<FormModel>(`${this.baseUrl}form`, formdata);
  }
}
