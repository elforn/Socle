# Changelog

All notable changes to Socle are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versions follow [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

---

## [0.13.0] — 2026-07-18

### Added
- `modules/modal-dialog/modal-dialog.js` — swipe-down-to-dismiss on the sheet's `.handle` (mobile / ≤600px only). Pointerdown on the handle captures the pointer, records start Y, and disables the dialog transition; per-drag `pointermove`/`pointerup`/`pointercancel` listeners are added on down and removed on up/cancel (mirrors the gesture library's lifecycle). The dialog follows the finger downward via inline `transform: translateY()`; upward drags clamp to rest. Release commits when dragged past 25% of sheet height **or** flicked down faster than 0.5 px/ms — the sheet animates to `translateY(100%)` then `close()` on `transitionend` (with a 350ms `setTimeout` fallback), routing through the native `close` event to `modal-close` exactly like every other dismissal path. Below-threshold releases spring back to rest with the existing `cubic-bezier(0.32, 0.72, 0, 1)` easing. `prefers-reduced-motion` skips the follow-transform and slide-out: a past-threshold release closes immediately, a below-threshold release resets. `pointercancel` and a close by any other route (backdrop, native) tear the drag down cleanly; `show()` clears any leftover inline transform so a prior drag can never leave the sheet mis-positioned. The `_justOpened` backdrop guard and the `show()`/`close()`/`modal-close`/aria-label public contract are unchanged; the centered desktop dialog is unaffected (the handle is `display: none` above the breakpoint and the gesture is gated on `matchMedia('(max-width: 600px)')`)
- `docs/modal-dialog.md` — module doc covering the bottom-sheet variant, drag-to-dismiss, and scroll containment; linked from README

### Changed
- `modules/modal-dialog/modal-dialog.js` — the dialog now sets `overscroll-behavior-y: contain` so an overscroll inside the sheet never chains to the page's root scroller or triggers native pull-to-refresh, and the `.handle` sets `touch-action: none` so a handle drag is fully owned by the pointer handlers. Containment lives on the dialog element only — `document.body`/`documentElement` overscroll is left to the consuming app

---

## [0.12.0] — 2026-07-17

### Added
- `modules/reorder/reorder.js` — `Reorder.attach(container, options)`: drag-to-reorder controller ported from the three hand-rolled copies in the reference app. Manages the ghost clone, accent insert line, edge auto-scroll (100px/14px), drop-index maths, and keyboard reorder; returns a `detach()`. Consumer-initiated (listens for a bubbling `dragStartEvent` carrying `{ element, startX, startY }` rather than installing its own pointerdown, so it composes with the gesture library). Single-list (`onMove(from, to)`) and cross-section (`sections` + `onMoveSection(fromSection, from, toSection, to)`) modes. No-change drops (`from === to || from === to - 1`, same section) are skipped. Keyboard reorder uses `from + 2` down / `from - 1` up. Registered as a CLI module (`npx socle add reorder`)
- `docs/reorder.md` — full module doc; linked from README (Toast doc also linked)

### Changed
- `modules/toast/toast.js` — the toast container is now a manual popover (`popover="manual"` + `showPopover()`), rendering in the top layer above any open `<dialog>`. Re-shown on every `toast()` call so it stays above a dialog opened after it; fixes the Undo/action button being unclickable behind a modal backdrop on desktop. Feature-detected — falls back to the fixed-position container where the Popover API is absent

---

## [0.11.0] — 2026-07-16

### Added
- `core/app-element.js` — auto-cleanup helpers: `listen(target, type, handler, options?)` (`addEventListener` + recorded removal, byte-for-byte equivalent to a manual pair — same options object identity, `{capture}` supported) and `watch(key, callback)` (store `subscribe` + recorded unsubscribe). Both return a removal function for mid-life use. `disconnectedCallback` replays removals after `unsubscribe()` and clears the records — reconnection starts clean. Not for per-gesture dynamic listeners (pointermove/up added on pointerdown), which keep manual management
- `docs/components.md` — `listen`/`watch` API reference and updated subscribe/unsubscribe guidance

---

## [0.10.0] — 2026-07-16

### Added
- Scaffold `utils/build.js` — emits `dist/404.html` as a copy of the built `index.html` so static hosts (GitHub Pages) serve the app for deep links; the client router resolves the route
- Scaffold `utils/build.js` — `version.json` now includes `buildHash` (the SW cache hash); written after the hash is computed so apps can display a build identifier without importing it into app code
- `core/dom/sync-children.js` — `syncChildren(container, items, tagName, assign, { getId, getElId })`: keyed child reconciliation, the library's render primitive for lists. Reuses existing children matched by id (moved, not recreated — identity, focus, and internal state survive reorders), creates missing ones, removes leftovers, appends in `items` order. `assign` runs before append so property setters fire pre-connect. Matches by `el.dataset.id` (default, managed automatically on created elements) or a custom `getElId` for elements that carry their id on an assigned property
- `docs/components.md` — "Rendering lists — syncChildren" section

