import { FormModel } from './formdata';
import { Injectable } from '@angular/core';  
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { debounceTime, map } from 'rxjs/operators';

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
        var provincesList = this.httpService.get(this.URL + 'searchRegione=' + province).pipe(debounceTime(10), map((data: any) => {
            return (data.length != 0 ? data as any : ["No Regions Found"]); 
        }));
        return provincesList;  
    }  

    // Get autocomplete search data for provinces

    searchProvinces(province: string) {
        var provincesList = this.httpService.get(this.URL + 'searchProvinces=' + province).pipe(debounceTime(1), map((data: any) => {
            return (data.length != 0 ? data as any : ["No Provinces Found"]); 
        }));
        return provincesList;  
    }  

    // Get autocomplete search data for municipalities

    searchMunicipalities(keyword: string) {
        var municipalitiesList = this.httpService.get(this.URL + 'searchMunicipalities=' + keyword).pipe(debounceTime(1), map((data: any) => {
            return (data.length != 0 ? data as any : ["No Municipalities Found"]);
        }));
        return municipalitiesList;  
    }  

    // Save form data to backend

    save(formdata: FormModel) { return this.httpService.post<FormModel>(this.URL + 'save', formdata); }
}