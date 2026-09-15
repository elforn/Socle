// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import '../../app/strings.js';
import { buildDigest } from '../../app/notifications-digest.js';

describe('buildDigest', () => {
  it('returns null when there are no goals for the current year', () => {
    expect(buildDigest({ goals: {} })).toBeNull();
  });

  it('returns null when every goal is complete', () => {
    const year = new Date().getFullYear();
    const state = { goals: { [year]: [{ id: 'a', percentage: 100 }] } };
    expect(buildDigest(state)).toBeNull();
  });

  it('counts goals still in progress for the current year', () => {
    const year = new Date().getFullYear();
    const state = { goals: { [year]: [{ id: 'a', percentage: 40 }, { id: 'b', percentage: 100 }] } };
    const digest = buildDigest(state);
    expect(digest.title).toBe('1 goals in progress');
  });

  it('ignores goals from other years', () => {
    const year = new Date().getFullYear();
    const state = { goals: { [year - 1]: [{ id: 'old', percentage: 0 }] } };
    expect(buildDigest(state)).toBeNull();
  });
});
