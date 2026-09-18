import { Injectable } from '@angular/core';

import { Subscriber } from '../core/api/mailing.models';
import { User } from '../core/api/iam.models';
import { SentEmail } from '../core/api/notification.models';
import { LoggersResponse } from '../core/api/platform.models';
import { Registration } from '../core/api/registry.models';
import { seedMail } from './seed/mail.seed';
import { DemoCampaign, DemoList, seedMailing } from './seed/mailing.seed';
import { DEMO_PERSONAS, seedPeople } from './seed/people.seed';
import { seedRegistrations } from './seed/registrations.seed';

export interface DemoState {
  version: number;
  users: User[];
  registrations: Registration[];
  mail: SentEmail[];
  lists: DemoList[];
  subscribers: Subscriber[];
  campaigns: DemoCampaign[];
  loggers: Record<'iam' | 'core', LoggersResponse['loggers']>;
}

const STORAGE_KEY = 'bimap.demo.state';
const VERSION = 3;

/**
 * Everything the demo backend knows, kept in memory and mirrored to local storage, so what a
 * visitor creates survives a reload until they reset the demo.
 */
@Injectable({ providedIn: 'root' })
export class DemoDb {
  state: DemoState = this.load();
  private saveTimer: ReturnType<typeof setTimeout> | undefined;

  userByEmail(email: string | undefined): User | undefined {
    const wanted = email?.toLowerCase();
    return this.state.users.find((user) => user.email.toLowerCase() === wanted);
  }

  persona(role: keyof typeof DEMO_PERSONAS): User {
    return this.userByEmail(DEMO_PERSONAS[role]) ?? this.state.users[0];
  }

  /** Writes soon, once, however many changes a request made. */
  touch(): void {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch {
        // A full or blocked storage only means the demo forgets on reload.
      }
    }, 150);
  }

  reset(): void {
    this.state = seed();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing stored, nothing to remove.
    }
  }

  private load(): DemoState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const stored = raw ? (JSON.parse(raw) as DemoState) : null;
      if (stored?.version === VERSION) return stored;
    } catch {
      // Fall through to a fresh seed.
    }
    return seed();
  }
}

function seed(): DemoState {
  const mailing = seedMailing();
  return {
    version: VERSION,
    users: seedPeople(),
    registrations: seedRegistrations(),
    mail: [...seedMail(), ...mailing.deliveries],
    lists: mailing.lists,
    subscribers: mailing.subscribers,
    campaigns: mailing.campaigns,
    loggers: { iam: seedLoggers('iam'), core: seedLoggers('business') },
  };
}

function seedLoggers(module: 'iam' | 'business'): LoggersResponse['loggers'] {
  const base = `com.bimap.${module}`;
  return {
    ROOT: { configuredLevel: 'INFO', effectiveLevel: 'INFO' },
    'com.bimap': { effectiveLevel: 'INFO' },
    'com.bimap.platform': { effectiveLevel: 'INFO' },
    [base]: { configuredLevel: 'INFO', effectiveLevel: 'INFO' },
    [`${base}.modules`]: { effectiveLevel: 'INFO' },
    'org.hibernate.SQL': { configuredLevel: 'WARN', effectiveLevel: 'WARN' },
    'org.springframework': { effectiveLevel: 'INFO' },
    'org.springframework.security': { configuredLevel: 'INFO', effectiveLevel: 'INFO' },
    'org.springframework.web': { effectiveLevel: 'INFO' },
    'com.zaxxer.hikari': { effectiveLevel: 'INFO' },
    'org.flywaydb': { effectiveLevel: 'INFO' },
  };
}
