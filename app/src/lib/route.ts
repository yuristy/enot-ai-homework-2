// app/src/lib/route.ts

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RoutePoint extends LatLng {
  id: number;
}

export type RouteDifficulty = 'easy' | 'medium' | 'hard';

const EARTH_RADIUS_KM = 6371;
const WALKING_SPEED_KMH = 4.5;
const MINUTES_PER_STOP = 15;

export function haversineDistanceKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_KM * c;
}

export function buildRoute(
  start: LatLng,
  points: RoutePoint[],
): { orderedIds: number[]; totalDistanceKm: number } {
  const remaining = [...points];
  const orderedIds: number[] = [];
  let current: LatLng = start;
  let totalDistanceKm = 0;

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = haversineDistanceKm(current, remaining[0]);
    for (let i = 1; i < remaining.length; i += 1) {
      const distance = haversineDistanceKm(current, remaining[i]);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }
    const next = remaining.splice(nearestIndex, 1)[0];
    orderedIds.push(next.id);
    totalDistanceKm += nearestDistance;
    current = next;
  }

  return { orderedIds, totalDistanceKm };
}

function roundToNearest(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export function estimateRoute(
  totalDistanceKm: number,
  stopCount: number,
): { minutes: number; difficulty: RouteDifficulty } {
  const walkingMinutes = (totalDistanceKm / WALKING_SPEED_KMH) * 60;
  const minutes = roundToNearest(walkingMinutes + stopCount * MINUTES_PER_STOP, 5);

  let difficulty: RouteDifficulty;
  if (totalDistanceKm < 2 && stopCount <= 4) {
    difficulty = 'easy';
  } else if (totalDistanceKm <= 5 && stopCount <= 7) {
    difficulty = 'medium';
  } else {
    difficulty = 'hard';
  }

  return { minutes, difficulty };
}

export function buildRouteUrl(startLat: number, startLng: number, placeIds: number[]): string {
  const params = new URLSearchParams({
    start: `${startLat},${startLng}`,
    places: placeIds.join(','),
  });
  return `?${params.toString()}`;
}

export function parseRouteFromUrl(
  search: string,
): { start: LatLng; placeIds: number[] } | null {
  const params = new URLSearchParams(search);
  const startParam = params.get('start');
  const placesParam = params.get('places');
  if (!startParam || !placesParam) {
    return null;
  }
  const [latStr, lngStr] = startParam.split(',');
  const lat = Number(latStr);
  const lng = Number(lngStr);
  const placeIds = placesParam
    .split(',')
    .filter((s) => s.length > 0)
    .map(Number);
  if (Number.isNaN(lat) || Number.isNaN(lng) || placeIds.some(Number.isNaN)) {
    return null;
  }
  return { start: { lat, lng }, placeIds };
}
