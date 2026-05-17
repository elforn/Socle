# /component

Scaffold a new Web Component for this project.

## Usage
/component <name> <tier> [gestures]

- `name` — kebab-case element name, e.g. `score-card`
- `tier` — one of: `page`, `ui`, `service`
- `gestures` — optional, comma-separated list of gestures to register, e.g. `tap,swipeLeft`

## What to do

0. **Before writing any code, read in this order:**
   - `.claude/ui.md` — visual language, interaction patterns, what is never done
   - `core/styles/tokens.css` — every available design value
   - The most similar existing component in the codebase — match its structure and token usage exactly
   Only then implement.

1. **Determine the file path** based on tier:
   - `page` → `reference-app/pages/<name>/<name>.js`
   - `ui` → `core/components/<name>/<name>.js`
   - `service` → `core/services/<name>/<name>.js`

2. **Create the component file** following these rules exactly:
   - Extend `AppElement` (import from `../../core/app-element.js`, adjust path as needed)
   - If `gestures` were specified, also mix in `Gestures` from `modules/gestures/gestures.js`
   - `template()` returns a template literal with a `<style>` block first, then markup
   - All style values use CSS custom properties from the token system — no hardcoded values
   - `subscribe()` wires store subscriptions if this is a `page` component
   - `ui` components must have zero store imports — data comes from attributes/properties only
   - `service` components: no `template()` method, no shadow DOM
   - Register the custom element at the bottom: `customElements.define('<name>', ClassName)`

3. **Create the test file** at the same path with `.test.js` suffix:
   - Import the component
   - Write at minimum: a test that the element mounts without error, and one test per public property or method
   - Use Vitest + happy-dom
   - For `ui` components: no store mock needed — pass data via attributes directly

4. **Report** what was created and what tests still need real implementation detail from the developer.

## Component template (page tier example)

```js
import { AppElement } from '../../core/app-element.js';
import { Store } from '../../core/store.js';

class ScoreCard extends AppElement {
  subscribe() {
    Store.subscribe('scores', scores => {
      this.shadowRoot.querySelector('.score').textContent = scores.current;
    });
  }

  template() {
    return `
      <style>
        :host { display: block; padding: var(--space-md); }
      </style>
      <div class="score"></div>
    `;
  }
}

customElements.define('score-card', ScoreCard);
```
