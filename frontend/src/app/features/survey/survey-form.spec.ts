import { Registration } from '../../core/api/registry.models';
import { EMPTY_SURVEY, fromRegistration, isBlank, roundCoordinate, sameModel, toRequest } from './survey-form';

describe('survey form', () => {
  const model = {
    ...EMPTY_SURVEY,
    region: ' Lombardia ',
    provinceName: 'Varese',
    provinceCode: 'va',
    municipality: 'Varese',
    istatCode: '012133',
    cadastralCode: 'l682',
    address: 'Via Sacco',
    houseNumber: '',
    assetName: 'Palazzo Estense',
    latitude: 45.817_283_456_1,
    longitude: 8.826_540_123_9,
  };

  it('rounds coordinates to a centimetre', () => {
    expect(roundCoordinate(45.123_456_789)).toBe(45.123_456_8);
  });

  it('sends trimmed text, upper-case codes, and nothing for empty optional fields', () => {
    const request = toRequest(model);
    expect(request.region).toBe('Lombardia');
    expect(request.provinceCode).toBe('VA');
    expect(request.cadastralCode).toBe('L682');
    expect(request.houseNumber).toBeUndefined();
    expect(request.latitude).toBe(45.817_283_5);
    expect(request.longitude).toBe(8.826_540_1);
  });

  it('loads a saved registration back into the same shape', () => {
    const registration = { ...toRequest(model), id: 'r1', status: 'DRAFT', latitude: 45.8, longitude: 8.8 } as unknown as Registration;
    const loaded = fromRegistration(registration);
    expect(loaded.assetName).toBe('Palazzo Estense');
    expect(loaded.houseNumber).toBe('');
    expect(loaded.latitude).toBe(45.8);
  });

  it('knows when nothing has been entered', () => {
    expect(isBlank({ ...EMPTY_SURVEY })).toBe(true);
    expect(isBlank(model)).toBe(false);
    expect(sameModel(model, { ...model })).toBe(true);
  });
});
