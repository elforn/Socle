# Updating the library

## How updates work

Your project's `_lib/` directory contains a snapshot of the library at the time you scaffolded. When the library releases a new version, `npx socle update` replaces `_lib/` with the latest files.

Your `app/` code is never touched. The dependency arrow goes one way — `app/` imports from `_lib/`, never the reverse — so replacing `_lib/` cannot break your code unless you were relying on an API that changed. Breaking changes are documented in [CHANGELOG.md](../CHANGELOG.md).

## Run the update

From your project root:

```bash
npx socle update
```

The command:
1. Reads `_lib/lib-version.json` to find your current version and installed modules
2. Compares it against the CLI's version
3. Checks `git diff --name-only _lib/` — if you have local modifications, it lists them and asks before overwriting
4. Replaces `_lib/core/` and each installed module
5. Preserves your customised `--color-accent` value in `tokens.css`
6. Updates `lib-version.json`

If the update includes a new IDB schema version, the changelog will say so. Run `/migration` to review and apply it before committing.

## What is replaced

| Path | Replaced? |
|------|-----------|
| `_lib/core/` | ✅ Always |
| `_lib/modules/<mod>/` | ✅ For each module listed in `lib-version.json` |
| `_lib/lib-version.json` | ✅ Version field updated; modules list preserved |
| `app/` | ❌ Never |
| `index.html`, `manifest.json`, `package.json` | ❌ Never |
| `utils/build.js` | ❌ Never |

## What is preserved

- Your accent colour (`--color-accent` in `_lib/core/styles/tokens.css`) is read before the update and re-applied to the new `tokens.css` automatically.
- All other customisations inside `_lib/` are **overwritten**. If you have modified a file in `_lib/`, the update will warn you and ask for confirmation. The intent is that `_lib/` stays library-owned — customise via `app/` instead.

## lib-version.json

Every scaffolded project has `_lib/lib-version.json`:

```json
{
  "version": "0.1.0",
  "modules": ["core", "gestures"],
  "scaffolded": "2026-05-30"
}
```

- `version` — the library version currently installed
- `modules` — which modules are installed; `update` uses this list to know what to replace
- `scaffolded` — date the project was first created; never changed by `update`

## After updating

Review the changelog for anything that affects your app, then commit:

```bash
git add _lib/ && git commit -m "chore: update socle to 0.x.y"
```

If a migration is required, apply it first and include it in the same commit.
