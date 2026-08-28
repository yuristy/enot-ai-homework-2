import { describe, expect, it } from 'vitest';
import { translateAuthError } from '../src/lib/authErrors';

describe('translateAuthError', () => {
  it('translates a duplicate-email sign-up error', () => {
    expect(translateAuthError('User already registered')).toBe(
      'Пользователь с таким email уже зарегистрирован.',
    );
  });

  it('translates a wrong-password sign-in error', () => {
    expect(translateAuthError('Invalid login credentials')).toBe('Неверный email или пароль.');
  });

  it('passes through an unrecognized message unchanged', () => {
    expect(translateAuthError('Some new Supabase error we have not seen yet')).toBe(
      'Some new Supabase error we have not seen yet',
    );
  });
});
