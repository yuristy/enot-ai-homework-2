# Feature: Map & Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the map screen — place markers, tag filters, multi-select route builder, start-point picker, nearest-neighbor route rendering with time/distance/difficulty, URL-based sharing, and the guest-facing "add a place" form.

**Architecture:** A `feature/map-routes` git worktree on its own branch, built on top of the completed Foundation plan. All map state lives in one screen component (`MapScreen.tsx`) that composes smaller presentational pieces; route math and URL encoding are already implemented and tested in `app/src/lib/route.ts` — this plan only wires them to the UI.

**Tech Stack:** React 19, react-leaflet + Leaflet, `@supabase/supabase-js` (already configured), the Foundation's `lib/route.ts`, `lib/places.ts`, `lib/limits.ts`, `lib/types.ts`, `lib/supabaseClient.ts`.

**Spec:** `/Users/yuri/developer/enot-ai-homework-2/docs/superpowers/specs/2026-08-27-moscow-photo-map-design.md` (§6, §11)

## Global Constraints

- Runs in its own worktree/branch (`feature/map-routes`), touches only `app/src/features/map/` plus the `/` route wiring in `App.tsx` — never edits `feature/cabinet` or `feature/requests-moodboard` files.
- Depends on Foundation being complete: `lib/route.ts`, `lib/places.ts`, `lib/limits.ts`, `lib/types.ts`, `lib/supabaseClient.ts`, `components/Button.tsx`, `components/Card.tsx` already exist — import them, do not redefine them.
- Multi-select, route building, and route viewing by URL require **no login** (spec §2, §6).
- Adding a place is available to anonymous sessions too, capped by the Postgres trigger already in place; on a `rate_limit_exceeded` error, show the message from `lib/limits.ts`, don't invent new copy.
- Distances are straight-line (haversine), not road-network — the UI must say so, not imply turn-by-turn accuracy (spec §15).
- Every new piece of pure logic gets a Vitest test; the golden-path flow gets a Playwright test; keyboard access to map markers gets its own Playwright test (spec §14 — this is the exact gap the ДЗ №1 audit caught last time).

---

## File Structure

```
app/src/features/map/
  MapScreen.tsx          -- top-level screen, owns route-builder state
  PlacesMap.tsx           -- react-leaflet map + markers (curated vs user badge)
  PlaceCard.tsx           -- single place summary + "add to route" toggle + favorite slot (favorite button itself lives in feature/cabinet, this just renders a placeholder slot — see Task 3)
  TagFilter.tsx           -- tag checkboxes filtering the place list/markers
  RouteTray.tsx           -- bottom tray: selected count, start-point picker, "build route" button
  RouteSummary.tsx        -- distance/time/difficulty panel + polyline data
  AddPlaceForm.tsx        -- guest/registered place submission form
  usePlaces.ts            -- data hook: fetch places from Supabase
  useRouteState.ts        -- selection + start point + URL sync state hook
app/tests/
  useRouteState.test.ts   -- pure reducer logic extracted for testability
app/e2e/
  route-sharing.spec.ts
  map-keyboard-nav.spec.ts
```

**Responsibilities:**
- `usePlaces.ts` — `usePlaces(): { places: Place[]; loading: boolean; error: string | null; refetch: () => void }`, wraps `supabase.from('places').select('*')`.
- `useRouteState.ts` — exposes `{ state: RouteState, toggleSelected, setStart, clearStart, selectedPlaces, built, estimate, shareUrl }`; the id-selection/start-point logic is a plain reducer (`routeReducer`) exported separately so it can be unit-tested without React. URL sync on load is internal (a `useEffect` calling `parseRouteFromUrl`), not a separately exposed function.
- `MapScreen.tsx` — composes `PlacesMap`, `TagFilter`, `RouteTray`, `RouteSummary`, `AddPlaceForm`; the only place that talks to both `usePlaces` and `useRouteState`.

---

### Task 1: Worktree setup

- [ ] **Step 1: Create the worktree and branch**

```bash
cd /Users/yuri/developer/enot-ai-homework-2
git worktree add ../work-map-routes -b feature/map-routes
cd ../work-map-routes/app
npm install
```

- [ ] **Step 2: Confirm the foundation is intact**

```bash
npm run build && npm run lint && npm run test && npm run test:e2e
```

