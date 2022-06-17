import { User } from '../user';

export class LoginResponse {
  jwttoken!: string;
  user!: User;
}