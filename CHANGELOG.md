# Changelog

All notable changes to Socle are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versions follow [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added
- `core/strings.js` — multi-locale support: `setLocale(locale)` and `getLocale()` added alongside `defineStrings(obj, locale='en')`; locale persisted in `localStorage`; `t(key)` resolves active locale → `'en'` → key
- `core/store/store.js` — `attachBlob(id, blob)`, `getBlob(id)`, `deleteBlob(id)` for binary data (photos, files) stored in a separate `images` object store outside the event log
- `core/idb/idb.js` — `get(db, storeName, id)` and `del(db, storeName, id)` added to the wrapper
- `core/idb/migrations.js` — schema v2: `images` object store (`keyPath: 'id'`) for blob storage
- `core/styles/base.js` — `[hidden] { display: none !important; }` added to the global adopted stylesheet so component CSS using `display: flex` cannot silently override the hidden attribute in shadow DOM
- YourYear reference app — year photo: upload, change, and remove per year; stored as a blob in IDB; displayed as header background with dark gradient overlays for contrast; text turns white when image is present
- YourYear reference app — language picker: EN, FR, CA locale options in the year-header menu; selection persists across reload; locale packs at `app/locales/fr.js` and `app/locales/ca.js`
- YourYear reference app — `goal-dialog` delete button: visible when editing an existing goal; dispatches `goal-delete` event; home-page handles deletion without touching swipe-reveal UI
- E2E tests — `year-photo.spec.js`: upload, menu state, persistence across reload, remove, year scoping
- E2E tests — `i18n.spec.js`: locale list, FR/CA rendering, persistence across reload, switch back to EN
- E2E tests — goal delete via dialog: delete from edit dialog, delete persists on reload, deleted goal no longer in list
- Scaffold E2E templates updated — `navigation.spec.js` uses `page.goto()` for all navigation (removed old `dispatchEvent` pattern); `persistence.spec.js` and `offline.spec.js` replace broken stub selectors with commented domain templates
- Unit tests — `year-header.test.js`: photo sub-sheet state, language sub-sheet; `goal-dialog.test.js`: delete button visibility, delete event dispatch
- `/test` command updated with E2E section — shadow DOM traversal pattern, `page.mouse` for gesture components, when to write E2E vs unit tests

### Changed
- `goal-item` — swipe-to-delete now also available in edit mode (previously only in non-edit mode for completed goals); closing reveal on `editMode` change is unconditional (previously only closed on exit from edit)
- `goal-item` — `peekHint()` reflow trick (`void el.offsetWidth`) ensures animation restarts correctly even on the first item
- `goal-dialog` — opened via `pointerup` from a gesture; uses `_justOpened` + `requestAnimationFrame` guard to prevent the same pointer event chain from immediately triggering backdrop dismissal
- `year-header` — photo menu state determined at open time (not lazily) so Add/Change/Remove reflects current IDB state immediately
- `docs/architecture.md` — Store API reference updated with blob operations; new Strings and locale section with multi-locale usage guide and API reference

### Fixed
- Shadow DOM `[hidden]` override — component CSS `display: flex` on list items silently overrode `[hidden]` attribute; fixed globally in `core/styles/base.js`
- Photo menu — all three options (Add, Change, Remove) were always visible regardless of whether a photo was assigned; now shows only the relevant options

### Added
- YourYear reference app — yearly goals PWA demonstrating the full library stack: year-scoped routing, event-sourced store, hold-drag gestures, offline-first, SW update banner
- `year-redirect` page — redirects `/` to `/${currentYear}` via `navigate()`
- `year-header` UI component — year label with prev/next arrows; gains `.compact` class on scroll past 80px, loses it below 60px (hysteresis)
- `goal-item` UI component — goal progress bar with hold-drag (`Gestures.attach`) and keyboard Arrow key alternative; `role="slider"`; action button deletes in edit mode, fails/restores outside it; intra-shadow `role="status"` live region announces state changes via `t()`
- `goal-dialog` UI component — native `<dialog>` for goal title input; `aria-modal="true"`; emits `goal-saved` / `goal-cancelled`
- `home-page` — three goal sections (capstone, 3-month milestones, wow moments); per-section edit mode; tab bar (`role="tablist"`, `aria-selected`) switching between Goals and Lists panels; year-keyed store subscription; `role="list"` on each goal list
- Store event types `GOAL_SET`, `GOAL_PROGRESS_SET`, `GOAL_FAIL` — year-keyed state shape: `goals: { [year]: [{ id, title, percentage }] }`
- E2E test suite (`goals.spec.js`) — creation for all three sections, deletion (single and multiple with survivor check), hold-drag progress, fail/restore lifecycle, persistence across reload
- Navigation E2E additions — year routing (home-page renders at `/:year`), scroll compression (compact class on/off)
- Swipe gesture in mixin (`onSwipeMove`, `onSwipe`) — horizontal pointer tracking with velocity, directional discrimination (yields to native vertical scroll when `|dy| >= |dx|`), and `touch-action: pan-y`
- Hold-drag gesture in mixin (`onHoldDragStart`, `onHoldDrag`, `onHoldDragEnd`) — 500ms hold to commit, then free drag; takes priority over long-press when both are defined
- `Gestures.attach(element, handlers)` static method — attaches hold-drag and/or swipe gestures to a child sub-element; returns a cleanup function; `stopPropagation` on `pointerdown` keeps child and host gesture states independent
- `dev:https` npm script in scaffold and reference app — builds then serves with a locally-trusted TLS cert for mobile SW testing
- `docs/testing.md` — testing guide covering the three-tier test structure, Vitest environments, fake-indexeddb, pointer capture mocks, async DOM assertions, and component and store test patterns

### Changed
- `update-banner` — slide-down entry animation; compact bar layout using `--page-padding`; z-index reduced from 9999 to 200
- `Gestures` mixin: hold-drag `touch-action` changed from `'none'` to `'pan-y'` during the tracking phase (before the 500ms hold timer fires), so vertical page scroll is not blocked while the user is still pressing; vertical pointer movement during hold-wait now cancels the gesture and releases pointer capture cleanly
- `Gestures.attach`: same vertical-movement fix applied — vertical movement before hold timer fires cancels and releases
- Playwright `webServer` passes `--single` to `serve` — SPA mode returns `index.html` for all paths, enabling SW installation on first visit to non-root routes (without this, the server returns 404 and the SW never installs)
- `Gestures(Base)` class mixin — tap and long-press gestures using Pointer Events; normalised event object; automatic wiring and cleanup on connect/disconnect; `touch-action` and `user-select` set per gesture type
- SW install handler now uses `Promise.allSettled` instead of `Promise.all` — a single failed asset fetch no longer aborts the entire pre-cache
- Build script now filters test files (`.test.js`, `test-setup.js`) and SW source (`sw.js`) from the pre-cache asset list
- `docs/gestures.md` updated with swipe, hold-drag, `Gestures.attach`, coordination rules, haptics guidance, and full API reference
- `scaffold/tests/e2e/persistence.spec.js` added — count and accumulation persistence tests; comment block shows the pattern for domain-specific assertions
- Library infrastructure tests moved from `tests/` to `library_tests/` at monorepo root
- Library slogan updated to "Build Offline Mobile Apps"

### Removed
- `goal-card` UI component (reference app) — replaced by `goal-item` with the revised goal architecture

### Fixed
- Navigation E2E tests: not-found-page tests now use `/foo/bar` (multi-segment path) — single-segment paths like `/nonexistent` match `/:year` and render home-page, never reaching the `*` wildcard
- Persistence E2E: replaced 10 rapid `ArrowRight` dispatches (non-deterministic IDB replay when all share the same `recordedAt` ms) with a single dispatch, capturing the observed value before reload and asserting it is preserved after

### Added (Phase 5)
- `setState(key, value)` on the store — updates in-memory state and notifies subscribers without writing to IDB; use for ephemeral runtime state that does not belong in the event log
- `<sw-manager>` service component (`core/sw-manager/sw-manager.js`) — owns SW registration, waiting detection, `version.json` polling, and `controllerchange` reload; two-layer update detection with first-install guard
- `<update-banner>` UI component (`core/components/update-banner/update-banner.js`) — fixed-position notification banner subscribed to `updateAvailable`; Reload posts `SKIP_WAITING` to the waiting SW; Dismiss hides without reloading; respects `--safe-area-top`; `role="alert"` for screen readers
- `core/strings.js` — flat key registry: `defineStrings(obj)` merges English defaults, `t(key)` looks up with key-as-fallback; `app/strings.js` must be the first import in `app/main.js` so strings register before any component renders
- `app/strings.js` (scaffold and reference app) — English defaults for update-banner strings; pattern for all future `_lib/` component strings
- SW runtime caching — same-origin responses stored on first fetch for offline availability; pre-cache now enumerates all `_lib/` and `app/` files via the build script
- `version.json` — generated on every build; fetched network-only by the SW and by `<sw-manager>` for Layer 2 update detection
- Playwright `serviceWorkers: 'allow'` added to reference app and scaffold configs
- E2E tests — `offline.spec.js`, `update-flow.spec.js`, `persistence.spec.js`, `install.spec.js` (manual checklist); SW navigation intercept test enabled
- Scaffold Claude Code commands — 12 app-developer commands in `scaffold/.claude/commands/`: component, review, scope, test, commit, docs, migration, i18n, a11y, test-pwa, status, setup-claude
- `scaffold/CLAUDE.md.template` — stamped by CLI with app name, version, accent colour, and selected modules
- `/setup-claude` command — interactively builds `CLAUDE.md` app-context section by reading existing code and asking structured questions about purpose, flows, data model, and constraints
- `docs/sw-update-flow.md` — guide to the two-layer update system, sw-manager, update-banner, strings, asset pre-caching, and manual verification checklist
- `docs/claude.md` — guide to using Claude Code in a scaffolded app: /setup-claude, workflow, command reference

### Changed
- Build script enumerates all files under `_lib/` and `app/` for the SW pre-cache list, following symlinks — full offline support from first visit without manual asset list maintenance
- `docs/architecture.md` — store API updated with `setState`; SW section expanded with cache strategy table
- `docs/getting-started.md` — Claude Code setup section added
- `README.md` — status table updated, new docs linked

### Added (Phase 4)
- Store module (`core/store/store.js`) — singleton event store with `boot()`, `dispatch()`, `subscribe()`, `unsubscribe()`, `getState()`, and `reset()` (test isolation only)
- IDB wrapper (`core/idb/idb.js`) — Promise-based `openDB`, `put`, `getAll`; zero dependencies, ~35 lines
- Schema migration runner (`core/idb/migrations.js`) — versioned array of migration functions; runs inside `boot()` before any UI renders; throws on missing version to halt startup visibly
- Append-only event schema — every event records `id`, `deviceId`, `recordedAt`, `occurredAt`, `type`, `payload`; state derived by replaying log through a reducer on every boot
- Reference app store integration — `app/store/reducer.js` with `goal:added` handler; `home-page` subscribes to `goals` key and dispatches on button click
- `core/test-setup.js` — loads `fake-indexeddb/auto` globally so all IDB tests run in Node without mocking
- Library infrastructure tests (`tests/`) — automated consistency checks: `scaffold-parity.test.js`, `lib-boundary.test.js`, `css-logical-props.test.js`, `scaffold-tokens.test.js`
- Scaffold parity enforcement — `reference-app/package.json` now mirrors `scaffold/package.json` (scripts and devDependencies); `scaffold-parity.test.js` enforces this automatically
- `/sync` command — bidirectional consistency check between reference app and scaffold (renamed from `/port`; now explicitly checks both directions)
- `fake-indexeddb` and `happy-dom` added as devDependencies to monorepo root, scaffold, and reference app
- Store and IDB documentation in `docs/architecture.md` — event schema, boot sequence, reducer pattern, migration guide, full API reference

### Changed
- Build script import-path rewrite now uses a general regex (`/'\.\/(?!_lib\/)/g`) instead of hardcoded per-directory rules — any new `app/`-relative import directory is handled automatically
- `reference-app/vitest.config.js` now includes `setupFiles` pointing to `_lib/core/test-setup.js` — running `npm test` from within the reference app directory now works correctly
- `scaffold/vitest.config.js` includes `setupFiles: ['./_lib/core/test-setup.js']`
- Scaffold `app/store/reducer.js` added as a stub template with documented extension pattern

### Fixed
- `home-page` button touch target — added `min-block-size: var(--touch-target)` and `padding-inline: var(--space-4)` via shadow DOM `<style>` block
- Goal count DOM update uses `String()` coercion explicitly — prevents empty string when count is `0` in happy-dom

- History API router (`core/router/router.js`) — `navigate(path)` helper and `matchRoute()` with `:param` segment support
- `<app-router>` Web Component (`core/router/app-router.js`) — page outlet that swaps components on `navigate` and `popstate` events; `routes` array accepts `path` and `component` entries; wildcard `*` route for 404 handling
- SW navigation intercept (`core/sw.js`) — `navigate`-mode requests return cached `index.html`, enabling hard refresh at any route; `clients.claim()` in activate so the SW takes control on first install
- Playwright E2E test infrastructure for the reference app (`reference-app/playwright.config.js`, `reference-app/tests/e2e/navigation.spec.js`) — covers forward navigation, 404 routes, and browser back; SW hard-refresh test scaffolded and skipped until Phase 5
- `/port` command — audits reference-app for files that should be ported to the scaffold; reports MISSING, STALE, TOKEN GAP, or OK per category without auto-fixing
- `/update-meta` command — end-of-session audit of CLAUDE.md and command files for gaps and stale content; proposes exact changes before applying
- `AppElement` base class (`core/app-element.js`) — extends `HTMLElement` with Shadow DOM setup, `adoptedStyleSheets`, and `render`/`subscribe`/`unsubscribe` lifecycle
- Base structural stylesheet (`core/styles/base.js`) — singleton `CSSStyleSheet` adopted by every shadow root; provides `:host { display: block }`, box-sizing, and tap-highlight reset
- Reference app document baseline — `tokens.css` linked in `index.html`, body reset using design tokens, `theme-color` set to palette background
- `docs/components.md` — full guide to building components with `AppElement`, including tiers, shadow DOM, the render lifecycle, and the subscribe pattern
- `/i18n` skill — audit tool for internationalisation compliance; enforces no hardcoded strings in `_lib/` and scaffolds the `t()`/`defineStrings()` pattern for new components
- Monorepo structure: `core/`, `modules/`, `scaffold/`, `cli/`, `reference-app/`, `docs/`
- Build script (`utils/build.js`) — content-hashed assets, `version.json`, SW template injection, `BASE_PATH` support for GitHub Pages subdirectory deployments
- CSS token system (`core/styles/tokens.css`) — warm neutral palette, accent theming via two CSS variables
- CSS animations (`core/styles/animations.css`) — page transitions, element entrances, bottom sheet, toasts, tap feedback, drag and swipe gesture classes; respects `prefers-reduced-motion`
- Service Worker template (`core/sw.js`) — cache-first strategy, cache versioning, activate-time stale-cache cleanup
- Scaffold templates (`scaffold/`) — mirroring the exact app directory structure with `%%TOKEN%%` placeholders for CLI substitution
- GitHub Actions workflow template (`scaffold/.github/workflows/deploy.yml`) — builds and deploys to GitHub Pages on push to main
- Reference app shell (`reference-app/`) — `_lib/` symlinked to monorepo `core/` and `modules/` for live development
- Claude Code project files for library development (`.claude/commands/`)

### Changed
- Build script now copies `_lib/` and `app/` into `dist/` so the output is self-contained for direct ES module serving; rewrites two import paths in the built `main.js` to match the `dist/` layout

---

<!--
Template for new versions:

## [x.y.z] — YYYY-MM-DD

### Added
-

### Changed
-

### Fixed
-

### Deprecated
-

### Breaking
-
Migration: describe what developers need to change in their app/ code.
-->
