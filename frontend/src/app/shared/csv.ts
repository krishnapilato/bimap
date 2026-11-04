export interface CsvPreview {
  headers: string[];
  rows: string[][];
  truncated: boolean;
}

/** Parse a bounded preview without splitting quoted cells or embedded newlines. */
export function parseCsv(text: string, limit = 10, complete = true): CsvPreview {
  const reader = new CsvReader();
  const input = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i++) {
    i += reader.accept(input.charAt(i), input.charAt(i + 1));
    if (reader.rows.length > limit + 1) break;
  }
  if (complete && reader.rows.length <= limit + 1) reader.finish();
  return { headers: reader.rows[0] ?? [], rows: reader.rows.slice(1, limit + 1), truncated: !complete || reader.rows.length > limit + 1 };
}

class CsvReader {
  readonly rows: string[][] = [];
  private row: string[] = [];
  private cell = '';
  private quoted = false;

  accept(char: string, next: string): number {
    if (char === '"') {
      if (this.quoted && next === '"') { this.cell += '"'; return 1; }
      this.quoted = !this.quoted;
    } else if (!this.quoted && char === ',') {
      this.endCell();
    } else if (!this.quoted && (char === '\r' || char === '\n')) {
      this.endRow();
      return char === '\r' && next === '\n' ? 1 : 0;
    } else this.cell += char;
    return 0;
  }

  finish(): void {
    if (!this.quoted && (this.cell || this.row.length)) this.endRow();
  }

  private endCell(): void { this.row.push(this.cell); this.cell = ''; }
  private endRow(): void { this.endCell(); this.rows.push(this.row); this.row = []; }
}

interface SavePickerWindow extends Window {
  showSaveFilePicker?: (options: { suggestedName: string; types: { description: string; accept: Record<string, string[]> }[] }) => Promise<FileSystemFileHandle>;
}

/** Must be called directly from the confirmation click to preserve browser user activation. */
export async function saveCsv(blob: Blob): Promise<boolean> {
  const picker = (window as SavePickerWindow).showSaveFilePicker;
  if (picker) {
    try {
      const file = await picker.call(window, { suggestedName: 'forms.csv', types: [{ description: 'CSV spreadsheet', accept: { 'text/csv': ['.csv'] } }] });
      const stream = await file.createWritable();
      try { await stream.write(blob); await stream.close(); }
      catch (error) { await stream.abort().catch(() => undefined); throw error; }
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return false;
      throw error;
    }
  }
  const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'forms.csv' });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  return true;
}
