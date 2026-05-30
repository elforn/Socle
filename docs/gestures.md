# Gestures

The gesture library provides touch-optimised interactions for Web Components using the Pointer Events API. It avoids the 300ms tap delay, correctly distinguishes tap from long press and swipe, and yields to native scroll when appropriate.

Gestures are added to a component via a class mixin. There is no separate setup — you override the handlers you need and the mixin handles everything else.

## Contents

- [Quick start](#quick-start)
- [Two-layer model](#two-layer-model)
- [Implemented gestures](#implemented-gestures)
- [Gesture event object](#gesture-event-object)
- [Gesture coordination](#gesture-coordination)
- [touch-action summary](#touch-action-summary)
- [Keyboard alternatives](#keyboard-alternatives)
- [Testing components with gestures](#testing-components-with-gestures)
- [API reference](#api-reference)

---

## Quick start

```js
import { AppElement } from '../_lib/core/app-element.js';
import { Gestures } from '../_lib/modules/gestures/gestures.js';

class MyCard extends Gestures(AppElement) {
  template() {
    return `<p>Tap or swipe me</p>`;
  }

  onTap(e) {
    console.log('tapped', e.startX, e.startY);
  }

  onSwipe(e) {
    console.log('swiped', e.direction, 'at', e.velocity, 'px/ms');
  }
}

customElements.define('my-card', MyCard);
```

The mixin detects which handlers you define at `connectedCallback`, wires up pointer events, sets the appropriate `touch-action`, and cleans up on `disconnectedCallback`. You do not call any setup methods.

## Two-layer model

### Layer 1 — mixin (host element)

The mixin is for gestures on the component's own element. This covers the common case: tapping a card, long-pressing a row, swiping a list item.

Override whichever handlers apply. The mixin only wires up listeners for the handlers that exist — a component with only `onTap` has no swipe listener attached.

```js
class GoalCard extends Gestures(AppElement) {
  onTap(e)            { /* select */ }
  onSwipeMove(e)      { /* update card position in real time */ }
  onSwipe(e)          { /* snap to armed or dismiss */ }
  onHoldDragStart(e)  { /* hold committed — begin drag */ }
  onHoldDrag(e)       { /* update drag target */ }
  onHoldDragEnd(e)    { /* commit drag result */ }
}
```

### Layer 2 — `Gestures.attach` (child elements)

For gestures on child elements inside the shadow DOM that are not their own Web Components — a drag handle div, a slider thumb, a progress bar. Use `Gestures.attach` from within `subscribe()` and call the returned cleanup function in `unsubscribe()`.

```js
class GoalCard extends Gestures(AppElement) {
  subscribe() {
    this._barCleanup = Gestures.attach(
      this.shadowRoot.querySelector('.progress-bar'),
      {
        onHoldDragStart: () => { /* lock in */ },
        onHoldDrag: (e) => { /* update fill */ },
        onHoldDragEnd: () => { /* commit */ },
        onSwipeMove: (e) => this.onSwipeMove(e),
        onSwipe: (e) => this.onSwipe(e),
      }
    );
  }

  unsubscribe() {
    this._barCleanup?.();
  }
}
```

Child element gestures are independent of the host's gesture state. A hold-drag on `.progress-bar` does not cancel a swipe registered on the host element.

**When to make the child a Web Component instead:** if the child has its own visual state, its own events, or will be reused in other components, give it the mixin. Use `Gestures.attach` only for structural sub-elements where the parent owns all the interaction semantics.

## Implemented gestures

### Tap

Fires when the pointer is released with less than 18px of movement from the start position. Cancels if the finger moves before release. Does not fire if a long press or hold-drag already fired in the same pointer-down sequence.

```js
onTap(e) {
  // e.type === 'tap'
  // e.startX, e.startY — where the finger touched down
  // e.endX, e.endY — where it lifted
  // e.distance — px moved (always < 18 for a tap)
  // e.duration — ms from down to up
}
```

`touch-action` is set to `manipulation` — eliminates the 300ms delay on older mobile browsers while preserving native vertical scroll.

### Long press

Fires after 500ms of stationary contact. Cancels if the finger moves more than 18px before the timer fires. Does not allow tap to fire in the same pointer-down sequence. Mutually exclusive with hold-drag — if `onHoldDragStart` is defined, it takes priority and `onLongPress` is ignored.

```js
onLongPress(e) {
  // e.type === 'longpress'
  // e.duration — always ~500ms
}
```

`user-select: none` is added to prevent text selection during the hold.

### Swipe

A directional horizontal move. Fires at the end of a pointer sequence that moved more than 18px horizontally. Yields to native scroll when the movement is more vertical than horizontal — `touch-action: pan-y` allows the browser to take over for vertical scroll.

Two handlers work together for smooth real-time feedback:

```js
onSwipeMove(e) {
  // Fires on every pointermove during a horizontal swipe
  // e.dx — displacement from start (negative = left, positive = right)
  // Use this to move a card or panel in real time
  this._cardInner.style.transform = `translateX(${e.dx * 0.75}px)`;
}

onSwipe(e) {
  // Fires once at the end of the swipe (pointerup)
  // e.direction — 'left' | 'right'
  // e.distance — absolute px moved
  // e.velocity — px/ms
  // Use this to decide whether to snap, dismiss, or return
  if (e.velocity > 0.7 || e.distance > 100) {
    this._arm(e.direction);
  } else {
    this._dismiss();
  }
}
```

You can define `onSwipeMove` without `onSwipe` or vice versa. Typically you need both — `onSwipeMove` for visual tracking and `onSwipe` for the commit decision.

### Hold-drag

A two-phase gesture: the user holds for 500ms to commit, then drags freely. Commonly used for scrubbing a value (completion bar) or initiating a drag-to-reorder.

Three handlers form the lifecycle:

```js
onHoldDragStart(e) {
  // Fires once after the 500ms hold — drag is now committed
  navigator.vibrate?.(50);
  this._fill.style.transition = 'none';
}

onHoldDrag(e) {
  // Fires on every pointermove after hold committed
  // e.endX — current finger X position
  // e.dx, e.dy — displacement from start
  const rect = this._bar.getBoundingClientRect();
  const pct = Math.max(0, Math.min(100, (e.endX - rect.left) / rect.width * 100));
  this._setCompletion(Math.round(pct));
}

onHoldDragEnd(e) {
  // Fires once on pointerup or pointercancel
  this._fill.style.transition = '';
  this._dispatchCompletionChange();
}
```

`touch-action: none` is set — hold-drag takes full control of the pointer, no native scroll.

**Note on haptics:** `navigator.vibrate()` works reliably only on `onHoldDragStart` (fired from a `setTimeout`, not a direct pointer event). Chrome requires the call be triggered by user activation; Firefox has removed the API entirely. Only call it in `onHoldDragStart`.

## Gesture event object

All handlers receive a normalised event object. Not all fields are meaningful for every gesture type.

```js
{
  type,          // 'tap' | 'longpress' | 'swipe' | 'swipemove' | 'holddragstart' | 'holddrag' | 'holddragend'
  startX, startY,  // pointer-down position
  endX, endY,      // current or final position
  dx, dy,          // displacement from start (signed)
  distance,        // Euclidean px from start (unsigned)
  direction,       // 'left' | 'right' | 'up' | 'down' | null
  velocity,        // px/ms (populated for 'swipe' only; null otherwise)
  duration,        // ms from pointerdown to gesture completion
  originalEvent,   // the native pointerdown PointerEvent
}
```

`direction` and `velocity` are `null` for tap, long press, and hold-drag. `velocity` is populated only for the final `onSwipe` event.

## Gesture coordination

These rules apply within a single pointer-down sequence:

- **Movement threshold is 18px.** Below this, the gesture stays in tracking phase and a tap can still fire.
- **Horizontal vs vertical discrimination.** Once movement exceeds 18px, the gesture checks `|dx|` vs `|dy|`. If `|dy| >= |dx|`, the pointer is released to native scroll and the gesture is cancelled. If `|dx| > |dy|`, a swipe begins.
- **Hold timer fires first → hold-drag.** If the 500ms timer fires before any movement exceeds 18px, the gesture enters hold-drag phase. Moving the finger after this drives `onHoldDrag`.
- **Only one gesture fires per pointer-down.** Once any gesture fires or is cancelled, no others fire until the next pointer-down.
- **`onHoldDragStart` takes priority over `onLongPress`.** Defining both would be a logic error — the mixin uses `onHoldDragStart` if present and ignores `onLongPress`.

## touch-action summary

| Handlers defined | touch-action set |
|-----------------|-----------------|
| `onTap` only | `manipulation` |
| `onLongPress` | `manipulation` + `user-select: none` |
| `onSwipe` (any) | `pan-y` |
| `onHoldDragStart` (any) | `none` + `user-select: none` |

`Gestures.attach` sets `touch-action: pan-y` when swipe handlers are present, `none` otherwise.

## Keyboard alternatives

Every gesture must have a keyboard equivalent. The gesture handlers are plain methods — call them directly from a `keydown` listener.

```js
subscribe() {
  this._onKeyDown = e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.onTap();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this._arm('left');
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      this._arm('right');
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      this._dispatchDelete();
    }
  };
  this.addEventListener('keydown', this._onKeyDown);
}

unsubscribe() {
  this.removeEventListener('keydown', this._onKeyDown);
}
```

For slider-like hold-drag interactions, the progress bar should have `role="slider"` and respond to Arrow keys for stepwise changes — the keyboard path replaces the drag gesture, not just triggers it.

## Testing components with gestures

`happy-dom` does not implement `setPointerCapture` or `releasePointerCapture`. Mock them at module scope in any test file that mounts a gesture-enabled component:

```js
// At module scope, before any imports that trigger component registration
HTMLElement.prototype.setPointerCapture = () => {};
HTMLElement.prototype.releasePointerCapture = () => {};
```

These are no-ops in unit tests — pointer capture is a browser-level concern not exercised in unit tests. Do not add them to the global Vitest setup (`core/test-setup.js`).

Pointer gestures (swipe physics, hold timing) require a real browser and are best covered by Playwright E2E tests. Unit test the semantic outcomes (events dispatched, DOM state) via direct handler calls:

```js
// Call handlers directly — no pointer events needed
el._arm('left');
el.onSwipe({ direction: 'right', distance: 200, velocity: 0 });
expect(el._armed).toBeNull();
```

## API reference

### `Gestures(Base)`

Class mixin. Wrap your component class: `class Foo extends Gestures(AppElement)`.

Detects defined handlers at `connectedCallback`. Wires pointer events only for the gestures you declare. Cleans up all listeners and timers at `disconnectedCallback`.

**Overridable handlers**

| Method | Fires when |
|--------|-----------|
| `onTap(e)` | Pointer down then up with < 18px movement |
| `onLongPress(e)` | 500ms stationary contact (only if `onHoldDragStart` not defined) |
| `onSwipeMove(e)` | Each pointermove after horizontal movement exceeds 18px |
| `onSwipe(e)` | Pointerup after a horizontal swipe |
| `onHoldDragStart(e)` | After 500ms stationary contact — begins hold-drag phase |
| `onHoldDrag(e)` | Each pointermove after hold committed |
| `onHoldDragEnd(e)` | Pointerup or pointercancel after hold committed |

---

### `Gestures.attach(element, handlers)`

Static method. Attaches gesture listeners to a child element that is not its own Web Component. Returns a cleanup function — call it in `unsubscribe()`.

**Parameters**
- `element` {HTMLElement} — the child element to attach gestures to
- `handlers` {object} — object with any of the handler methods as keys:
  - `onHoldDragStart(e)`, `onHoldDrag(e)`, `onHoldDragEnd(e)`
  - `onSwipeMove(e)`, `onSwipe(e)`

**Returns** {function} — cleanup function; removes all listeners and cancels any active timer

**Example**
```js
subscribe() {
  this._cleanup = Gestures.attach(this.shadowRoot.querySelector('.handle'), {
    onHoldDragStart: () => { this._fill.style.transition = 'none'; },
    onHoldDrag: (e) => { this._updateFill(e.endX); },
    onHoldDragEnd: () => {
      this._fill.style.transition = '';
      this._dispatch();
    },
  });
}

unsubscribe() {
  this._cleanup?.();
}
```

**Notes** — child gestures are independent of the host's gesture state. `e.stopPropagation()` is called on `pointerdown` to prevent the parent from also starting a gesture sequence on the same event.

---

[← Building components](components.md) · [Next: Testing →](testing.md)
