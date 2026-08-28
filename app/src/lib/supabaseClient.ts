import { createClient, type Session } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Only the in-flight anonymous sign-in is memoized (to dedupe concurrent
// callers into one round-trip) — the *resolved* session is never cached,
// because a resolved cache would keep handing out a stale session forever
// after supabase.auth.signOut(), causing later inserts to carry a user id
// that no longer matches the JWT actually attached to the request (RLS then
// rejects them as a mismatch). getSession() itself is a fast local read
// (no network call), so re-checking it on every call costs nothing.
let signInPromise: Promise<Session> | null = null;

export async function ensureSession(): Promise<Session> {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    return data.session;
  }
  if (!signInPromise) {
    signInPromise = (async () => {
      const { data: signInData, error } = await supabase.auth.signInAnonymously();
      if (error || !signInData.session) {
        throw new Error(`Failed to establish a session: ${error?.message ?? 'unknown error'}`);
      }
      return signInData.session;
    })();
  }
  try {
    return await signInPromise;
  } finally {
    signInPromise = null;
  }
}

export function isAnonymousSession(session: Session | null): boolean {
  if (!session) return true;
  // `is_anonymous` is a top-level field on `User` in @supabase/supabase-js 2.x
  // (auth-js `interface User`), not part of `app_metadata`. The app_metadata read
  // is kept as a fallback so this stays correct if the claim is ever surfaced there.
  const user = session.user as {
    is_anonymous?: boolean;
    app_metadata?: { is_anonymous?: boolean };
  };
  return user.is_anonymous === true || user.app_metadata?.is_anonymous === true;
}
