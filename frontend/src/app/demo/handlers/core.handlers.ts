import {
  REGISTRATION_TRANSITIONS,
  Registration,
  RegistrationRequest,
  RegistrationStatus,
} from '../../core/api/registry.models';
import { FORM_SCHEMA, TABLE_SCHEMA } from '../seed/schemas.seed';
import {
  DemoProblem,
  DemoReply,
  DemoRequest,
  DemoRoutes,
  csvCell,
  fold,
  integer,
  now,
  paginate,
  requireAuthority,
  requireCaller,
  text,
  uuid,
} from '../demo-http';
import { DemoContext } from './demo-context';

const REQUIRED: Array<keyof RegistrationRequest> = ['region', 'provinceName', 'provinceCode', 'municipality', 'istatCode', 'address', 'assetName'];

/** `/api/v1/geo` and `/api/v1/registrations`, scoped by caller exactly as the business service scopes them. */
export function registerCoreHandlers(routes: DemoRoutes, context: DemoContext): void {
  const { db, geography } = context;

  const seesEverything = (request: DemoRequest) => request.caller?.permissions.includes('registration:read-all') ?? false;

  const readable = (request: DemoRequest, id: string): Registration => {
    const registration = db.state.registrations.find((r) => r.id === id);
    if (!registration || (!seesEverything(request) && registration.createdBy !== request.caller?.email)) {
      throw DemoProblem.notFound(`Registration ${id} was not found`);
    }
    return registration;
  };

  const validate = (body: Partial<RegistrationRequest>) => {
    for (const field of REQUIRED) {
      if (!String(body[field] ?? '').trim()) throw DemoProblem.invalid(field, 'must not be blank');
    }
    if (!/^[0-9]{6}$/.test(body.istatCode ?? '')) throw DemoProblem.invalid('istatCode', 'ISTAT code must be exactly six digits', body.istatCode);
    if (!/^[A-Za-z]{2}$/.test(body.provinceCode ?? '')) throw DemoProblem.invalid('provinceCode', 'Province code must be two letters', body.provinceCode);
    if (body.cadastralCode && !/^[A-Z][0-9]{3}$/i.test(body.cadastralCode)) throw DemoProblem.invalid('cadastralCode', 'Cadastral code must be a letter followed by three digits', body.cadastralCode);
    if (body.postalCode && !/^[0-9]{5}$/.test(body.postalCode)) throw DemoProblem.invalid('postalCode', 'Postal code must be five digits', body.postalCode);
  };

  const apply = (target: Registration, body: RegistrationRequest) => {
    Object.assign(target, {
      ...body,
      provinceCode: body.provinceCode.toUpperCase(),
      cadastralCode: body.cadastralCode?.toUpperCase() || undefined,
      fullAddress: body.houseNumber ? `${body.address} ${body.houseNumber}` : body.address,
      updatedAt: now(),
    });
  };

  const filtered = (request: DemoRequest): Registration[] => {
    const term = fold(text(request, 'q'));
    const region = text(request, 'region');
    const province = text(request, 'provinceCode');
    const istat = text(request, 'istatCode');
    const status = text(request, 'status');
    const from = text(request, 'from');
    const to = text(request, 'to');
    const everything = seesEverything(request);

    return db.state.registrations.filter(
      (r) =>
        (everything || r.createdBy === request.caller?.email) &&
        (!term || fold([r.assetName, r.address, r.municipality, r.entityName, r.assetReference, r.istatCode].join(' ')).includes(term)) &&
        (!region || fold(r.region) === fold(region)) &&
        (!province || r.provinceCode.toUpperCase() === province.toUpperCase()) &&
        (!istat || r.istatCode === istat) &&
        (!status || r.status === status) &&
        (!from || r.createdAt >= from) &&
        (!to || r.createdAt <= to),
    );
  };

  routes
    // ── Geography ────────────────────────────────────────────────────────────
    .get('core', '/api/v1/geo/regions', (request) => {
      requireCaller(request);
      return geography.regions(text(request, 'q') ?? '', integer(request, 'limit', 5));
    })
    .get('core', '/api/v1/geo/provinces', (request) => {
      requireCaller(request);
      return geography.provinces(text(request, 'q') ?? '', text(request, 'region'), integer(request, 'limit', 5));
    })
    .get('core', '/api/v1/geo/municipalities', (request) => {
      requireCaller(request);
      return geography.municipalities(text(request, 'q') ?? '', text(request, 'region'), text(request, 'province'), integer(request, 'limit', 5));
    })
    .get('core', '/api/v1/geo/municipalities/:istatCode', async (request) => {
      requireCaller(request);
      const found = await geography.municipality(request.params['istatCode']);
      if (!found) throw DemoProblem.notFound(`Municipality with ISTAT code ${request.params['istatCode']} was not found`);
      return found;
    })
    .get('core', '/api/v1/geo/addresses', (request) => {
      requireCaller(request);
      const street = text(request, 'street');
      const q = text(request, 'q');
      if (!street && !q) throw DemoProblem.rule('Supply either a street, or a free-text q.');
      return geography.addresses(street, text(request, 'municipality'), q, integer(request, 'limit', 5));
    })
    .get('core', '/api/v1/geo/postal-codes', (request) => {
      requireCaller(request);
      const municipality = text(request, 'municipality');
      if (!municipality) throw DemoProblem.invalid('municipality', 'Required parameter "municipality" is missing');
      return geography.postalCodes(municipality, integer(request, 'limit', 5));
    })
    .get('core', '/api/v1/geo/entity-codes', (request) => {
      requireCaller(request);
      const q = text(request, 'q');
      if (!q) throw DemoProblem.invalid('q', 'Required parameter "q" is missing');
      return geography.entityCodes(q, text(request, 'municipality'), text(request, 'province'), text(request, 'region'), integer(request, 'limit', 5));
    })

    // ── Registrations ────────────────────────────────────────────────────────
    .get('core', '/api/v1/registrations/schema/form', (request) => {
      requireCaller(request);
      return FORM_SCHEMA;
    })
    .get('core', '/api/v1/registrations/schema/table', (request) => {
      requireCaller(request);
      return TABLE_SCHEMA;
    })
    .get('core', '/api/v1/registrations/statistics', (request) => {
      requireAuthority(request, 'registration:read-all');
      const all = db.state.registrations;
      const byStatus: Record<string, number> = {};
      const byRegion: Record<string, number> = {};
      for (const r of all) {
        byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
        byRegion[r.region] = (byRegion[r.region] ?? 0) + 1;
      }
      const topRegions = Object.fromEntries(Object.entries(byRegion).sort((a, b) => b[1] - a[1]).slice(0, 5));
      return { total: all.length, byStatus, topRegions };
    })
    .get('core', '/api/v1/registrations/export', (request) => {
      requireAuthority(request, 'registration:export');
      const header = ['id', 'region', 'province', 'province_code', 'municipality', 'istat_code', 'cadastral_code', 'postal_code', 'address', 'house_number', 'locality', 'latitude', 'longitude', 'asset_name', 'asset_reference', 'entity_name', 'entity_billing_code', 'ownership', 'protection_measure', 'constraint_type', 'cadastral_reference', 'transcription', 'notes', 'status', 'surveyor', 'recorded_at'];
      const rows = filtered(request)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((r) => [r.id, r.region, r.provinceName, r.provinceCode, r.municipality, r.istatCode, r.cadastralCode, r.postalCode, r.address, r.houseNumber, r.locality, r.latitude, r.longitude, r.assetName, r.assetReference, r.entityName, r.entityBillingCode, r.ownership, r.protectionMeasure, r.constraintType, r.cadastralReference, r.transcription, r.notes, r.status, r.createdBy, r.createdAt].map(csvCell).join(','));
      return DemoReply.csv([header.map(csvCell).join(','), ...rows].join('\n'), `bimap-registrations-${now().slice(0, 10)}.csv`);
    })
    .get('core', '/api/v1/registrations', (request) => {
      requireAuthority(request, 'registration:read');
      return paginate(filtered(request), request, { size: 25, sort: 'createdAt,desc' });
    })
    .get('core', '/api/v1/registrations/:id', (request) => {
      requireAuthority(request, 'registration:read');
      return readable(request, request.params['id']);
    })
    .post('core', '/api/v1/registrations', (request) => {
      const caller = requireAuthority(request, 'registration:write');
      const body = request.body as RegistrationRequest;
      validate(body);
      const duplicate = db.state.registrations.some(
        (r) =>
          r.istatCode === body.istatCode &&
          fold(r.address) === fold(body.address) &&
          fold(r.houseNumber) === fold(body.houseNumber) &&
          fold(r.assetName) === fold(body.assetName),
      );
      if (duplicate) throw DemoProblem.conflict('That asset is already registered at this address.');

      const timestamp = now();
      const registration = { id: uuid(), status: 'DRAFT', createdBy: caller.email, createdAt: timestamp } as Registration;
      apply(registration, body);
      db.state.registrations.unshift(registration);
      db.touch();
      return DemoReply.created(registration);
    })
    .put('core', '/api/v1/registrations/:id', (request) => {
      requireAuthority(request, 'registration:write');
      const registration = readable(request, request.params['id']);
      if (!seesEverything(request) && registration.status !== 'DRAFT' && registration.status !== 'REJECTED') {
        throw DemoProblem.rule('A registration can only be edited while it is a draft or rejected.');
      }
      validate(request.body);
      apply(registration, request.body);
      db.touch();
      return registration;
    })
    .put('core', '/api/v1/registrations/:id/status', (request) => {
      const caller = requireAuthority(request, 'registration:write');
      const registration = readable(request, request.params['id']);
      const target = request.body?.status as RegistrationStatus;
      if (!REGISTRATION_TRANSITIONS[registration.status].includes(target)) {
        throw DemoProblem.rule(`A registration cannot move from ${registration.status} to ${target}.`);
      }
      if ((target === 'VERIFIED' || target === 'REJECTED') && !seesEverything(request)) throw DemoProblem.forbidden();

      const timestamp = now();
      registration.status = target;
      registration.reviewNote = request.body?.note || undefined;
      if (target === 'SUBMITTED') registration.submittedAt = timestamp;
      if (target === 'VERIFIED' || target === 'REJECTED') {
        registration.reviewedAt = timestamp;
        registration.reviewedBy = caller.email;
      }
      if (target === 'DRAFT') {
        registration.submittedAt = undefined;
        registration.reviewedAt = undefined;
        registration.reviewedBy = undefined;
      }
      registration.updatedAt = timestamp;
      db.touch();
      return registration;
    })
    .delete('core', '/api/v1/registrations/:id', (request) => {
      requireAuthority(request, 'registration:write');
      const registration = readable(request, request.params['id']);
      if (registration.status !== 'DRAFT' && !seesEverything(request)) {
        throw DemoProblem.rule('Only a draft can be deleted. Archive it instead.');
      }
      db.state.registrations = db.state.registrations.filter((r) => r.id !== registration.id);
      db.touch();
      return DemoReply.noContent();
    });
}
