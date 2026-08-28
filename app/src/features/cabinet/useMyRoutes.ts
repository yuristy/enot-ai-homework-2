import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from './useAuth';
import { rowToRoute, type RouteRow } from '../../lib/mappers';
import type { SavedRoute } from '../../lib/types';

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
    setRoutes(((data ?? []) as RouteRow[]).map(rowToRoute));
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