### Fixed
- `library_tests/scaffold-parity.test.js` — the `%%BASE_PATH%%` index.html assertion sliced from the `writeFileSync` call, but the 404.html change moved the substitution into a `const indexHtml` built before the write; the slice missed the `.replaceAll` and the test failed against correct code. Now anchors on the `indexHtml` assignment

---

## [0.9.20] — 2026-06-22

### Added
- `modules/toast/toast.js` — extended API: `toast(message, type, { duration, action })` with action button, configurable duration, `duration: Infinity` for persistent toasts (auto-adds `×` close button), and `const { dismiss, update } = toast(...)` return handle
- `modules/toast/toast.js` — `update({ message, type })` mutates the live toast in place and restarts the auto-dismiss timer — eliminates the "dismiss then show a new one" flash for in-progress → complete transitions
- `modules/toast/toast.js` — swipe-to-dismiss (left or right, 60px threshold)
- `modules/toast/toast.js` — pause on hover and focus: auto-dismiss timer pauses while the toast is hovered or focused, resumes with the remaining time on leave
- `modules/toast/toast.js` — fade-out exit animation on dismiss using `--duration-fast`; replacement by a new toast is instant to avoid two toasts being visible simultaneously
- `docs/toast.md` — full feature doc and API reference

### Changed
- `modules/toast/toast.js` — default auto-dismiss duration changed from 3000ms to 4000ms to match the ui.md spec ("auto-dismisses after 4 seconds")
- Scaffold CLI — toast module selection now generates a demo card with Info and "With action" buttons in the home page
- `modules/toast/toast.js` — action button contrast: `'info'` toasts use `--color-accent` for the action button (6.2:1 contrast); `'success'` and `'error'` toasts use `inherit` to meet WCAG AA at 4.5:1+

---

## [0.9.16] — 2026-06-18

### Fixed
- `modules/modal-dialog/modal-dialog.js` — `show()` now uses `setTimeout(0)` instead of `requestAnimationFrame` to clear the `_justOpened` guard. On Android Chrome the synthetic click from the touch that triggered `show()` fires after a rAF but before a macrotask, so the guard was already cleared when the click arrived — the backdrop handler fired and immediately closed the dialog. A `setTimeout(0)` is guaranteed to run after all pending input tasks including that synthetic click.

### Added
- `modules/modal-dialog/modal-dialog.js` — `show(focusEl = null)` accepts an optional element to focus after the dialog opens. `showModal()` asynchronously grabs focus to the first focusable element; passing `focusEl` overrides that inside the same `setTimeout(0)` callback so callers don't need their own double-rAF workaround.

---

## [0.9.15] — 2026-06-17

### Fixed
- `modules/gestures/gestures.js` — both the mixin (`_gestureUp`) and `Gestures.attach` (`onUp`) now call `e.preventDefault()` on `pointerup` when a swipe completed. On Samsung Android Chrome, the browser can still apply double-tap disambiguation to the synthetic `click` that follows a swipe even with `manipulation` set on all elements, because disambiguation state is tracked at the gesture level. `preventDefault()` on `pointerup` suppresses that synthetic `click` at the source, so no element anywhere on the page receives a delayed or double-tap-required click after a swipe. Taps and hold-drag gestures are unaffected — `preventDefault` is only called when `phase === 'swipe'`.

---

## [0.9.14] — 2026-06-17

### Fixed
- `modules/gestures/gestures.js` — `Gestures.attach` now sets `touch-action: manipulation` on the inner gesture element instead of `pan-y`. The shadow DOM boundary breaks touch-action inheritance, so the inner element received plain `pan-y` regardless of the host's `manipulation` value. `pan-y` leaves double-tap-to-zoom detection active, causing any subsequent `click` event (even on unrelated page elements) to be delayed 300–500ms or require two taps. `manipulation` disables the disambiguation. Vertical scrolling is unaffected because browsers only pan natively when a container is actually scrollable.

---

## [0.9.13] — 2026-06-17

### Fixed
- `scaffold/utils/build.js` and `reference-app/utils/build.js` — `%%BASE_PATH%%` tokens in `index.html` are now substituted at build time via `.replaceAll('%%BASE_PATH%%', BASE_PATH)`. Previously the substitution was applied to `sw.js` and `manifest.json` but not `index.html`, causing the `<link rel="manifest">` href to be written literally as `%%BASE_PATH%%manifest.json` on non-root deployments.

---

## [0.9.12] — 2026-06-16

### Fixed
- `modules/gestures/gestures.js` — swipe and hold-drag now set `touch-action: manipulation` on the host element instead of `pan-y`. `pan-y` propagates down to shadow DOM descendants via the touch-action intersection algorithm, causing the browser to apply 300ms double-tap-to-zoom disambiguation on any revealed action button — `pointerdown` fires immediately but `click` is delayed 1–3 seconds. `manipulation` suppresses that disambiguation. Horizontal swipe detection is unaffected because browsers only pan-x when a container is actually horizontally scrollable.
- `reference-app/app/components/goal-item/goal-item.js` — action button now listens on `pointerup` (fires immediately on finger-lift) with a `click` keyboard-only fallback (`e.detail === 0`), ensuring instant response on both touch and keyboard.

