# Managing your library

## Contents

- [How updates work](#how-updates-work)
- [socle update — upgrade the library](#socle-update--upgrade-the-library)
- [socle manage — add or remove modules interactively](#socle-manage--add-or-remove-modules-interactively)
- [socle add — add a single module](#socle-add--add-a-single-module)
- [socle remove — remove a module](#socle-remove--remove-a-module)
- [lib-version.json](#lib-versionjson)
- [After updating](#after-updating)

---

## How updates work

Your project's `_lib/` and `utils/` directories contain library-owned files. When the library releases a new version, `socle update` replaces both with the latest versions.

Your `app/` code is never touched. The dependency arrow goes one way — `app/` imports from `_lib/`, never the reverse — so replacing `_lib/` cannot break your code unless you were relying on an API that changed. Breaking changes are documented in [CHANGELOG.md](../CHANGELOG.md).

---

## `socle update` — upgrade the library

From your project root:

```bash
socle update
```

The command:
1. Reads `_lib/lib-version.json` to find your current version and installed modules
2. Compares it against the CLI's version — exits early if already up to date
3. Checks `git diff --name-only _lib/` — if you have local modifications, it lists them and asks before overwriting
4. Replaces `_lib/core/` and each installed module
5. Preserves your customised `--color-accent` value in `tokens.css`
6. Replaces `utils/build.js` — shows a warning and asks for confirmation if it has local modifications
7. Syncs `package.json` devDependencies — adds missing packages and raises versions the template is ahead on, asks for confirmation, and never touches `name`, `version`, `scripts`, or any other field. A version you have deliberately moved **ahead** of the template is kept and reported, never downgraded.
8. Updates `lib-version.json`
9. Prints a commit command and an `npm install` reminder if devDependencies changed

If the update includes a new IDB schema version, the changelog will say so. Run `/migration` to review and apply it before committing.

### What is replaced

| Path | Replaced? |
|------|-----------|
| `_lib/core/` | ✅ Always |
| `_lib/modules/<mod>/` | ✅ For each module listed in `lib-version.json` |
| `_lib/lib-version.json` | ✅ Version field updated; modules list preserved |
| `utils/build.js` | ✅ With confirmation if locally modified |
| `package.json` devDependencies | ✅ Added / raised only, with confirmation — never downgraded |
| `vitest.config.js`, `jsconfig.json` | ❌ Never — app-owned; `socle update` prints any lines to add |
| `app/` | ❌ Never |
| `index.html`, `manifest.json` | ❌ Never |
| `package.json` name/version/scripts | ❌ Never |

### What is preserved

- Your accent colour (`--color-accent` in `_lib/core/styles/tokens.css`) is read before the update and re-applied to the new `tokens.css` automatically.
- All other customisations inside `_lib/` are **overwritten**. If you have modified a file in `_lib/`, the update will warn you and ask for confirmation. The intent is that `_lib/` stays library-owned — customise via `app/` instead.
- `utils/build.js` is treated the same way: library-owned, updated automatically, with a confirmation gate if you have local changes.

---

## `socle manage` — add or remove modules interactively

The easiest way to change which modules are installed:

```bash
socle manage
```

Opens an interactive selector pre-checked with your currently installed modules:

```
? Manage modules  ↑↓ move · Space toggle · Enter confirm

  ✔ Gesture library
  ✔ Sync (export/import)
  ◯ Image handling
  — UI components          coming soon
  — P2P sync               coming in V2
```

Toggle modules on or off, then press Enter. The CLI diffs your selection against what is currently installed and runs the necessary `add` and `remove` operations. If you remove a module that has imports in `app/`, it lists the affected files and asks for confirmation before proceeding.

No changes are made if you confirm without toggling anything.

---

## `socle add` — add a single module

```bash
socle add <module>
```

Copies the module from the library into `_lib/modules/<module>/` and adds it to the `modules` list in `lib-version.json`. Does nothing if the module is already installed.

Available modules: `gestures`, `sync`, `images`

Example:

```bash
socle add images
```

After adding a module, import its page or utilities in your `app/` code manually — the CLI copies the library files but does not wire up routes or imports for you (unlike the initial scaffold, which does this automatically).

---

## `socle remove` — remove a module

```bash
socle remove <module>
```

Before removing, the CLI scans `app/` for any `.js` files that import from the module. If it finds any, it lists them and asks for confirmation:

```
Warning: 1 file(s) in app/ import from 'gestures':
  pages/gesture-page.js

Remove anyway? [y/N]:
```

On confirmation, it removes `_lib/modules/<module>/` and updates `lib-version.json`. Your `app/` imports are left in place — you need to clean those up manually to avoid broken imports.

`core` cannot be removed.

---

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
- `modules` — which modules are installed; used by `update` and `manage`
- `scaffolded` — date the project was first created; never changed by subsequent commands

---

## After updating

Review the changelog for anything that affects your app, then commit. The update command prints the exact `git add` line for you — it includes `utils/build.js` and `package.json` only if they were changed:

```bash
git add _lib/ utils/build.js package.json && git commit -m "chore: update socle to 0.x.y"
npm install   # only if devDependencies changed
```

If a migration is required, apply it first and include it in the same commit.
