import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  TemplateRef,
  ViewEncapsulation,
  booleanAttribute,
  computed,
  contentChild,
  contentChildren,
  inject,
  input,
  output,
} from '@angular/core';

import { Sort } from '../../core/api/common.models';
import { Viewport } from '../../core/ui/viewport';
import { Skeleton } from '../feedback/feedback';
import { Icon } from '../icon/icon';
import { Ripple } from '../interaction/ripple';

/** One column: `<ng-template bmColumn="assetName" header="Asset" sortable let-row>`. */
@Directive({ selector: 'ng-template[bmColumn]' })
export class Column<T> {
  readonly template = inject<TemplateRef<{ $implicit: T }>>(TemplateRef);
  readonly bmColumn = input.required<string>();
  readonly header = input('');
  readonly sortable = input(false, { transform: booleanAttribute });
  readonly align = input<'start' | 'end' | 'center'>('start');
  readonly width = input<string>();
  /** Columns that matter least leave first on narrower screens. */
  readonly priority = input<1 | 2 | 3>(1);
}

/** The card a row becomes on a phone, where a table would only scroll sideways. */
@Directive({ selector: 'ng-template[bmCard]' })
export class RowCard<T> {
  readonly template = inject<TemplateRef<{ $implicit: T }>>(TemplateRef);
}

/**
 * The working list of every screen. Rows answer to hover with a sliding accent, open on click or
 * Enter, and the header sorts with an arrow that turns. While loading, placeholder rows keep the
 * table's shape; on a phone each row becomes a card.
 */
@Component({
  selector: 'bm-table',
  imports: [NgTemplateOutlet, Icon, Skeleton, Ripple],
  templateUrl: './table.html',
  styleUrl: './table.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'bm-table', '[class.is-refreshing]': 'refreshing()', '[attr.data-density]': 'density()' },
})
export class Table<T extends object> {
  private readonly viewport = inject(Viewport);

  readonly rows = input.required<T[] | undefined>();
  readonly rowKey = input.required<(row: T) => string>();
  readonly loading = input(false, { transform: booleanAttribute });
  /** A refetch with rows already on screen: they stay, dimmed, instead of flashing skeletons. */
  readonly refreshing = input(false, { transform: booleanAttribute });
  readonly selectedKey = input<string | null>(null);
  readonly sort = input<Sort | undefined>();
  readonly caption = input.required<string>();
  readonly density = input<'comfortable' | 'compact'>('comfortable');
  readonly interactive = input(true);

  readonly rowOpen = output<T>();
  readonly sortChange = output<Sort>();

  protected readonly columns = contentChildren<Column<T>>(Column);
  protected readonly card = contentChild<RowCard<T>>(RowCard);

  protected readonly asCards = computed(() => this.viewport.isHandset() && !!this.card());
  protected readonly placeholders = Array.from({ length: 6 }, (_, index) => index);

  protected readonly visibleColumns = computed(() => {
    const narrow = !this.viewport.isDesktop();
    return this.columns().filter((column) => !(narrow && column.priority() === 3));
  });

  protected sortState(column: Column<T>): 'ascending' | 'descending' | 'none' {
    const sort = this.sort();
    if (!sort || sort.field !== column.bmColumn()) return 'none';
    return sort.direction === 'asc' ? 'ascending' : 'descending';
  }

  protected toggleSort(column: Column<T>): void {
    const current = this.sortState(column);
    this.sortChange.emit({ field: column.bmColumn(), direction: current === 'ascending' ? 'desc' : 'asc' });
  }

  protected open(row: T): void {
    if (this.interactive()) this.rowOpen.emit(row);
  }
}
