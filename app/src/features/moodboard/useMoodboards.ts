// app/src/features/moodboard/useMoodboards.ts
import { useCallback, useEffect, useState } from 'react';
import { supabase, isAnonymousSession } from '../../lib/supabaseClient';
import type { Moodboard, Place } from '../../lib/types';

interface FavoriteWithPlaceRow {
  place_id: number;
  places: {
    id: number;
    name: string;
    description: string | null;
    lat: number;
    lng: number;
    tags: string[];
    photo_url: string | null;
    source: 'curated' | 'user';
    created_by: string | null;
    created_at: string;
  };
}

interface MoodboardRow {
  id: number;
  user_id: string;
  title: string | null;
  place_ids: number[];
  created_at: string;
}

export function useMoodboards() {
  const [favoritePlaces, setFavoritePlaces] = useState<Place[]>([]);
  const [moodboards, setMoodboards] = useState<Moodboard[]>([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session || isAnonymousSession(session)) {
      setIsRegistered(false);
      setFavoritePlaces([]);
      setMoodboards([]);
      setError(null);
      return;
    }
    setIsRegistered(true);
    setError(null);

    const { data: favoriteRows, error: favoritesError } = await supabase
      .from('favorites')
      .select('place_id, places(*)')
      .eq('user_id', session.user.id);
    if (favoritesError) {
      setError('Не удалось загрузить избранное.');
      return;
    }
    const rows = (favoriteRows ?? []) as unknown as FavoriteWithPlaceRow[];
    setFavoritePlaces(
      rows.map((row) => ({
        id: row.places.id,
        name: row.places.name,
        description: row.places.description,
        lat: row.places.lat,
        lng: row.places.lng,
        tags: row.places.tags,
        photoUrl: row.places.photo_url,
        source: row.places.source,
        createdBy: row.places.created_by,
        createdAt: row.places.created_at,
      })),
    );

    const { data: moodboardRows, error: moodboardsError } = await supabase
      .from('moodboards')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    if (moodboardsError) {
      setError('Не удалось загрузить мудборды.');
      return;
    }
    setMoodboards(
      ((moodboardRows ?? []) as MoodboardRow[]).map((row) => ({
        id: row.id,
        userId: row.user_id,
        title: row.title,
        placeIds: row.place_ids,
        createdAt: row.created_at,
      })),
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveMoodboard(placeIds: number[], title?: string) {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session || isAnonymousSession(session)) return;
    const { error: insertError } = await supabase.from('moodboards').insert({
      user_id: session.user.id,
      title: title ?? null,
      place_ids: placeIds,
    });
    if (insertError) {
      setError('Не удалось сохранить мудборд.');
      return;
    }
    await load();
  }

  return { isRegistered, favoritePlaces, moodboards, saveMoodboard, error };
}
