# /docs

Maintain library documentation. Run this when a feature is complete and before /commit.
Documentation is not optional — a feature without docs is not done.

## Usage
/docs <scope>

Scopes:
- `feature <name>` — document a newly completed feature or module
- `api <filepath>`  — generate or update the API reference for a specific module
- `readme`          — update the main README.md
- `changelog`       — add entries to CHANGELOG.md for work done this session
- `all`             — full documentation pass (use when releasing a version)

---

## Documentation structure

```
pwa-lib/
  README.md              ← GitHub front page
  CHANGELOG.md           ← version history
  docs/
    getting-started.md   ← scaffold → first component → deploy
    architecture.md      ← event sourcing, store, router, SW
    theming.md           ← tokens, CSS vars, retheming
    components.md        ← building components with the library
    gestures.md          ← gesture mixin API reference
    updating.md          ← _lib/ update flow, lib-version.json
    a11y.md              ← accessibility tier system
```

---

## Scope: `feature <name>`

Document a newly completed feature. Read the implemented code first, then update the relevant docs file.

1. **Identify which docs file owns this feature.** Router → `architecture.md` and `getting-started.md`. Gesture → `gestures.md`. AppElement → `components.md`. Theming → `theming.md`. SW/update flow → `architecture.md`. New module → may need a new file.

2. **Write or update the relevant section.** Follow these rules:
   - Write for a developer who has never seen this codebase. They know JS and Web Components but not your patterns.
   - Lead with what the feature does and why, not how it's implemented.
   - Show a minimal working code example for every public API. Code examples are mandatory.
   - Note any constraints, gotchas, or decisions that aren't obvious from the code.
   - Do not copy implementation details into docs — describe the interface, not the internals.

3. **Update `getting-started.md`** if the feature changes the scaffolding experience or first-run flow.

4. **Update `README.md`** if the feature is significant enough to mention in the overview (new module, major capability).

5. **Report** which files were updated and what sections changed.

---

## Scope: `api <filepath>`

Generate or refresh the API reference for a single module. Read the file, then document every export.

Format for each export:

```markdown
### functionName(param1, param2)

One sentence: what it does and when to call it.

**Parameters**
- `param1` {type} — description
- `param2` {type} — description

**Returns** {type} — description

**Example**
```js
// minimal working example
```

**Notes** — constraints, edge cases, or decisions worth knowing
```

Place API reference at the bottom of the relevant guide file under an `## API reference` heading. Do not create separate API files — keep guide and reference together.

---

## Scope: `readme`

Update `README.md`. The README is the library's shop window on GitHub. It must be scannable in 30 seconds.

Structure (do not deviate):

```markdown
# pwa-lib

One sentence: what it is.
One sentence: what makes it different (offline-first, no deps, copy-into-project).

## What you get
Bullet list of 5–7 capabilities. Each one line.

## Quick start
\`\`\`bash
npx github:yourname/pwa-lib my-app
\`\`\`
Three to five lines showing what the CLI does and what you end up with.

## Docs
Links to docs/ files. One line each.

## Design decisions
Three to five short paragraphs on the opinionated choices:
why event sourcing, why copy-not-import, why no libraries,
why offline-first. This is what convinces a developer to use it.

## Reference app
One paragraph on the bullet diary / fencing app. Links to reference-app/.

## Status
Current version, what's stable, what's in progress.
```

Rules:
- No marketing language. No "powerful", "seamless", "blazing fast".
- No feature lists longer than 7 items.
- Every code block must be correct and runnable.
- README stays under 150 lines. If it grows past that, content belongs in docs/.

---

## Scope: `changelog`

Update `CHANGELOG.md` following Keep a Changelog format (keepachangelog.com).

Structure:
```markdown
## [Unreleased]

### Added
- Brief description of new capabilities (user-facing language, not implementation)

### Changed
- Changes to existing behaviour

### Fixed
- Bug fixes

### Deprecated
- Features that will be removed

## [0.3.1] — 2025-05-14
...
```

Rules:
- Write for a developer updating their `_lib/` — what do they need to know?
- Group by version, newest first.
- Each entry is one line, plain language, no jargon.
- Breaking changes get their own `### Breaking` section and a migration note.
- Do not document internal refactors unless they affect the public API.

Read the git log since the last changelog entry (`git log --oneline`) and translate commits into changelog entries. Conventional commit types map as: `feat` → Added, `fix` → Fixed, `refactor` with API change → Changed.

---

## Scope: `all`

Full documentation pass. Run before tagging a release, followed immediately by `/generate-claude`.

1. Run `/docs api` on every file in `core/` and any changed `modules/`
2. Run `/docs feature` for anything added since the last release
3. Run `/docs changelog` for the new version
4. Run `/docs readme` to reflect the current state
5. Verify all code examples in docs/ are correct against the current implementation
6. Check all internal links between docs files resolve correctly
7. Report a summary: files updated, sections added, any examples that couldn't be verified

After this completes, run `/generate-claude` to refresh the app-facing Claude files before tagging.

---

## Writing standards for all docs

- **Sentence case** in all headings. Never title case.
- **Second person** ("you scaffold", "your component") not third person ("the developer scaffolds").
- **Present tense** ("the store emits", not "the store will emit").
- **Short paragraphs.** Three sentences maximum before a break or a code example.
- **No filler.** Every sentence earns its place. If a sentence doesn't add information, delete it.
- **Code examples over prose.** When in doubt, show the code.
- Docs live in `docs/` and are written in markdown. No HTML in docs files.
