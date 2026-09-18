import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../icon/icon';

export interface Crumb {
  label: string;
  link?: string | unknown[];
}

/**
 * The top of every working page: where you are, what this is, and what you can do from here.
 * Actions sit on the right on wide screens and wrap below the title on narrow ones.
 */
@Component({
  selector: 'bm-page-header',
  imports: [RouterLink, Icon],
  template: `
    @if (crumbs().length) {
      <nav class="bm-page-header__crumbs" aria-label="Breadcrumb">
        @for (crumb of crumbs(); track $index; let last = $last) {
          @if (crumb.link && !last) {
            <a [routerLink]="crumb.link">{{ crumb.label }}</a>
            <svg lucideIcon="chevron-right" [size]="13" aria-hidden="true"></svg>
          } @else {
            <span aria-current="page">{{ crumb.label }}</span>
          }
        }
      </nav>
    }
    <div class="bm-page-header__row">
      <div class="bm-page-header__titles">
        <div class="bm-page-header__title-line">
          <h1 class="bm-page-header__title">{{ title() }}</h1>
          <ng-content select="[bmTitleAddon]" />
        </div>
        @if (subtitle()) {
          <p class="bm-page-header__subtitle">{{ subtitle() }}</p>
        }
        <ng-content select="[bmSubtitle]" />
      </div>
      <div class="bm-page-header__actions"><ng-content select="[bmActions]" /></div>
    </div>
    <ng-content />
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'bm-page-header' },
  styles: `
    .bm-page-header { display: grid; gap: 10px; }
    .bm-page-header__crumbs { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; font: var(--bm-text-caption); color: var(--bm-text-3); }
    .bm-page-header__crumbs a { color: var(--bm-text-2); border-radius: 4px; transition: color var(--bm-duration-fast) var(--bm-ease-standard); }
    .bm-page-header__crumbs a:hover { color: var(--bm-accent-text); }
    .bm-page-header__row { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px 24px; flex-wrap: wrap; }
    .bm-page-header__titles { display: grid; gap: 4px; min-width: 0; }
    .bm-page-header__title-line { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 12px; }
    .bm-page-header__title { font: var(--bm-text-title); letter-spacing: var(--bm-tracking-display); color: var(--bm-text); }
    .bm-page-header__subtitle { max-width: 72ch; font: var(--bm-text-body); color: var(--bm-text-2); }
    .bm-page-header__actions { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
    .bm-page-header__actions:empty { display: none; }
  `,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  readonly crumbs = input<Crumb[]>([]);
}

/** A white card with an optional heading row. Structure inside it is drawn with hairlines. */
@Component({
  selector: 'bm-panel',
  template: `
    @if (heading() || subheading()) {
      <header class="bm-panel__header">
        <div class="bm-panel__titles">
          @if (heading()) {
            <h2 class="bm-panel__title">{{ heading() }}</h2>
          }
          @if (subheading()) {
            <p class="bm-panel__subtitle">{{ subheading() }}</p>
          }
        </div>
        <div class="bm-panel__actions"><ng-content select="[bmPanelActions]" /></div>
      </header>
    }
    <div class="bm-panel__body" [attr.data-flush]="flush() || null"><ng-content /></div>
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'bm-panel' },
  styles: `
    .bm-panel {
      display: flex; flex-direction: column; min-width: 0;
      background: var(--bm-surface); border: 1px solid var(--bm-border); border-radius: var(--bm-radius-lg);
      box-shadow: var(--bm-shadow-xs);
    }
    .bm-panel__header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 12px; padding: 14px 18px; border-bottom: 1px solid var(--bm-border-subtle); }
    .bm-panel__titles { display: grid; gap: 2px; min-width: 0; }
    .bm-panel__title { font: var(--bm-text-heading); font-size: 15px; }
    .bm-panel__subtitle { font: var(--bm-text-caption); color: var(--bm-text-3); font-weight: 500; }
    .bm-panel__actions { display: flex; align-items: center; gap: 6px; }
    .bm-panel__actions:empty { display: none; }
    .bm-panel__body { padding: 18px; min-width: 0; flex: 1; }
    .bm-panel__body[data-flush] { padding: 0; }
  `,
})
export class Panel {
  readonly heading = input<string>();
  readonly subheading = input<string>();
  readonly flush = input(false);
}
