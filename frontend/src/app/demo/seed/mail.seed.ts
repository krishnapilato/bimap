import { SentEmail } from '../../core/api/notification.models';
import { daysAgo } from '../demo-http';

/** The body of a transactional email, in the same card layout the IAM service renders. */
export function transactionalBody(heading: string, paragraphs: string[], button?: { label: string; href: string }): string {
  const text = paragraphs.map((p) => `<p style="margin:0 0 14px 0;">${p}</p>`).join('');
  const action = button
    ? `<table role="presentation" style="margin:24px 0;"><tr><td style="border-radius:12px;background:#1157e3;"><a href="${button.href}" style="display:inline-block;padding:13px 26px;font-size:14px;font-weight:600;color:#fff;text-decoration:none;">${button.label}</a></td></tr></table>`
    : '';
  return `<div style="background:#f4f7fb;padding:32px 12px;font-family:Segoe UI,Roboto,Arial,sans-serif;">
<table width="100%" style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #dfe7f1;border-radius:18px;">
<tr><td style="padding:26px 32px 0;"><b style="color:#08172c;">BiMap</b> <span style="font-size:11px;letter-spacing:.11em;text-transform:uppercase;color:#7e8ea6;">Cadastral registry</span></td></tr>
<tr><td style="padding:20px 32px 0;"><h1 style="margin:0;font-size:22px;color:#08172c;">${heading}</h1></td></tr>
<tr><td style="padding:14px 32px 30px;font-size:15px;line-height:1.65;color:#4c5f79;">${text}${action}</td></tr>
<tr><td style="padding:18px 32px;background:#f8fafd;font-size:12px;color:#7e8ea6;">© ${new Date().getFullYear()} BiMap · This mailbox is not monitored.</td></tr>
</table></div>`;
}

interface MailSeed {
  to: string;
  subject: string;
  template?: string;
  status: SentEmail['status'];
  age: number;
  hour: number;
  heading: string;
  lines: string[];
  button?: string;
  failure?: string;
  attachments?: Array<{ filename: string; sizeBytes: number }>;
  text?: string;
}

const APP = 'https://krishnapilato.github.io/bimap';

