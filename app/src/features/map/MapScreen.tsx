import { useState } from 'react';
import { PlacesMap } from './PlacesMap';
import { RouteTray } from './RouteTray';
import { RouteSummary } from './RouteSummary';
import { TagFilter } from './TagFilter';
import { AddPlaceForm } from './AddPlaceForm';
import { useRouteState, type StartPoint } from './useRouteState';
import { usePlaces } from './usePlaces';

export function MapScreen() {
  const { places, loading, error, refetch } = usePlaces();
  const { state, toggleSelected, setStart, clearStart, selectedPlaces, built, estimate, shareUrl } =
    useRouteState(places);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  // Clicking the map normally sets the route's start point. While the
  // add-place form is "picking" a location, the same click instead fills
  // its coordinate fields — typing raw lat/lng by hand is the exact pain
  // point this exists to avoid.
  const [pickingPlaceLocation, setPickingPlaceLocation] = useState(false);
  const [pickedPlaceLocation, setPickedPlaceLocation] = useState<StartPoint | null>(null);

  function handleMapClick(point: StartPoint) {
    if (pickingPlaceLocation) {
      setPickedPlaceLocation(point);
      setPickingPlaceLocation(false);
    } else {
      setStart(point);
    }
  }

  const allTags = Array.from(new Set(places.flatMap((p) => p.tags))).sort();

  function toggleTag(tag: string) {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  const visiblePlaces =
    activeTags.size === 0 ? places : places.filter((p) => p.tags.some((t) => activeTags.has(t)));

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
      <TagFilter allTags={allTags} activeTags={activeTags} onToggle={toggleTag} />
      {pickingPlaceLocation && (
        <p role="status">Кликните по карте, чтобы задать координаты нового места.</p>
      )}
      <div className={`map-frame viewfinder${pickingPlaceLocation ? ' map-frame--picking' : ''}`}>
        <PlacesMap
          places={visiblePlaces}
          selectedIds={new Set(state.selectedIds)}
          onToggleSelect={toggleSelected}
          onMapClickSetStart={handleMapClick}
          onSetStartFromPlace={(place) => setStart({ lat: place.lat, lng: place.lng })}
          routePolyline={polyline}
          startPoint={state.start ?? undefined}
        />
      </div>
      <RouteTray
        selectedCount={state.selectedIds.length}
        hasStart={state.start !== null}
        onUseGeolocation={handleUseGeolocation}
        onClearStart={clearStart}
        onCopyLink={handleCopyLink}
      />
      {copyFeedback && <p role="status">{copyFeedback}</p>}
      {built && estimate && selectedPlaces.length > 0 && (
        <RouteSummary
          orderedPlaces={built.orderedIds.map((id) => selectedPlaces.find((p) => p.id === id)!)}
          totalDistanceKm={built.totalDistanceKm}
          minutes={estimate.minutes}
          difficulty={estimate.difficulty}
          startLat={state.start!.lat}
          startLng={state.start!.lng}
        />
      )}
      <AddPlaceForm
        existingPlaces={places}
        onSubmitted={refetch}
        pickedLocation={pickedPlaceLocation}
        picking={pickingPlaceLocation}
        onStartPicking={() => setPickingPlaceLocation(true)}
      />
    </div>
  );
}
