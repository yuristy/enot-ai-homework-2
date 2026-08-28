import { useEffect, useState } from 'react';
import L from 'leaflet';
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { FavoriteButton } from '../cabinet/FavoriteButton';
import type { Place } from '../../lib/types';
import type { StartPoint } from './useRouteState';

const MOSCOW_CENTER: [number, number] = [55.7558, 37.6173];

// Marks a place this session created: amber pin instead of the default blue,
// drawn as inline SVG (no extra image asset, no risk of breaking Leaflet's
// own default-icon path resolution).
const ownPlaceIcon = L.divIcon({
  className: 'own-place-marker',
  html: `<svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.5 0C5.6 0 0 5.7 0 12.7c0 9.6 12.5 28.3 12.5 28.3S25 22.3 25 12.7C25 5.7 19.4 0 12.5 0z" fill="#e8a33d" stroke="#15130f" stroke-width="1.5"/>
    <circle cx="12.5" cy="13" r="5" fill="#15130f"/>
  </svg>`,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Leaflet's own option merge copies every own key from the props object it's
// given, `undefined` included — so `icon={undefined}` on <Marker> overwrites
// Leaflet's built-in default icon instance with `undefined` instead of
// leaving it alone, and the marker then crashes trying to call
// `.createIcon()` on it. Always pass a real icon; this one reproduces the
// stock blue pin exactly for places that aren't "own".
const defaultPlaceIcon = new L.Icon.Default();

// Scrolling the page (not panning the map) while a marker's popup or the
// "add place here" popup is open leaves it visually stranded — closing it
// on scroll matches how it behaves on click-away. Listening for 'wheel'/
// 'touchmove' rather than the generic 'scroll' event is deliberate: 'scroll'
// also fires for a programmatic scrollIntoView() — the browser's own
// focus-follows-scroll behavior for a keyboard user tabbing to a button
// inside the popup, or a test driver's click-actionability check — either
// of which would otherwise close the very popup being interacted with.
// 'wheel'/'touchmove' only fire for scrolling the user actually drove.
function ClosePopupsOnScroll() {
  const map = useMap();
  useEffect(() => {
    function handleUserScroll() {
      map.closePopup();
    }
    window.addEventListener('wheel', handleUserScroll, { passive: true });
    window.addEventListener('touchmove', handleUserScroll, { passive: true });
    return () => {
      window.removeEventListener('wheel', handleUserScroll);
      window.removeEventListener('touchmove', handleUserScroll);
    };
  }, [map]);
  return null;
}

function ClickCatcher({ onClick }: { onClick: (point: StartPoint) => void }) {
  useMapEvents({
    click(e) {
      onClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

// Standard popover accessibility practice: when a popup opens (via mouse
// click or via Enter on a focused marker), move keyboard focus into the
// popup's own actionable content instead of leaving it stranded on the
// marker icon behind it. Without this, a keyboard user has to Tab past
// every remaining marker on the map before reaching the popup's buttons.
function PopupFocusHandler() {
  useMapEvents({
    popupopen(e) {
      // react-leaflet's own <Popup> also listens for this same `popupopen`
      // map event (to flip its `isOpen` state) and, because it's mounted
      // after this component's siblings-order-wise, its listener runs AFTER
      // ours within the same synchronous event dispatch. Its handler calls
      // Leaflet's `Popup.update()`, which briefly sets the popup container's
      // `visibility` to `hidden` and back to reposition it — and focusing an
      // element the instant before it goes invisible can lose that focus.
      // Deferring to the next animation frame runs after all of that
      // same-tick work (and any resulting re-render) has settled, so the
      // focus reliably sticks.
      requestAnimationFrame(() => {
        const popupEl = e.popup.getElement();
        popupEl?.querySelector<HTMLButtonElement>('.leaflet-popup-content button')?.focus();
      });
    },
  });
  return null;
}

interface PlaceMarkerProps {
  place: Place;
  isOwn: boolean;
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
  onSetStartFromPlace: (place: Place) => void;
  onDeletePlace: (place: Place) => void;
}

function PlaceMarker({ place, isOwn, isSelected, onToggleSelect, onSetStartFromPlace, onDeletePlace }: PlaceMarkerProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <Marker position={[place.lat, place.lng]} keyboard icon={isOwn ? ownPlaceIcon : defaultPlaceIcon}>
      <Popup eventHandlers={{ remove: () => setConfirmingDelete(false) }}>
        {place.photoUrl && (
          <img className="place-popup-photo" src={place.photoUrl} alt={place.name} loading="lazy" />
        )}
        <strong>{place.name}</strong>
        {place.source === 'user' && <div>{isOwn ? 'ваше место' : 'от пользователя'}</div>}
        <div>
          <button type="button" onClick={() => onToggleSelect(place.id)}>
            {isSelected ? 'Убрать из маршрута' : 'Добавить в маршрут'}
          </button>
        </div>
        <div>
          <button type="button" onClick={() => onSetStartFromPlace(place)}>
            Сделать стартом
          </button>
        </div>
        <div>
          <FavoriteButton placeId={place.id} />
        </div>
        {isOwn && (
          <div>
            <button
              type="button"
              className="btn-delete-place"
              onClick={() => (confirmingDelete ? onDeletePlace(place) : setConfirmingDelete(true))}
            >
              {confirmingDelete ? 'Точно удалить?' : '🗑 Удалить'}
            </button>
          </div>
        )}
      </Popup>
    </Marker>
  );
}

interface PlacesMapProps {
  places: Place[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onMapClickSetStart: (point: StartPoint) => void;
  onSetStartFromPlace: (place: Place) => void;
  onDeletePlace: (place: Place) => void;
  currentUserId: string | null;
  routePolyline?: [number, number][];
  startPoint?: StartPoint;
  clickPopupPoint: StartPoint | null;
  onAddPlaceHere: (point: StartPoint) => void;
  onDismissClickPopup: () => void;
}

export function PlacesMap({
  places,
  selectedIds,
  onToggleSelect,
  onMapClickSetStart,
  onSetStartFromPlace,
  onDeletePlace,
  currentUserId,
  routePolyline,
  startPoint,
  clickPopupPoint,
  onAddPlaceHere,
  onDismissClickPopup,
}: PlacesMapProps) {
  return (
    <MapContainer center={MOSCOW_CENTER} zoom={11} style={{ height: '500px', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickCatcher onClick={onMapClickSetStart} />
      <PopupFocusHandler />
      <ClosePopupsOnScroll />
      {routePolyline && routePolyline.length > 1 && (
        <Polyline positions={routePolyline} pathOptions={{ color: '#333' }} />
      )}
      {startPoint && (
        <CircleMarker
          center={[startPoint.lat, startPoint.lng]}
          radius={10}
          pathOptions={{ color: '#2b7de9', fillColor: '#2b7de9', fillOpacity: 0.9 }}
        />
      )}
      {clickPopupPoint && (
        <Popup
          position={[clickPopupPoint.lat, clickPopupPoint.lng]}
          eventHandlers={{ remove: onDismissClickPopup }}
        >
          <div>Старт маршрута перенесён сюда.</div>
          <button type="button" onClick={() => onAddPlaceHere(clickPopupPoint)}>
            📍 Добавить место здесь
          </button>
        </Popup>
      )}
      {places.map((place) => (
        <PlaceMarker
          key={place.id}
          place={place}
          isOwn={place.source === 'user' && place.createdBy !== null && place.createdBy === currentUserId}
          isSelected={selectedIds.has(place.id)}
          onToggleSelect={onToggleSelect}
          onSetStartFromPlace={onSetStartFromPlace}
          onDeletePlace={onDeletePlace}
        />
      ))}
    </MapContainer>
  );
}
