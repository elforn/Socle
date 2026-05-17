# /scope

Analyse a feature request before any code is written.
Run this before starting any non-trivial new feature. Do not write code — report only.

## Usage
/scope "<feature description>"

Example: `/scope "add a calendar view for scheduling matches"`

## What to do

Evaluate the request against each dimension below. Be direct and specific — this is a decision-making tool, not a rubber stamp.

---

### 1. Library vs app-specific

Is this a general-purpose capability useful across many apps, or is it specific to one app's domain?

- **Library candidate** (goes in `_lib/`): routing, gesture primitives, store patterns, SW update flow, IDB schema conventions, export/import format
- **App-specific** (goes in `app/`): a calendar for scheduling matches, a leaderboard display, a specific score input widget

If app-specific: recommend implementing it in the reference app's `app/` layer, not in `_lib/`. Note whether it would be a useful *example* of library patterns in action.

If it belongs in `_lib/`, confirm it can be implemented with zero imports from `app/`. If it needs to know anything about the app to function, it does not belong in `_lib/`.

---

### 2. Scope creep test

Does this add surface area that contradicts the core principles in CLAUDE.md?

Check explicitly:
- Does it require a library or external dependency?
- Does it add backend-like behaviour (user accounts, remote storage, authentication)?
- Does it add UI complexity beyond what mobile-first interactions require?
- Is it a "nice to have" that solves a problem the user doesn't have yet?
- Is it a tuning option or fallback for a limitation that has not caused an observed problem? (Example: adding a configurable version-check interval when the browser's 24h check has never caused a real issue.) If no user-visible problem exists, the feature does not exist yet.
- Does it increase the total codebase size significantly for marginal gain?

If any of these are yes, flag it clearly. Do not soften the finding.

---

### 3. Complexity cost

Estimate honestly:
- How many new files would this add?
- Does it touch core modules (store, IDB, router, SW) or stay contained?
- Does it introduce a new dependency on any other module?
- Does it require new test infrastructure?
- If it modifies existing `_lib/` files: does it change any public API (method signatures, event names, attribute names)? If yes before 1.0, flag as a breaking change that requires a migration note. If yes after 1.0, this needs explicit approval — it cannot ship without a major version bump.

Rate the cost: **Low / Medium / High**

---

### 4. Alternatives

Is there a simpler way to achieve the user's actual goal without building this feature?

Examples of good alternatives:
- "Instead of a calendar view, the reference app could show a sortable list of matches — same data, 10% of the complexity"
- "Instead of a new animation system, the drag menu gesture covers this interaction pattern"
- "This could be a user-side convention documented in the docs rather than enforced by the library"

Always propose at least one alternative if the cost is Medium or High.

---

### 5. Verdict

One of four outcomes:

- **Build it in the library** — clearly general purpose, low-medium cost, consistent with principles
- **Build it in the reference app** — domain-specific but a good demonstration of library usage
- **Build a simpler version** — the goal is valid but the proposed implementation is over-engineered; describe the simpler version
- **Do not build** — out of scope, contradicts principles, or solves a problem that doesn't exist yet; explain clearly

The developer makes the final call. This command provides the analysis, not the decision.
