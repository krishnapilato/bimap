import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { User } from '../user';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl: string = `${environment.baseApiUrl}`;
  private readonly usersUrl: string = `${this.baseUrl}/users`;

  public findAll(): Observable<User[]> {
    return this.http.get<User[]>(this.usersUrl);
  }

  public checkIfEmailExists(email: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.baseUrl}/emails/${email}`);
  }

  public save(user: User): Observable<User> {
    return this.http.post<User>(this.usersUrl, user);
  }

  public update(user: User, id: number): Observable<User> {
    return this.http.put<User>(`${this.usersUrl}/${id}`, user);
  }

  public delete(id: number): Observable<any> {
    return this.http.delete(`${this.usersUrl}/${id}`);
  }

  public sendEmail(email: string): Observable<any> {
    return this.http.get(`${this.usersUrl}/${email}/send-email`);
  }
}
