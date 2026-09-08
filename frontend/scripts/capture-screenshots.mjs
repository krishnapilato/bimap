/**
 * Regenerates every screenshot in the READMEs.
 *
 *     npm run screenshots                 # against http://localhost:4200
 *     npm run screenshots -- --base=...   # against anything else
 *
 * Point it at a **demo** dev server (`npm run start:demo`) and it needs no backend: identity and
 * the mail log come from the browser store, while the geography calls the real registries, so the
 * captured cascade shows genuine ISTAT and cadastral codes rather than invented ones.
 *
 * Reduced motion is switched off explicitly. Headless Chromium reports `prefers-reduced-motion:
 * reduce` by default, which is exactly the signal the GSAP layer uses to skip every animation — so
 * without this the shots come out of a page that deliberately did nothing.
 *
 * Author: Khova Krishna Pilato
 */

import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, '../../docs/screenshots');

const base =
  process.argv.find((argument) => argument.startsWith('--base='))?.slice('--base='.length) ??
  'http://localhost:4200';

const DEMO_EMAIL = 'krishnak.pilato@gmail.com';
const DEMO_PASSWORD = 'Cadastr0-Rilievo!';

/** Runs one capture, and reports rather than aborts the rest if it cannot. */
async function shot(page, name, action) {
  try {
    await action();
    await page.waitForTimeout(650);
    await page.screenshot({ path: `${OUT}/${name}.png` });
    console.log('  captured', `${name}.png`);
  } catch (error) {
    console.warn('  SKIPPED', `${name}.png`, '—', error.message.split('\n')[0]);
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 2,
    reducedMotion: 'no-preference',
    colorScheme: 'light',
    locale: 'en-GB',
  });
  const page = await context.newPage();

  console.log('Capturing from', base);

  // ── Landing ──────────────────────────────────────────────────────────────
  await shot(page, 'landing-hero', async () => {
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1400);
  });

  // ── Sign in, so the guarded modules open ─────────────────────────────────
  const email = page.locator('input[name="email"]');
  await email.fill(DEMO_EMAIL);
  await page.locator('input[name="password"]').fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: /^Sign in$/ }).last().click();
  await page.waitForURL(/\/hub/, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const prefix = new URL(page.url()).pathname.replace(/\/(hub|geo|iam|email|health)?$/, '');

  await shot(page, 'hub-modules', async () => {
    await page.goto(`${base}${prefix}/hub`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
  });

  // ── Geo: drive the real cascade ──────────────────────────────────────────
  await page.goto(`${base}${prefix}/geo`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const search = page.locator('input[name="query"]');

  await shot(page, 'geo-split', async () => {
    for (const term of ['Lombardia', 'Varese', 'Varese']) {
      await search.fill(term);
      await page.waitForTimeout(1800);
      await page.locator('.bm-row').first().click();
      await page.waitForTimeout(1600);
    }
    await page.locator('input[name="assetName"]').fill('Palazzo Estense');
    await page.waitForTimeout(2000);
  });

  await shot(page, 'geo-map', async () => {
    await search.fill('Via Luigi Sacco');
    await page.waitForTimeout(2800);
    await page.locator('.bm-row').first().click();
    await page.waitForTimeout(3000);
  });

  // ── The other modules ────────────────────────────────────────────────────
  await shot(page, 'iam-directory', async () => {
    await page.goto(`${base}${prefix}/iam`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1400);
  });

  await shot(page, 'iam-drawer', async () => {
    await page.getByRole('button', { name: /^Edit / }).first().click();
    await page.waitForTimeout(1100);
  });

  await shot(page, 'email-composer', async () => {
    await page.goto(`${base}${prefix}/email`, { waitUntil: 'networkidle' });
    await page.locator('input[name="to"]').fill('surveyor@bimap.local');
    await page.locator('input[name="subject"]').fill('Registrations export');
    await page
      .locator('textarea[name="body"]')
      .fill('<h1>Registrations export</h1>\n<p>The export you asked for is attached.</p>');
    await page.waitForTimeout(1200);
  });

  await shot(page, 'health-rings', async () => {
    await page.goto(`${base}${prefix}/health`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2200);
  });

  // ── The services, when they happen to be running ─────────────────────────
  console.log('  (the three service shots below need the backend on :9843 and :9844)');
  for (const [name, url] of [
    ['swagger-iam', 'http://localhost:9843/swagger-ui.html'],
    ['swagger-core', 'http://localhost:9844/swagger-ui.html'],
    ['home-template', 'http://localhost:9843/'],
  ]) {
    await shot(page, name, async () => {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 8000 });
      await page.waitForTimeout(1800);
    });
  }

  await browser.close();
  console.log('Done →', OUT);
}

await main();
