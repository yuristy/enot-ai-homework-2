import { useRef, useState } from 'react';
import { PlacesMap } from './PlacesMap';
import { RouteTray } from './RouteTray';
import { RouteSummary } from './RouteSummary';
import { TagFilter } from './TagFilter';
import { AddPlaceForm } from './AddPlaceForm';
import { useRouteState, type StartPoint } from './useRouteState';
import { usePlaces } from './usePlaces';
import { useToast } from '../../components/Toast';
import { useAuth } from '../cabinet/useAuth';
import { supabase } from '../../lib/supabaseClient';
import type { Place } from '../../lib/types';

export function MapScreen() {
  const { showToast } = useToast();
  const { session } = useAuth();
  const { places, loading, error, refetch } = usePlaces();
  const { state, toggleSelected, setStart, clearStart, selectedPlaces, built, estimate, shareUrl } =
    useRouteState(places);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [pickedPlaceLocation, setPickedPlaceLocation] = useState<StartPoint | null>(null);
  // Clicking the map sets the route's start point (unchanged) and also
  // opens a small popup at that same point offering to add a new place
  // there — the click itself is the entry point, no separate "start
  // picking" toggle needed.
  const [clickPopupPoint, setClickPopupPoint] = useState<StartPoint | null>(null);
  const addPlaceRef = useRef<HTMLDivElement>(null);

  function handleMapClick(point: StartPoint) {
    setStart(point);
    setClickPopupPoint(point);
  }

  function handleAddPlaceHere(point: StartPoint) {
    setPickedPlaceLocation(point);
    setClickPopupPoint(null);
    requestAnimationFrame(() => {
      addPlaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      addPlaceRef.current?.querySelector('input')?.focus();
    });
  }

  async function handleDeletePlace(place: Place) {
    const { error: deleteError } = await supabase.from('places').delete().eq('id', place.id);
    if (deleteError) {
      showToast(`Не удалось удалить место: ${deleteError.message}`);
      return;
    }
    showToast('Место удалено.');
    refetch();
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
      <div className="map-frame viewfinder">
        <PlacesMap
          places={visiblePlaces}
          selectedIds={new Set(state.selectedIds)}
          onToggleSelect={toggleSelected}
          onMapClickSetStart={handleMapClick}
          onSetStartFromPlace={(place) => setStart({ lat: place.lat, lng: place.lng })}
          onDeletePlace={handleDeletePlace}
          currentUserId={session?.user.id ?? null}
          routePolyline={polyline}
          startPoint={state.start ?? undefined}
          clickPopupPoint={clickPopupPoint}
          onAddPlaceHere={handleAddPlaceHere}
          onDismissClickPopup={() => setClickPopupPoint(null)}
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
      <div ref={addPlaceRef}>
        <AddPlaceForm existingPlaces={places} onSubmitted={refetch} pickedLocation={pickedPlaceLocation} />
      </div>
    </div>
  );
}
