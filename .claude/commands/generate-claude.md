# /generate-claude

Generate the Claude Code files that ship to app developers via the CLI.

This is a **library development command**. It runs during the release process,
writes pre-generated output to `scaffold/`, and that output gets committed
to the repo. App developers receive the finished files automatically when they
scaffold a project — they never run this command themselves and are not aware it exists.

Data flow:
```
/generate-claude  (library dev, runs at release time)
    ↓
reads  .claude/commands/           ← library source of truth
writes scaffold/.claude/commands/  ← pre-generated, committed to repo
       scaffold/CLAUDE.md.template

npx socle my-app  (developer, runs once)
    ↓
CLI copies scaffold/.claude/ → my-app/.claude/
CLI stamps CLAUDE.md.template → my-app/CLAUDE.md
    ↓
Developer receives ready-to-use Claude files. No generation step on their end.
```

The output in `scaffold/` must always be committed as part of the release
commit. A release without updated templates is incomplete.

---

## What to do

### Step 1 — Identify what changed since last generation

Run `git log --oneline scaffold/.claude/` to find the last commit that touched the scaffold Claude files. Then run `git diff <that-commit> --name-only .claude/commands/` to see which library commands changed since then.

Use this to focus the work:
- **Changed commands**: re-adapt these from scratch using the table below — do not patch the existing scaffold version, rewrite it cleanly from the current library source
- **Unchanged commands**: verify the scaffold version still matches the library source (a quick read is sufficient); skip if confident nothing drifted
- **New commands**: classify using the table, adapt or exclude accordingly
- **Deleted commands**: remove from `scaffold/.claude/commands/` if they were included

If you cannot determine what changed (e.g. no prior generation commit exists), do a full regeneration of all included commands.

---

### Step 2 — Audit each library command for app relevance

Read every file in `.claude/commands/` and classify it using this table.
Update the table if commands have been added or significantly changed since
the last generation run — this table is the record of every decision made.

| Command | App relevance | Action | Reason |
|---|---|---|---|
| `component.md` | Yes | Adapt | Library scaffolds into `core/` and `reference-app/`; app scaffolds into `app/`. Remove tier path rules, update paths to `app/components/` and `app/pages/`. |
| `review.md` | Yes | Adapt | Remove `_lib/` ownership check (not relevant to app code). Keep all quality, maintainability, and UI checks. |
| `scope.md` | Yes | Adapt | Remove `_lib/` vs `app/` placement analysis. Replace with: is this in scope for this specific app, or is it a library contribution? |
| `test.md` | Yes | Adapt lightly | Replace references to `core/` and `modules/` paths with `app/`. Keep all rules unchanged. |
| `test-pwa.md` | Yes | Copy with review | Verify no library-specific content has crept in. |
| `a11y.md` | Yes | Copy with review | Verify no library-specific content has crept in. |
| `commit.md` | Yes | Adapt | Remove monorepo note. Update: one repo for the app, no reference app, no `/integrate` step. |
| `docs.md` | Yes | Adapt | Replace library docs structure with app docs structure (README + user guide). Remove `/generate-claude` reference. |
| `status.md` | Yes | Rewrite | Build phases don't apply. Replace with app completeness checks (see Step 4). |
| `migration.md` | Yes | Copy with review | Verify no library-specific content. |
| `i18n.md` | Yes | Adapt | Remove `_lib/` ownership checks and the `defineStrings()`/`t()` scaffolding steps — app devs don't write `_lib/` components. Keep the hardcoded-string audit and the `app/locales/` key-parity check. |
| `integrate.md` | No | Exclude | Reference app concept does not exist in user projects. |
| `sync.md` | No | Exclude | Reference-app → scaffold sync concept does not exist in user projects. |
| `update-meta.md` | No | Exclude | Audits Socle's own CLAUDE.md and command files — library development only. |
| `gesture.md` | No | Exclude | Gestures come from `_lib/`, app devs don't write gesture implementations. |
| `generate-claude.md` | No | Exclude | This is a library development tool only. |
| `contribute.md` | Yes | Include as-is | Written specifically for app developers. References library GitHub URL — update before generating. |

