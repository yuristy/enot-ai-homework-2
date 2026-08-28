// app/src/features/map/RouteSummary.tsx
import { Card } from '../../components/Card';
import { SaveRouteButton } from '../cabinet/SaveRouteButton';
import type { Place } from '../../lib/types';
import type { RouteDifficulty } from '../../lib/route';

const DIFFICULTY_LABEL: Record<RouteDifficulty, string> = {
  easy: 'Лёгкий',
  medium: 'Средний',
  hard: 'Сложный',
};

interface RouteSummaryProps {
  orderedPlaces: Place[];
  totalDistanceKm: number;
  minutes: number;
  difficulty: RouteDifficulty;
  startLat: number;
  startLng: number;
}

export function RouteSummary({
  orderedPlaces,
  totalDistanceKm,
  minutes,
  difficulty,
  startLat,
  startLng,
}: RouteSummaryProps) {
  return (
    <Card className="route-summary">
      <p>
        Маршрут: {totalDistanceKm.toFixed(1)} км по прямой, ~{minutes} мин,
        сложность: {DIFFICULTY_LABEL[difficulty]}
      </p>
      <ol>
        {orderedPlaces.map((place) => (
          <li key={place.id}>{place.name}</li>
        ))}
      </ol>
      <SaveRouteButton startLat={startLat} startLng={startLng} placeIds={orderedPlaces.map((p) => p.id)} />
    </Card>
  );
}
