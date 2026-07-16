# PWA Library — Project Context

## What This Is

A highly opinionated PWA library for personal projects. It is a **code generator and pattern library**, not a runtime dependency. The CLI scaffolds a new project by copying relevant modules directly into the user's codebase into a `_lib/` directory. Users own the generated project but the `_lib/` layer has a clear ownership boundary that enables library updates without touching developer code. There is no `node_modules` from this library at runtime.

## Quick Commands

**Library tests — run from monorepo root:**
```bash
npx vitest run core modules cli library_tests   # all library tests
npx vitest run path/to/file.test.js             # single file
```

**Reference app tests — run from `reference-app/`:**
```bash
npm run test:unit    # unit tests
npm run test:e2e     # Playwright E2E
npx playwright test --ui   # interactive Playwright runner
```

**Reference app dev server — run from `reference-app/`:**
```bash
npm run dev:https    # always use this — HTTPS required for SW and mobile testing
```

**CLI — interactive, run by scaffolded app developers:**
```
npx socle scaffold   # create a new app
npx socle add / remove / manage   # manage modules in a scaffolded app
npx socle update     # update _lib/ to latest library version
```

For architecture rationale, V2/V3/V4 roadmap, and extended module docs: [`.claude/technical-context.md`](.claude/technical-context.md)

---

## Non-Negotiable Principles

These are settled decisions. Do not propose alternatives unless explicitly asked.

- **Vanilla JS, CSS, HTML only.** No frameworks, no runtime dependencies. If a utility is needed, we write it.
- **Web Components exclusively.** Every UI element is a custom element extending a shared base class.
- **Offline first.** The app must be fully functional with no network. The network is an enhancement, not a requirement.
- **Mobile first.** Touch interactions, safe areas, virtual keyboard behaviour, and gesture UX are first-class concerns.
- **No backend.** Ever. Local data only. Optional P2P on local network (V2).
- **Append-only event log as the data model.** Always. Even when P2P is not used. The overhead is negligible and migration cost later is unacceptable.
- **Minimise code length and complexity.** When two approaches solve a problem equally well, always choose the shorter one. Be very deliberate about what features are implemented. A missing feature is better than a complex one.
- **Solve real problems, not imagined ones.** Do not add configuration, tuning options, or fallback behaviour for problems that have not been observed in practice. If a limitation has not caused a user-visible issue, it is not yet a problem. Revisit when evidence exists.

---

## Architecture

### Monorepo Structure (this repository)

```
Socle/
  core/               # Runtime library → copied to _lib/core/ in every scaffolded app
                      # Browser code only: AppElement, Router, Store, IDB, sw.js, styles/
  modules/            # Optional runtime modules → copied to _lib/modules/
    gestures/         # Touch and gesture library
    modal-dialog/     # Responsive modal / bottom-sheet component
    app-header/       # Sticky header with safe-area support and --update-banner-height integration
    toast/            # toast() function + <toast-manager> service component
    images/           # compressImage() canvas-based JPEG compression
    sync/             # Export / import / merge
    p2p/              # WebRTC/WS local network sync (V2)
  scaffold/           # Template for scaffolded apps — mirrors exact app directory structure
                      # CLI copies this to the app root, substituting %%PLACEHOLDER%% tokens
    app/              # Entry point + empty component dirs
    utils/            # build.js lives here
    tests/unit/ + tests/e2e/
    _modules/         # Per-module scaffold pages — copied conditionally by CLI at scaffold time
    .github/workflows/deploy.yml
    index.html, manifest.json, package.json, .gitignore, README.md
  cli/
    index.js          # npx socle entry point (Phase 8)
  library_tests/      # Library infrastructure tests (run by library developers only, never shipped)
                      # scaffold-parity, lib-boundary, css-logical-props, scaffold-tokens
  reference-app/      # Real app instance using the library. _lib/ is symlinked to core/ and modules/.
  docs/
  .claude/
    commands/         # Custom slash commands (library development only)
```

### Scaffolded Project Structure (what the CLI generates)

```
my-app/
  _lib/                     ← library owned. Never edit these files.
    core/                   ← AppElement, Router, Store, IDB, sw.js, styles/
    modules/                ← selected modules (gestures, sync, etc.)
    lib-version.json        ← tracks library version and selected modules
  app/
    components/             ← developer's components, edit freely
    pages/                  ← developer's page components (one per route)
    store/                  ← developer's store actions and schema extensions
    main.js                 ← app entry point
  tests/
    unit/                   ← Vitest unit tests
    e2e/                    ← Playwright E2E tests
  utils/
    build.js                ← library-owned, never edit; updated via socle update
  .github/
    workflows/
      deploy.yml            ← auto-deploys dist/ to GitHub Pages on push to main
  index.html                ← edit this
  manifest.json             ← edit this
  package.json
  dist/                     ← generated by build, never edit or commit
```

