import { describe, expect, it } from 'vitest';
import { findNearbyDuplicates } from '../src/lib/places';

describe('findNearbyDuplicates', () => {
  const existing = [
    { id: 1, name: 'Патриаршие пруды', lat: 55.7626, lng: 37.5924 },
    { id: 2, name: 'Парк Зарядье', lat: 55.7500, lng: 37.6294 },
  ];

  it('finds a place within the default 100m radius', () => {
    // ~30m north of place 1
    const result = findNearbyDuplicates({ lat: 55.76287, lng: 37.5924 }, existing);
    expect(result.map((p) => p.id)).toEqual([1]);
  });

  it('returns an empty array when nothing is within range', () => {
    const result = findNearbyDuplicates({ lat: 55.9, lng: 37.9 }, existing);
    expect(result).toEqual([]);
  });

  it('respects a custom radius', () => {
    // ~500m from place 2
    const result = findNearbyDuplicates({ lat: 55.754, lng: 37.6294 }, existing, 600);
    expect(result.map((p) => p.id)).toEqual([2]);
  });
});
