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
   - For IDB/Store modules: use happy-dom, mock or stub IDB where necessary — prefer the real implementation where possible
   - For the SW module: note what cannot be unit tested and flag it for Playwright E2E coverage instead

4. **Write the tests** using Vitest. Follow these rules:
   - Test file lives alongside the source file: `foo.js` → `foo.test.js`
   - Test descriptions are plain English statements of behaviour: `'emits an event when a new score is appended'` not `'test score append'`
   - No test should depend on another test's side effects — each test is fully isolated
   - Do not mock what you can run for real
   - If a behaviour cannot be tested without a full browser (gestures, SW, Pointer Events), write the test structure with a clear skip and a comment explaining what Playwright should cover instead

5. **Report** a summary: how many tests written, what is covered, what is explicitly deferred to E2E, and any gaps that need the developer's input (e.g. expected error messages, specific business logic values).
