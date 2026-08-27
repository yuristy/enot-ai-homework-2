import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from './useAuth';
import type { SavedRoute } from '../../lib/types';

interface RouteRow {
  id: number;
  user_id: string;
  title: string | null;
  start_lat: number;
  start_lng: number;
  place_ids: number[];
  created_at: string;
}

function toSavedRoute(row: RouteRow): SavedRoute {
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

export function useMyRoutes() {
  const { session, isAnonymous } = useAuth();
  const [routes, setRoutes] = useState<SavedRoute[]>([]);

  const fetchRoutes = useCallback(async () => {
    if (!session || isAnonymous) {
      setRoutes([]);
      return;
    }
    const { data } = await supabase
      .from('routes')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    setRoutes(((data ?? []) as RouteRow[]).map(toSavedRoute));
  }, [session, isAnonymous]);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  async function save(startLat: number, startLng: number, placeIds: number[], title?: string) {
    if (!session || isAnonymous) return;
    await supabase.from('routes').insert({
      user_id: session.user.id,
      title: title ?? null,
      start_lat: startLat,
      start_lng: startLng,
      place_ids: placeIds,
    });
    await fetchRoutes();
  }

  return { routes, save };
}
