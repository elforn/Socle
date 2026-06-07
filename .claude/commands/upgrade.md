# /upgrade

Implement migration handling for the upcoming library release.

Run this after all features for the release are complete, before `/docs changelog` and `/commit`.

---

## What to do

### Step 1 — Establish the release delta

Find the last release tag and read the version being released:

```
git describe --tags --abbrev=0
git diff <last-tag>..HEAD --name-only -- core/ modules/ scaffold/ cli/
```

Also read `package.json` for the new version number.

### Step 2 — Identify app-breaking changes

For each changed file in `core/` and `modules/`, decide whether app developers need to take action. Focus on:

- Removed or renamed exports — any import path or function name an `app/` file uses that no longer exists
- Changed public API signatures (`boot`, `dispatch`, `setState`, `navigate`, etc.)
- New required calls that must appear in `app/main.js` for the library to work
- CSS token renames in `core/styles/tokens.css`
- File paths in `_lib/` that app code imports directly

Changes internal to `_lib/` that `app/` never touches do not require migration steps.

### Step 3 — Classify each impactful change

**Automatable** — the CLI can apply this safely without understanding app logic:
- Renaming a CSS token → regex patch
- Deleting a file removed from the library
- Re-applying a structural file rename (like store-simple → store.js)
- Updating an import path in a known scaffold file

**Manual** — requires the developer to understand their own app:
- Adding a new required call to `app/main.js`
- Updating a reducer for a changed event shape
- Replacing a renamed export across app components

### Step 4 — Extend `updateLib()` in `cli/index.js`

Read the `updateLib()` function. Add a version-gated block after the `_lib/core` copy and module updates. Use this utility for the version check if it does not already exist in the file:

```js
function _semverLt(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] < pb[i]) return true;
    if (pa[i] > pb[i]) return false;
  }
  return false;
}
```

Migration block pattern:

```js
// ── version migrations ────────────────────────────────────────────────────────
const manualSteps = [];

if (_semverLt(current.version, 'X.Y.Z')) {
  // automated: <what this does and why>
  // ... apply the change ...

  // manual (add only if app code must change):
  // manualSteps.push('<clear, actionable instruction>');
}

if (manualSteps.length) {
  console.log('\nManual steps required in your app/:');
  manualSteps.forEach((step, i) => console.log(`  ${i + 1}. ${step}`));
  console.log('');
}
```

If there are no app-breaking changes, add a comment only:

```js
// v X.Y.Z — no app-layer migration required
```

The manual steps block must appear before the "Done" message at the end of `updateLib()`.

### Step 5 — Write a test for each automated migration

In `cli/index.test.js`, add a test in the `updateLib` describe block:
- Scaffold an app at an old version (`lv.version = '0.0.1'` is fine if the block gates on `< X.Y.Z`)
- Run `updateLib()`
- Assert the automated change was applied (file exists / does not exist / content matches)

### Step 6 — Report

- Every automated migration written, with a one-line description of what it does
- Every manual step that will be printed to the developer, with the exact wording
- Test cases added
- Whether there are zero migration steps (state this explicitly)
