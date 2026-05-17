# /status

Report the current build phase status and what should be worked on next.

## What to do

Check the file system against the build order defined in CLAUDE.md and report:

### Build phases (in order)

1. **Monorepo scaffolding + build script + reference app shell**
   - Check: `package.json`, `core/sw.js`, `scaffold/` directory structure
   - Check: `reference-app/utils/build.js`, `reference-app/index.html`, `reference-app/manifest.json`
   - Check: `reference-app/_lib/core` and `reference-app/_lib/modules` symlinks exist
   - Check: `reference-app/app/main.js`, `reference-app/tests/unit/`, `reference-app/tests/e2e/`

2. **AppElement + Shadow DOM + CSS token system**
   - Check: `core/app-element.js`, `core/styles/tokens.css`, `core/styles/base.js` (adoptedStyleSheets)
   - Check: `core/app-element.test.js`

3. **Router**
   - Check: `core/router/router.js`, `core/router/app-router.js`, SW navigation intercept in `sw.js`
   - Check: `core/router/router.test.js`, Playwright navigation test

4. **Store + IDB layer**
   - Check: `core/store/store.js`, `core/idb/idb.js`, `core/idb/migrations.js`
   - Check: corresponding test files

5. **SW lifecycle + update flow**
   - Check: `core/sw-manager/sw-manager.js`, `core/components/update-banner/update-banner.js`
   - Check: `version.json` generation in build script

6. **Gesture library**
   - Check: `modules/gestures/gestures.js`, registered gestures (tap, longPress, swipe, leaveTouchToSelect, drag, dragMenu)
   - Check: `modules/gestures/gestures.test.js`

7. **Reference app features**
   - Check: reference-app pages, components using the library, Playwright E2E tests

8. **CLI scaffolding tool**
   - Check: `cli/index.js`, prompts for module selection

9. **P2P module (V2)**
   - Check: `modules/p2p/` — expected to not exist yet

### Output format

For each phase, report one of:
- ✅ Complete — key files present and tests exist
- 🔄 In progress — partially implemented, note what's missing
- ⬜ Not started

Then state clearly: **"Current phase: X — recommended next step: [specific task]"**

Do not start any work. Report only.
