import { AccountStatus, ApplicationRole, Permission } from '../../core/api/iam.models';
import { CampaignStatus, MailingListStatus, SubscriptionStatus } from '../../core/api/mailing.models';
import { DeliveryStatus } from '../../core/api/notification.models';
import { RegistrationStatus } from '../../core/api/registry.models';
import { Tone } from './status-badge';

interface Presentation {
  label: string;
  tone: Tone;
  icon: string;
  live?: boolean;
}

/** How every domain state is shown, in one place, so a state reads the same on every screen. */
export const REGISTRATION_STATUS: Record<RegistrationStatus, Presentation> = {
  DRAFT: { label: 'Draft', tone: 'neutral', icon: 'file-pen' },
  SUBMITTED: { label: 'In review', tone: 'info', icon: 'file-clock' },
  VERIFIED: { label: 'Verified', tone: 'positive', icon: 'badge-check' },
  REJECTED: { label: 'Rejected', tone: 'negative', icon: 'circle-x' },
  ARCHIVED: { label: 'Archived', tone: 'special', icon: 'archive' },
};

export const ACCOUNT_STATUS: Record<AccountStatus, Presentation> = {
  PENDING_ACTIVATION: { label: 'Pending', tone: 'critical', icon: 'hourglass' },
  ACTIVE: { label: 'Active', tone: 'positive', icon: 'circle-check' },
  LOCKED: { label: 'Locked', tone: 'negative', icon: 'lock' },
  DISABLED: { label: 'Disabled', tone: 'neutral', icon: 'ban' },
  DELETED: { label: 'Deleted', tone: 'neutral', icon: 'trash' },
};

export const ROLE: Record<ApplicationRole, { label: string; description: string; icon: string }> = {
  USER: { label: 'Surveyor', description: 'Records assets and follows their own registrations.', icon: 'map-pin-plus' },
  MANAGER: { label: 'Manager', description: 'Reviews every registration, exports, and reads people and lists.', icon: 'clipboard-check' },
  ADMINISTRATOR: { label: 'Administrator', description: 'Everything, including people, mail and system health.', icon: 'shield-check' },
};

/** What each permission lets someone do, in words. */
export const PERMISSION: Record<Permission, { label: string; icon: string }> = {
  'registration:read': { label: 'See own registrations', icon: 'eye' },
  'registration:write': { label: 'Record and edit registrations', icon: 'map-pin-plus' },
  'registration:read-all': { label: 'See and review every registration', icon: 'clipboard-check' },
  'registration:export': { label: 'Export the registry', icon: 'download' },
  'user:read': { label: 'Browse people', icon: 'users' },
  'user:write': { label: 'Invite and edit people', icon: 'user-plus' },
  'user:lifecycle': { label: 'Lock, disable and delete accounts', icon: 'shield' },
  'mailing:read': { label: 'See mailing lists and campaigns', icon: 'megaphone' },
  'mailing:write': { label: 'Run mailing lists and send campaigns', icon: 'send' },
};

export const DELIVERY_STATUS: Record<DeliveryStatus, Presentation> = {
  QUEUED: { label: 'Queued', tone: 'critical', icon: 'clock' },
  SENT: { label: 'Sent', tone: 'positive', icon: 'mail-check' },
  FAILED: { label: 'Failed', tone: 'negative', icon: 'mail-x' },
};

export const SUBSCRIPTION_STATUS: Record<SubscriptionStatus, Presentation> = {
  PENDING: { label: 'Unconfirmed', tone: 'critical', icon: 'hourglass' },
  SUBSCRIBED: { label: 'Subscribed', tone: 'positive', icon: 'circle-check' },
  UNSUBSCRIBED: { label: 'Unsubscribed', tone: 'neutral', icon: 'circle-x' },
};

export const CAMPAIGN_STATUS: Record<CampaignStatus, Presentation> = {
  DRAFT: { label: 'Draft', tone: 'neutral', icon: 'file-pen' },
  SCHEDULED: { label: 'Scheduled', tone: 'info', icon: 'calendar-clock' },
  SENDING: { label: 'Sending', tone: 'signal', icon: 'send', live: true },
  SENT: { label: 'Sent', tone: 'positive', icon: 'mail-check' },
  CANCELLED: { label: 'Stopped', tone: 'negative', icon: 'ban' },
};

export const LIST_STATUS: Record<MailingListStatus, Presentation> = {
  ACTIVE: { label: 'Active', tone: 'positive', icon: 'circle-check' },
  ARCHIVED: { label: 'Archived', tone: 'special', icon: 'archive' },
};

export function healthTone(status: string | undefined): Tone {
  switch (status) {
    case 'UP':
      return 'positive';
    case 'DOWN':
    case 'OUT_OF_SERVICE':
      return 'negative';
    case undefined:
      return 'neutral';
    default:
      return 'critical';
  }
}
