import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import type { Place } from '../../lib/types';

const MOSCOW_CENTER: [number, number] = [55.7558, 37.6173];

interface PlacesMapProps {
  places: Place[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
}

export function PlacesMap({ places, selectedIds, onToggleSelect }: PlacesMapProps) {
  return (
    <MapContainer center={MOSCOW_CENTER} zoom={11} style={{ height: '500px', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {places.map((place) => (
        <Marker
          key={place.id}
          position={[place.lat, place.lng]}
          eventHandlers={{ click: () => onToggleSelect(place.id) }}
          keyboard
        >
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
