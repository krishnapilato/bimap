import { DeliveryStatus, MailFormat } from './notification.models';

export type MailingListStatus = 'ACTIVE' | 'ARCHIVED';

export type SubscriptionStatus = 'PENDING' | 'SUBSCRIBED' | 'UNSUBSCRIBED';

export type SubscriptionSource = 'ADMIN' | 'IMPORT' | 'SIGNUP_FORM';

export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'CANCELLED';

export type ConsentMode = 'CONFIRMED' | 'REQUEST_CONFIRMATION';

export interface AudienceCounts {
  total: number;
  subscribed: number;
  pending: number;
  unsubscribed: number;
}

export interface DeliveryCounts {
  queued: number;
  sent: number;
  failed: number;
}

export interface MailingList {
  id: string;
  name: string;
  description?: string;
  doubleOptIn: boolean;
  publicSignup: boolean;
  signupUrl?: string;
  status: MailingListStatus;
  audience: AudienceCounts;
  campaignCount: number;
  lastSentAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface GrowthPoint {
  date: string;
  subscribed: number;
  unsubscribed: number;
}

export interface MailingOverview {
  activeLists: number;
  archivedLists: number;
  audience: AudienceCounts;
  uniqueSubscribers: number;
  campaigns: { drafts: number; scheduled: number; sending: number; sent: number; cancelled: number };
  deliveries: DeliveryCounts;
  growth: GrowthPoint[];
}

export interface MailingListRequest {
  name: string;
  description?: string;
  doubleOptIn?: boolean;
  publicSignup?: boolean;
}

export interface MailingListUpdate {
  name?: string;
  description?: string;
  doubleOptIn?: boolean;
  publicSignup?: boolean;
}

export interface Subscriber {
  id: string;
  listId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  status: SubscriptionStatus;
  source: SubscriptionSource;
  subscribedAt?: string;
  unsubscribedAt?: string;
  unsubscribeReason?: string;
  confirmationSentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriberRequest {
  email: string;
  firstName?: string;
  lastName?: string;
  consent: ConsentMode;
}

export interface SubscriberImportRequest {
  rows: Array<{ email: string; firstName?: string; lastName?: string }>;
  consent: ConsentMode;
  updateExisting: boolean;
}

export interface SubscriberImportReport {
  received: number;
  created: number;
  updated: number;
  unchanged: number;
  rejected: Array<{ row: number; email?: string; reason: string }>;
}

export interface Campaign {
  id: string;
  listId: string;
  listName: string;
  subject: string;
  preheader?: string;
  body: string;
  format: MailFormat;
  status: CampaignStatus;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  recipientCount: number;
  deliveries: DeliveryCounts;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignRequest {
  subject: string;
  preheader?: string;
  body: string;
}

export interface PublicList {
  id: string;
  name: string;
  description?: string;
  doubleOptIn: boolean;
}

export interface Subscription {
  listId: string;
  listName: string;
  listDescription?: string;
  listActive: boolean;
  email: string;
  firstName?: string;
  status: SubscriptionStatus;
  subscribedAt?: string;
  unsubscribedAt?: string;
}

export interface SubscribeRequest {
  listId: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export type CampaignDeliveryStatus = DeliveryStatus;

/** The merge tags a campaign body may use, as the backend fills them. */
export const MERGE_TAGS = [
  { tag: '{{firstName}}', label: 'First name' },
  { tag: '{{lastName}}', label: 'Last name' },
  { tag: '{{fullName}}', label: 'Full name' },
  { tag: '{{email}}', label: 'Email address' },
  { tag: '{{listName}}', label: 'List name' },
  { tag: '{{unsubscribeUrl}}', label: 'Unsubscribe link' },
] as const;
