# Socle

Build Offline Mobile Apps — [elforn.github.io/Socle](https://elforn.github.io/Socle/)

A code generator for offline-first, mobile-first PWAs with no runtime dependencies.

You run the CLI, choose your modules, and get a project where you own every line of code. There is no package to install, no version to pin, no framework to fight. When the library updates, only the `_lib/` folder in your project changes.

## What you get

- Offline-first by default — Service Worker, caching strategy, and update flow included
- Append-only event log as the data model — audit trail, undo, and P2P sync readiness from day one
- Web Components throughout — Shadow DOM, adoptedStyleSheets, a reactive store, no virtual DOM
- History API router with SW navigation intercept — no hash URLs, no full reloads
- Gesture library — tap, long press, swipe, hold-drag, and more
- Toast notifications — action buttons, undo support, pause on hover/focus, swipe-to-dismiss
- Multilingual support — locale registry, `t()` helper, locale switching with persistence
- CSS token system — retheme any app by changing two variables
- Copy-into-project distribution — you own `_lib/`, update it on your terms

## Quick start

The CLI is not yet published to npm. Run it directly from GitHub:

```bash
npx github:elforn/socle my-app
```

The CLI prompts for your app name, short name, modules, and accent colour, then creates `./my-app/` with everything wired up. Your code lives in `app/`. The library lives in `_lib/` and is updated separately.

```
my-app/
  _lib/         ← library code, updated by `npx socle update`
  app/          ← your components, pages, and store
  utils/
    build.js
  index.html
```

```bash
cd my-app
npm install
node utils/build.js
npx serve dist --single
```

## Docs

- [Getting started](docs/getting-started.md) — scaffold, first component, deploy
- [Architecture](docs/architecture.md) — event sourcing, store, router, Service Worker
- [SW update flow](docs/sw-update-flow.md) — sw-manager, update banner, version.json, strings
- [Building components](docs/components.md) — AppElement, Shadow DOM, store integration
- [Gestures](docs/gestures.md) — gesture mixin, tap, long press, swipe, hold-drag, keyboard alternatives
- [Reorder](docs/reorder.md) — drag-to-reorder controller, cross-section drags, keyboard reorder
- [Toast](docs/toast.md) — ephemeral feedback messages, actions, top-layer popover
- [Testing](docs/testing.md) — test environments, fake-indexeddb, component test patterns, E2E setup
- [Claude Code](docs/claude.md) — slash commands, workflow, /setup-claude
- [Theming](docs/theming.md) — CSS tokens, custom properties, retheming
- [Accessibility](docs/a11y.md) — tiered accessibility approach
- [UI language](.claude/ui.md) — visual design system and interaction patterns

## Design decisions

**No runtime dependencies.** The generated project has no `node_modules` at runtime. The CLI is a generator, not a framework. This means no breaking upstream changes, no supply chain risk, and code you can read and modify without fighting abstractions.

**Append-only event log.** All data is stored as a sequence of events rather than mutable records. This gives you a full audit trail, natural undo, and a data model that can merge across devices without conflict resolution logic. The overhead is small; the benefits compound.

**Copy into project, not import.** When you scaffold a project, the library code is copied into `_lib/`. You own it. When the library updates, you run `npx socle update` and only `_lib/` changes — your `app/` code is never touched. No dependency graph, no peer dependency conflicts.

**Offline first, no backend.** The app works with no network after the first load. Data lives in IndexedDB. P2P sync over a local network is supported in the P2P module for multi-device use cases — no server required.

**Web Components.** Custom elements with Shadow DOM mean components are self-contained, style-isolated, and portable. No framework lock-in, no virtual DOM, no build-time JSX transform.

## Reference app

`reference-app/` in the monorepo is a yearly goals app that exercises every library feature: offline operation, event sourcing, gestures, routing, SW update flow, multilingual support, photo attachments, and data sync. It is not scaffolded by the CLI — it lives inside the library repository and its `_lib/` is a symlink to `core/` and `modules/`, so library changes are reflected immediately.

Every library feature must be exercised in the reference app before it is considered complete.

## Development

Clone the monorepo to work on the library or run the reference app:

```bash
git clone git@github.com:elforn/socle.git
cd Socle
npm install
```

```bash
npm run dev:https    # https://localhost:3000 + https://<LAN-IP>:3000
npm test             # unit + E2E — full test suite
npm run test:unit    # unit tests only (library, CLI, reference-app)
npm run test:e2e     # Playwright E2E against the reference app
```

See [Getting started](docs/getting-started.md) for mobile testing and HTTPS cert setup.

## Browser support

Firefox and Chrome on Android and desktop. iOS Safari is not supported — users should install Firefox.

## Status

**Current version: 0.9.0** — see [CHANGELOG.md](CHANGELOG.md)

| Module | Status |
|--------|--------|
| Core — AppElement, Router, Store, IDB | ✅ Complete |
| SW lifecycle — offline caching, update flow, update banner | ✅ Complete |
| Claude Code integration — slash commands, /setup-claude | ✅ Complete |
| Gesture library — tap, long press, swipe, hold-drag, keyboard parity | ✅ Complete |
| Multilingual support — locale registry, t(), locale switching | ✅ Complete |
| Sync — binary export/import, event-log and simple store | ✅ Complete |
| CLI — scaffold, update, add/remove modules, cert wizard | ✅ Complete |
| Simple store — snapshot-based alternative to event-log store | ✅ Complete |
| Toast — action buttons, undo, swipe-to-dismiss, pause on hover/focus | ✅ Complete |
| Gesture library — drag-to-reorder | 📋 Planned |
| P2P sync | 📋 Planned V2 |

## Contributing

App developers can use the `/contribute` command (included in every scaffolded project) to package a component for contribution. It runs eligibility and quality checks, strips domain-specific code, and produces a `proposal.md` ready to attach to a GitHub issue.

Open an issue titled `Contribution: <component-name>` with the proposal attached. Accepted contributions are integrated as part of the next release.
