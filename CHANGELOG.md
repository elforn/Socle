# Changelog

All notable changes to Socle are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versions follow [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added
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
