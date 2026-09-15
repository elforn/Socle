# Filter state

The filter-state module (`modules/filter-state/filter-state.js`) is a `localStorage`-backed helper for persisting a filter/search bar's state across reloads — search text, active filter chips, sort mode, whether a panel is expanded. One factory function, `FilterState(storageKey, shape)`, no component.

Filter state is device-local UI preference, not app data — the same reasoning as theme and locale. It never goes through the store, is never part of an export, and is scoped to one `localStorage` key you choose.

## Contents

- [Quick start](#quick-start)
- [Shape kinds](#shape-kinds)
- [isActive() — driving a "filters on" indicator](#isactive--driving-a-filters-on-indicator)
- [Invalid or malformed stored data](#invalid-or-malformed-stored-data)
- [API reference](#api-reference)

---

## Quick start

```js
import { FilterState } from '../_lib/modules/filter-state/filter-state.js';

const filters = FilterState('myapp:goal-filters', {
  q:         { kind: 'string' },
  status:    { kind: 'enum', values: ['all', 'active', 'done'] },
  priority:  { kind: 'enum', values: ['low', 'mid', 'high'], default: 'mid' },
  tags:      { kind: 'set' },
  panelOpen: { kind: 'boolean' },
});

let state = filters.load(); // { q: '', status: 'all', priority: 'mid', tags: Set(0), panelOpen: false }

// on every filter change:
state = { ...state, q: 'ship' };
filters.save(state);

// resetting:
filters.clear();
```

`shape` describes every field once — its type and (for `enum`) its allowed values and default. `load()`, `save()`, and `isActive()` all derive their behavior from it, so there's one place to add a new filter field.

---

## Shape kinds

- **`string`** — free text (search box). Default: `''`.
- **`enum`** — one of a fixed `values` list. Default: `values[0]` unless `default` is given. A stored value outside `values` resets to the default rather than being trusted.
- **`set`** — a `Set` of strings (multi-select tags/categories). Persisted as a plain array in `localStorage`, restored as a `Set`. Default: empty `Set`.
- **`boolean`** — a flag (an expanded/collapsed panel, a toggle). Default: `false`. Booleans are persisted like every other field, but **excluded from `isActive()`** — see below.

---

## isActive() — driving a "filters on" indicator

`isActive(state)` answers "is any *filter* set to a non-default value?" — for a badge dot on a filter icon, or a "Clear filters" button's visibility:

```js
if (filters.isActive(state)) {
  clearBtn.hidden = false;
}
```

**Boolean fields don't count.** `panelOpen: true` alone does not make `isActive()` return `true` — a boolean like "is the filter panel expanded" is UI state, not a filter the user is actively narrowing by. Only `string`, `enum` (non-default), and `set` (non-empty) fields count toward "a filter is active."

---

## Invalid or malformed stored data

`load()` never throws and never returns a value outside the shape's contract, regardless of what's actually sitting in `localStorage` — a different app version, manual tampering, or corrupted storage:

- Malformed JSON → falls back to full defaults.
- An `enum` value not in `values` → resets to that field's default.
- A `set` field that isn't an array → empty `Set`.
- A `boolean` field that isn't literally `true`/`false` → `false`.

You never need to validate the shape of what `load()` returns yourself.

---

## API reference

### `FilterState(storageKey, shape)`

Returns `{ load(), save(state), clear(), isActive(state) }`.

**Parameters**
- `storageKey` {string} — the `localStorage` key. Choose one per distinct filter bar in your app.
- `shape` {object} — `{ fieldName: { kind, values?, default? } }` for every field (see [Shape kinds](#shape-kinds)).

### `load()`

Returns the persisted state merged over shape defaults. Never throws.

### `save(state)`

Persists `state` to `localStorage`. **Removes the key entirely** when every non-boolean field is at its default (keeps storage clean when a user hasn't actually filtered anything) — a boolean alone being non-default still keeps the key.

### `clear()`

Removes the key. No-op if already absent.

### `isActive(state)`

Returns `true` if any non-boolean field differs from its default. See [above](#isactive--driving-a-filters-on-indicator).

---

[← Modal dialog](modal-dialog.md) · [Docs home](../README.md#docs) · [Next: Notifications →](notifications.md)
