import { SessionStore } from '../../core/auth/session.store';

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  exact?: boolean;
  section: 'workspace' | 'administration';
  /** Kept in the phone's bottom bar; everything else lives behind "More". */
  primary?: boolean;
  description: string;
  allowed: (sessions: SessionStore) => boolean;
}

/** Every destination, and who may see it. The routes enforce the same rules on the way in. */
export const NAVIGATION: readonly NavItem[] = [
  {
    id: 'home',
    label: 'Home',
    icon: 'house',
    path: '/',
    exact: true,
    section: 'workspace',
    primary: true,
    description: 'What needs your attention today',
    allowed: () => true,
  },
  {
    id: 'survey',
    label: 'Survey',
    icon: 'map-pin-plus',
    path: '/survey',
    section: 'workspace',
    primary: true,
    description: 'Register an asset on the map',
    allowed: (s) => s.can('registration:write'),
  },
  {
    id: 'registry',
    label: 'Registry',
    icon: 'landmark',
    path: '/registry',
    section: 'workspace',
    primary: true,
    description: 'Every registration, reviewed and exported',
    allowed: (s) => s.can('registration:read'),
  },
  {
    id: 'geography',
    label: 'Geography',
    icon: 'earth',
    path: '/geography',
    section: 'workspace',
    primary: true,
    description: 'Regions, comuni, streets and public bodies',
    allowed: () => true,
  },
  {
    id: 'people',
    label: 'People',
    icon: 'users',
    path: '/people',
    section: 'administration',
    description: 'Accounts, roles and their lifecycle',
    allowed: (s) => s.can('user:read'),
  },
  {
    id: 'mail',
    label: 'Mail',
    icon: 'mail',
    path: '/mail',
    section: 'administration',
    description: 'Every message sent, and sending one',
    allowed: (s) => s.isAtLeast('MANAGER'),
  },
  {
    id: 'audiences',
    label: 'Audiences',
    icon: 'megaphone',
    path: '/audiences',
    section: 'administration',
    description: 'Mailing lists, subscribers and campaigns',
    allowed: (s) => s.can('mailing:read'),
  },
  {
    id: 'health',
    label: 'System health',
    icon: 'activity',
    path: '/health',
    section: 'administration',
    description: 'Live status of both services',
    allowed: (s) => s.isAtLeast('MANAGER'),
  },
];
