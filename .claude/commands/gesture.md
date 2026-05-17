# /gesture

Scaffold a new gesture type in the gesture library.

## Usage
/gesture <name>

Example: `/gesture longPress`

## What to do

1. **Read `modules/gestures/gestures.js`** in full before writing anything. Understand the existing gesture structure, the normalised event object shape, and how `touch-action` is managed.

2. **Implement the gesture** in `modules/gestures/gestures.js` following these rules:
   - Gesture logic is a self-contained function that takes a target element and a handler callback
   - It attaches its own event listeners and returns a cleanup function that removes them
   - The handler receives a single normalised event object:
     `{ type, direction, velocity, distance, startX, startY, endX, endY, duration, originalEvent }`
   - Fill in only the fields relevant to the gesture — others can be `null`
   - Movement threshold for accidental touch: 8px minimum before any directional intent is registered
   - For gestures that conflict with native scroll: lock direction on first 10px of movement; yield to native scroll if vertical
   - For drag-style gestures: use pointer capture (`element.setPointerCapture(e.pointerId)`)
   - `touch-action` CSS value must be documented in a comment above the function: what the consuming component must set and why

3. **Register the gesture name** in the `GESTURE_TOUCH_ACTIONS` map so the `Gestures` mixin can set `touch-action` automatically when the gesture is declared.

4. **Write tests** in `modules/gestures/gestures.test.js`:
   - Simulate pointer events using Vitest + happy-dom's pointer event support
   - Test: gesture fires on valid input
   - Test: gesture does not fire below movement threshold
   - Test: cleanup function removes all listeners (verify with a spy)
   - Note any aspects that require Playwright for full validation (e.g. native scroll interaction)

5. **Add a usage example** to `docs/gestures.md` showing the gesture in a component context.

6. **Report** what was added, the `touch-action` requirement, and any known browser inconsistencies to be aware of.
