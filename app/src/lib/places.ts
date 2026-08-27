import { haversineDistanceKm, type LatLng } from './route';

export interface ExistingPlaceLike extends LatLng {
  id: number;
  name: string;
}

export function findNearbyDuplicates<T extends ExistingPlaceLike>(
  newPoint: LatLng,
  existing: T[],
  radiusMeters = 100,
): T[] {
  const radiusKm = radiusMeters / 1000;
  return existing.filter((place) => haversineDistanceKm(newPoint, place) <= radiusKm);
}
