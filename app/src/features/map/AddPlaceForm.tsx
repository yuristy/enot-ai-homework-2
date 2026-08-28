// app/src/features/map/AddPlaceForm.tsx
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Button } from '../../components/Button';
import { useToast } from '../../components/Toast';
import { findNearbyDuplicates } from '../../lib/places';
import { getLimitErrorMessage } from '../../lib/limits';
import { supabase, isAnonymousSession, ensureSession } from '../../lib/supabaseClient';
import type { Place } from '../../lib/types';
import type { StartPoint } from './useRouteState';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export function AddPlaceForm({
  existingPlaces,
  onSubmitted,
  pickedLocation,
}: {
  existingPlaces: Place[];
  onSubmitted: () => void;
  // Typing exact decimal coordinates by hand is unrealistic for most users —
  // clicking the map and choosing "Добавить место здесь" in the popup is the
  // primary path; the fields below stay editable as a fallback for anyone
  // who does have exact coordinates to paste in.
  pickedLocation: StartPoint | null;
}) {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [description, setDescription] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  // Bumped after every successful submit to remount the (uncontrollable)
  // file input and clear its selected file.
  const [photoInputKey, setPhotoInputKey] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!pickedLocation) return;
    setLat(pickedLocation.lat.toFixed(6));
    setLng(pickedLocation.lng.toFixed(6));
    setDuplicateWarning(null);
  }, [pickedLocation]);

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (file && file.size > MAX_PHOTO_BYTES) {
      setMessage('Фото слишком большое — максимум 5 МБ.');
      setPhotoFile(null);
      setPhotoInputKey((k) => k + 1);
      return;
    }
    setPhotoFile(file);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);

    const trimmedName = name.trim();
    const trimmedLat = lat.trim();
    const trimmedLng = lng.trim();
    const latNum = Number(trimmedLat);
    const lngNum = Number(trimmedLng);
    if (
      !trimmedName ||
      !trimmedLat ||
      !trimmedLng ||
      !Number.isFinite(latNum) ||
      !Number.isFinite(lngNum) ||
      latNum < -90 ||
      latNum > 90 ||
      lngNum < -180 ||
      lngNum > 180
    ) {
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

    setSubmitting(true);
    try {
      let session;
      try {
        session = await ensureSession();
      } catch {
        setMessage('Не удалось установить сессию. Обновите страницу и попробуйте снова.');
        return;
      }

      let photoUrl: string | null = null;
      if (photoFile) {
        const path = `${session.user.id}/${Date.now()}-${photoFile.name}`;
        const { error: uploadError } = await supabase.storage.from('place-photos').upload(path, photoFile);
        if (uploadError) {
          setMessage(`Не удалось загрузить фото: ${uploadError.message}`);
          return;
        }
        photoUrl = supabase.storage.from('place-photos').getPublicUrl(path).data.publicUrl;
      }

      const { error } = await supabase.from('places').insert({
        name: trimmedName,
        description,
        lat: latNum,
        lng: lngNum,
        photo_url: photoUrl,
        source: 'user',
        created_by: session.user.id,
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
      setPhotoFile(null);
      setPhotoInputKey((k) => k + 1);
      setDuplicateWarning(null);
      setMessage('Место добавлено.');
      showToast('Место добавлено.');
      onSubmitted();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="add-place-form">
      <label>
        Название
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <div className="coords-picker">
        <p className="coords-picker__hint">
          Кликните точку на карте выше и выберите «Добавить место здесь» — либо впишите координаты вручную:
        </p>
        <div className="coords-picker__fields">
          <label>
            Широта
            <input
              value={lat}
              inputMode="decimal"
              onChange={(e) => {
                setLat(e.target.value);
                setDuplicateWarning(null);
              }}
            />
          </label>
          <label>
            Долгота
            <input
              value={lng}
              inputMode="decimal"
              onChange={(e) => {
                setLng(e.target.value);
                setDuplicateWarning(null);
              }}
            />
          </label>
        </div>
      </div>
      <label>
        Описание
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <label>
        Фото (необязательно, до 5 МБ)
        <input key={photoInputKey} type="file" accept="image/*" onChange={handlePhotoChange} />
      </label>
      {duplicateWarning && <p role="alert">{duplicateWarning}</p>}
      {message && <p role="status">{message}</p>}
      <Button type="submit" disabled={submitting}>
        {submitting ? 'Добавляем…' : 'Добавить место'}
      </Button>
    </form>
  );
}
