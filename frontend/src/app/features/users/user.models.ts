export const ROLES = ['USER', 'MANAGER', 'ADMINISTRATOR'] as const;

export type Role = (typeof ROLES)[number];

export interface User {
  readonly id: number;
  name: string;
  surname: string;
  email: string;
  role: Role;
  enabled: boolean;
}

export interface UserRequest {
  name: string;
  surname: string;
  email: string;
  password?: string | null;
  role: Role;
  enabled?: boolean;
}
