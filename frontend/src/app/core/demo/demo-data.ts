import { User } from '../../features/users/user.models';
import { LoginResponse } from '../auth/auth.models';

export const USERS: User[] = [
  {
    id: 1,
    name: 'Khova Krishna',
    surname: 'Pilato',
    email: 'krishnak.pilato@gmail.com',
    role: 'ADMINISTRATOR',
    enabled: true,
  },
  {
    id: 2,
    name: 'Giulia',
    surname: 'Rossi',
    email: 'giulia.rossi@example.com',
    role: 'ADMINISTRATOR',
    enabled: true,
  },
  {
    id: 3,
    name: 'Arjun',
    surname: 'Sharma',
    email: 'arjun.sharma@example.com',
    role: 'USER',
    enabled: false,
  },
  {
    id: 4,
    name: 'Marco',
    surname: 'Bianchi',
    email: 'marco.bianchi@example.com',
    role: 'USER',
    enabled: true,
  },
  {
    id: 5,
    name: 'Priya',
    surname: 'Iyer',
    email: 'priya.iyer@example.com',
    role: 'MANAGER',
    enabled: false,
  },
];

export const DEMO_SESSION: LoginResponse = {
  token: 'demo',
  user: {
    id: 2,
    name: 'Giulia',
    surname: 'Rossi',
    email: 'giulia.rossi@example.com',
    role: 'ADMINISTRATOR',
  },
};
