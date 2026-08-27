// app/src/lib/mappers.ts
//
// Единственное место, где snake_case-строки Postgres превращаются в camelCase-типы
// из `types.ts`. supabase-js отдаёт колонки как есть (`created_at`, `photo_url`, ...),
// а `types.ts` — camelCase, поэтому каждая фича иначе пишет свой маппер и они
// расходятся. Формы строк соответствуют колонкам в `app/supabase/schema.sql`.

import type {
  Favorite,
  Moodboard,
  PhotoRequest,
  Place,
  PlaceSource,
  Profile,
  ProfileRole,
  RequestType,
  SavedRoute,
} from './types';

export interface PlaceRow {
  id: number;
  name: string;
  description: string | null;
  lat: number;
  lng: number;
  tags: string[];
  photo_url: string | null;
  source: PlaceSource;
  created_by: string | null;
  created_at: string;
}

export interface ProfileRow {
  id: string;
  role: ProfileRole | null;
  display_name: string | null;
  created_at: string;
}

export interface FavoriteRow {
  user_id: string;
  place_id: number;
  created_at: string;
}

export interface RequestRow {
  id: number;
  request_type: RequestType;
  place_id: number | null;
  wanted_date: string | null;
  comment: string | null;
  author_id: string;
  created_at: string;
}

export interface RouteRow {
  id: number;
  user_id: string;
  title: string | null;
  start_lat: number;
  start_lng: number;
  place_ids: number[];
  created_at: string;
}

export interface MoodboardRow {
  id: number;
  user_id: string;
  title: string | null;
  place_ids: number[];
  created_at: string;
}

export function rowToPlace(row: PlaceRow): Place {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    lat: row.lat,
    lng: row.lng,
    tags: row.tags,
    photoUrl: row.photo_url,
    source: row.source,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export function rowToProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    role: row.role,
    displayName: row.display_name,
    createdAt: row.created_at,
  };
}

export function rowToFavorite(row: FavoriteRow): Favorite {
  return {
    userId: row.user_id,
    placeId: row.place_id,
    createdAt: row.created_at,
  };
}

export function rowToRequest(row: RequestRow): PhotoRequest {
  return {
    id: row.id,
    requestType: row.request_type,
    placeId: row.place_id,
    wantedDate: row.wanted_date,
    comment: row.comment,
    authorId: row.author_id,
    createdAt: row.created_at,
  };
}

export function rowToRoute(row: RouteRow): SavedRoute {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    startLat: row.start_lat,
    startLng: row.start_lng,
    placeIds: row.place_ids,
    createdAt: row.created_at,
  };
}

export function rowToMoodboard(row: MoodboardRow): Moodboard {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    placeIds: row.place_ids,
    createdAt: row.created_at,
  };
}