---

## [0.9.11] — 2026-06-14

### Fixed
- `core/sw.js` — `version.json` passthrough now uses `new URL(event.request.url).pathname.endsWith('/version.json')` instead of `event.request.url.endsWith('/version.json')`. The previous check always failed when the cache-busting `?_=<timestamp>` query string was present (added in v0.9.8), causing the SW to cache each unique timestamped URL under a key that was never hit again, and preventing Playwright from intercepting the network request in E2E tests.

---

## [0.9.10] — 2026-06-14

### Fixed
- `reference-app/tests/e2e/update-flow.spec.js` and `scaffold/tests/e2e/update-flow.spec.js` — `routeFutureVersion` now uses a regex (`/\/version\.json/`) instead of an exact string to match the intercepted URL. The cache-busting `?_=<timestamp>` query parameter added in v0.9.8 caused Playwright's string route to miss the request, so the version mismatch was never detected and the update banner never appeared in tests 2–4.

---

## [0.9.9] — 2026-06-14

### Added
- `core/store/store.js` and `core/store/store-simple.js` — new `setRuntimeState(key, value)` export. Identical to `setState` but skips the IDB write and notifies subscribers unconditionally (bypassing the old === new equality guard). Use for session-only flags such as `updateAvailable` that must not survive a page reload. The unconditional notification ensures re-delivery works even when the value is already `true` in restored state.

### Fixed
- `core/sw-manager/sw-manager.js` — switched from `setState` to `setRuntimeState` for all `updateAvailable` writes. In simple-store apps, `setState` persisted `updateAvailable: true` to IDB; on the next session `boot()` restored it into `_state`; when sw-manager then called `setState('updateAvailable', true)` again the equality guard in `_notify` saw no change and fired no subscribers — the update banner never showed even though a new SW was waiting.

---

## [0.9.8] — 2026-06-14

### Fixed
- `core/sw-manager/sw-manager.js` — Layer 1: `register().then()` now checks `registration.installing` directly before attaching the `updatefound` listener. Previously, if `updatefound` fired during `boot()` (the browser detects the new SW before `main.js` completes), the event was missed and the update banner never appeared.
- `core/sw-manager/sw-manager.js` — Layer 2: `version.json` fetch now appends `?_=${Date.now()}` to bust CDN caches (e.g. GitHub Pages/Fastly serves version.json with `Cache-Control: max-age=600`). `cache: 'no-store'` only bypasses the browser's own cache, not upstream CDNs.

---

## [0.9.7] — 2026-06-14

### Fixed
- `core/store/store-simple.js` — `boot()` now sets `_db` only after `_state` is fully loaded from IDB. Previously, a `setState` call arriving after `openDB` resolved but before `get()` returned would write an empty object to IDB, silently destroying all stored data. This race could be triggered by `<sw-manager>` being upgraded from static HTML before `boot()` completed.
- `core/store/store-simple.js` — `setState` now no-ops when `_db` is null (called before `boot()` completes). Previously it called `put(null, ...)` which produced an unhandled `TypeError`.
- `scaffold/index.html` and `reference-app/index.html` — `<sw-manager>` removed from static HTML. It is now created programmatically in `app/main.js` after `await boot()` completes, eliminating the SW update race condition in simple-store apps.
- `scaffold/utils/build.js` and `reference-app/utils/build.js` — `__BASE_PATH__` is now injected at build time via esbuild `define`, replacing the `base-path="/"` HTML attribute substitution that was removed when `<sw-manager>` moved to JS.

### Added
- `core/store/store-simple.test.js` — two regression tests for the SW update race condition: one verifying that `setState` before `boot()` leaves IDB untouched, one confirming that `setState` after `boot()` adds a key without wiping other stored data.
- `scaffold/tests/e2e/update-flow.spec.js` — IDB data-survival test: writes a marker directly into the simple store's state, triggers the update banner, reloads, and asserts the marker survived. Applies to simple-store apps only; event-log store apps can remove it.

---

## [0.9.6] — 2026-06-13

### Fixed
- `core/styles/tokens.css` — `--color-on-dark`, `--color-on-dark-muted`, and `--color-on-dark-dim` now have dark-theme overrides (`rgba(0,0,0,0.80/0.60/0.12)`). In dark mode the update banner background inverts to `#F5F2EE` (light); without these overrides the text and dismiss button remained white and were invisible.

---

## [0.9.5] — 2026-06-13

### Fixed
- `reference-app/tests/e2e/update-flow.spec.js` and `scaffold/tests/e2e/update-flow.spec.js` — dynamic `import('./_lib/core/store/store.js')` broke with the bundled build (no `_lib/` in `dist/`). Replaced with `page.route('/version.json', ...)` to intercept the version check and trigger Layer 2 detection naturally. Test 4 (reload) also calls `page.unrouteAll()` before the reload so the banner does not reappear on the reloaded page.

