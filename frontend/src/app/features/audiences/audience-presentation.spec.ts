import { Campaign } from '../../core/api/mailing.models';
import { campaignProgress, listSlug, people } from './audience-presentation';

describe('audience presentation', () => {
  it('makes a file-safe slug from a list name', () => {
    expect(listSlug({ name: 'Città & Comuni — 2026!' })).toBe('citta-comuni-2026');
  });

  it('counts people in words', () => {
    expect(people(1)).toBe('1 person');
    expect(people(1204)).toBe('1,204 people');
  });

  it('measures progress by messages dealt with, sent or failed', () => {
    const campaign = { recipientCount: 200, deliveries: { sent: 90, failed: 10, queued: 0 } } as Campaign;
    expect(campaignProgress(campaign)).toBe(0.5);
    expect(campaignProgress({ ...campaign, recipientCount: 0 })).toBe(0);
  });
});
