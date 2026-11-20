import { parseCsv, saveCsv } from './csv';

describe('CSV preview and save', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('preserves quoted commas, newlines, empty cells and escaped quotes', () => {
    const preview = parseCsv('name,address,code\r\n"A, B","line 1\nline ""2""",006061\r\nOther,,001001\r\n');
    expect(preview.headers).toEqual(['name', 'address', 'code']);
    expect(preview.rows).toEqual([['A, B', 'line 1\nline "2"', '006061'], ['Other', '', '001001']]);
    expect(preview.truncated).toBe(false);
  });

  it('limits preview rows and does not show an incomplete final record', () => {
    expect(parseCsv('id\n1\n2\n3\n', 2)).toEqual({ headers: ['id'], rows: [['1'], ['2']], truncated: true });
    expect(parseCsv('id,name\n1,"incomplete', 10, false).rows).toEqual([]);
  });

  it('handles an empty export with its header', () => {
    expect(parseCsv('\uFEFFid,name\n').rows).toEqual([]);
    expect(parseCsv('\uFEFFid,name\n').headers).toEqual(['id', 'name']);
  });

  it('opens the save-location picker and writes the original CSV after confirmation', async () => {
    const stream = { write: vi.fn().mockResolvedValue(undefined), close: vi.fn().mockResolvedValue(undefined) };
    const picker = vi.fn().mockResolvedValue({ createWritable: () => Promise.resolve(stream) });
    vi.stubGlobal('showSaveFilePicker', picker);
    const blob = new Blob(['id\n1\n'], { type: 'text/csv' });
    expect(await saveCsv(blob)).toBe(true);
    expect(picker).toHaveBeenCalledWith(expect.objectContaining({ suggestedName: 'forms.csv' }));
    expect(stream.write).toHaveBeenCalledWith(blob);
    expect(stream.close).toHaveBeenCalledOnce();
  });

  it('treats cancelling the native picker as cancellation rather than an error', async () => {
    vi.stubGlobal('showSaveFilePicker', vi.fn().mockRejectedValue(new DOMException('Cancelled', 'AbortError')));
    expect(await saveCsv(new Blob())).toBe(false);
  });
});
