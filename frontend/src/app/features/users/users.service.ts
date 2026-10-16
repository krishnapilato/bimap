import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, UserRequest } from './user.models';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.baseApiUrl}/users`;

  findAll(): Observable<User[]> {
    return this.http.get<User[]>(this.url);
  }

  checkIfEmailExists(email: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.url}/exists`, { params: { email } });
  }

  save(user: UserRequest): Observable<User> {
    return this.http.post<User>(this.url, user);
  }

  update(user: UserRequest, id: number): Observable<User> {
    return this.http.put<User>(`${this.url}/${id}`, user);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  sendWelcomeEmail(id: number): Observable<void> {
    return this.http.post<void>(`${this.url}/${id}/welcome-email`, null);
  }
}
