import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Registration } from '../../core/api/registry.models';
import { Timeline, TimelineMoment } from '../../ui/data/timeline';

/**
 * A registration's story, newest first: what is expected next, then every step it has taken,
 * with who took it and any note they left.
 */
@Component({
  selector: 'bm-status-timeline',
  imports: [Timeline],
  template: `<bm-timeline [moments]="moments()" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusTimeline {
  readonly registration = input.required<Registration>();

  protected readonly moments = computed<TimelineMoment[]>(() => {
    const r = this.registration();
    const past: TimelineMoment[] = [{ key: 'created', icon: 'file-pen', tone: 'neutral', title: 'Recorded', when: r.createdAt, who: r.createdBy }];

    if (r.submittedAt) past.push({ key: 'submitted', icon: 'send', tone: 'info', title: 'Sent for review', when: r.submittedAt, who: r.createdBy });
    if (r.reviewedAt && (r.status === 'VERIFIED' || r.status === 'REJECTED' || r.status === 'ARCHIVED')) {
      const rejected = r.status === 'REJECTED';
      past.push({
        key: 'reviewed',
        icon: rejected ? 'circle-x' : 'badge-check',
        tone: rejected ? 'negative' : 'positive',
        title: rejected ? 'Sent back' : 'Verified',
        when: r.reviewedAt,
        who: r.reviewedBy,
        note: rejected ? r.reviewNote : undefined,
      });
    }
    if (r.status === 'ARCHIVED') past.push({ key: 'archived', icon: 'archive', tone: 'special', title: 'Archived', when: r.updatedAt, note: r.reviewNote });

    const latest = past.reduce((newest, moment) => (moment.when && moment.when > (newest ?? '') ? moment.when : newest), undefined as string | undefined);
    if (r.updatedAt && latest && Date.parse(r.updatedAt) - Date.parse(latest) > 60_000) {
      past.push({ key: 'updated', icon: 'pencil', tone: 'neutral', title: 'Last changed', when: r.updatedAt });
    }

    const next = this.nextStep(r);
    const ordered = past.sort((a, b) => (b.when ?? '').localeCompare(a.when ?? ''));
    return next ? [next, ...ordered] : ordered;
  });

  private nextStep(r: Registration): TimelineMoment | null {
    switch (r.status) {
      case 'DRAFT':
        return { key: 'next', icon: 'hourglass', tone: 'neutral', title: 'Not sent for review yet', pending: true };
      case 'SUBMITTED':
        return { key: 'next', icon: 'hourglass', tone: 'info', title: 'Waiting for a reviewer', pending: true };
      case 'REJECTED':
        return { key: 'next', icon: 'hourglass', tone: 'negative', title: 'Waiting for corrections', pending: true };
      default:
        return null;
    }
  }
}
