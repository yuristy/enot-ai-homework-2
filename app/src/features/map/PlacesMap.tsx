import { MapContainer, Marker, Polyline, Popup, TileLayer, useMapEvents } from 'react-leaflet';
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

interface PlacesMapProps {
  places: Place[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onMapClickSetStart: (point: StartPoint) => void;
  routePolyline?: [number, number][];
}

export function PlacesMap({
  places,
  selectedIds,
  onToggleSelect,
  onMapClickSetStart,
  routePolyline,
}: PlacesMapProps) {
  return (
    <MapContainer center={MOSCOW_CENTER} zoom={11} style={{ height: '500px', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickCatcher onClick={onMapClickSetStart} />
      {routePolyline && routePolyline.length > 1 && (
        <Polyline positions={routePolyline} pathOptions={{ color: '#333' }} />
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
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
