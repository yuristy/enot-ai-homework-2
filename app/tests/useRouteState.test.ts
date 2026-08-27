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

  it('clears the start point on CLEAR_START', () => {
    const state: RouteState = { selectedIds: [1], start: { lat: 1, lng: 2 } };
    const next = routeReducer(state, { type: 'CLEAR_START' });
    expect(next.start).toBeNull();
  });
});
