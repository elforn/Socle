# Getting started

## Contents

- [Requirements](#requirements)
- [Scaffold a new app](#scaffold-a-new-app)
- [What you get](#what-you-get)
- [Build](#build)
- [Testing on a real device](#testing-on-a-real-device)
- [Deploy to GitHub Pages](#deploy-to-github-pages)
- [Make your app installable](#make-your-app-installable)
- [Write your first component](#write-your-first-component)
- [Add a page](#add-a-page)
- [Set up Claude Code](#set-up-claude-code)
- [Run the tests](#run-the-tests)
- [Update the library](#update-the-library)

---

## Requirements

- Node.js 20 or later (build script only — no Node at runtime)
- Firefox or Chrome on Android or desktop

iOS Safari is not supported. Direct users to install Firefox.

## Scaffold a new app

```bash
npx socle my-app
```

The CLI prompts for your app name and which optional modules to include, then creates `./my-app/` with everything wired up.

## What you get

```
my-app/
  _lib/                ← library code — never edit these files
    core/              ← AppElement, Router, Store, IDB, SW
    modules/           ← modules you selected (gestures, sync, etc.)
    lib-version.json   ← records the library version and installed modules
  app/
    components/        ← your Web Components
    pages/             ← your page components, one per route
    store/             ← your store actions and schema extensions
    main.js            ← app entry point
  tests/
    unit/              ← Vitest unit tests
    e2e/               ← Playwright E2E tests
  utils/
    build.js           ← build script, edit if you need custom behaviour
  .github/
    workflows/
      deploy.yml       ← deploys to GitHub Pages on push to main
  index.html
  manifest.json
  package.json
```

Your code lives in `app/`. Everything in `_lib/` is owned by the library and updated by `npx socle update`.

## Build

```bash
node utils/build.js
```

The build script:
- Hashes `app/main.js` and all static assets — filenames change when content changes
- Injects your app version into the built JS
- Generates `dist/sw.js` from the library's SW template with your asset list baked in
- Writes `dist/version.json` for the update-notification flow
- Processes `index.html` with the hashed asset filenames

Output goes to `dist/`. Serve `dist/` locally during development or let GitHub Actions do it on deploy.

## Testing on a real device

Service workers only register on HTTPS or `localhost`. If you test at `http://192.168.x.x:3000` from a phone, the SW silently fails to register and offline mode never works. Use a locally-trusted HTTPS cert instead.

### One-time setup

Run from your project root (requires [mkcert](https://github.com/FiloSottile/mkcert) — install it first with `brew install mkcert` or equivalent):

```bash
npx socle cert
```

This prompts for shared certs (`~/.socle-certs/`, reused across projects) or project-specific certs (generated in the current directory), then adds a `dev:https` script to your `package.json`. The Android CA walkthrough runs automatically if you enter a LAN IP.

New apps don't have `dev:https` by default — run `npx socle cert` once per project to opt in.

### Start the HTTPS dev server

```bash
npm run dev:https
```

The app is now at `https://localhost:3000` (desktop) and `https://192.168.1.x:3000` (mobile).

### Trust the CA on Android

Your Android device needs to trust the mkcert CA once:

1. Find the CA cert: `mkcert -CAROOT` — copy `rootCA.pem` to your device (AirDrop, USB, or temporarily serve it over HTTP)
2. On the device: Settings → Security → More security settings → Install a certificate → CA certificate → pick the file
3. Open `https://192.168.1.x:3000` — no cert warning means it's working

The SW will now register and the app will work offline after the first visit.

---

## Deploy to GitHub Pages

Push to `main`. The included `deploy.yml` workflow builds the app and deploys `dist/` to GitHub Pages automatically.

Before the first deploy, enable GitHub Pages in your repository settings: **Settings → Pages → Source → GitHub Actions**.

Your app will be live at `https://your-username.github.io/your-repo-name/`.

The build script automatically sets the correct base path in all asset URLs — no manual configuration needed.

## Make your app installable

For your app to be installable as a PWA, three things must be true: a valid `manifest.json` with an icon, a registered service worker, and HTTPS. The SW and HTTPS are handled automatically. The manifest needs your attention.

### Add an icon

Create `app/icons/icon.svg`. SVG is the best format — one file works at every size and scales cleanly to any device pixel ratio.

Design within the 80% maskable safe zone: keep all visual elements within a circle of radius 80% of the icon size, centred on the canvas. On Android, the launcher clips icons to a circle or squircle — anything outside this zone is cropped.

```xml
<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- background fill for maskable mode -->
  <rect width="512" height="512" fill="#1C1C1E"/>
  <!-- your icon shape — keep within a 410px centred circle (80% of 512) -->
  <path d="…" fill="none" stroke="#E8824A" stroke-width="44"/>
</svg>
```

### Update manifest.json

`manifest.json` ships in your project root. Fill in these fields before you consider the app releasable:

```json
{
  "name": "Your App Name",
  "short_name": "App",
  "description": "One sentence describing the app.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#1C1C1E",
  "theme_color": "#1C1C1E",
  "icons": [
    {
      "src": "app/icons/icon.svg",
      "sizes": "192x192",
      "type": "image/svg+xml",
      "purpose": "any maskable"
    },
    {
      "src": "app/icons/icon.svg",
      "sizes": "512x512",
      "type": "image/svg+xml",
      "purpose": "any maskable"
    }
  ]
}
```

`theme_color` controls the Android status bar colour when the app is installed. Set it to match your app's header or background. The same value goes in `index.html`:

```html
<meta name="theme-color" content="#1C1C1E">
```

For GitHub Pages deployments, `scope` should match `BASE_PATH` (e.g. `"/my-repo/"`). The scaffold sets this automatically via the `%%BASE_PATH%%` token.

### Verify installability

The included `tests/e2e/install.spec.js` runs three automated checks: manifest reachable with required fields, icon URL resolves, and SW registration state is valid. Run them with:

```bash
npm run test:e2e
```

For the install prompt itself (the browser's "Add to home screen" offer), use DevTools → Application → Manifest to confirm there are no errors, then open the app twice in Chrome — the install icon appears in the address bar on second visit.

---

## Write your first component

All components extend `AppElement` from `_lib/core/app-element.js`. Create a file in `app/components/` and register a custom element:

```js
// app/components/hello-world/hello-world.js
import { AppElement } from '../../../_lib/core/app-element.js';

class HelloWorld extends AppElement {
  template() {
    return `
      <style>
        :host { display: block; padding: var(--space-md); }
        p { color: var(--color-text-primary); font-size: var(--font-size-body); }
      </style>
      <p>Hello, world.</p>
    `;
  }
}

customElements.define('hello-world', HelloWorld);
```

Use it in your page HTML or from another component's `template()`:

```html
<hello-world></hello-world>
```

Design tokens from `_lib/core/styles/tokens.css` are available in any component style block via `var(--token-name)` — no extra imports needed.

See [components.md](components.md) for the full component guide including tiers, the subscribe/unsubscribe lifecycle, and targeted DOM update patterns.

## Add a page

Your scaffolded app comes with routing wired up. `main.js` registers `home-page` and `not-found-page` as the initial routes.

To add a new page:

1. Create a component in `app/pages/`:

```js
// app/pages/goal-page.js
import { AppElement } from '../../_lib/core/app-element.js';

class GoalPage extends AppElement {
  template() {
    return `
      <style>:host { display: block; }</style>
      <main>
        <h1>Goal</h1>
      </main>
    `;
  }
}

customElements.define('goal-page', GoalPage);
```

2. Register it in `app/main.js`:

```js
import './pages/goal-page.js';

router.routes = [
  { path: '/',          component: 'home-page' },
  { path: '/goals/:id', component: 'goal-page' },   // ← add this
  { path: '*',          component: 'not-found-page' },
];
```

3. Navigate to it from anywhere in your app. The import path is relative to your file's location:

```js
// from app/pages/goal-page.js
import { navigate } from '../../_lib/core/router/router.js';

navigate('/goals/42');
```

Route parameters (`:id`) are URI-decoded and set on the page component as `this.params.id` before it renders.

See [architecture.md](architecture.md) for the full router documentation including hard-refresh behaviour and the SW navigation intercept.

## Set up Claude Code

Every scaffolded project includes Claude Code slash commands in `.claude/commands/`. They encode a structured workflow for building features correctly: scope before build, test before commit, review before ship.

Before your first coding session, run:

```
/setup-claude
```

Claude reads your existing code and asks four short passes of questions about your app — purpose, users and flows, data model, and constraints. It writes an `## About this app` section into `CLAUDE.md` that every future session loads automatically. You will not need to re-explain your app each time.

Once set up, the basic development loop is:

```
/scope "feature description"    ← analyse before writing code
/component <name> <tier>        ← scaffold a new Web Component
/test <filepath>                ← write or complete tests
/a11y <filepath>                ← accessibility audit
/review <filepath>              ← quality check
/commit                         ← commit at a logical checkpoint
```

See [claude.md](claude.md) for the full command reference and workflow guide.

## Run the tests

Your project comes with Vitest and Playwright already configured. Some tests run immediately against the scaffolded code:

```bash
npm test               # unit + E2E — full test suite
npm run test:unit      # Vitest unit tests only
npm run test:e2e       # Playwright E2E — builds and serves automatically
```

See [testing.md](testing.md) for the full testing guide — environments, patterns for component tests and store integration tests, and how to extend the provided E2E tests for your domain.

## Manage the library

Four commands keep your `_lib/` in shape — all run from your project root:

```bash
socle update           # upgrade to the latest library version
socle manage           # interactive selector to add or remove modules
socle add <module>     # add a single module (gestures, sync, images)
socle remove <module>  # remove a module (warns if app/ files import it)
```

`update` replaces `_lib/` only — your `app/` code is never touched. If the update includes a new IDB schema version, run `/migration` to review and apply it.

See [updating.md](updating.md) for full details on each command.

---

[← Back to README](../README.md) · [Docs](https://github.com/magp/Socle/blob/main/README.md#docs) · [Next: Architecture →](architecture.md)
