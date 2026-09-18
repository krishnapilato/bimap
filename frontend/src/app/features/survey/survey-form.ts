import { Signal } from '@angular/core';
import { SchemaPath, SchemaPathTree, maxLength, pattern, readonly, required, validate } from '@angular/forms/signals';

import { FormField, FormSchema, Registration, RegistrationRequest } from '../../core/api/registry.models';

/** Everything the survey form edits, as the inputs hold it. */
export interface SurveyModel {
  region: string;
  provinceName: string;
  provinceCode: string;
  municipality: string;
  istatCode: string;
  cadastralCode: string;
  address: string;
  houseNumber: string;
  postalCode: string;
  locality: string;
  latitude: number | null;
  longitude: number | null;
  assetName: string;
  assetReference: string;
  entityName: string;
  entityBillingCode: string;
  ownership: string;
  protectionMeasure: string;
  constraintType: string;
  cadastralReference: string;
  transcription: string;
  notes: string;
}

export type SurveyKey = keyof SurveyModel;
export type SurveyTextKey = Exclude<SurveyKey, 'latitude' | 'longitude'>;

export const EMPTY_SURVEY: SurveyModel = {
  region: '',
  provinceName: '',
  provinceCode: '',
  municipality: '',
  istatCode: '',
  cadastralCode: '',
  address: '',
  houseNumber: '',
  postalCode: '',
  locality: '',
  latitude: null,
  longitude: null,
  assetName: '',
  assetReference: '',
  entityName: '',
  entityBillingCode: '',
  ownership: '',
  protectionMeasure: '',
  constraintType: '',
  cadastralReference: '',
  transcription: '',
  notes: '',
};

export const TEXT_FIELDS = (Object.keys(EMPTY_SURVEY) as SurveyKey[]).filter(
  (key): key is SurveyTextKey => key !== 'latitude' && key !== 'longitude',
);

/** Every field in the schema, by name. */
export function fieldsOf(schema: FormSchema | undefined): ReadonlyMap<string, FormField> {
  return new Map((schema?.sections ?? []).flatMap((section) => section.fields).map((field) => [field.name, field]));
}

/**
 * The rules come from the server's form schema rather than being repeated here: required, length
 * and pattern for every field it describes. The rest are the client's own, because they are about
 * how the form is filled rather than what the server accepts. `locked` makes every field read-only,
 * for a registration that has moved past the point where its author may change it.
 */
export function surveyRules(fields: Signal<ReadonlyMap<string, FormField>>, locked: () => boolean) {
  return (path: SchemaPathTree<SurveyModel>) => {
    readonly(path, locked);

    for (const name of TEXT_FIELDS) {
      const at = path[name] as SchemaPath<string>;
      required(at, { when: () => fields().get(name)?.required ?? false });
      maxLength(at, () => fields().get(name)?.maxLength);
      pattern(at, () => {
        const source = fields().get(name)?.pattern;
        return source ? new RegExp(`^(?:${source})$`) : undefined;
      });
    }

    validate(path.provinceName, ({ value, valueOf }) =>
      value().trim() && !valueOf(path.provinceCode).trim()
        ? { kind: 'unresolved', message: 'Choose the province from the suggestions, so its code is filled in.' }
        : null,
    );

    validate(path.municipality, ({ value, valueOf }) =>
      value().trim() && !valueOf(path.istatCode).trim()
        ? { kind: 'unresolved', message: 'Choose the municipality from the suggestions, so its ISTAT code is filled in.' }
        : null,
    );

    validate(path.latitude, ({ value, valueOf }) => {
      const latitude = value();
      if ((latitude === null) !== (valueOf(path.longitude) === null)) return { kind: 'pair', message: 'Give both coordinates, or neither.' };
      if (latitude !== null && Math.abs(latitude) > 90) return { kind: 'range', message: 'Latitude runs from -90 to 90.' };
      return null;
    });

    validate(path.longitude, ({ value }) => {
      const longitude = value();
      return longitude !== null && Math.abs(longitude) > 180 ? { kind: 'range', message: 'Longitude runs from -180 to 180.' } : null;
    });
  };
}

/** Seven decimals is about a centimetre: more than a façade needs, and what the column stores. */
export function roundCoordinate(value: number): number {
  return Math.round(value * 1e7) / 1e7;
}

export function toRequest(model: SurveyModel): RegistrationRequest {
  const text = (value: string) => value.trim();
  const optional = (value: string) => value.trim() || undefined;
  return {
    region: text(model.region),
    provinceName: text(model.provinceName),
    provinceCode: text(model.provinceCode).toUpperCase(),
    municipality: text(model.municipality),
    istatCode: text(model.istatCode),
    cadastralCode: optional(model.cadastralCode)?.toUpperCase(),
    postalCode: optional(model.postalCode),
    address: text(model.address),
    houseNumber: optional(model.houseNumber),
    locality: optional(model.locality),
    latitude: model.latitude === null ? undefined : roundCoordinate(model.latitude),
    longitude: model.longitude === null ? undefined : roundCoordinate(model.longitude),
    assetName: text(model.assetName),
    assetReference: optional(model.assetReference),
    entityName: optional(model.entityName),
    entityBillingCode: optional(model.entityBillingCode),
    ownership: optional(model.ownership),
    protectionMeasure: optional(model.protectionMeasure),
    constraintType: optional(model.constraintType),
    cadastralReference: optional(model.cadastralReference),
    transcription: optional(model.transcription),
    notes: optional(model.notes),
  };
}

export function fromRegistration(registration: Registration): SurveyModel {
  const model = { ...EMPTY_SURVEY };
  for (const key of TEXT_FIELDS) model[key] = String(registration[key] ?? '');
  model.latitude = typeof registration.latitude === 'number' ? registration.latitude : null;
  model.longitude = typeof registration.longitude === 'number' ? registration.longitude : null;
  return model;
}

export function sameModel(a: SurveyModel, b: SurveyModel): boolean {
  return (Object.keys(EMPTY_SURVEY) as SurveyKey[]).every((key) => (a[key] ?? '') === (b[key] ?? ''));
}

export function isBlank(model: SurveyModel): boolean {
  return sameModel(model, EMPTY_SURVEY);
}
