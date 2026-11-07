# /migration

Scaffold a new IDB schema migration.

## Usage
/migration <version> <description>

Example: `/migration 3 add-snapshots-store`

## What to do

### Step 0 — Decide which chain this belongs to

This is the first question, and getting it wrong ships a bug that only surfaces after a `socle update`.

| The store is for... | Goes in | Who owns it |
|---|---|---|
| The Store API itself (`events`, `images`, a future `snapshots` cache) | `core/idb/migrations.js` | Library |
| Anything app-specific | The app's **own database**, opened from `app/` | App developer |

**Library migrations are for library infrastructure only.** `_lib/` contains zero domain concepts — if the store holds app data, it does not belong in this chain at any version. An app that adds a store here is overwritten on every `socle update` — since 1.4.2 the update warns first instead of doing it silently, but the app is then answering that prompt forever, and one `y` still loses the store.

If the request is for app data, do not scaffold a library migration. Point at the app-owned pattern in `docs/architecture.md` → App-owned object stores and stop.

### Step 1 — Read the existing chain

Read `core/idb/migrations.js`. It is a positional array of plain functions:

```js
const migrations = [
  null, // slot 0 — IDB versions start at 1
  db => { /* version 1 */ },
  db => { /* version 2 */ },
];
```

`CURRENT_VERSION` is derived (`migrations.length - 1`). There is **no version constant to update** — appending to the array is what bumps the version.

### Step 2 — Append the migration

Add one function at the end of the array. The index is the version:

```js
  db => {
    // version <N> — <description>
    const store = db.createObjectStore('<name>', { keyPath: 'id' });
    store.createIndex('by_recordedAt', 'recordedAt');
  },
```

Never insert in the middle or renumber an existing entry — positions are checkpoints that installed databases have already recorded.

### Step 3 — Rules for migrations

- Migrations run inside `Store.boot()`, on IDB version upgrade, before state is replayed and before any UI renders. **Not** in SW activate — migrations are data-layer concerns, not service-worker concerns.
- A migration must never delete or overwrite existing records.
- A migration that fails must throw. `openDB` aborts the upgrade transaction and rejects, halting app startup visibly rather than corrupting data.
- New event-log-shaped stores use `{ keyPath: 'id' }` with an index on `recordedAt`.
- **Known limit:** migration functions receive only `db`, not the `versionchange` transaction, so they can create and delete object stores but cannot add an index to an existing one. If a migration genuinely needs that, `runMigrations` has to pass the transaction through first — treat it as a library change with its own `/scope`, not as part of the migration.

### Step 4 — Write a test

In `core/idb/migrations.test.js`:

- Run the migration on a fresh `fake-indexeddb` database and verify the new store or index exists.
- Open at the previous version, write a record, reopen at the new version, and verify the record survived.
- Verify `CURRENT_VERSION` reflects the new length.

### Step 5 — Report

State what was added, the new schema version, and anything the developer must fill in that needs business context.
