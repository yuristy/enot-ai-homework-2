// app/src/features/map/AddPlaceForm.tsx
import { useState, type FormEvent } from 'react';
import { Button } from '../../components/Button';
import { findNearbyDuplicates } from '../../lib/places';
import { getLimitErrorMessage } from '../../lib/limits';
import { supabase, isAnonymousSession } from '../../lib/supabaseClient';
import type { Place } from '../../lib/types';

export function AddPlaceForm({
  existingPlaces,
  onSubmitted,
}: {
  existingPlaces: Place[];
  onSubmitted: () => void;
}) {
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);

    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (Number.isNaN(latNum) || Number.isNaN(lngNum) || !name.trim()) {
      setMessage('Заполните название и корректные координаты.');
      return;
    }

    const duplicates = findNearbyDuplicates({ lat: latNum, lng: lngNum }, existingPlaces);
    if (duplicates.length > 0 && !duplicateWarning) {
      setDuplicateWarning(
        `Рядом уже есть: ${duplicates.map((d) => d.name).join(', ')}. Отправьте форму ещё раз, чтобы добавить всё равно.`,
      );
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    const { error } = await supabase.from('places').insert({
      name,
      description,
      lat: latNum,
      lng: lngNum,
      source: 'user',
      created_by: session?.user.id,
    });

    if (error) {
      const limitMessage = getLimitErrorMessage(error.message, isAnonymousSession(session));
      setMessage(limitMessage ?? `Не удалось сохранить: ${error.message}`);
      return;
    }

    setName('');
    setLat('');
    setLng('');
    setDescription('');
    setDuplicateWarning(null);
    setMessage('Место добавлено.');
    onSubmitted();
  }

  return (
    <form onSubmit={handleSubmit} className="add-place-form">
      <label>
        Название
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        Широта
        <input value={lat} onChange={(e) => setLat(e.target.value)} />
      </label>
      <label>
        Долгота
        <input value={lng} onChange={(e) => setLng(e.target.value)} />
      </label>
      <label>
        Описание
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      {duplicateWarning && <p role="alert">{duplicateWarning}</p>}
      {message && <p role="status">{message}</p>}
      <Button type="submit">Добавить место</Button>
    </form>
  );
}
