import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, UserRequest } from './user.models';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.baseApiUrl}/users`;

  public findAll(): Observable<User[]> {
    return this.http.get<User[]>(this.url);
  }

  public checkIfEmailExists(email: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.url}/exists`, { params: { email } });
  }

  public save(user: UserRequest): Observable<User> {
    return this.http.post<User>(this.url, user);
  }

  public update(user: UserRequest, id: number): Observable<User> {
    return this.http.put<User>(`${this.url}/${id}`, user);
  }

  public delete(id: number): Observable<unknown> {
    return this.http.delete(`${this.url}/${id}`);
  }

  public sendWelcomeEmail(id: number): Observable<unknown> {
    return this.http.post(`${this.url}/${id}/welcome-email`, null);
  }
}