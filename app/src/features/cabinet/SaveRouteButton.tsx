import { Button } from '../../components/Button';
import { useAuth } from './useAuth';
import { useMyRoutes } from './useMyRoutes';

interface SaveRouteButtonProps {
  startLat: number;
  startLng: number;
  placeIds: number[];
}

export function SaveRouteButton({ startLat, startLng, placeIds }: SaveRouteButtonProps) {
  const { isAnonymous } = useAuth();
  const { save } = useMyRoutes();

  if (isAnonymous) {
    return <span>Войдите, чтобы сохранять маршруты</span>;
  }

  return (
    <Button type="button" variant="secondary" onClick={() => save(startLat, startLng, placeIds)}>
      Сохранить маршрут в кабинет
    </Button>
  );
}
