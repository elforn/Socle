import { describe, it, expect, beforeEach, vi } from 'vitest';
import { boot, dispatch, subscribe, unsubscribe, getState, reset } from './store.js';

let dbSeq = 0;
function freshName() { return `test-store-${dbSeq++}`; }

function reducer(state, event) {
  switch (event.type) {
    case 'item:added':
      return { ...state, items: [...(state.items ?? []), event.payload] };
    case 'count:incremented':
      return { ...state, count: (state.count ?? 0) + 1 };
    default:
      return state;
  }
}

beforeEach(() => reset());

describe('boot', () => {
  it('initialises state to the result of reducing all existing events', async () => {
    const name = freshName();
    await boot({ dbName: name, reducer });
    expect(getState()).toEqual({});
  });

  it('replays persisted events on second boot', async () => {
    const name = freshName();
    await boot({ dbName: name, reducer });
    await dispatch('item:added', { title: 'hello' });
    reset();
    await boot({ dbName: name, reducer });
    expect(getState().items).toHaveLength(1);
    expect(getState().items[0].title).toBe('hello');
  });
});

describe('dispatch', () => {
  it('updates state after dispatch', async () => {
    await boot({ dbName: freshName(), reducer });
    await dispatch('item:added', { title: 'x' });
    expect(getState().items).toHaveLength(1);
  });

  it('writes an event with all required fields', async () => {
    const name = freshName();
    await boot({ dbName: name, reducer, deviceId: 'dev-1' });
    const before = Date.now();
    await dispatch('count:incremented', { n: 1 });
    reset();
    let captured;
    await boot({ dbName: name, reducer: (s, e) => { captured = e; return s; } });
    expect(captured).toMatchObject({
      id: expect.any(String),
      deviceId: 'dev-1',
      recordedAt: expect.any(Number),
      occurredAt: expect.any(Number),
      type: 'count:incremented',
      payload: { n: 1 },
    });
    expect(captured.recordedAt).toBeGreaterThanOrEqual(before);
  });

  it('deviceId defaults to null when not provided', async () => {
    const name = freshName();
    await boot({ dbName: name, reducer });
    await dispatch('count:incremented', {});
    reset();
    let captured;
    await boot({ dbName: name, reducer: (s, e) => { captured = e; return s; } });
    expect(captured.deviceId).toBeNull();
  });

  it('throws if called before boot', async () => {
    await expect(dispatch('item:added', {})).rejects.toThrow('before Store.boot');
  });

  it('accepts a custom occurredAt', async () => {
    await boot({ dbName: freshName(), reducer });
    const past = Date.now() - 10000;
    await dispatch('item:added', { title: 'past' }, past);
    expect(getState().items[0].title).toBe('past');
  });

  it('stamps deviceId from boot config', async () => {
    const name = freshName();
    await boot({ dbName: name, reducer, deviceId: 'device-abc' });
    await dispatch('count:incremented', {});
    reset();
    // re-boot and check the raw event via a capturing reducer
    let captured;
    await boot({
      dbName: name,
      reducer: (s, e) => { captured = e; return s; },
      deviceId: 'device-abc',
    });
    expect(captured.deviceId).toBe('device-abc');
  });
});

describe('boot — error handling', () => {
  it('rejects when migrations fail, leaving app unstarted', async () => {
    await expect(
      boot({ dbName: freshName(), version: 99, reducer })
    ).rejects.toThrow('No migration defined for schema version');
  });
});

describe('subscribe / unsubscribe', () => {
  it('calls callback immediately with current value', async () => {
    await boot({ dbName: freshName(), reducer });
    const cb = vi.fn();
    subscribe('items', cb);
    expect(cb).toHaveBeenCalledOnce();
    expect(cb).toHaveBeenCalledWith(undefined);
  });

  it('calls callback when subscribed key changes', async () => {
    await boot({ dbName: freshName(), reducer });
    const cb = vi.fn();
    subscribe('items', cb);
    cb.mockClear();
    await dispatch('item:added', { title: 'y' });
    expect(cb).toHaveBeenCalledOnce();
    expect(cb.mock.calls[0][0]).toHaveLength(1);
  });

  it('does not call callback when a different key changes', async () => {
    await boot({ dbName: freshName(), reducer });
    const cb = vi.fn();
    subscribe('items', cb);
    cb.mockClear();
    await dispatch('count:incremented', {});
    expect(cb).not.toHaveBeenCalled();
  });

  it('does not call callback after unsubscribe', async () => {
    await boot({ dbName: freshName(), reducer });
    const cb = vi.fn();
    subscribe('items', cb);
    unsubscribe('items', cb);
    cb.mockClear();
    await dispatch('item:added', { title: 'z' });
    expect(cb).not.toHaveBeenCalled();
  });

  it('calls all subscribers when a key changes', async () => {
    await boot({ dbName: freshName(), reducer });
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    subscribe('items', cb1);
    subscribe('items', cb2);
    cb1.mockClear();
    cb2.mockClear();
    await dispatch('item:added', { title: 'multi' });
    expect(cb1).toHaveBeenCalledOnce();
    expect(cb2).toHaveBeenCalledOnce();
  });

  it('unsubscribe on a key with no registered callbacks does not throw', async () => {
    await boot({ dbName: freshName(), reducer });
    const cb = vi.fn();
    expect(() => unsubscribe('nonexistent', cb)).not.toThrow();
  });
});
