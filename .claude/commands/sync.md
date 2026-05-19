# /sync

Verify bidirectional consistency between the reference app and the scaffold.

There are two directions to check:

1. **reference-app → scaffold**: infrastructure changes built in the reference app must be ported to the scaffold template so new apps get the same patterns.
2. **scaffold → reference-app**: the reference app must continue to look like what a scaffolded app produces — it is the living example of a correctly generated project.

Both directions matter. A gap in either direction means the reference app and a newly scaffolded app would diverge.

## Usage
/sync

Run after completing a phase or feature in the reference app, before `/commit`.

---

## What to do

### Step 0 — Run the test suite first

Run `npm test` from the monorepo root before doing anything else. The `tests/scaffold-parity.test.js` suite will catch the most common structural mismatches automatically. Read the failures — they tell you exactly what is out of sync. Then continue with the manual steps below for anything not covered by the automated tests.

---

### Understand what belongs where

Not everything in the reference app belongs in the scaffold. Use this rule:

**Port to scaffold if the file is infrastructure** — it would be needed by any app built on this library, regardless of domain.
Examples: `utils/build.js`, `playwright.config.js`, page stubs, test templates, `index.html` shell, `package.json` scripts.

**Do not port if the file is domain-specific** — it belongs to the yearly goals app, the fencing app, or any specific product.
Examples: a `GoalPage` component, a `MatchScoreForm`, IDB schemas for specific event types, store actions for domain logic.

When in doubt, ask: "Would a developer building a completely different app (e.g. a tea journal) need this file as a starting point?" If yes, port it.

---

### Step 1 — Inventory the reference app

Scan `reference-app/` for all non-dist files. Group them:

| Category | Reference app path | Should scaffold have it? |
|----------|--------------------|--------------------------|
| Build script | `utils/build.js` | Yes — identical |
| HTML shell | `index.html` | Yes — with `%%TOKEN%%` placeholders |
| App entry | `app/main.js` | Yes — with `%%TOKEN%%` placeholders |
| Playwright config | `playwright.config.js` | Yes — identical |
| Package scripts + devDeps | `package.json` | Yes — `name` uses `%%APP_NAME%%` |
| Page stubs | `app/pages/*.js` | Yes — structural pages only, not domain pages |
| E2E tests | `tests/e2e/*.spec.js` | Yes — infrastructure tests (routing, SW, etc.), not domain flows |
| Unit tests | `tests/unit/*.test.js` | Yes — as templates (build test, component test structure) |
| Vitest config | `vitest.config.js` | Yes — if it exists in reference-app or is needed for unit tests |

### Step 2 — Compare each category

For each file that should be in the scaffold, check:

**a) Does the scaffold file exist?**
If no → report as MISSING.

**b) Are the scaffold and reference-app versions structurally equivalent?**
Compare logic, not literals. The scaffold may use `%%APP_NAME%%` where reference-app uses `'Socle Reference App'`. That is expected and correct.
If the scaffold version is missing new logic added to the reference-app version → report as STALE.

**c) Does the scaffold have the right token substitutions?**
Scaffold files must use `%%APP_NAME%%`, `%%LANG%%`, `%%MAIN_JS%%` etc. where the reference-app uses hardcoded values. Missing tokens mean the scaffolded app would inherit reference-app-specific values.

### Step 3 — Check package.json parity

Compare `reference-app/package.json` with `scaffold/package.json` to find what scaffolded apps need but may not have:
- Every devDependency a scaffolded app needs at runtime (e.g. `fake-indexeddb`, `happy-dom`, Playwright) should be in `scaffold/package.json`
- Every `scripts` entry relevant to a developer (build, test, test:e2e) should be present
- Version pins should match

### Step 4 — Check test template completeness

The scaffold's `tests/unit/` and `tests/e2e/` should give a new developer a working starting point:
- At least one working unit test template (e.g. `build.test.js`)
- At least one working e2e test (`navigation.spec.js`)
- The scaffold must have a `vitest.config.js` if unit tests exist

Tests in the scaffold do not need to pass when run from the library monorepo — they are templates copied into the user's project, where they will pass.

### Step 5 — Report

For each gap found, report:

```
MISSING   scaffold/tests/unit/build.test.js
          → reference-app has this, scaffold has only .gitkeep

STALE     scaffold/utils/build.js
          → missing steps 6 and 7 (copy _lib/ and app/ to dist)

TOKEN GAP scaffold/app/pages/home-page.js
          → hardcodes 'Socle Reference App' instead of '%%APP_NAME%%'

OK        scaffold/playwright.config.js
OK        scaffold/tests/e2e/navigation.spec.js
```

Then state: **"X gaps found. Recommend fixing before /commit."** or **"Scaffold is in sync with the reference app."**

Do not fix the gaps automatically. Report only, unless the developer asks you to fix them.
