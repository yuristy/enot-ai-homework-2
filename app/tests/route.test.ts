// app/tests/route.test.ts
import { describe, expect, it } from 'vitest';
import {
  buildRoute,
  buildRouteUrl,
  estimateRoute,
  haversineDistanceKm,
  parseRouteFromUrl,
} from '../src/lib/route';

describe('haversineDistanceKm', () => {
  it('returns 0 for identical points', () => {
    expect(haversineDistanceKm({ lat: 55.75, lng: 37.61 }, { lat: 55.75, lng: 37.61 })).toBe(0);
  });

  it('matches a known distance within 1% (Red Square to Vorobyovy Gory, ~6.3km straight-line)', () => {
    const distance = haversineDistanceKm({ lat: 55.7539, lng: 37.6208 }, { lat: 55.7104, lng: 37.5566 });
    expect(distance).toBeGreaterThan(6.2);
    expect(distance).toBeLessThan(6.4);
  });
});

describe('buildRoute', () => {
  it('orders points by nearest-neighbor from the start', () => {
    const start = { lat: 0, lng: 0 };
    const points = [
      { id: 3, lat: 0, lng: 3 },
      { id: 1, lat: 0, lng: 1 },
      { id: 2, lat: 0, lng: 2 },
    ];
    const result = buildRoute(start, points);
    expect(result.orderedIds).toEqual([1, 2, 3]);
  });

  it('returns an empty route for no points', () => {
    const result = buildRoute({ lat: 0, lng: 0 }, []);
    expect(result.orderedIds).toEqual([]);
    expect(result.totalDistanceKm).toBe(0);
  });

  it('is deterministic for the same input', () => {
    const start = { lat: 55.75, lng: 37.61 };
    const points = [
      { id: 1, lat: 55.76, lng: 37.62 },
      { id: 2, lat: 55.74, lng: 37.60 },
    ];
    expect(buildRoute(start, points)).toEqual(buildRoute(start, points));
  });
});

describe('estimateRoute', () => {
  it('classifies as easy under 2km and 4 or fewer stops', () => {
    const result = estimateRoute(1.5, 3);
    expect(result.difficulty).toBe('easy');
  });

  it('classifies as medium up to 5km and 7 stops', () => {
    const result = estimateRoute(4.5, 6);
    expect(result.difficulty).toBe('medium');
  });

  it('classifies as hard beyond the medium thresholds', () => {
    const result = estimateRoute(6, 8);
    expect(result.difficulty).toBe('hard');
  });

  it('computes minutes as walking time plus 15 min per stop, rounded to 5', () => {
    // 4.5km at 4.5km/h = 60 minutes walking + 3 stops * 15 = 105 minutes
    const result = estimateRoute(4.5, 3);
    expect(result.minutes).toBe(105);
  });
});

describe('buildRouteUrl / parseRouteFromUrl round-trip', () => {
  it('parses back exactly what was built', () => {
    const url = buildRouteUrl(55.75, 37.61, [3, 1, 2]);
    const search = url.startsWith('?') ? url : `?${url.split('?')[1]}`;
    const parsed = parseRouteFromUrl(search);
    expect(parsed).toEqual({ start: { lat: 55.75, lng: 37.61 }, placeIds: [3, 1, 2] });
  });

  it('returns null for a URL with no route params', () => {
    expect(parseRouteFromUrl('')).toBeNull();
  });

  it.each([
    '?start=Infinity,37.61&places=1',
    '?start=55.75,-Infinity&places=1',
    '?start=91,37.61&places=1',
    '?start=55.75,181&places=1',
    '?start=55.75,37.61,10&places=1',
  ])('returns null for an invalid start: %s', (search) => {
    expect(parseRouteFromUrl(search)).toBeNull();
  });

  it.each([
    '?start=55.75,37.61&places=0',
    '?start=55.75,37.61&places=-1',
    '?start=55.75,37.61&places=1.5',
    '?start=55.75,37.61&places=1,1',
    '?start=55.75,37.61&places=1,,2',
  ])('returns null for invalid place ids: %s', (search) => {
    expect(parseRouteFromUrl(search)).toBeNull();
  });

  it('accepts coordinate boundaries and safe positive integer ids', () => {
    expect(parseRouteFromUrl('?start=-90,180&places=1,2')).toEqual({
      start: { lat: -90, lng: 180 },
      placeIds: [1, 2],
    });
  });

  it('returns null when the URL contains more than 15 places', () => {
    const placeIds = Array.from({ length: 16 }, (_, index) => index + 1).join(',');
    expect(parseRouteFromUrl(`?start=55.75,37.61&places=${placeIds}`)).toBeNull();
  });
});
