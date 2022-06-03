import { FormModel } from './formdata';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { debounceTime, map } from 'rxjs/operators';
import { Tables } from './tables';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  // URL Attribute

  private URL: string;

  // Constructor

  constructor(private httpService: HttpClient) {
    this.URL = environment.baseApiUrl + '/';
  }

  // Get autocomplete search data for regions

  searchRegions(province: string) {
    var provincesList = this.httpService
      .get(this.URL + 'searchRegion=' + province)
      .pipe(
        debounceTime(10),
        map((data: any) => {
          return data.length != 0 ? (data as any) : ['No Regions Found'];
        })
      );
    return provincesList;
  }

  // Get autocomplete search data for provinces

  searchProvinces(province: string) {
    var provincesList = this.httpService
      .get(this.URL + 'searchProvince=' + province)
      .pipe(
        debounceTime(1),
        map((data: any) => {
          return data.length != 0 ? (data as any) : ['No Provinces Found'];
        })
      );
    return provincesList;
  }

  // Get autocomplete search data for municipalities

  searchMunicipalities(keyword: string) {
    var municipalitiesList = this.httpService
      .get(this.URL + 'searchMunicipality=' + keyword)
      .pipe(
        debounceTime(1),
        map((data: any) => {
          return data.length != 0 ? (data as any) : ['No Municipalities Found'];
        })
      );
    return municipalitiesList;
  }

  // Find all data from table

  findAll(): Observable<Tables[]> {
    return this.httpService.get<Tables[]>(this.URL + 'findAll');
  }

  // Save FormModel object to table

  save(formdata: FormModel) {
    return this.httpService.post<FormModel>(this.URL + 'save', formdata);
  }
}