### Added
- `library_tests/scaffold-parity.test.js` — E2E spec parity checks: verifies scaffold contains exactly the 5 expected infrastructure specs, enforces byte-for-byte identity on `install.spec.js` and `update-flow.spec.js`, and guards `update-flow.spec.js` against reverting to dynamic `_lib/` imports.

---

## [0.9.4] — 2026-06-13

### Added
- `npx socle update` now also updates `utils/build.js` (library-owned infrastructure) and syncs `package.json` devDependencies. Both steps show a diff and ask for confirmation before writing. A commit command and `npm install` reminder are printed when devDependencies change.
- `scaffold/vitest.config.js` and `reference-app/vitest.config.js` — `_lib/**/*.test.js` added to the `include` pattern so library unit tests run in scaffolded apps. Changes to app code that break library internals are caught at test time.

### Changed
- Build pipeline replaced with esbuild: `utils/build.js` now bundles and minifies `app/main.js` and all `_lib/` imports into a single hashed ESM file with a source map. `dist/` no longer contains `_lib/` or `app/` directories — all JS is bundled. `tokens.css` is inlined into `index.html` as a `<style>` block. SW cache list shrinks from 50+ files to bundle + manifest + icons only.
- `utils/` is now library-owned (same update rules as `_lib/`). Developers who need custom build behaviour will see a confirmation prompt before `socle update` overwrites it.

### Fixed
- `modules/sync/sync.test.js` — static named import of `dispatch` threw a `SyntaxError` at module load time in simple-store apps. Changed to a destructured access from `import * as Store`, with `it.skipIf(!dispatch)` on the four tests that seed data via dispatch.
- `cli/index.js` — `store-simple.test.js` was renamed to `store.test.js` during scaffolding and update but its internal import path (`./store-simple.js`) was not patched to `./store.js`.

### Migration notes (for projects upgrading from ≤ 0.9.3)
`socle update` from 0.9.4 handles `utils/build.js` and `package.json` devDependencies automatically. If upgrading manually:

1. Copy the new `utils/build.js` from the [Socle scaffold](scaffold/utils/build.js) into your project.
2. Run `npm install` to pull in `esbuild`.

---

## [0.9.3] — 2026-06-12

### Added
- `core/theme/theme.js` — dark/light/system theme utility: `initTheme()`, `setTheme()`, `getTheme()`, `onThemeChange()`. Call `initTheme()` once in `app/main.js` before `boot()`. Reads `localStorage` for a persisted preference, falls back to `prefers-color-scheme`. System mode reacts to OS changes at runtime.
- `core/styles/tokens.css` — `[data-theme="dark"]` block with a full warm-dark palette. All colour tokens are automatically overridden; no component changes required. `color-scheme: light dark` added to `:root` so native controls (scrollbars, date pickers) adapt to the active theme.
- `scaffold/index.html`, `reference-app/index.html` — anti-FOUC inline script in `<head>` that sets `data-theme` synchronously before the first paint, eliminating a light flash when loading in dark mode. Two `<meta name="theme-color">` tags with `media` attributes replace the single tag so the browser chrome matches the active OS preference.
- `scaffold/app/main.js` — `initTheme()` call (first call in `main.js`, before `setLocale` and `boot`).
- `cli/index.js` — `THEME_COLOR_LIGHT` (`#F5F2EE`) and `THEME_COLOR_DARK` (`#1C1C1E`) added to `buildTokenMap`; used by the scaffold to populate `<meta name="theme-color">` tags with the correct default values.
- `library_tests/scaffold-tokens.test.js` — `%%THEME_COLOR_LIGHT%%` and `%%THEME_COLOR_DARK%%` added to required-placeholder list.
- `reference-app/app/components/year-header/` — theme picker: new sheet accessible from the app menu with System / Light / Dark options, current preference shown inline. Uses `onThemeChange` to keep the label in sync.
- `reference-app/tests/e2e/theme.spec.js` — 7 E2E tests: initial load, dark/light switch, label update, persistence across reload, FOUC prevention, system fallback.
- `core/theme/theme.test.js` — 18 unit tests covering all exported functions, OS change listener, idempotent init, and listener subscribe/unsubscribe.

### Fixed
- `reference-app/app/components/year-header/year-header.js` — `@media (prefers-reduced-motion: reduce)` block was targeting `.menu-sheet` and `.header-img`, neither of which exists in the component. Corrected to `dialog[open]` and `dialog::backdrop` where the animations are actually defined.

### Migration notes (for projects upgrading via `npx socle update`)
`_lib/core/theme/theme.js` and the dark token block in `tokens.css` are applied automatically by the update command. Two manual steps are required to activate the feature:

1. **`app/main.js`** — add at the top:
   ```js
   import { initTheme } from './_lib/core/theme/theme.js';
   ```
   Then call `initTheme()` as the first statement in the file (before `setLocale` and `boot`).

