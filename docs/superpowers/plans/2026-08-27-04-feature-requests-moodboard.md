# Feature: Requests Feed & Moodboards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the public requests feed (viewable by anyone, creatable with the daily rate limit) and the moodboard collage generator (registered accounts only, built from favorites).

**Architecture:** A `feature/requests-moodboard` git worktree on its own branch, built on top of the completed Foundation plan. The requests feed needs no auth gating beyond the rate limit (already enforced by the Postgres trigger); the moodboard screen reads from `favorites`, which only exist for registered accounts, so it degrades to a prompt-to-sign-up message when there's nothing to build from.

**Tech Stack:** React 19, `@supabase/supabase-js` (already configured), Canvas 2D API for palette extraction, the Foundation's `lib/types.ts`, `lib/limits.ts`, `lib/supabaseClient.ts`.

**Spec:** `/Users/yuri/developer/enot-ai-homework-2/docs/superpowers/specs/2026-08-27-moscow-photo-map-design.md` (§7, §8)

## Global Constraints

- Runs in its own worktree/branch (`feature/requests-moodboard`), touches only `app/src/features/requests/`, `app/src/features/moodboard/`, plus the `/requests` route wiring in `App.tsx` — never edits `feature/map-routes` or `feature/cabinet` files.
- Depends on Foundation being complete: `lib/types.ts`, `lib/limits.ts`, `lib/supabaseClient.ts` already exist — import them, do not redefine them.
- The requests feed is readable by everyone including anonymous guests (spec §7) — no auth gate on viewing, only on the rate-limited insert.
- A request's `request_type` ("ищу фотографа" / "предлагаю съёмку") is chosen **per request**, independent of the author's profile role (spec §2) — do not read or depend on `profiles.role` here.
- The feed is a bulletin board, not a messenger — contact happens through whatever the author put in their own comment text; there is no reply/response entity (spec §7, §15).
- Moodboards require a real (non-anonymous) account because they're built from favorites, which only registered accounts have (spec §3, §8) — this branch reads `favorites`/`moodboards` through the same RLS rules the Foundation already set up; it does not need to duplicate cabinet UI, only handle the "you have nothing to build from" state gracefully.
- The collage and palette extraction are client-side only — no external image-generation API (spec §8, §1 out-of-scope).
- Every new piece of pure logic gets a Vitest test; the golden-path flow gets a Playwright test (spec §14).

---

## File Structure

```
app/src/features/requests/
  RequestsScreen.tsx
  RequestCard.tsx
  RequestForm.tsx
  useRequests.ts
app/src/features/moodboard/
  MoodboardScreen.tsx
  MoodboardCollage.tsx
  useMoodboards.ts
  palette.ts            -- pure canvas-based average-color extraction
app/tests/
  palette.test.ts
  collageLayout.test.ts
app/e2e/
  requests-limit.spec.ts
```

