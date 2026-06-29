import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { User } from '../user';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = environment.baseApiUrl;
  private readonly usersUrl = `${this.baseUrl}/users`;

  findAll(): Observable<User[]> {
    return this.http.get<User[]>(this.usersUrl);
  }

  checkIfEmailExists(email: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.baseUrl}/emails/${encodeURIComponent(email)}`);
  }

  save(user: User): Observable<User> {
    return this.http.post<User>(this.usersUrl, {
      name: user.name,
      surname: user.surname,
      email: user.email,
      password: user.password,
    });
  }

  update(user: User, id: number): Observable<User> {
    return this.http.put<User>(`${this.usersUrl}/${id}`, {
      name: user.name,
      surname: user.surname,
      email: user.email,
      password: user.password,
      applicationRole: user.applicationRole,
    });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.usersUrl}/${id}`);
  }

  sendEmail(email: string): Observable<void> {
    return this.http.post<void>(`${this.usersUrl}/send-email`, { email });
  }
}
