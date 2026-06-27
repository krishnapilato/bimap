import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { debounceTime, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { FormModel } from './formdata';
import { Tables } from './tables';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private URL: string;

  constructor(private httpService: HttpClient) {
    this.URL = environment.baseApiUrl + '/';
  }

  public searchRegions(keyword: string): Observable<string[]> {
    var provincesList = this.httpService.get(this.URL + 'regions/' + keyword).pipe(
      debounceTime(10),
      map((data: any) => {
        return data.length != 0 ? (data as any) : ['No data found'];
      }),
    );
    return provincesList;
  }

  public searchProvinces(keyword: string): Observable<string[]> {
    var provincesList = this.httpService.get(this.URL + 'provinces/' + keyword).pipe(
      debounceTime(1),
      map((data: any) => {
        return data.length != 0 ? (data as any) : ['No data found'];
      }),
    );
    return provincesList;
  }

  public searchMunicipalities(keyword: string): Observable<string[]> {
    var municipalitiesList = this.httpService.get(this.URL + 'municipalities/' + keyword).pipe(
      debounceTime(1),
      map((data: any) => {
        return data.length != 0 ? (data as any) : ['No data found'];
      }),
    );
    return municipalitiesList;
  }

  public findAll(): Observable<Tables[]> {
    return this.httpService.get<Tables[]>(this.URL + 'tables');
  }

  public save(formdata: FormModel): Observable<FormModel> {
    return this.httpService.post<FormModel>(this.URL + 'form', formdata);
  }
}
