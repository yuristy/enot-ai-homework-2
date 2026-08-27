// app/src/features/cabinet/CabinetScreen.tsx
import { useState } from 'react';
import { SignInForm } from './SignInForm';
import { SignUpForm } from './SignUpForm';
import { ProfileForm } from './ProfileForm';
import { MyRoutesList } from './MyRoutesList';
import { useAuth } from './useAuth';
import { useFavorites } from './useFavorites';

export function CabinetScreen() {
  const { isAnonymous, profile, refreshProfile } = useAuth();
  const { favorites, loading: favoritesLoading } = useFavorites();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signUp');

  if (isAnonymous) {
    return (
      <div>
        <p>
          Кабинет нужен, если вы хотите сохранять избранное, маршруты или мудборды —
          и особенно если хотите откликаться на заявки как фотограф или искать его.
        </p>
        <div>
          <button type="button" onClick={() => setMode('signUp')}>Регистрация</button>
          <button type="button" onClick={() => setMode('signIn')}>Вход</button>
        </div>
        {mode === 'signUp' ? (
          <SignUpForm onSuccess={refreshProfile} />
        ) : (
          <SignInForm onSuccess={refreshProfile} />
        )}
      </div>
    );
  }

  return (
    <div>
      <h2>Кабинет</h2>
      <ProfileForm profile={profile} onSaved={refreshProfile} />
      <h3>Избранное</h3>
      {favoritesLoading ? (
        <p>Загрузка…</p>
      ) : favorites.length === 0 ? (
        <p>Пока пусто — добавляйте места в избранное с карты.</p>
      ) : (
        <ul>
          {favorites.map((place) => (
            <li key={place.id}>{place.name}</li>
          ))}
        </ul>
      )}
      <h3>Мои маршруты</h3>
      <MyRoutesList />
    </div>
  );
}
