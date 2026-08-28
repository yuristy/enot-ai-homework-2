import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from './useAuth';
import { rowToPlace, type PlaceRow } from '../../lib/mappers';
import type { Place } from '../../lib/types';

// Shape of the PostgREST embed (`favorites?select=place_id,places(*)`), not
// itself one of lib/mappers.ts's exports — but `places` is typed from there.
interface FavoriteWithPlaceRow {
  place_id: number;
  places: PlaceRow;
}

export function useFavorites() {
  const { session, isAnonymous } = useAuth();
  const [favorites, setFavorites] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    if (!session || isAnonymous) {
      setFavorites([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('favorites')
      .select('place_id, places(*)')
      .eq('user_id', session.user.id);
    const rows = (data ?? []) as unknown as FavoriteWithPlaceRow[];
    setFavorites(rows.map((row) => rowToPlace(row.places)));
    setLoading(false);
  }, [session, isAnonymous]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  function isFavorite(placeId: number) {
    return favorites.some((f) => f.id === placeId);
  }

  async function toggle(placeId: number) {
    if (!session || isAnonymous) return;
    if (isFavorite(placeId)) {
      await supabase.from('favorites').delete().eq('user_id', session.user.id).eq('place_id', placeId);
    } else {
      await supabase.from('favorites').insert({ user_id: session.user.id, place_id: placeId });
    }
    await fetchFavorites();
  }

  return { favorites, loading, toggle, isFavorite };
}
