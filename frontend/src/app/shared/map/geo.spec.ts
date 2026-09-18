import { distance, formatDistance, formatPosition, parsePosition, regionView, toPosition } from './geo';

describe('geo', () => {
  it('reads coordinates pasted from any map', () => {
    expect(parsePosition('45.4642, 9.1900')).toEqual({ lat: 45.4642, lng: 9.19 });
    expect(parsePosition('45,4642; 9,19')).toEqual({ lat: 45.4642, lng: 9.19 });
    expect(parsePosition(' -33.86 151.21 ')).toEqual({ lat: -33.86, lng: 151.21 });
    expect(parsePosition('Via Roma 12')).toBeNull();
    expect(parsePosition('95, 10')).toBeNull();
  });

  it('refuses positions outside the globe', () => {
    expect(toPosition(91, 0)).toBeNull();
    expect(toPosition(45, null)).toBeNull();
    expect(toPosition(45.1, 9.2)).toEqual({ lat: 45.1, lng: 9.2 });
  });

  it('measures and writes distances the way people say them', () => {
    const milan = { lat: 45.4642, lng: 9.19 };
    const rome = { lat: 41.9028, lng: 12.4964 };
    expect(distance(milan, rome) / 1000).toBeCloseTo(477, 0);
    expect(formatDistance(0.4)).toBe('here');
    expect(formatDistance(250)).toBe('250 m');
    expect(formatDistance(4_200)).toBe('4.2 km');
    expect(formatPosition(milan, 2)).toBe('45.46, 9.19');
  });

  it('finds a region whatever accents, spacing or bilingual suffix it is written with', () => {
    expect(regionView('Valle d’Aosta')).not.toBeNull();
    expect(regionView('Trentino-Alto Adige/Südtirol')).toEqual(regionView('trentino alto adige'));
    expect(regionView('Atlantis')).toBeNull();
  });
});
