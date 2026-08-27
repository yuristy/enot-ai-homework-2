import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import type { Place } from '../../lib/types';
import { rowToPlace } from '../../lib/mappers';
import type { PlaceRow } from '../../lib/mappers';

export function usePlaces() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchPlaces() {
    setLoading(true);
    const { data, error: fetchError } = await supabase.from('places').select('*');
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setPlaces((data as PlaceRow[]).map(rowToPlace));
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchPlaces();
  }, []);

  return { places, loading, error, refetch: fetchPlaces };
}