Expected: all four green (this is the Foundation's own exit checkpoint, re-verified in the new worktree).

---

### Task 2: Install react-leaflet and render the base map

**Files:**
- Create: `app/src/features/map/PlacesMap.tsx`
- Create: `app/src/features/map/usePlaces.ts`
- Modify: `app/src/App.tsx`

**Interfaces:**
- Produces: `usePlaces(): { places: Place[]; loading: boolean; error: string | null }`, `<PlacesMap places={Place[]} selectedIds={Set<number>} onToggleSelect={(id: number) => void} />`.

- [ ] **Step 1: Install dependencies**

```bash
cd app
npm view react-leaflet version
npm view leaflet version
npm view @types/leaflet version
npm install --save-exact react-leaflet@<version> leaflet@<version>
npm install --save-exact --save-dev @types/leaflet@<version>
```

Check peer deps before installing:

```bash
npm view react-leaflet peerDependencies
```

Confirm the printed `react`/`react-dom` range includes React 19 (already in the project); if not, note the mismatch in `sessions/session-N.md` and pick the compatible major version instead.

- [ ] **Step 2: Import Leaflet's CSS**

```ts
// app/src/main.tsx (add near the top, alongside './index.css')
import 'leaflet/dist/leaflet.css';
```

- [ ] **Step 3: Write `usePlaces.ts`**

```ts
// app/src/features/map/usePlaces.ts
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import type { Place } from '../../lib/types';

interface PlaceRow {
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
}

function toPlace(row: PlaceRow): Place {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    lat: row.lat,
    lng: row.lng,
    tags: row.tags,
    photoUrl: row.photo_url,
    source: row.source,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export function usePlaces() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchPlaces() {
    setLoading(true);
    const { data, error: fetchError } = await supabase.from('places').select('*');
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setPlaces((data as PlaceRow[]).map(toPlace));
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchPlaces();
  }, []);

  return { places, loading, error, refetch: fetchPlaces };
}
```

- [ ] **Step 4: Write `PlacesMap.tsx`**

```tsx
// app/src/features/map/PlacesMap.tsx
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import type { Place } from '../../lib/types';

const MOSCOW_CENTER: [number, number] = [55.7558, 37.6173];

interface PlacesMapProps {
  places: Place[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
}

export function PlacesMap({ places, selectedIds, onToggleSelect }: PlacesMapProps) {
  return (
    <MapContainer center={MOSCOW_CENTER} zoom={11} style={{ height: '500px', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {places.map((place) => (
        <Marker
          key={place.id}
          position={[place.lat, place.lng]}
          eventHandlers={{ click: () => onToggleSelect(place.id) }}
          keyboard
        >
          <Popup>
            <strong>{place.name}</strong>
            {place.source === 'user' && <div>от пользователя</div>}
            <div>
              <button type="button" onClick={() => onToggleSelect(place.id)}>
                {selectedIds.has(place.id) ? 'Убрать из маршрута' : 'Добавить в маршрут'}
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
```

- [ ] **Step 5: Wire a minimal `MapScreen` into `App.tsx` to see it render**

```tsx
// app/src/features/map/MapScreen.tsx (temporary minimal version — extended in Task 3+)
import { useState } from 'react';
import { PlacesMap } from './PlacesMap';
import { usePlaces } from './usePlaces';

export function MapScreen() {
  const { places, loading, error } = usePlaces();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading) return <p>Загрузка мест…</p>;
  if (error) return <p>Не удалось загрузить места: {error}</p>;

  return <PlacesMap places={places} selectedIds={selectedIds} onToggleSelect={toggleSelect} />;
}
```

```tsx
// app/src/App.tsx — replace MapPlaceholder usage
import { MapScreen } from './features/map/MapScreen';
// ...
<Route path="/" element={<MapScreen />} />
```

- [ ] **Step 6: Verify in the browser**

```bash
cd app && npm run dev
```

Open `http://localhost:5173/` — 12 markers appear over Moscow, clicking one opens a popup with a working toggle button.

- [ ] **Step 7: Build, lint, commit**

```bash
cd app && npm run build && npm run lint
cd /Users/yuri/developer/enot-ai-homework-2/.. # noop, stay in worktree
cd - 
git add app/src/features/map app/src/App.tsx app/src/main.tsx app/package.json app/package-lock.json
git commit -m "Render places on a Leaflet map with click-to-select"
```

---

### Task 3: Route selection state (TDD) and the route tray

**Files:**
- Create: `app/src/features/map/useRouteState.ts`
- Create: `app/src/features/map/RouteTray.tsx`
- Test: `app/tests/useRouteState.test.ts`
- Modify: `app/src/features/map/MapScreen.tsx`

**Interfaces:**
- Produces: `routeReducer(state, action)` (pure, tested), `useRouteState()` (React hook wrapping it), `<RouteTray selectedCount={number} hasStart={boolean} onUseGeolocation={() => void} onClearStart={() => void} onCopyLink={() => void} />`.

- [ ] **Step 1: Write the failing reducer test**

```ts
// app/tests/useRouteState.test.ts
import { describe, expect, it } from 'vitest';
import { routeReducer, type RouteState } from '../src/features/map/useRouteState';

const initial: RouteState = { selectedIds: [], start: null };

describe('routeReducer', () => {
  it('adds a place id on TOGGLE when not present', () => {
    const next = routeReducer(initial, { type: 'TOGGLE', id: 1 });
    expect(next.selectedIds).toEqual([1]);
  });

  it('removes a place id on TOGGLE when already present', () => {
    const state: RouteState = { selectedIds: [1, 2], start: null };
    const next = routeReducer(state, { type: 'TOGGLE', id: 1 });
    expect(next.selectedIds).toEqual([2]);
  });

  it('sets the start point on SET_START', () => {
    const next = routeReducer(initial, { type: 'SET_START', start: { lat: 1, lng: 2 } });
    expect(next.start).toEqual({ lat: 1, lng: 2 });
  });

  it('replaces the whole state on LOAD (used when syncing from a shared URL)', () => {
    const next = routeReducer(initial, {
      type: 'LOAD',
      selectedIds: [3, 4],
      start: { lat: 5, lng: 6 },
    });
    expect(next).toEqual({ selectedIds: [3, 4], start: { lat: 5, lng: 6 } });
  });
});
```

- [ ] **Step 2: Run to see it fail**

```bash
cd app && npm run test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `useRouteState.ts`**

```ts
// app/src/features/map/useRouteState.ts
import { useEffect, useReducer } from 'react';
import { buildRoute, buildRouteUrl, estimateRoute, parseRouteFromUrl } from '../../lib/route';
import type { Place } from '../../lib/types';

export interface StartPoint {
  lat: number;
  lng: number;
}

export interface RouteState {
  selectedIds: number[];
  start: StartPoint | null;
}

export type RouteAction =
  | { type: 'TOGGLE'; id: number }
  | { type: 'SET_START'; start: StartPoint }
  | { type: 'LOAD'; selectedIds: number[]; start: StartPoint };

export function routeReducer(state: RouteState, action: RouteAction): RouteState {
  switch (action.type) {
    case 'TOGGLE': {
      const has = state.selectedIds.includes(action.id);
      return {
        ...state,
        selectedIds: has
          ? state.selectedIds.filter((id) => id !== action.id)
          : [...state.selectedIds, action.id],
      };
    }
    case 'SET_START':
      return { ...state, start: action.start };
    case 'LOAD':
      return { selectedIds: action.selectedIds, start: action.start };
    default:
      return state;
  }
}

export function useRouteState(places: Place[]) {
  const [state, dispatch] = useReducer(routeReducer, { selectedIds: [], start: null });

  useEffect(() => {
    const parsed = parseRouteFromUrl(window.location.search);
    if (parsed) {
      dispatch({ type: 'LOAD', selectedIds: parsed.placeIds, start: parsed.start });
    }
  }, []);

  function toggleSelected(id: number) {
    dispatch({ type: 'TOGGLE', id });
  }

  function setStart(start: StartPoint) {
    dispatch({ type: 'SET_START', start });
  }

  const selectedPlaces = places.filter((p) => state.selectedIds.includes(p.id));
  const built = state.start
    ? buildRoute(
        state.start,
        selectedPlaces.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng })),
      )
    : null;
  const estimate = built ? estimateRoute(built.totalDistanceKm, selectedPlaces.length) : null;

  function shareUrl(): string {
    if (!state.start) return '';
    const url = new URL(window.location.href);
    url.search = buildRouteUrl(state.start.lat, state.start.lng, state.selectedIds);
    return url.toString();
  }

  return { state, toggleSelected, setStart, selectedPlaces, built, estimate, shareUrl };
}
```

- [ ] **Step 4: Run to see the reducer tests pass**

```bash
cd app && npm run test
```

Expected: all tests in `useRouteState.test.ts` pass.

- [ ] **Step 5: Write `RouteTray.tsx`**

```tsx
// app/src/features/map/RouteTray.tsx
import { Button } from '../../components/Button';

