// app/src/features/cabinet/AuthProvider.tsx
import { createContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isAnonymousSession } from '../../lib/supabaseClient';
import type { Profile } from '../../lib/types';

interface ProfileRow {
  id: string;
  role: 'seeker' | 'photographer' | null;
  display_name: string | null;
  created_at: string;
}

function toProfile(row: ProfileRow): Profile {
  return { id: row.id, role: row.role, displayName: row.display_name, createdAt: row.created_at };
}

export interface AuthContextValue {
  session: Session | null;
  isAnonymous: boolean;
  profile: Profile | null;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  async function refreshProfile() {
    const { data } = await supabase.auth.getSession();
    const currentSession = data.session;
    setSession(currentSession);
    if (!currentSession || isAnonymousSession(currentSession)) {
      setProfile(null);
      return;
    }
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentSession.user.id)
      .maybeSingle();
    setProfile(profileRow ? toProfile(profileRow as ProfileRow) : null);
  }

  useEffect(() => {
    refreshProfile();
    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      refreshProfile();
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  const value: AuthContextValue = {
    session,
    isAnonymous: isAnonymousSession(session),
    profile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
