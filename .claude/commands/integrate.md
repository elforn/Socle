# /integrate

Validate that a new library feature is properly demonstrated in the reference app.
A feature is not complete until this passes.

## Usage
/integrate <feature-name>

Example: `/integrate gesture-swipe`

## What to do

A library feature has two definitions of "done":
1. The module works in isolation (covered by `/test`)
2. It is used meaningfully in the reference app under real conditions

This command checks and enforces the second definition.

### Step 1 — Locate the library feature
Find the relevant files in `core/` or `modules/`. Understand what the feature does and what a realistic usage looks like.

### Step 2 — Check reference app usage
Search `reference-app/` for any import or usage of the feature.

If **no usage exists**: do not invent a trivial usage (a button that logs to console is not a demonstration). Instead:
- Identify where in the reference app this feature would naturally appear given its purpose
- Propose the specific component and user interaction it should power
- Ask the developer to confirm before implementing

If **usage exists but is superficial** (feature is imported but not meaningfully exercised):
- Note exactly what is superficial about it
- Propose what a meaningful demonstration looks like
- Ask to confirm before changing anything

### Step 3 — Implement the integration
Once confirmed, implement the reference app usage:
- Follow all component standards (correct tier, store isolation rules, token-based styles)
- The usage must reflect a real scenario from the reference app domain
- No dummy data — use the Store and IDB layer as a real app would

### Step 4 — Add an E2E test
In `e2e/`, add a Playwright test that:
- Exercises the feature through the UI as a user would
- Asserts the observable outcome (UI change, data persisted, navigation occurred, etc.)
- Is named clearly: `<feature-name>.spec.js`

### Step 5 — Report
Confirm:
- [ ] Feature used in reference app in a meaningful, domain-appropriate way
- [ ] E2E test written and passing
- [ ] No library code was changed during integration (if it was, flag it — integration should not require hacking the library)

If the integration revealed that the library API was awkward to use, report that as a finding for the developer to consider — do not silently work around it.
