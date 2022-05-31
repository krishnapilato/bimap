import { FormModel } from './formdata';
import { Injectable } from '@angular/core';  
import { HttpClient } from '@angular/common/http';
import { debounceTime, map } from 'rxjs/operators';
import { Tables } from './tables';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})  
export class ApiService {  

    // Const url 

    private URL: string = 'http://localhost:8080/';

    // Constructor

    constructor (private httpService: HttpClient) {}  

    // Get autocomplete search data for provinces

    searchRegions(province: string) {
        var provincesList = this.httpService.get(this.URL + 'searchRegion=' + province).pipe(debounceTime(10), map((data: any) => {
            return (data.length != 0 ? data as any : ["No Regions Found"]); 
        }));
        return provincesList;  
    }  

    // Get autocomplete search data for provinces

    searchProvinces(province: string) {
        var provincesList = this.httpService.get(this.URL + 'searchProvince=' + province).pipe(debounceTime(1), map((data: any) => {
            return (data.length != 0 ? data as any : ["No Provinces Found"]); 
        }));
        return provincesList;  
    }  

    // Get autocomplete search data for municipalities

    searchMunicipalities(keyword: string) {
        var municipalitiesList = this.httpService.get(this.URL + 'searchMunicipality=' + keyword).pipe(debounceTime(1), map((data: any) => {
            return (data.length != 0 ? data as any : ["No Municipalities Found"]);
        }));
        return municipalitiesList;  
    }  

    public findAll(number: number): Observable<Tables[]> {
        return this.httpService.get<Tables[]>(this.URL + 'findAll=' + number);
    }

    // Save form data to backend

    save(formdata: FormModel) { return this.httpService.post<FormModel>(this.URL + 'save', formdata); }
}