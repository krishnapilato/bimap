// Builds the geography snapshot the demo build answers from.
//
// The live product never stores geography — the business service reads Comuni-ITA and caches it.
// The demo has no server at all, so it ships one dated, compact snapshot instead:
//
//     npm run demo:geography
//
// Author: Khova Krishna Pilato

import { mkdir, writeFile } from 'node:fs/promises';

const SOURCE = 'https://comuni-ita.nicolorebaioli.dev';
const TARGET = new URL('../public/demo/geography.json', import.meta.url);
const HEADERS = { 'User-Agent': 'BiMap/2.0 (https://github.com/krishnapilato/bimap)' };

async function read(path) {
  const response = await fetch(SOURCE + path, { headers: HEADERS });
  if (!response.ok) throw new Error(`${path} answered ${response.status}`);
  return response.json();
}

const round = (value) => (value == null ? null : Math.round(value * 1e5) / 1e5);

const [regions, provinces, municipalities] = await Promise.all([
  read('/regioni'),
  read('/province'),
  read('/comuni'),
]);

const snapshot = {
  source: 'Comuni-ITA (MIT) — https://github.com/Samurai016/Comuni-ITA',
  retrievedAt: new Date().toISOString().slice(0, 10),
  regions: [...regions].sort((a, b) => a.localeCompare(b, 'it')),
  // [code, name, abbreviation, region]
  provinces: provinces.map((p) => [p.codice, p.nome, p.sigla, p.regione]),
  // [istatCode, name, cadastralCode, postalCode, provinceAbbreviation, population, lat, lng]
  municipalities: municipalities.map((m) => [
    m.codice,
    m.nome,
    m.codiceCatastale,
    m.cap,
    m.provincia?.sigla ?? null,
    m.popolazione ?? null,
    round(m.coordinate?.lat),
    round(m.coordinate?.lng),
  ]),
};

await mkdir(new URL('.', TARGET), { recursive: true });
await writeFile(TARGET, JSON.stringify(snapshot));

console.log(
  `Wrote ${snapshot.regions.length} regions, ${snapshot.provinces.length} provinces and ` +
    `${snapshot.municipalities.length} municipalities to public/demo/geography.json`,
);
