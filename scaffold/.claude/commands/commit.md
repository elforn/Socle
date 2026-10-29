# /commit

Create a git commit at a logical checkpoint. Run this after a feature, a test, or a review is complete — not after every file change.

## When to commit

Commit when one of these is true:
- A feature passes `/test`, `/a11y`, and `/review`
- A `/review` finding has been resolved
- A `/migration` is complete and tested
- A meaningful standalone fix that isn't part of a larger in-progress feature

**Do not commit:**
- Broken or untested code
- Mid-feature (partial implementations)
- Commented-out code left "for later"
- After every individual file save

## Commit message format

Use conventional commits. Format: `<type>(<scope>): <description>`

Types:
- `feat` — new capability added
- `fix` — bug fix
- `test` — adding or updating tests only, no production code change
- `refactor` — code restructured, behaviour unchanged
- `docs` — documentation only
- `build` — build script or SW manifest changes
- `chore` — project config, file moves, renames

Scope is the area of the app: `store`, `router`, `sw`, `ui`, `pages`, `idb`, or a component name.

Examples:
```
feat(pages): add match detail page with score breakdown
fix(sw): prevent update banner from appearing on first install
test(store): add coverage for concurrent dispatch and event ordering
refactor(ui): extract score-pill into reusable component
```

Description rules:
- Lowercase, no full stop
- Present tense ("add" not "added")
- Describe what changed and why in one line
- If more context is needed, add a body after a blank line — but most commits shouldn't need one

## What to do when /commit is run

1. Run `git status` and `git diff --stat` to see what has changed
2. **Bump the patch version** in `package.json` (e.g. `0.1.4` → `0.1.5`). Always bump at minimum the patch version, even for a fix or docs commit. Use minor for a new user-facing feature; major for a breaking change. The version is embedded in the build as `__APP_VERSION__` and drives the Service Worker update banner — a deploy without a bump means your users are told nothing changed.
3. **Update `CHANGELOG.md`** if you keep one: move the contents of `## [Unreleased]` into a new `## [X.Y.Z] — YYYY-MM-DD` section immediately below it, leaving `## [Unreleased]` empty for the next cycle.
4. Group remaining changes into logical commits if multiple features are staged together.
5. For each commit:
   - Stage the relevant files with `git add`
   - Write the commit message following the format above
   - Run `git commit`
6. Include `package.json` in the last commit (or a dedicated `chore: bump version to X.Y.Z` commit).
7. Do **not** push — you decide when to push.
8. Report: how many commits were made, what each covers, and anything that was left unstaged and why.

Never commit `_lib/` changes of your own. That directory is library-owned and `npx socle update` overwrites it — see your CLAUDE.md.
