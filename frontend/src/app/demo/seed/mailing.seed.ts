import {
  Campaign,
  CampaignStatus,
  MailingList,
  Subscriber,
  SubscriptionSource,
  SubscriptionStatus,
} from '../../core/api/mailing.models';
import { SentEmail } from '../../core/api/notification.models';
import { daysAgo, seededRandom } from '../demo-http';

export type DemoList = Omit<MailingList, 'audience' | 'campaignCount' | 'lastSentAt' | 'signupUrl'>;
export type DemoCampaign = Omit<Campaign, 'deliveries' | 'listName' | 'format'>;

const FIRST = ['Giulia', 'Marco', 'Chiara', 'Luca', 'Sofia', 'Alessandro', 'Martina', 'Francesco', 'Aurora', 'Lorenzo', 'Alice', 'Matteo', 'Ginevra', 'Leonardo', 'Emma', 'Tommaso', 'Beatrice', 'Riccardo', 'Anna', 'Edoardo', 'Vittoria', 'Gabriele', 'Camilla', 'Pietro', 'Bianca', 'Nicola', 'Elena', 'Filippo', 'Irene', 'Davide'];
const LAST = ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'De Luca', 'Mancini', 'Costa', 'Giordano', 'Rizzo', 'Lombardi', 'Moretti', 'Barbieri', 'Fontana', 'Santoro', 'Mariani', 'Rinaldi', 'Caruso', 'Ferrara', 'Galli', 'Martini', 'Leone'];
const DOMAINS = ['example.com', 'example.org', 'posta.example.it', 'studio.example.net'];
const REASONS = ['Too many emails', 'No longer working on the survey', 'Moved to another region', undefined];

interface ListSeed {
  id: string;
  name: string;
  description: string;
  doubleOptIn: boolean;
  publicSignup: boolean;
  status: 'ACTIVE' | 'ARCHIVED';
  size: number;
  age: number;
}

const LISTS: ListSeed[] = [
  { id: '5d6f7a80-1b2c-4d3e-9f40-000000000001', name: 'Heritage survey bulletin', description: 'Monthly notes for the surveyors registering protected assets across Italy.', doubleOptIn: true, publicSignup: true, status: 'ACTIVE', size: 146, age: 120 },
  { id: '5d6f7a80-1b2c-4d3e-9f40-000000000002', name: 'Regional coordinators', description: 'Verification targets and review deadlines for regional coordinators.', doubleOptIn: false, publicSignup: false, status: 'ACTIVE', size: 32, age: 210 },
  { id: '5d6f7a80-1b2c-4d3e-9f40-000000000003', name: 'Registry change notices', description: 'Changes to codes, cadastral references and the registration form.', doubleOptIn: true, publicSignup: true, status: 'ACTIVE', size: 68, age: 75 },
  { id: '5d6f7a80-1b2c-4d3e-9f40-000000000004', name: '2025 field season', description: 'The volunteers of last year’s survey campaign.', doubleOptIn: true, publicSignup: false, status: 'ARCHIVED', size: 51, age: 380 },
];

export interface MailingSeed {
  lists: DemoList[];
  subscribers: Subscriber[];
  campaigns: DemoCampaign[];
  deliveries: SentEmail[];
}

