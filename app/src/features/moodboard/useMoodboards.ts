// app/src/features/moodboard/useMoodboards.ts
import { useCallback, useEffect, useState } from 'react';
import { supabase, isAnonymousSession } from '../../lib/supabaseClient';
import { rowToMoodboard, rowToPlace, type MoodboardRow, type PlaceRow } from '../../lib/mappers';
import type { Moodboard, Place } from '../../lib/types';

interface FavoriteWithPlaceRow {
  place_id: number;
  places: PlaceRow;
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
    setFavoritePlaces(rows.map((row) => rowToPlace(row.places)));

    const { data: moodboardRows, error: moodboardsError } = await supabase
      .from('moodboards')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    if (moodboardsError) {
      setError('Не удалось загрузить мудборды.');
      return;
    }
    setMoodboards(((moodboardRows ?? []) as MoodboardRow[]).map(rowToMoodboard));
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
