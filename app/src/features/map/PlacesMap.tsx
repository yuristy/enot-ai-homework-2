import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import { FavoriteButton } from '../cabinet/FavoriteButton';
import type { Place } from '../../lib/types';
import type { StartPoint } from './useRouteState';

const MOSCOW_CENTER: [number, number] = [55.7558, 37.6173];

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

interface PlacesMapProps {
  places: Place[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onMapClickSetStart: (point: StartPoint) => void;
  onSetStartFromPlace: (place: Place) => void;
  routePolyline?: [number, number][];
  startPoint?: StartPoint;
}

export function PlacesMap({
  places,
  selectedIds,
  onToggleSelect,
  onMapClickSetStart,
  onSetStartFromPlace,
  routePolyline,
  startPoint,
}: PlacesMapProps) {
  return (
    <MapContainer center={MOSCOW_CENTER} zoom={11} style={{ height: '500px', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickCatcher onClick={onMapClickSetStart} />
      <PopupFocusHandler />
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
      {places.map((place) => (
        <Marker key={place.id} position={[place.lat, place.lng]} keyboard>
          <Popup>
            <strong>{place.name}</strong>
            {place.source === 'user' && <div>от пользователя</div>}
            <div>
              <button type="button" onClick={() => onToggleSelect(place.id)}>
                {selectedIds.has(place.id) ? 'Убрать из маршрута' : 'Добавить в маршрут'}
              </button>
            </div>
            <div>
              <button type="button" onClick={() => onSetStartFromPlace(place)}>
                Сделать стартом
              </button>
            </div>
            <FavoriteButton placeId={place.id} />
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
