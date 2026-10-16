import { User } from '../../features/users/user.models';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest extends LoginRequest {
  name: string;
  surname: string;
}

export type SessionUser = Omit<User, 'enabled'>;

export interface LoginResponse {
  token: string;
  user: SessionUser;
}
