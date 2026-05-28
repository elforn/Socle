import { openDB, put, get, del, getAll } from '../idb/idb.js';
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
  _state = _sortEvents(events).reduce(reducer, {});
}

function _uuid() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // crypto.randomUUID requires a secure context; getRandomValues works everywhere
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
    (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16));
}

export async function dispatch(type, payload, occurredAt = Date.now()) {
  if (!_db) throw new Error('Store.dispatch called before Store.boot');
  const event = {
    id: _uuid(),
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

export function setState(key, value) {
  const oldState = _state;
  _state = { ..._state, [key]: value };
  _notify(oldState, _state);
}

export function getState() {
  return _state;
}

export async function attachBlob(id, blob) {
  if (!_db) throw new Error('Store.attachBlob called before Store.boot');
  return put(_db, 'images', { id, blob });
}

export async function getBlob(id) {
  if (!_db) throw new Error('Store.getBlob called before Store.boot');
  const record = await get(_db, 'images', id);
  return record?.blob ?? null;
}

export async function deleteBlob(id) {
  if (!_db) throw new Error('Store.deleteBlob called before Store.boot');
  return del(_db, 'images', id);
}

export async function importEvents(events) {
  if (!_db) throw new Error('Store.importEvents called before Store.boot');
  for (const event of events) await put(_db, 'events', event);
}

export async function getAllEvents() {
  if (!_db) throw new Error('Store.getAllEvents called before Store.boot');
  return _sortEvents(await getAll(_db, 'events'));
}

export async function getAllBlobs() {
  if (!_db) throw new Error('Store.getAllBlobs called before Store.boot');
  return getAll(_db, 'images');
}

export function reset() {
  _db = null;
  _state = {};
  _reducer = null;
  _deviceId = null;
  _subs.clear();
}

function _sortEvents(events) {
  return events.sort((a, b) => a.recordedAt - b.recordedAt || (a.deviceId > b.deviceId ? 1 : -1));
}

function _notify(oldState, newState) {
  for (const [key, callbacks] of _subs) {
    if (oldState[key] !== newState[key]) {
      for (const cb of callbacks) cb(newState[key]);
    }
  }
}