`dist/` is what GitHub Pages serves. It contains hashed assets, `sw.js` (generated from `_lib/core/sw.js`), `version.json`, and a processed `index.html`. Set `BASE_PATH` env var to `/repo-name/` for GitHub Pages deployments (done automatically by `deploy.yml`).

**The single most important architectural rule:** `_lib/` files never import from `app/`. The dependency arrow points one way only: `app/` imports from `_lib/`. If any `_lib/` file references anything outside `_lib/`, the update mechanism breaks and the separation is a lie. The `/review` command enforces this explicitly.

### Build Stack

- **esbuild** bundles and minifies `app/main.js` and all `_lib/` imports into a single hashed ESM file with a source map. Tree-shaking is automatic.
- **`utils/build.js`** (plain Node.js, uses esbuild API) runs the full build pipeline:
  - Bundles `app/main.js` (esbuild `bundle: true, minify: true, format: 'esm'`). `__APP_VERSION__` is substituted at bundle time via esbuild `define`.
  - Content-hashes the bundle → `dist/main.{hash}.js` + `dist/main.{hash}.js.map`
  - Generates `dist/version.json`
  - Inlines `_lib/core/styles/tokens.css` into `index.html` as a `<style>` block (replaces the `<link>` tag) — eliminates a render-blocking network request
  - Injects `CACHE_VERSION`, `BASE_PATH`, and a slim asset list (bundle + manifest + icons — no `_lib/` or `app/` module files) into `sw.js`. `CACHE_VERSION` is hashed from bundle + tokens + manifest + index.html so any change to any of them invalidates the SW cache.
  - Writes `dist/manifest.json` and copies `app/icons/`
  - `dist/` is cleaned at the start of every build (`rmSync`)
  - Accepts `BASE_PATH` env var (default `/`) for GitHub Pages subdirectory deployments
- `dist/` contains only: `main.{hash}.js`, `main.{hash}.js.map`, `sw.js`, `version.json`, `index.html`, `manifest.json`, `app/icons/`. No `_lib/` or `app/` JS directories — everything is bundled.
- **Vitest** for unit tests
- **Playwright** for E2E tests

---

## Core Module Decisions

### AppElement (base class)

All components extend `AppElement extends HTMLElement`. It provides:

- `attachShadow({ mode: 'open' })` in `connectedCallback`
- A `render()` method that calls `this.template()` once on connect
- `subscribe()` / `unsubscribe()` lifecycle hooks for store bindings
- `adoptedStyleSheets` for shared base styles — one stylesheet, adopted by every shadow root
- Targeted update methods for state changes — **no full re-renders after initial mount** (avoids focus loss, scroll reset, nested component lifecycle churn)

### syncChildren (`core/dom/sync-children.js`)

The render primitive for dynamic lists of child components. `syncChildren(container, items, tagName, assign, { getId = i => i.id, getElId } = {})` reuses existing `tagName` children matched by id, creates missing ones, removes leftovers, and appends in `items` order — kept elements are **moved, not recreated**, so identity, focus, and internal state survive reorders. `assign(el, item)` runs for every kept/created element *before* append, so property setters fire pre-connect (created) or in the old position (kept). Matching: omit `getElId` to match by `el.dataset.id` (the helper sets it on created elements); provide `getElId` (e.g. `el => el._goal?.id`) when the assigned property carries the id. Duplicate item ids get separate elements — the first occurrence claims the match.

### Component Tiers

- **Page components** — one per route, own layout, subscribe to store slices
- **UI components** — reusable widgets, receive data via attributes/properties, emit events upward, zero store knowledge. Must be testable in isolation with no store. All `CustomEvent`s must use `{ bubbles: true, composed: true }` so they cross shadow DOM boundaries — without `composed: true`, events fired inside a shadow root are swallowed and never reach the parent's listener.
- **Service components** — invisible elements (`<sw-manager>`, `<db-init>`), manage lifecycle, never render

### Router

- **History API**, not hash routing.
- SW intercepts all navigation requests and returns `index.html`.
- An `<app-router>` component owns navigation, listens to `popstate`.
- A `navigate(path)` helper calls `history.pushState` and dispatches a navigation event.
- Links never cause full page loads.
- **Route matching is segment-count sensitive.** A dynamic segment like `/:year` matches any single-segment path — `/anything` matches as `year='anything'`. Only paths with a different number of segments (e.g. `/foo/bar`) fall through to the `*` wildcard. E2E tests for the not-found route must use multi-segment paths, not single-segment unknowns.
- **Page entry animation:** `<app-router>` adds a `.enter` class to each newly mounted page element. The class triggers a `_routerFadeIn` keyframe (opacity 0→1) using `--duration-normal` and `--ease-out` tokens, defined on the router's adopted stylesheet. Page components do not need to define their own entry animation.

