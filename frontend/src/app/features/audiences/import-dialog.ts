import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { QueryClient } from '@tanstack/angular-query-experimental';
import Papa from 'papaparse';
import { toast } from 'ngx-sonner';

import { ApiError } from '../../core/api/api-error';
import { MailingApi } from '../../core/api/mailing.api';
import { ConsentMode, MailingList, SubscriberImportReport } from '../../core/api/mailing.models';
import { keys } from '../../core/query/keys';
import { saveBlob } from '../../core/ui/files';
import { formatNumber } from '../../core/ui/format';
import { Haptics } from '../../core/ui/haptics';
import { Button } from '../../ui/button/button';
import { CountUp } from '../../ui/charts/count-up';
import { MessageStrip } from '../../ui/feedback/feedback';
import { ChoiceCards, ChoiceOption } from '../../ui/form/choice-cards';
import { Checkbox } from '../../ui/form/toggles';
import { Icon } from '../../ui/icon/icon';
import { CONSENT, CONSENT_ORDER, listSlug } from './audience-presentation';

/** The IAM service's `bimap.mailing.max-import-rows`. */
const MAX_ROWS = 5000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEADERS = {
  email: /e-?mail|posta|indirizzo|address/i,
  firstName: /first|given|forename|^nome$|^name$/i,
  lastName: /last|family|surname|cognome/i,
};

type Step = 'choose' | 'review' | 'report';
type Target = 'email' | 'firstName' | 'lastName';

interface Source {
  name: string;
  rows: string[][];
}

const CONSENT_OPTIONS: ChoiceOption<ConsentMode>[] = CONSENT_ORDER.map((value) => ({ value, ...CONSENT[value] }));

/**
 * A spreadsheet of addresses onto a list, in three steps: bring the file, check what was read and
 * say whether these people agreed, then see exactly what happened to every row. Nothing is sent to
 * the server until the second step is confirmed, and rows the server refuses can be downloaded to
 * fix and import again.
 */
