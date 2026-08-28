// app/src/features/requests/RequestCard.tsx
import { Card } from '../../components/Card';
import type { PhotoRequest } from '../../lib/types';

const TYPE_LABEL: Record<PhotoRequest['requestType'], string> = {
  seeking_photographer: 'Ищу фотографа',
  offering_photography: 'Предлагаю съёмку',
};

export function RequestCard({ request }: { request: PhotoRequest }) {
  return (
    <Card>
      <strong>{TYPE_LABEL[request.requestType]}</strong>
      {request.wantedDate && <div>Дата: {request.wantedDate}</div>}
      {request.comment && <p>{request.comment}</p>}
      <small>{new Date(request.createdAt).toLocaleDateString('ru-RU')}</small>
    </Card>
  );
}
