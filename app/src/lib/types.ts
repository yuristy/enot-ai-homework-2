// app/src/lib/types.ts

export type PlaceSource = 'curated' | 'user';

export interface Place {
  id: number;
  name: string;
  description: string | null;
  lat: number;
  lng: number;
  tags: string[];
  photoUrl: string | null;
  source: PlaceSource;
  createdBy: string | null;
  createdAt: string;
}

export type ProfileRole = 'seeker' | 'photographer';

export interface Profile {
  id: string;
  role: ProfileRole | null;
  displayName: string | null;
  createdAt: string;
}

export interface Favorite {
  userId: string;
  placeId: number;
  createdAt: string;
}

export type RequestType = 'seeking_photographer' | 'offering_photography';

export interface PhotoRequest {
  id: number;
  requestType: RequestType;
  placeId: number | null;
  wantedDate: string | null;
  comment: string | null;
  authorId: string;
  createdAt: string;
}

export interface SavedRoute {
  id: number;
  userId: string;
  title: string | null;
  startLat: number;
  startLng: number;
  placeIds: number[];
  createdAt: string;
}

export interface Moodboard {
  id: number;
  userId: string;
  title: string | null;
  placeIds: number[];
  createdAt: string;
}