export function seedMailing(): MailingSeed {
  const random = seededRandom(20260917);
  const pick = <T>(items: readonly T[]) => items[Math.floor(random() * items.length)];

  const lists: DemoList[] = LISTS.map((seed) => ({
    id: seed.id,
    name: seed.name,
    description: seed.description,
    doubleOptIn: seed.doubleOptIn,
    publicSignup: seed.publicSignup,
    status: seed.status,
    createdBy: 'elena.ferrari@bimap.local',
    createdAt: daysAgo(seed.age, 9),
    updatedAt: daysAgo(Math.max(seed.age - 30, 1), 15),
  }));

  const subscribers: Subscriber[] = [];
  for (const seed of LISTS) {
    const used = new Set<string>();
    for (let index = 0; index < seed.size; index++) {
      const first = pick(FIRST);
      const last = pick(LAST);
      let email = `${first}.${last}`.toLowerCase().replace(/\s+/g, '') + `@${pick(DOMAINS)}`;
      if (used.has(email)) email = email.replace('@', `${index}@`);
      used.add(email);

      // Newer lists grow faster recently, which is what makes the growth chart worth reading.
      const joinedDaysAgo = Math.floor(Math.pow(random(), 1.8) * seed.age);
      const roll = random();
      const status: SubscriptionStatus = roll < 0.8 ? 'SUBSCRIBED' : roll < 0.9 ? 'PENDING' : 'UNSUBSCRIBED';
      const source: SubscriptionSource = random() < 0.45 ? 'SIGNUP_FORM' : random() < 0.6 ? 'IMPORT' : 'ADMIN';
      const created = daysAgo(joinedDaysAgo, 7 + Math.floor(random() * 12), Math.floor(random() * 60));
      const left = status === 'UNSUBSCRIBED' ? Math.max(joinedDaysAgo - 1 - Math.floor(random() * 20), 0) : undefined;

      subscribers.push({
        id: `${seed.id.slice(0, 24)}${String(index + 1).padStart(4, '0')}${seed.id.slice(-8)}`,
        listId: seed.id,
        email,
        firstName: first,
        lastName: last,
        fullName: `${first} ${last}`,
        status,
        source,
        subscribedAt: status === 'PENDING' ? undefined : created,
        unsubscribedAt: left === undefined ? undefined : daysAgo(left, 18),
        unsubscribeReason: left === undefined ? undefined : pick(REASONS),
        confirmationSentAt: status === 'PENDING' ? created : undefined,
        createdAt: created,
        updatedAt: left === undefined ? created : daysAgo(left, 18),
      });
    }
  }

  const campaigns: DemoCampaign[] = [
    campaign(LISTS[0], 'c1', 'September survey notes', 'SENT', 6, 'Three new protected assets in Varese, and what changed in the form.'),
    campaign(LISTS[0], 'c2', 'October field calendar', 'SCHEDULED', -3, 'Dates for the autumn survey days, region by region.'),
    campaign(LISTS[0], 'c3', 'Winter archive digitisation', 'DRAFT', 1),
    campaign(LISTS[1], 'c4', 'Q3 verification targets', 'SENT', 21, 'Where each region stands against the quarter.'),
    campaign(LISTS[1], 'c5', 'Reviewer rota for November', 'DRAFT', 2),
    campaign(LISTS[2], 'c6', 'New cadastral reference format', 'SENT', 2, 'Sheet and parcel now go in one field.'),
    campaign(LISTS[2], 'c7', 'Duplicate notice — do not send', 'CANCELLED', 9),
    campaign(LISTS[3], 'c8', 'Season closing report', 'SENT', 200, 'Thank you — and the numbers from the season.'),
  ];

  const deliveries: SentEmail[] = [];
  for (const sent of campaigns.filter((c) => c.status === 'SENT' || c.status === 'CANCELLED')) {
    const audience = subscribers.filter((s) => s.listId === sent.listId && s.status === 'SUBSCRIBED');
    const reached = sent.status === 'CANCELLED' ? audience.slice(0, 12) : audience;
    sent.recipientCount = audience.length;

    reached.forEach((subscriber, index) => {
      const failed = random() < 0.03;
      deliveries.push({
        id: `d${sent.id.slice(-3)}${String(index + 1).padStart(4, '0')}-9f1e-4d2c-8b3a-${sent.id.slice(-12)}`,
        to: subscriber.email,
        subject: sent.subject,
        template: 'CAMPAIGN',
        campaignId: sent.id,
        format: 'HTML',
        status: failed ? 'FAILED' : 'SENT',
        body: campaignBody(sent, subscriber.firstName ?? ''),
        attachments: [],
        failureReason: failed ? '550 5.1.1 The email account that you tried to reach does not exist' : undefined,
        sentAt: new Date(new Date(sent.startedAt!).getTime() + index * 1_400).toISOString(),
      });
    });
  }

  return { lists, subscribers, campaigns, deliveries };
}

function campaign(
  list: ListSeed,
  key: string,
  subject: string,
  status: CampaignStatus,
  age: number,
  preheader?: string,
): DemoCampaign {
  const id = `7e8f9a0b-3c4d-4e5f-8a6b-0000000000${key.slice(1).padStart(2, '0')}`;
  const started = status === 'SENT' || status === 'CANCELLED' ? daysAgo(age, 9, 30) : undefined;
  return {
    id,
    listId: list.id,
    subject,
    preheader,
    body: `<h2 style="margin:0 0 12px 0;">${subject}</h2>
<p>Hello {{firstName}},</p>
<p>${preheader ?? 'A short update from the BiMap registry team.'}</p>
<p>Open the registry to see every record that changed since the last issue.</p>
<p style="color:#7c8a9c;">— The BiMap team</p>`,
    status,
    scheduledAt: status === 'SCHEDULED' ? daysAgo(age, 8, 0) : undefined,
    startedAt: started,
    completedAt: started ? daysAgo(age, 9, 48) : undefined,
    recipientCount: 0,
    createdBy: 'elena.ferrari@bimap.local',
    createdAt: daysAgo(Math.abs(age) + 3, 14),
    updatedAt: daysAgo(Math.max(Math.abs(age), 0), 9),
  };
}

function campaignBody(campaign: DemoCampaign, firstName: string): string {
  return `<table width="100%" style="background:#f4f7fb;padding:24px 12px;font-family:Segoe UI,Roboto,Arial,sans-serif;"><tr><td align="center">
<table width="100%" style="max-width:600px;background:#fff;border:1px solid #dfe7f1;border-radius:18px;"><tr><td style="padding:24px 32px 0;"><b>BiMap</b></td></tr>
<tr><td style="padding:20px 32px 28px;font-size:15px;line-height:1.65;color:#2f3f55;">${campaign.body.replace('{{firstName}}', firstName)}</td></tr>
<tr><td style="padding:18px 32px;background:#f8fafd;font-size:12px;color:#7e8ea6;">You are receiving this because you subscribed. <a href="#">Manage your subscription</a> · <a href="#">Unsubscribe</a></td></tr></table>
</td></tr></table>`;
}
