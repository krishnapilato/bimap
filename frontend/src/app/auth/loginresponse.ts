export class LoginResponse {
  jwtToken!: string;
  user!: User;
}
export class User {
  id!: number;

  name!: string;
  surname!: string;
  fullName!: string;

  email!: string;
  password!: string;

  userStatus!: string;
  applicationRole!: string;

  created!: Date;
  lastModified!: Date;

  key!: string;

  accountNonExpired!: boolean;
  accountNonLocked!: boolean;
  locked!: boolean;
  credentialsNonExpired!: boolean;
  enabled!: boolean;
}