### Store

- Singleton JS module. Plain object as in-memory state.
- Components call `Store.subscribe(key, callback)` in their `subscribe()` method.
- Components dispatch actions (type + payload). Store writes to IDB, updates state, notifies subscribers.
- Components never touch IDB directly.
- One-way data flow for domain state: Action → Store → IDB → State → Component.
- Ephemeral runtime state bypasses IDB: setState → State → Component.

**API:**
- `boot({ dbName, reducer, deviceId?, version? })` — opens IDB, runs migrations, replays event log via `reducer`, sets initial state. Must be `await`ed in `main.js` before the router or any component renders. The only entry point to IDB at startup.
- `dispatch(type, payload, occurredAt?)` — writes a full event `{ id, deviceId, recordedAt, occurredAt, type, payload }` to IDB, applies reducer, notifies subscribers of changed state keys. Throws if called before `boot`.
- `setState(key, value)` — updates in-memory state and notifies subscribers for that key. Does NOT write to IDB. Use for ephemeral runtime state (e.g. `updateAvailable`) that is not part of the event log and does not survive a reload.
- `subscribe(key, cb)` — registers a callback for a top-level state key. Calls `cb` immediately with the current value.
- `unsubscribe(key, cb)` — removes the callback. No-op if not registered.
- `getState()` — returns the current state snapshot. For debugging and test assertions.
- `reset()` — clears all module state. Test isolation only — never call in production code.
- `attachBlob(id, blob)` — writes `{ id, blob }` to the `images` object store. For binary data (photos, files) that must not go through the event log.
- `getBlob(id)` — reads a blob record from `images` by id. Returns `null` if not found.
- `deleteBlob(id)` — removes a blob from `images` by id.
- `getAllEvents()` — returns all events from IDB sorted by `recordedAt` (with `deviceId` as secondary key). Used by the sync module to build an export payload.
- `getAllBlobs()` — returns all `{ id, blob }` records from the `images` store. Used by the sync module to include binary attachments in exports.
- `importEvents(events)` — writes a batch of pre-formed event objects to IDB as-is, without dispatching or updating in-memory state. Idempotent — duplicate IDs are silently skipped. Throws if called before `boot`.
- `deviceId` is an app concept, not a library concept. Apps pass it into `boot()` for P2P contexts. For single-device apps, omit it — the store defaults `deviceId` to `null` on every event.

### Simple store (`core/store/store-simple.js`)

An alternative to the event-log store for apps that don't need history, undo, or export. Selected at scaffold time via CLI (`Simple state` option). Not the default — use the event-log store unless you have a clear reason not to.

State is a plain object persisted as a single JSON snapshot in IDB. There is no reducer, no migrations system, and no event log. `setState` writes to IDB on every call (fire-and-forget).

**API:**
- `boot({ dbName, initialState? })` — opens IDB, reads the persisted snapshot, merges over `initialState`. `await` before anything else in `main.js`.
- `setState(key, value)` — updates in-memory state, notifies subscribers, and persists the full snapshot to IDB. **Survives reload** — unlike `setState` in the event-log store.
- `subscribe(key, cb)` / `unsubscribe(key, cb)` / `getState()` / `attachBlob` / `getBlob` / `deleteBlob` / `reset()` — identical to the event-log store.
- No `dispatch`, `getAllEvents`, `getAllBlobs`, `importEvents` — these are event-log-only concepts. The sync module cannot be used with the simple store.

### IDB / Data Model

- **Append-only event log** as primary storage. This is non-negotiable.
- Every event: `{ id: uuid, deviceId, recordedAt, occurredAt, type, payload }`
  - `occurredAt` — when the real-world event happened. User-entered or defaults to device time. Correctable.
  - `recordedAt` — when the device logged the event. Immutable. Used for log ordering only.
  - Timestamps are **descriptive, not arbitrative** — they record reality for stats and data visualisation, not for system conflict resolution. A wrong `occurredAt` is a data quality issue, not an integrity issue.
