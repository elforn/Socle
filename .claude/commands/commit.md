# /commit

Create a git commit at a logical checkpoint. Run this after a feature, a test, or a review is complete — not after every file change.

## Repository structure

There is **one git repository** for the entire monorepo (`core/`, `modules/`, `cli/`, `reference-app/`, `docs/`). Do not create separate repos for the library and reference app.

When the CLI generates a new user project, that project starts its own fresh git repo entirely unrelated to this one. No submodules, no symlinks, no references back.

## When to commit

Commit when one of these is true:
- A build phase step is complete (see `/status` for phase definitions)
- A library feature passes `/test`, `/integrate`, `/a11y`, and `/docs feature`
- A `/review` finding has been resolved
- A `/migration` is complete and tested
- A meaningful standalone fix that isn't part of a larger in-progress feature

**Do not commit:**
- Broken or untested code
- Mid-feature (partial implementations)
- Commented-out code left "for later"
- After every individual file save
- Without running `/docs` — undocumented features do not get committed

## Commit message format

Use conventional commits. Format: `<type>(<scope>): <description>`

Types:
- `feat` — new capability added to the library or reference app
- `fix` — bug fix
- `test` — adding or updating tests only, no production code change
- `refactor` — code restructured, behaviour unchanged
- `docs` — documentation only
- `build` — build script or SW manifest changes
- `chore` — project config, file moves, renames

Scope is the module or area: `core`, `router`, `store`, `idb`, `sw`, `gestures`, `p2p`, `reference-app`, `cli`

Examples:
```
feat(gestures): add swipe gesture with velocity and direction normalisation
test(store): add coverage for concurrent write and event ordering
fix(sw): prevent skipWaiting from firing without user confirmation
refactor(idb): simplify migration runner, remove redundant version check
feat(reference-app): integrate swipe gesture into score input component
```

Description rules:
- Lowercase, no full stop
- Present tense ("add" not "added")
- Describe what changed and why in one line
- If more context is needed, add a body after a blank line — but most commits shouldn't need one

## What to do when /commit is run

1. Run `git status` and `git diff --stat` to see what has changed
2. **Bump the patch version** in `package.json` (e.g. `0.9.19` → `0.9.20`). Always bump at minimum the patch version, even for fix or docs commits. Use minor for intentional new public API; major for breaking changes.
3. **Update `CHANGELOG.md`**: move the contents of `## [Unreleased]` into a new `## [X.Y.Z] — YYYY-MM-DD` section immediately below it, leaving `## [Unreleased]` empty for the next cycle.
4. Group remaining changes into logical commits if multiple features are staged together.
5. For each commit:
   - Stage the relevant files with `git add`
   - Write the commit message following the format above
   - Run `git commit`
6. Include `package.json` and `CHANGELOG.md` in the last (or a dedicated `chore: bump version to X.Y.Z`) commit.
7. Do **not** push — the developer decides when to push.
8. Report: how many commits were made, what each covers, and anything that was left unstaged and why.
