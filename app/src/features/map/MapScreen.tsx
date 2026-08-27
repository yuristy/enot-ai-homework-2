import { useState } from 'react';
import { PlacesMap } from './PlacesMap';
import { RouteTray } from './RouteTray';
import { useRouteState } from './useRouteState';
import { usePlaces } from './usePlaces';

export function MapScreen() {
  const { places, loading, error } = usePlaces();
  const {
    state,
    toggleSelected,
    setStart,
    clearStart,
    built: _built,
    estimate: _estimate,
    shareUrl,
  } = useRouteState(places);
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

  return (
    <div>
      <PlacesMap
        places={places}
        selectedIds={new Set(state.selectedIds)}
        onToggleSelect={toggleSelected}
      />
      <RouteTray
        selectedCount={state.selectedIds.length}
        hasStart={state.start !== null}
        onUseGeolocation={handleUseGeolocation}
        onClearStart={clearStart}
        onCopyLink={handleCopyLink}
      />
      {copyFeedback && <p role="status">{copyFeedback}</p>}
      {/* built/estimate summary panel (RouteSummary) is wired in Task 4,
          once the component and the route polyline exist — rendering it
          here would import a file that doesn't exist yet in this task */}
    </div>
  );
}