interface RouteTrayProps {
  selectedCount: number;
  hasStart: boolean;
  onUseGeolocation: () => void;
  onClearStart: () => void;
  onCopyLink: () => void;
}

export function RouteTray({
  selectedCount,
  hasStart,
  onUseGeolocation,
  onClearStart,
  onCopyLink,
}: RouteTrayProps) {
  return (
    <div className="route-tray">
      <span>Выбрано мест: {selectedCount}</span>
      {!hasStart && (
        <Button type="button" onClick={onUseGeolocation}>
          Начать с моей геолокации
        </Button>
      )}
      {hasStart && (
        <Button type="button" variant="secondary" onClick={onClearStart}>
          Сбросить старт
        </Button>
      )}
      {hasStart && selectedCount > 0 && (
        <Button type="button" variant="secondary" onClick={onCopyLink}>
          Скопировать ссылку на маршрут
        </Button>
      )}
    </div>
  );
}
```

Note: the start point can also be set by clicking the map or picking a selected place — those two entry points are wired in Task 4 (`PlacesMap` gets a "set as start" affordance) rather than duplicated here.

- [ ] **Step 6: Wire `useRouteState` and `RouteTray` into `MapScreen`**

```tsx
// app/src/features/map/MapScreen.tsx (replace the Task 2 version)
import { useState } from 'react';
import { PlacesMap } from './PlacesMap';
import { RouteTray } from './RouteTray';
import { useRouteState } from './useRouteState';
import { usePlaces } from './usePlaces';

