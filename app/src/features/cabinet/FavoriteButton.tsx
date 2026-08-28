import { Button } from '../../components/Button';
import { useAuth } from './useAuth';
import { useFavorites } from './useFavorites';

export function FavoriteButton({ placeId }: { placeId: number }) {
  const { isAnonymous } = useAuth();
  const { isFavorite, toggle } = useFavorites();

  if (isAnonymous) {
    return <span title="Войдите, чтобы добавлять в избранное">Избранное недоступно без входа</span>;
  }

  return (
    <Button type="button" variant="secondary" onClick={() => toggle(placeId)}>
      {isFavorite(placeId) ? '★ В избранном' : '☆ В избранное'}
    </Button>
  );
}
