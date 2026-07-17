# Reorder

The reorder module (`modules/reorder/reorder.js`) is a drag-to-reorder controller for lists of components. It manages the ghost clone, the accent insert line, edge auto-scroll, drop-index maths, and keyboard reorder — everything except the drag handle, which lives in your item component.

It pairs naturally with [`syncChildren`](components.md#rendering-lists--syncchildren): `syncChildren` renders the list from state, `Reorder` mutates the order, and the resulting state change re-renders through `syncChildren` without recreating elements.

## Contents

- [How it fits together](#how-it-fits-together)
- [Single list](#single-list)
- [Cross-section](#cross-section)
- [Keyboard reorder](#keyboard-reorder)
- [Index semantics](#index-semantics)
- [API reference](#api-reference)

---

## How it fits together

The drag is **initiated by the consumer**. Each item component owns a drag handle; on `pointerdown` the handle calls `setPointerCapture` and dispatches a bubbling, composed custom event carrying the element and pointer position:

```js
// inside your item component
this._handle.addEventListener('pointerdown', e => {
  e.stopPropagation();
  this._handle.setPointerCapture(e.pointerId);
  this.dispatchEvent(new CustomEvent('item-drag-start', {
    bubbles: true, composed: true,
    detail: { item: this._item, element: this, startX: e.clientX, startY: e.clientY },
  }));
});
this._handle.addEventListener('keydown', e => {
  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
  e.preventDefault();
  this.dispatchEvent(new CustomEvent('item-reorder-key', {
    bubbles: true, composed: true,
    detail: { item: this._item, direction: e.key === 'ArrowUp' ? -1 : 1 },
  }));
});
```

`Reorder.attach` listens for those events on a container and runs the drag. It never installs its own `pointerdown`, so it composes cleanly with the [gesture library](gestures.md) on the same element.

The `detail` must include `element`, `startX`, `startY` for the drag-start event, and `direction` (`-1` up / `1` down) for the reorder-key event. Any other fields (the domain object) are yours; `cloneLabel` reads them.

---

## Single list

`container` is the list element itself — items are found inside it, and drops call `onMove(from, to)`.

```js
import { Reorder } from '../../_lib/modules/reorder/reorder.js';

subscribe() {
  this._detach = Reorder.attach(this._list, {
    itemSelector:   'list-item',
    dragStartEvent: 'item-drag-start',
    reorderKeyEvent:'item-reorder-key',
    cloneLabel:     d => d.item.title,
    onMove:         (from, to) => this._placeItem(from, to),
  });
}

unsubscribe() {
  this._detach?.();
}
```

`_placeItem` performs the array move and writes state — no drag bookkeeping, no clone, no insert line.

---

## Cross-section

For a page with several lists an item can move between (e.g. goal sections), pass `sections`. Each entry names a section and points at its outer element (used to detect which section the pointer is over) and its list element (where items live). Drops call `onMoveSection(fromSection, from, toSection, to)`.

```js
Reorder.attach(this.shadowRoot, {
  itemSelector:   'goal-item',
  dragStartEvent: 'goal-drag-start',
  reorderKeyEvent:'goal-reorder-key',
  cloneLabel:     d => d.goal.title,
  sections: [
    { name: 'capstone',   sectionEl: this._capstoneSection,  listEl: this._capstoneList },
    { name: 'milestones', sectionEl: this._milestoneSection, listEl: this._milestoneList },
    { name: 'wow',        sectionEl: this._wowSection,        listEl: this._wowList },
    { name: 'focus',      sectionEl: this._focusSection,      listEl: this._focusList },
  ],
  onMoveSection: (fromSection, from, toSection, to) =>
    this._placeGoal(fromSection, from, toSection, to),
});
```

The target section is whichever `sectionEl` is under the pointer; a keyboard reorder always stays inside the item's own section.

---

## Keyboard reorder

When `reorderKeyEvent` is provided, ArrowUp/ArrowDown on a focused handle moves the item one slot. Down uses `from + 2` (insertion-slot arithmetic — the slot after the next item); up uses `from - 1`, clamped at 0. Up at the top is a no-op.

---

## Index semantics

`from`/`to` are indices into the item array **including** the dragged element, which stays in the DOM (dimmed to 0.4 opacity) throughout the drag. `to` is the insertion slot the item would occupy. A drop that would not change order — `from === to` or `from === to - 1`, within the same section — is a no-op and the callback does not fire, so you never write an identity update.

Your move callback removes then re-inserts, accounting for the removal shifting later indices:

```js
_placeItem(from, to) {
  this._mutateItems(items => {
    const arr = [...items];
    const [moved] = arr.splice(from, 1);
    arr.splice(to > from ? to - 1 : to, 0, moved);
    return arr;
  });
}
```

---

## API reference

### `Reorder.attach(container, options)`

Wires drag-start and reorder-key listeners on `container` and returns a `detach()` function that removes them and tears down any in-flight drag (safe to call mid-drag, e.g. from `unsubscribe()`).

| Option | Type | Notes |
|--------|------|-------|
| `itemSelector` | `string` | Selector matching the draggable items within a list element |
| `dragStartEvent` | `string` | Custom event name that begins a drag |
| `reorderKeyEvent` | `string?` | Custom event name for keyboard reorder (omit to disable) |
| `cloneLabel` | `(detail) => string` | Text shown in the drag clone; receives the event `detail` |
| `onMove` | `(from, to) => void` | Single-list drop callback |
| `sections` | `Array<{ name, sectionEl, listEl }>?` | Presence enables cross-section mode |
| `onMoveSection` | `(fromSection, from, toSection, to) => void` | Cross-section drop callback |

The drag clone uses `var(--shadow-drag, 0 8px 24px rgba(0,0,0,0.18))` — define `--shadow-drag` in your tokens to theme it, or accept the fallback.

---

[← Gestures](gestures.md) · [Docs](https://github.com/elforn/socle/blob/main/README.md#docs) · [Next: Testing →](testing.md)
