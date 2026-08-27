import { useState } from 'react';
import { PlacesMap } from './PlacesMap';
import { RouteTray } from './RouteTray';
import { RouteSummary } from './RouteSummary';
import { useRouteState } from './useRouteState';
import { usePlaces } from './usePlaces';

export function MapScreen() {
  const { places, loading, error } = usePlaces();
  const { state, toggleSelected, setStart, clearStart, selectedPlaces, built, estimate, shareUrl } =
    useRouteState(places);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  function handleUseGeolocation() {
    navigator.geolocation.getCurrentPosition(
      (position) => setStart({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => setCopyFeedback('Не удалось получить геолокацию — кликните по карте, чтобы задать старт.'),
    );
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(shareUrl());
    setCopyFeedback('Ссылка скопирована');
  }

  if (loading) return <p>Загрузка мест…</p>;
  if (error) return <p>Не удалось загрузить места: {error}</p>;

  const polyline: [number, number][] | undefined =
    built && state.start
      ? [
          [state.start.lat, state.start.lng] as [number, number],
          ...built.orderedIds.map((id) => {
            const place = selectedPlaces.find((p) => p.id === id)!;
            return [place.lat, place.lng] as [number, number];
          }),
        ]
      : undefined;

  return (
    <div>
      <PlacesMap
        places={places}
        selectedIds={new Set(state.selectedIds)}
        onToggleSelect={toggleSelected}
        onMapClickSetStart={setStart}
        routePolyline={polyline}
      />
      <RouteTray
        selectedCount={state.selectedIds.length}
        hasStart={state.start !== null}
        onUseGeolocation={handleUseGeolocation}
        onClearStart={clearStart}
        onCopyLink={handleCopyLink}
      />
      {copyFeedback && <p role="status">{copyFeedback}</p>}
      {built && estimate && (
        <RouteSummary
          orderedPlaces={built.orderedIds.map((id) => selectedPlaces.find((p) => p.id === id)!)}
          totalDistanceKm={built.totalDistanceKm}
          minutes={estimate.minutes}
          difficulty={estimate.difficulty}
        />
      )}
    </div>
  );
}
