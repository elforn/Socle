# Notifications

The notifications module provides the generic plumbing for an opt-in, at-most-once-per-day **digest notification** — the permission/preference toggle, a foreground checker that fires on boot and app resume, a dedicated dedup store, best-effort periodic background sync, and the cold-launch routing for a tapped notification. It has no opinion on what the digest is *about* — that is entirely your app's concern, supplied as a `buildDigest(state)` function.

This module does not include a background (Service Worker) checker — the SW is a classic script with no `import`/`export`, so it cannot share code with the rest of your app. See [Background checks](#background-checks-service-worker) for the pattern to hand-write your own.

## Contents

- [Quick start](#quick-start)
- [The pieces](#the-pieces)
- [Wiring a Settings toggle](#wiring-a-settings-toggle)
- [Periodic background sync](#periodic-background-sync)
- [Cold-launch routing](#cold-launch-routing)
- [Background checks (Service Worker)](#background-checks-service-worker)
- [Constraints and gotchas](#constraints-and-gotchas)
- [Migrating a hand-rolled implementation](#migrating-a-hand-rolled-implementation)
- [API reference](#api-reference)

---

## Quick start

```js
// app/main.js
import '../_lib/modules/notifications/digest-notifier.js';
import { NotificationPrefs } from '../_lib/modules/notifications/notification-prefs.js';
import { NotificationDedup } from '../_lib/modules/notifications/notification-dedup.js';
import { buildDigest } from './notifications/build-digest.js'; // your app owns this

const notifier = document.createElement('digest-notifier');
notifier.prefs = NotificationPrefs('myapp:notificationsEnabled');
notifier.dedup = NotificationDedup('myapp-notifications'); // separate IDB DB, see below
notifier.buildDigest = state => buildDigest(state); // state => { title, body } | null
document.body.appendChild(notifier);
```

`app/notifications/build-digest.js` is yours to write — it can be about anything: overdue items, a weekly summary, a streak reminder. Return `null` when there is nothing worth notifying about; the notifier skips firing entirely (and does not mark the day as notified) in that case.

---

## The pieces

- **`<digest-notifier>`** (`digest-notifier.js`) — an invisible service component, mounted once. Checks on boot and on every `visibilitychange → visible`, calling your `buildDigest(state)`. Fires at most one notification per calendar day via `dedup`.
- **`NotificationPrefs(storageKey)`** (`notification-prefs.js`) — a device-local opt-in flag in `localStorage`. Deliberately not a store key: whether notifications are wanted is a property of this browser install, not app data to export/import or sync across devices (same treatment as theme/locale).
- **`NotificationDedup(dbName, options?)`** (`notification-dedup.js`) — tracks the last calendar day a notification actually fired, in its **own** IndexedDB database, never inside your main store.
- **`isPeriodicSyncSupported()` / `PeriodicSync(tag, options?)`** (`periodic-sync.js`) — feature detection and registration for the Periodic Background Sync API (Chromium only).
- **`consumeColdLaunchParam(paramName)` / `onColdLaunchMessage(messageType, callback)`** (`cold-launch.js`) — routes a tapped notification back into the app, whether it found an existing tab to focus or had to open a new one.

---

## Wiring a Settings toggle

`Notification.requestPermission()` only works when called synchronously from a real user gesture — never from `subscribe()`, `connectedCallback()`, or any programmatic path. Your toggle's click handler is the only place to call it:

```js
toggleEl.addEventListener('click', async () => {
  if (turningOff) {
    prefs.setEnabled(false);
    periodicSync.unregister();
    updateToggleUI();
    return;
  }
  if (Notification.permission === 'denied') {
    toast('Notifications are blocked — enable them in browser settings.');
    return;
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') { updateToggleUI(); return; }
  prefs.setEnabled(true);
  periodicSync.register();
  document.querySelector('digest-notifier')?.refresh(); // check right away, don't wait for the next resume
  updateToggleUI();
});
```

**The toggle's displayed state must re-check `Notification.permission` live, every render** — never trust a cached "enabled" flag alone. A browser-level permission revoke happens outside your app entirely; `prefs.enabled()` only tracks intent, not the actual grant:

```js
function updateToggleUI() {
  const on = prefs.enabled() && Notification.permission === 'granted';
  toggleEl.classList.toggle('on', on);
}
```

A previously-denied permission cannot be re-prompted by the page at all — the browser silently resolves to `'denied'` again with no dialog. Explain where to fix it (browser site settings) rather than retrying.

---

## Periodic background sync

```js
import { isPeriodicSyncSupported, PeriodicSync } from '../_lib/modules/notifications/periodic-sync.js';

const periodicSync = PeriodicSync('myapp-digest-check', { minIntervalMs: 12 * 60 * 60 * 1000 });
```

`isPeriodicSyncSupported()` is exported standalone because apps typically use it for more than gating registration — e.g. hiding an entire notifications settings section on browsers (Firefox, Safari) that can never honour it.

`register()`/`unregister()` are best-effort throughout: the browser decides the actual firing cadence regardless of `minIntervalMs`, and a rejected registration or unsupported permission name just leaves the foreground-only path active. **This cannot be verified in Playwright or headless Chromium** — `Notification.permission` is hard-locked to `'denied'` there regardless of `context.grantPermissions()`. Confirm periodic sync on a real installed PWA, not in CI.

---

## Cold-launch routing

A tapped notification can arrive with the app already open, backgrounded, or fully closed. Both paths matter:

```js
// app/main.js
import { consumeColdLaunchParam, onColdLaunchMessage } from '../_lib/modules/notifications/cold-launch.js';

if (consumeColdLaunchParam('notif')) openDigestView();          // cold start — the URL param is stripped after this read
onColdLaunchMessage('myapp:open-digest', () => openDigestView()); // already-open tab, focused via the SW
```

The Service Worker side (see below) decides which path fires: `postMessage` to an already-open tab, or `clients.openWindow` with the query param when none was found.

---

## Background checks (Service Worker)

`dist/sw.js` is registered without `{ type: 'module' }`, so anything appended to it (via `app/sw-extensions.js` — see [Getting started](getting-started.md#custom-service-worker-code)) is a classic script with no `import`/`export`. It cannot reach your `buildDigest`, your store, or this module's code directly. Two things carry over as a hand-written contract instead:

**The dedup database.** Use the same DB name, store name (`'meta'`), and record id (`'digest'`) you passed to `NotificationDedup` on the page side, read/written with raw `indexedDB` calls:

```js
// app/sw-extensions.js
const NOTIF_DB = 'myapp-notifications'; // must match the dbName passed to NotificationDedup

function openNotifDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(NOTIF_DB, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore('meta', { keyPath: 'id' }); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
```

**The periodicsync and notificationclick handlers.** The tag must match what you passed to `PeriodicSync`, and the cold-launch message type/param must match what you passed to `onColdLaunchMessage`/`consumeColdLaunchParam`:

```js
self.addEventListener('periodicsync', event => {
  if (event.tag !== 'myapp-digest-check') return;
  event.waitUntil((async () => {
    // Read your main IDB database directly (indexedDB.open('myapp', ...)) and
    // decide whether to notify — this is app-specific logic, hand-written here
    // because the classic-script SW cannot import it.
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientsList => {
      const existing = clientsList.find(c => 'focus' in c);
      if (existing) {
        existing.postMessage({ type: 'myapp:open-digest' });
        return existing.focus();
      }
      return self.clients.openWindow(`${BASE_PATH}?notif=1`);
    })
  );
});
```

Keep the background check's own bucketing logic deliberately simpler than your foreground `buildDigest` — it is a best-effort enhancement on top of the foreground checker (which is the reliable, universal mechanism), not a second full implementation to maintain in lockstep.

---

## Constraints and gotchas

- `Notification.requestPermission()` must only ever be called from a real user-gesture click handler.
- The Settings toggle must re-check `Notification.permission` live, not trust a cached preference — see [above](#wiring-a-settings-toggle).
- Dedup state must not live in your main store — a background write racing the page's own store read-modify-write cycle (`setState` always persists the full in-memory snapshot) would be a lossy race. `NotificationDedup`'s separate database exists specifically to avoid this.
- `app/sw-extensions.js` has no `import`/`export` — it is a classic script appended to a non-module Service Worker.
- Periodic sync's actual firing cadence is entirely browser-controlled and cannot be verified via Playwright/headless Chromium — confirm on a real device.
- Cold-launch routing needs both the postMessage-to-open-tab path and the URL-param-cold-start path — dropping either one leaves some launch states unhandled.

---

## Migrating a hand-rolled implementation

If your app already has its own version of this feature (a foreground checker component, a localStorage preference, a separate dedup database, periodic-sync registration), moving to this module is a deletion exercise more than a rewrite:

1. Add the module: `npx socle add notifications`.
2. Replace your preference helper with `NotificationPrefs(yourExistingKey)` — reuse the same `localStorage` key so existing installs keep their setting.
3. Replace your dedup helper with `NotificationDedup(yourExistingDbName)` — reuse the same DB name, store name, and record id so existing installs don't lose their last-notified date.
4. Replace your foreground checker component with `<digest-notifier>`, moving your bucketing/text logic into a `buildDigest(state)` function.
5. Replace your periodic-sync registration calls with `PeriodicSync(yourExistingTag)`.
6. Replace your cold-launch URL-param/postMessage handling in `main.js` with `consumeColdLaunchParam`/`onColdLaunchMessage`, keeping your existing param name and message type.
7. Your `app/sw-extensions.js` background handler stays hand-written (see [above](#background-checks-service-worker)) — only the DB/tag/message-type constants need to line up with what you passed the page-side helpers.
8. Delete your old files once the equivalents above are wired up and tested.

---

## API reference

### `NotificationPrefs(storageKey)`

Returns `{ enabled(), setEnabled(value) }`, backed by `localStorage` at `storageKey`.

### `NotificationDedup(dbName, options?)`

Returns `{ alreadyNotifiedToday(), markNotifiedToday() }`, backed by a dedicated IDB database. `options.storeName` (default `'meta'`) and `options.recordId` (default `'digest'`) let multiple independent digests share one database under different keys.

### `isPeriodicSyncSupported()`

Returns `true` when the Periodic Background Sync API is available (installed Chromium-based browsers only).

### `PeriodicSync(tag, options?)`

Returns `{ register(), unregister() }` for the given periodicsync tag. `options.minIntervalMs` (default 12h) is a hint, not a guarantee.

### `consumeColdLaunchParam(paramName)`

Returns `true` and strips the param from the URL (via `history.replaceState`) if present; `false` and leaves the URL untouched otherwise. One-shot per call — a second call after consuming returns `false`.

### `onColdLaunchMessage(messageType, callback)`

Listens for a `postMessage` of the given type from the Service Worker and invokes `callback`. No-ops if `serviceWorker` is unsupported.

### `<digest-notifier>`

Properties (set imperatively, not attributes):
- `buildDigest` {function} — `(state) => { title, body } | null`. Required.
- `prefs` {object} — a `NotificationPrefs` instance. Required.
- `dedup` {object} — a `NotificationDedup` instance. Required.
- `tag` {string} — passed to `Notification.showNotification`'s `tag` option (default `'socle-digest'`) so a new digest replaces rather than stacks.

Methods:
- `refresh()` — re-runs the check immediately. Call this right after the user turns notifications on, so the effect is visible without waiting for the next resume.

---

[← Filter state](filter-state.md) · [Docs home](../README.md#docs) · [Next: Testing →](testing.md)
