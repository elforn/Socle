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
   - Check: `core/strings.js` (t/defineStrings registry)
   - Check: `core/sw-manager/sw-manager.js`, `core/components/update-banner/update-banner.js`
   - Check: `version.json` generation in build script
   - Check: `reference-app/app/strings.js` (English defaults, first import in `app/main.js`)
   - Check: `reference-app/tests/e2e/offline.spec.js`, `update-flow.spec.js`, `install.spec.js`

6. **Gesture library**
   - Check: `modules/gestures/gestures.js`, implemented gestures: tap, longPress, swipe (`onSwipe`/`onSwipeMove`), holdDrag (`onHoldDragStart`/`onHoldDrag`/`onHoldDragEnd`), `Gestures.attach` static method
   - Check: `modules/gestures/gestures.test.js`

7. **Reference app features (YourYear)**
   - Check: `reference-app/app/pages/year-redirect.js`, `home-page.js`, `not-found-page.js`
   - Check: `reference-app/app/components/goal-item/`, `goal-dialog/`, `year-header/`
   - Check: `reference-app/app/store/reducer.js` handles `goal:title-set`, `goal:progress-set`, `goal:deleted`, `milestone:title-set`, `milestone:progress-set`, `milestone:deleted`, `wow:title-set`, `wow:progress-set`, `wow:deleted`, `year:image-set`, `year:image-removed`
   - Check: `reference-app/app/strings.js` (all string keys), `reference-app/app/locales/fr.js`, `reference-app/app/locales/ca.js` (key parity)
   - Check: `core/strings.js` exports `t`, `defineStrings`, `setLocale`, `getLocale`, `reset`
   - Check: `reference-app/tests/e2e/goals.spec.js` covers creation, deletion (swipe + dialog), progress, fail/restore
   - Check: `reference-app/tests/e2e/persistence.spec.js` covers goal title and progress
   - Check: `reference-app/tests/e2e/navigation.spec.js` covers year routing and scroll compression
   - Check: `reference-app/tests/e2e/i18n.spec.js` covers locale switching (FR, CA), persistence, reset
   - Check: `reference-app/tests/e2e/year-photo.spec.js` covers upload, menu state, persistence, remove, year scoping
   - Check: `reference-app/app/icons/icon.svg` exists (PWA installability prerequisite)
   - Check: `reference-app/manifest.json` has non-empty `icons` array, `scope`, `theme_color`, `background_color`
   - Check: `reference-app/tests/e2e/install.spec.js` has automated Playwright tests (not just a skipped test)

8. **CLI scaffolding tool**
   - Check: `cli/index.js` exists — `npx socle <app-name>` scaffold command
   - Check: `cli/index.js` — `npx socle update` command present
   - Check: `cli/index.test.js` exists with unit and integration tests
   - Check: root `package.json` has `bin: { "socle": "./cli/index.js" }`

9. **Scaffolded App — deployed reference app showcasing all library features**
   - Check: sync module integrated in reference app (`year-header.js` imports from `_lib/modules/sync/`)
   - Check: toast module integrated in reference app (`home-page.js` imports from `_lib/modules/toast/`)
   - Check: `reference-app/tests/e2e/sync.spec.js` covers export/import flow
   - Check: `reference-app/tests/e2e/toast.spec.js` covers toast notifications
   - Check: `reference-app/.github/workflows/deploy.yml` exists (GitHub Pages deploy)

10. **Simple webpage for the library**
    - Check: `site/` directory with `index.html` — library landing page

11. **Simple store**
    - Check: `core/store/store-simple.js` or equivalent — expected to not exist yet

12. **P2P module (V2)**
    - Check: `modules/p2p/` — expected to not exist yet

13. **Additional UI components (toast, lists, etc.)**
    - Check: `modules/toast/`, `modules/ui/` — expected to not exist yet or stub only

### Output format

For each phase, report one of:
- ✅ Complete — key files present and tests exist
- 🔄 In progress — partially implemented, note what's missing
- ⬜ Not started

Then state clearly: **"Current phase: X — recommended next step: [specific task]"**

Do not start any work. Report only.
