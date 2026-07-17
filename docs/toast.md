# Toast

The toast module shows brief feedback messages at the bottom of the screen. Toasts are appropriate for confirming an action ("Goal saved"), reporting a result ("Export complete"), or surfacing a reversible operation with an Undo button.

Toasts are not appropriate for errors that require a decision — use a modal dialog for those.

## Contents

- [Quick start](#quick-start)
- [Types](#types)
- [Options](#options)
- [Dismissing programmatically](#dismissing-programmatically)
- [Updating in place](#updating-in-place)
- [Persistent toasts](#persistent-toasts)
- [One toast at a time](#one-toast-at-a-time)
- [Accessibility and keyboard behaviour](#accessibility-and-keyboard-behaviour)
- [String registration](#string-registration)
- [API reference](#api-reference)

---

## Quick start

```js
import { toast } from '../_lib/modules/toast/toast.js';

// Simple feedback
toast('Goal saved', 'success');

// With an Undo action
toast('Goal deleted', 'info', {
  action: {
    label: 'Undo',
    onClick: () => Store.dispatch('goal:restored', { id }),
  },
});
```

The toast appears at the bottom of the screen, auto-dismisses after 4 seconds (5 seconds when an action button is present), then fades out. No component wiring required.

---

## Types

```js
toast('Message')                // 'info' — dark background, default
toast('Message', 'success')     // green background
toast('Message', 'error')       // red background
```

---

## Options

```js
toast(message, type, {
  duration,  // ms — how long before auto-dismiss. Omit for default (4000ms, or 5000ms with action)
  action,    // { label, onClick } — trailing action button
})
```

**`duration`** — Override the auto-dismiss timer. Pass `Infinity` for a toast that never auto-dismisses (see [Persistent toasts](#persistent-toasts)).

**`action`** — Adds a trailing button inside the toast. `label` is the button text, `onClick` is called when the user taps it. Pressing Escape dismisses the toast without calling `onClick`. The action button on an `'info'` toast is tinted with `--color-accent`; on `'success'` and `'error'` it inherits the toast's text colour for contrast.

---

## Dismissing programmatically

`toast()` returns a handle with a `dismiss()` method:

```js
const { dismiss } = toast('Syncing…', 'info', { duration: Infinity });

// Later, when the operation completes:
dismiss();
toast('Sync complete', 'success');
```

Calling `dismiss()` on an already-dismissed toast is a no-op.

---

## Updating in place

The handle also has an `update()` method that mutates the live toast — useful when an operation transitions from in-progress to complete without showing two separate toasts:

```js
const { update } = toast('Syncing…', 'info', { duration: Infinity });

try {
  await sync();
  update({ message: 'Sync complete', type: 'success' });
  // toast now auto-dismisses after 4 seconds
} catch {
  update({ message: 'Sync failed', type: 'error' });
}
```

Calling `update()` restarts the auto-dismiss timer (4 seconds if no action was present, 5 seconds if one was). You cannot add or remove the action button with `update()` — that is fixed at creation time.

Calling `update()` on a dismissed toast is a no-op.

---

## Persistent toasts

Pass `duration: Infinity` to prevent auto-dismiss. The toast renders a `×` close button automatically:

```js
const handle = toast('Camera access required', 'error', { duration: Infinity });
```

The user can dismiss it with the `×` button, the Escape key, or a swipe. You can also call `handle.dismiss()` programmatically.

---

## One toast at a time

Calling `toast()` while another toast is visible immediately removes the previous one and shows the new one. There is no queue. If you need to show two sequential messages, wait for the first to finish or use `update()` to transition it.

---

## Accessibility and keyboard behaviour

- The toast container has `aria-live="polite"` — screen readers announce new messages without interrupting the user.
- Each toast element has `role="status"`.
- **Escape key** dismisses the active toast globally. The listener is removed when the toast is dismissed.
- **Hover and focus** pause the auto-dismiss timer. Moving away resumes it with the remaining time.
- **Swipe left or right** on the toast (past 60px) dismisses it.
- All dismissals except replacement fade out over `--duration-fast` (120ms). Replacement by a new toast is instant.

---

## Stacking above dialogs

The toast container is a manual popover (`popover="manual"`), so it renders in the browser's top layer — above any open `<dialog>`, including a `showModal()` backdrop. Because top-layer elements stack in show order, the container is re-shown on every `toast()` call, keeping it above a dialog that opened after it. This also means the Undo/action button stays clickable while a modal is open. Environments without the Popover API fall back to the plain fixed-position container (`z-index: 9999`).

---

## String registration

The close button label (`×`) is resolved via the locale system. Register it in `app/strings.js`:

```js
defineStrings({
  'toast.close': '×',
  // ... other keys
});
```

The scaffold includes this key automatically when the toast module is selected. The reference app also registers it in each locale pack (`app/locales/`).

---

## API reference

### toast(message, type?, options?)

Shows a toast and returns a handle.

**Parameters**
- `message` {string} — text to display
- `type` {string} — `'info'` (default) | `'success'` | `'error'`
- `options` {object} — optional
  - `duration` {number} — ms before auto-dismiss. Default: 4000ms (5000ms if `action` is set). Pass `Infinity` for persistent.
  - `action` {object} — adds a trailing action button
    - `label` {string} — button text
    - `onClick` {function} — called when the button is clicked. Not called on Escape or `×` dismiss.

**Returns** `{ dismiss, update }`

**Example**
```js
const { dismiss, update } = toast('Uploading…', 'info', { duration: Infinity });

upload(file)
  .then(() => update({ message: 'Upload complete', type: 'success' }))
  .catch(() => dismiss());
```

---

### handle.dismiss()

Fades out and removes the toast. No-op if already dismissed.

---

### handle.update({ message?, type? })

Mutates the visible toast and restarts the auto-dismiss timer. Pass only the fields you want to change. No-op if already dismissed.

**Notes**
- Restarting the timer after `update()` uses the same default (4000ms or 5000ms based on whether an action was present at creation).
- The action button cannot be added or removed after creation.

---

[← Sync](architecture.md) · [Docs home](../README.md#docs) · [Next: Testing →](testing.md)
