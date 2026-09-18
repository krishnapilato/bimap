import {
  ACCOUNT_TRANSITIONS,
  AccountStatus,
  ApplicationRole,
  User,
  isStrongPassword,
} from '../../core/api/iam.models';
import { transactionalBody } from '../seed/mail.seed';
import { permissionsOf } from '../seed/people.seed';
import {
  DemoProblem,
  DemoReply,
  DemoRoutes,
  fold,
  now,
  paginate,
  requireCaller,
  requireRole,
  text,
  uuid,
} from '../demo-http';
import { DemoContext, issueSession, recordMail, userFromRefreshToken } from './demo-context';

const SELF_ACTION: Record<AccountStatus, string> = {
  ACTIVE: 'activate',
  PENDING_ACTIVATION: 'deactivate',
  LOCKED: 'lock',
  DISABLED: 'disable',
  DELETED: 'delete',
};

const APP_URL = `${location.origin}${document.baseURI.replace(location.origin, '').replace(/\/$/, '')}`;

/** `/api/v1/auth` and `/api/v1/users`, with the same rules and refusals as the IAM service. */
export function registerIamHandlers(routes: DemoRoutes, context: DemoContext): void {
  const { db } = context;

  const guardSignIn = (user: User) => {
    switch (user.status) {
      case 'PENDING_ACTIVATION':
        throw new DemoProblem(403, 'ACCOUNT_NOT_ACTIVATED', 'Confirm your email address before signing in.');
      case 'LOCKED':
        throw new DemoProblem(403, 'ACCOUNT_LOCKED', 'This account is locked. Contact an administrator.');
      case 'DISABLED':
      case 'DELETED':
        throw new DemoProblem(403, 'ACCOUNT_DISABLED', 'This account is no longer active.');
    }
  };

  const requireStrong = (field: string, password: string | undefined) => {
    if (!password || !isStrongPassword(password)) {
      throw DemoProblem.invalid(field, 'Password needs at least 12 characters, an uppercase letter, a lowercase letter, a digit, a symbol, no whitespace');
    }
  };

  const activationMail = (user: User) =>
    recordMail(context, {
      to: user.email,
      subject: 'Confirm your BiMap account',
      template: 'ACCOUNT_ACTIVATION',
      status: 'SENT',
      body: transactionalBody('Confirm your email address', [`Hello ${user.firstName},`, 'Confirm this address to finish setting up your account.'], {
        label: 'Activate my account',
        href: `${APP_URL}/auth/activate?token=demo-activation.${user.id}`,
      }),
    });

  routes
    // ── Authentication ───────────────────────────────────────────────────────
    .post('iam', '/api/v1/auth/login', ({ body }) => {
      const user = db.userByEmail(body?.email);
      if (!user || !body?.password || user.status === 'DELETED') {
        throw new DemoProblem(401, 'INVALID_CREDENTIALS', 'The email address or password is incorrect');
      }
      guardSignIn(user);
      if (user.authProvider === 'GOOGLE') {
        throw new DemoProblem(401, 'INVALID_CREDENTIALS', 'This account signs in with Google. Use the Google button instead.');
      }
      user.lastLoginAt = now();
      db.touch();
      return issueSession(user);
    })
    .post('iam', '/api/v1/auth/google', () => {
      throw DemoProblem.rule('Google sign-in is not configured on this server.');
    })
    .post('iam', '/api/v1/auth/refresh', ({ body }) => issueSession(userFromRefreshToken(db, body?.refreshToken)))
    .post('iam', '/api/v1/auth/logout', (request) => {
      requireCaller(request);
      return DemoReply.noContent();
    })
    .post('iam', '/api/v1/auth/register', ({ body }) => {
      if (!body?.firstName || !body?.lastName || !body?.email) throw DemoProblem.invalid('email', 'must not be blank');
      requireStrong('password', body.password);
      if (db.userByEmail(body.email)) {
        throw new DemoProblem(409, 'EMAIL_ALREADY_REGISTERED', 'An account already exists for this email address.');
      }
      const user = newUser(body.firstName, body.lastName, body.email, 'USER', 'PENDING_ACTIVATION', true);
      db.state.users.push(user);
      activationMail(user);
      db.touch();
      return DemoReply.created(user);
    })
    .post('iam', '/api/v1/auth/activate', ({ body }) => {
      const id = String(body?.token ?? '').replace('demo-activation.', '');
      const user = db.state.users.find((candidate) => candidate.id === id);
      if (!user) throw new DemoProblem(401, 'TOKEN_EXPIRED', 'This link is no longer valid. Request a new one.');
      if (user.status === 'PENDING_ACTIVATION') {
        user.status = 'ACTIVE';
        user.updatedAt = now();
      }
      guardSignIn(user);
      db.touch();
      return issueSession(user);
    })
    .post('iam', '/api/v1/auth/activate/resend', ({ body }) => {
      const user = db.userByEmail(body?.email);
      if (user?.status === 'PENDING_ACTIVATION') activationMail(user);
      db.touch();
      return DemoReply.accepted({ message: 'If that address is waiting for confirmation, a new link is on its way.' });
    })
    .post('iam', '/api/v1/auth/password/forgot', ({ body }) => {
      const user = db.userByEmail(body?.email);
      if (user && user.authProvider === 'LOCAL' && user.status !== 'DELETED') {
        recordMail(context, {
          to: user.email,
          subject: 'Reset your BiMap password',
          template: 'PASSWORD_RESET',
          status: 'SENT',
          body: transactionalBody('Reset your password', [`Hello ${user.firstName},`, 'Someone asked to reset the password for this account.'], {
            label: 'Choose a new password',
            href: `${APP_URL}/auth/reset-password?token=demo-reset.${user.id}`,
          }),
        });
        db.touch();
      }
      return DemoReply.accepted({ message: 'If that address has an account, a reset link is on its way.' });
    })
    .post('iam', '/api/v1/auth/password/reset', ({ body }) => {
      const user = db.state.users.find((candidate) => candidate.id === String(body?.token ?? '').replace('demo-reset.', ''));
      if (!user) throw new DemoProblem(401, 'TOKEN_EXPIRED', 'This link is no longer valid. Request a new one.');
      requireStrong('newPassword', body?.newPassword);
      if (user.status === 'PENDING_ACTIVATION') user.status = 'ACTIVE';
      user.passwordSet = true;
      user.updatedAt = now();
      db.touch();
      return { message: 'Your password has been updated. Sign in with the new one.' };
    })
    .post('iam', '/api/v1/auth/password/change', (request) => {
      const caller = requireCaller(request);
      if (caller.authProvider !== 'LOCAL') throw DemoProblem.rule('This account signs in with Google and has no password.');
      if (!request.body?.currentPassword) throw new DemoProblem(401, 'INVALID_CREDENTIALS', 'The current password is not correct.');
      requireStrong('newPassword', request.body?.newPassword);
      if (request.body.currentPassword === request.body.newPassword) throw DemoProblem.rule('The new password must differ from the current one.');
      return DemoReply.noContent();
    })
    .get('iam', '/api/v1/auth/email-availability', (request) => {
      const email = text(request, 'email') ?? '';
      return { email, available: !db.userByEmail(email) };
    })

    // ── Users ────────────────────────────────────────────────────────────────
    .get('iam', '/api/v1/users/me', (request) => requireCaller(request))
    .get('iam', '/api/v1/users/statistics', (request) => {
      requireRole(request, 'MANAGER', 'ADMINISTRATOR');
      const count = (status: AccountStatus) => db.state.users.filter((user) => user.status === status).length;
      return {
        total: db.state.users.filter((user) => user.status !== 'DELETED').length,
        active: count('ACTIVE'),
        pendingActivation: count('PENDING_ACTIVATION'),
        locked: count('LOCKED'),
        disabled: count('DISABLED'),
      };
    })
    .get('iam', '/api/v1/users', (request) => {
      requireRole(request, 'MANAGER', 'ADMINISTRATOR');
      const term = fold(text(request, 'q'));
      const status = text(request, 'status');
      const matches = db.state.users.filter(
        (user) =>
          user.status !== 'DELETED' &&
          (!status || user.status === status) &&
          (!term || fold(`${user.firstName} ${user.lastName} ${user.email}`).includes(term)),
      );
      return paginate(matches, request, { size: 20, sort: 'createdAt,desc' });
    })
    .get('iam', '/api/v1/users/:id', (request) => {
      requireRole(request, 'MANAGER', 'ADMINISTRATOR');
      return findUser(request.params['id']);
    })
    .post('iam', '/api/v1/users', (request) => {
      requireRole(request, 'ADMINISTRATOR');
      const { firstName, lastName, email, password, role } = request.body ?? {};
      if (!firstName || !lastName || !email || !role) throw DemoProblem.invalid('email', 'must not be blank');
      if (password) requireStrong('password', password);
      if (db.userByEmail(email)) throw new DemoProblem(409, 'EMAIL_ALREADY_REGISTERED', 'An account already exists for this email address.');
      const user = newUser(firstName, lastName, email, role, 'PENDING_ACTIVATION', Boolean(password));
      db.state.users.push(user);
      activationMail(user);
      db.touch();
      return DemoReply.created(user);
    })
    .patch('iam', '/api/v1/users/:id', (request) => {
      requireRole(request, 'ADMINISTRATOR');
      const user = findUser(request.params['id']);
      const change = request.body ?? {};
      if (change.email && change.email.toLowerCase() !== user.email.toLowerCase() && db.userByEmail(change.email)) {
        throw new DemoProblem(409, 'EMAIL_ALREADY_REGISTERED', 'Another account already uses this email address.');
      }
      if (change.firstName) user.firstName = change.firstName.trim();
      if (change.lastName) user.lastName = change.lastName.trim();
      if (change.email) user.email = change.email.trim().toLowerCase();
      if (change.locale) user.locale = change.locale;
      if (change.role) {
        user.role = change.role as ApplicationRole;
        user.permissions = permissionsOf(user.role);
      }
      user.fullName = `${user.firstName} ${user.lastName}`;
      user.updatedAt = now();
      db.touch();
      return user;
    })
    .put('iam', '/api/v1/users/:id/status', (request) => {
      const caller = requireRole(request, 'ADMINISTRATOR');
      const user = findUser(request.params['id']);
      const target = request.body?.status as AccountStatus;
      if (caller.id === user.id && target !== 'ACTIVE') {
        throw DemoProblem.rule(`You cannot ${SELF_ACTION[target]} your own account.`);
      }
      if (user.status === target) return user;
      if (!ACCOUNT_TRANSITIONS[user.status].includes(target)) {
        throw DemoProblem.rule(`An account cannot move from ${user.status} to ${target}.`);
      }
      user.status = target;
      user.updatedAt = now();
      db.touch();
      return user;
    })
    .delete('iam', '/api/v1/users/:id', (request) => {
      const caller = requireRole(request, 'ADMINISTRATOR');
      const user = findUser(request.params['id']);
      if (caller.id === user.id) throw DemoProblem.rule('You cannot delete your own account.');
      user.status = 'DELETED';
      user.updatedAt = now();
      db.touch();
      return DemoReply.noContent();
    });

  function findUser(id: string): User {
    const user = db.state.users.find((candidate) => candidate.id === id);
    if (!user) throw DemoProblem.notFound(`User ${id} was not found`);
    return user;
  }
}

function newUser(firstName: string, lastName: string, email: string, role: ApplicationRole, status: AccountStatus, passwordSet: boolean): User {
  const timestamp = now();
  return {
    id: uuid(),
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    fullName: `${firstName.trim()} ${lastName.trim()}`,
    email: email.trim().toLowerCase(),
    status,
    role,
    authProvider: 'LOCAL',
    passwordSet,
    permissions: permissionsOf(role),
    locale: 'it-IT',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
