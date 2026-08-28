// app/src/features/cabinet/AuthProvider.tsx
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isAnonymousSession } from '../../lib/supabaseClient';
import { rowToProfile, type ProfileRow } from '../../lib/mappers';
import type { Profile } from '../../lib/types';

export interface AuthContextValue {
  session: Session | null;
  isAnonymous: boolean;
  profile: Profile | null;
  // True until the first refreshProfile() (session + profile) has settled.
  // CabinetScreen gates on this so a returning registered user never briefly
  // mounts the anonymous sign-up gate, and ProfileForm never mounts with a
  // profile prop that is stale-null while the real fetch is still in flight.
  initializing: boolean;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [initializing, setInitializing] = useState(true);

  const refreshProfile = useCallback(async () => {
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
    setProfile(profileRow ? rowToProfile(profileRow as ProfileRow) : null);
  }, []);

  useEffect(() => {
    refreshProfile().finally(() => setInitializing(false));
    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      refreshProfile();
    });
    return () => subscription.subscription.unsubscribe();
  }, [refreshProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isAnonymous: isAnonymousSession(session),
      profile,
      initializing,
      refreshProfile,
    }),
    [session, profile, initializing, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
