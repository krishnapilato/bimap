import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { User } from './user';

@Injectable()
export class UserService {
  private usersUrl: string;

  constructor(private http: HttpClient) {
    this.usersUrl = environment.baseApiUrl + '/users';
  }

  public findAll(): Observable<User[]> {
    return this.http.get<User[]>(this.usersUrl);
  }

  public checkIfEmailExists(email: string): Observable<boolean> {
    return this.http.get<boolean>(environment.baseApiUrl + "/emailStatus=" + email);
  }

  public save(user: User): Observable<User> {
    return this.http.post<User>(this.usersUrl, user);
  }

  public update(user: User, id: number): Observable<User> {
    return this.http.put<User>(this.usersUrl + '/' + id, user);
  }

  public delete(id: number): Observable<any> {
    return this.http.delete(this.usersUrl + '/' + id);
  }

  public sendEmail(email: string): Observable<any> {
    return this.http.get(this.usersUrl + '/sendEmail=' + email);
  }
}