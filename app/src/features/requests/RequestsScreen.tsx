// app/src/features/requests/RequestsScreen.tsx
import { RequestCard } from './RequestCard';
import { useRequests } from './useRequests';

export function RequestsScreen() {
  const { requests, loading, error } = useRequests();

  if (loading) return <p>Загрузка заявок…</p>;
  if (error) return <p>Не удалось загрузить заявки: {error}</p>;

  return (
    <div>
      <h2>Заявки на фотосъёмку</h2>
      {requests.length === 0 ? (
        <p>Заявок пока нет.</p>
      ) : (
        requests.map((request) => <RequestCard key={request.id} request={request} />)
      )}
    </div>
  );
}
