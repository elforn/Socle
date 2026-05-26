# /test

Write or complete tests for a given file or module.

## Usage
/test <filepath>

Example: `/test core/store.js`

## What to do

1. **Read the target file in full.** Understand every exported function, class, and behaviour.

2. **Read the existing test file** if one exists (same path, `.test.js` suffix). Identify what is already covered and what is missing.

3. **Identify what must be tested:**
   - Every exported function with at least one happy-path test
   - Every known edge case (empty input, missing keys, concurrent writes)
   - Every error condition that should throw or fail loudly
   - For Web Components: mount, attribute reflection, event emission, store isolation (ui components only)
   - For IDB/Store modules: use `fake-indexeddb` (loaded globally via `core/test-setup.js`) — never mock IDB, run against the real API. `happy-dom` is for DOM access only; pure IDB/Store tests run in Node without it. Only add `// @vitest-environment happy-dom` if the test actually uses `document`, `customElements`, or Shadow DOM.
   - For the SW module: note what cannot be unit tested and flag it for Playwright E2E coverage instead
   - For components using the `Gestures` mixin: mock pointer capture at module scope before importing the component. `happy-dom` does not implement these methods and the mixin calls them unconditionally:
     ```js
     HTMLElement.prototype.setPointerCapture = () => {};
     HTMLElement.prototype.releasePointerCapture = () => {};
     ```
   - For components that update the DOM in response to store callbacks: use `vi.waitFor(() => expect(...))` rather than asserting synchronously — store callbacks fire asynchronously after `dispatch()` and synchronous assertions will see stale DOM

4. **Write the unit tests** using Vitest. Follow these rules:
   - Test file lives alongside the source file: `foo.js` → `foo.test.js`. Exception: library infrastructure tests live in `tests/` at monorepo root (scaffold-parity, lib-boundary, etc.) — these are not co-located because they test the library as a whole, not a single module.
   - Test descriptions are plain English statements of behaviour: `'emits an event when a new score is appended'` not `'test score append'`
   - No test should depend on another test's side effects — each test is fully isolated
   - Do not mock what you can run for real
   - If a behaviour cannot be tested without a full browser (gestures, SW, Pointer Events), write the test structure with a clear skip and a comment explaining what Playwright should cover instead

5. **Identify what needs E2E coverage.** After writing unit tests, check for behaviours that require a real browser and cannot be unit-tested with `happy-dom`:
   - State that persists to IDB and must survive a full page reload
   - Gestures via real pointer events (the Gestures mixin wires up to `pointerdown`/`pointermove`/`pointerup` — `happy-dom` does not fire these correctly)
   - File input / camera / device APIs
   - Shadow DOM state changes that depend on the full Store → IDB → reload → replay cycle
   - Visual interactions that span multiple components across shadow boundaries

   **E2E test file location:** `reference-app/tests/e2e/<feature-name>.spec.js`

   **Standard patterns to follow in Playwright tests:**

   Shadow DOM traversal (components are nested behind shadow roots):
   ```js
   // Always use full traversal — querySelector('year-header') returns null
   document.querySelector('app-router').shadowRoot
     .querySelector('home-page').shadowRoot
     .querySelector('year-header').shadowRoot
     .querySelector('#some-button')
   ```

   Wait for the app to be ready before acting:
   ```js
   await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
   await page.waitForFunction(() =>
     !!document.querySelector('app-router')?.shadowRoot?.querySelector('home-page')
   );
   ```

   Clicking inside shadow DOM without locators:
   ```js
   await page.evaluate((sel) => {
     document.querySelector('app-router').shadowRoot
       .querySelector('home-page').shadowRoot
       .querySelector(sel).click();
   }, '#my-button');
   ```

   For real pointer events needed by the Gestures mixin (tap, swipe, hold-drag), use `page.mouse` with bounding box coordinates:
   ```js
   const box = await page.evaluate(() => {
     return document.querySelector('app-router').shadowRoot
       .querySelector('home-page').shadowRoot
       .querySelector('goal-item').shadowRoot
       .querySelector('.bar').getBoundingClientRect();
   });
   await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
   ```

   Cleanup in `afterEach` for tests that write data — use `page.evaluate()` to clear localStorage or dispatch undo events rather than leaving state that pollutes subsequent tests.

   For PWA-specific E2E scenarios (offline, SW update flow, install), use the `/test-pwa` skill instead — it has dedicated templates for those.

6. **Report** a summary: how many unit tests written, what is covered, what E2E tests were written, what is explicitly deferred to E2E but not yet written, and any gaps that need the developer's input (e.g. expected error messages, specific business logic values).
