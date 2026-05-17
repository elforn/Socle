# Getting started

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

## Deploy to GitHub Pages

Push to `main`. The included `deploy.yml` workflow builds the app and deploys `dist/` to GitHub Pages automatically.

Before the first deploy, enable GitHub Pages in your repository settings: **Settings → Pages → Source → GitHub Actions**.

Your app will be live at `https://your-username.github.io/your-repo-name/`.

The build script automatically sets the correct base path in all asset URLs — no manual configuration needed.

## Update the library

```bash
npx socle update
```

This replaces `_lib/` only. Your `app/` code is never touched. If the update includes a new IDB schema version, the command flags it and you run `/migration` to review and apply it.
