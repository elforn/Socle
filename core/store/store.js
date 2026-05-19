import { openDB, put, getAll } from '../idb/idb.js';
import { runMigrations, CURRENT_VERSION } from '../idb/migrations.js';

let _db = null;
let _state = {};
let _reducer = null;
let _deviceId = null;
const _subs = new Map(); // key → Set<callback>

export async function boot({ dbName, version = CURRENT_VERSION, reducer, deviceId = null }) {
  _reducer = reducer;
  _deviceId = deviceId;
  _db = await openDB(dbName, version, runMigrations);
  const events = await getAll(_db, 'events');
  _state = events.reduce(reducer, {});
}

export async function dispatch(type, payload, occurredAt = Date.now()) {
  if (!_db) throw new Error('Store.dispatch called before Store.boot');
  const event = {
    id: crypto.randomUUID(),
    deviceId: _deviceId,
    recordedAt: Date.now(),
    occurredAt,
    type,
    payload,
  };
  await put(_db, 'events', event);
  const oldState = _state;
  _state = _reducer(_state, event);
  _notify(oldState, _state);
}

export function subscribe(key, cb) {
  if (!_subs.has(key)) _subs.set(key, new Set());
  _subs.get(key).add(cb);
  cb(_state[key]);
}

export function unsubscribe(key, cb) {
  _subs.get(key)?.delete(cb);
}

export function getState() {
  return _state;
}

export function reset() {
  _db = null;
  _state = {};
  _reducer = null;
  _deviceId = null;
  _subs.clear();
}

function _notify(oldState, newState) {
  for (const [key, callbacks] of _subs) {
    if (oldState[key] !== newState[key]) {
      for (const cb of callbacks) cb(newState[key]);
    }
  }
}
