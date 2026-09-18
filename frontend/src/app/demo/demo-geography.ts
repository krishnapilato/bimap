import { Injectable } from '@angular/core';

import { Address, EntityCode, Municipality, Province, Region } from '../core/api/geo.models';
import { fold, rank } from './demo-http';

interface Snapshot {
  regions: string[];
  provinces: Array<[code: string, name: string, abbreviation: string, region: string]>;
  municipalities: Array<[istat: string, name: string, cadastral: string, cap: string, province: string, population: number | null, lat: number | null, lng: number | null]>;
}

const STREETS = [
  'Via Roma', 'Via Giuseppe Garibaldi', 'Via Giuseppe Mazzini', 'Corso Italia', 'Piazza della Repubblica',
  'Via Camillo Benso di Cavour', 'Viale Europa', 'Via Dante Alighieri', 'Corso Vittorio Emanuele II',
  'Via XX Settembre', 'Piazza del Duomo', 'Via Guglielmo Marconi', 'Via Giuseppe Verdi', 'Via Alessandro Manzoni',
  'Via Giacomo Leopardi', 'Piazza Giuseppe Garibaldi', 'Via San Francesco', 'Via Nazionale', 'Via del Castello',
  'Viale della Libertà', 'Via Monte Grappa', 'Via Trieste', 'Via Trento', 'Piazza del Municipio', 'Via Sacco',
];

/**
 * Italian geography for the demo, from a dated Comuni-ITA snapshot, searched with the same folding
 * and ranking rules as the business service. Streets and public bodies are synthesised around the
 * real municipality, because the demo has no Nominatim and no public-body directory to ask.
 */
@Injectable({ providedIn: 'root' })
export class DemoGeography {
  private snapshot: Promise<Snapshot> | null = null;

  async regions(q: string, limit: number): Promise<Region[]> {
    const data = await this.load();
    return best(data.regions, (name) => [name], fold(q), limit).map((name) => ({ name }));
  }

  async provinces(q: string, region: string | undefined, limit: number): Promise<Province[]> {
    const data = await this.load();
    const inRegion = data.provinces.filter((p) => !region || fold(p[3]) === fold(region));
    return best(inRegion, (p) => [p[1], p[2]], fold(q), limit).map(toProvince);
  }

  async municipalities(q: string, region: string | undefined, province: string | undefined, limit: number): Promise<Municipality[]> {
    const data = await this.load();
    const provinces = new Map(data.provinces.map((p) => [p[2], p]));
    const wantedProvince = province ? fold(province) : null;

    const candidates = data.municipalities.filter((m) => {
      const owner = provinces.get(m[4]);
      if (region && (!owner || fold(owner[3]) !== fold(region))) return false;
      if (wantedProvince && fold(m[4]) !== wantedProvince && fold(owner?.[1]) !== wantedProvince) return false;
      return true;
    });

    return best(candidates, (m) => [m[1], m[0], m[2]], fold(q), limit).map((m) => toMunicipality(m, provinces));
  }

  async municipality(istatCode: string): Promise<Municipality | undefined> {
    const data = await this.load();
    const provinces = new Map(data.provinces.map((p) => [p[2], p]));
    const found = data.municipalities.find((m) => m[0] === istatCode);
    return found ? toMunicipality(found, provinces) : undefined;
  }

  /** Plausible streets inside the chosen municipality, positioned deterministically near its centre. */
  async addresses(street: string | undefined, municipality: string | undefined, q: string | undefined, limit: number): Promise<Address[]> {
    const typed = (street ?? q ?? '').trim();
    const number = /\d+[a-zA-Z/]*$/.exec(typed)?.[0];
    const streetPart = number ? typed.slice(0, -number.length).trim() : typed;

    const town = municipality
      ? (await this.municipalities(municipality, undefined, undefined, 1))[0]
      : (await this.municipalities(q?.split(',').pop()?.trim() ?? 'Roma', undefined, undefined, 1))[0];
    if (!town || town.latitude == null || town.longitude == null) return [];

    const folded = fold(streetPart);
    const names = STREETS.filter((name) => !folded || fold(name).includes(folded));
    if (folded && !names.some((name) => fold(name) === folded) && streetPart.length > 3) {
      names.unshift(titleCase(streetPart));
    }

    return names.slice(0, limit).map((name) => {
      const [dLat, dLng] = offset(`${town.istatCode}:${name}`);
      const label = [name + (number ? ` ${number}` : ''), town.postalCode, town.name, town.province, 'Italia']
        .filter(Boolean)
        .join(', ');
      return {
        label,
        street: name,
        houseNumber: number,
        postalCode: town.postalCode,
        municipality: town.name,
        province: town.province,
        region: town.region,
        latitude: round(town.latitude! + dLat),
        longitude: round(town.longitude! + dLng),
      };
    });
  }

