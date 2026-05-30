# SW lifecycle and update flow

Socle apps are offline-first and update silently in the background. When a new version is available, a banner appears — the user taps Reload, the new version activates, and the page refreshes. Nothing is forced, nothing is automatic.

This guide covers how the update system works, how to customise the banner, and how the strings system lets you translate it.

## Contents

- [How updates work](#how-updates-work)
- [The `<sw-manager>` service component](#the-sw-manager-service-component)
- [The `<update-banner>` UI component](#the-update-banner-ui-component)
- [Ephemeral state and `setState`](#ephemeral-state-and-setstate)
- [Strings and `t()`](#strings-and-t)
- [Build script — asset pre-caching](#build-script--asset-pre-caching)
- [Manual verification checklist](#manual-verification-checklist)

---

## How updates work

Two independent layers detect that a new version exists. Either one can trigger the update banner.

### Layer 1 — Service Worker waiting detection

When you deploy a new build, the browser detects the changed `sw.js` and installs it silently. The new SW enters a `waiting` state — it is installed but not yet in control, because the current SW is still serving the open page.

`<sw-manager>` watches for this:

1. It calls `navigator.serviceWorker.register()` on connect
2. If a SW is already `waiting`, it sets `updateAvailable` in the store immediately
3. If no SW is waiting yet, it listens for `updatefound` → watches the installing SW's state → sets `updateAvailable` when it reaches `installed`

When the user taps **Reload** on the banner, `<update-banner>` posts `{ type: 'SKIP_WAITING' }` to the waiting SW. The SW calls `skipWaiting()`, takes control, and fires `controllerchange`. `<sw-manager>` listens for `controllerchange` and calls `location.reload()`.

**Why not auto-apply `skipWaiting`?** If the page is mid-operation (writing data, mid-gesture), an automatic reload is destructive. The user decides when it is safe.

### Layer 2 — `version.json` check

The build generates `dist/version.json`:

```json
{ "version": "1.2.3", "buildTime": "2025-06-01T10:00:00.000Z" }
```

`<sw-manager>` fetches this on every boot (with `cache: 'no-store'`) and compares to the `APP_VERSION` baked into the running JS. If the server has a newer version, it sets `updateAvailable` immediately — before any SW update check completes.

This layer fires faster. On a typical re-open after a deploy, the user sees the banner within seconds rather than waiting for the SW to finish installing.

`version.json` is never cached by the SW — every fetch goes to the network.

---

## The `<sw-manager>` service component

`<sw-manager>` is a headless service component. It has no visible UI — it runs both detection layers and owns the `controllerchange` listener that triggers a reload after skip-waiting.

Add it to `index.html` before `<app-router>`:

```html
<sw-manager base-path="/" app-version="__APP_VERSION__"></sw-manager>
<update-banner hidden></update-banner>
<app-router></app-router>
```

The build script replaces `__APP_VERSION__` with the current version string and `base-path="/"` with the correct `BASE_PATH` for subdirectory deployments.

**Attributes:**

| Attribute | Required | Description |
|-----------|----------|-------------|
| `base-path` | yes | URL prefix for `sw.js` and `version.json` — set by build |
| `app-version` | no | Current version string — omit to disable Layer 2 |

If `app-version` is absent, no `version.json` fetch occurs. This is useful in development where `version.json` may not exist.

### First-install guard

`controllerchange` fires in two situations:
1. **Update** — a waiting SW calls `skipWaiting()` and takes control
2. **First install** — the SW calls `clients.claim()` after activating for the first time

Only the first should trigger a reload. `<sw-manager>` captures `navigator.serviceWorker.controller` before registering — if it was `null` at that point, the subsequent `controllerchange` is a first install and is ignored.

---

## The `<update-banner>` UI component

`<update-banner>` subscribes to the `updateAvailable` store key. When it becomes `true`, the `hidden` attribute is removed and the banner becomes visible.

It provides two actions:

- **Reload** — posts `SKIP_WAITING` to the waiting SW (if one exists), then reloads. If no waiting SW exists (Layer 2 triggered the banner), it reloads directly — the SW will be up to date on next page load.
- **Dismiss** — hides the banner. The update is not applied. The banner will reappear on the next page load if the SW is still waiting.

`<update-banner>` is a fixed-position element anchored to the top of the viewport. It uses `--color-action-dark` as its background and respects `--safe-area-top` for devices with notches.

---

## Ephemeral state and `setState`

The store has two ways to write state:

| Method | Writes to IDB | Survives reload |
|--------|--------------|-----------------|
| `dispatch(type, payload)` | Yes | Yes |
| `setState(key, value)` | No | No |

`updateAvailable` uses `setState` because it is a transient runtime signal — it reflects the current SW state, not a domain event. It should not persist across reloads; the detection runs fresh on every boot.

```js
import { setState } from './_lib/core/store/store.js';

setState('updateAvailable', true);
```

Use `setState` for any in-memory state that is not part of the event log: UI flags, runtime detection results, temporary selections.

---

## Strings and `t()`

`<update-banner>` has three user-visible strings. They are not hardcoded in the component — they come from the strings registry via `t()`.

`_lib/` components never define their own English strings. Instead, your app registers them in `app/strings.js`:

```js
// app/strings.js
import { defineStrings } from '../_lib/core/strings.js';

defineStrings({
  'update-banner.available': 'Update available',
  'update-banner.reload':    'Reload',
  'update-banner.dismiss':   'Dismiss',
});
```

`app/strings.js` must be the **first import in `app/main.js`**. Static imports are hoisted, so strings must be registered before any component's `connectedCallback` fires — if they are registered later, `t()` returns the key name as a fallback.

```js
// app/main.js — strings first, always
import './strings.js';
import { boot } from '../_lib/core/store/store.js';
// ... rest of imports
```

### Customising the strings

Change the values in `app/strings.js` to use your own wording:

```js
defineStrings({
  'update-banner.available': 'A new version is ready',
  'update-banner.reload':    'Apply update',
  'update-banner.dismiss':   'Later',
});
```

### Adding a new language

When you are ready for multilingual support, replace the flat object with locale-aware resolution. The `t(key)` call sites in `_lib/` never need to change — only the implementation of string lookup changes.

---

## Build script — asset pre-caching

The build script enumerates every file under `_lib/` and `app/` and injects the full list into `sw.js` as the `ASSETS` array. This means the SW pre-caches every JS file on install — they are all available offline from the first page load.

```js
// dist/sw.js (generated)
const ASSETS = [
  '/',
  '/main.abc12345.js',
  '/manifest.json',
  '/_lib/core/app-element.js',
  '/_lib/core/store/store.js',
  // ... every file
];
```

Any file added to `_lib/` or `app/` is automatically included on the next build. No manual asset list maintenance is required.

The `CACHE_VERSION` string is a hash of the built `main.js`, all files in `_lib/` and `app/`, `manifest.json`, and `index.html`. This means any change to any of those files produces a new cache version, triggers the SW update flow, and ensures users always see the latest manifest and HTML shell.

Same-origin resources not in the pre-cache list are cached on first fetch via runtime caching — this covers any dynamically requested files.

---

## Manual verification checklist

Before every release, run through this checklist in Chrome or Firefox:

```
[ ] Deploy build N. Open the app. Note version in version.json.
[ ] Deploy build N+1 (bump version in package.json and rebuild).
[ ] Reopen the app without clearing the SW. Update banner appears.
[ ] Tap Reload. Page refreshes on new version. Banner is gone.
[ ] Dismiss instead of reloading. App continues on old version.
[ ] Reopen app — update banner reappears (SW is still waiting).
[ ] Install the app to home screen. Verify update flow works when installed.
```

The automated E2E test (`tests/e2e/update-flow.spec.js`) covers the banner's UI behaviour. The full two-build cycle above must be verified manually.

---

[← Architecture](architecture.md) · [Docs](https://github.com/magp/Socle/blob/main/README.md#docs) · [Next: Building components →](components.md)
