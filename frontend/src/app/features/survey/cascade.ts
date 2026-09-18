import { Address, EntityCode, Municipality, Province, Region } from '../../core/api/geo.models';
import { GeoApi } from '../../core/api/geo.api';
import { LookupOption, fold } from '../../ui/form/lookup';
import { SurveyKey, SurveyModel } from './survey-form';

/**
 * One autocomplete step of the guided cascade.
 *
 * The server decides the order and what narrows what; each step here decides how a suggestion is
 * shown and what choosing it fills in. Every search takes the answers already given as filters,
 * and every choice also fills in the answers above it that are still empty, so a surveyor who
 * starts from the municipality gets the province and region for free.
 */
export interface CascadeStep<T = unknown> {
  field: SurveyKey;
  icon: string;
  placeholder?: string;
  minLength: number;
  mono?: boolean;
  /** Filled by choosing a suggestion, and cleared again once the text is edited away from it. */
  derived: readonly SurveyKey[];
  search(text: string, model: SurveyModel): Promise<ReadonlyArray<LookupOption<T>>>;
  pick(value: T, model: SurveyModel): Partial<SurveyModel>;
}

/** What goes stale when a field's answer changes, beyond the fields it fills itself. */
export const DEPENDANTS: Partial<Record<SurveyKey, readonly SurveyKey[]>> = {
  region: ['provinceName', 'provinceCode', 'municipality', 'istatCode', 'cadastralCode', 'address', 'houseNumber', 'postalCode', 'entityName', 'entityBillingCode', 'latitude', 'longitude'],
  provinceName: ['municipality', 'istatCode', 'cadastralCode', 'address', 'houseNumber', 'postalCode', 'entityName', 'entityBillingCode', 'latitude', 'longitude'],
  municipality: ['address', 'houseNumber', 'postalCode', 'entityName', 'entityBillingCode', 'latitude', 'longitude'],
};

const whenEmpty = (current: string, next: string | null | undefined): string => current.trim() || (next ?? '');

export function cascadeSteps(geo: GeoApi): ReadonlyMap<SurveyKey, CascadeStep> {
  const region: CascadeStep<Region> = {
    field: 'region',
    icon: 'earth',
    placeholder: 'Lombardia',
    minLength: 0,
    derived: [],
    search: async (text) => (await geo.regions(text, 20)).map((value) => ({ value, label: value.name })),
    pick: (value) => ({ region: value.name }),
  };

  const province: CascadeStep<Province> = {
    field: 'provinceName',
    icon: 'map',
    placeholder: 'Varese',
    minLength: 0,
    derived: ['provinceCode'],
    search: async (text, model) =>
      (await geo.provinces(text, model.region.trim() || undefined, 8)).map((value) => ({
        value,
        label: value.name,
        detail: value.region,
        badge: value.abbreviation,
      })),
    pick: (value, model) => ({
      provinceName: value.name,
      provinceCode: value.abbreviation,
      region: whenEmpty(model.region, value.region),
    }),
  };

  const municipality: CascadeStep<Municipality> = {
    field: 'municipality',
    icon: 'landmark',
    placeholder: 'Name, ISTAT or cadastral code',
    minLength: 1,
    derived: ['istatCode', 'cadastralCode'],
    search: async (text, model) =>
      (await geo.municipalities(text, { region: model.region.trim() || undefined, province: model.provinceCode.trim() || undefined }, 8)).map(
        (value) => ({
          value,
          label: value.name,
          detail: [value.province && `${value.province} (${value.provinceCode})`, value.region].filter(Boolean).join(' · '),
          badge: value.istatCode,
        }),
      ),
    pick: (value, model) => ({
      municipality: value.name,
      istatCode: value.istatCode,
      cadastralCode: value.cadastralCode ?? '',
      postalCode: whenEmpty(model.postalCode, value.postalCode),
      provinceName: whenEmpty(model.provinceName, value.province),
      provinceCode: whenEmpty(model.provinceCode, value.provinceCode),
      region: whenEmpty(model.region, value.region),
    }),
  };

  const address: CascadeStep<Address> = {
    field: 'address',
    icon: 'route',
    placeholder: 'Via Giacomo Leopardi 12',
    minLength: 3,
    derived: [],
    search: async (text, model) =>
      (
        await geo.addresses({
          street: text,
          municipality: model.municipality.trim() || undefined,
          province: model.provinceName.trim() || undefined,
          limit: 6,
        })
      ).map((value) => ({
        value,
        label: value.street || value.label,
        detail: [value.houseNumber, value.postalCode, value.municipality].filter(Boolean).join(' · ') || value.label,
      })),
    pick: (value, model) => ({
      address: value.street || value.label,
      houseNumber: value.houseNumber || model.houseNumber,
      postalCode: value.postalCode || model.postalCode,
      latitude: value.latitude ?? model.latitude,
      longitude: value.longitude ?? model.longitude,
    }),
  };

  const postalCode: CascadeStep<string> = {
    field: 'postalCode',
    icon: 'hash',
    minLength: 0,
    mono: true,
    derived: [],
    search: async (text, model) => {
      if (!model.municipality.trim()) return [];
      const codes = await geo.postalCodes(model.municipality.trim(), { province: model.provinceCode.trim() || undefined, street: model.address.trim() || undefined }, 12);
      return codes.filter((code) => code.startsWith(text)).map((value) => ({ value, label: value }));
    },
    pick: (value) => ({ postalCode: value }),
  };

  const entity: CascadeStep<EntityCode> = {
    field: 'entityName',
    icon: 'building',
    placeholder: 'Archivio di Stato',
    minLength: 2,
    derived: ['entityBillingCode'],
    search: async (text, model) =>
      (
        await geo.entityCodes(text, {
          municipality: model.municipality.trim() || undefined,
          province: model.provinceCode.trim() || undefined,
        }, 6)
      ).map((value) => ({
        value,
        label: value.name,
        detail: [value.category, value.municipality].filter(Boolean).join(' · ') || undefined,
        badge: value.billingCode,
      })),
    pick: (value) => ({ entityName: value.name, entityBillingCode: value.billingCode ?? '' }),
  };

  return new Map<SurveyKey, CascadeStep>(
    [region, province, municipality, address, postalCode, entity].map((step) => [step.field, step as CascadeStep]),
  );
}

/** Whether a step of the cascade counts as answered, including the codes a choice fills in. */
export function isAnswered(field: string, model: SurveyModel): boolean {
  const filled = (key: SurveyKey) => String(model[key] ?? '').trim().length > 0;
  switch (field) {
    case 'provinceName':
      return filled('provinceName') && filled('provinceCode');
    case 'municipality':
      return filled('municipality') && filled('istatCode');
    default:
      return field in model && filled(field as SurveyKey);
  }
}

export function sameText(a: string | null | undefined, b: string | null | undefined): boolean {
  return fold(a) === fold(b);
}