- Event ordering uses `recordedAt` as primary sort key and `deviceId` as secondary.
- **V1: state is always calculated by replaying the full event log on boot.** No caching, no materialised views. The boot function must be designed so the V1→V2 snapshot strategy is a one-line swap — see `.claude/technical-context.md`.
- **The boot sequence must be isolated behind a single function.** Nothing calls IDB directly at boot except this function.
- Schema versioning from day one. Migration functions run inside `boot()` before state is replayed and before any UI renders. Not in SW activate — migrations are data-layer concerns, not service-worker concerns.
- A failed migration must throw — it will be caught and halt app startup visibly, never silently corrupt data.
- The IDB wrapper is implemented in `core/idb/idb.js` — Promise-based and minimal. Exports `openDB`, `put`, `get`, `getAll`, `del`. No `idb` library.

### Service Worker

- SW script must change (version constant) on every deploy for the browser's built-in update check to fire.
- Cache strategy by resource type:
  - `version.json` — Network only, never cached
  - App shell (`index.html`, JS, CSS) — Cache first, updated via SW lifecycle
  - Static assets — Cache first with hashed filenames
  - All other same-origin resources — runtime caching: served from network on first fetch, stored in the active cache for subsequent offline use.
- On activate: delete all caches that don't match current `CACHE_VERSION`.

### Update Flow

Two-layer system:

1. **SW waiting detection (runtime):** `navigator.serviceWorker.register()` → check for already-`waiting` SW or watch `updatefound` → show update banner → on user tap, `postMessage({ type: 'SKIP_WAITING' })` → SW calls `skipWaiting()` → `controllerchange` fires → `location.reload()`. Never auto-apply `skipWaiting`. Guard: `controllerchange` also fires on first install when the SW calls `clients.claim()`. Only reload when a previous controller existed — capture `navigator.serviceWorker.controller` before registering and check it in the handler.
2. **version.json (informational):** Fetched on boot, compared to embedded `APP_VERSION`. Shows "update available" immediately, before any SW update check completes.

A `<sw-manager>` service component owns both layers. An `<update-banner>` UI component subscribes to the relevant store key. When visible, `<update-banner>` sets `--update-banner-height` on `documentElement` (inside a `requestAnimationFrame` so the value reflects the rendered height, including safe-area padding on notched devices), and removes it on dismiss. Sticky and fixed layout elements that must sit below the banner consume this variable — `modules/app-header/app-header.js` is the canonical example: it applies `inset-block-start: var(--update-banner-height, 0px)` (sticky threshold) and `margin-block-start: var(--update-banner-height, 0px)` (flow position), both defaulting to `0px` when no banner is present.

Update checks happen at boot and via the browser's 24h background sweep. With SPA routing, navigation events don't trigger SW update checks — this is acceptable for the long session use cases (competition days) where updates apply between sessions, not during them.

### Gesture Library (`modules/gestures/`)

A hybrid model with two layers:

**Layer 1 — Mixin** (`Gestures(Base)`): for gestures on the host element. Components override handler methods; the mixin handles all pointer event wiring, `touch-action`, gesture state coordination, and lifecycle cleanup automatically.

```js
class MyComponent extends Gestures(AppElement) {
  onTap(e)            { /* fires on tap */ }
  onLongPress(e)      { /* fires after 500ms hold */ }
  onSwipe(e)          { /* fires on directional swipe end */ }
  onSwipeMove(e)      { /* fires on every move during a swipe */ }
  onHoldDragStart(e)  { /* fires after 500ms hold — begins drag phase */ }
  onHoldDrag(e)       { /* fires on every move during hold-drag */ }
  onHoldDragEnd(e)    { /* fires on pointer up after hold-drag */ }
  onHoldDragKey(dir)  { /* fires on ArrowLeft/ArrowRight — 'left' or 'right' */ }
}
```

Keyboard parity is automatic: when `onHoldDragKey` is defined, the mixin wires `keydown` Arrow keys with a `composedPath()` guard so only focus on the host element — not a shadow DOM child — triggers the handler. `Gestures.attach` wires the same keys and additionally sets `tabindex="0"` on the target element if it has no existing tabindex.

Haptic feedback (`navigator.vibrate?.(40)`) fires automatically in the library on hold-drag activation (both mixin and `Gestures.attach`). Do not call it from app code — it will double-fire.

**Layer 2 — `Gestures.attach(element, handlers)`** (static method): for gestures on child sub-elements that are not their own Web Components — drag handles, slider thumbs, swipe rows. Returns a cleanup function. Called from `subscribe()`, cleaned up in `unsubscribe()`. Child gestures are independent of host gesture state.

**Rule of thumb:** if the child has its own visual state or is reused elsewhere, make it a Web Component and use the mixin. If it is a structural part of the parent (a handle div), use `Gestures.attach`.

