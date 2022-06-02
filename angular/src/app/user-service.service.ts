import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from './user';
import { environment } from 'src/environments/environment';

@Injectable()
export class UserService {
  private usersUrl: string;
  
  constructor(private http: HttpClient) { this.usersUrl = environment.baseApiUrl + '/users'; }

  public findAll(): Observable<User[]> { return this.http.get<User[]>(this.usersUrl); }

  public save(user: User) { return this.http.post<User>(this.usersUrl, user); }

  
  public update(user: User, id: number) { return this.http.put(this.usersUrl + '/' + id, user); }

  public delete(id: number) { return this.http.delete(this.usersUrl + '/' + id); }
}