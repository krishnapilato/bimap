import { AudienceCounts, Campaign, ConsentMode, MailingList, Subscriber, SubscriptionSource } from '../../core/api/mailing.models';
import { formatNumber, relativeClause, dateTime } from '../../core/ui/format';
import { MeterSegment } from '../../ui/charts/stacked-meter';
import { SUBSCRIPTION_STATUS } from '../../ui/status/status-tones';

export const SUBSCRIPTION_SOURCE: Record<SubscriptionSource, { label: string; icon: string }> = {
  ADMIN: { label: 'Added by hand', icon: 'user-plus' },
  IMPORT: { label: 'Imported', icon: 'file-spreadsheet' },
  SIGNUP_FORM: { label: 'Sign-up page', icon: 'globe' },
};

export const CONSENT: Record<ConsentMode, { label: string; description: string; icon: string }> = {
  REQUEST_CONFIRMATION: {
    label: 'Ask them to confirm',
    description: 'Each address gets a link and receives nothing until it is clicked.',
    icon: 'mail-question',
  },
  CONFIRMED: {
    label: 'They already agreed',
    description: 'Consent was given elsewhere, such as on a paper form. They are subscribed at once.',
    icon: 'badge-check',
  },
};

export const CONSENT_ORDER: ConsentMode[] = ['REQUEST_CONFIRMATION', 'CONFIRMED'];

export function subscriberName(subscriber: Subscriber): string {
  return subscriber.fullName?.trim() || subscriber.email;
}

export function audienceSegments(audience: AudienceCounts): MeterSegment[] {
  return [
    { key: 'SUBSCRIBED', label: SUBSCRIPTION_STATUS.SUBSCRIBED.label, value: audience.subscribed, tone: 'positive', icon: SUBSCRIPTION_STATUS.SUBSCRIBED.icon },
    { key: 'PENDING', label: SUBSCRIPTION_STATUS.PENDING.label, value: audience.pending, tone: 'critical', icon: SUBSCRIPTION_STATUS.PENDING.icon },
    { key: 'UNSUBSCRIBED', label: SUBSCRIPTION_STATUS.UNSUBSCRIBED.label, value: audience.unsubscribed, tone: 'neutral', icon: SUBSCRIPTION_STATUS.UNSUBSCRIBED.icon },
  ];
}

export function people(count: number): string {
  return `${formatNumber(count)} ${count === 1 ? 'person' : 'people'}`;
}

/** One line on where a campaign stands, phrased for its state. */
export function campaignSummary(campaign: Campaign): string {
  const { deliveries } = campaign;
  switch (campaign.status) {
    case 'DRAFT':
      return `Draft, last edited ${relativeClause(campaign.updatedAt)}`;
    case 'SCHEDULED':
      return `Goes out ${dateTime(campaign.scheduledAt)}`;
    case 'SENDING':
      return `Sending to ${people(campaign.recipientCount)}: ${formatNumber(deliveries.sent + deliveries.failed)} done so far`;
    case 'SENT':
      return `Sent to ${people(campaign.recipientCount)} ${relativeClause(campaign.completedAt)}`;
    case 'CANCELLED':
      return `Stopped after ${formatNumber(deliveries.sent + deliveries.failed)} of ${formatNumber(campaign.recipientCount)} ${relativeClause(campaign.completedAt)}`;
  }
}

/** Share of a campaign's recipients that have been dealt with, sent or failed. */
export function campaignProgress(campaign: Campaign): number {
  if (!campaign.recipientCount) return 0;
  return Math.min(1, (campaign.deliveries.sent + campaign.deliveries.failed) / campaign.recipientCount);
}

export function listSlug(list: Pick<MailingList, 'name'>): string {
  return list.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
