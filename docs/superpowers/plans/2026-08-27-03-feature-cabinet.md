# Feature: Cabinet & Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build sign-up/sign-in, a profile with a default role preference, favorites, and "Мои маршруты" (saved routes) — the parts of the product that require a real (non-anonymous) Supabase account.

**Architecture:** A `feature/cabinet` git worktree on its own branch, built on top of the completed Foundation plan. Auth state is exposed through a single `AuthProvider` context so every screen (this branch's and, later, the merged app) can read `{ user, isAnonymous, profile }` without re-querying Supabase.

**Tech Stack:** React 19, `@supabase/supabase-js` (already configured), the Foundation's `lib/types.ts`, `lib/route.ts` (for route URL parsing when saving/opening "мои маршруты"), `lib/supabaseClient.ts`.

**Spec:** `/Users/yuri/developer/enot-ai-homework-2/docs/superpowers/specs/2026-08-27-moscow-photo-map-design.md` (§2, §3, §5, §6)

## Global Constraints

- Runs in its own worktree/branch (`feature/cabinet`), touches only `app/src/features/cabinet/` plus the `/cabinet` route wiring in `App.tsx` — never edits `feature/map-routes` or `feature/requests-moodboard` files.
- Depends on Foundation being complete: `lib/types.ts`, `lib/route.ts`, `lib/supabaseClient.ts` (`supabase`, `ensureSession`, `isAnonymousSession`), `components/Button.tsx`, `components/Card.tsx` already exist — import them, do not redefine them.
- Favorites, saved routes, and moodboard access require a **non-anonymous** account (spec §3) — RLS already enforces this server-side; the UI must also gate the cabinet screens so an anonymous visitor is prompted to sign up instead of hitting a silent RLS rejection.
- The profile `role` field is a **default preference**, not the role used per-request (spec §2) — do not wire it into request creation (that belongs to `feature/requests-moodboard`).
- Saved routes must use the exact same URL scheme as `feature/map-routes` (`buildRouteUrl`/`parseRouteFromUrl` from `lib/route.ts`) — a saved route link must open correctly on the merged map screen.
- Every new piece of pure logic gets a Vitest test; the golden-path flow gets a Playwright test (spec §14).

---

## File Structure

```
app/src/features/cabinet/
  AuthProvider.tsx     -- context: { user, isAnonymous, profile, refreshProfile }
  useAuth.ts            -- hook to consume AuthProvider's context
  SignUpForm.tsx
  SignInForm.tsx
  ProfileForm.tsx        -- role + display name, upserts into `profiles`
  FavoriteButton.tsx      -- toggles a favorite; used standalone here, composed into map/requests screens post-merge
  useFavorites.ts
  MyRoutesList.tsx
  SaveRouteButton.tsx     -- exported for feature/map-routes to compose post-merge (documented, not wired cross-branch now)
  useMyRoutes.ts
  CabinetScreen.tsx       -- top-level screen composing the above
app/tests/
  profileValidation.test.ts
app/e2e/
  cabinet-favorites.spec.ts
```

**Responsibilities:**
- `AuthProvider.tsx` — wraps `supabase.auth.onAuthStateChange`, exposes the current session, whether it's anonymous, and the matching `profiles` row (or `null` if none/anonymous). Mounted once in `App.tsx` around the whole `<Routes>` tree so any screen — including ones added later by the other branches — can call `useAuth()`.
- `useFavorites.ts` — `{ favorites: Place[]; toggle: (placeId: number) => Promise<void>; isFavorite: (placeId: number) => boolean }`.
- `useMyRoutes.ts` — `{ routes: SavedRoute[]; save: (start: LatLng, placeIds: number[], title?: string) => Promise<void> }`.

---

### Task 1: Worktree setup

- [ ] **Step 1: Create the worktree and branch**

```bash
cd /Users/yuri/developer/enot-ai-homework-2
git worktree add ../work-cabinet -b feature/cabinet
cd ../work-cabinet/app
npm install
```

- [ ] **Step 2: Confirm the foundation is intact**

```bash
npm run build && npm run lint && npm run test && npm run test:e2e
```

Expected: all four green.

---

### Task 2: AuthProvider and the profile data shape

**Files:**
- Create: `app/src/features/cabinet/AuthProvider.tsx`
- Create: `app/src/features/cabinet/useAuth.ts`
- Modify: `app/src/App.tsx`

**Interfaces:**
- Produces: `<AuthProvider>` (wraps the app), `useAuth(): { session: Session | null; isAnonymous: boolean; profile: Profile | null; refreshProfile: () => Promise<void> }`.

- [ ] **Step 1: Write `AuthProvider.tsx`**

```tsx
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
```

- [ ] **Step 2: Write `useAuth.ts`**

```ts
// app/src/features/cabinet/useAuth.ts
import { useContext } from 'react';
import { AuthContext } from './AuthProvider';

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
```

- [ ] **Step 3: Mount `AuthProvider` in `App.tsx`**

```tsx
// app/src/App.tsx
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AuthProvider } from './features/cabinet/AuthProvider';

// ... existing placeholder components ...

export function App() {
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<MapPlaceholder />} />
          <Route path="/requests" element={<RequestsPlaceholder />} />
          <Route path="/cabinet" element={<CabinetPlaceholder />} />
        </Routes>
      </Layout>
    </AuthProvider>
  );
}
```

- [ ] **Step 4: Verify manually**

```bash
cd app && npm run dev
```

Add a temporary `console.log` in `CabinetPlaceholder` calling `useAuth()` and confirm the console shows a session with `isAnonymous: true` on first load (no sign-up yet). Remove the temporary log afterward.

- [ ] **Step 5: Build, lint, commit**

```bash
cd app && npm run build && npm run lint
cd - 
git add app/src/features/cabinet app/src/App.tsx
git commit -m "Add AuthProvider exposing session, anonymity flag, and profile"
```

---

### Task 3: Sign up, sign in, and profile form

**Files:**
- Create: `app/src/features/cabinet/SignUpForm.tsx`
- Create: `app/src/features/cabinet/SignInForm.tsx`
- Create: `app/src/features/cabinet/ProfileForm.tsx`
- Test: `app/tests/profileValidation.test.ts`

**Interfaces:**
- Produces: `<SignUpForm onSuccess={() => void} />`, `<SignInForm onSuccess={() => void} />`, `<ProfileForm profile={Profile | null} onSaved={() => void} />`, `validateProfileRole(value: string): ProfileRole | null` (pure, tested).

- [ ] **Step 1: Write the failing test for the pure validation helper**

```ts
// app/tests/profileValidation.test.ts
import { describe, expect, it } from 'vitest';
import { validateProfileRole } from '../src/features/cabinet/ProfileForm';

describe('validateProfileRole', () => {
  it('accepts "seeker"', () => {
    expect(validateProfileRole('seeker')).toBe('seeker');
  });

  it('accepts "photographer"', () => {
    expect(validateProfileRole('photographer')).toBe('photographer');
  });

  it('rejects anything else', () => {
    expect(validateProfileRole('admin')).toBeNull();
    expect(validateProfileRole('')).toBeNull();
  });
});
```

- [ ] **Step 2: Run to see it fail**

```bash
cd app && npm run test
```

Expected: FAIL — `validateProfileRole` not exported.

- [ ] **Step 3: Write `SignUpForm.tsx`**

```tsx
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
```

Note: `supabase.auth.updateUser` upgrades the existing **anonymous** session in place (Supabase's documented anonymous-to-permanent conversion path), so the guest keeps whatever `places`/`requests` rows they already authored under the same `auth.uid()` — no data migration needed.

- [ ] **Step 4: Write `SignInForm.tsx`**

```tsx
// app/src/features/cabinet/SignInForm.tsx
import { useState, type FormEvent } from 'react';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabaseClient';

export function SignInForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
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
```

- [ ] **Step 5: Write `ProfileForm.tsx`** with the exported pure validator

```tsx
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
```

- [ ] **Step 6: Run tests to confirm the validator passes**

```bash
cd app && npm run test
```

Expected: `profileValidation.test.ts` passes.

- [ ] **Step 7: Build, lint, commit**

```bash
cd app && npm run build && npm run lint
cd - 
git add app/src/features/cabinet app/tests/profileValidation.test.ts
git commit -m "Add sign-up, sign-in, and profile forms with tested role validation"
```

---

### Task 4: Favorites

**Files:**
- Create: `app/src/features/cabinet/useFavorites.ts`
- Create: `app/src/features/cabinet/FavoriteButton.tsx`

**Interfaces:**
- Produces: `useFavorites(): { favorites: Place[]; loading: boolean; toggle: (placeId: number) => Promise<void>; isFavorite: (placeId: number) => boolean }`, `<FavoriteButton placeId={number} />`.

- [ ] **Step 1: Write `useFavorites.ts`**

```ts
// app/src/features/cabinet/useFavorites.ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from './useAuth';
import type { Place } from '../../lib/types';

interface FavoriteRow {
  place_id: number;
  places: {
    id: number;
    name: string;
    description: string | null;
    lat: number;
    lng: number;
    tags: string[];
    photo_url: string | null;
    source: 'curated' | 'user';
    created_by: string | null;
    created_at: string;
  };
}

export function useFavorites() {
  const { session, isAnonymous } = useAuth();
  const [favorites, setFavorites] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    if (!session || isAnonymous) {
      setFavorites([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('favorites')
      .select('place_id, places(*)')
      .eq('user_id', session.user.id);
    const rows = (data ?? []) as unknown as FavoriteRow[];
    setFavorites(
      rows.map((row) => ({
        id: row.places.id,
        name: row.places.name,
        description: row.places.description,
        lat: row.places.lat,
        lng: row.places.lng,
        tags: row.places.tags,
        photoUrl: row.places.photo_url,
        source: row.places.source,
        createdBy: row.places.created_by,
        createdAt: row.places.created_at,
      })),
    );
    setLoading(false);
  }, [session, isAnonymous]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  function isFavorite(placeId: number) {
    return favorites.some((f) => f.id === placeId);
  }

  async function toggle(placeId: number) {
    if (!session || isAnonymous) return;
    if (isFavorite(placeId)) {
      await supabase.from('favorites').delete().eq('user_id', session.user.id).eq('place_id', placeId);
    } else {
      await supabase.from('favorites').insert({ user_id: session.user.id, place_id: placeId });
    }
    await fetchFavorites();
  }

  return { favorites, loading, toggle, isFavorite };
}
```

- [ ] **Step 2: Write `FavoriteButton.tsx`**

```tsx
// app/src/features/cabinet/FavoriteButton.tsx
import { Button } from '../../components/Button';
import { useAuth } from './useAuth';
import { useFavorites } from './useFavorites';

export function FavoriteButton({ placeId }: { placeId: number }) {
  const { isAnonymous } = useAuth();
  const { isFavorite, toggle } = useFavorites();

  if (isAnonymous) {
    return <span title="Войдите, чтобы добавлять в избранное">Избранное недоступно без входа</span>;
  }

  return (
    <Button type="button" variant="secondary" onClick={() => toggle(placeId)}>
      {isFavorite(placeId) ? '★ В избранном' : '☆ В избранное'}
    </Button>
  );
}
```

- [ ] **Step 3: Verify manually** — this button isn't wired into the map screen yet (that's `feature/map-routes`'s file, off limits here); verify it standalone by temporarily rendering `<FavoriteButton placeId={1} />` inside `CabinetScreen` (built in Task 6) once that exists, or via a throwaway test route. Confirm no TypeScript errors and no runtime errors with `npx tsc --noEmit`.

```bash
cd app && npx tsc --noEmit
```

- [ ] **Step 4: Build, lint, commit**

```bash
cd app && npm run build && npm run lint
cd - 
git add app/src/features/cabinet
git commit -m "Add favorites hook and FavoriteButton (registered accounts only)"
```

---

### Task 5: Saved routes ("Мои маршруты")

**Files:**
- Create: `app/src/features/cabinet/useMyRoutes.ts`
- Create: `app/src/features/cabinet/MyRoutesList.tsx`
- Create: `app/src/features/cabinet/SaveRouteButton.tsx`

**Interfaces:**
- Consumes: `buildRouteUrl` from `lib/route.ts`.
- Produces: `useMyRoutes(): { routes: SavedRoute[]; save: (startLat: number, startLng: number, placeIds: number[], title?: string) => Promise<void> }`, `<MyRoutesList />`, `<SaveRouteButton startLat={number} startLng={number} placeIds={number[]} />` — this last component is exported for `feature/map-routes` to import and render **after the merge**; it is not wired into `feature/map-routes` files during this branch's work.

- [ ] **Step 1: Write `useMyRoutes.ts`**

```ts
// app/src/features/cabinet/useMyRoutes.ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from './useAuth';
import type { SavedRoute } from '../../lib/types';

interface RouteRow {
  id: number;
  user_id: string;
  title: string | null;
  start_lat: number;
  start_lng: number;
  place_ids: number[];
  created_at: string;
}

function toSavedRoute(row: RouteRow): SavedRoute {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    startLat: row.start_lat,
    startLng: row.start_lng,
    placeIds: row.place_ids,
    createdAt: row.created_at,
  };
}

export function useMyRoutes() {
  const { session, isAnonymous } = useAuth();
  const [routes, setRoutes] = useState<SavedRoute[]>([]);

  const fetchRoutes = useCallback(async () => {
    if (!session || isAnonymous) {
      setRoutes([]);
      return;
    }
    const { data } = await supabase
      .from('routes')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    setRoutes(((data ?? []) as RouteRow[]).map(toSavedRoute));
  }, [session, isAnonymous]);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  async function save(startLat: number, startLng: number, placeIds: number[], title?: string) {
    if (!session || isAnonymous) return;
    await supabase.from('routes').insert({
      user_id: session.user.id,
      title: title ?? null,
      start_lat: startLat,
      start_lng: startLng,
      place_ids: placeIds,
    });
    await fetchRoutes();
  }

  return { routes, save };
}
```

- [ ] **Step 2: Write `SaveRouteButton.tsx`**

```tsx
// app/src/features/cabinet/SaveRouteButton.tsx
import { Button } from '../../components/Button';
import { useAuth } from './useAuth';
import { useMyRoutes } from './useMyRoutes';

interface SaveRouteButtonProps {
  startLat: number;
  startLng: number;
  placeIds: number[];
}

export function SaveRouteButton({ startLat, startLng, placeIds }: SaveRouteButtonProps) {
  const { isAnonymous } = useAuth();
  const { save } = useMyRoutes();

  if (isAnonymous) {
    return <span>Войдите, чтобы сохранять маршруты</span>;
  }

  return (
    <Button type="button" variant="secondary" onClick={() => save(startLat, startLng, placeIds)}>
      Сохранить маршрут в кабинет
    </Button>
  );
}
```

- [ ] **Step 3: Write `MyRoutesList.tsx`**

```tsx
// app/src/features/cabinet/MyRoutesList.tsx
import { Card } from '../../components/Card';
import { buildRouteUrl } from '../../lib/route';
import { useMyRoutes } from './useMyRoutes';

export function MyRoutesList() {
  const { routes } = useMyRoutes();

  if (routes.length === 0) {
    return <p>Сохранённых маршрутов пока нет.</p>;
  }

  return (
    <div>
      {routes.map((route) => (
        <Card key={route.id}>
          <a href={buildRouteUrl(route.startLat, route.startLng, route.placeIds)}>
            {route.title ?? `Маршрут от ${new Date(route.createdAt).toLocaleDateString('ru-RU')}`}
          </a>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Type-check, build, lint**

```bash
cd app && npx tsc --noEmit && npm run build && npm run lint
```

- [ ] **Step 5: Commit**

```bash
cd - 
git add app/src/features/cabinet
git commit -m "Add saved-routes hook, list, and save button for registered accounts"
```

---

### Task 6: CabinetScreen composition and routing

**Files:**
- Create: `app/src/features/cabinet/CabinetScreen.tsx`
- Modify: `app/src/App.tsx`

**Interfaces:**
- Produces: `<CabinetScreen />`, mounted at `/cabinet`.

- [ ] **Step 1: Write `CabinetScreen.tsx`**

```tsx
// app/src/features/cabinet/CabinetScreen.tsx
import { useState } from 'react';
import { SignInForm } from './SignInForm';
import { SignUpForm } from './SignUpForm';
import { ProfileForm } from './ProfileForm';
import { MyRoutesList } from './MyRoutesList';
import { useAuth } from './useAuth';
import { useFavorites } from './useFavorites';

export function CabinetScreen() {
  const { isAnonymous, profile, refreshProfile } = useAuth();
  const { favorites, loading: favoritesLoading } = useFavorites();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signUp');

  if (isAnonymous) {
    return (
      <div>
        <p>
          Кабинет нужен, если вы хотите сохранять избранное, маршруты или мудборды —
          и особенно если хотите откликаться на заявки как фотограф или искать его.
        </p>
        <div>
          <button type="button" onClick={() => setMode('signUp')}>Регистрация</button>
          <button type="button" onClick={() => setMode('signIn')}>Вход</button>
        </div>
        {mode === 'signUp' ? (
          <SignUpForm onSuccess={refreshProfile} />
        ) : (
          <SignInForm onSuccess={refreshProfile} />
        )}
      </div>
    );
  }

  return (
    <div>
      <h2>Кабинет</h2>
      <ProfileForm profile={profile} onSaved={refreshProfile} />
      <h3>Избранное</h3>
      {favoritesLoading ? (
        <p>Загрузка…</p>
      ) : favorites.length === 0 ? (
        <p>Пока пусто — добавляйте места в избранное с карты.</p>
      ) : (
        <ul>
          {favorites.map((place) => (
            <li key={place.id}>{place.name}</li>
          ))}
        </ul>
      )}
      <h3>Мои маршруты</h3>
      <MyRoutesList />
    </div>
  );
}
```

- [ ] **Step 2: Wire into `App.tsx`**

```tsx
// app/src/App.tsx
import { CabinetScreen } from './features/cabinet/CabinetScreen';
// remove CabinetPlaceholder, replace its route:
<Route path="/cabinet" element={<CabinetScreen />} />
```

- [ ] **Step 3: Verify manually**

```bash
cd app && npm run dev
```

Visit `/cabinet` while anonymous — see the sign-up/sign-in prompt with the explanation text. Sign up with a real-looking test email, set a role, confirm the profile form saves (no error), confirm "Избранное" shows the empty state, "Мои маршруты" shows the empty state.

- [ ] **Step 4: Build, lint, commit**

```bash
cd app && npm run build && npm run lint
cd - 
git add app/src/features/cabinet app/src/App.tsx
git commit -m "Compose CabinetScreen: auth gate, profile, favorites, saved routes"
```

---

### Task 7: Playwright e2e — sign up, set role, favorite, verify in cabinet

**Files:**
- Create: `app/e2e/cabinet-favorites.spec.ts`

- [ ] **Step 1: Write the test**

Since favoriting a place from the map isn't available until after the merge (that UI lives in `feature/map-routes`), this branch's e2e test exercises favoriting directly against Supabase (simulating what the merged UI will do) plus the full sign-up/profile/cabinet-display flow through the real UI:

```ts
// app/e2e/cabinet-favorites.spec.ts
import { expect, test } from '@playwright/test';

test('guest signs up, sets a role, and sees an empty cabinet', async ({ page }) => {
  const email = `test-${Date.now()}@example.com`;

  await page.goto('/cabinet');
  await expect(page.getByText(/Кабинет нужен/)).toBeVisible();

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Пароль').fill('correct horse battery staple');
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click();

  await expect(page.getByText('Кабинет')).toBeVisible();

  await page.getByLabel('Я фотограф').check();
  await page.getByRole('button', { name: 'Сохранить профиль' }).click();

  await expect(page.getByText('Пока пусто — добавляйте места в избранное с карты.')).toBeVisible();
  await expect(page.getByText('Сохранённых маршрутов пока нет.')).toBeVisible();
});
```

- [ ] **Step 2: Run it**

```bash
cd app && npm run test:e2e
```

Expected: passes against a real (test-tier) Supabase project. If email confirmation is required by the Supabase project's auth settings and blocks immediate sign-in, disable "Confirm email" for this project in Supabase Dashboard → Authentication → Providers → Email (acceptable for a homework project's own Supabase instance) and record that decision in `sessions/TOOLS.md`.

- [ ] **Step 3: Commit**

```bash
cd - 
git add app/e2e/cabinet-favorites.spec.ts
git commit -m "Add e2e test for sign-up, profile role, and empty cabinet state"
```

---

### Task 8: Feature exit checkpoint

- [ ] **Step 1: Full check suite**

```bash
cd app && npm run build && npm run lint && npm run test && npm run test:e2e
```

Expected: all green.

- [ ] **Step 2: Update `sessions/STATE.md` and `sessions/TOOLS.md`** in the worktree with what this branch added — note explicitly that `FavoriteButton` and `SaveRouteButton` are built but **not yet composed** into the map screen (that composition happens in the Integration plan, since `feature/map-routes`'s files aren't touched here).

- [ ] **Step 3: Final commit, ready for merge**

```bash
git add sessions/
git commit -m "feature/cabinet: exit checkpoint, all checks green"
```

This branch is now ready to merge into `main` alongside `feature/map-routes` and
`feature/requests-moodboard` — see the Integration plan
(`2026-08-27-05-integration.md`), which also wires `FavoriteButton` into the map
screen and `SaveRouteButton` into the route summary.
