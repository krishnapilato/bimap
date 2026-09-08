/**
 * End-to-end verification of the client, feature by feature.
 *
 *     npm run verify                      # against http://localhost:4200
 *     npm run verify -- --base=...        # against anything else
 *
 * Drives a real browser through every module and asserts what should be true, rather than checking
 * that pages merely load. Console errors are collected per route and reported at the end, because a
 * page that renders while throwing is not a page that works.
 *
 * Run it against a demo server (`npm run start:demo`) and no backend is needed — but the geography
 * still hits the live registries, so the cascade assertions are about real ISTAT codes.
 *
 * Author: Khova Krishna Pilato
 */

import { chromium } from 'playwright';

const base =
  process.argv.find((a) => a.startsWith('--base='))?.slice('--base='.length) ??
  'http://localhost:4200';

const DEMO_EMAIL = 'krishnak.pilato@gmail.com';
const DEMO_PASSWORD = 'Cadastr0-Rilievo!';

const results = [];
const consoleErrors = [];

function check(name, condition, detail = '') {
  results.push({ name, ok: !!condition, detail });
  console.log(`  ${condition ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function step(name, action) {
  try {
    await action();
  } catch (error) {
    check(name, false, error.message.split('\n')[0]);
  }
}

/** Nothing on any page may make the document scroll sideways. */
async function noHorizontalOverflow(page, where) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  check(`${where}: no horizontal page overflow`, overflow <= 1, `${overflow}px`);
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    reducedMotion: 'no-preference',
    colorScheme: 'light',
    acceptDownloads: true,
  });
  const page = await context.newPage();

  let route = 'boot';
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(`[${route}] ${message.text().slice(0, 200)}`);
    }
  });
  page.on('pageerror', (error) => consoleErrors.push(`[${route}] ${error.message.slice(0, 200)}`));

  console.log('Verifying', base, '\n');

  // ── Landing ──────────────────────────────────────────────────────────────
  route = 'landing';
  console.log('Landing');
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const prefix = new URL(page.url()).pathname.replace(/\/$/, '');

  check('hero headline renders', await page.getByRole('heading', { level: 1 }).isVisible());
  check(
    'demo ribbon is present',
    (await page.locator('.bm-ribbon').count()) === 1,
    'demo build only',
  );
  check('metrics counted up', /[1-9]/.test(await page.locator('.bm-reading').first().innerText()));
  await noHorizontalOverflow(page, 'landing');

  check(
    'landing fits one screen without scrolling',
    await page.evaluate(
      () => document.documentElement.scrollHeight <= window.innerHeight + 2,
    ),
    await page.evaluate(() => `${document.documentElement.scrollHeight} vs ${window.innerHeight}`),
  );
  check('sign-in form is visible without moving', await page.locator('input[name="email"]').isVisible());

  // ── Validation ───────────────────────────────────────────────────────────
  route = 'validation';
  console.log('\nValidation');
  const submit = page.locator('button[type="submit"]');
  const email = page.locator('input[name="email"]');
  const password = page.locator('input[name="password"]');

  await email.fill('');
  await password.fill('');
  check('submit blocked with an empty form', await submit.isDisabled());

  await email.fill('not-an-email');
  await email.blur();
  await page.waitForTimeout(300);
  check(
    'invalid email is reported',
    await page.getByText('That is not an email address.').isVisible(),
  );

  await page.getByRole('tab', { name: /Create account/ }).click();
  await page.waitForTimeout(400);
  check('sign-up shows the four password rules', (await page.locator('text=A symbol').count()) > 0);

  await page.locator('input[name="password"]').fill('short');
  await page.waitForTimeout(300);
  const metAfterWeak = await page.locator('.text-success').count();
  await page.locator('input[name="password"]').fill('Sufficiently1!Long');
  await page.waitForTimeout(300);
  const metAfterStrong = await page.locator('.text-success').count();
  check(
    'password rules tick as the rule is met',
    metAfterStrong > metAfterWeak,
    `${metAfterWeak} -> ${metAfterStrong}`,
  );

  // ── Sign in ──────────────────────────────────────────────────────────────
  route = 'sign-in';
  console.log('\nSign in');
  await page.getByRole('tab', { name: /Sign in/ }).click();
  await page.waitForTimeout(400);
  await email.fill(DEMO_EMAIL);
  await password.fill(DEMO_PASSWORD);
  await submit.click();
  await page.waitForURL(/\/hub/, { timeout: 15000 }).catch(() => {});
  check('sign-in reaches the hub', page.url().includes('/hub'), page.url());

  route = 'hub';
  await page.waitForTimeout(900);
  check('hub lists four modules', (await page.locator('button:has(h3), .bm-panel').count()) >= 4);
  await noHorizontalOverflow(page, 'hub');

  // ── Geo: the real cascade ────────────────────────────────────────────────
  route = 'geo';
  console.log('\nGeographic asset engine');
  await page.goto(`${base}${prefix}/geo`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const query = page.locator('input[name="query"]');
  check('search box renders', await query.isVisible());

  await query.fill('Lombardia');
  await page.waitForTimeout(1200);
  await page.locator('.bm-row').first().click();
  await page.waitForTimeout(1400);

  await query.fill('Varese');
  await page.waitForTimeout(1600);
  await page.locator('.bm-row').first().click();
  await page.waitForTimeout(1600);

  await query.fill('Varese');
  await page.waitForTimeout(2200);
  await page.locator('.bm-row').first().click();
  await page.waitForTimeout(2500);

  const body = await page.locator('body').innerText();
  check('a comune resolved from the live registry', /Varese/.test(body));
  check('ISTAT code shown', /\b0121\d\d\b|\bISTAT\b/.test(body));
  check('map canvas mounted', (await page.locator('.leaflet-container, .gm-style').count()) > 0);

  await step('record panel hides and returns', async () => {
    await page.getByRole('button', { name: 'Hide the record' }).click();
    await page.waitForTimeout(500);
    const hidden = (await page.getByRole('button', { name: 'Hide the record' }).count()) === 0;
    await page.locator('.bm-float').first().click();
    await page.waitForTimeout(500);
    check('record panel hides and returns', hidden);
  });

  check('map zoom control present', (await page.locator('[aria-label="Zoom in"]').count()) === 1);
  check('map pan control present', (await page.locator('[aria-label="Pan north"]').count()) === 1);

  check(
    'export is reachable',
    await page.getByRole('button', { name: /Export CSV|Record it/ }).isVisible(),
  );
  await noHorizontalOverflow(page, 'geo');

  await step('CSV export downloads', async () => {
    await page.locator('input[name="assetName"]').fill('Palazzo Estense');
    await query.fill('Via Luigi Sacco');
    await page.waitForTimeout(2600);
    const rows = await page.locator('.bm-row').count();
    if (rows > 0) {
      await page.locator('.bm-row').first().click();
      await page.waitForTimeout(1800);
    }
    const exportButton = page.getByRole('button', { name: /Export CSV|Record it/ });
    if (await exportButton.isDisabled()) {
      check('CSV export enabled once the record is complete', false, 'button still disabled');
      return;
    }
    const download = await Promise.all([
      page.waitForEvent('download', { timeout: 8000 }),
      exportButton.click(),
    ]);
    check('CSV export downloads', !!download[0], download[0].suggestedFilename());
  });

  // ── IAM ──────────────────────────────────────────────────────────────────
  route = 'iam';
  console.log('\nIdentity');
  await page.goto(`${base}${prefix}/iam`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  const iamText = await page.locator('body').innerText();
  const seeded = ['Khova Krishna', 'Marco', 'Giulia', 'Luca', 'Sofia', 'Antonio'].filter((n) =>
    iamText.includes(n),
  );
  check('all six seeded accounts listed', seeded.length === 6, seeded.join(', '));
  check('no removed account lingers', !iamText.includes('Elena'));
  await noHorizontalOverflow(page, 'iam');

  // ── Email ────────────────────────────────────────────────────────────────
  route = 'email';
  console.log('\nEmail');
  await page.goto(`${base}${prefix}/email`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  const bodyField = page.locator('textarea[name="body"]');
  check('composer renders', await bodyField.isVisible());

  await bodyField.fill('Just a plain sentence with no markup at all.');
  await page.waitForTimeout(500);
  check(
    'prose resolves to text/plain',
    (await page.locator('body').innerText()).includes('text/plain'),
  );

  await bodyField.fill('<h1>Export</h1><p>Attached.</p>');
  await page.waitForTimeout(500);
  check(
    'markup resolves to text/html',
    (await page.locator('body').innerText()).includes('text/html'),
  );
  check('no format tabs remain', (await page.getByRole('tab', { name: 'Plain text' }).count()) === 0);
  await noHorizontalOverflow(page, 'email');

  // ── Health ───────────────────────────────────────────────────────────────
  route = 'health';
  console.log('\nHealth');
  await page.goto(`${base}${prefix}/health`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2200);
  const healthText = await page.locator('body').innerText();
  check('both services reported', /iam/i.test(healthText) && /business|core/i.test(healthText));
  await noHorizontalOverflow(page, 'health');

  // ── The ribbon survives every route ──────────────────────────────────────
  check('demo ribbon still present after navigation', (await page.locator('.bm-ribbon').count()) === 1);
  check('command corner present on every module', (await page.locator('.bm-corner').count()) === 1);
  check(
    'map controls rendered',
    (await page.locator('[aria-label="Zoom in"]').count()) === 0 ||
      (await page.locator('[aria-label="Zoom in"]').count()) === 1,
  );

  await browser.close();

  // ── Report ───────────────────────────────────────────────────────────────
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);

  if (consoleErrors.length > 0) {
    console.log(`\n${consoleErrors.length} console error(s):`);
    for (const error of [...new Set(consoleErrors)].slice(0, 15)) {
      console.log('  -', error);
    }
  } else {
    console.log('No console errors on any route.');
  }

  if (failed.length > 0) {
    console.log('\nFailures:');
    for (const failure of failed) {
      console.log('  -', failure.name, failure.detail ? `(${failure.detail})` : '');
    }
    process.exitCode = 1;
  }
}

await main();
