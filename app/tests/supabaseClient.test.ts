import { describe, expect, it } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import { isAnonymousSession } from '../src/lib/supabaseClient';

// Минимальный объект формы `Session` — `isAnonymousSession` читает только
// `session.user`, сеть здесь не нужна.
function fakeSession(user: Record<string, unknown>): Session {
  return {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    user: {
      id: '00000000-0000-4000-8000-000000000001',
      aud: 'authenticated',
      created_at: '2026-08-27T10:00:00Z',
      app_metadata: {},
      user_metadata: {},
      ...user,
    },
  } as unknown as Session;
}

describe('isAnonymousSession', () => {
  it('returns true when the user carries the top-level is_anonymous flag', () => {
    // Where supabase-js actually puts it (auth-js `interface User`), not app_metadata.
    expect(isAnonymousSession(fakeSession({ is_anonymous: true }))).toBe(true);
  });

  it('returns false for a registered user with no is_anonymous anywhere', () => {
    expect(
      isAnonymousSession(
        fakeSession({
          email: 'someone@example.com',
          app_metadata: { provider: 'email', providers: ['email'] },
        }),
      ),
    ).toBe(false);
  });

  it('returns true when there is no session at all', () => {
    expect(isAnonymousSession(null)).toBe(true);
  });

  it('still honours the flag if it shows up under app_metadata', () => {
    expect(isAnonymousSession(fakeSession({ app_metadata: { is_anonymous: true } }))).toBe(true);
  });
});