Normalised event object passed to all handlers:
```js
{ type, direction, velocity, distance, dx, dy, startX, startY, endX, endY, duration, originalEvent }
```

`touch-action` is set automatically on the element based on which gestures are active:
- tap only → `'manipulation'`
- longPress → additionally sets `user-select: none`
- swipe (horizontal) → `'manipulation'` (not `pan-y` — `manipulation` suppresses double-tap-to-zoom so shadow DOM descendants such as swipe-revealed action buttons get immediate `click` events. Horizontal swipe detection is unaffected because browsers only pan-x when a container is actually horizontally scrollable.)
- hold-drag → `'manipulation'` (set automatically by `Gestures.attach`; was `pan-y` before — same shadow DOM click-delay reasoning applies to inner gesture elements)
- drag → `'none'`

**Implemented:** tap, long press, swipe, hold-drag, `Gestures.attach`.

### Sync module (`modules/sync/`)

Exports and imports app data as a binary backup file. Designed for manual backup and cross-device transfer — not real-time P2P sync (that is V2). **Requires the event-log store** — the simple store has no event log to export.

Export produces a gzip-compressed binary file (`.youryear` / app-specific extension). The format is detected by a 4-byte `SCLE` magic header so legacy `.json` exports remain importable. Export can be scoped to a specific year by passing a filter function. Blobs are only included when their id appears in a filtered event — orphaned blobs are excluded automatically.

Import reads the file, detects format from magic bytes, writes events via `importEvents()` (idempotent — duplicate IDs skipped), and writes blobs via `attachBlob()`. Returns `{ eventsAdded, imagesAdded }` counts — callers show these to the user.

**Public API:**
- `exportData(options?)` — returns `Uint8Array` (SCLE-prefixed gzip binary). Accepts optional `options.eventFilter(event)` to scope the export.
- `importData(input)` — accepts `Uint8Array` (binary) or a plain object (legacy JSON). Returns `{ eventsAdded, imagesAdded }`.
- `downloadExport(uint8, filename)` — triggers browser download. First arg is the `Uint8Array` from `exportData`; second is the full filename including extension.
- `readImportFile(file)` — reads a `File` object, detects format by magic bytes, returns `Uint8Array` (binary) or parsed object (legacy JSON).

All four functions are async. `exportData` and `importData` require `Store.boot()` to have been called first.

### P2P (`modules/p2p/`) — V2

Two modes: peer-to-peer (WebRTC, QR-based establishment) and hub mode (one collector, N reporters). The event log's `deviceId` field and append-only model are designed for this from V1 — no schema changes needed when V2 is built. The module is not scaffolded unless selected in the CLI.

→ See [`.claude/technical-context.md`](.claude/technical-context.md) for full design, hub mode detail, and V2/V3/V4 roadmap.

### Multilingual Support (V1 foundation built)

Two non-negotiable habits:

1. **No hardcoded strings in `_lib/` components.** `core/strings.js` is a flat key registry. `_lib/` components call `t('namespace.key')` for every user-visible string. Apps register defaults at startup in `app/strings.js` — the **first import in `app/main.js`** — using `defineStrings(obj, locale = 'en')`. The `locale` param lets apps register translations for other locales at startup too.
2. **CSS logical properties only** (already required in Coding Standards). RTL layout becomes a single `dir="rtl"` attribute on the root.

**V1 locale system (`core/strings.js`):**
- `defineStrings(obj, locale = 'en')` — registers strings for a locale. Call multiple times for multiple locales.
- `setLocale(locale)` — switches the active locale. Persists choice to `localStorage`. Falls back to `'en'` if the locale has no registered strings.
- `getLocale()` — reads active locale from `localStorage`, defaults to `'en'`.
- `t(key, params?)` — resolves: active locale → `'en'` → key (never silent empty string). Optional `params` object substitutes `{placeholder}` tokens in the resolved string.
- **`setLocale(getLocale())` must be called in `main.js` before `boot()`** — this applies the locale persisted from the previous session. Without it, the app always boots in `'en'` even when the user previously selected a different language.
- Language switching triggers `location.reload()` — the new locale is read from `localStorage` on next boot.
- App locale packs live at `app/locales/<locale>.js` and are imported in `app/main.js`.

`Intl.DateTimeFormat`/`Intl.NumberFormat` wrappers and fallback chain improvements are deferred to V4 — see [`.claude/technical-context.md`](.claude/technical-context.md).

---

## Target Devices and Context

