# Testing

Every scaffolded Socle project comes with a working Vitest and Playwright setup. This guide explains what you get, how the test environments work, and how to write tests for your own components.

## Contents

- [Three tiers of tests](#three-tiers-of-tests)
- [What you get out of the box](#what-you-get-out-of-the-box)
- [Vitest environments](#vitest-environments)
- [fake-indexeddb](#fake-indexeddb)
- [Pointer capture mocks](#pointer-capture-mocks)
- [Async DOM assertions](#async-dom-assertions)
- [Testing a component](#testing-a-component)
- [Testing store integration in a page component](#testing-store-integration-in-a-page-component)
- [Running tests](#running-tests)
- [Test file locations](#test-file-locations)

---

## Three tiers of tests

Socle uses three distinct test scopes. It is worth understanding each one, because they answer different questions and run in different contexts.

### Library tests *(library development only)*

Co-located `*.test.js` files next to source in `core/` and `modules/`, plus `library_tests/` at the monorepo root. These are run by people contributing to the library itself — they are not shipped to scaffolded apps.

`library_tests/` contains automated consistency checks: scaffold-parity (reference app matches scaffold structure), lib-boundary (no `_lib/` file imports from `app/`), CSS logical properties, and token placeholder coverage.

### Reference app tests *(library development only)*

`reference-app/tests/` proves every library feature works end-to-end in a real app. They use the same Vitest and Playwright setup that app developers get, and serve as authoritative examples of correct test patterns.

### Scaffolded app tests *(yours, to extend)*

`tests/unit/` and `tests/e2e/` in your project. These are working templates delivered by the CLI — the infrastructure is already configured and some tests run immediately. You extend them with tests for your own domain.

---

## What you get out of the box

### Unit tests

| File | What it covers | Runs as-is? |
|------|---------------|------------|
| `tests/unit/build.test.js` | Build output — hashing, SW injection, path rewrites, BASE_PATH | ✅ yes |
| `tests/unit/store.test.js` | Store boot, persist, subscribe — sparse template with commented examples | ⚠️ passes, extend it |

### E2E tests (Playwright)

| File | What it covers | Runs as-is? |
|------|---------------|------------|
| `tests/e2e/offline.spec.js` | App loads from cache offline; data can be written offline | ✅ yes |
| `tests/e2e/navigation.spec.js` | Forward nav, back nav, hard-refresh at non-root URL | ✅ yes |
| `tests/e2e/update-flow.spec.js` | Update banner show/dismiss/reload | ✅ yes |
| `tests/e2e/persistence.spec.js` | Count and accumulation persist across reload — template for domain assertions | ✅ yes + extend |
| `tests/e2e/install.spec.js` | Manual PWA install checklist | ✅ reference before each release |

---

## Vitest environments

Vitest can run tests in two environments. Choose the right one — using `happy-dom` when you do not need it adds overhead and can mask bugs.

### Node (default)

Pure logic with no DOM. Use for store integration tests, reducer tests, IDB tests, and any utility code.

```js
// No annotation needed — Node is the default
import { describe, it, expect, beforeEach } from 'vitest';
import { boot, dispatch, getState, reset } from '../../_lib/core/store/store.js';
import { reducer } from '../../app/store/reducer.js';
```

### happy-dom

Add `// @vitest-environment happy-dom` at the very top of the file (before imports) when your test needs `document`, `customElements`, or Shadow DOM.

```js
// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../../app/components/my-card/my-card.js';
```

Do not add the annotation just in case. If the test does not touch the DOM directly, it does not need it.

---

## fake-indexeddb

IDB tests run in Node against `fake-indexeddb` — no mocking, no stubs. The global `indexedDB` is provided automatically by `core/test-setup.js`, which is loaded via `setupFiles` in `vitest.config.js`. You never configure this yourself.

Always call `reset()` in `beforeEach` to start each test with a clean in-memory IDB:

```js
import { boot, dispatch, reset } from '../../_lib/core/store/store.js';
import { reducer } from '../../app/store/reducer.js';

let seq = 0;
function freshName() { return `my-app-${seq++}`; }

beforeEach(() => reset());

it('boots with empty state', async () => {
  await boot({ dbName: freshName(), reducer });
  expect(getState()).toEqual({});
});
```

Use a fresh `dbName` for each test that calls `boot()` — IDB databases are isolated by name.

---

## Pointer capture mocks

`happy-dom` does not implement `setPointerCapture` or `releasePointerCapture`. Any test file that mounts a component using the `Gestures` mixin must add these no-ops at module scope, before any imports that register the component:

```js
// At the top of your test file — before component imports
HTMLElement.prototype.setPointerCapture = () => {};
HTMLElement.prototype.releasePointerCapture = () => {};

import '../../app/components/my-card/my-card.js';
```

Do not add these to `core/test-setup.js` — they belong only in test files that mount gesture-enabled components.

---

## Async DOM assertions

Store callbacks fire asynchronously after `dispatch()`. Do not assert DOM state synchronously after a dispatch — the update has not happened yet.

```js
// ❌ fails — store callback fires async
await dispatch('item:added', { title: 'Test' });
expect(el.shadowRoot.querySelector('#count').textContent).toBe('1');

// ✅ correct — wait for the DOM to update
await dispatch('item:added', { title: 'Test' });
await vi.waitFor(() =>
  expect(el.shadowRoot.querySelector('#count').textContent).toBe('1')
);
```

`vi.waitFor` retries the assertion on a short interval until it passes or times out.

---

## Testing a component

Here is the pattern for a UI component unit test:

```js
// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import '../../app/components/my-card/my-card.js';

function mount(props) {
  const el = document.createElement('my-card');
  if (props) Object.assign(el, props);
  document.body.appendChild(el);
  return el;
}

afterEach(() => { document.body.innerHTML = ''; });

describe('my-card — rendering', () => {
  it('renders a title', () => {
    const el = mount({ title: 'Hello' });
    expect(el.shadowRoot.querySelector('.title').textContent).toBe('Hello');
  });
});

describe('my-card — events', () => {
  it('dispatches item-selected on tap', () => {
    const el = mount({ item: { id: '1' } });
    let detail = null;
    document.body.addEventListener('item-selected', e => { detail = e.detail; });
    el.onTap();
    expect(detail).toEqual({ id: '1' });
  });
});
```

For components with gesture support, add the pointer capture mocks before the import.

---

## Testing store integration in a page component

Page components subscribe to the store. Test them with a real `boot()` call, not a mock:

```js
// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { boot, dispatch, reset } from '../../_lib/core/store/store.js';
import { reducer } from '../../app/store/reducer.js';
import '../../app/pages/home-page.js';

let seq = 0;
beforeEach(() => reset());
afterEach(() => { document.body.innerHTML = ''; });

it('count updates when an item is added', async () => {
  await boot({ dbName: `test-${seq++}`, reducer });
  const el = document.createElement('home-page');
  document.body.appendChild(el);
  await dispatch('item:added', { title: 'Test' });
  await vi.waitFor(() =>
    expect(el.shadowRoot.querySelector('#count').textContent).toBe('1')
  );
});
```

---

## Running tests

```bash
npm test               # unit + E2E — full test suite
npm run test:unit      # Vitest only, single run
npm run test:watch     # Vitest, watch mode — re-runs on file change
npm run test:e2e       # Playwright only — builds and serves automatically
```

`test:e2e` uses Playwright's `webServer` config to build the app and start a server before running — no separate terminal needed. `npm test` runs unit tests first, then E2E.

---

## Test file locations

Test files live next to the source they test:

```
app/
  components/
    my-card/
      my-card.js
      my-card.test.js    ← co-located
  pages/
    home-page.js
tests/
  unit/
    home-page.test.js    ← or in tests/unit/ for page-level tests
  e2e/
    persistence.spec.js
```

Either location is fine. Co-locating is convenient for UI components; `tests/unit/` is common for page-level integration tests that boot the store.

---

[← Gestures](gestures.md) · [Docs](https://github.com/magp/Socle/blob/main/README.md#docs) · [Next: Claude Code →](claude.md)
