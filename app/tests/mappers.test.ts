import { describe, expect, it } from 'vitest';
import {
  rowToFavorite,
  rowToMoodboard,
  rowToPlace,
  rowToProfile,
  rowToRequest,
  rowToRoute,
} from '../src/lib/mappers';

describe('rowToPlace', () => {
  it('maps a places row to a Place', () => {
    expect(
      rowToPlace({
        id: 7,
        name: 'Патриаршие пруды',
        description: 'Тихий пруд в центре',
        lat: 55.7626,
        lng: 37.5924,
        tags: ['парки'],
        photo_url: null,
        source: 'curated',
        created_by: null,
        created_at: '2026-08-27T10:00:00Z',
      }),
    ).toEqual({
      id: 7,
      name: 'Патриаршие пруды',
      description: 'Тихий пруд в центре',
      lat: 55.7626,
      lng: 37.5924,
      tags: ['парки'],
      photoUrl: null,
      source: 'curated',
      createdBy: null,
      createdAt: '2026-08-27T10:00:00Z',
    });
  });
});

describe('rowToProfile', () => {
  it('maps a profiles row to a Profile', () => {
    expect(
      rowToProfile({
        id: 'e1a0d2a4-0000-4000-8000-000000000001',
        role: 'photographer',
        display_name: 'Аня',
        created_at: '2026-08-27T10:01:00Z',
      }),
    ).toEqual({
      id: 'e1a0d2a4-0000-4000-8000-000000000001',
      role: 'photographer',
      displayName: 'Аня',
      createdAt: '2026-08-27T10:01:00Z',
    });
  });
});

describe('rowToFavorite', () => {
  it('maps a favorites row to a Favorite', () => {
    expect(
      rowToFavorite({
        user_id: 'e1a0d2a4-0000-4000-8000-000000000001',
        place_id: 7,
        created_at: '2026-08-27T10:02:00Z',
      }),
    ).toEqual({
      userId: 'e1a0d2a4-0000-4000-8000-000000000001',
      placeId: 7,
      createdAt: '2026-08-27T10:02:00Z',
    });
  });
});

describe('rowToRequest', () => {
  it('maps a requests row to a PhotoRequest', () => {
    expect(
      rowToRequest({
        id: 3,
        request_type: 'seeking_photographer',
        place_id: 7,
        wanted_date: '2026-09-01',
        comment: 'Ищу фотографа на закат, tg: @someone',
        author_id: 'e1a0d2a4-0000-4000-8000-000000000002',
        created_at: '2026-08-27T10:03:00Z',
      }),
    ).toEqual({
      id: 3,
      requestType: 'seeking_photographer',
      placeId: 7,
      wantedDate: '2026-09-01',
      comment: 'Ищу фотографа на закат, tg: @someone',
      authorId: 'e1a0d2a4-0000-4000-8000-000000000002',
      createdAt: '2026-08-27T10:03:00Z',
    });
  });
});

describe('rowToRoute', () => {
  it('maps a routes row to a SavedRoute', () => {
    expect(
      rowToRoute({
        id: 12,
        user_id: 'e1a0d2a4-0000-4000-8000-000000000003',
        title: 'Прогулка по центру',
        start_lat: 55.7539,
        start_lng: 37.6208,
        place_ids: [7, 4, 1],
        created_at: '2026-08-27T10:04:00Z',
      }),
    ).toEqual({
      id: 12,
      userId: 'e1a0d2a4-0000-4000-8000-000000000003',
      title: 'Прогулка по центру',
      startLat: 55.7539,
      startLng: 37.6208,
      placeIds: [7, 4, 1],
      createdAt: '2026-08-27T10:04:00Z',
    });
  });
});

describe('rowToMoodboard', () => {
  it('maps a moodboards row to a Moodboard', () => {
    expect(
      rowToMoodboard({
        id: 5,
        user_id: 'e1a0d2a4-0000-4000-8000-000000000004',
        title: null,
        place_ids: [2, 9],
        created_at: '2026-08-27T10:05:00Z',
      }),
    ).toEqual({
      id: 5,
      userId: 'e1a0d2a4-0000-4000-8000-000000000004',
      title: null,
      placeIds: [2, 9],
      createdAt: '2026-08-27T10:05:00Z',
    });
  });
});
