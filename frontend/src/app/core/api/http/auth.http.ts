/**
 * Identity against the live IAM service on :9843.
 *
 * @author Khova Krishna Pilato
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AuthApi } from '../adapters';
import { Credentials, Registration, Session, UserAccount } from '../models';

@Injectable()
export class HttpAuthAdapter implements AuthApi {
  readonly #http = inject(HttpClient);
  readonly #base = `${environment.iamApiUrl}/api/v1/auth`;
  readonly #users = `${environment.iamApiUrl}/api/v1/users`;

  signIn(credentials: Credentials): Observable<Session> {
    return this.#http.post<Session>(`${this.#base}/login`, credentials);
  }

  signUp(registration: Registration): Observable<UserAccount> {
    return this.#http.post<UserAccount>(`${this.#base}/register`, registration);
  }

  /**
   * The backend confirms an address with a signed single-use token carried in the emailed link,
   * not with a short numeric code. The modal therefore accepts whatever the recipient pastes and
   * posts it here; a true six-digit OTP would need a matching endpoint on the IAM service.
   */
  verifyOtp(_email: string, code: string): Observable<Session> {
    return this.#http.post<Session>(`${this.#base}/activate`, { token: code });
  }

  resendOtp(email: string): Observable<void> {
    return this.#http.post<void>(`${this.#base}/activate/resend`, { email });
  }

  signInWithGoogle(idToken: string): Observable<Session> {
    return this.#http.post<Session>(`${this.#base}/google`, { idToken });
  }

  refresh(refreshToken: string): Observable<Session> {
    return this.#http.post<Session>(`${this.#base}/refresh`, { refreshToken });
  }

  signOut(): Observable<void> {
    return this.#http.post<void>(`${this.#base}/logout`, {});
  }

  isEmailAvailable(email: string): Observable<boolean> {
    return this.#http
      .get<{ email: string; available: boolean }>(`${this.#base}/email-availability`, {
        params: { email },
      })
      .pipe(map((response) => response.available));
  }

  requestPasswordReset(email: string): Observable<void> {
    return this.#http.post<void>(`${this.#base}/password/forgot`, { email });
  }

  currentUser(): Observable<UserAccount> {
    return this.#http.get<UserAccount>(`${this.#users}/me`);
  }
}
