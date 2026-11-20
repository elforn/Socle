# Toast

The toast module shows brief feedback messages at the bottom of the screen. Toasts are appropriate for confirming an action ("Goal saved"), reporting a result ("Export complete"), or surfacing a reversible operation with an Undo button.

Toasts are not appropriate for errors that require a decision — use a modal dialog for those.

## Contents

- [Quick start](#quick-start)
- [Types](#types)
- [Options](#options)
- [Two actions on one toast](#two-actions-on-one-toast)
- [Dismissing programmatically](#dismissing-programmatically)
- [Updating in place](#updating-in-place)
- [Persistent toasts](#persistent-toasts)
- [One toast at a time](#one-toast-at-a-time)
- [Width](#width)
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

The toast appears at the bottom of the screen, auto-dismisses after 4 seconds (5 seconds with one action, 6 with two), then fades out. No component wiring required.

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
  duration,  // ms — how long before auto-dismiss. Omit for the default (4000 / 5000 / 6000)
  action,    // { label, onClick } — one trailing action button
  actions,   // [{ label, onClick }, …] — up to two, rendered in array order
})
```

**`duration`** — Override the auto-dismiss timer. Pass `Infinity` for a toast that never auto-dismisses (see [Persistent toasts](#persistent-toasts)). The default scales with how much there is to decide: 4000ms with no action, 5000ms with one, 6000ms with two.

**`action`** — Adds a trailing button inside the toast. `label` is the button text, `onClick` is called when the user taps it. Pressing Escape dismisses the toast without calling `onClick`. The action button on an `'info'` toast is tinted with `--color-accent`; on `'success'` and `'error'` it inherits the toast's text colour for contrast.

**`actions`** — The same thing at higher arity. See below.

---

## Two actions on one toast

A confirmation that both moves something and can be reversed needs two buttons — typically a jump to where the thing landed, plus Undo:

```js
toast('“Gym” goal moved to Milestones', 'success', {
  actions: [
    { label: 'Go to', onClick: () => navigate(`/${year}#milestones`) },
    { label: 'Undo',  onClick: () => restore(snapshot) },
  ],
});
```

Buttons render **start-to-end in array order**, so the last entry sits at the end edge (the right, in LTR). Undo belongs last — it is the one the user reaches for without reading.

`action` and `actions` are the same mechanism; `action: x` is exactly `actions: [x]`. Existing call sites using `action` are unaffected, including their DOM structure.

**Two is the cap.** A third button does not fit the width a toast actually has. Pass more and the first two render and the rest are dropped with a `console.warn` — never silently, because a dropped action is a control the caller believes shipped. Passing both `action` and `actions` also warns; `actions` wins.

**Markup.** Every button carries `.socle-toast-btn`, so `document.querySelector('.socle-toast-btn')` keeps finding a button regardless of arity. With two or more, the buttons are wrapped in a `.socle-toast-actions` flex row so the toast's own message-to-actions gap does not also become the gap *between* the buttons; a single action stays a direct child of the toast. Every button except the last also gets `.socle-toast-btn-secondary` — no visual difference by default, available if an app wants to de-emphasise the secondary. The `--color-accent` tint on `'info'` toasts applies to both.

`actions: []` behaves as no action at all: no button, 4000ms default.

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

Calling `update()` restarts the auto-dismiss timer using the same default the toast was created with (4, 5 or 6 seconds, by action count). You cannot add or remove action buttons with `update()` — they are fixed at creation time.

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

## Width

The toast container spans the viewport (`inset-inline: 0`) and centres the toast with its own `align-items: center`. Each toast is sized to its content and can use the full viewport width less the container's padding.

This is worth knowing because it was wrong until 1.7.0. The container used to sit at `inset-inline-start: 50%` and pull itself back with `transform: translateX(-50%)`. That centres it visually, but its *layout* width stayed shrink-to-fit against the space from the 50% start edge to the end of the viewport — half the viewport, and everything inside was capped by that. On a 375px viewport a toast with one action measured 187px, leaving about 12 characters' room for the message; a `max-inline-size` set by the app on `.socle-toast` was dead CSS that never got the chance to apply. Nothing was visibly broken until a message was long enough to matter, which is exactly when a toast most needs the room.

Two details of the current rule are load-bearing. `inline-size: auto` is required because the container is `popover="manual"` and the UA popover rules set `width: fit-content`, which re-imposes shrink-to-fit even with both insets at 0. And the old `transform` had to go rather than merely becoming redundant — against a full-width container it would shift every toast half a viewport to the start side.

The container keeps `pointer-events: none` (the toast itself is `auto`), so a full-width container intercepts nothing.

`.socle-toast` still sets `white-space: nowrap`, and the module sets no `max-inline-size` — an app that wants one can now set it and have it apply.

---

## Accessibility and keyboard behaviour

- The toast container has `aria-live="polite"` — screen readers announce new messages without interrupting the user.
- Each toast element has `role="status"`.
- **Escape key** dismisses the active toast globally. The listener is removed when the toast is dismissed.
- **Hover and focus** pause the auto-dismiss timer. Moving away resumes it with the remaining time.
- **Swipe left or right** on the toast (past 120px, calibrated on-device) dismisses it, following the finger live and springing back if released short of the threshold. The toast uses `touch-action: pan-y pinch-zoom` and claims the horizontal axis explicitly via `core/scroll-claim.js` — `manipulation` looks equally reasonable but is unreliable on Chrome for Android (the compositor's own scroll-gesture arbitration can commit to native panning ahead of `setPointerCapture()`), and `none` leaves the browser flinging invisibly after a flick. See [Gestures → Axis ownership](gestures.md). A vertical-dominant move is ignored rather than attempted as a confused horizontal drag.
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
  - `duration` {number} — ms before auto-dismiss. Default: 4000ms, or 5000ms with one action, 6000ms with two. Pass `Infinity` for persistent.
  - `action` {object} — adds one trailing action button
    - `label` {string} — button text
    - `onClick` {function} — called when the button is clicked. Not called on Escape or `×` dismiss.
  - `actions` {array} — up to two `{ label, onClick }` objects, rendered start-to-end in array order (so the last sits at the end edge). Over two: the first two render, the rest are dropped with a `console.warn`. Takes precedence over `action` (and warns) if both are given.

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
- Restarting the timer after `update()` uses the same default the toast was created with (4000 / 5000 / 6000ms by action count).
- Action buttons cannot be added or removed after creation.

---

[← App header](app-header.md) · [Docs home](../README.md#docs) · [Next: Modal dialog →](modal-dialog.md)
