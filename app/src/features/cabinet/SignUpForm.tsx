// app/src/features/cabinet/SignUpForm.tsx
import { useState, type FormEvent } from 'react';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabaseClient';

export function SignUpForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const { error: signUpError } = await supabase.auth.updateUser({ email, password });
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    // `updateUser` flips the in-memory user object's `is_anonymous` to false
    // immediately, but the JWT already on this session still carries the old
    // `is_anonymous: true` claim until the token is refreshed — RLS policies
    // read the JWT claim, not the user object, so the first `profiles` write
    // would otherwise fail with a row-level-security violation. Force a
    // refresh so the new claim lands before any registered-only write runs.
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      setError(refreshError.message);
      return;
    }
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label>
        Пароль
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <Button type="submit">Зарегистрироваться</Button>
    </form>
  );
}
