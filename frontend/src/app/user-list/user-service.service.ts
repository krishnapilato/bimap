import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable()
export class UserService {
  private usersUrl: string;

  constructor(private http: HttpClient) {
    this.usersUrl = environment.baseApiUrl + '/users';
  }

  public findAll(): Observable<any[]> {
    return this.http.get<any[]>(this.usersUrl);
  }

  public checkIfEmailExists(email: string): Observable<boolean> {
    return this.http.get<boolean>(environment.baseApiUrl + "/emailStatus=" + email);
  }

  public save(user: any): Observable<any> {
    return this.http.post<any>(this.usersUrl, user);
  }

  public update(user: any, id: number): Observable<any> {
    return this.http.put<any>(this.usersUrl + '/' + id, user);
  }

  public delete(id: number): Observable<any> {
    return this.http.delete(this.usersUrl + '/' + id);
  }

  public sendEmail(email: string): Observable<any> {
    return this.http.get(this.usersUrl + '/sendEmail=' + email);
  }
}