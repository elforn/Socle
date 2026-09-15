// Appended verbatim onto the generated service worker by utils/build.js
// (see docs/notifications.md). Plain JS, no imports/exports — dist/sw.js is
// registered without { type: 'module' }, so this runs as a classic script
// sharing the same global scope as everything above it, including
// BASE_PATH.
//
// Handles taps on the goals-in-progress digest notification (see
// app/notifications-digest.js, mounted via <digest-notifier> in
// app/main.js) — a tapped notification can arrive with the app already
// open, backgrounded, or fully closed, so both paths are handled: focus +
// postMessage for an existing tab, cold-start via URL param otherwise.
//
// No periodicsync handler here — YourYear uses the event-log store, which
// has no persisted state snapshot to read from a classic script (state is
// only ever computed by replaying events in the page's own boot()); a
// background layer would have to duplicate the reducer here to be useful.
// The foreground checker (digest-notifier, checks on boot and resume) is
// the reliable, universal mechanism and doesn't need one.
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientsList => {
      const existing = clientsList.find(c => 'focus' in c);
      if (existing) {
        existing.postMessage({ type: 'youryear:open-digest' });
        return existing.focus();
      }
      return self.clients.openWindow(`${BASE_PATH}?notif=1`);
    })
  );
});
