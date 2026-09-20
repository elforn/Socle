# Modal dialog

The modal-dialog module (`modules/modal-dialog/modal-dialog.js`) is a `<modal-dialog>` custom element built on the native `<dialog aria-modal>`. On desktop it renders as a centered dialog; at or below 600px it becomes a bottom sheet with a drag handle, slide-up entry, and swipe-down-to-dismiss.

It is content-agnostic — slot in whatever you need. The component owns only the shell (backdrop, sheet chrome, dismissal), never the content.

## Contents

- [Quick start](#quick-start)
- [The two variants](#the-two-variants)
- [Dismissing](#dismissing)
- [Swipe-down-to-dismiss](#swipe-down-to-dismiss)
- [Tabs](#tabs)
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

When tabs are in use (see [Tabs](#tabs)), the handle is a shared surface: a drag starting there — on the pill's margin or directly on a tab segment — is classified by direction from its first ~10px of movement, exactly like body-swipe direction is. Vertical resolves to this dismiss-drag, unchanged; horizontal hands off to tab-change instead. A tap that never crosses that threshold is left alone entirely, so a tab segment's own `click` still fires normally.

While dragging, the sheet follows the finger downward via an inline `transform: translateY()`. Upward drags clamp to rest — the sheet cannot rise above its resting position.

On release the drag **commits** (dismisses) when either:

- the drag distance exceeds **25%** of the sheet's height, or
- the downward flick velocity exceeds **0.5 px/ms**.

A commit animates the sheet to `translateY(100%)` and then calls `close()` on `transitionend` (with a 350ms `setTimeout` fallback in case the transition never fires). A below-threshold release springs back to rest with the same `cubic-bezier(0.32, 0.72, 0, 1)` easing.

Under `prefers-reduced-motion: reduce`, the follow-transform and slide-out are skipped: a past-threshold release closes immediately, a below-threshold release just resets.

`pointercancel`, and a close by any other route (backdrop, Escape, programmatic), tear the in-flight drag down cleanly. `show()` clears any leftover inline transform, so a prior drag can never leave the sheet mis-positioned on the next open.

---

## Tabs

Opt-in multi-page support. A dialog that never sets `tabCount` renders exactly as it always has — this is purely additive.

```js
const dialog = document.querySelector('modal-dialog');
dialog.tabCount = 4;      // replaces the handle's pill with 4 segment dashes
dialog.activeTab = 0;     // which one is currently shown (no event fires for this assignment)

dialog.addEventListener('modal-tab-change', e => {
  render(e.detail.index); // swap the slotted content to match
});
```

`modal-dialog` does not manage page content itself — it stays content-agnostic, same as everything else about the component. Setting `tabCount`/`activeTab` only drives the segment UI and the swipe/keyboard interaction; the consumer listens for `modal-tab-change` and updates whatever is in the default slot to match `e.detail.index`.

**The segments replace the pill, not sit alongside it.** `tabCount` of 0 or 1 leaves the plain pill exactly as before (nothing to page between). `tabCount > 1` swaps to that many small dashes, the active one elongated — each is a real `role="tab"` `<button>`, independently focusable and clickable, unlike the pill it replaces (which stays `aria-hidden`, a pure touch affordance). The handle itself stops being `aria-hidden` once it holds these real controls. Each segment's hit area is `--space-6` (24px) square regardless of the dash's tiny visual size — the WCAG 2.5.8 bare minimum rather than this library's usual `--touch-target` (40px), a deliberate exception since tap is a secondary affordance behind swipe and arrow keys.

Each segment's `aria-label` comes from `t('modal-dialog.tab-label', { index, count })` — register the default in `app/strings.js`:

```js
defineStrings({
  'modal-dialog.tab-label': 'Page {index} of {count}',
});
```

**Three ways to change tabs, all equivalent:**
- **Tap a segment** — jumps straight to that page.
- **ArrowLeft/ArrowRight** while focus is on the segment row — pages one at a time, clamped at the first/last tab (no wrapping). Roving `tabindex` keeps only the active segment in the natural Tab order.
- **Swipe the body or the handle** — left advances to the next tab, right goes back, using the same distance/velocity commit thresholds as swipe-down-to-dismiss (20% of the swipeable width, or a 0.5 px/ms flick), just on the horizontal axis. The handle is a dual-purpose surface here: a horizontal drag changes tabs, a vertical one dismisses (see [Swipe-down-to-dismiss](#swipe-down-to-dismiss)) — direction is classified once, from the first ~10px of movement, so the two gestures never fight each other.

Only genuine user interaction fires `modal-tab-change` — setting `.activeTab` programmatically (e.g. to resync after the consumer changes tabs some other way) does not, so there's no risk of a feedback loop between the property and the event.

**Body swipe and nested horizontal scrolling.** The body deliberately gets no `touch-action` restriction: an ancestor's `touch-action` value constrains what a descendant is allowed to do, so restricting the body to vertical-only panning would also suppress native horizontal scrolling on anything a consumer slots inside it — a chart with its own `overflow-x: auto` region, say. Instead, direction is disambiguated in JS from the first ~10px of pointer movement (vertical intent hands off to native scroll immediately, before capturing the pointer), and a drag that starts inside an already-horizontally-scrollable descendant (detected via `scrollWidth`/`clientWidth` and computed `overflow-x`) is left alone entirely, deferring to that element's own scrolling. A drag starting on an interactive element (`button`, `a`, `input`, `textarea`, `select`, `[contenteditable]`) is also ignored, so a `<select>` or similar inside the slotted content keeps working normally.

---

## Scroll containment

The dialog uses a fixed-header / scrollable-body / fixed-footer layout so that tall content scrolls only the middle region while the handle and footer buttons remain fixed and reachable.

Internally the default slot is wrapped in a `.body` element (`flex: 1 1 auto; overflow-y: auto`). You do not interact with `.body` directly — slot content as usual and it is placed inside `.body` automatically.

`overscroll-behavior-y: contain` is set on `.body`, so an overscroll inside the dialog never chains to the page's root scroller or triggers the browser's native pull-to-refresh. The handle sets `touch-action: none`, so a drag starting on the handle is fully owned by the pointer handlers with no native scroll interpretation.

Height caps: the sheet variant (`≤600px`) limits `max-block-size` to `85vh`; the desktop centered variant caps at `min(85vh, 600px)`. Both ensure scrolling activates predictably rather than relying on the browser's UA default. By default the dialog is otherwise sized to fit its content up to that ceiling — it does not grow to fill it. Set `fixedHeight` (see [API reference](#api-reference)) to make the ceiling a floor too, when varying content height across tabs would otherwise make the sheet visibly resize.

The module never touches `document.body` or `documentElement` overscroll — root overscroll behaviour is left to the consuming app.

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

### `fixedHeight` property

Opt-in, defaults to `false`. When `true`, the dialog always renders at its `max-block-size` ceiling (`min(85vh, 600px)` desktop, `85vh` sheet) instead of shrink-wrapping to whichever content is currently slotted in. Use this on tabbed dialogs whose tabs have very different content heights, so switching tabs feels like paging within a stable container rather than resizing it. Leave it `false` (the default) for dialogs that should hug their own content — confirm sheets, action menus, and any non-tabbed dialog.

```js
dialog.tabCount = 4;
dialog.fixedHeight = true; // sheet stays a stable height across all 4 tabs
```

---

[← Toast](toast.md) · [Docs](https://github.com/elforn/socle/blob/main/README.md#docs) · [Next: Filter state →](filter-state.md)
