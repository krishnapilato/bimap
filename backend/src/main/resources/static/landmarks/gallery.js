(() => {
  const text = (html) => {
    const template = document.createElement('template');
    template.innerHTML = html || '';
    return template.content.textContent.trim();
  };
  const safeUrl = (value, hosts) => {
    try { const url = new URL(value); return url.protocol === 'https:' && hosts.includes(url.hostname) ? url.href : null; }
    catch { return null; }
  };
  const cleanTitle = (value) => text(value).replaceAll('_', ' ')
    .replace(/\b\d{4}[- ]\d{2}[- ]\d{2}.*$/, '')
    .replace(/\([^)]*\)|\[[^\]]*\]/g, '').replace(/\d+/g, '')
    .replace(/\.(?:jpe?g|png|webp|tiff?)$/i, '').replace(/[\s:_-]+$/, '').replace(/\s+/g, ' ').trim();


  const cacheKey = 'bimap-heritage-photos:v1';
  const validPhoto = (photo) => photo && typeof photo.title === 'string' && typeof photo.author === 'string'
    && typeof photo.license === 'string' && safeUrl(photo.image, ['thumb.wikimedia.org', 'upload.wikimedia.org'])
    && safeUrl(photo.source, ['commons.wikimedia.org']) && safeUrl(photo.licenseUrl, ['creativecommons.org']);
  const readCache = () => {
    try {
      const value = JSON.parse(sessionStorage.getItem(cacheKey) || 'null');
      return value?.expires > Date.now() && Array.isArray(value.items) ? value.items.filter(validPhoto).slice(0, 6) : [];
    } catch { return []; }
  };
  const queue = readCache();
  const recent = [];
  let pendingBatch;
  const persistCache = () => {
    try { sessionStorage.setItem(cacheKey, JSON.stringify({ expires: Date.now() + 21600000, items: queue })); }
    catch { /* Restricted storage does not prevent live photography. */ }
  };

  class LandmarkGallery extends HTMLElement {
    connectedCallback() {
      this.events = new AbortController();
      this.loading = false;
      this.setAttribute('role', 'region');
      this.setAttribute('aria-label', 'A random photograph of Italian cultural heritage');
      this.innerHTML = `
        <img class="landmark-photo" alt="" />
        <div class="landmark-shade"></div>
        <div class="landmark-message" role="status"><p>Finding a corner of Italy…</p><button type="button" class="landmark-retry" hidden>Try again</button></div>
        <div class="landmark-content" hidden><p class="landmark-city"></p><p class="landmark-credit"></p></div>`;
      this.querySelector('.landmark-retry').addEventListener('click', () => void this.load(), { signal: this.events.signal });
      // Angular sets custom-element attributes during the first render, after connection.
      queueMicrotask(() => void this.load());
    }

    disconnectedCallback() { this.events?.abort(); }

    async randomPhoto() {
      const endpoint = safeUrl(this.dataset.api, ['commons.wikimedia.org']);
      if (!endpoint) throw new Error('Photography is not configured.');
      if (!queue.length) await this.fillQueue(endpoint);
      const photo = queue.shift();
      if (!photo) throw new Error('No photographs available.');
      recent.push(photo.source);
      if (recent.length > 10) recent.shift();
      persistCache();
      if (queue.length <= 1) void this.fillQueue(endpoint).catch(() => undefined);
      return photo;
    }

    fillQueue(endpoint) {
      pendingBatch ??= this.fetchBatch(endpoint).then((photos) => {
        const fresh = photos.filter((photo) => !recent.includes(photo.source) && !queue.some((cached) => cached.source === photo.source));
        while (fresh.length && queue.length < 5) queue.push(fresh.splice(Math.floor(Math.random() * fresh.length), 1)[0]);
        persistCache();
      }).finally(() => { pendingBatch = undefined; });
      return pendingBatch;
    }

    async fetchBatch(configuredEndpoint) {
      const endpoint = configuredEndpoint;
      const year = new Date().getFullYear() - 1;
      const url = new URL(endpoint);
      url.search = new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', origin: '*', generator: 'search',
        gsrnamespace: '6', gsrlimit: '12', gsroffset: String(Math.floor(Math.random() * 980)),
        gsrsearch: `incategory:"Images from Wiki Loves Monuments ${year} in Italy" filetype:bitmap`,
        prop: 'imageinfo', iiprop: 'url|extmetadata|mime', iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl|ObjectName', iiurlwidth: '960', iiurlheight: '1280' }).toString();
      const controller = new AbortController();
      const abort = () => controller.abort();
      const timer = setTimeout(abort, 10000);
      try {
        const response = await fetch(url, { signal: controller.signal, credentials: 'omit' });
        if (!response.ok) throw new Error('Photo service unavailable.');
        const data = await response.json();
        const candidates = (data.query?.pages || []).map((page) => {
          const info = page.imageinfo?.[0];
          const meta = info?.extmetadata;
          const license = text(meta?.LicenseShortName?.value);
          const image = safeUrl(info?.thumburl, ['thumb.wikimedia.org', 'upload.wikimedia.org']);
          const source = safeUrl(info?.descriptionurl, ['commons.wikimedia.org']);
          const licenseUrl = safeUrl(meta?.LicenseUrl?.value, ['creativecommons.org']);
          const author = text(meta?.Artist?.value);
          if (!image || !source || !author || !licenseUrl || !/^(CC BY(?:-SA)? [\d.]+|CC0)$/.test(license)) return null;
          const title = cleanTitle(meta?.ObjectName?.value || page.title.replace(/^File:/, '').replace(/\.[^.]+$/, '')) || 'Italian cultural heritage';
          return { image, source, license, licenseUrl, author, title };
        }).filter(Boolean);
        if (!candidates.length) throw new Error('No photographs available.');
        return candidates;
      } finally {
        clearTimeout(timer);
      }
    }

    async load() {
      if (this.loading || !this.isConnected) return;
      this.loading = true;
      const message = this.querySelector('.landmark-message');
      message.hidden = false;
      message.querySelector('p').textContent = 'Finding a corner of Italy…';
      message.querySelector('button').hidden = true;
      try {
        const photo = await this.randomPhoto();
        if (!this.isConnected) return;
        const image = this.querySelector('.landmark-photo');
        await new Promise((resolve, reject) => {
          const finish = (error) => {
            clearTimeout(timer);
            this.events.signal.removeEventListener('abort', abort);
            image.onload = null;
            image.onerror = null;
            if (error) reject(error); else resolve();
          };
          const abort = () => finish(new Error('Image cancelled'));
          const timer = setTimeout(() => finish(new Error('Image timed out')), 10000);
          this.events.signal.addEventListener('abort', abort, { once: true });
          image.onload = () => finish();
          image.onerror = () => finish(new Error('Image unavailable'));
          image.src = photo.image;
        });
        if (!this.isConnected) return;
        image.alt = photo.title;
        image.toggleAttribute('data-active', true);
        this.querySelector('.landmark-city').textContent = photo.title;
        const source = Object.assign(document.createElement('a'), { href: photo.source, textContent: photo.author, target: '_blank', rel: 'noopener noreferrer' });
        const license = Object.assign(document.createElement('a'), { href: photo.licenseUrl, textContent: photo.license, target: '_blank', rel: 'noopener noreferrer' });
        this.querySelector('.landmark-credit').replaceChildren('Photo: ', source, ' · ', license, ' · Wikimedia Commons');
        message.hidden = true;
        this.querySelector('.landmark-content').hidden = false;
        queue.slice(0, 5).forEach((photo) => { const image = new Image(); image.decoding = 'async'; image.src = photo.image; });
      } catch {
        if (this.isConnected) {
          message.querySelector('p').textContent = 'Photographs are temporarily unavailable.';
          message.querySelector('button').hidden = false;
        }
      } finally { this.loading = false; }
    }
  }

  if (!customElements.get('bimap-landmarks')) customElements.define('bimap-landmarks', LandmarkGallery);
})();
