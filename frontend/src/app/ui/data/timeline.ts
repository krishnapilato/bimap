import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';

import { dateTime, relativeTime } from '../../core/ui/format';
import { Icon } from '../icon/icon';

export interface TimelineMoment {
  key: string;
  icon: string;
  tone: 'neutral' | 'info' | 'positive' | 'negative' | 'special' | 'critical';
  title: string;
  when?: string;
  who?: string;
  note?: string;
  /** What is expected next rather than what happened: drawn hollow, with a slow pulse. */
  pending?: boolean;
}

/**
 * A story, newest first: each step with when it happened, who took it and any note they left.
 * The steps rise in one after another and the line between them draws itself down.
 */
@Component({
  selector: 'bm-timeline',
  imports: [Icon],
  template: `
    <ol class="bm-timeline__list">
      @for (moment of moments(); track moment.key; let i = $index) {
        <li class="bm-timeline__item" [attr.data-tone]="moment.tone" [class.is-pending]="moment.pending" [style.--bm-i]="i">
          <span class="bm-timeline__node" aria-hidden="true">
            <svg [lucideIcon]="moment.icon" [size]="15"></svg>
          </span>
          <div class="bm-timeline__body">
            <div class="bm-timeline__title">
              <strong>{{ moment.title }}</strong>
              @if (moment.when) {
                <time [attr.datetime]="moment.when" [title]="dateTime(moment.when)">{{ relativeTime(moment.when) }}</time>
              }
            </div>
            @if (moment.who) {
              <span class="bm-timeline__who">{{ moment.who }}</span>
            }
            @if (moment.note) {
              <blockquote class="bm-timeline__note">{{ moment.note }}</blockquote>
            }
          </div>
        </li>
      }
    </ol>
  `,
  styles: `
    .bm-timeline__list { position: relative; display: grid; gap: 4px; margin: 0; padding: 0; list-style: none; }
    .bm-timeline__item {
      --tone: var(--bm-neutral); --tone-soft: var(--bm-neutral-soft);
      position: relative; display: grid; grid-template-columns: 32px minmax(0, 1fr); gap: 12px; padding-bottom: 18px;
      animation: bm-rise var(--bm-duration-slow) var(--bm-ease-emphasized) both;
      animation-delay: calc(var(--bm-i, 0) * 90ms + 80ms);
    }
    .bm-timeline__item:last-child { padding-bottom: 0; }
    .bm-timeline__item[data-tone='info'] { --tone: var(--bm-accent); --tone-soft: var(--bm-accent-soft); }
    .bm-timeline__item[data-tone='positive'] { --tone: var(--bm-positive); --tone-soft: var(--bm-positive-soft); }
    .bm-timeline__item[data-tone='critical'] { --tone: var(--bm-critical); --tone-soft: var(--bm-critical-soft); }
    .bm-timeline__item[data-tone='negative'] { --tone: var(--bm-negative); --tone-soft: var(--bm-negative-soft); }
    .bm-timeline__item[data-tone='special'] { --tone: var(--bm-special); --tone-soft: var(--bm-special-soft); }
    .bm-timeline__item:not(:last-child)::before {
      content: ''; position: absolute; left: 15px; top: 34px; bottom: 2px; width: 2px; border-radius: 2px;
      background: var(--bm-border); transform-origin: top; animation: bm-timeline-line 600ms var(--bm-ease-emphasized) both;
      animation-delay: calc(var(--bm-i, 0) * 90ms + 240ms);
    }
    @keyframes bm-timeline-line { from { transform: scaleY(0); } }
    .bm-timeline__node {
      position: relative; display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%;
      background: var(--tone-soft); color: var(--tone); box-shadow: 0 0 0 4px var(--bm-surface);
    }
    .is-pending .bm-timeline__node { background: var(--bm-surface); box-shadow: 0 0 0 4px var(--bm-surface), inset 0 0 0 1.5px var(--tone); }
    .is-pending .bm-timeline__node::after {
      content: ''; position: absolute; inset: -4px; border-radius: 50%; border: 2px solid var(--tone); opacity: 0;
      animation: bm-pulse-ring 2.2s var(--bm-ease-standard) infinite;
    }
    .bm-reduced-motion .is-pending .bm-timeline__node::after { animation: none; }
    .bm-timeline__body { display: grid; gap: 2px; padding-top: 5px; min-width: 0; }
    .bm-timeline__title { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .bm-timeline__title strong { font: var(--bm-text-subheading); }
    .is-pending .bm-timeline__title strong { color: var(--bm-text-2); }
    .bm-timeline__title time { font: var(--bm-text-caption); color: var(--bm-text-3); font-weight: 500; white-space: nowrap; }
    .bm-timeline__who { font: var(--bm-text-caption); color: var(--bm-text-3); font-weight: 500; overflow-wrap: anywhere; }
    .bm-timeline__note {
      margin: 6px 0 0; padding: 8px 12px; border-left: 3px solid var(--tone); border-radius: 0 var(--bm-radius-sm) var(--bm-radius-sm) 0;
      background: var(--tone-soft); font: var(--bm-text-small); color: var(--bm-text); overflow-wrap: anywhere;
    }
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'bm-timeline' },
})
export class Timeline {
  readonly moments = input.required<readonly TimelineMoment[]>();

  protected readonly relativeTime = relativeTime;
  protected readonly dateTime = dateTime;
}
