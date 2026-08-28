// app/src/features/map/RouteTray.tsx
import { Button } from '../../components/Button';

interface RouteTrayProps {
  selectedCount: number;
  hasStart: boolean;
  onUseGeolocation: () => void;
  onClearStart: () => void;
  onCopyLink: () => void;
}

export function RouteTray({
  selectedCount,
  hasStart,
  onUseGeolocation,
  onClearStart,
  onCopyLink,
}: RouteTrayProps) {
  return (
    <div className="route-tray">
      <span>Выбрано мест: {selectedCount}</span>
      {!hasStart && (
        <Button type="button" onClick={onUseGeolocation}>
          Начать с моей геолокации
        </Button>
      )}
      {hasStart && (
        <Button type="button" variant="secondary" onClick={onClearStart}>
          Сбросить старт
        </Button>
      )}
      {hasStart && selectedCount > 0 && (
        <Button type="button" variant="secondary" onClick={onCopyLink}>
          Скопировать ссылку на маршрут
        </Button>
      )}
    </div>
  );
}
