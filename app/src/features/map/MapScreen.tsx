import { useState } from 'react';
import { PlacesMap } from './PlacesMap';
import { usePlaces } from './usePlaces';

export function MapScreen() {
  const { places, loading, error } = usePlaces();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading) return <p>Загрузка мест…</p>;
  if (error) return <p>Не удалось загрузить места: {error}</p>;

  return <PlacesMap places={places} selectedIds={selectedIds} onToggleSelect={toggleSelect} />;
}