@Component({
  selector: 'bm-import-dialog',
  imports: [Icon, Button, CountUp, MessageStrip, ChoiceCards, Checkbox],
  templateUrl: './import-dialog.html',
  styleUrl: './import-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportDialog {
  protected readonly list = inject<{ list: MailingList }>(DIALOG_DATA).list;
  protected readonly ref = inject<DialogRef<SubscriberImportReport>>(DialogRef);
  private readonly api = inject(MailingApi);
  private readonly queries = inject(QueryClient);
  private readonly haptics = inject(Haptics);

  protected readonly formatNumber = formatNumber;
  protected readonly consentOptions = CONSENT_OPTIONS;
  protected readonly maxRows = MAX_ROWS;

  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('file');

  protected readonly step = signal<Step>('choose');
  protected readonly source = signal<Source | null>(null);
  protected readonly hasHeader = signal(false);
  protected readonly mapping = signal<Record<Target, number>>({ email: 0, firstName: -1, lastName: -1 });
  protected readonly consent = signal<ConsentMode>('REQUEST_CONFIRMATION');
  protected readonly updateExisting = signal(false);

  protected readonly dragging = signal(false);
  protected readonly pasting = signal(false);
  protected readonly pasted = signal('');
  protected readonly readError = signal<string | null>(null);
  protected readonly importing = signal(false);
  protected readonly problem = signal<string | null>(null);
  protected readonly report = signal<SubscriberImportReport | null>(null);

  protected readonly columns = computed(() => {
    const source = this.source();
    if (!source) return [];
    const width = Math.max(...source.rows.map((row) => row.length));
    const header = this.hasHeader() ? source.rows[0] : null;
    return Array.from({ length: width }, (_, index) => ({ index, label: header?.[index]?.trim() || `Column ${index + 1}` }));
  });

  private readonly dataRows = computed(() => this.source()?.rows.slice(this.hasHeader() ? 1 : 0) ?? []);

  protected readonly candidates = computed(() => {
    const { email, firstName, lastName } = this.mapping();
    const seen = new Set<string>();
    return this.dataRows().map((row, index) => {
      const address = (row[email] ?? '').trim();
      const key = address.toLowerCase();
      const duplicate = !!address && seen.has(key);
      seen.add(key);
      return {
        row: index + 1,
        email: address,
        firstName: firstName >= 0 ? (row[firstName] ?? '').trim() : '',
        lastName: lastName >= 0 ? (row[lastName] ?? '').trim() : '',
        valid: EMAIL.test(address),
        duplicate,
      };
    });
  });

  protected readonly checks = computed(() => {
    const rows = this.candidates();
    const valid = rows.filter((row) => row.valid && !row.duplicate).length;
    return { total: rows.length, valid, invalid: rows.filter((row) => !row.valid).length, duplicates: rows.filter((row) => row.valid && row.duplicate).length };
  });

  protected readonly preview = computed(() => this.candidates().slice(0, 6));
  protected readonly tooMany = computed(() => this.dataRows().length > MAX_ROWS);

  // ── Choosing ───────────────────────────────────────────────────────────────

  protected browse(): void {
    this.fileInput()?.nativeElement.click();
  }

  protected over(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    this.dragging.set(true);
  }

  protected drop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) this.read(file);
  }

  protected picked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.read(file);
    input.value = '';
  }

  protected readPasted(): void {
    const text = this.pasted().trim();
    if (!text) return;
    const result = Papa.parse<string[]>(text, { skipEmptyLines: 'greedy' });
    this.load({ name: 'Pasted addresses', rows: result.data });
  }

  private read(file: File): void {
    this.readError.set(null);
    if (!/\.(csv|txt|tsv)$/i.test(file.name) && !/text|csv/.test(file.type)) {
      this.readError.set(`${file.name} is not a CSV file. Save the spreadsheet as CSV and try again.`);
      this.haptics.warning();
      return;
    }
    Papa.parse<string[]>(file, {
      skipEmptyLines: 'greedy',
      complete: (result) => this.load({ name: file.name, rows: result.data }),
      error: () => this.readError.set(`${file.name} could not be read.`),
    });
  }

  private load(source: Source): void {
    const rows = source.rows.filter((row) => row.some((cell) => cell?.trim()));
    if (rows.length === 0) {
      this.readError.set('There is nothing to import: no rows were found.');
      this.haptics.warning();
      return;
    }
    const header = !rows[0].some((cell) => EMAIL.test(cell.trim()));
    this.source.set({ name: source.name, rows });
    this.hasHeader.set(header && rows.length > 1);
    this.mapping.set(guessMapping(rows, header));
    this.step.set('review');
    this.haptics.tap();
  }

  protected template(): void {
    const csv = 'email,first_name,last_name\r\ngiulia.rossi@example.com,Giulia,Rossi\r\nmarco.bianchi@example.org,Marco,Bianchi\r\n';
    saveBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'bimap-subscribers-template.csv');
  }

  // ── Reviewing ──────────────────────────────────────────────────────────────

  protected map(target: Target, event: Event): void {
    const index = Number((event.target as HTMLSelectElement).value);
    this.mapping.update((mapping) => ({ ...mapping, [target]: index }));
  }

  protected back(): void {
    this.source.set(null);
    this.problem.set(null);
    this.step.set('choose');
  }

  protected async run(): Promise<void> {
    if (this.importing() || this.tooMany() || this.checks().valid === 0) return;
    this.importing.set(true);
    this.problem.set(null);
    try {
      const report = await this.api.importSubscribers(this.list.id, {
        rows: this.candidates().map(({ email, firstName, lastName }) => ({ email, firstName: firstName || undefined, lastName: lastName || undefined })),
        consent: this.consent(),
        updateExisting: this.updateExisting(),
      });
      this.report.set(report);
      this.step.set('report');
      this.haptics.success();
      if (report.created + report.updated > 0) {
        toast.success(`${formatNumber(report.created)} added to ${this.list.name}`, { description: report.rejected.length ? `${report.rejected.length} rows were refused.` : undefined });
      }
      void this.queries.invalidateQueries({ queryKey: keys.mailing.all });
    } catch (error) {
      this.haptics.warning();
      this.problem.set(ApiError.from(error).message);
    } finally {
      this.importing.set(false);
    }
  }

  // ── Reporting ──────────────────────────────────────────────────────────────

  protected downloadRefused(): void {
    const refused = this.report()?.rejected ?? [];
    const csv = Papa.unparse({ fields: ['row', 'email', 'reason'], data: refused.map((entry) => [entry.row, entry.email ?? '', entry.reason]) });
    saveBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `bimap-${listSlug(this.list)}-refused-rows.csv`);
  }

  protected close(): void {
    this.ref.close(this.report() ?? undefined);
  }
}

/** Which column is which: by header name when there is one, by content otherwise. */
function guessMapping(rows: string[][], header: boolean): Record<Target, number> {
  const width = Math.max(...rows.map((row) => row.length));
  const find = (pattern: RegExp, exclude: number[] = []) =>
    header ? rows[0].findIndex((cell, index) => !exclude.includes(index) && pattern.test(cell.trim())) : -1;

  const body = rows.slice(header ? 1 : 0, 50);
  const byContent = Array.from({ length: width }, (_, index) => body.filter((row) => EMAIL.test((row[index] ?? '').trim())).length);
  const email = find(HEADERS.email) >= 0 ? find(HEADERS.email) : byContent.indexOf(Math.max(...byContent));

  let firstName = find(HEADERS.firstName, [email]);
  let lastName = find(HEADERS.lastName, [email, firstName]);
  if (!header && width === 3) {
    const others = [0, 1, 2].filter((index) => index !== email);
    [firstName, lastName] = others;
  }
  return { email: Math.max(email, 0), firstName, lastName };
}
