# Changelog

All notable changes to Socle are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versions follow [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added
- `Gestures(Base)` class mixin (`modules/gestures/gestures.js`) — tap and long-press gestures using Pointer Events; normalised event object; automatic pointer event wiring and cleanup on connect/disconnect; `touch-action` and `user-select` set per gesture type
- `goal-card` UI component (`reference-app/app/components/goal-card/goal-card.js`) — first component using the Gestures mixin; tap to toggle, long press to delete; keyboard alternatives (Enter/Space → tap, Delete/Backspace → long press); `aria-pressed` and `aria-label` for accessibility
- `dev` and `serve` npm scripts in scaffold and reference app — `npm run dev` builds then serves at port 3000; `npm run serve` serves a previously built `dist/`
- Deterministic hash test added to `reference-app/tests/unit/build.test.js` — verifies the same content produces the same hashed filename across two independent builds
- `docs/gestures.md` — full gesture library guide: mixin usage, two-layer model, implemented gestures, event object, coordination rules, keyboard alternatives, testing guidance, and API reference

### Changed
- Library infrastructure tests moved from `tests/` to `library_tests/` at monorepo root — makes the folder's purpose immediately clear to a new contributor
- Reducer `goal:added` property spread order fixed — `{ ...event.payload, id: event.id, completed: false }` ensures the event `id` is always authoritative, even if payload carries an `id` field
- Gesture architecture formalised as hybrid model: mixin for host-level gestures (zero boilerplate), `Gestures.attach(element, type, handler)` static method for child sub-elements (deferred until first use case)
- Library slogan updated to "Build Offline Mobile Apps"

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