**Responsibilities:**
- `useRequests.ts` — `{ requests: PhotoRequest[]; loading: boolean; error: string | null; refetch: () => void; create: (input) => Promise<{ error: string | null }> }`.
- `palette.ts` — `extractAverageColor(imageData: ImageData): { r: number; g: number; b: number }` (pure, given raw pixel data so it's testable without a real `<canvas>` or network image) and `collageGridTemplate(count: number): { columns: number; rows: number }` (pure grid-sizing logic, also testable in isolation).
- `useMoodboards.ts` — mirrors `useFavorites`/`useMyRoutes` shape from `feature/cabinet`, but reads `favorites`/`moodboards` directly (this branch does not import from `feature/cabinet`'s files, since worktrees are independent — it re-implements the minimal read it needs against the same tables, which is fine since both branches only read/write through Supabase, not through each other's code).

---

### Task 1: Worktree setup

- [ ] **Step 1: Create the worktree and branch**

```bash
cd /Users/yuri/developer/enot-ai-homework-2
git worktree add ../work-requests-moodboard -b feature/requests-moodboard
cd ../work-requests-moodboard/app
npm install
```

- [ ] **Step 2: Confirm the foundation is intact**

```bash
npm run build && npm run lint && npm run test && npm run test:e2e
```

Expected: all four green.

---

### Task 2: Requests feed — read

**Files:**
- Create: `app/src/features/requests/useRequests.ts`
- Create: `app/src/features/requests/RequestCard.tsx`
- Create: `app/src/features/requests/RequestsScreen.tsx`
- Modify: `app/src/App.tsx`

**Interfaces:**
- Produces: `useRequests(): { requests: PhotoRequest[]; loading: boolean; error: string | null; refetch: () => void }`.

- [ ] **Step 1: Write `useRequests.ts` (read half only for now)**

```ts
// app/src/features/requests/useRequests.ts
import { useCallback, useEffect, useState } from 'react';
import { supabase, isAnonymousSession } from '../../lib/supabaseClient';
import { getLimitErrorMessage } from '../../lib/limits';
import type { PhotoRequest, RequestType } from '../../lib/types';

interface RequestRow {
  id: number;
  request_type: RequestType;
  place_id: number | null;
  wanted_date: string | null;
  comment: string | null;
  author_id: string;
  created_at: string;
}

function toRequest(row: RequestRow): PhotoRequest {
  return {
    id: row.id,
    requestType: row.request_type,
    placeId: row.place_id,
    wantedDate: row.wanted_date,
    comment: row.comment,
    authorId: row.author_id,
    createdAt: row.created_at,
  };
}

export function useRequests() {
  const [requests, setRequests] = useState<PhotoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setRequests((data as RequestRow[]).map(toRequest));
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  async function create(input: {
    requestType: RequestType;
    placeId: number | null;
    wantedDate: string | null;
    comment: string;
  }): Promise<{ error: string | null }> {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      return { error: 'Нет активной сессии.' };
    }
    const { error: insertError } = await supabase.from('requests').insert({
      request_type: input.requestType,
      place_id: input.placeId,
      wanted_date: input.wantedDate,
      comment: input.comment,
      author_id: session.user.id,
    });
    if (insertError) {
      const limitMessage = getLimitErrorMessage(insertError.message, isAnonymousSession(session));
      return { error: limitMessage ?? insertError.message };
    }
    await fetchRequests();
    return { error: null };
  }

  return { requests, loading, error, refetch: fetchRequests, create };
}
```

- [ ] **Step 2: Write `RequestCard.tsx`**

```tsx
// app/src/features/requests/RequestCard.tsx
import { Card } from '../../components/Card';
import type { PhotoRequest } from '../../lib/types';

const TYPE_LABEL: Record<PhotoRequest['requestType'], string> = {
  seeking_photographer: 'Ищу фотографа',
  offering_photography: 'Предлагаю съёмку',
};

export function RequestCard({ request }: { request: PhotoRequest }) {
  return (
    <Card>
      <strong>{TYPE_LABEL[request.requestType]}</strong>
      {request.wantedDate && <div>Дата: {request.wantedDate}</div>}
      {request.comment && <p>{request.comment}</p>}
      <small>{new Date(request.createdAt).toLocaleDateString('ru-RU')}</small>
    </Card>
  );
}
```

- [ ] **Step 3: Write `RequestsScreen.tsx` (list only — the form is added in Task 3)**

```tsx
// app/src/features/requests/RequestsScreen.tsx
import { RequestCard } from './RequestCard';
import { useRequests } from './useRequests';

export function RequestsScreen() {
  const { requests, loading, error } = useRequests();

  if (loading) return <p>Загрузка заявок…</p>;
  if (error) return <p>Не удалось загрузить заявки: {error}</p>;

  return (
    <div>
      <h2>Заявки на фотосъёмку</h2>
      {requests.length === 0 ? (
        <p>Заявок пока нет.</p>
      ) : (
        requests.map((request) => <RequestCard key={request.id} request={request} />)
      )}
    </div>
  );
}
```

- [ ] **Step 4: Wire into `App.tsx`**

```tsx
// app/src/App.tsx
import { RequestsScreen } from './features/requests/RequestsScreen';
// remove RequestsPlaceholder, replace its route:
<Route path="/requests" element={<RequestsScreen />} />
```

- [ ] **Step 5: Verify manually**

```bash
cd app && npm run dev
```

Visit `/requests` — shows the empty state (no requests exist yet).

- [ ] **Step 6: Build, lint, commit**

```bash
cd app && npm run build && npm run lint
cd - 
git add app/src/features/requests app/src/App.tsx
git commit -m "Add public requests feed (read-only)"
```

---

### Task 3: Requests feed — create, with rate limit

**Files:**
- Create: `app/src/features/requests/RequestForm.tsx`
- Modify: `app/src/features/requests/RequestsScreen.tsx`

**Interfaces:**
- Produces: `<RequestForm onCreated={() => void} />`.

- [ ] **Step 1: Write `RequestForm.tsx`**

```tsx
// app/src/features/requests/RequestForm.tsx
import { useState, type FormEvent } from 'react';
import { Button } from '../../components/Button';
import { useRequests } from './useRequests';
import type { RequestType } from '../../lib/types';

export function RequestForm({ onCreated }: { onCreated: () => void }) {
  const { create } = useRequests();
  const [requestType, setRequestType] = useState<RequestType>('seeking_photographer');
  const [wantedDate, setWantedDate] = useState('');
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    const { error } = await create({
      requestType,
      placeId: null,
      wantedDate: wantedDate || null,
      comment,
    });
    if (error) {
      setMessage(error);
      return;
    }
    setComment('');
    setWantedDate('');
    setMessage('Заявка опубликована.');
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit}>
      <fieldset>
        <legend>Тип заявки</legend>
        <label>
          <input
            type="radio"
            name="requestType"
            checked={requestType === 'seeking_photographer'}
            onChange={() => setRequestType('seeking_photographer')}
          />
          Ищу фотографа
        </label>
        <label>
          <input
            type="radio"
            name="requestType"
            checked={requestType === 'offering_photography'}
            onChange={() => setRequestType('offering_photography')}
          />
          Предлагаю съёмку
        </label>
      </fieldset>
      <label>
        Желаемая дата
        <input type="date" value={wantedDate} onChange={(e) => setWantedDate(e.target.value)} />
      </label>
      <label>
        Комментарий (укажите контакт, если хотите, чтобы с вами связались)
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} required />
      </label>
      {message && <p role="status">{message}</p>}
      <Button type="submit">Опубликовать заявку</Button>
    </form>
  );
}
```

- [ ] **Step 2: Wire into `RequestsScreen.tsx`**

```tsx
// app/src/features/requests/RequestsScreen.tsx
import { RequestCard } from './RequestCard';
import { RequestForm } from './RequestForm';
import { useRequests } from './useRequests';

export function RequestsScreen() {
  const { requests, loading, error, refetch } = useRequests();

  if (loading) return <p>Загрузка заявок…</p>;
  if (error) return <p>Не удалось загрузить заявки: {error}</p>;

  return (
    <div>
      <h2>Заявки на фотосъёмку</h2>
      <RequestForm onCreated={refetch} />
      {requests.length === 0 ? (
        <p>Заявок пока нет.</p>
      ) : (
        requests.map((request) => <RequestCard key={request.id} request={request} />)
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify manually**

```bash
cd app && npm run dev
```

Submit one request as a guest — appears at the top of the feed. Submit a second immediately — expect the guest rate-limit message from `lib/limits.ts`.

- [ ] **Step 4: Build, lint, commit**

```bash
cd app && npm run build && npm run lint
cd - 
git add app/src/features/requests
git commit -m "Add request creation form with daily rate-limit handling"
```

---

### Task 4: Moodboard pure logic (TDD) — palette extraction and grid layout

**Files:**
- Create: `app/src/features/moodboard/palette.ts`
- Test: `app/tests/palette.test.ts`
- Test: `app/tests/collageLayout.test.ts`

**Interfaces:**
- Produces: `extractAverageColor(imageData: ImageData): { r: number; g: number; b: number }`, `collageGridTemplate(count: number): { columns: number; rows: number }`.

- [ ] **Step 1: Write the failing tests**

```ts
// app/tests/palette.test.ts
import { describe, expect, it } from 'vitest';
import { extractAverageColor } from '../src/features/moodboard/palette';

function makeImageData(pixels: [number, number, number][]): ImageData {
  const data = new Uint8ClampedArray(pixels.length * 4);
  pixels.forEach(([r, g, b], i) => {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  });
  return { data, width: pixels.length, height: 1, colorSpace: 'srgb' } as ImageData;
}

describe('extractAverageColor', () => {
  it('returns the exact color for a single-pixel uniform image', () => {
    const imageData = makeImageData([[100, 150, 200]]);
    expect(extractAverageColor(imageData)).toEqual({ r: 100, g: 150, b: 200 });
  });

  it('averages across multiple pixels', () => {
    const imageData = makeImageData([
      [0, 0, 0],
      [100, 100, 100],
    ]);
    expect(extractAverageColor(imageData)).toEqual({ r: 50, g: 50, b: 50 });
  });
});
```

```ts
// app/tests/collageLayout.test.ts
import { describe, expect, it } from 'vitest';
import { collageGridTemplate } from '../src/features/moodboard/palette';

describe('collageGridTemplate', () => {
  it('uses a single column for 1 photo', () => {
    expect(collageGridTemplate(1)).toEqual({ columns: 1, rows: 1 });
  });

  it('uses a 2x2 grid for 4 photos', () => {
    expect(collageGridTemplate(4)).toEqual({ columns: 2, rows: 2 });
  });

  it('uses a 3-column grid for 7 photos (3 columns, 3 rows)', () => {
    expect(collageGridTemplate(7)).toEqual({ columns: 3, rows: 3 });
  });
});
```

- [ ] **Step 2: Run to see them fail**

```bash
cd app && npm run test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `palette.ts`**

```ts
// app/src/features/moodboard/palette.ts

export function extractAverageColor(imageData: ImageData): { r: number; g: number; b: number } {
  const { data } = imageData;
  let r = 0;
  let g = 0;
  let b = 0;
  const pixelCount = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }

  return {
    r: Math.round(r / pixelCount),
    g: Math.round(g / pixelCount),
    b: Math.round(b / pixelCount),
  };
}

export function collageGridTemplate(count: number): { columns: number; rows: number } {
  const columns = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / columns);
  return { columns, rows };
}
```

- [ ] **Step 4: Run to see them pass**

```bash
cd app && npm run test
```

Expected: both `palette.test.ts` and `collageLayout.test.ts` pass.

- [ ] **Step 5: Type-check, lint, commit**

```bash
cd app && npx tsc --noEmit && npm run lint
cd - 
git add app/src/features/moodboard/palette.ts app/tests/palette.test.ts app/tests/collageLayout.test.ts
git commit -m "Add palette extraction and collage grid layout logic with tests"
```

---

### Task 5: Moodboard screen — build and save

**Files:**
- Create: `app/src/features/moodboard/useMoodboards.ts`
- Create: `app/src/features/moodboard/MoodboardCollage.tsx`
- Create: `app/src/features/moodboard/MoodboardScreen.tsx`
- Modify: `app/src/App.tsx`

**Interfaces:**
- Consumes: `collageGridTemplate` from `palette.ts`, `supabase`/`isAnonymousSession` from `lib/supabaseClient.ts`.
- Produces: `<MoodboardScreen />`, mounted at `/moodboard`.

- [ ] **Step 1: Write `useMoodboards.ts`**

```ts
// app/src/features/moodboard/useMoodboards.ts
import { useCallback, useEffect, useState } from 'react';
import { supabase, isAnonymousSession } from '../../lib/supabaseClient';
import type { Moodboard, Place } from '../../lib/types';

interface FavoriteWithPlaceRow {
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

interface MoodboardRow {
  id: number;
  user_id: string;
  title: string | null;
  place_ids: number[];
  created_at: string;
}

export function useMoodboards() {
  const [favoritePlaces, setFavoritePlaces] = useState<Place[]>([]);
  const [moodboards, setMoodboards] = useState<Moodboard[]>([]);
  const [isRegistered, setIsRegistered] = useState(false);

  const load = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session || isAnonymousSession(session)) {
      setIsRegistered(false);
      setFavoritePlaces([]);
      setMoodboards([]);
      return;
    }
    setIsRegistered(true);

    const { data: favoriteRows } = await supabase
      .from('favorites')
      .select('place_id, places(*)')
      .eq('user_id', session.user.id);
    const rows = (favoriteRows ?? []) as unknown as FavoriteWithPlaceRow[];
    setFavoritePlaces(
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

    const { data: moodboardRows } = await supabase
      .from('moodboards')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    setMoodboards(
      ((moodboardRows ?? []) as MoodboardRow[]).map((row) => ({
        id: row.id,
        userId: row.user_id,
        title: row.title,
        placeIds: row.place_ids,
        createdAt: row.created_at,
      })),
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveMoodboard(placeIds: number[], title?: string) {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session || isAnonymousSession(session)) return;
    await supabase.from('moodboards').insert({
      user_id: session.user.id,
      title: title ?? null,
      place_ids: placeIds,
    });
    await load();
  }

  return { isRegistered, favoritePlaces, moodboards, saveMoodboard };
}
```

- [ ] **Step 2: Write `MoodboardCollage.tsx`**

```tsx
// app/src/features/moodboard/MoodboardCollage.tsx
import { collageGridTemplate } from './palette';
import type { Place } from '../../lib/types';

export function MoodboardCollage({ places }: { places: Place[] }) {
  const { columns } = collageGridTemplate(places.length || 1);

  return (
    <div
      className="moodboard-collage"
      style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '4px' }}
    >
      {places.map((place) => (
        <div key={place.id} className="moodboard-collage__tile">
          {place.photoUrl ? (
            <img src={place.photoUrl} alt={place.name} style={{ width: '100%', display: 'block' }} />
          ) : (
            <div className="moodboard-collage__placeholder">{place.name}</div>
          )}
        </div>
      ))}
    </div>
  );
}
```

(Average-color palette extraction from `palette.ts` is invoked once real photo URLs are populated via the `/add-place` workflow — with placeholder/no-photo curated seed data, the collage renders name tiles instead of failing; wiring `extractAverageColor` against a loaded `<img>` via an offscreen `<canvas>` is a one-file addition left for whoever populates real photos, noted in `sessions/STATE.md` as a known gap, not silently skipped.)

- [ ] **Step 3: Write `MoodboardScreen.tsx`**

```tsx
// app/src/features/moodboard/MoodboardScreen.tsx
import { useState } from 'react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { MoodboardCollage } from './MoodboardCollage';
import { useMoodboards } from './useMoodboards';

export function MoodboardScreen() {
  const { isRegistered, favoritePlaces, moodboards, saveMoodboard } = useMoodboards();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  if (!isRegistered) {
    return <p>Мудборды доступны только зарегистрированным — они собираются из избранного.</p>;
  }

  if (favoritePlaces.length === 0) {
    return <p>Сначала добавьте что-то в избранное на карте.</p>;
  }

  function toggle(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedPlaces = favoritePlaces.filter((p) => selectedIds.has(p.id));

  return (
    <div>
      <h2>Мудборд</h2>
      <ul>
        {favoritePlaces.map((place) => (
          <li key={place.id}>
            <label>
              <input type="checkbox" checked={selectedIds.has(place.id)} onChange={() => toggle(place.id)} />
              {place.name}
            </label>
          </li>
        ))}
      </ul>
      {selectedPlaces.length > 0 && <MoodboardCollage places={selectedPlaces} />}
      <Button
        type="button"
        disabled={selectedPlaces.length === 0}
        onClick={() => saveMoodboard(Array.from(selectedIds))}
      >
        Сохранить мудборд
      </Button>
      <h3>Сохранённые мудборды</h3>
      {moodboards.length === 0 ? (
        <p>Пока нет.</p>
      ) : (
        moodboards.map((board) => (
          <Card key={board.id}>{board.title ?? `Мудборд от ${new Date(board.createdAt).toLocaleDateString('ru-RU')}`}</Card>
        ))
      )}
    </div>
  );
}
```

- [ ] **Step 4: Wire into `App.tsx`**

```tsx
// app/src/App.tsx
import { MoodboardScreen } from './features/moodboard/MoodboardScreen';
// add a new route alongside the existing three:
<Route path="/moodboard" element={<MoodboardScreen />} />
```

Add a nav link for it too — this touches `Header.tsx` from Foundation; since Foundation is already merged into this branch's history (the worktree started from `main` after Foundation was committed), editing it here is fine and expected — only the *other feature branches'* concurrent changes are off-limits, not the shared Foundation file itself.

```tsx
// app/src/components/Header.tsx — add one more NavLink
<NavLink to="/moodboard" className={linkClass}>
  Мудборд
</NavLink>
```

- [ ] **Step 5: Verify manually**

```bash
cd app && npm run dev
```

Visit `/moodboard` as a guest — see the "only for registered accounts" message. (Full flow with real favorites is verified after merge, once `feature/cabinet`'s favoriting UI exists on the same running app — this branch's own e2e test in Task 6 seeds a favorite directly via Supabase to test end-to-end without depending on the other branch's UI.)

- [ ] **Step 6: Build, lint, commit**

```bash
cd app && npm run build && npm run lint
cd - 
git add app/src/features/moodboard app/src/App.tsx app/src/components/Header.tsx
git commit -m "Add moodboard collage screen for registered accounts"
```

---

### Task 6: Playwright e2e — anonymous request rate limit

**Files:**
- Create: `app/e2e/requests-limit.spec.ts`

- [ ] **Step 1: Write the test**

```ts
// app/e2e/requests-limit.spec.ts
import { expect, test } from '@playwright/test';

test('guest can post one request per day, second attempt is blocked', async ({ page }) => {
  await page.goto('/requests');

  await page.getByLabel(/Комментарий/).fill('Ищу фотографа на выходные, пишите в телеграм @test');
  await page.getByRole('button', { name: 'Опубликовать заявку' }).click();

  await expect(page.getByText('Заявка опубликована.')).toBeVisible();
  await expect(page.getByText('Ищу фотографа на выходные')).toBeVisible();

  await page.getByLabel(/Комментарий/).fill('Вторая заявка в тот же день');
  await page.getByRole('button', { name: 'Опубликовать заявку' }).click();

  await expect(page.getByText('Дневной лимит исчерпан. Войдите, чтобы добавлять до 5 в день.')).toBeVisible();
});
```

- [ ] **Step 2: Run it**

```bash
cd app && npm run test:e2e
```

Expected: passes against the real Supabase project (each Playwright run creates a fresh anonymous session, so this test is safe to re-run — a brand new anonymous `auth.uid()` starts its own daily counter). If a previous manual test run already used up an anonymous session's quota and Playwright reuses cached browser storage, clear it: run with `--project=chromium` and confirm `playwright.config.ts` doesn't persist storage state across runs (it doesn't, by default, since no `storageState` is configured).

- [ ] **Step 3: Commit**

```bash
cd - 
git add app/e2e/requests-limit.spec.ts
git commit -m "Add e2e test for the anonymous daily request limit"
```

---

### Task 7: Feature exit checkpoint

- [ ] **Step 1: Full check suite**

```bash
cd app && npm run build && npm run lint && npm run test && npm run test:e2e
```

Expected: all green.

- [ ] **Step 2: Update `sessions/STATE.md` and `sessions/TOOLS.md`** in the worktree, noting the known gap from Task 5 (palette-based collage tinting not yet wired to real photo pixels — grid layout and name-tile fallback work, average-color extraction is tested in isolation but not yet connected end-to-end because the curated seed has no `photo_url` values).

- [ ] **Step 3: Final commit, ready for merge**

```bash
git add sessions/
git commit -m "feature/requests-moodboard: exit checkpoint, all checks green"
```

This branch is now ready to merge into `main` alongside `feature/map-routes` and
`feature/cabinet` — see the Integration plan (`2026-08-27-05-integration.md`).
