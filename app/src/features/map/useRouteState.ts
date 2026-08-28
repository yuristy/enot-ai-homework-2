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
  | { type: 'CLEAR_START' }
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
    case 'CLEAR_START':
      return { ...state, start: null };
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

  function clearStart() {
    dispatch({ type: 'CLEAR_START' });
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

  return { state, toggleSelected, setStart, clearStart, selectedPlaces, built, estimate, shareUrl };
}
