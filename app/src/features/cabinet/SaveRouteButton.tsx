import { useState } from 'react';
import { Button } from '../../components/Button';
import { useToast } from '../../components/Toast';
import { useAuth } from './useAuth';
import { useMyRoutes } from './useMyRoutes';

interface SaveRouteButtonProps {
  startLat: number;
  startLng: number;
  placeIds: number[];
}

export function SaveRouteButton({ startLat, startLng, placeIds }: SaveRouteButtonProps) {
  const { showToast } = useToast();
  const { isAnonymous } = useAuth();
  const { save } = useMyRoutes();
  const [saving, setSaving] = useState(false);

  if (isAnonymous) {
    return <span>Войдите, чтобы сохранять маршруты</span>;
  }

  async function handleClick() {
    setSaving(true);
    try {
      await save(startLat, startLng, placeIds);
      showToast('Маршрут сохранён в кабинет.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Button type="button" variant="secondary" disabled={saving} onClick={handleClick}>
      Сохранить маршрут в кабинет
    </Button>
  );
}