export function MapScreen() {
  const { places, loading, error } = usePlaces();
  const { state, toggleSelected, setStart, selectedPlaces, built, estimate, shareUrl } =
    useRouteState(places);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  function handleUseGeolocation() {
    navigator.geolocation.getCurrentPosition(
      (position) => setStart({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => setCopyFeedback('Не удалось получить геолокацию — кликните по карте, чтобы задать старт.'),
    );
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(shareUrl());
    setCopyFeedback('Ссылка скопирована');
  }

  if (loading) return <p>Загрузка мест…</p>;
  if (error) return <p>Не удалось загрузить места: {error}</p>;

  return (
    <div>
      <PlacesMap
        places={places}
        selectedIds={new Set(state.selectedIds)}
        onToggleSelect={toggleSelected}
        onMapClickSetStart={setStart}
      />
      <RouteTray
        selectedCount={state.selectedIds.length}
        hasStart={state.start !== null}
        onUseGeolocation={handleUseGeolocation}
        onClearStart={() => setStart(undefined as never)}
        onCopyLink={handleCopyLink}
      />
      {copyFeedback && <p role="status">{copyFeedback}</p>}
      {/* built/estimate summary panel (RouteSummary) is wired in Task 4,
          once the component and the route polyline exist — rendering it
          here would import a file that doesn't exist yet in this task */}
    </div>
  );
}
```

(`onClearStart` calling `setStart(undefined as never)` is a placeholder wiring issue fixed properly in Step 7 below — `useRouteState` needs a real `clearStart` action instead of abusing `SET_START`. `built` and `estimate` are already returned by `useRouteState` here but deliberately unused until Task 4 wires `RouteSummary` — if the linter flags them as unused, prefix with `_` or destructure them again in Task 4's replacement of this function, which is the norm for this plan: later tasks replace the whole `MapScreen.tsx` body rather than patching fragments.)

- [ ] **Step 7: Fix `useRouteState` to add a proper `CLEAR_START` action**

```ts
// app/src/features/map/useRouteState.ts — extend RouteAction and reducer
export type RouteAction =
  | { type: 'TOGGLE'; id: number }
  | { type: 'SET_START'; start: StartPoint }
  | { type: 'CLEAR_START' }
  | { type: 'LOAD'; selectedIds: number[]; start: StartPoint };
```

```ts
// inside routeReducer's switch, add:
    case 'CLEAR_START':
      return { ...state, start: null };
```

```ts
// in useRouteState(), add alongside setStart:
  function clearStart() {
    dispatch({ type: 'CLEAR_START' });
  }
  // ...and include `clearStart` in the returned object
```

Update the corresponding test file with one more case:

```ts
// app/tests/useRouteState.test.ts (add)
  it('clears the start point on CLEAR_START', () => {
    const state: RouteState = { selectedIds: [1], start: { lat: 1, lng: 2 } };
    const next = routeReducer(state, { type: 'CLEAR_START' });
    expect(next.start).toBeNull();
  });
```

Update `MapScreen.tsx`'s `onClearStart={() => setStart(undefined as never)}` to `onClearStart={clearStart}` (destructure `clearStart` from `useRouteState`).

- [ ] **Step 8: Run tests, verify in browser, build, lint**

```bash
cd app && npm run test && npm run build && npm run lint && npm run dev
```

Manually: select 2+ markers, use geolocation (or click map — added in Task 4) to set a start, confirm the tray shows the right count and buttons.

- [ ] **Step 9: Commit**

```bash
cd - # ensure in worktree
git add app/src/features/map app/tests/useRouteState.test.ts
git commit -m "Add route selection state (tested reducer) and route tray UI"
```

---

### Task 4: Map click sets start point, and the route polyline/summary

**Files:**
- Modify: `app/src/features/map/PlacesMap.tsx`
- Create: `app/src/features/map/RouteSummary.tsx`

**Interfaces:**
- Produces: `<PlacesMap ... onMapClickSetStart={(point: StartPoint) => void} />` (extends Task 2's props), `<RouteSummary orderedPlaces={Place[]} totalDistanceKm={number} minutes={number} difficulty={RouteDifficulty} />`.

- [ ] **Step 1: Add a click handler and polyline support to `PlacesMap.tsx`**

```tsx
// app/src/features/map/PlacesMap.tsx (add imports and a click-catcher component)
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import type { Place } from '../../lib/types';
import type { StartPoint } from './useRouteState';

function ClickCatcher({ onClick }: { onClick: (point: StartPoint) => void }) {
  useMapEvents({
    click(e) {
      onClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

interface PlacesMapProps {
  places: Place[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onMapClickSetStart: (point: StartPoint) => void;
  routePolyline?: [number, number][];
}

export function PlacesMap({
  places,
  selectedIds,
  onToggleSelect,
  onMapClickSetStart,
  routePolyline,
}: PlacesMapProps) {
  const MOSCOW_CENTER: [number, number] = [55.7558, 37.6173];
  return (
    <MapContainer center={MOSCOW_CENTER} zoom={11} style={{ height: '500px', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickCatcher onClick={onMapClickSetStart} />
      {routePolyline && routePolyline.length > 1 && (
        <Polyline positions={routePolyline} pathOptions={{ color: '#333' }} />
      )}
      {places.map((place) => (
        <Marker
          key={place.id}
          position={[place.lat, place.lng]}
          eventHandlers={{ click: () => onToggleSelect(place.id) }}
          keyboard
        >
          <Popup>
            <strong>{place.name}</strong>
            {place.source === 'user' && <div>от пользователя</div>}
            <div>
              <button type="button" onClick={() => onToggleSelect(place.id)}>
                {selectedIds.has(place.id) ? 'Убрать из маршрута' : 'Добавить в маршрут'}
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
```

- [ ] **Step 2: Write `RouteSummary.tsx`**

```tsx
// app/src/features/map/RouteSummary.tsx
import { Card } from '../../components/Card';
import type { Place } from '../../lib/types';
import type { RouteDifficulty } from '../../lib/route';

const DIFFICULTY_LABEL: Record<RouteDifficulty, string> = {
  easy: 'Лёгкий',
  medium: 'Средний',
  hard: 'Сложный',
};

interface RouteSummaryProps {
  orderedPlaces: Place[];
  totalDistanceKm: number;
  minutes: number;
  difficulty: RouteDifficulty;
}

export function RouteSummary({ orderedPlaces, totalDistanceKm, minutes, difficulty }: RouteSummaryProps) {
  return (
    <Card className="route-summary">
      <p>
        Маршрут: {totalDistanceKm.toFixed(1)} км по прямой, ~{minutes} мин,
        сложность: {DIFFICULTY_LABEL[difficulty]}
      </p>
      <ol>
        {orderedPlaces.map((place) => (
          <li key={place.id}>{place.name}</li>
        ))}
      </ol>
    </Card>
  );
}
```

- [ ] **Step 3: Wire the polyline and `RouteSummary` into `MapScreen`** (this replaces the whole file body from Task 3 — the summary panel that Task 3 deliberately left out now has a component to render)

```tsx
// app/src/features/map/MapScreen.tsx (replace the Task 3 version)
import { useState } from 'react';
import { PlacesMap } from './PlacesMap';
import { RouteTray } from './RouteTray';
import { RouteSummary } from './RouteSummary';
import { useRouteState } from './useRouteState';
import { usePlaces } from './usePlaces';

export function MapScreen() {
  const { places, loading, error } = usePlaces();
  const { state, toggleSelected, setStart, clearStart, selectedPlaces, built, estimate, shareUrl } =
    useRouteState(places);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  function handleUseGeolocation() {
    navigator.geolocation.getCurrentPosition(
      (position) => setStart({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => setCopyFeedback('Не удалось получить геолокацию — кликните по карте, чтобы задать старт.'),
    );
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(shareUrl());
    setCopyFeedback('Ссылка скопирована');
  }

  if (loading) return <p>Загрузка мест…</p>;
  if (error) return <p>Не удалось загрузить места: {error}</p>;

  const polyline: [number, number][] | undefined =
    built && state.start
      ? [
          [state.start.lat, state.start.lng] as [number, number],
          ...built.orderedIds.map((id) => {
            const place = selectedPlaces.find((p) => p.id === id)!;
            return [place.lat, place.lng] as [number, number];
          }),
        ]
      : undefined;

  return (
    <div>
      <PlacesMap
        places={places}
        selectedIds={new Set(state.selectedIds)}
        onToggleSelect={toggleSelected}
        onMapClickSetStart={setStart}
        routePolyline={polyline}
      />
      <RouteTray
        selectedCount={state.selectedIds.length}
        hasStart={state.start !== null}
        onUseGeolocation={handleUseGeolocation}
        onClearStart={clearStart}
        onCopyLink={handleCopyLink}
      />
      {copyFeedback && <p role="status">{copyFeedback}</p>}
      {built && estimate && (
        <RouteSummary
          orderedPlaces={built.orderedIds.map((id) => selectedPlaces.find((p) => p.id === id)!)}
          totalDistanceKm={built.totalDistanceKm}
          minutes={estimate.minutes}
          difficulty={estimate.difficulty}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify manually**

```bash
cd app && npm run dev
```

Select 3 markers, click an empty spot on the map to set the start, confirm a polyline draws through the markers in nearest-neighbor order and the summary panel shows distance/time/difficulty text matching the values from `estimateRoute`.

- [ ] **Step 5: Build, lint, commit**

```bash
cd app && npm run build && npm run lint
cd - 
git add app/src/features/map
git commit -m "Render route polyline and distance/time/difficulty summary"
```

---

### Task 5: Tag filter

**Files:**
- Create: `app/src/features/map/TagFilter.tsx`
- Modify: `app/src/features/map/MapScreen.tsx`

**Interfaces:**
- Produces: `<TagFilter allTags={string[]} activeTags={Set<string>} onToggle={(tag: string) => void} />`.

- [ ] **Step 1: Write `TagFilter.tsx`**

```tsx
// app/src/features/map/TagFilter.tsx
interface TagFilterProps {
  allTags: string[];
  activeTags: Set<string>;
  onToggle: (tag: string) => void;
}

export function TagFilter({ allTags, activeTags, onToggle }: TagFilterProps) {
  return (
    <div className="tag-filter" role="group" aria-label="Фильтр по тегам">
      {allTags.map((tag) => (
        <label key={tag}>
          <input
            type="checkbox"
            checked={activeTags.has(tag)}
            onChange={() => onToggle(tag)}
          />
          {tag}
        </label>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Wire filtering into `MapScreen.tsx`**

```tsx
// app/src/features/map/MapScreen.tsx — add near the top of the component
const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
const allTags = Array.from(new Set(places.flatMap((p) => p.tags))).sort();

function toggleTag(tag: string) {
  setActiveTags((prev) => {
    const next = new Set(prev);
    if (next.has(tag)) next.delete(tag);
    else next.add(tag);
    return next;
  });
}

const visiblePlaces =
  activeTags.size === 0 ? places : places.filter((p) => p.tags.some((t) => activeTags.has(t)));
```

Replace `places={places}` on `<PlacesMap>` with `places={visiblePlaces}`, and render `<TagFilter allTags={allTags} activeTags={activeTags} onToggle={toggleTag} />` above the map.

- [ ] **Step 3: Verify manually, build, lint, commit**

```bash
cd app && npm run dev   # check that checking a tag hides non-matching markers
npm run build && npm run lint
cd - 
git add app/src/features/map
git commit -m "Add tag filter for the places map"
```

---

### Task 6: Add-place form with rate-limit handling

**Files:**
- Create: `app/src/features/map/AddPlaceForm.tsx`
- Modify: `app/src/features/map/MapScreen.tsx`

**Interfaces:**
- Consumes: `getLimitErrorMessage` from `lib/limits.ts`, `findNearbyDuplicates` from `lib/places.ts`, `supabase` from `lib/supabaseClient.ts`.
- Produces: `<AddPlaceForm existingPlaces={Place[]} onSubmitted={() => void} />`.

- [ ] **Step 1: Write `AddPlaceForm.tsx`**

```tsx
// app/src/features/map/AddPlaceForm.tsx
import { useState, type FormEvent } from 'react';
import { Button } from '../../components/Button';
import { findNearbyDuplicates } from '../../lib/places';
import { getLimitErrorMessage } from '../../lib/limits';
import { supabase, isAnonymousSession } from '../../lib/supabaseClient';
import type { Place } from '../../lib/types';

export function AddPlaceForm({
  existingPlaces,
  onSubmitted,
}: {
  existingPlaces: Place[];
  onSubmitted: () => void;
}) {
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);

    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (Number.isNaN(latNum) || Number.isNaN(lngNum) || !name.trim()) {
      setMessage('Заполните название и корректные координаты.');
      return;
    }

    const duplicates = findNearbyDuplicates({ lat: latNum, lng: lngNum }, existingPlaces);
    if (duplicates.length > 0 && !duplicateWarning) {
      setDuplicateWarning(
        `Рядом уже есть: ${duplicates.map((d) => d.name).join(', ')}. Отправьте форму ещё раз, чтобы добавить всё равно.`,
      );
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    const { error } = await supabase.from('places').insert({
      name,
      description,
      lat: latNum,
      lng: lngNum,
      source: 'user',
      created_by: session?.user.id,
    });

    if (error) {
      const limitMessage = getLimitErrorMessage(error.message, isAnonymousSession(session));
      setMessage(limitMessage ?? `Не удалось сохранить: ${error.message}`);
      return;
    }

    setName('');
    setLat('');
    setLng('');
    setDescription('');
    setDuplicateWarning(null);
    setMessage('Место добавлено.');
    onSubmitted();
  }

  return (
    <form onSubmit={handleSubmit} className="add-place-form">
      <label>
        Название
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        Широта
        <input value={lat} onChange={(e) => setLat(e.target.value)} />
      </label>
      <label>
        Долгота
        <input value={lng} onChange={(e) => setLng(e.target.value)} />
      </label>
      <label>
        Описание
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      {duplicateWarning && <p role="alert">{duplicateWarning}</p>}
      {message && <p role="status">{message}</p>}
      <Button type="submit">Добавить место</Button>
    </form>
  );
}
```

- [ ] **Step 2: Wire it into `MapScreen.tsx`**

```tsx
// app/src/features/map/MapScreen.tsx — render below the route summary
<AddPlaceForm existingPlaces={places} onSubmitted={() => window.location.reload()} />
```

(A full reload is a deliberately simple refresh strategy for MVP; replacing it with a `refetch()` call from `usePlaces` is a one-line improvement left for the post-merge polish pass, noted in `sessions/STATE.md`.)

- [ ] **Step 3: Verify manually**

```bash
cd app && npm run dev
```

Submit a place with coordinates far from any existing one — it should succeed and reload with the new marker visible (labeled "от пользователя" in its popup). Submit a second one immediately — expect the guest rate-limit message from `lib/limits.ts`.

- [ ] **Step 4: Build, lint, commit**

```bash
cd app && npm run build && npm run lint
cd - 
git add app/src/features/map
git commit -m "Add guest/registered place submission form with dedup warning and rate-limit handling"
```

---

### Task 7: Playwright e2e — route sharing and keyboard navigation

**Files:**
- Create: `app/e2e/route-sharing.spec.ts`
- Create: `app/e2e/map-keyboard-nav.spec.ts`

**Interfaces:** none — these are terminal verification tasks.

- [ ] **Step 1: Write `route-sharing.spec.ts`**

```ts
// app/e2e/route-sharing.spec.ts
import { expect, test } from '@playwright/test';

test('guest builds a route, shares the URL, and it reopens identically', async ({ page, context }) => {
  await page.goto('/');
  await page.waitForSelector('.leaflet-marker-icon');

  const markers = page.locator('.leaflet-marker-icon');
  await markers.nth(0).click();
  await page.getByText('Добавить в маршрут').click();
  await markers.nth(1).click();
  await page.getByText('Добавить в маршрут').click();

  // set start by clicking an empty spot on the map
  await page.locator('.leaflet-container').click({ position: { x: 50, y: 50 } });

  await expect(page.getByText(/Маршрут:/)).toBeVisible();

  await page.getByText('Скопировать ссылку на маршрут').click();
  const copiedUrl = await page.evaluate(() => navigator.clipboard.readText());

  const secondPage = await context.newPage();
  await secondPage.goto(copiedUrl);
  await expect(secondPage.getByText(/Маршрут:/)).toBeVisible();
});
```

Grant clipboard permissions in `playwright.config.ts`:

```ts
// app/playwright.config.ts — add to the `use` block
use: {
  baseURL: 'http://localhost:5183',
  permissions: ['clipboard-read', 'clipboard-write'],
},
```

- [ ] **Step 2: Write `map-keyboard-nav.spec.ts`**

```ts
// app/e2e/map-keyboard-nav.spec.ts
import { expect, test } from '@playwright/test';

test('Tab reaches a map marker and Enter opens its popup', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.leaflet-marker-icon');

  // Tab from the top of the document until a marker is focused, capped to avoid an infinite loop
  let focusedIsMarker = false;
  for (let i = 0; i < 40; i += 1) {
    await page.keyboard.press('Tab');
    focusedIsMarker = await page.evaluate(
      () => document.activeElement?.classList.contains('leaflet-marker-icon') ?? false,
    );
    if (focusedIsMarker) break;
  }
  expect(focusedIsMarker).toBe(true);

  await page.keyboard.press('Enter');
  await expect(page.locator('.leaflet-popup')).toBeVisible();
});
```

- [ ] **Step 3: Run both**

```bash
cd app && npm run test:e2e
```

Expected: both pass. If `map-keyboard-nav.spec.ts` fails because Leaflet markers aren't natively focusable, add `keyboard: true` was already set on `<Marker>` in Task 2/4 — if the test still fails, this is exactly the class of bug the ДЗ №1 audit caught; fix `PlacesMap.tsx` (e.g. ensure the marker icon has `tabindex="0"` via a custom `icon` or `L.Icon` class) until the test is genuinely green, and record the fix in `sessions/session-N.md` — do not mark this task done on a skipped or soft-failing assertion.

- [ ] **Step 4: Commit**

```bash
cd - 
git add app/e2e app/playwright.config.ts
git commit -m "Add e2e tests for route URL sharing and map keyboard navigation"
```

---

### Task 8: Feature exit checkpoint

- [ ] **Step 1: Full check suite**

```bash
cd app && npm run build && npm run lint && npm run test && npm run test:e2e
```

Expected: all green.

- [ ] **Step 2: Update `sessions/STATE.md` and `sessions/TOOLS.md`** in the worktree with what this branch added (react-leaflet dependency, new files, what's verified and how — citing the Playwright tests, per the proof rule in the spec).

- [ ] **Step 3: Final commit, ready for merge**

```bash
git add sessions/
git commit -m "feature/map-routes: exit checkpoint, all checks green"
```

This branch is now ready to merge into `main` alongside `feature/cabinet` and
`feature/requests-moodboard` — see the Integration plan
(`2026-08-27-05-integration.md`) for the merge and design-pass steps.
