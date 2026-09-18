export type DeliveryStatus = 'QUEUED' | 'SENT' | 'FAILED';

export type MailFormat = 'HTML' | 'TEXT';

export interface AttachmentSummary {
  filename: string;
  sizeBytes: number;
}

/** One row of the delivery log. */
export interface SentEmail {
  id: string;
  to: string;
  subject: string;
  /** The transactional template, or absent for a message composed by hand. */
  template?: string;
  campaignId?: string;
  format: MailFormat;
  status: DeliveryStatus;
  body?: string;
  attachments: AttachmentSummary[];
  failureReason?: string;
  sentAt: string;
}

export interface OutgoingAttachment {
  filename: string;
  contentType: string;
  /** Base64 payload. */
  content: string;
}

export interface SendEmailRequest {
  to: string;
  subject: string;
  body: string;
  attachments?: OutgoingAttachment[];
}

export interface DeliveryQuery {
  recipient?: string;
  status?: DeliveryStatus;
}

export const TEMPLATE_LABELS: Record<string, string> = {
  ACCOUNT_ACTIVATION: 'Account activation',
  ACCOUNT_INVITATION: 'Invitation',
  WELCOME: 'Welcome',
  PASSWORD_RESET: 'Password reset',
  PASSWORD_CHANGED: 'Password changed',
  ACCOUNT_LOCKED: 'Account locked',
  SUBSCRIPTION_CONFIRMATION: 'Subscription confirmation',
  CAMPAIGN: 'Campaign',
  CAMPAIGN_TEST: 'Campaign test',
};
