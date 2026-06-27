import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { User } from '../user';

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
    return this.http.get<boolean>(environment.baseApiUrl + '/emails/' + email);
  }

  public save(user: User): Observable<User> {
    return this.http.post<User>(this.usersUrl, user);
  }

  public update(user: User, id: number): Observable<User> {
    return this.http.put<User>(this.usersUrl + '/' + id, user);
  }

  public delete(id: number): Observable<User> {
    return this.http.delete<User>(this.usersUrl + '/' + id);
  }

  public sendEmail(email: string): Observable<any> {
    return this.http.get<any>(this.usersUrl + '/' + email + '/send-email');
  }
}
