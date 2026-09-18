import { AuthenticatedSession, User } from '../../core/api/iam.models';
import { SentEmail } from '../../core/api/notification.models';
import { DemoDb } from '../demo-db';
import { DemoGeography } from '../demo-geography';
import { DemoProblem, now, uuid } from '../demo-http';
import { DemoRuntime } from '../demo-runtime';

export interface DemoContext {
  db: DemoDb;
  geography: DemoGeography;
  runtime: DemoRuntime;
}

const ACCESS_PREFIX = 'demo-access.';
const REFRESH_PREFIX = 'demo-refresh.';

/** Demo tokens name their user openly: there is nothing to protect in a browser-only backend. */
export function issueSession(user: User): AuthenticatedSession {
  return {
    accessToken: `${ACCESS_PREFIX}${user.id}.${Date.now()}`,
    refreshToken: `${REFRESH_PREFIX}${user.id}.${uuid()}`,
    tokenType: 'Bearer',
    expiresIn: 3600,
    user: structuredClone(user),
  };
}

export function userFromAccessToken(db: DemoDb, authorization: string | null): User | null {
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (!token?.startsWith(ACCESS_PREFIX)) return null;
  const id = token.slice(ACCESS_PREFIX.length).split('.')[0];
  const user = db.state.users.find((candidate) => candidate.id === id);
  return user && user.status === 'ACTIVE' ? user : null;
}

export function userFromRefreshToken(db: DemoDb, token: string | undefined): User {
  const id = token?.startsWith(REFRESH_PREFIX) ? token.slice(REFRESH_PREFIX.length).split('.')[0] : null;
  const user = db.state.users.find((candidate) => candidate.id === id);
  if (!user) throw new DemoProblem(401, 'TOKEN_INVALID', 'The refresh token is no longer valid. Sign in again.');
  if (user.status !== 'ACTIVE') throw new DemoProblem(403, 'ACCOUNT_DISABLED', 'This account is no longer active.');
  return user;
}

/** Adds a row to the delivery log, the way every real send does. */
export function recordMail(context: DemoContext, mail: Omit<SentEmail, 'id' | 'sentAt' | 'attachments' | 'format'> & Partial<SentEmail>): SentEmail {
  const row: SentEmail = {
    id: uuid(),
    sentAt: now(),
    attachments: [],
    format: /<([a-z][a-z0-9]*)\b[^>]*>/i.test(mail.body ?? '') ? 'HTML' : 'TEXT',
    ...mail,
  };
  context.db.state.mail.unshift(row);
  return row;
}
