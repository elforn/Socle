# Socle

Free. Simple. Yours.

A code generator for offline-first, mobile-first PWAs with no runtime dependencies.

You run the CLI, choose your modules, and get a project where you own every line of code. There is no package to install, no version to pin, no framework to fight. When the library updates, only the `_lib/` folder in your project changes.

## What you get

- Offline-first by default — Service Worker, caching strategy, and update flow included
- Append-only event log as the data model — audit trail, undo, and P2P sync readiness from day one
- Web Components throughout — Shadow DOM, adoptedStyleSheets, a reactive store, no virtual DOM
- History API router with SW navigation intercept — no hash URLs, no full reloads
- Gesture library — tap, long press, swipe, drag, drag-to-complete, and more
- CSS token system — retheme any app by changing two variables
- Copy-into-project distribution — you own `_lib/`, update it on your terms

## Quick start

```bash
npx socle my-app
```

The CLI asks which modules you need, scaffolds a project into `./my-app`, and writes a `_lib/` folder you never edit directly. Your code lives in `app/`.

```
my-app/
  _lib/       ← library code, updated by CLI
  app/        ← your components, pages, and store
  index.html
  build.js
```

```bash
cd my-app
node build.js
# open index.html in Firefox or Chrome
```

## Docs

- [Getting started](docs/getting-started.md) — scaffold, first component, deploy
- [Architecture](docs/architecture.md) — event sourcing, store, router, Service Worker
- [Building components](docs/components.md) — AppElement, Shadow DOM, store integration
- [Gestures](docs/gestures.md) — gesture mixin API and interaction patterns
- [Theming](docs/theming.md) — CSS tokens, custom properties, retheming
- [Updating](docs/updating.md) — how `_lib/` updates work
- [Accessibility](docs/a11y.md) — tiered accessibility approach
- [UI language](.claude/ui.md) — visual design system and interaction patterns

## Design decisions

**No runtime dependencies.** The generated project has no `node_modules` at runtime. The CLI is a generator, not a framework. This means no breaking upstream changes, no supply chain risk, and code you can read and modify without fighting abstractions.

**Append-only event log.** All data is stored as a sequence of events rather than mutable records. This gives you a full audit trail, natural undo, and a data model that can merge across devices without conflict resolution logic. The overhead is small; the benefits compound.

**Copy into project, not import.** When you scaffold a project, the library code is copied into `_lib/`. You own it. When the library updates, you run `npx socle update` and only `_lib/` changes — your `app/` code is never touched. No dependency graph, no peer dependency conflicts.

**Offline first, no backend.** The app works with no network after the first load. Data lives in IndexedDB. P2P sync over a local network is supported in the P2P module for multi-device use cases — no server required.

**Web Components.** Custom elements with Shadow DOM mean components are self-contained, style-isolated, and portable. No framework lock-in, no virtual DOM, no build-time JSX transform.

## Reference apps

`reference-app/goals/` — a yearly goals app with lists of things to achieve. Demonstrates offline operation, event sourcing, gesture interactions, routing, and the SW update flow. Single-user, no P2P.

`reference-app/fencing/` — a fencing competition scoring app. Demonstrates P2P sync, domain ownership, hub mode, and long-session stability. Built after V2.

## Browser support

Firefox and Chrome on Android and desktop. iOS Safari is not supported — users should install Firefox.

## Status

**Current version:** see [CHANGELOG.md](CHANGELOG.md)

| Module | Status |
|--------|--------|
| Core (router, store, IDB, SW) | 🚧 In progress |
| Gesture library | 🚧 In progress |
| P2P sync | 📋 Planned V2 |
| Multilingual support | 📋 Planned V4 |

## Contributing

App developers can use the `/contribute` command (included in every scaffolded project) to package a component for contribution. It runs eligibility and quality checks, strips domain-specific code, and produces a `proposal.md` ready to attach to a GitHub issue.

Open an issue titled `Contribution: <component-name>` with the proposal attached. Accepted contributions are integrated as part of the next release.