- **iOS Safari is not supported.** Users are directed to install Firefox or Android Chrome. Do not design workarounds for iOS Safari PWA limitations.
- **94% mobile, 5% tablet, 1% desktop.** Design exclusively for mobile. Tablet and desktop benefit from the mobile layout, not the other way around. No compromises for desktop convenience.
- **Primary browsers: Firefox and Android Chrome.**
- **Any device can become a competition hub** — hub mode is a UI state switch within the same app, not a separate application. A phone can run as the competition server. No dedicated hardware required.
- **Typical competition day: 8am–8pm (12 hours).** Sessions are long. The app must be stable over this duration with no reloads.
- **The match is the natural unit of work**, not the competition day. Judges enter data per match. A completed match is a logical checkpoint — the basis for the snapshot approach when it is implemented.

---

## Distribution and Updates

Single monorepo. CLI distributed via GitHub (`npx socle`). No npm publishing planned.

### lib-version.json

Every scaffolded project contains `_lib/lib-version.json`:

```json
{
  "version": "0.3.1",
  "modules": ["core", "gestures"],
  "scaffolded": "2025-05-14"
}
```

This is the contract between the library and the user project. The update command reads it to determine which version is installed and which modules to replace.

### Update flow (CLI command: `npx socle update`)

**Ownership model:** `_lib/` and `utils/` are library-owned and updated automatically. `app/`, `index.html`, `manifest.json`, and `package.json` name/version/scripts are developer-owned and never touched.

1. Read `_lib/lib-version.json` for current version and installed modules
2. Compare against the CLI's own version — if equal, print "already up to date" and exit
3. Run `git diff --name-only _lib/` — if any `_lib/` files are locally modified, list them and ask for explicit confirmation before overwriting. Never silently overwrite modified files.
4. Read the current `--color-accent` value from `_lib/core/styles/tokens.css` and preserve it.
5. Replace `_lib/core/` and each installed module. `app/` is never touched.
6. Re-apply the preserved accent colour to the updated `tokens.css`.
7. Replace `utils/build.js` with the library version. If it has local modifications, show a warning and ask for confirmation before overwriting.
8. Sync `package.json` devDependencies — show added/changed packages and ask for confirmation. Never touches `name`, `version`, `scripts`, or any other field.
9. Update `lib-version.json` version field.
10. Print a commit command and `npm install` reminder if devDependencies changed.

### Adding and removing modules (CLI commands: `npx socle add` / `npx socle remove`)

`npx socle add <module>` — copies a module from the library source into `_lib/modules/`, updates `lib-version.json`. Validates that the module exists in the library and is not already installed.

`npx socle remove <module>` — scans `app/` for import references to the module before removing; warns and requires explicit confirmation if any are found. Removes `_lib/modules/<module>/`, updates `lib-version.json`.

Valid module names: `gestures`, `sync`, `images`, `modal-dialog`, `app-header`, `toast`.

`npx socle manage` — interactive TUI showing all currently installed modules pre-selected; the developer toggles modules on/off and confirms; adds and removes are applied in batch using the same `addModule`/`removeModule` logic.

---

## Coding Standards

- **`_lib/` contains zero domain concepts.** No match, score, competition, user, or any application-specific term belongs in library code. `_lib/` is pure infrastructure. Domain concepts live exclusively in `app/`.
- **`_lib/` never imports from `app/`.** Dependency flows one way: `app/` → `_lib/`. Any violation breaks the update mechanism. This is a hard rule with no exceptions.
- **CSS logical properties throughout.** Use `margin-inline-start` not `margin-left`, `padding-block` not `padding-top/bottom`, `border-inline-end` not `border-right`. This costs nothing now and makes RTL language support (V4) essentially free.
- **Accessibility is tiered, not all-or-nothing.** Tier 1 (semantic HTML, keyboard navigation, touch targets, colour contrast, motion preferences) is required on every component — it costs almost nothing and benefits all users. Tier 2 (ARIA, screen reader support) is deferred to V4/V5 and prioritised when user feedback requests it. Shadow DOM makes ARIA non-trivial; form-heavy apps will be the trigger for this work. The `/a11y` command enforces Tier 1 as blocking and logs Tier 2 as advisory notes.
- **Page components must include a `<main>` landmark.** Every page component's `template()` must contain a `<main>` element so assistive technologies can navigate directly to page content. This is a Tier 1 requirement and the established pattern from Phase 3.
- **No comments explaining what code does.** Code must be self-explanatory. Comments only for *why* when non-obvious.
- **No classes beyond Web Components and AppElement extensions.** Plain functions and modules everywhere else.
- **ES modules throughout.** No CommonJS.
- **CSS custom properties for all design values.** No hardcoded colours, spacing, or typography values in component styles.
- **Every key feature has a test before the feature is considered done.** Not full TDD, but no unfinished feature without coverage.
- **Fail loudly.** Silent failures and fallbacks that hide errors are not acceptable, especially in the data layer.
- **Fixed-position components must account for safe area insets.** Any element using `position: fixed` with `inset-block-start: 0` must use `padding-block-start: calc(var(--space-N) + var(--safe-area-top))` to avoid overlapping device notches or dynamic islands. `--safe-area-top` resolves to `0px` on flat screens — zero cost.
- **`prefers-reduced-motion` in shadow DOM:** `animations.css` suppresses transitions globally but cannot reach `@keyframes` defined inside a shadow root. Any component that defines its own `@keyframes` inline (slide-up, fade-in, etc.) must include a `@media (prefers-reduced-motion: reduce)` block disabling them. This is the correct pattern — not a bypass of the global file.
- **`[hidden]` must always win in shadow DOM.** Component CSS using `display: flex` or similar on list items will silently override the UA `[hidden] { display: none }` inside a shadow root. `core/styles/base.js` includes `[hidden] { display: none !important; }` which every shadow root inherits via `adoptedStyleSheets`. Never override `[hidden]` in component CSS.
- **Solve real problems, not imagined ones.** Do not add configuration or fallback behaviour for problems that have not been observed in practice.

