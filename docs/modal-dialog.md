# Modal dialog

The modal-dialog module (`modules/modal-dialog/modal-dialog.js`) is a `<modal-dialog>` custom element built on the native `<dialog aria-modal>`. On desktop it renders as a centered dialog; at or below 600px it becomes a bottom sheet with a drag handle, slide-up entry, and swipe-down-to-dismiss.

It is content-agnostic — slot in whatever you need. The component owns only the shell (backdrop, sheet chrome, dismissal), never the content.

## Contents

- [Quick start](#quick-start)
- [The two variants](#the-two-variants)
- [Dismissing](#dismissing)
- [Swipe-down-to-dismiss](#swipe-down-to-dismiss)
- [Scroll containment](#scroll-containment)
- [Accessibility](#accessibility)
- [API reference](#api-reference)

---

## Quick start

```html
<modal-dialog aria-label="Edit goal">
  <h2>Edit goal</h2>
  <input id="title" />
  <button slot="footer" id="save">Save</button>
</modal-dialog>
```

```js
const dialog = document.querySelector('modal-dialog');
dialog.show(dialog.querySelector('#title')); // opens; focuses the passed element

dialog.addEventListener('modal-close', () => {
  // fires on every dismissal — backdrop click, Escape, or swipe-down.
  // Persist the content here; the dialog does not do it for you.
});
```

The default slot holds the body; the named `footer` slot holds actions and is right-aligned. `show(focusEl)` opens the dialog and moves focus to `focusEl` (falling back to the native `showModal()` default focus if omitted).

---

## The two variants

The breakpoint is 600px. There is no configuration — the layout switches on viewport width alone.

| | Desktop (>600px) | Sheet (≤600px) |
|---|---|---|
| Position | Centered, `min(90vw, 400px)` wide | Full-width, pinned to the bottom |
| Entry | `fade-in` | `slide-up` (`0.28s cubic-bezier(0.32, 0.72, 0, 1)`) |
| Handle | `display: none` | Visible grab pill |
| Swipe-to-dismiss | — | Handle drag (see below) |
| Safe area | — | `padding-block-end` includes `--safe-area-bottom` |

`prefers-reduced-motion: reduce` disables both entry animations and the swipe follow/slide-out.

---

## Dismissing

Every dismissal path ends the same way: `close()` → the native `close` event → a bubbling, composed `modal-close` event. Listen for `modal-close`, not for individual gestures.

- **Backdrop click** — clicking outside the dialog box closes it. A `_justOpened` guard suppresses the synthetic click from the touch that opened the dialog, so a tap-to-open never immediately dismisses.
- **Escape** — native `<dialog>` behaviour.
- **Swipe-down** — sheet mode only, described next.
- **Programmatic** — call `close()`.

---

## Swipe-down-to-dismiss

In sheet mode, dragging the handle down dismisses the sheet. The gesture is attached to the **handle only**, never the sheet body, so it never competes with scrolling long slotted content. It is a no-op above 600px (the gesture is gated on `matchMedia('(max-width: 600px)')` and the handle is hidden there anyway).

While dragging, the sheet follows the finger downward via an inline `transform: translateY()`. Upward drags clamp to rest — the sheet cannot rise above its resting position.

On release the drag **commits** (dismisses) when either:

- the drag distance exceeds **25%** of the sheet's height, or
- the downward flick velocity exceeds **0.5 px/ms**.

A commit animates the sheet to `translateY(100%)` and then calls `close()` on `transitionend` (with a 350ms `setTimeout` fallback in case the transition never fires). A below-threshold release springs back to rest with the same `cubic-bezier(0.32, 0.72, 0, 1)` easing.

Under `prefers-reduced-motion: reduce`, the follow-transform and slide-out are skipped: a past-threshold release closes immediately, a below-threshold release just resets.

`pointercancel`, and a close by any other route (backdrop, Escape, programmatic), tear the in-flight drag down cleanly. `show()` clears any leftover inline transform, so a prior drag can never leave the sheet mis-positioned on the next open.

---

## Scroll containment

The dialog sets `overscroll-behavior-y: contain`, so an overscroll inside the sheet never chains to the page's root scroller or triggers the browser's native pull-to-refresh. The handle sets `touch-action: none`, so a drag starting on the handle is fully owned by the pointer handlers with no native scroll interpretation.

Containment lives on the dialog element only. The module never touches `document.body` or `documentElement` overscroll — root overscroll behaviour is left to the consuming app.

---

## Accessibility

- The inner `<dialog>` carries `aria-modal="true"`; pass an `aria-label` attribute on `<modal-dialog>` and it is forwarded to the dialog.
- The handle is `aria-hidden="true"` — it is a touch affordance, not an interactive control for assistive tech. Keyboard and screen-reader users dismiss with Escape.
- Focus is trapped by the native `<dialog>`; `show(focusEl)` sets the initial focus target.

---

## API reference

### `show(focusEl?)`

Opens the dialog via `showModal()` and moves focus to `focusEl` after open (falls back to the native default focus when omitted). Clears any inline transform/transition left by a prior drag.

### `close()`

Closes the dialog, which fires the native `close` event and, in turn, `modal-close`.

### `modal-close` event

Bubbling and composed. Dispatched on every dismissal. This is where consumers persist content — the component itself stores nothing.

### `aria-label` attribute

Forwarded to the inner `<dialog>` when present.

---

[← Toast](toast.md) · [Docs](https://github.com/elforn/socle/blob/main/README.md#docs) · [Next: Testing →](testing.md)
