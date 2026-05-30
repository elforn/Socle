# Architecture

## Contents

- [Monorepo layout](#monorepo-layout)
- [The `_lib/` boundary](#the-_lib-boundary)
- [Build system](#build-system)
- [Router](#router)
- [Store and IDB](#store-and-idb)
- [Strings and locale](#strings-and-locale)
- [Sync module](#sync-module-modulessync)
- [Service Worker](#service-worker)
- [Reference app](#reference-app)

---

## Monorepo layout

```
Socle/
  core/        Runtime library — copied to _lib/core/ in every scaffolded app
  modules/     Optional runtime modules — copied to _lib/modules/
  scaffold/    Template for new apps — mirrors the exact app directory structure
  cli/         npx socle entry point
  reference-app/  Real app using the library, proves every feature works
  docs/
```

`core/` and `modules/` contain browser code that runs in the app. `scaffold/` contains project tooling and config files that the developer owns and can edit.

## The `_lib/` boundary

When you scaffold a project, `core/` and your selected `modules/` are copied into `_lib/`. This is the single most important architectural rule:

**`_lib/` files never import from `app/`.** The dependency arrow points one way only:

```
app/ → _lib/
```

If any `_lib/` file references anything outside `_lib/`, the update mechanism breaks. `npx socle update` replaces `_lib/` entirely — it can only do this safely because `_lib/` has no knowledge of your app code.

## Build system

The build script at `utils/build.js` is plain Node.js with no dependencies beyond built-ins. It runs at deploy time and produces everything in `dist/`:

```
dist/
  main.[hash].js    ← hashed app entry point with APP_VERSION injected
  sw.js             ← Service Worker generated from _lib/core/sw.js
  version.json      ← { version, buildTime } for the update-notification flow
  index.html        ← processed with hashed asset filenames
  manifest.json     ← copied from project root
  _lib/             ← copy of _lib/ (ES modules need all imports present in dist/)
  app/              ← copy of app/ (page components imported by main.[hash].js)
```

Content hashing means browsers cache aggressively — a filename only changes when its content changes, so unchanged files are served from cache indefinitely.

### BASE_PATH

Apps deployed to GitHub Pages live at `https://user.github.io/repo-name/`, not `/`. The build script reads `BASE_PATH` from the environment and prefixes all asset URLs:

```bash
BASE_PATH=/my-app/ node utils/build.js
```

The included `deploy.yml` sets this automatically from the repository name. Local development uses the default `/`.

## Router

The router uses the History API (`pushState` / `popstate`). There is no hash routing.

### `navigate(path)`

Call `navigate()` from anywhere in your app to change the route. The import path depends on your file's location relative to `_lib/`:

```js
// from app/pages/goal-page.js
import { navigate } from '../../_lib/core/router/router.js';

navigate('/goals/42');
```

This pushes the path to the browser history and dispatches a `navigate` event on `window`. The `<app-router>` component listens for both `navigate` and `popstate` events and swaps the current page component accordingly.

Do not call `history.pushState()` directly — it will update the URL but not trigger the router.

### `<app-router>`

Place `<app-router>` in your `index.html`. It is the single outlet for all page components:

```html
<body>
  <app-router></app-router>
  <script type="module" src="%%MAIN_JS%%"></script>
</body>
```

In `main.js`, set its `routes` property after import:

```js
import '../_lib/core/router/app-router.js';
import './pages/home-page.js';
import './pages/not-found-page.js';

const router = document.querySelector('app-router');
router.routes = [
  { path: '/',         component: 'home-page' },
  { path: '/goals/:id', component: 'goal-page' },
  { path: '*',         component: 'not-found-page' },
];
```

Routes are matched in order — first match wins. Use `*` as the last entry to catch unmatched paths.

### Route parameters

Segments prefixed with `:` are captured as named parameters and set on the page component as a `params` property before it renders. Use them directly in `template()`:

```js
class GoalPage extends AppElement {
  template() {
    return `<main><h1>Goal ${this.params.id}</h1></main>`;
  }
}
```

Parameter values are URI-decoded automatically.

### Page components

Every page component must wrap its content in `<main>` so assistive technologies can navigate directly to page content:

```js
class GoalPage extends AppElement {
  template() {
    return `
      <style>:host { display: block; }</style>
      <main>
        <h1>Goal detail</h1>
      </main>
    `;
  }
}

customElements.define('goal-page', GoalPage);
```

### Hard refresh and the SW navigation intercept

When a user navigates to `/goals/42` and then hard-refreshes, the browser requests `/goals/42` from the server. A static file server returns 404 — there is no file at that path.

The Service Worker solves this: it intercepts all navigation requests (requests with `mode === 'navigate'`) and returns the cached `index.html` instead. The app shell loads, the router reads the current URL, and renders the correct page. This is why offline-first and SPA routing work together without a server-side fallback.

The SW intercept is active after the first visit, once the SW has installed and taken control of the page.

## Store and IDB

The Store is the single source of truth for all app state. Components never touch IndexedDB directly — every write goes through `Store.dispatch()`, every read comes via `Store.subscribe()`.

### Data model — append-only event log

All data is stored as an append-only log of events in IndexedDB. An event records what happened, not what the current state is:

```js
{
  id:         '550e8400-...',   // crypto.randomUUID()
  deviceId:   null,             // set by apps using P2P; null for single-device
  recordedAt: 1715000000000,    // Date.now() at write time — immutable
  occurredAt: 1715000000000,    // when the real-world event happened — correctable
  type:       'goal:added',
  payload:    { title: 'Run a 5k' },
}
```

`recordedAt` is the log ordering key — it records when the device wrote the event and is immutable. `occurredAt` records when the event happened in the real world; it can be user-supplied and corrected without affecting data integrity.

State is calculated by replaying the full event log through your reducer on every boot.

### Boot

Call `boot()` at the top of `main.js` and `await` it before the router or any component renders. Nothing else touches IDB at startup — this is the only entry point.

```js
import { boot } from '../_lib/core/store/store.js';
import { reducer } from './store/reducer.js';

await boot({ dbName: 'my-app', reducer });
```

`boot()` options:

| Option | Required | Description |
|--------|----------|-------------|
| `dbName` | yes | IDB database name — use your app name |
| `reducer` | yes | `(state, event) => newState` — called for every event on replay |
| `version` | no | IDB schema version — defaults to library's `CURRENT_VERSION` |
| `deviceId` | no | Identifies this device in P2P contexts — omit for single-device apps |

### Dispatch

```js
import { dispatch } from '../_lib/core/store/store.js';

await dispatch('goal:added', { title: 'Run a 5k' });

// With a custom occurredAt (e.g. user entered a past date):
await dispatch('goal:added', { title: 'Past goal' }, pastTimestamp);
```

`dispatch` writes the event to IDB, runs the reducer, then notifies subscribers of any changed state keys.

### Subscribe

```js
import { subscribe, unsubscribe } from '../_lib/core/store/store.js';

class GoalList extends AppElement {
  subscribe() {
    this._onGoals = goals => { /* update DOM */ };
    Store.subscribe('goals', this._onGoals);
  }
  unsubscribe() {
    Store.unsubscribe('goals', this._onGoals);
  }
}
```

`subscribe(key, cb)` calls `cb` immediately with the current value, then again whenever that top-level state key changes. Call `unsubscribe` in the component's `unsubscribe()` lifecycle method to avoid memory leaks.

### Writing a reducer

Your reducer lives in `app/store/reducer.js`. It receives the current state and one event, and must return a new state object:

```js
export function reducer(state, event) {
  switch (event.type) {
    case 'goal:added':
      return { ...state, goals: [...(state.goals ?? []), event.payload] };
    default:
      return state;
  }
}
```

The reducer must be a pure function — no side effects, no IDB calls, no mutation of the existing state object. The Store detects changes using reference equality (`!==`), so always return a new object when state changes.

### Schema migrations

The IDB schema is versioned from day one. Migrations live in `core/idb/migrations.js` — add a new function to the array when you need a new object store or index:

```js
// core/idb/migrations.js
const migrations = [
  null,       // slot 0 — IDB versions start at 1
  db => {     // version 1 — initial schema
    const store = db.createObjectStore('events', { keyPath: 'id' });
    store.createIndex('by_recordedAt', 'recordedAt');
  },
  db => {     // version 2 — add a new store
    db.createObjectStore('snapshots', { keyPath: 'id' });
  },
];
```

Migrations run inside `boot()` before any state is replayed and before any UI renders. A failed migration throws, halting app startup visibly — it never silently corrupts data.

### API reference

#### `boot({ dbName, reducer, version?, deviceId? })`

Opens the IDB database, runs any pending migrations, replays the event log through `reducer`, and sets the initial state. Must be `await`ed in `main.js` before anything else runs. Rejects if migrations fail.

#### `dispatch(type, payload, occurredAt?)`

Writes a complete event to IDB, applies the reducer, and notifies subscribers of changed state keys. Throws if called before `boot`. Returns a Promise that resolves when the write is complete.

#### `subscribe(key, cb)`

Registers `cb` for changes to a top-level state key. Calls `cb` immediately with the current value. Call in your component's `subscribe()` lifecycle method.

#### `unsubscribe(key, cb)`

Removes a previously registered callback. No-op if the callback was not registered. Call in your component's `unsubscribe()` lifecycle method.

#### `setState(key, value)`

Updates a top-level state key in memory and notifies subscribers. Does not write to IDB — the value does not survive a page reload.

Use for ephemeral runtime state: UI flags, detection results, or any value that is not a domain event and should not appear in the event log.

```js
import { setState } from '../_lib/core/store/store.js';

setState('updateAvailable', true);
```

**Notes** — calling `setState` before `boot` is safe but the value will be wiped when `boot` runs and replays the event log.

#### `getState()`

Returns the current state snapshot. Use in tests and for debugging. Do not use in production component code — use `subscribe()` instead.

#### `attachBlob(id, blob)`

Writes `{ id, blob }` to the `images` object store. Use for binary data (photos, files) that must not go through the event log. Returns a Promise.

The `images` store is separate from `events` — blobs are not replayed on boot and are not part of the event log. Pair with a domain event that records the blob id so the relationship is auditable:

```js
const id = crypto.randomUUID();
await Store.attachBlob(id, file);
await Store.dispatch('year:image-set', { year: '2026', imageId: id });
```

Throws if called before `boot`.

#### `getBlob(id)`

Reads a blob record from the `images` store by id. Returns a Promise that resolves to the `blob` value, or `null` if not found. Throws if called before `boot`.

#### `deleteBlob(id)`

Removes a blob from the `images` store by id. Returns a Promise. Throws if called before `boot`.

#### `getAllEvents()`

Returns a Promise that resolves to all events in the `events` store, sorted by `recordedAt` ascending (with `deviceId` as tiebreaker). Used by the sync module — not for general use in components.

#### `getAllBlobs()`

Returns a Promise that resolves to all records in the `images` store as `[{ id, blob }]`. Used by the sync module.

#### `importEvents(events)`

Writes an array of pre-formed event objects directly to the `events` store, bypassing the reducer and subscribers. Used by the sync module during import — not for general use. The app must reload after calling this for the imported events to affect state.

#### `reset()`

Clears all module state. **Test isolation only — never call in production code.**

## Strings and locale

`core/strings.js` is a flat key registry that enables user-visible strings to be externalised from components and translated. It is the foundation for multi-language support without introducing any runtime dependency.

### Basic usage

In `_lib/` components, every user-visible string comes from `t()`:

```js
import { t } from '../../core/strings.js';

template() {
  return `<button>${t('update.reload')}</button>`;
}
```

Register English defaults in `app/strings.js`, which must be the **first import in `app/main.js`** so strings are available before any component renders:

```js
// app/strings.js
import { defineStrings } from '../_lib/core/strings.js';

defineStrings({
  'update.reload':  'Reload',
  'update.dismiss': 'Dismiss',
});
```

### Multiple languages

`defineStrings(obj, locale)` accepts an optional locale parameter. Register all locale packs in `app/main.js` after `app/strings.js`:

```js
// app/main.js (imports are hoisted — order of import statements sets registration order)
import './strings.js';          // English defaults — must come first
import './locales/fr.js';       // French
import './locales/ca.js';       // Catalan
```

```js
// app/locales/fr.js
import { defineStrings } from '../_lib/core/strings.js';

defineStrings({
  'update.reload':  'Recharger',
  'update.dismiss': 'Ignorer',
}, 'fr');
```

### Switching locale

```js
import { setLocale, getLocale } from '../_lib/core/strings.js';

// Read persisted locale (falls back to 'en')
const current = getLocale();

// Switch and persist to localStorage, then reload so all components re-render
setLocale('fr');
location.reload();
```

`setLocale` writes to `localStorage`. `getLocale` reads from `localStorage` and defaults to `'en'`. On reload, `app/main.js` imports `strings.js` before anything renders — the active locale is already set when the first component connects.

`t(key)` resolves: active locale → `'en'` → key. It never returns an empty string.

### API reference

#### `defineStrings(obj, locale?)`

Registers string key/value pairs for a locale. Defaults to `'en'`. Call multiple times to register multiple locales. Merges into the existing registry — later calls for the same locale override earlier keys.

#### `t(key, params?)`

Returns the string for `key` in the active locale. Falls back to English, then to the key itself if no match is found.

Pass `params` to substitute `{placeholder}` tokens in the string:

```js
defineStrings({ 'export.year': 'Export {year}' });
t('export.year', { year: 2026 }); // → 'Export 2026'
```

#### `setLocale(locale)`

Sets the active locale and persists it to `localStorage`. Falls back to `'en'` if the locale has no registered strings.

#### `getLocale()`

Returns the active locale from `localStorage`, defaulting to `'en'`.

#### `reset()`

Clears all registered strings and resets the active locale to `'en'`. **Test isolation only.**

## Sync module (`modules/sync/`)

The sync module provides JSON-based export and import of the full app dataset — events and binary attachments. It is optional: scaffolded apps include it only if selected at `npx socle` time.

### Export

`exportData()` reads all events and all blobs from the store and serialises them to a JSON-safe structure. Blobs are converted to data URLs so the output is a single self-contained file.

```js
import { exportData, downloadExport } from './_lib/modules/sync/sync.js';

const data = await exportData();
downloadExport(data, 'myapp-all.json');
```

To export only a subset of events, pass an `eventFilter`:

```js
const data = await exportData({
  eventFilter: e => String(e.payload?.year) === '2026',
});
downloadExport(data, '2026-only.json');
```

Year-scoped export automatically includes only the blobs referenced by the filtered events — it does not export blobs from other years.

### Import

`importData()` merges an exported payload into the current IDB database. Events and images that already exist (matched by `id`) are silently skipped — import is idempotent. After a successful import the app must reload for the new events to affect state.

```js
import { readImportFile, importData } from './_lib/modules/sync/sync.js';

const raw  = await readImportFile(file);      // parses uploaded .json file
const result = await importData(raw);         // { eventsAdded, imagesAdded }
```

`importData` throws if `socleVersion` in the payload does not match the library version.

### API reference

#### `exportData({ eventFilter? })`

Returns a Promise resolving to `{ socleVersion, exportedAt, events, images }`. If `eventFilter` is provided, only matching events are included and blob export is scoped to blobs referenced by those events.

#### `importData(data)`

Merges `data.events` and `data.images` into IDB. Skips any event or blob whose `id` already exists. Returns `{ eventsAdded, imagesAdded }`. Throws if `data.socleVersion` does not match the current library version.

#### `downloadExport(data, filename)`

Serialises `data` to JSON and triggers a browser file download with the given filename.

#### `readImportFile(file)`

Reads a `File` object (from a file input) and returns a Promise resolving to the parsed JSON payload. Throws on invalid JSON.

---

## Service Worker

The SW source lives at `_lib/core/sw.js` — library-owned, never edited directly. The build processes it into `dist/sw.js`, injecting:

- `CACHE_VERSION` — `{version}-{hash}`, changes on every build
- `ASSETS` — the full enumerated list of files in `_lib/` and `app/`, with correct `BASE_PATH` prefixes
- `BASE_PATH` — URL prefix for navigation intercept

Cache strategy by resource type:

| Resource | Strategy |
|----------|----------|
| `version.json` | Network only — never cached, always fresh |
| `index.html`, JS, CSS | Cache first — updated via SW lifecycle |
| Static assets (hashed) | Cache first — filename changes when content changes |
| Other same-origin resources | Runtime caching — cached on first fetch |

On activate, all caches that do not match `CACHE_VERSION` are deleted, cleaning up stale assets from previous versions. The SW calls `clients.claim()` so it takes control on first install without requiring a page reload.

The build script enumerates every file under `_lib/` and `app/` for the pre-cache list, following symlinks. Any file added to either directory is automatically included on the next build.

For the full update flow — `<sw-manager>`, `<update-banner>`, skip-waiting, and the `version.json` check — see [sw-update-flow.md](sw-update-flow.md).

## Reference app

`reference-app/` is structured identically to a scaffolded user project, with one difference: `_lib/` is a symlink to the monorepo's `core/` and `modules/` directories rather than a copy. Library code changes are reflected immediately without a sync step.

The reference app proves every library feature works end-to-end before it is considered complete. If a feature cannot be demonstrated meaningfully in the reference app, it is not done.

---

[← Getting started](getting-started.md) · [Docs](https://github.com/magp/Socle/blob/main/README.md#docs) · [Next: SW update flow →](sw-update-flow.md)
