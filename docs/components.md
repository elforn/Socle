# Building components

All UI in a Socle app is built from Web Components that extend `AppElement`. This guide covers the base class, the component tiers, and the patterns you will use every time you build a component.

## Contents

- [Component tiers](#component-tiers)
- [AppElement](#appelement)
- [Shadow DOM](#shadow-dom)
- [Styles and tokens](#styles-and-tokens)
- [The render lifecycle](#the-render-lifecycle)
- [subscribe and unsubscribe](#subscribe-and-unsubscribe)
- [Registering a component](#registering-a-component)
- [Styling patterns](#styling-patterns)
- [API reference](#api-reference)

---

## Component tiers

Every component belongs to one of three tiers. The tier determines what the component is allowed to import and how it is tested.

| Tier | Purpose | Store access | Example |
|---|---|---|---|
| **Page** | One per route, owns layout | Yes | `<goals-page>` |
| **UI** | Reusable widget | No — zero store imports | `<goal-card>`, `<update-banner>` |
| **Service** | Invisible lifecycle manager | Yes | `<sw-manager>`, `<db-init>` |

UI components must be testable in isolation with no store dependency. If you find yourself importing the store in a UI component, it is doing too much — split it.

---

## AppElement

Every component extends `AppElement`, which lives at `_lib/core/app-element.js`. It provides Shadow DOM setup, shared base styles, and the `render`/`subscribe`/`unsubscribe` lifecycle.

```js
import { AppElement } from '../_lib/core/app-element.js';

class GoalCard extends AppElement {
  template() {
    return `
      <article class="card">
        <h2 class="title"></h2>
      </article>
    `;
  }

  subscribe() {
    // bind store subscriptions here
  }

  unsubscribe() {
    // clean up subscriptions here
  }
}

customElements.define('goal-card', GoalCard);
```

---

## Shadow DOM

`AppElement` attaches a shadow root in open mode on first connect. You do not call `attachShadow` yourself.

```js
connectedCallback() {
  // shadow root is already attached — use this.shadowRoot freely
  this.shadowRoot.querySelector('.title').textContent = this.title;
}
```

The shadow root is attached exactly once. If the element is removed from the DOM and reinserted, the existing shadow root and its contents are preserved.

---

## Styles and tokens

Every shadow root automatically adopts the base structural stylesheet from `_lib/core/styles/base.js`. This gives your component `:host { display: block }`, box-sizing, and tap-highlight reset with no extra imports.

Design tokens — colours, spacing, typography — are defined in `_lib/core/styles/tokens.css` and linked in `index.html`. CSS custom properties cascade into shadow DOM, so every token is available in your component's styles without any extra setup:

```js
template() {
  return `
    <style>
      :host { padding: var(--space-md); }
      .title { font-size: var(--font-size-heading); color: var(--color-text-primary); }
    </style>
    <h2 class="title"></h2>
  `;
}
```

Never hardcode a colour, spacing value, or font size. If the token you need does not exist, add it to `tokens.css`.

---

## The render lifecycle

`template()` is called exactly once — on first connect. It returns an HTML string that is set as the shadow root's innerHTML.

```js
template() {
  return `<p class="count">0</p>`;
}
```

After the initial render, **never call `render()` again**. Instead, update the DOM directly using targeted methods:

```js
updateCount(n) {
  this.shadowRoot.querySelector('.count').textContent = n;
}
```

Full re-renders cause focus loss, scroll position resets, and nested component lifecycle churn. They are never the right answer.

---

## subscribe and unsubscribe

`subscribe()` is called every time the element connects to the DOM. `unsubscribe()` is called every time it disconnects. Use these to bind and release store subscriptions.

```js
subscribe() {
  this._unsub = Store.subscribe('goals', goals => this.updateList(goals));
}

unsubscribe() {
  this._unsub?.();
}
```

If the component has no store bindings (UI tier), leave both as empty overrides or omit them entirely — the base class no-ops are fine.

---

## Registering a component

Register with `customElements.define` after the class definition, at the bottom of the file:

```js
customElements.define('goal-card', GoalCard);
```

Import the file wherever the component is used — the registration happens as a side effect of the import.

---

## Styling patterns

### Base reset

`:host` is already set to `display: block`. Add layout styles for your component on top:

```css
:host {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
```

### CSS logical properties

Use logical properties throughout — they cost nothing now and make RTL language support (V4) essentially free:

```css
/* ✅ correct */
padding-inline: var(--space-md);
margin-block-end: var(--space-sm);
border-inline-start: 2px solid var(--color-accent);

/* ❌ avoid */
padding-left: 16px;
margin-bottom: 8px;
border-left: 2px solid orange;
```

---

## API reference

### AppElement

Base class for all components. Extend this — do not use `HTMLElement` directly.

---

#### `template()`

Returns an HTML string rendered into the shadow root once on first connect.

**Returns** `{string}` — HTML markup

**Example**
```js
template() {
  return `<button class="action">Submit</button>`;
}
```

**Notes** — called once. Never call it yourself after mount. Use targeted DOM updates for all subsequent changes.

---

#### `render()`

Writes `this.template()` to `this.shadowRoot.innerHTML`. Called automatically on first connect.

**Notes** — do not call this manually after mount. It exists as a hook for the initial paint only. Calling it post-mount resets the entire shadow DOM and causes focus loss.

---

#### `subscribe()`

Called by the base class every time the element connects to the DOM. Override to bind store subscriptions or set up event listeners.

**Example**
```js
subscribe() {
  this._unsub = Store.subscribe('items', items => this.updateItems(items));
}
```

---

#### `unsubscribe()`

Called by the base class every time the element disconnects. Override to clean up store subscriptions and event listeners.

**Example**
```js
unsubscribe() {
  this._unsub?.();
}
```

---

#### `this.shadowRoot`

Available after first `connectedCallback`. An open `ShadowRoot` with `baseSheet` already adopted.

---

[← SW update flow](sw-update-flow.md) · [Next: Gestures →](gestures.md)
