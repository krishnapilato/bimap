export interface Starter {
  key: string;
  label: string;
  description: string;
  icon: string;
  subject: string;
  preheader: string;
  body: string;
}

/**
 * Two ways to begin that already follow the house layout: prose, which the server turns into
 * paragraphs, and a small block of email-safe markup with inline styles and a table button.
 */
export const STARTERS: Starter[] = [
  {
    key: 'note',
    label: 'A short note',
    description: 'Plain text that reads like a personal email.',
    icon: 'type',
    subject: 'A quick note for the survey team',
    preheader: 'What changed this week, in two minutes.',
    body: `Hello {{firstName}},

This week three new assets were verified in Varese, and the review queue is down to nine registrations.

If you are in the field on Friday, remember to submit your drafts before the review round.

Thank you for the careful work,
The BiMap team`,
  },
  {
    key: 'update',
    label: 'A formatted update',
    description: 'A heading, short paragraphs and one clear button.',
    icon: 'code',
    subject: 'September in the registry',
    preheader: 'New protected assets, and what to record next.',
    body: `<h1 style="margin:0 0 12px;font-size:22px;line-height:1.25;color:#08172c;">September in the registry</h1>
<p style="margin:0 0 16px;">Hello {{firstName}},</p>
<p style="margin:0 0 16px;">Forty-two assets were registered this month, eleven of them already verified. Lombardy and Tuscany led the way.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td style="border-radius:12px;background:#1257e6;">
      <a href="https://krishnapilato.github.io/bimap/registry" style="display:inline-block;padding:13px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Open the registry</a>
    </td>
  </tr>
</table>
<p style="margin:0;">See you in the field,<br/>The BiMap team</p>`,
  },
];
