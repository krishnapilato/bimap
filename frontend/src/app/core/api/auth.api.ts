import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { OperationResult } from './common.models';
import { iamUrl, queryParams } from './http-helpers';
import {
  AuthenticatedSession,
  ChangePasswordRequest,
  EmailAvailability,
  LoginRequest,
  RegistrationRequest,
  ResetPasswordRequest,
  User,
} from './iam.models';

/** `/api/v1/auth` — sign-in, registration, activation and password recovery. */
@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);
  private readonly base = iamUrl('/api/v1/auth');

  login(request: LoginRequest): Promise<AuthenticatedSession> {
    return firstValueFrom(this.http.post<AuthenticatedSession>(`${this.base}/login`, request));
  }

  google(idToken: string): Promise<AuthenticatedSession> {
    return firstValueFrom(this.http.post<AuthenticatedSession>(`${this.base}/google`, { idToken }));
  }

  refresh(refreshToken: string): Promise<AuthenticatedSession> {
    return firstValueFrom(this.http.post<AuthenticatedSession>(`${this.base}/refresh`, { refreshToken }));
  }

  logout(): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${this.base}/logout`, null));
  }

  register(request: RegistrationRequest): Promise<User> {
    return firstValueFrom(this.http.post<User>(`${this.base}/register`, request));
  }

  activate(token: string): Promise<AuthenticatedSession> {
    return firstValueFrom(this.http.post<AuthenticatedSession>(`${this.base}/activate`, { token }));
  }

  resendActivation(email: string): Promise<OperationResult> {
    return firstValueFrom(this.http.post<OperationResult>(`${this.base}/activate/resend`, { email }));
  }

  forgotPassword(email: string): Promise<OperationResult> {
    return firstValueFrom(this.http.post<OperationResult>(`${this.base}/password/forgot`, { email }));
  }

  resetPassword(request: ResetPasswordRequest): Promise<OperationResult> {
    return firstValueFrom(this.http.post<OperationResult>(`${this.base}/password/reset`, request));
  }

  changePassword(request: ChangePasswordRequest): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${this.base}/password/change`, request));
  }

  emailAvailability(email: string): Promise<EmailAvailability> {
    return firstValueFrom(
      this.http.get<EmailAvailability>(`${this.base}/email-availability`, { params: queryParams({ email }) }),
    );
  }
}