2. **`index.html`** — replace the single `<meta name="theme-color">` tag with:
   ```html
   <meta name="theme-color" content="#F5F2EE" media="(prefers-color-scheme: light)" />
   <meta name="theme-color" content="#1C1C1E" media="(prefers-color-scheme: dark)" />
   ```
   And add this inline script immediately after, still in `<head>`:
   ```html
   <script>
     (function() {
       var t = localStorage.getItem('theme');
       var dark = t === 'dark' || (t !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
       document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
     })();
   </script>
   ```
   Without this script the app works but flashes the light theme briefly on hard reload in dark mode.

---

## [0.9.2] — 2026-06-08

### Fixed
- `scaffold/playwright.config.js` — hardcode test server port to 4321 (matching the reference app) instead of `%%PORT%%`. Using the dev server port for E2E tests caused a port conflict when the dev server was already running.

---

## [0.9.1] — 2026-06-08

### Fixed
- `cli/index.js` — `updateLib()` now re-applies the `store-simple.js` → `store.js` rename for simple-store apps after updating `_lib/core`. Previously the event-log `store.js` silently overwrote the renamed simple store file, breaking apps that selected the simple store at scaffold time.
- `cli/index.js` — added `_semverLt()` utility and a version-gated migration block structure in `updateLib()` for future releases.

### Added
- `.claude/commands/upgrade.md` — new `/upgrade` library skill: guides the library developer through implementing migration handling in `updateLib()` before each release (automated changes + manual steps printed at end of `npx socle update`). Library-only; never copied to scaffold.

---

## [0.9.0] — 2026-06-07

### Added
- `core/store/store-simple.js` — simple state store: plain object snapshot persisted to IDB on every `setState` call, no event log, no reducer, no migrations. Selected at scaffold time via CLI. Implements the same `subscribe`/`unsubscribe`/`getState`/`attachBlob`/`getBlob`/`deleteBlob`/`reset` API as the event-log store plus sync-compatible `getAllEvents`/`getAllBlobs`/`importEvents` methods so the sync module works with both stores.
- `modules/sync/` — binary export/import format: SCLE magic (4 bytes, uncompressed) + gzip-compressed payload containing events JSON and raw image bytes. Replaces the previous JSON format. ~33% smaller than base64 JSON; peak import memory holds one image at a time instead of all. Legacy `.json` exports remain importable — format is detected by magic bytes.
- `modules/sync/` — sync module now compatible with both the event-log store and the simple store. Simple-store exports produce a `simple:state` event wrapping the current state snapshot; import restores it to IDB without touching in-memory state (reload required, same contract as event-log import).
- `cli/index.js` — `npx socle cert`: interactive cert wizard that asks whether to use shared certs (`~/.socle-certs/`) or project-specific certs, runs `mkcert`, and adds a `dev:https` script to the project's `package.json`. HTTPS is now opt-in — new scaffolded apps start without `dev:https` and gain it by running this command.
- `cli/index.js` — `ensureDevHttps(pkgPath)`: exported helper that adds a `dev:https` script derived from the existing `dev` script; idempotent; used by the cert wizard.

### Changed
- `modules/sync/sync.js` — `exportData()` now returns `Uint8Array` instead of a JSON-serialisable object. `downloadExport()` first arg is now `Uint8Array`. `readImportFile()` returns `Uint8Array` for binary files or a parsed object for legacy JSON. `importData()` accepts either.
- `scaffold/package.json`, `reference-app/package.json` — `dev:https` removed from scaffold default; new apps add it via `npx socle cert`. Reference app keeps the script (cert was already set up).
- `reference-app/app/components/year-header/year-header.js` — file input accept changed to `.youryear,.json`; export filenames use `.youryear` extension.

### Added
- `core/router/app-router.js` — page entry fade-in: `<app-router>` adds a `.enter` class to every newly mounted page element; the class triggers a `_routerFadeIn` keyframe (opacity 0→1) using `--duration-normal` and `--ease-out` tokens via an adopted stylesheet on the router shadow root
- `core/styles/tokens.css` — `--color-accent-subtle: rgba(232, 130, 74, 0.10)` added for hover and selected surface tints; `--font-family` changed from system stack to `'Onest', 'Helvetica Neue', Arial, sans-serif` (humanist grotesque, variable Latin, ~16 KB, optimised for low-DPI mobile); `--font-size-subheading` bumped from 17px to 18px
- `reference-app/index.html`, `scaffold/index.html` — Google Fonts `<link>` for Onest variable font (`wght@100..900`); body gains a subtle radial gradient (`rgba(232,130,74,0.06)` at top centre) and an SVG noise texture overlay at 4% opacity for depth
- `library_tests/scaffold-tokens.test.js` — HP_IMAGES_IMPORT, HP_IMAGES_CSS, HP_IMAGES_SECTION, HP_IMAGES_SUBSCRIBE, HP_IMAGES_UNSUBSCRIBE tokens added to the required-placeholder list
- `core/components/update-banner/update-banner.test.js` — two new tests: `--update-banner-height` is set on `documentElement` when the banner is shown; it is removed when dismiss is clicked. `requestAnimationFrame` is stubbed synchronously in `beforeEach` so height updates are asserted in the same tick
- `modules/app-header/app-header.test.js` — extended coverage: title renders inside `<h1>`, slot is inside `<h1>`, `margin-block: 0` present in styles, named `action` slot present, `padding-block-start` uses `--safe-area-top`
- `docs/sw-update-flow.md` — `--update-banner-height` layout integration section: documents when the property is set/removed, how app-header consumes it, and the pattern for any future sticky/fixed component that must sit below the update banner

