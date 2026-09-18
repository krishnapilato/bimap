import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input, output } from '@angular/core';

import { Page } from '../../core/api/common.models';
import { formatNumber } from '../../core/ui/format';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import { Tooltip } from '../tooltip/tooltip';

/** Where you are in a long list, and the way forward and back. */
@Component({
  selector: 'bm-paginator',
  imports: [Icon, Button, Tooltip],
  template: `
    <span class="bm-paginator__range" aria-live="polite">
      @if (page(); as current) {
        @if (current.totalElements > 0) {
          <strong>{{ first() }}–{{ last() }}</strong> of {{ total() }}
        } @else {
          No results
        }
      }
    </span>
    @if (sizes().length) {
      <label class="bm-paginator__size">
        <span>Rows</span>
        <select [value]="page()?.size ?? sizes()[0]" (change)="sizeChange.emit(+$any($event.target).value)">
          @for (size of sizes(); track size) {
            <option [value]="size">{{ size }}</option>
          }
        </select>
      </label>
    }
    <div class="bm-paginator__nav">
      <button bmButton iconOnly size="sm" variant="ghost" type="button" bmTooltip="Previous page" [disabled]="page()?.first ?? true" (click)="pageChange.emit((page()?.page ?? 0) - 1)">
        <svg lucideIcon="chevron-left"></svg>
      </button>
      <span class="bm-paginator__pages">{{ (page()?.page ?? 0) + 1 }} / {{ page()?.totalPages || 1 }}</span>
      <button bmButton iconOnly size="sm" variant="ghost" type="button" bmTooltip="Next page" [disabled]="page()?.last ?? true" (click)="pageChange.emit((page()?.page ?? 0) + 1)">
        <svg lucideIcon="chevron-right"></svg>
      </button>
    </div>
  `,
  styles: `
    .bm-paginator { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 8px 16px; padding: 10px 14px; border-top: 1px solid var(--bm-border-subtle); font: var(--bm-text-caption); color: var(--bm-text-2); }
    .bm-paginator__range { margin-right: auto; font-variant-numeric: tabular-nums; }
    .bm-paginator__range strong { color: var(--bm-text); font-weight: 650; }
    .bm-paginator__size { display: inline-flex; align-items: center; gap: 6px; }
    .bm-paginator__size select { height: 28px; padding: 0 6px; border: 1px solid var(--bm-border); border-radius: var(--bm-radius-sm); background: var(--bm-surface); font: var(--bm-text-caption); cursor: pointer; }
    .bm-paginator__nav { display: inline-flex; align-items: center; gap: 4px; }
    .bm-paginator__pages { min-width: 52px; text-align: center; font-variant-numeric: tabular-nums; color: var(--bm-text); font-weight: 600; }
    @media (max-width: 600px) { .bm-paginator__size { display: none; } }
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'bm-paginator' },
})
export class Paginator {
  readonly page = input.required<Page<unknown> | undefined>();
  readonly sizes = input([10, 25, 50, 100]);
  readonly pageChange = output<number>();
  readonly sizeChange = output<number>();

  protected readonly first = computed(() => {
    const page = this.page();
    return page ? formatNumber(page.page * page.size + 1) : '0';
  });

  protected readonly last = computed(() => {
    const page = this.page();
    return page ? formatNumber(page.page * page.size + page.content.length) : '0';
  });

  protected readonly total = computed(() => formatNumber(this.page()?.totalElements ?? 0));
}
