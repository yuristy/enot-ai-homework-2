// app/src/features/moodboard/MoodboardScreen.tsx
import { useState } from 'react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { useToast } from '../../components/Toast';
import { MoodboardCollage } from './MoodboardCollage';
import { useMoodboards } from './useMoodboards';

export function MoodboardScreen() {
  const { showToast } = useToast();
  const { isRegistered, favoritePlaces, moodboards, saveMoodboard, error } = useMoodboards();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  if (!isRegistered) {
    return <p>Мудборды доступны только зарегистрированным — они собираются из избранного.</p>;
  }

  if (favoritePlaces.length === 0) {
    return (
      <div>
        {error && <p role="status">{error}</p>}
        <p>Сначала добавьте что-то в избранное на карте.</p>
      </div>
    );
  }

  function toggle(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedPlaces = favoritePlaces.filter((p) => selectedIds.has(p.id));

  async function handleSave() {
    setSaving(true);
    try {
      await saveMoodboard(Array.from(selectedIds));
      showToast('Мудборд сохранён.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2>Мудборд</h2>
      {error && <p role="status">{error}</p>}
      <ul>
        {favoritePlaces.map((place) => (
          <li key={place.id}>
            <label>
              <input type="checkbox" checked={selectedIds.has(place.id)} onChange={() => toggle(place.id)} />
              {place.name}
            </label>
          </li>
        ))}
      </ul>
      {selectedPlaces.length > 0 && <MoodboardCollage places={selectedPlaces} />}
      <Button type="button" disabled={selectedPlaces.length === 0 || saving} onClick={handleSave}>
        Сохранить мудборд
      </Button>
      <h3>Сохранённые мудборды</h3>
      {moodboards.length === 0 ? (
        <p>Пока нет.</p>
      ) : (
        moodboards.map((board) => (
          <Card key={board.id}>{board.title ?? `Мудборд от ${new Date(board.createdAt).toLocaleDateString('ru-RU')}`}</Card>
        ))
      )}
    </div>
  );
}
