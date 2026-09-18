import { applyMergeTags, campaignDocument, escapeHtml, isMarkup, mergeValues, messageDocument, paragraphs, unknownTags } from './mail-render';

describe('mail rendering', () => {
  it('decides markup the way the server does', () => {
    expect(isMarkup('<p>Hello</p>')).toBe(true);
    expect(isMarkup('Hello,\n\nplain words')).toBe(false);
    expect(isMarkup('3 < 4 and 5 > 2')).toBe(false);
    expect(isMarkup(null)).toBe(false);
  });

  it('turns prose into paragraphs, keeping single line breaks and escaping markup', () => {
    expect(paragraphs('One\ntwo\n\nThree <b>')).toBe('<p style="margin:0 0 16px 0;">One<br/>two</p><p style="margin:0 0 16px 0;">Three &lt;b&gt;</p>');
  });

  it('fills known tags, escapes them inside markup, and leaves unknown tags as written', () => {
    const values = mergeValues({ email: 'a@example.com', firstName: '<Anna>', lastName: 'Verdi' }, 'Bulletin');
    expect(applyMergeTags('Hi {{ firstName }} of {{listName}}', values, false)).toBe('Hi <Anna> of Bulletin');
    expect(applyMergeTags('<p>{{firstName}}</p>', values, true)).toBe('<p>&lt;Anna&gt;</p>');
    expect(applyMergeTags('{{firstname}} {{fullName}}', values, false)).toBe('{{firstname}} <Anna> Verdi');
  });

  it('lists the tags the server would not fill', () => {
    expect(unknownTags('Hello {{firstname}}', 'Bye {{firstName}}', '{{nickname}} {{nickname}}')).toEqual(['{{firstname}}', '{{nickname}}']);
    expect(unknownTags('{{unsubscribeUrl}} {{manageUrl}}')).toEqual([]);
  });

  it('frames a campaign with the list name and a way out', () => {
    const html = campaignDocument(
      { subject: 'News for {{firstName}}', body: 'Hello {{firstName}}', listName: 'Heritage & Co' },
      { email: 'giulia@example.com', firstName: 'Giulia' },
    );
    expect(html).toContain('<title>News for Giulia</title>');
    expect(html).toContain('Hello Giulia');
    expect(html).toContain('Heritage &amp; Co');
    expect(html).toContain('Unsubscribe');
  });

  it('shows a logged plain-text message as text, never as markup', () => {
    expect(messageDocument('3 < 4, and 5 > 2')).toContain('3 &lt; 4, and 5 &gt; 2');
    expect(escapeHtml(`"quoted" & 'single'`)).toBe('&quot;quoted&quot; &amp; &#39;single&#39;');
  });
});
