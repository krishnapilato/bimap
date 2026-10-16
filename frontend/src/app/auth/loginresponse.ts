import { User } from '../user';

export type SessionUser = Omit<User, 'enabled'>;

export interface LoginResponse {
  token: string;
  user: SessionUser;
}
