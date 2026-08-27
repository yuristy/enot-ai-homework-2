// app/src/features/cabinet/ProfileForm.tsx
import { useState, type FormEvent } from 'react';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabaseClient';
import type { Profile, ProfileRole } from '../../lib/types';

export function validateProfileRole(value: string): ProfileRole | null {
  return value === 'seeker' || value === 'photographer' ? value : null;
}

export function ProfileForm({ profile, onSaved }: { profile: Profile | null; onSaved: () => void }) {
  const [role, setRole] = useState(profile?.role ?? '');
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const validRole = role ? validateProfileRole(role) : null;
    if (role && !validRole) {
      setError('Недопустимая роль.');
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      setError('Нет активной сессии.');
      return;
    }

    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert({ id: userId, role: validRole, display_name: displayName || null });

    if (upsertError) {
      setError(upsertError.message);
      return;
    }
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Имя
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      </label>
      <fieldset>
        <legend>Роль по умолчанию</legend>
        <label>
          <input
            type="radio"
            name="role"
            value="seeker"
            checked={role === 'seeker'}
            onChange={(e) => setRole(e.target.value)}
          />
          Я ищу фотографа
        </label>
        <label>
          <input
            type="radio"
            name="role"
            value="photographer"
            checked={role === 'photographer'}
            onChange={(e) => setRole(e.target.value)}
          />
          Я фотограф
        </label>
      </fieldset>
      {error && <p role="alert">{error}</p>}
      <Button type="submit">Сохранить профиль</Button>
    </form>
  );
}