const MAIL: MailSeed[] = [
  { to: 'matteo.gallo@bimap.local', subject: 'Confirm your BiMap account', template: 'ACCOUNT_ACTIVATION', status: 'SENT', age: 1, hour: 9, heading: 'Confirm your email address', lines: ['Hello Matteo,', 'An administrator created a BiMap account for you. Confirm this address to choose your password.'], button: 'Activate my account' },
  { to: 'francesco.galli@bimap.local', subject: 'Confirm your BiMap account', template: 'ACCOUNT_ACTIVATION', status: 'SENT', age: 2, hour: 17, heading: 'Confirm your email address', lines: ['Hello Francesco,', 'Your BiMap account is created but not active yet.'], button: 'Activate my account' },
  { to: 'roberta.villa@bimap.local', subject: 'Confirm your BiMap account', template: 'ACCOUNT_ACTIVATION', status: 'FAILED', age: 5, hour: 11, heading: 'Confirm your email address', lines: ['Hello Roberta,', 'Your BiMap account is created but not active yet.'], button: 'Activate my account', failure: 'Connection timed out after 5000ms while connecting to sandbox.smtp.mailtrap.io:587' },
  { to: 'roberta.villa@bimap.local', subject: 'Confirm your BiMap account', template: 'ACCOUNT_ACTIVATION', status: 'SENT', age: 5, hour: 12, heading: 'Confirm your email address', lines: ['Hello Roberta,', 'Your BiMap account is created but not active yet.'], button: 'Activate my account' },
  { to: 'chiara.romano@example.com', subject: 'Welcome to BiMap', template: 'WELCOME', status: 'SENT', age: 180, hour: 10, heading: 'Your account is active', lines: ['Hello Chiara,', 'Your address is confirmed and you can sign in.'], button: 'Open BiMap' },
  { to: 'federica.bruno@example.com', subject: 'Welcome to BiMap', template: 'WELCOME', status: 'SENT', age: 120, hour: 15, heading: 'Your account is active', lines: ['Hello Federica,', 'Your address is confirmed and you can sign in.'], button: 'Open BiMap' },
  { to: 'luca.conti@bimap.local', subject: 'Reset your BiMap password', template: 'PASSWORD_RESET', status: 'SENT', age: 3, hour: 8, heading: 'Reset your password', lines: ['Hello Luca,', 'Someone asked to reset the password for this account. If that was you, choose a new one now.'], button: 'Choose a new password' },
  { to: 'luca.conti@bimap.local', subject: 'Your BiMap password was changed', template: 'PASSWORD_CHANGED', status: 'SENT', age: 3, hour: 8, heading: 'Your password was changed', lines: ['Hello Luca,', 'The password for your account was just changed, and every other session was signed out.'] },
  { to: 'alessandro.ricci@bimap.local', subject: 'Your BiMap account has been locked', template: 'ACCOUNT_LOCKED', status: 'SENT', age: 15, hour: 22, heading: 'Your account is locked for now', lines: ['Hello Alessandro,', 'After several failed sign-in attempts the account is locked for 15 minutes.'] },
  { to: 'marco.bianchi@bimap.local', subject: 'Registrations export — September', status: 'SENT', age: 4, hour: 18, heading: 'Registrations export', lines: ['Marco, the September export is attached, filtered to Lombardy.'], attachments: [{ filename: 'bimap-registrations-lombardia.csv', sizeBytes: 48_213 }] },
  { to: 'giulia.rossi@bimap.local', subject: 'Field kit for the Varese survey day', status: 'SENT', age: 6, hour: 7, heading: '', lines: [], text: 'Hi Giulia,\n\nThe laser meter and the tablet are in the Varese office from 8:00.\nThe Sacro Monte chapels need photographs from the north side.\n\nElena' },
  { to: 'surveyors@bimap.local', subject: 'Reminder: submit drafts before Friday', status: 'FAILED', age: 8, hour: 16, heading: 'Drafts close on Friday', lines: ['Please submit every draft before the review round on Friday.'], failure: '550 5.1.1 <surveyors@bimap.local>: Recipient address rejected: User unknown in virtual mailbox table' },
  { to: 'sara.colombo@bimap.local', subject: 'Verification backlog, week 37', status: 'QUEUED', age: 0, hour: 7, heading: 'Verification backlog', lines: ['Nine registrations are waiting for review, four of them older than a week.'], attachments: [{ filename: 'backlog-week-37.pdf', sizeBytes: 182_404 }, { filename: 'backlog-week-37.csv', sizeBytes: 3_912 }] },
  { to: 'aurora.ricci@example.org', subject: 'Confirm your subscription to Heritage survey bulletin', template: 'SUBSCRIPTION_CONFIRMATION', status: 'SENT', age: 1, hour: 20, heading: 'Confirm your subscription', lines: ['Hello Aurora,', 'Confirm that you want to receive Heritage survey bulletin. Nothing is sent to this address until you do.'], button: 'Confirm my subscription' },
  { to: 'pietro.caruso@posta.example.it', subject: 'Confirm your subscription to Registry change notices', template: 'SUBSCRIPTION_CONFIRMATION', status: 'SENT', age: 4, hour: 13, heading: 'Confirm your subscription', lines: ['Hello Pietro,', 'Confirm that you want to receive Registry change notices.'], button: 'Confirm my subscription' },
];

export function seedMail(): SentEmail[] {
  return MAIL.map((mail, index) => ({
    id: `9c8b7a6d-5e4f-4a3b-8c2d-${String(index + 1).padStart(12, '0')}`,
    to: mail.to,
    subject: mail.subject,
    template: mail.template,
    format: mail.text ? 'TEXT' : 'HTML',
    status: mail.status,
    body: mail.text ?? transactionalBody(mail.heading, mail.lines, mail.button ? { label: mail.button, href: APP } : undefined),
    attachments: mail.attachments ?? [],
    failureReason: mail.failure,
    sentAt: daysAgo(mail.age, mail.hour, (index * 7) % 60),
  }));
}
