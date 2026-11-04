# Sharing code across several apps

## Contents

- [The `socle/` specifier](#the-socle-specifier)
- [When you need this](#when-you-need-this)
- [Recommended layout](#recommended-layout)
- [What goes in the shared repo](#what-goes-in-the-shared-repo)
- [Linking the shared repo](#linking-the-shared-repo)
- [Three rules](#three-rules)
- [Event vocabulary as a wire protocol](#event-vocabulary-as-a-wire-protocol)

---

**Nothing here is enforced.** The library provides one mechanism — the `socle/` specifier — and the rest of this document is a recommendation based on a real multi-app build. Socle is a PWA generator, not a monorepo tool; it has no opinion it can enforce about how you lay out several apps. If your situation differs, ignore the layout advice and keep the specifier.

---

## The `socle/` specifier

`socle/` is the library's stable address. It resolves to your project's `_lib/` directory from anywhere:

```js
import { AppElement } from 'socle/core/app-element.js';
import { Gestures }   from 'socle/modules/gestures/gestures.js';
```

It is wired in two places, both shipped by the library:

- `utils/build.js` — an esbuild `alias`, library-owned, replaced on every `socle update`
- `vitest.config.js` — the matching `resolve.alias`, app-owned, scaffolded once

Relative imports (`../../_lib/core/app-element.js`) keep working everywhere. The alias is additive — adopt it where it helps and leave the rest alone.

> **`vitest.config.js` is app-owned**, so `socle update` cannot add the alias to an existing project. If you scaffolded before 1.4.0, `socle update` prints the four lines to add. A missing Vitest alias fails as `Cannot find package 'socle'` in tests while the build still succeeds.

A `jsconfig.json` mapping `socle/*` to `./_lib/*` ships with the scaffold so editors resolve the specifier too. Without it the build and tests still pass, but every `socle/` import shows as an unresolved module in VS Code.

Do not use `socle/` inside `_lib/` itself. Library code imports relatively, because `_lib/` must resolve with no build configuration at all — the scaffolded app's Vitest loads `_lib/**/*.test.js` directly.

---

## When you need this

For code inside `app/`, relative imports work at any depth and the alias is only tidiness.

You need `socle/` when code lives **outside the app tree** — a shared component repo used by several apps. A relative specifier encodes the importer's depth, so `../../core/app-element.js` only resolves from a directory exactly two levels below one containing `core/`. From a shared repo symlinked in, the path resolves against the file's real location and lands outside the app entirely:

```
_lib/shared/touch-target.js  + ../../core/  ->  _lib/core/   resolves
shared/touch-target.js       + ../../core/  ->  core/        does not
```

The `socle/` specifier removes the depth assumption, so the same file resolves wherever it is mounted.

---

## Recommended layout

For several apps sharing domain code:

```
my-apps/
  shared/                   # own repo — components and domain logic
  app-a/
    _lib/                   # library-owned, replaced by socle update
    app/
      shared/               # submodule or symlink -> ../../shared
      pages/
      store/
    utils/
  app-b/
  app-c/
```

**Never put shared code in `_lib/`.** That directory is library-owned and `socle update` overwrites it without warning. `app/` is developer-owned and never touched — shared code belongs there.

---

## What goes in the shared repo

Separate the shared concerns by dependency profile rather than treating "shared components" as one thing:

```
shared/
  vocabulary/
    events.js          # event type constants and payload shapes. Zero imports.
  domain/
    thing.js           # pure fold functions: applyThingEvent(thing, event) -> thing
  components/
    thing-capture.js   # AppElement subclass. Properties in, events out. No store.
  strings/
    en.js              # domain strings for t()
```

**`vocabulary/`** is the contract every app agrees on. Event type constants and payload shapes, with no imports at all — not even Socle. It is the smallest and most important part.

**`domain/`** holds pure functions, not a shared reducer. Apps share *how* an event folds into an entity, not *where* that entity lives in state. Export `applyThingEvent(thing, event)` and let each app's `reducer.js` place the result in its own shape. A monolithic shared reducer forces every app into one state tree and you will be fighting it within a month.

**`components/`** may contain **only store-agnostic UI components** — properties in, `CustomEvent`s out with `{ bubbles: true, composed: true }`, zero store knowledge. This is the rule that makes shared UI survive more than one app: a shared component that reads a store is coupled to every app's state shape, while one that takes a property and emits an event can be wired differently in each. The enforcement is free — shared component tests must pass with no store booted.

Pages, routes, `manifest.json`, store boot, and theming stay per-app.

---

## Linking the shared repo

| | Submodule | Symlink | Vendored copy |
|---|---|---|---|
| Clean single-repo clone | yes | **no — dangles** | yes |
| CI needs no special layout | yes | no | yes |
| Version is explicit | yes (pinned SHA) | no | no |
| Test coverage attributes correctly | yes | **no** | yes |
| Live editing across apps | one command | instant | sync step |
| Needs `socle/` | yes | yes | no |

**A committed symlink is stored as its target path**, so a checkout of one app alone produces a dangling link unless the build host reproduces the exact parent layout. That makes the symlink a good choice while co-developing locally and a poor one in CI.

**Test coverage silently mis-attributes symlinked code.** V8 reports execution against each file's *real* path. A symlink resolves outside the project root, so that data never reconciles with the project-relative entry in the report. The shared files then score **0% despite being fully tested**, or disappear from the report altogether if `coverage.all` and `include` never statically discovered them. Which of the two you get depends on your coverage config; both are wrong and neither warns you. Measured on a fixture — identical code and identical tests:

```
app/shared via symlink     fold.js    0%   ← fully tested
app/shared as a real dir   fold.js   33%   ← correct
```

There is no good workaround while the directory is a symlink; the fix is to make it a real directory. Treat this as the third and quietest argument for the submodule — a coverage threshold will pass or fail for reasons unrelated to your tests. Reported by a consuming app that lost roughly 1,500 lines from its headline number this way.

**Recommended: a git submodule at `app/shared/`.** Put `branch = main` in `.gitmodules`, edit inside `app/shared/` in whichever app you are working in — it is a real checkout — commit there, then `git submodule update --remote` in the others. One command to pull, one commit to publish.

A vendored copy plus a sync script also works and needs no `socle/` alias, since the copy lands inside the app tree at a fixed depth. Its weakness is that staleness is silent, which matters most for `vocabulary/` — a drifted copy of event constants is a protocol bug that surfaces days later in a different app as data quietly not appearing. A submodule's pointer at least makes the version answerable from git.

Because `socle/` is depth-independent, switching between these layouts never changes an import. Pick one and revisit it when CI or release pressure tells you to.

---

## Three rules

**1. The shared layer gets the same one-way dependency rule as `_lib/`.**

```
app/  ->  app/shared/  ->  socle/
```

Never backwards. If the shared layer imports from an app, it is no longer shareable and the third app is where you find out. [`library_tests/lib-boundary.test.js`](../library_tests/lib-boundary.test.js) is almost directly reusable — the same check with a different root.

**2. Vocabulary changes are additive only.** Never rename or repurpose an event type. Events are immutable and replayed forever, so changing what `thing:created` means silently reinterprets all history, in every app, with no error. Add a new type and leave the old handler in place permanently.

**3. Shared components use `t()`, not literal strings.** Ship `strings/en.js` from the shared repo and register it in each app's `app/strings.js`. Hardcoded strings in the shared layer are unfixable in every app at once.

---

## Event vocabulary as a wire protocol

Once several apps exchange event-log slices, the shared vocabulary stops being internal code and becomes a protocol between independently deployed clients. App A ships today, app B in three weeks, and they exchange events the whole time.

Socle handles that skew losslessly, by design:

- A reducer's `default: return state` ignores unknown event types rather than throwing
- `importEvents` writes events **verbatim**, with no filtering by known type, so an app stores and re-shares events it cannot interpret
- State is recomputed by full replay on boot, with no materialised views

So an app can receive an event type it has never heard of, store it, ignore it for state, pass it on intact — and the day you ship a reducer that understands it, the next boot replays the log and interprets it retroactively. No migration, no data loss, and **no need for lockstep releases across apps.**

Keep `default: return state` in every reducer, and never throw on an unknown type.

Snapshots, when they arrive, are a local performance cache and must never travel with the data. Each app's reducer computes a different state shape, so another device's snapshot is meaningless — and transmitting derived state alongside the log creates a second source of truth competing with it.

---

See also: [architecture.md](architecture.md) for the `_lib/` boundary, [updating.md](updating.md) for what `socle update` replaces.