---

## Reference App

The reference app is a **yearly goals app** named **YourYear**. It exercises every core library feature:
- Offline-first (works with no connection)
- Event sourcing (goals are append-only, auditable, correctable)
- Gestures (hold-drag on a goal bar to adjust progress percentage; keyboard Arrow key parity and haptic feedback provided automatically by the gesture library)
- Update flow (SW update banner)
- Routing (`/:year` for year overview, `/` redirects to current year, `*` for not-found)

A second reference app (fencing competition scorer) is planned for V2 after P2P is implemented — see [`.claude/technical-context.md`](.claude/technical-context.md).

**Every library feature must be used in the reference app before it is considered complete.**

**The reference app is the living example of a correctly scaffolded app.** Its `package.json`, `vitest.config.js`, `playwright.config.js`, `utils/build.js`, `app/main.js`, and test templates must stay structurally identical to the scaffold equivalents. The only permitted differences are hardcoded names/values where the scaffold uses `%%TOKEN%%` placeholders. `library_tests/scaffold-parity.test.js` enforces this automatically — a failing parity test is a build error, not a logic bug.

**DevDependencies in the monorepo.** The reference-app's devDependencies are declared in both `reference-app/package.json` (for documentation and parity) and the monorepo root `package.json` (for the shared `node_modules/`). When adding a new devDependency, add it in both places at the same version.

### Dev server

```bash
npm run dev:https    # https://localhost:3000 + https://<LAN-IP>:3000
```

Run from `reference-app/`. `dev:https` requires a locally-trusted cert (`local.pem` + `local-key.pem`). Service workers only register on HTTPS or `localhost` — always use `dev:https` when testing offline mode or SW behaviour on a real device.

