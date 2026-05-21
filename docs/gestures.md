# Gestures

The gesture library provides touch-optimised interactions for Web Components using the Pointer Events API. It avoids the 300ms tap delay, correctly distinguishes tap from long press, and cancels gestures on significant finger movement.

Gestures are added to a component via a class mixin. There is no separate setup — you override the handlers you need and the mixin handles everything else.

## Quick start

```js
import { AppElement } from '../_lib/core/app-element.js';
import { Gestures } from '../_lib/modules/gestures/gestures.js';

class MyCard extends Gestures(AppElement) {
  template() {
    return `<p>Tap or hold me</p>`;
  }

  onTap(e) {
    console.log('tapped', e.startX, e.startY);
  }

  onLongPress(e) {
    console.log('long-pressed for', e.duration, 'ms');
  }
}

customElements.define('my-card', MyCard);
```

The mixin detects which handlers you define at `connectedCallback`, wires up pointer events, sets the appropriate `touch-action`, and cleans up on `disconnectedCallback`. You do not call any setup methods.

## Two-layer model

### Layer 1 — mixin (host element)

The mixin is for gestures on the component's own element. This covers the common case: tapping a card, long-pressing a row, swiping a list item.

Override whichever handlers apply. The mixin only wires up listeners for the handlers that exist — a component with only `onTap` has no long-press listener attached.

```js
class ScoreRow extends Gestures(AppElement) {
  onTap(e)       { /* select row */ }
  onLongPress(e) { /* open context menu */ }
  onSwipe(e)     { /* swipe to delete — not yet implemented */ }
}
```

### Layer 2 — `Gestures.attach` (child elements)

For gestures on child elements inside the shadow DOM that are not their own Web Components — a drag handle div, a slider thumb, a swipe row within a list component. Use `Gestures.attach` from within `subscribe()` and call the returned cleanup function in `unsubscribe()`.

```js
class ProgressBar extends Gestures(AppElement) {
  subscribe() {
    this._cleanupHandle = Gestures.attach(
      this.shadowRoot.querySelector('.handle'),
      'drag',
      e => this._onHandleDrag(e)
    );
  }

  unsubscribe() {
    this._cleanupHandle?.();
  }
}
```

Child element gestures are independent of the host's gesture state — dragging `.handle` does not cancel a tap on the host element.

`Gestures.attach` is not yet implemented. It will be built when the first concrete use case arrives (the drag handle for the goal completion bar).

**When to make the child a Web Component instead:** if the child has its own visual state, its own events, or will be reused in other components, give it the mixin. Use `Gestures.attach` only for structural sub-elements where the parent owns all the interaction semantics.

## Implemented gestures

### Tap

Fires when the pointer is released with less than 10px of movement from the start position. Cancels if the finger moves before release. Does not fire if a long press already fired in the same pointer-down sequence.

```js
onTap(e) {
  // e.type === 'tap'
  // e.startX, e.startY — where the finger touched down
  // e.endX, e.endY — where it lifted
  // e.distance — px moved (always < 10 for a tap)
  // e.duration — ms from down to up
  // e.originalEvent — the original pointerdown event
}
```

`touch-action` is set to `manipulation` — eliminates the 300ms delay on older mobile browsers while preserving native vertical scroll.

### Long press

Fires after 500ms of stationary contact. Cancels if the finger moves more than 10px before the timer fires. Does not allow tap to fire in the same pointer-down sequence.

```js
onLongPress(e) {
  // e.type === 'longpress'
  // e.duration — always ~500ms (the timer delay)
  // start and end coordinates are the same (no movement)
}
```

`user-select: none` is added alongside `manipulation` to prevent text selection during the hold.

## Gesture event object

All handlers receive the same normalised object:

```js
{
  type,          // 'tap' | 'longpress' | 'swipe' | 'drag' | ...
  direction,     // 'left' | 'right' | 'up' | 'down' | null
  velocity,      // px/ms | null
  distance,      // px moved from start to end
  startX, startY,
  endX, endY,
  duration,      // ms from pointerdown to gesture completion
  originalEvent, // the native pointerdown PointerEvent
}
```

`direction` and `velocity` are `null` for tap and long press. They will be populated for swipe and drag when those are implemented.

## Gesture coordination

These rules apply within a single pointer-down sequence:

- **Tap cancels if movement > 10px** — any significant finger movement and tap cannot fire.
- **Long press suppresses tap** — if a long press fires, releasing the finger does not also fire tap.
- **Only one gesture fires per pointer-down** — once a gesture fires or is cancelled, no others fire until the next pointer-down.

## Keyboard alternatives

Any gesture must have a keyboard equivalent. Users on keyboards, switch access devices, or with motor difficulties cannot perform touch gestures. The keyboard equivalent also serves as a testable API for the gesture's semantic meaning.

```js
subscribe() {
  this._onKeyDown = e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.onTap();        // same handler, no event argument needed
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      this.onLongPress();  // destructive action → Delete key is the natural mapping
    }
  };
  this.addEventListener('keydown', this._onKeyDown);
}

unsubscribe() {
  this.removeEventListener('keydown', this._onKeyDown);
}
```

Call the handler directly from the keyboard listener — the handlers are plain methods that work with or without a gesture event argument. This keeps the keyboard path and the gesture path using identical logic.

## Testing components with gestures

`happy-dom` does not implement `setPointerCapture` or `releasePointerCapture`. Mock them at module scope in any test file that mounts a gesture-enabled component:

```js
// At the top of your test file, before imports
HTMLElement.prototype.setPointerCapture = () => {};
HTMLElement.prototype.releasePointerCapture = () => {};
```

These are no-ops in tests — pointer capture is a browser-level concern not exercised in unit tests. Do not add them to the global Vitest setup.

## API reference

### `Gestures(Base)`

Class mixin. Wrap your component class: `class Foo extends Gestures(AppElement)`.

Detects defined handlers at `connectedCallback`. Wires pointer events only for the gestures you declare. Cleans up all listeners and timers at `disconnectedCallback`.

**Overridable handlers**

| Method | Fires when |
|--------|-----------|
| `onTap(e)` | Pointer down then up with < 10px movement |
| `onLongPress(e)` | 500ms stationary contact |
| `onSwipe(e)` | Directional movement past threshold (not yet implemented) |

---

### `Gestures.attach(element, type, handler)` *(not yet implemented)*

Static method. Attaches a gesture listener to a child element that is not its own Web Component.

**Parameters**
- `element` {HTMLElement} — the child element to attach the gesture to
- `type` {string} — `'tap'` | `'longpress'` | `'swipe'` | `'drag'`
- `handler` {function} — called with a normalised gesture event object

**Returns** {function} — cleanup function; call it in `unsubscribe()` to remove all listeners

**Notes** — child gestures are independent of the host's gesture state. A drag on a `.handle` element does not cancel a tap on the host.
