import { MERGE_TAGS } from '../../core/api/mailing.models';

/**
 * The client's copy of how the IAM service turns a body into an email, so a preview shows what
 * recipients will actually get. Kept deliberately close to `CampaignRenderer` and `MergeTags`.
 */

const MARKUP = /<([a-z][a-z0-9]*)\b[^>]*>/i;
const TAG = /\{\{\s*([A-Za-z]+)\s*}}/g;
const SUPPORTED = new Set(MERGE_TAGS.map((entry) => entry.tag.slice(2, -2)).concat('manageUrl'));

export interface PreviewRecipient {
  email: string;
  firstName?: string;
  lastName?: string;
}

/** Markup when the body contains a tag, prose otherwise — the same test the server applies. */
export function isMarkup(body: string | null | undefined): boolean {
  return !!body && MARKUP.test(body);
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Prose becomes paragraphs: a blank line starts a new one, a single newline stays a line break. */
export function paragraphs(text: string): string {
  return text
    .trim()
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => `<p style="margin:0 0 16px 0;">${escapeHtml(paragraph.trim()).replace(/\r?\n/g, '<br/>')}</p>`)
    .join('');
}

/** Fills known tags; unknown ones are left as written, so a typo is visible in the preview. */
export function applyMergeTags(text: string, values: Record<string, string>, markup: boolean): string {
  return text.replace(TAG, (match, name: string) => {
    const value = values[name];
    if (value === undefined) return match;
    return markup ? escapeHtml(value) : value;
  });
}

/** Tags in a body that the server will not fill, such as `{{firstname}}`. */
export function unknownTags(...texts: Array<string | null | undefined>): string[] {
  const unknown = new Set<string>();
  for (const text of texts) {
    for (const match of (text ?? '').matchAll(TAG)) {
      if (!SUPPORTED.has(match[1])) unknown.add(match[0]);
    }
  }
  return [...unknown];
}

export function mergeValues(recipient: PreviewRecipient, listName: string, manageUrl = '#'): Record<string, string> {
  const first = recipient.firstName ?? '';
  const last = recipient.lastName ?? '';
  return {
    firstName: first,
    lastName: last,
    fullName: `${first} ${last}`.trim(),
    email: recipient.email,
    listName,
    manageUrl,
    unsubscribeUrl: manageUrl,
  };
}

/** A whole campaign as one recipient receives it: the list frame, the body and the way out. */
export function campaignDocument(campaign: { subject: string; preheader?: string; body: string; listName: string }, recipient: PreviewRecipient): string {
  const markup = isMarkup(campaign.body);
  const values = mergeValues(recipient, campaign.listName);
  const body = applyMergeTags(campaign.body, values, markup);
  const content = markup ? body : paragraphs(body);
  const subject = escapeHtml(applyMergeTags(campaign.subject, values, false));

  return htmlDocument(
    subject,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f7fb;padding:32px 12px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border:1px solid #dfe7f1;border-radius:18px;overflow:hidden;">
          <tr><td style="padding:24px 32px 0 32px;">
            <span style="display:inline-block;font-size:15px;font-weight:700;letter-spacing:-0.02em;color:#08172c;">BiMap</span>
            <span style="display:inline-block;margin-left:8px;font-size:11px;font-weight:600;letter-spacing:0.11em;text-transform:uppercase;color:#7e8ea6;">${escapeHtml(campaign.listName)}</span>
          </td></tr>
          <tr><td style="padding:20px 32px 28px 32px;font-size:15px;line-height:1.65;color:#2f3f55;">${content}</td></tr>
          <tr><td style="padding:18px 32px;background-color:#f8fafd;border-top:1px solid #eef2f8;font-size:12px;line-height:1.6;color:#7e8ea6;">
            You are receiving this because <span style="color:#4c5f79;">${escapeHtml(recipient.email)}</span> subscribed to <span style="color:#4c5f79;">${escapeHtml(campaign.listName)}</span>.<br/>
            <a href="#" style="color:#0a45ab;text-decoration:underline;">Manage your subscription</a> · <a href="#" style="color:#0a45ab;text-decoration:underline;">Unsubscribe</a><br/>
            © ${new Date().getFullYear()} BiMap
          </td></tr>
        </table>
      </td></tr>
    </table>`,
  );
}

/** A logged message as it was sent: markup as it is, prose in a readable column. */
export function messageDocument(body: string | null | undefined, subject = ''): string {
  if (!body) return htmlDocument(subject, '');
  if (isMarkup(body)) return htmlDocument(subject, body);
  return htmlDocument(
    subject,
    `<div style="max-width:640px;margin:0 auto;padding:28px 24px;font:15px/1.65 'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1d2b3c;white-space:pre-wrap;overflow-wrap:anywhere;">${escapeHtml(body)}</div>`,
  );
}

/** Links open in a new tab, since the preview frame is not allowed to navigate itself. */
function htmlDocument(title: string, content: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><base target="_blank"><title>${title}</title>
<style>html,body{margin:0;padding:0;background:#f4f7fb;}img{max-width:100%;height:auto;}</style></head><body>${content}</body></html>`;
}