### Changed
- `modules/toast/toast.js` — restyled as pill toasts: `--radius-full` border-radius, elevated shadow, `--font-weight-medium`; info toast uses `--color-action-dark` dark background with `--color-on-dark` text; `prefers-reduced-motion` block added
- `reference-app/app/pages/home-page.js` — section heading colour swapped to `--color-accent` (was `--color-text-muted`); edit button colour swapped to `--color-text-muted` (was `--color-accent`) for better visual hierarchy
- `reference-app/package.json`, `scaffold/package.json` — vitest upgraded from `^3.2.0` to `^4.1.0`

- `modules/modal-dialog/` — `<modal-dialog>` responsive component: renders as a bottom sheet on mobile (≤600px) with slide-up animation and a handle pill; renders as a centered card on desktop with fade-in; `show()` / `close()` API; `modal-close` event (`bubbles`, `composed`); default and footer slots; `_justOpened` guard prevents gesture-triggered opens from immediately dismissing via backdrop click; `aria-modal="true"`, `aria-label` forwarding from host attribute to inner `<dialog>`, `aria-hidden="true"` on decorative handle
- `modules/app-header/` — `<app-header>` component: sticky header with default (title) and `action` slot for right-side controls; `padding-block-start` accounts for `--safe-area-top` so it clears device notches and dynamic islands
- `modules/toast/` — `toast(message, type)` function: creates temporary DOM notifications (`info`, `success`, `error`); auto-dismisses after 3 s; fixed container with safe-area-bottom padding; container created once and reused; `<toast-manager>` service component subscribes to `_toast` store state and renders toasts
- `modules/images/` — `compressImage(file, { maxWidth, quality })`: canvas-based JPEG compression via `OffscreenCanvas`; returns a `Blob`; defaults `maxWidth: 1200`, `quality: 0.8`; no DOM element required
- `cli/prompt.js` — interactive terminal selector: `multiSelect(title, items)` and `singleSelect(title, items)`; supports disabled items with hint text; raw TTY mode with arrow-key navigation; falls back to sequential readline prompts when stdin is not a TTY
- CLI — `npx socle add <module>`: copies module from library into `_lib/modules/`, updates `lib-version.json`; validates module name and checks for existing installation before copying
- CLI — `npx socle remove <module>`: scans `app/` for import references to the module, warns if found and requires confirmation, removes `_lib/modules/<module>/`, updates `lib-version.json`
- `scaffold/app/pages/home-page.js` — full forms card: text input, textarea, radio group, toggle switch, tab panel, modal demo via `<modal-dialog>`, toast on save; `<app-header>` added to `scaffold/index.html`
- `scaffold/_modules/` — per-module scaffold pages generated when module is selected at scaffold time: `gestures/app/pages/gesture-page.js` (hold-drag bar demo), `sync/app/pages/sync-page.js` (export/import), `images/app/pages/images-page.js` (compress-and-store)
- Scaffold `app/main.js` — six new module tokens (`%%SYNC_IMPORT%%`, `%%GESTURE_IMPORT%%`, `%%IMAGES_IMPORT%%`, `%%SYNC_ROUTE%%`, `%%GESTURE_ROUTE%%`, `%%IMAGES_ROUTE%%`) replaced at scaffold time based on selected modules
- YourYear reference app — toast notifications on goal save and goal delete; `home.toast-goal-saved` and `home.toast-goal-deleted` keys in EN, FR, and CA locale packs

### Changed
- `modules/gestures/gestures.js` — `onHoldDragKey(direction)` support added to both the mixin and `Gestures.attach`: Arrow keys automatically drive hold-drag interactions; library handles wiring and cleanup so every hold-drag component gets keyboard parity without app-layer code; `Gestures.attach` auto-sets `tabindex="0"` on elements that lack it when hold-drag handlers are present
- `modules/gestures/gestures.js` — `navigator.vibrate?.(40)` moved from app layer into the library; fires automatically on hold-drag activation; apps no longer call this themselves
- `reference-app/app/components/goal-dialog/goal-dialog.js` — refactored to use `<modal-dialog>` as shell; removed ~60 lines of duplicate responsive CSS and the `_justOpened` / `pointerup` backdrop workaround; dispatches `goal-saved`, `goal-cancelled`, `goal-delete` as before
- `reference-app/app/components/goal-item/goal-item.js` — `onHoldDragKey` method added; `_onKeyDown` simplified to delegate to it; manual `navigator.vibrate` call removed (now in library)
- `reference-app/app/components/year-header/year-header.js` — year photos compressed before storage via `compressImage({ maxWidth: 1200, quality: 0.8 })`
- CLI module selection — gestures is now an opt-in choice at scaffold time (was always included); sequential y/N prompts replaced with interactive `multiSelect` terminal UI