  async postalCodes(municipality: string, limit: number): Promise<string[]> {
    const town = (await this.municipalities(municipality, undefined, undefined, 1))[0];
    return town?.postalCode ? [town.postalCode].slice(0, limit) : [];
  }

  /** The bodies a real directory lists for a comune, with codes shaped like the real ones. */
  async entityCodes(q: string, municipality: string | undefined, province: string | undefined, region: string | undefined, limit: number): Promise<EntityCode[]> {
    const towns = municipality
      ? await this.municipalities(municipality, region, province, 1)
      : await this.municipalities('', region, province, 8);

    const bodies = towns.flatMap((town) => {
      const seat = { municipality: town.name, province: town.provinceCode, region: town.region };
      const code = (salt: string) => billingCode(`${town.istatCode}:${salt}`);
      return [
        { name: `Comune di ${town.name}`, billingCode: code('comune'), ipaCode: `c_${town.cadastralCode?.toLowerCase()}`, taxCode: taxCode(town.istatCode), category: 'Comuni e loro Consorzi e Associazioni', offices: 6, ...seat },
        { name: `Archivio di Stato di ${town.province}`, billingCode: code('archivio'), ipaCode: `as_${fold(town.provinceCode).slice(0, 2)}`, taxCode: taxCode(`${town.istatCode}1`), category: 'Agenzie ed Enti per il Turismo', offices: 1, ...seat },
        { name: `Soprintendenza Archeologia, Belle Arti e Paesaggio — ${town.province}`, billingCode: code('sabap'), ipaCode: `sabap_${fold(town.provinceCode).slice(0, 2)}`, taxCode: taxCode(`${town.istatCode}2`), category: 'Pubbliche Amministrazioni', offices: 2, ...seat },
        { name: `Biblioteca civica di ${town.name}`, billingCode: code('biblioteca'), ipaCode: `bc_${town.cadastralCode?.toLowerCase()}`, taxCode: taxCode(`${town.istatCode}3`), category: 'Istituti di cultura', offices: 1, ...seat },
      ] satisfies EntityCode[];
    });

    const folded = fold(q);
    return bodies
      .map((body) => ({ body, rank: rank(body.name, folded) }))
      .filter((entry) => entry.rank !== null)
      .sort((a, b) => a.rank! - b.rank!)
      .slice(0, limit)
      .map((entry) => entry.body);
  }

  private load(): Promise<Snapshot> {
    this.snapshot ??= fetch(new URL('demo/geography.json', document.baseURI)).then((response) => {
      if (!response.ok) throw new Error(`The geography snapshot answered ${response.status}`);
      return response.json() as Promise<Snapshot>;
    });
    return this.snapshot;
  }
}

function best<T>(items: T[], names: (item: T) => Array<string | null>, query: string, limit: number): T[] {
  return items
    .map((item) => {
      const ranks = names(item).map((name) => rank(name, query)).filter((r): r is number => r !== null);
      return { item, rank: ranks.length ? Math.min(...ranks) : null, name: names(item)[0] ?? '' };
    })
    .filter((entry) => entry.rank !== null)
    .sort((a, b) => a.rank! - b.rank! || a.name.localeCompare(b.name, 'it'))
    .slice(0, limit)
    .map((entry) => entry.item);
}

function toProvince(p: Snapshot['provinces'][number]): Province {
  return { code: p[0], name: p[1], abbreviation: p[2], region: p[3] };
}

function toMunicipality(m: Snapshot['municipalities'][number], provinces: Map<string, Snapshot['provinces'][number]>): Municipality {
  const province = provinces.get(m[4]);
  return {
    istatCode: m[0],
    name: m[1],
    cadastralCode: m[2],
    postalCode: m[3],
    province: province?.[1],
    provinceCode: m[4],
    region: province?.[3],
    population: m[5] ?? undefined,
    latitude: m[6] ?? undefined,
    longitude: m[7] ?? undefined,
  };
}

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Within roughly six hundred metres of the centre, always the same for the same street. */
function offset(key: string): [number, number] {
  const h = hash(key);
  return [((h % 1000) / 1000 - 0.5) * 0.011, (((h >>> 10) % 1000) / 1000 - 0.5) * 0.015];
}

function billingCode(key: string): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  let h = hash(key);
  let code = 'UF';
  for (let i = 0; i < 4; i++) {
    code += alphabet[h % alphabet.length];
    h = Math.floor(h / alphabet.length) + 7919;
  }
  return code;
}

function taxCode(key: string): string {
  return String(hash(key)).padStart(11, '0').slice(-11);
}

function round(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

function titleCase(value: string): string {
  return value.toLowerCase().replace(/(^|\s)\p{L}/gu, (letter) => letter.toUpperCase());
}