To generate the cert (one-time per project, requires [mkcert](https://github.com/FiloSottile/mkcert)):
```bash
cd reference-app && npx socle cert
```

Choose shared (`~/.socle-certs/`, reused across projects) or project-specific (generates `local.pem` + `local-key.pem` in the current directory). The Android CA install walkthrough runs automatically if you enter a LAN IP.

Cert files (`*.pem`, `*.key`, `*.crt`) are gitignored — never commit them.

---

## Testing

Four distinct test scopes — do not mix them:

**Library unit tests** (library developer):
- Co-located `*.test.js` files next to source in `core/` and `modules/`
- CLI unit tests co-located in `cli/`
- Run with Vitest in Node environment. IDB tests use `fake-indexeddb` (loaded globally via `core/test-setup.js`). DOM tests use `// @vitest-environment happy-dom` only when Shadow DOM or `document` access is actually needed — pure IDB/Store tests run in Node without any DOM environment.

**Library infrastructure tests** (library developer):
- `library_tests/` at monorepo root — automated consistency checks that no unit test can catch
- `scaffold-parity.test.js` — verifies scaffold matches reference-app structure and tokens
- `lib-boundary.test.js` — verifies no `core/` or `modules/` file imports from `app/` or uses bare module specifiers
- `css-logical-props.test.js` — verifies no directional CSS properties in `core/styles/`
- `scaffold-tokens.test.js` — verifies all `%%TOKEN%%` placeholders are present in scaffold files
- These tests run automatically with `npm test` and act as a build-time guardrail

**Reference app tests** (library developer, proves features work end-to-end):
- `reference-app/tests/unit/` — component and store unit tests
- `reference-app/tests/e2e/` — Playwright E2E tests
- Cover: routing, data persistence across reload, SW update flow, offline behaviour
- The Playwright `webServer` command must pass `--single` to `serve` (SPA mode). Without it, the static server returns 404 for non-root paths on first visit, blocking SW installation and causing all SW-dependent tests to timeout.

**Scaffolded app tests** (delivered to app developers via `scaffold/`):
- `tests/unit/` and `tests/e2e/` scaffolded with working Vitest + Playwright configs
- App developers extend these — they never configure the test infrastructure from scratch
- `scaffold/tests/` is excluded from the monorepo `vitest.config.js` — these are templates, not runnable tests
- `vitest.config.js` `include` pattern covers both `tests/unit/**/*.test.js` and `_lib/**/*.test.js` — library unit tests run in the scaffolded app automatically. This means app-layer changes that break `_lib/` internals are caught at test time, not after a deploy. The build excludes `*.test.js` files from `dist/`.

**IDB and DOM environments:**
- `fake-indexeddb` provides the `indexedDB` global in Node/test environments. Loaded once via `core/test-setup.js` → `setupFiles` in `vitest.config.js`. Never mock IDB — run against `fake-indexeddb` instead.
- `happy-dom` provides DOM APIs (document, customElements, shadowRoot, CSS). Apply `// @vitest-environment happy-dom` only to test files that actually need DOM access. IDB and Store tests do not need it.
- These are independent: `happy-dom` does not provide IndexedDB, and `fake-indexeddb` does not provide DOM APIs.
- **Pointer capture mocks:** `happy-dom` does not implement `setPointerCapture` or `releasePointerCapture`. Any test file that mounts a component using the `Gestures` mixin must add at module scope: `HTMLElement.prototype.setPointerCapture = () => {};` and `HTMLElement.prototype.releasePointerCapture = () => {};`. These are no-ops — pointer capture is not exercised in unit tests. Do not add these to the global setup (`core/test-setup.js`) — they belong only in test files that mount gesture-enabled components.
- **Async DOM assertions:** when asserting DOM state that updates in response to a store callback or other async side effect, use `vi.waitFor(() => expect(...))` rather than asserting synchronously. Store callbacks fire asynchronously after `dispatch()` — synchronous assertions will see stale DOM.
- **Same-millisecond dispatch ordering:** dispatching multiple `store.dispatch()` calls synchronously gives all events the same `recordedAt` timestamp. On replay, IDB orders events with identical `recordedAt` by UUID key (random). Tests that fire many events in a loop and then assert a specific aggregate value after reload will produce non-deterministic results. Fix: fire one event, capture the observed state, reload, and assert the captured value was preserved — not a computed total.

Rules applying to all four:
- Test files are created alongside the feature, not after.
- UI components must be testable in isolation with no store dependency.
- Every key feature has a test before the feature is considered done.

---

## Workflow Discipline

Custom slash commands are available for all repeating tasks. The important thing is *when* to use them — discovery is automatic, but sequencing is not.

**Before starting any new feature:** run `/scope`. Do not write code until scope is confirmed.

**When building a feature:** use `/component`, `/gesture`, or `/migration` to scaffold correctly. Do not create these files manually.

**After completing a feature:** run `/test`, then `/integrate`, then `/sync`, then `/a11y`, then `/docs feature`, then `/review` — in that order. A feature is not done until all six pass.

**`/integrate` and `/sync` are distinct checks that must both run — do not skip either:**
- `/integrate` — proves the feature is meaningfully used in the reference app (domain-aware, per-feature)
- `/sync` — proves the scaffold reflects reference-app infrastructure changes (structural, cross-cutting)
They answer different questions. Running one does not substitute for the other.

**`/sync` is mandatory after any change to `reference-app/` infrastructure** (build script, main.js, vitest config, package.json, page structure, test templates). It checks that the scaffold reflects the same changes. Skipping it is the single most common way scaffold and reference-app drift apart.

**Before moving to the next build phase:** run `/status` to confirm the current phase is genuinely complete.

**Before committing:** run `/docs changelog` to log the work, then `/commit`. Do not let Claude Code commit on its own initiative outside of this command.

**Before releasing a version:** run `/docs all`, then `/generate-claude`, then tag the release. In that order — docs first, app templates second, tag last.

**If any library command files changed during development:** run `/generate-claude` before the release commit — modified library commands do not flow to `scaffold/.claude/commands/` automatically. `/update-meta` will flag this at the end of any session where commands changed.

**When in doubt about whether something belongs in the library:** run `/scope`. When in doubt about code quality: run `/review`. When in doubt about accessibility: run `/a11y`. These are cheap to run and expensive to skip.
