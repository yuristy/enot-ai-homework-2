import { createClient, type Session } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Memoized so concurrent callers share one sign-in round-trip: without this, two
// callers that both run before the first `signInAnonymously()` resolves would each
// see "no session" and each mint a separate anonymous user.
let sessionPromise: Promise<Session> | null = null;

export function ensureSession(): Promise<Session> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        return data.session;
      }
      const { data: signInData, error } = await supabase.auth.signInAnonymously();
      if (error || !signInData.session) {
        // Clear the memo so a failed attempt does not poison every later call.
        sessionPromise = null;
        throw new Error(`Failed to establish a session: ${error?.message ?? 'unknown error'}`);
      }
      return signInData.session;
    })();
  }
  return sessionPromise;
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
