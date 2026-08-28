// app/src/features/requests/RequestForm.tsx
import { useState, type FormEvent } from 'react';
import { Button } from '../../components/Button';
import { useRequests } from './useRequests';
import type { RequestType } from '../../lib/types';

export function RequestForm({ onCreated }: { onCreated: () => void }) {
  const { create } = useRequests();
  const [requestType, setRequestType] = useState<RequestType>('seeking_photographer');
  const [wantedDate, setWantedDate] = useState('');
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedComment = comment.trim();
    if (!trimmedComment) {
      setMessage('Комментарий не может быть пустым.');
      return;
    }
    setMessage(null);
    setSubmitting(true);
    try {
      const { error } = await create({
        requestType,
        placeId: null,
        wantedDate: wantedDate || null,
        comment: trimmedComment,
      });
      if (error) {
        setMessage(error);
        return;
      }
      setComment('');
      setWantedDate('');
      setMessage('Заявка опубликована.');
      onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <fieldset>
        <legend>Тип заявки</legend>
        <label>
          <input
            type="radio"
            name="requestType"
            checked={requestType === 'seeking_photographer'}
            onChange={() => setRequestType('seeking_photographer')}
          />
          Ищу фотографа
        </label>
        <label>
          <input
            type="radio"
            name="requestType"
            checked={requestType === 'offering_photography'}
            onChange={() => setRequestType('offering_photography')}
          />
          Предлагаю съёмку
        </label>
      </fieldset>
      <label>
        Желаемая дата
        <input type="date" value={wantedDate} onChange={(e) => setWantedDate(e.target.value)} />
      </label>
      <label>
        Комментарий (укажите контакт, если хотите, чтобы с вами связались)
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          required
          maxLength={2000}
        />
      </label>
      {message && <p role="status">{message}</p>}
      <Button type="submit" disabled={submitting}>
        Опубликовать заявку
      </Button>
    </form>
  );
}