### Fixed
- `reference-app/app/components/year-header/year-header.js` — image flash on navigation: `data-has-image` attribute and `--year-header-height` CSS variable are now set synchronously before `await Store.getBlob()`, so layout reserves image-mode space immediately; the stale-year guard (`this._year !== year`) remains sufficient for race conditions; also added `prefers-reduced-motion` blocks for `menu-sheet` and `header-img` animations; removed `:host` CSS transition that was re-triggering on every compact/expand state change
- `reference-app/app/components/goal-item/goal-item.js` — `prefers-reduced-motion` blocks added suppressing celebrate, celebrating, and peek-hint animations
- `cli/index.js` — HP_IMAGES_IMPORT, HP_IMAGES_CSS, HP_IMAGES_SECTION, HP_IMAGES_SUBSCRIBE, HP_IMAGES_UNSUBSCRIBE tokens were absent from `buildTokenMap`, causing the images section to be silently omitted from scaffolded home pages when the images module was selected
- `core/components/update-banner/update-banner.js` — added `button:focus-visible` outline; `prefers-reduced-motion` block added for the slide-down animation
- `core/styles/tokens.css` — `--color-success` darkened from `#3D9A6E` to `#317B58`; the previous value gave ~3.2:1 on white (WCAG AA requires 4.5:1 for body text); new value achieves 5.1:1
- `core/components/update-banner/update-banner.js` — restored `position: fixed` so the banner anchors to the viewport and the `translateY(-100%)` slide-in animation works correctly; the surrounding layout system (`--update-banner-height` on `documentElement`) already assumes fixed positioning
- `core/components/update-banner/update-banner.js` — applied safe-area inset correctly: `padding-block-start: calc(var(--space-2) + var(--safe-area-top))` so the banner clears device notches and its reported `offsetHeight` (used for `--update-banner-height`) is accurate on notched devices
- `core/components/update-banner/update-banner.js` — banner action buttons reduced to `min-block-size: 32px`; compact notification bar context warrants a deliberate below-40px exception
- `modules/app-header/app-header.js` — `<span class="title">` changed to `<h1 class="title">` with `margin-block: 0` to suppress UA default heading margins that don't receive the global `* { margin: 0 }` reset inside shadow DOM
- `modules/app-header/app-header.js` — `--update-banner-height` coupling: added `margin-block-start: var(--update-banner-height, 0px)` (pushes header below fixed banner in document flow) and `inset-block-start: var(--update-banner-height, 0px)` (aligns sticky threshold to match); both default to `0px` when banner is absent
- `modules/app-header/app-header.js` — `min-block-size: 44px` (magic number) replaced with `var(--touch-target)`
- `scaffold/app/pages/home-page.js` — `legend` and hidden radio inputs changed from physical `width: 1px; height: 1px` to logical `inline-size: 1px; block-size: 1px`; three `min-block-size: 44px` hardcoded values replaced with `var(--touch-target)`
- `modules/images/images.test.js` — constructor `mockImplementation` calls changed from arrow functions to regular functions; Vitest v4 invokes constructor mocks via `new impl(args)` which fails with arrow functions
- `modules/toast/toast.js` — success toast text colour changed from `--color-text-inverse` to `--color-text-primary`; `--color-text-inverse` (white) on `--color-success` (#3D9A6E) gives ~3.43:1, which fails WCAG AA for body text

### Added
- CLI — `cli/index.js`: `npx socle <app-name>` scaffolds a new app; prompts for app name, short name, description, GitHub username, sync module selection, and accent colour; copies `scaffold/`, `core/`, and selected `modules/` into a self-contained project directory with all `%%TOKEN%%` placeholders substituted
- CLI — `npx socle update`: checks for locally modified `_lib/` files (requires git), prompts for confirmation before overwriting, replaces `_lib/core/` and installed modules from the library source, preserves the project's customised `--color-accent` value across the update
- `package.json` — `bin: { "socle": "./cli/index.js" }` wires the CLI entry point for `npx` distribution
- `docs/updating.md` — new doc covering the `_lib/` update flow, `lib-version.json` schema, and what is and isn't replaced by `npx socle update`

### Fixed
- `scaffold/package.json`, `reference-app/package.json` — `dev:https` script now uses `--listen tcp:0.0.0.0:3000` instead of `--listen 3000`; the previous form bound only to loopback, blocking access from mobile devices on the local network

### Added
- PWA installability — `reference-app/app/icons/icon.svg`: YourYear icon, a 300° progress arc with a gap at the bottom centre; dark background (#1C1C1E), orange stroke (#E8824A); designed to remain readable at 48×48px
- PWA installability — `scaffold/app/icons/icon.svg`: rotated arc (gap at top, light background #F2F1EE, charcoal stroke #2C2C2C) — open bowl metaphor for a project ready to be built
- `reference-app/manifest.json` — `icons` array with SVG icon at 192×192 and 512×512, purpose `any maskable`; `scope: "/"` added; `theme_color` and `background_color` set to `#1C1C1E`
- `scaffold/manifest.json` — matching icons structure with `%%TOKEN%%` placeholders; `scope: "%%BASE_PATH%%"` added
- `reference-app/index.html` — `theme-color` meta tag updated to `#1C1C1E` to match manifest (controls Android status bar colour in installed PWA)
- `reference-app/tests/e2e/install.spec.js` — 3 automated Playwright tests: manifest reachable with required fields, icon URL resolves, SW registration state is valid; manual install checklist retained as comments
- `scaffold/tests/e2e/install.spec.js` — synced to match reference-app (was stale with manual-only version)
- `TODO.md` — PWA capabilities table: 24 capabilities across 5 categories with support matrix for Chrome Android, Firefox Android, Chrome iOS, Firefox iOS, and implementation status

### Fixed
- `reference-app/utils/build.js` — `cacheHash` now includes `manifest.json` and `index.html` content; previously changes to those files produced an identical SW (304 Not Modified) and were never picked up by the update mechanism
- `scaffold/utils/build.js` — same cacheHash fix applied (mirror of reference-app)
- `reference-app/utils/build.js` — `index.html` was read twice (once for cacheHash, once for processing); now reuses the already-read `indexContent` variable

### Added
- `modules/sync/` — new optional module: `exportData()` serialises the full event log and all blobs to a JSON payload; `importData()` merges events and images idempotently (duplicate IDs skipped); `downloadExport()` triggers a browser file download; `readImportFile()` reads and parses an uploaded JSON file; year-scoped export via `eventFilter` only includes events and images referenced by that year's events
- `core/store/store.js` — `getAllEvents()`, `getAllBlobs()`, `importEvents(events)` added to support the sync module; these are the only safe entry points for bulk read/write outside the event-sourced dispatch cycle
- `core/strings.js` — `t(key, params)` now supports `{placeholder}` substitution for dynamic strings (e.g. `t('sync.export-year', { year: 2026 })` → `'Export 2026'`)
- YourYear reference app — sync menu in year-header: Export this year, Export all years, Import from file; import shows a confirm dialog with event and image counts on success or a localised error message on failure
- YourYear reference app — `sync.*` string keys in EN, FR, and CA locale packs
- Unit tests — `modules/sync/sync.test.js`: 17 tests covering export, import, blob scoping, year-scoped filtering, deduplication, and error handling
- Unit tests — `year-header.test.js`: 5 new tests for sync section (button presence, export year label accuracy, label update on year navigation)
- E2E tests — `sync.spec.js`: 12 tests covering sync menu items, export download and JSON validity, year-scoped export correctness, import error/success states, duplicate import idempotency, and full export→clear→import→reload round-trip

### Changed
- `core/store/store.js` — `attachBlob()` and `deleteBlob()` are now `async`, consistent with `getBlob()` and all other store functions (TD-01 resolved)
- `core/store/store.js` — event sort logic extracted into a private `_sortEvents()` helper, eliminating duplicated sort expression between `boot()` and `getAllEvents()`
- `year-header` — image overlay and progress strip colours in photo mode are now CSS custom properties (`--image-overlay-edge`, `--image-strip-bg`, `--image-strip-fill`) defined on `:host`, replacing hardcoded `rgba()` values
- YourYear home-page — tab bar removed; Capstone, Milestones, and Wow sections are now direct children of `<main>`
- Scaffold `playwright.config.js` — webServer command now includes `--single` flag for SPA mode; without it non-root paths return 404 on first visit, blocking SW install and breaking all SW-dependent E2E tests
- Scaffold `app/main.js` — `setLocale(getLocale())` call added before `boot()` so the locale stored in `localStorage` is applied on page load

### Fixed
- `update-banner` — reload button contrast: `color: white` on `--color-accent` (#E8824A) gave ~2.6:1 (WCAG AA fail); replaced with `--color-text-primary` (~7.2:1)
- YourYear year-header import dialog — `aria-modal="true"` added on `<dialog>`; `role="alert"` added on status message element; reload/cancel button order corrected (primary action first)
- YourYear year-header — export year button label now updates when navigating to a different year (was rendered once at mount and then frozen)
- YourYear year-header — year-scoped export now only includes blobs referenced by events in that year (previously exported all blobs regardless of scope)
- YourYear year-header — old blob is deleted from IDB when a year photo is replaced, preventing orphaned blobs from accumulating
- YourYear year-header — year events (`year:image-set`, `year:image-removed`) now always store `year` as a string, matching the convention used by goal, milestone, and wow events

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
