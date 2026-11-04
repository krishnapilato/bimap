import '../../../public/landmarks/gallery.js';

describe('Live heritage photograph', () => {
  let gallery: HTMLElement;
  const image = {
    title: 'File:Lodi Vecchio - Santa Maria (002) - 2025-09-30 15-04-35 001.jpg',
    imageinfo: [{ thumburl: 'https://thumb.wikimedia.org/test.jpg', descriptionurl: 'https://commons.wikimedia.org/wiki/File:Example.jpg',
      extmetadata: { LicenseShortName: { value: 'CC BY-SA 4.0' }, LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0/' }, Artist: { value: '<a href="https://example.com">Photographer</a>' } } }],
  };

  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ query: { pages: [image] } }), { status: 200 }));
    gallery = document.createElement('bimap-landmarks');
    document.body.append(gallery);
    gallery.dataset['api'] = 'https://commons.wikimedia.org/w/api.php';
  });
  afterEach(() => { gallery.remove(); vi.restoreAllMocks(); sessionStorage.clear(); });

  it('retrieves random Italian heritage and removes filenames, counters and dates from the caption', async () => {
    await vi.waitFor(() => expect(gallery.querySelector('img')?.src).toBe('https://thumb.wikimedia.org/test.jpg'));
    gallery.querySelector('img')?.dispatchEvent(new Event('load'));
    await vi.waitFor(() => expect(gallery.querySelector('.landmark-city')?.textContent).toBe('Lodi Vecchio - Santa Maria'));
    expect(gallery.querySelector('.landmark-credit')?.textContent).toContain('Photographer');
    expect(gallery.querySelector('.landmark-controls')).toBeNull();
    const message = gallery.querySelector('.landmark-message');
    if (!message) throw new Error('Missing photo status');
    expect(message.hasAttribute('hidden')).toBe(true);
    const request = vi.mocked(fetch).mock.calls[0]?.[0];
    expect(typeof request === 'string' || request instanceof URL).toBe(true);
    const url = request instanceof Request ? request.url : String(request);
    expect(url).toContain('in+Italy');
    expect(url).toContain('iiurlwidth=960');
  });
});
