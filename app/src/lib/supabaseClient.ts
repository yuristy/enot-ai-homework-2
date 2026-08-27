import { createClient, type Session } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function ensureSession(): Promise<Session> {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    return data.session;
  }
  const { data: signInData, error } = await supabase.auth.signInAnonymously();
  if (error || !signInData.session) {
    throw new Error(`Failed to establish a session: ${error?.message ?? 'unknown error'}`);
  }
  return signInData.session;
}

export function isAnonymousSession(session: Session | null): boolean {
  if (!session) return true;
  const claim = (session.user.app_metadata as { is_anonymous?: boolean })?.is_anonymous;
  return claim === true;
}
