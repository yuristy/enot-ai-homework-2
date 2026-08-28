import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import type { Place } from '../../lib/types';
import { rowToPlace } from '../../lib/mappers';
import type { PlaceRow } from '../../lib/mappers';

export function usePlaces() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Only the initial mount should show the "Загрузка мест…" full-screen state.
  // Refetches (e.g. triggered after a successful submit) update `places` in
  // place without flashing the whole screen back to the loading view.
  const hasLoadedOnce = useRef(false);

  async function fetchPlaces() {
    if (!hasLoadedOnce.current) {
      setLoading(true);
    }
    const { data, error: fetchError } = await supabase.from('places').select('*');
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setPlaces((data as PlaceRow[]).map(rowToPlace));
      setError(null);
    }
    hasLoadedOnce.current = true;
    setLoading(false);
  }

  useEffect(() => {
    fetchPlaces();
  }, []);

  return { places, loading, error, refetch: fetchPlaces };
}
