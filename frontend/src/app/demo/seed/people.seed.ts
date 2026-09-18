import { AccountStatus, ApplicationRole, AuthProvider, Permission, User } from '../../core/api/iam.models';
import { daysAgo } from '../demo-http';

const PERMISSIONS: Record<ApplicationRole, Permission[]> = {
  USER: ['registration:read', 'registration:write'],
  MANAGER: [
    'registration:read',
    'registration:write',
    'registration:read-all',
    'registration:export',
    'user:read',
    'mailing:read',
  ],
  ADMINISTRATOR: [
    'registration:read',
    'registration:write',
    'registration:read-all',
    'registration:export',
    'user:read',
    'user:write',
    'user:lifecycle',
    'mailing:read',
    'mailing:write',
  ],
};

export const permissionsOf = (role: ApplicationRole): Permission[] => [...PERMISSIONS[role]];

interface Person {
  first: string;
  last: string;
  email: string;
  role: ApplicationRole;
  status: AccountStatus;
  provider?: AuthProvider;
  joined: number;
  lastSeen?: number;
  passwordSet?: boolean;
}

/** The people behind the demo, with every lifecycle state represented at least once. */
const PEOPLE: Person[] = [
  { first: 'Elena', last: 'Ferrari', email: 'elena.ferrari@bimap.local', role: 'ADMINISTRATOR', status: 'ACTIVE', joined: 410, lastSeen: 0 },
  { first: 'Marco', last: 'Bianchi', email: 'marco.bianchi@bimap.local', role: 'MANAGER', status: 'ACTIVE', joined: 402, lastSeen: 0 },
  { first: 'Giulia', last: 'Rossi', email: 'giulia.rossi@bimap.local', role: 'USER', status: 'ACTIVE', joined: 395, lastSeen: 0 },
  { first: 'Luca', last: 'Conti', email: 'luca.conti@bimap.local', role: 'USER', status: 'ACTIVE', joined: 390, lastSeen: 1 },
  { first: 'Andrea', last: 'Moretti', email: 'andrea.moretti@bimap.local', role: 'ADMINISTRATOR', status: 'ACTIVE', joined: 360, lastSeen: 3 },
  { first: 'Sara', last: 'Colombo', email: 'sara.colombo@bimap.local', role: 'MANAGER', status: 'ACTIVE', joined: 300, lastSeen: 1 },
  { first: 'Valentina', last: 'De Luca', email: 'valentina.deluca@bimap.local', role: 'MANAGER', status: 'ACTIVE', joined: 240, lastSeen: 6 },
  { first: 'Davide', last: 'Greco', email: 'davide.greco@bimap.local', role: 'USER', status: 'ACTIVE', joined: 220, lastSeen: 2 },
  { first: 'Chiara', last: 'Romano', email: 'chiara.romano@example.com', role: 'USER', status: 'ACTIVE', provider: 'GOOGLE', joined: 180, lastSeen: 0, passwordSet: false },
  { first: 'Simone', last: 'Costa', email: 'simone.costa@bimap.local', role: 'USER', status: 'ACTIVE', joined: 170, lastSeen: 4 },
  { first: 'Laura', last: 'Fontana', email: 'laura.fontana@bimap.local', role: 'USER', status: 'ACTIVE', joined: 150, lastSeen: 9 },
  { first: 'Federica', last: 'Bruno', email: 'federica.bruno@example.com', role: 'USER', status: 'ACTIVE', provider: 'GOOGLE', joined: 120, lastSeen: 12, passwordSet: false },
  { first: 'Giorgio', last: 'Esposito', email: 'giorgio.esposito@bimap.local', role: 'USER', status: 'ACTIVE', joined: 96, lastSeen: 21 },
  { first: 'Elisa', last: 'Lombardi', email: 'elisa.lombardi@bimap.local', role: 'USER', status: 'ACTIVE', joined: 80, lastSeen: 30 },
  { first: 'Alessandro', last: 'Ricci', email: 'alessandro.ricci@bimap.local', role: 'USER', status: 'LOCKED', joined: 200, lastSeen: 15 },
  { first: 'Martina', last: 'Marino', email: 'martina.marino@bimap.local', role: 'USER', status: 'DISABLED', joined: 330, lastSeen: 88 },
  { first: 'Paolo', last: 'Barbieri', email: 'paolo.barbieri@bimap.local', role: 'MANAGER', status: 'DISABLED', joined: 380, lastSeen: 140 },
  { first: 'Francesco', last: 'Galli', email: 'francesco.galli@bimap.local', role: 'USER', status: 'PENDING_ACTIVATION', joined: 2 },
  { first: 'Roberta', last: 'Villa', email: 'roberta.villa@bimap.local', role: 'USER', status: 'PENDING_ACTIVATION', joined: 5 },
  { first: 'Matteo', last: 'Gallo', email: 'matteo.gallo@bimap.local', role: 'MANAGER', status: 'PENDING_ACTIVATION', joined: 1, passwordSet: false },
  { first: 'Stefano', last: 'Serra', email: 'stefano.serra@bimap.local', role: 'USER', status: 'DELETED', joined: 290, lastSeen: 200 },
];

export function seedPeople(): User[] {
  return PEOPLE.map((person, index) => ({
    id: `0000${index + 1}`.slice(-4).padStart(8, '0') + '-7b1e-4c8a-9f10-6a2d3c4b5e6f',
    firstName: person.first,
    lastName: person.last,
    fullName: `${person.first} ${person.last}`,
    email: person.email,
    status: person.status,
    role: person.role,
    authProvider: person.provider ?? 'LOCAL',
    passwordSet: person.passwordSet ?? true,
    permissions: permissionsOf(person.role),
    locale: 'it-IT',
    lastLoginAt: person.lastSeen === undefined ? undefined : daysAgo(person.lastSeen, 8 + (index % 9), (index * 7) % 60),
    createdAt: daysAgo(person.joined, 9, (index * 13) % 60),
    updatedAt: daysAgo(Math.min(person.joined, person.lastSeen ?? person.joined), 11, (index * 5) % 60),
  }));
}

/** The three people a visitor can look through, one per role. */
export const DEMO_PERSONAS: Record<ApplicationRole, string> = {
  ADMINISTRATOR: 'elena.ferrari@bimap.local',
  MANAGER: 'marco.bianchi@bimap.local',
  USER: 'giulia.rossi@bimap.local',
};
