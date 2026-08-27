import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from './useAuth';
import type { Place } from '../../lib/types';

interface FavoriteRow {
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
    const rows = (data ?? []) as unknown as FavoriteRow[];
    setFavorites(
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
