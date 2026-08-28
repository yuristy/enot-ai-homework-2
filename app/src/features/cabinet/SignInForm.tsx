// app/src/features/cabinet/SignInForm.tsx
import { useState, type FormEvent } from 'react';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabaseClient';
import { translateAuthError } from '../../lib/authErrors';

export function SignInForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(translateAuthError(signInError.message));
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
          required
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <Button type="submit">Войти</Button>
    </form>
  );
}
