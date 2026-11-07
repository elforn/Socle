# /migration

Scaffold a new IDB object store or schema migration for your app.

## Usage
/migration <store-name> <description>

Example: `/migration localTags per-bout local tag notes`

## What to do

### Step 0 — Check the data belongs in a store at all

| The data... | Goes in |
|---|---|
| Must survive a backup/restore, or reach another device | The **event log** — `Store.dispatch()`, no new store needed |
| Is a binary attachment (photo, file) | `Store.attachBlob()` — the `images` store already exists |
| Is device-local only (preferences, caches, scratch state) | Your **own database** — continue below |

Only reach for a new object store once the event log and `attachBlob` are both genuinely wrong for the data. A store outside the event log is invisible to `exportData()`, so anything in it is lost on a restore to a new device.

### Step 1 — Never add stores to `_lib/`

`_lib/core/idb/migrations.js` is **library-owned**. It creates the `events` and `images` stores the Store API depends on.

Adding your store there is the one mistake to avoid: `npx socle update` replaces that file wholesale. Since Socle 1.4.2 the update checks `_lib/` against a checksum receipt and warns you before overwriting — so it is no longer silent — but you would be answering that prompt on every update for the life of the app, and a single `y` at the wrong moment still loses the store. Do not edit it, and do not pass a higher `version` to `Store.boot()` to extend it — a version above the library's throws `No migration defined for schema version N`.

Your app's stores go in your own database, which carries its own version counter and is never touched by a library update.

### Step 2 — Create or extend the app database module

If the app has no app-owned database yet, create one as `app/<name>.js`:

```js
// app/local-tags.js
import { openDB, get, put, del } from '../_lib/core/idb/idb.js';

const migrations = [
  null, // slot 0 — IDB versions start at 1
  db => db.createObjectStore('localTags', { keyPath: 'tagId' }),
];

let _db;
const db = () => (_db ??= openDB('%%APP_NAME%%-local', migrations.length - 1,
  (database, oldV, newV) => {
    for (let v = oldV + 1; v <= newV; v++) migrations[v](database);
  }));

export const getTag = async id        => get(await db(), 'localTags', id);
export const setTag = async (id, tag) => put(await db(), 'localTags', { tagId: id, ...tag });
export const delTag = async id        => del(await db(), 'localTags', id);
```

Caching the *promise* rather than the resolved handle means concurrent callers share a single open.

If the module already exists, **append** one function to its `migrations` array — the array index is the IDB version, so appending is what bumps it. Never insert in the middle or renumber an existing entry: those positions are checkpoints that installed databases have already recorded. Existing installs run only the new function on next boot and keep their data.

### Step 3 — Rules

- Migrations run on IDB version upgrade, before any UI renders.
- A migration must never delete or overwrite existing records.
- A migration that fails must throw — the upgrade transaction aborts and startup halts visibly rather than corrupting data.
- Migration functions receive only `db`, so they can create and delete object stores but cannot add an index to an existing one.
- Components must not import this module directly if the data is app state — read it once at boot and put it in the Store, so components keep a single source of truth.

### Step 4 — Write a test

In `tests/unit/`:

- Verify a record round-trips through the module's exported helpers.
- Verify a version bump preserves data: write at the old version, reopen at the new one, assert the record survived.

`fake-indexeddb` provides `indexedDB` in tests automatically — never mock IDB.

### Step 5 — Report

State the store name, its database and version, which helpers were added, and confirm whether the data is intentionally excluded from `exportData()`.
