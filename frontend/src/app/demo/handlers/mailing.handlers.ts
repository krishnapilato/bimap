import {
  AudienceCounts,
  Campaign,
  DeliveryCounts,
  MailingList,
  Subscriber,
  SubscriptionStatus,
} from '../../core/api/mailing.models';
import { DeliveryStatus, SentEmail } from '../../core/api/notification.models';
import { transactionalBody } from '../seed/mail.seed';
import { DemoCampaign, DemoList } from '../seed/mailing.seed';
import {
  DemoProblem,
  DemoReply,
  DemoRoutes,
  csvCell,
  fold,
  integer,
  now,
  paginate,
  requireAuthority,
  requireRole,
  text,
  uuid,
} from '../demo-http';
import { DemoContext, recordMail } from './demo-context';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const APP_URL = `${location.origin}${document.baseURI.replace(location.origin, '').replace(/\/$/, '')}`;

/** The delivery log, mailing lists, subscribers, campaigns and the public subscription flows. */
export function registerMailingHandlers(routes: DemoRoutes, context: DemoContext): void {
  const { db } = context;
  const state = () => db.state;

  // ── Views ──────────────────────────────────────────────────────────────────

  const audienceOf = (listId: string): AudienceCounts => {
    const members = state().subscribers.filter((s) => s.listId === listId);
    const count = (status: SubscriptionStatus) => members.filter((s) => s.status === status).length;
    return { total: members.length, subscribed: count('SUBSCRIBED'), pending: count('PENDING'), unsubscribed: count('UNSUBSCRIBED') };
  };

  const listView = (list: DemoList): MailingList => {
    const campaigns = state().campaigns.filter((c) => c.listId === list.id);
    const lastSent = campaigns
      .filter((c) => c.status === 'SENT' && c.completedAt)
      .map((c) => c.completedAt!)
      .sort()
      .pop();
    return {
      ...list,
      audience: audienceOf(list.id),
      campaignCount: campaigns.length,
      lastSentAt: lastSent,
      signupUrl: list.status === 'ACTIVE' && list.publicSignup ? `${APP_URL}/subscribe/${list.id}` : undefined,
    };
  };

  const deliveriesOf = (campaignId: string): DeliveryCounts => {
    const rows = state().mail.filter((m) => m.campaignId === campaignId && m.template === 'CAMPAIGN');
    const count = (status: DeliveryStatus) => rows.filter((m) => m.status === status).length;
    return { queued: count('QUEUED'), sent: count('SENT'), failed: count('FAILED') };
  };

  const campaignView = (campaign: DemoCampaign): Campaign => ({
    ...campaign,
    listName: findList(campaign.listId).name,
    format: /<([a-z][a-z0-9]*)\b[^>]*>/i.test(campaign.body) ? 'HTML' : 'TEXT',
    deliveries: deliveriesOf(campaign.id),
  });

  // ── Lookups ────────────────────────────────────────────────────────────────

  function findList(id: string): DemoList {
    const list = state().lists.find((candidate) => candidate.id === id);
    if (!list) throw DemoProblem.notFound(`Mailing list ${id} was not found`);
    return list;
  }

  function activeList(id: string): DemoList {
    const list = findList(id);
    if (list.status !== 'ACTIVE') throw DemoProblem.rule('This list is archived. Restore it before changing who is on it.');
    return list;
  }

  function findSubscriber(listId: string, id: string): Subscriber {
    const subscriber = state().subscribers.find((s) => s.listId === listId && s.id === id);
    if (!subscriber) throw DemoProblem.notFound(`Subscriber ${id} was not found`);
    return subscriber;
  }

  function findCampaign(listId: string, id: string): DemoCampaign {
    const campaign = state().campaigns.find((c) => c.listId === listId && c.id === id);
    if (!campaign) throw DemoProblem.notFound(`Campaign ${id} was not found`);
    return campaign;
  }

  function subscriberByToken(token: string | undefined): Subscriber {
    const id = token?.startsWith('demo-sub.') ? token.slice('demo-sub.'.length) : null;
    const subscriber = state().subscribers.find((s) => s.id === id);
    if (!subscriber) throw DemoProblem.notFound('This link is not valid, or the subscription it belonged to no longer exists.');
    return subscriber;
  }

  const subscriptionView = (subscriber: Subscriber) => {
    const list = findList(subscriber.listId);
    return {
      listId: list.id,
      listName: list.name,
      listDescription: list.description,
      listActive: list.status === 'ACTIVE',
      email: subscriber.email,
      firstName: subscriber.firstName,
      status: subscriber.status,
      subscribedAt: subscriber.subscribedAt,
      unsubscribedAt: subscriber.unsubscribedAt,
    };
  };

  const confirm = (subscriber: Subscriber) => {
    subscriber.status = 'SUBSCRIBED';
    subscriber.subscribedAt = now();
    subscriber.unsubscribedAt = undefined;
    subscriber.unsubscribeReason = undefined;
    subscriber.updatedAt = now();
  };

  const unsubscribe = (subscriber: Subscriber, reason?: string) => {
    if (subscriber.status === 'UNSUBSCRIBED') return;
    subscriber.status = 'UNSUBSCRIBED';
    subscriber.unsubscribedAt = now();
    subscriber.unsubscribeReason = reason;
    subscriber.updatedAt = now();
  };

  const sendConfirmation = (subscriber: Subscriber, list: DemoList) => {
    subscriber.confirmationSentAt = now();
    recordMail(context, {
      to: subscriber.email,
      subject: `Confirm your subscription to ${list.name}`,
      template: 'SUBSCRIPTION_CONFIRMATION',
      status: 'SENT',
      body: transactionalBody('Confirm your subscription', [
        `Hello ${subscriber.firstName ?? 'there'},`,
        `Confirm that you want to receive <strong>${list.name}</strong>. Nothing is sent to this address until you do.`,
      ], { label: 'Confirm my subscription', href: `${APP_URL}/subscriptions/confirm?token=demo-sub.${subscriber.id}` }),
    });
  };

  const newSubscriber = (listId: string, email: string, firstName: string | undefined, lastName: string | undefined, source: Subscriber['source']): Subscriber => {
    const timestamp = now();
    return {
      id: uuid(),
      listId,
      email: email.trim().toLowerCase(),
      firstName: firstName?.trim() || undefined,
      lastName: lastName?.trim() || undefined,
      fullName: `${firstName ?? ''} ${lastName ?? ''}`.trim(),
      status: 'PENDING',
      source,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  };

  routes
    // ── Delivery log ─────────────────────────────────────────────────────────
    .get('iam', '/api/v1/notifications', (request) => {
      requireRole(request, 'MANAGER', 'ADMINISTRATOR');
      const recipient = fold(text(request, 'recipient'));
      const status = text(request, 'status');
      const rows = state()
        .mail.filter((m) => (!recipient || fold(m.to).includes(recipient)) && (!status || m.status === status))
        .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
      return paginate(rows, request, { size: 25 });
    })
    .get('iam', '/api/v1/notifications/:id', (request) => {
      requireRole(request, 'MANAGER', 'ADMINISTRATOR');
      const row = state().mail.find((m) => m.id === request.params['id']);
      if (!row) throw DemoProblem.notFound('No such message');
      return row;
    })
    .post('iam', '/api/v1/notifications', (request) => {
      requireRole(request, 'ADMINISTRATOR');
      const { to, subject, body, attachments = [] } = request.body ?? {};
      if (!EMAIL.test(to ?? '')) throw DemoProblem.invalid('to', 'must be a well-formed email address', to);
      if (!subject?.trim()) throw DemoProblem.invalid('subject', 'must not be blank');
      if (!body?.trim()) throw DemoProblem.invalid('body', 'must not be blank');
      const row = recordMail(context, {
        to,
        subject,
        status: to.endsWith('.invalid') ? 'FAILED' : 'SENT',
        failureReason: to.endsWith('.invalid') ? '550 5.1.2 Domain name not found' : undefined,
        body,
        attachments: attachments.map((a: { filename: string; content: string }) => ({
          filename: a.filename,
          sizeBytes: Math.floor((a.content.length * 3) / 4),
        })),
      });
      db.touch();
      return DemoReply.created(row);
    })

    // ── Mailing lists ────────────────────────────────────────────────────────
    .get('iam', '/api/v1/mailing-lists/overview', (request) => {
      requireAuthority(request, 'mailing:read');
      const all = state().subscribers;
      const count = (status: SubscriptionStatus) => all.filter((s) => s.status === status).length;
      const since = Date.now() - 30 * 86_400_000;
      const recent = state().mail.filter((m) => m.template === 'CAMPAIGN' && new Date(m.sentAt).getTime() >= since);
      const campaigns = state().campaigns;
      const byStatus = (status: DemoCampaign['status']) => campaigns.filter((c) => c.status === status).length;
      return {
        activeLists: state().lists.filter((l) => l.status === 'ACTIVE').length,
        archivedLists: state().lists.filter((l) => l.status === 'ARCHIVED').length,
        audience: { total: all.length, subscribed: count('SUBSCRIBED'), pending: count('PENDING'), unsubscribed: count('UNSUBSCRIBED') },
        uniqueSubscribers: new Set(all.filter((s) => s.status === 'SUBSCRIBED').map((s) => s.email)).size,
        campaigns: { drafts: byStatus('DRAFT'), scheduled: byStatus('SCHEDULED'), sending: byStatus('SENDING'), sent: byStatus('SENT'), cancelled: byStatus('CANCELLED') },
        deliveries: {
          queued: recent.filter((m) => m.status === 'QUEUED').length,
          sent: recent.filter((m) => m.status === 'SENT').length,
          failed: recent.filter((m) => m.status === 'FAILED').length,
        },
        growth: growth(state().subscribers, 30),
      };
    })
    .get('iam', '/api/v1/mailing-lists', (request) => {
      requireAuthority(request, 'mailing:read');
      const term = fold(text(request, 'q'));
      const status = text(request, 'status');
      const lists = state()
        .lists.filter((l) => (!status || l.status === status) && (!term || fold(`${l.name} ${l.description ?? ''}`).includes(term)))
        .map(listView);
      return paginate(lists, request, { size: 20, sort: 'createdAt,desc' });
    })
    .get('iam', '/api/v1/mailing-lists/:listId', (request) => {
      requireAuthority(request, 'mailing:read');
      return listView(findList(request.params['listId']));
    })
    .post('iam', '/api/v1/mailing-lists', (request) => {
      const caller = requireAuthority(request, 'mailing:write');
      const name = String(request.body?.name ?? '').trim();
      if (!name) throw DemoProblem.invalid('name', 'must not be blank');
      if (state().lists.some((l) => fold(l.name) === fold(name))) throw DemoProblem.conflict('A mailing list with this name already exists.');
      const timestamp = now();
      const list: DemoList = {
        id: uuid(),
        name,
        description: request.body?.description?.trim() || undefined,
        doubleOptIn: request.body?.doubleOptIn ?? true,
        publicSignup: request.body?.publicSignup ?? false,
        status: 'ACTIVE',
        createdBy: caller.email,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      state().lists.push(list);
      db.touch();
      return DemoReply.created(listView(list));
    })
    .patch('iam', '/api/v1/mailing-lists/:listId', (request) => {
      requireAuthority(request, 'mailing:write');
      const list = findList(request.params['listId']);
      const change = request.body ?? {};
      if (change.name !== undefined) {
        const name = String(change.name).trim();
        if (!name) throw DemoProblem.invalid('name', 'must not be blank');
        if (state().lists.some((l) => l.id !== list.id && fold(l.name) === fold(name))) {
          throw DemoProblem.conflict('A mailing list with this name already exists.');
        }
        list.name = name;
      }
      if (change.description !== undefined) list.description = String(change.description).trim() || undefined;
      if (change.doubleOptIn !== undefined) list.doubleOptIn = change.doubleOptIn;
      if (change.publicSignup !== undefined) list.publicSignup = change.publicSignup;
      list.updatedAt = now();
      db.touch();
      return listView(list);
    })
    .put('iam', '/api/v1/mailing-lists/:listId/status', (request) => {
      requireAuthority(request, 'mailing:write');
      const list = findList(request.params['listId']);
      const status = request.body?.status;
      if (status === 'ARCHIVED') {
        const campaigns = state().campaigns.filter((c) => c.listId === list.id);
        if (campaigns.some((c) => c.status === 'SENDING')) {
          throw DemoProblem.rule('A campaign is still sending to this list. Stop it or let it finish first.');
        }
        campaigns.filter((c) => c.status === 'SCHEDULED').forEach((c) => {
          c.status = 'DRAFT';
          c.scheduledAt = undefined;
        });
      }
      list.status = status;
      list.updatedAt = now();
      db.touch();
      return listView(list);
    })
    .delete('iam', '/api/v1/mailing-lists/:listId', (request) => {
      requireAuthority(request, 'mailing:write');
      const list = findList(request.params['listId']);
      if (list.status === 'ACTIVE') throw DemoProblem.rule('Archive the list before deleting it.');
      state().lists = state().lists.filter((l) => l.id !== list.id);
      state().subscribers = state().subscribers.filter((s) => s.listId !== list.id);
      state().campaigns = state().campaigns.filter((c) => c.listId !== list.id);
      db.touch();
      return DemoReply.noContent();
    })
    .get('iam', '/api/v1/mailing-lists/:listId/growth', (request) => {
      requireAuthority(request, 'mailing:read');
      const list = findList(request.params['listId']);
      return growth(state().subscribers.filter((s) => s.listId === list.id), integer(request, 'days', 30));
    })

    // ── Subscribers ──────────────────────────────────────────────────────────
    .get('iam', '/api/v1/mailing-lists/:listId/subscribers/export', (request) => {
      requireAuthority(request, 'mailing:read');
      const list = findList(request.params['listId']);
      const status = text(request, 'status');
      const rows = state().subscribers.filter((s) => s.listId === list.id && (!status || s.status === status));
      const header = ['email', 'first_name', 'last_name', 'status', 'source', 'subscribed_at', 'unsubscribed_at', 'unsubscribe_reason', 'added_at'];
      const lines = rows.map((s) =>
        [s.email, s.firstName, s.lastName, s.status, s.source, s.subscribedAt, s.unsubscribedAt, s.unsubscribeReason, s.createdAt].map(csvCell).join(','),
      );
      const slug = fold(list.name).replace(/\s+/g, '-');
      return DemoReply.csv([header.map(csvCell).join(','), ...lines].join('\n'), `bimap-${slug}-subscribers.csv`);
    })
    .get('iam', '/api/v1/mailing-lists/:listId/subscribers', (request) => {
      requireAuthority(request, 'mailing:read');
      const list = findList(request.params['listId']);
      const term = fold(text(request, 'q'));
      const status = text(request, 'status');
      const rows = state().subscribers.filter(
        (s) =>
          s.listId === list.id &&
          (!status || s.status === status) &&
          (!term || fold(`${s.email} ${s.firstName ?? ''} ${s.lastName ?? ''}`).includes(term)),
      );
      return paginate(rows, request, { size: 25, sort: 'createdAt,desc' });
    })
    .get('iam', '/api/v1/mailing-lists/:listId/subscribers/:subscriberId', (request) => {
      requireAuthority(request, 'mailing:read');
      return findSubscriber(request.params['listId'], request.params['subscriberId']);
    })
    .post('iam', '/api/v1/mailing-lists/:listId/subscribers/import', (request) => {
      requireAuthority(request, 'mailing:write');
      const list = activeList(request.params['listId']);
      const rows: Array<{ email?: string; firstName?: string; lastName?: string }> = request.body?.rows ?? [];
      if (rows.length === 0) throw DemoProblem.invalid('rows', 'must not be empty');
      if (rows.length > 5000) throw DemoProblem.rule('An import can carry at most 5000 rows. Split the file and try again.');

      const report = { received: rows.length, created: 0, updated: 0, unchanged: 0, rejected: [] as Array<{ row: number; email?: string; reason: string }> };
      const seen = new Set<string>();
      rows.forEach((row, index) => {
        const email = row?.email?.trim().toLowerCase();
        if (!email) return void report.rejected.push({ row: index + 1, email: row?.email, reason: 'The address is missing' });
        if (!EMAIL.test(email)) return void report.rejected.push({ row: index + 1, email: row.email, reason: 'This is not a valid email address' });
        if (seen.has(email)) return void report.unchanged++;
        seen.add(email);

        const existing = state().subscribers.find((s) => s.listId === list.id && s.email === email);
        if (!existing) {
          const subscriber = newSubscriber(list.id, email, row.firstName, row.lastName, 'IMPORT');
          if (request.body?.consent === 'CONFIRMED') confirm(subscriber);
          else sendConfirmation(subscriber, list);
          state().subscribers.push(subscriber);
          report.created++;
        } else if (request.body?.updateExisting && (row.firstName || row.lastName)) {
          existing.firstName = row.firstName?.trim() || existing.firstName;
          existing.lastName = row.lastName?.trim() || existing.lastName;
          existing.fullName = `${existing.firstName ?? ''} ${existing.lastName ?? ''}`.trim();
          existing.updatedAt = now();
          report.updated++;
        } else {
          report.unchanged++;
        }
      });
      db.touch();
      return report;
    })
    .post('iam', '/api/v1/mailing-lists/:listId/subscribers', (request) => {
      requireAuthority(request, 'mailing:write');
      const list = activeList(request.params['listId']);
      const email = String(request.body?.email ?? '').trim().toLowerCase();
      if (!EMAIL.test(email)) throw DemoProblem.invalid('email', 'must be a well-formed email address', email);
      const existing = state().subscribers.find((s) => s.listId === list.id && s.email === email);
      if (existing) throw DemoProblem.conflict('This address is already on the list.', { subscriberId: existing.id });

      const subscriber = newSubscriber(list.id, email, request.body?.firstName, request.body?.lastName, 'ADMIN');
      if (request.body?.consent === 'CONFIRMED') confirm(subscriber);
      else sendConfirmation(subscriber, list);
      state().subscribers.push(subscriber);
      db.touch();
      return DemoReply.created(subscriber);
    })
    .patch('iam', '/api/v1/mailing-lists/:listId/subscribers/:subscriberId', (request) => {
      requireAuthority(request, 'mailing:write');
      const subscriber = findSubscriber(request.params['listId'], request.params['subscriberId']);
      if (request.body?.firstName !== undefined) subscriber.firstName = request.body.firstName.trim() || undefined;
      if (request.body?.lastName !== undefined) subscriber.lastName = request.body.lastName.trim() || undefined;
      subscriber.fullName = `${subscriber.firstName ?? ''} ${subscriber.lastName ?? ''}`.trim();
      subscriber.updatedAt = now();
      db.touch();
      return subscriber;
    })
    .put('iam', '/api/v1/mailing-lists/:listId/subscribers/:subscriberId/status', (request) => {
      requireAuthority(request, 'mailing:write');
      const list = findList(request.params['listId']);
      const subscriber = findSubscriber(list.id, request.params['subscriberId']);
      switch (request.body?.status as SubscriptionStatus) {
        case 'SUBSCRIBED':
          activeList(list.id);
          confirm(subscriber);
          break;
        case 'UNSUBSCRIBED':
          unsubscribe(subscriber, request.body?.reason || 'Removed by an administrator');
          break;
        case 'PENDING':
          activeList(list.id);
          guardCooldown(subscriber);
          subscriber.status = 'PENDING';
          subscriber.unsubscribedAt = undefined;
          sendConfirmation(subscriber, list);
          break;
      }
      db.touch();
      return subscriber;
    })
    .post('iam', '/api/v1/mailing-lists/:listId/subscribers/:subscriberId/confirmation', (request) => {
      requireAuthority(request, 'mailing:write');
      const list = activeList(request.params['listId']);
      const subscriber = findSubscriber(list.id, request.params['subscriberId']);
      if (subscriber.status !== 'PENDING') throw DemoProblem.rule('Only an address that has not confirmed yet can be asked again.');
      guardCooldown(subscriber);
      sendConfirmation(subscriber, list);
      db.touch();
      return DemoReply.accepted();
    })
    .delete('iam', '/api/v1/mailing-lists/:listId/subscribers/:subscriberId', (request) => {
      requireAuthority(request, 'mailing:write');
      const subscriber = findSubscriber(request.params['listId'], request.params['subscriberId']);
      state().subscribers = state().subscribers.filter((s) => s.id !== subscriber.id);
      db.touch();
      return DemoReply.noContent();
    })

    // ── Campaigns ────────────────────────────────────────────────────────────
    .get('iam', '/api/v1/mailing-lists/:listId/campaigns', (request) => {
      requireAuthority(request, 'mailing:read');
      const list = findList(request.params['listId']);
      const status = text(request, 'status');
      const rows = state().campaigns.filter((c) => c.listId === list.id && (!status || c.status === status)).map(campaignView);
      return paginate(rows, request, { size: 20, sort: 'createdAt,desc' });
    })
    .get('iam', '/api/v1/mailing-lists/:listId/campaigns/:campaignId', (request) => {
      requireAuthority(request, 'mailing:read');
      return campaignView(findCampaign(request.params['listId'], request.params['campaignId']));
    })
    .get('iam', '/api/v1/mailing-lists/:listId/campaigns/:campaignId/deliveries', (request) => {
      requireAuthority(request, 'mailing:read');
      const campaign = findCampaign(request.params['listId'], request.params['campaignId']);
      const status = text(request, 'status');
      const rows = state()
        .mail.filter((m) => m.campaignId === campaign.id && m.template === 'CAMPAIGN' && (!status || m.status === status))
        .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
      return paginate(rows, request, { size: 25 });
    })
    .post('iam', '/api/v1/mailing-lists/:listId/campaigns', (request) => {
      const caller = requireAuthority(request, 'mailing:write');
      const list = activeList(request.params['listId']);
      if (!request.body?.subject?.trim()) throw DemoProblem.invalid('subject', 'must not be blank');
      if (!request.body?.body?.trim()) throw DemoProblem.invalid('body', 'must not be blank');
      const timestamp = now();
      const campaign: DemoCampaign = {
        id: uuid(),
        listId: list.id,
        subject: request.body.subject.trim(),
        preheader: request.body.preheader?.trim() || undefined,
        body: request.body.body,
        status: 'DRAFT',
        recipientCount: 0,
        createdBy: caller.email,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      state().campaigns.push(campaign);
      db.touch();
      return DemoReply.created(campaignView(campaign));
    })
    .patch('iam', '/api/v1/mailing-lists/:listId/campaigns/:campaignId', (request) => {
      requireAuthority(request, 'mailing:write');
      const campaign = editable(findCampaign(request.params['listId'], request.params['campaignId']));
      const change = request.body ?? {};
      if (change.subject !== undefined) campaign.subject = String(change.subject).trim();
      if (change.preheader !== undefined) campaign.preheader = String(change.preheader).trim() || undefined;
      if (change.body !== undefined) campaign.body = change.body;
      campaign.updatedAt = now();
      db.touch();
      return campaignView(campaign);
    })
    .delete('iam', '/api/v1/mailing-lists/:listId/campaigns/:campaignId', (request) => {
      requireAuthority(request, 'mailing:write');
      const campaign = findCampaign(request.params['listId'], request.params['campaignId']);
      if (campaign.startedAt) throw DemoProblem.rule('A campaign that has started sending stays on record and cannot be deleted.');
      state().campaigns = state().campaigns.filter((c) => c.id !== campaign.id);
      db.touch();
      return DemoReply.noContent();
    })
    .post('iam', '/api/v1/mailing-lists/:listId/campaigns/:campaignId/duplicate', (request) => {
      const caller = requireAuthority(request, 'mailing:write');
      const original = findCampaign(request.params['listId'], request.params['campaignId']);
      activeList(original.listId);
      const timestamp = now();
      const copy: DemoCampaign = {
        id: uuid(),
        listId: original.listId,
        subject: original.subject,
        preheader: original.preheader,
        body: original.body,
        status: 'DRAFT',
        recipientCount: 0,
        createdBy: caller.email,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      state().campaigns.push(copy);
      db.touch();
      return DemoReply.created(campaignView(copy));
    })
    .post('iam', '/api/v1/mailing-lists/:listId/campaigns/:campaignId/schedule', (request) => {
      requireAuthority(request, 'mailing:write');
      const campaign = editable(findCampaign(request.params['listId'], request.params['campaignId']));
      activeList(campaign.listId);
      const sendAt = request.body?.sendAt;
      if (!sendAt || new Date(sendAt).getTime() <= Date.now()) throw DemoProblem.invalid('sendAt', 'must be a future date', sendAt);
      campaign.status = 'SCHEDULED';
      campaign.scheduledAt = new Date(sendAt).toISOString();
      campaign.updatedAt = now();
      db.touch();
      return campaignView(campaign);
    })
    .post('iam', '/api/v1/mailing-lists/:listId/campaigns/:campaignId/unschedule', (request) => {
      requireAuthority(request, 'mailing:write');
      const campaign = findCampaign(request.params['listId'], request.params['campaignId']);
      if (campaign.status !== 'SCHEDULED') throw DemoProblem.rule('Only a scheduled campaign can be unscheduled.');
      campaign.status = 'DRAFT';
      campaign.scheduledAt = undefined;
      campaign.updatedAt = now();
      db.touch();
      return campaignView(campaign);
    })
    .post('iam', '/api/v1/mailing-lists/:listId/campaigns/:campaignId/send', (request) => {
      requireAuthority(request, 'mailing:write');
      const campaign = findCampaign(request.params['listId'], request.params['campaignId']);
      const list = findList(campaign.listId);
      if (list.status !== 'ACTIVE') throw DemoProblem.rule('The list is archived, so nothing can be sent to it.');
      if (campaign.status === 'SENDING') throw DemoProblem.conflict('This campaign is already being sent.');
      if (campaign.status !== 'DRAFT' && campaign.status !== 'SCHEDULED') throw DemoProblem.rule('This campaign has already been sent.');
      const recipients = state().subscribers.filter((s) => s.listId === list.id && s.status === 'SUBSCRIBED');
      if (recipients.length === 0) throw DemoProblem.rule('Nobody on this list has confirmed a subscription yet.');

      campaign.status = 'SENDING';
      campaign.startedAt = now();
      campaign.scheduledAt = undefined;
      campaign.recipientCount = recipients.length;
      deliverGradually(campaign, recipients);
      db.touch();
      return new DemoReply(202, campaignView(campaign));
    })
    .post('iam', '/api/v1/mailing-lists/:listId/campaigns/:campaignId/cancel', (request) => {
      requireAuthority(request, 'mailing:write');
      const campaign = findCampaign(request.params['listId'], request.params['campaignId']);
      if (campaign.status !== 'SENDING') throw DemoProblem.rule('Only a campaign that is sending can be stopped.');
      campaign.status = 'CANCELLED';
      campaign.completedAt = now();
      db.touch();
      return campaignView(campaign);
    })
    .post('iam', '/api/v1/mailing-lists/:listId/campaigns/:campaignId/test', (request) => {
      requireAuthority(request, 'mailing:write');
      const campaign = findCampaign(request.params['listId'], request.params['campaignId']);
      const to = String(request.body?.to ?? '').trim();
      if (!EMAIL.test(to)) throw DemoProblem.invalid('to', 'must be a well-formed email address', to);
      const row = recordMail(context, {
        to,
        subject: `[Test] ${campaign.subject}`,
        template: 'CAMPAIGN_TEST',
        campaignId: campaign.id,
        status: 'SENT',
        body: campaign.body.replace(/\{\{\s*firstName\s*}}/g, request.caller?.firstName ?? 'there'),
      });
      db.touch();
      return DemoReply.created(row);
    })

    // ── Public subscription flows ───────────────────────────────────────────
    .get('iam', '/api/v1/subscriptions/lists/:listId', ({ params }) => {
      const list = state().lists.find((l) => l.id === params['listId'] && l.status === 'ACTIVE' && l.publicSignup);
      if (!list) throw DemoProblem.notFound(`Mailing list ${params['listId']} was not found`);
      return { id: list.id, name: list.name, description: list.description, doubleOptIn: list.doubleOptIn };
    })
    .post('iam', '/api/v1/subscriptions', ({ body }) => {
      const list = state().lists.find((l) => l.id === body?.listId && l.status === 'ACTIVE' && l.publicSignup);
      if (!list) throw DemoProblem.notFound(`Mailing list ${body?.listId} was not found`);
      const email = String(body?.email ?? '').trim().toLowerCase();
      if (!EMAIL.test(email)) throw DemoProblem.invalid('email', 'must be a well-formed email address', email);

      let subscriber = state().subscribers.find((s) => s.listId === list.id && s.email === email);
      if (subscriber?.status !== 'SUBSCRIBED') {
        if (!subscriber) {
          subscriber = newSubscriber(list.id, email, body?.firstName, body?.lastName, 'SIGNUP_FORM');
          state().subscribers.push(subscriber);
        }
        if (list.doubleOptIn) sendConfirmation(subscriber, list);
        else confirm(subscriber);
        db.touch();
      }
      return DemoReply.accepted({ message: 'Thanks. If this address needs confirming, a link is on its way.' });
    })
    .post('iam', '/api/v1/subscriptions/confirm', ({ body }) => {
      const subscriber = subscriberByToken(body?.token);
      if (subscriber.status === 'PENDING') {
        if (findList(subscriber.listId).status !== 'ACTIVE') throw DemoProblem.rule('This list has been archived and no longer takes subscribers.');
        confirm(subscriber);
        db.touch();
      }
      return subscriptionView(subscriber);
    })
    .get('iam', '/api/v1/subscriptions/manage', (request) => subscriptionView(subscriberByToken(text(request, 'token'))))
    .post('iam', '/api/v1/subscriptions/unsubscribe', ({ body }) => {
      const subscriber = subscriberByToken(body?.token);
      unsubscribe(subscriber, body?.reason || undefined);
      db.touch();
      return subscriptionView(subscriber);
    })
    .post('iam', '/api/v1/subscriptions/resubscribe', ({ body }) => {
      const subscriber = subscriberByToken(body?.token);
      if (findList(subscriber.listId).status !== 'ACTIVE') throw DemoProblem.rule('This list has been archived and no longer takes subscribers.');
      if (subscriber.status !== 'SUBSCRIBED') confirm(subscriber);
      db.touch();
      return subscriptionView(subscriber);
    });

  function editable(campaign: DemoCampaign): DemoCampaign {
    if (campaign.status !== 'DRAFT' && campaign.status !== 'SCHEDULED') {
      throw DemoProblem.rule('A campaign can only be changed before it starts sending.');
    }
    return campaign;
  }

  function guardCooldown(subscriber: Subscriber): void {
    if (subscriber.confirmationSentAt && Date.now() - new Date(subscriber.confirmationSentAt).getTime() < 5 * 60_000) {
      throw DemoProblem.rule('A confirmation went to this address less than 5 minutes ago.');
    }
  }

  /** Mirrors the paced worker: one message every few hundred milliseconds, stoppable in between. */
  function deliverGradually(campaign: DemoCampaign, recipients: Subscriber[]): void {
    let index = 0;
    const timer = setInterval(() => {
      if (campaign.status !== 'SENDING' || index >= recipients.length) {
        clearInterval(timer);
        if (campaign.status === 'SENDING') {
          campaign.status = 'SENT';
          campaign.completedAt = now();
        }
        db.touch();
        return;
      }
      const batch = recipients.slice(index, index + 3);
      for (const subscriber of batch) {
        const failed = Math.random() < 0.03;
        const row: SentEmail = {
          id: uuid(),
          to: subscriber.email,
          subject: campaign.subject,
          template: 'CAMPAIGN',
          campaignId: campaign.id,
          format: 'HTML',
          status: failed ? 'FAILED' : 'SENT',
          body: campaign.body.replace(/\{\{\s*firstName\s*}}/g, subscriber.firstName ?? ''),
          attachments: [],
          failureReason: failed ? '452 4.2.2 The email account that you tried to reach is over quota' : undefined,
          sentAt: now(),
        };
        state().mail.unshift(row);
      }
      index += batch.length;
    }, 320);
  }
}

/** Daily joins and leaves over the last `days` days, oldest first. */
function growth(subscribers: Subscriber[], days: number) {
  const points = new Map<string, { date: string; subscribed: number; unsubscribed: number }>();
  for (let offset = days - 1; offset >= 0; offset--) {
    const date = new Date(Date.now() - offset * 86_400_000).toISOString().slice(0, 10);
    points.set(date, { date, subscribed: 0, unsubscribed: 0 });
  }
  for (const subscriber of subscribers) {
    const joined = points.get(subscriber.subscribedAt?.slice(0, 10) ?? '');
    if (joined) joined.subscribed++;
    const left = points.get(subscriber.unsubscribedAt?.slice(0, 10) ?? '');
    if (left) left.unsubscribed++;
  }
  return [...points.values()];
}