---

### Step 3 — Write adapted commands to `scaffold/.claude/commands/`

One file per included command. Apply the adaptation rules from the table above.

For commands marked **Copy with review**: read the current file and confirm no
library-specific content has crept in since last generation. Paths referencing
`core/`, `modules/`, `reference-app/`, or `_lib/` ownership rules are red flags.
If clean, copy as-is. If not, adapt first.

For commands marked **Adapt**: produce a new version that reads naturally for
an app developer with no knowledge of the library's internals.

---

### Step 4 — Generate `scaffold/CLAUDE.md.template`

The app CLAUDE.md is stamped with tokens at scaffold time. Write it with:

- `{{APP_NAME}}` — app name entered during scaffolding
- `{{APP_DESCRIPTION}}` — one-line description prompted by CLI
- `{{MODULES}}` — comma-separated list of selected modules
- `{{ACCENT_COLOR}}` — hex colour chosen during scaffolding
- `{{SCAFFOLDED_DATE}}` — ISO date of scaffolding
- `{{LIB_VERSION}}` — library version used

Structure of the app CLAUDE.md template:

```markdown
# {{APP_NAME}}

{{APP_DESCRIPTION}}

Scaffolded from Socle {{LIB_VERSION}} on {{SCAFFOLDED_DATE}}.
Installed modules: {{MODULES}}

## Stack

- Vanilla JS, CSS, HTML — no runtime dependencies
- Web Components (AppElement base class from _lib/)
- IndexedDB via _lib/core/idb/ — append-only event log
- History API router from _lib/core/router/
- Service Worker with offline-first caching
- Accent colour: {{ACCENT_COLOR}} — change via --color-accent in _lib/core/styles/tokens.css
[conditionally included per module:]
- Gesture library from _lib/modules/gestures/
- P2P sync from _lib/modules/p2p/

## Project structure

_lib/            ← library code, never edit directly
app/
  components/    ← your Web Components
  pages/         ← your page components (one per route)
  store/         ← your store actions and schema extensions
  main.js        ← app entry point
tests/
  unit/          ← Vitest unit tests
  e2e/           ← Playwright E2E tests
utils/
  build.js       ← edit if custom build behaviour needed
index.html
manifest.json
dist/            ← generated by build, never commit

## Rules

- All style values from _lib/core/styles/tokens.css — no hardcoded values
- State flows one way: action → store → IDB → component
- No full re-renders after initial mount — targeted DOM updates only
- Every new feature passes /test, /a11y, /review, and /docs before /commit

## Updating _lib/

npx socle update
Replaces _lib/ only. Your app/ code is never touched.
```

---

### Step 5 — Write the app `/status` command

The app version checks app completeness, not library build phases.
Write it to `scaffold/.claude/commands/status.md`:

```markdown
# /status

Report what is built, what is missing, and what to work on next.
Do not start any work. Report only.

## What to do

### Core health
- [ ] _lib/ present and lib-version.json readable
- [ ] index.html present, manifest.json configured (name, icons, theme_color)
- [ ] --color-accent overridden for this app in _lib/core/styles/tokens.css

### Routing
- [ ] app-router registered in index.html
- [ ] At least one page component in app/pages/
- [ ] 404 / fallback route handled

### Data layer
- [ ] At least one store action defined in app/store/
- [ ] At least one migration defined
- [ ] Event types documented (comment in store/ is sufficient)

### Components
List every file in app/components/ and app/pages/.
For each: does a .test.js exist? Has /a11y been run?

### Tests
- Vitest passing? (run: npx vitest run)
- Playwright tests present for offline and persistence?

### Docs
- README.md present and accurate?

### Output
For each area: ✅ done / 🔄 in progress / ⬜ not started
Then: "Recommended next step: [specific task]"
```

---

### Step 6 — Report

List every file written to `scaffold/`. Note any commands where library-specific
content was found and removed. Flag anything that needs a human decision before
the release is tagged.
