# Using Claude Code in your Socle app

Every scaffolded Socle project includes a set of Claude Code slash commands in `.claude/commands/`. They encode the same workflow discipline used to build the library itself — scope before build, test and review before commit.

This guide covers how to set up Claude for your specific app, what each command does, and the order to use them.

## Contents

- [First run — describe your app](#first-run--describe-your-app)
- [Workflow](#workflow)
- [Contributing a component back to the library](#contributing-a-component-back-to-the-library)
- [Command reference](#command-reference)
- [Keeping `CLAUDE.md` current](#keeping-claudemd-current)
- [Updating the library](#updating-the-library)

---

## First run — describe your app

Run this once after scaffolding:

```
/setup-claude
```

Claude reads your existing code (store actions, page components, event types) to infer what it can, then asks four passes of questions:

1. **Purpose** — what the app does and for whom, context of use, primary device
2. **Users and flows** — who uses it, what are the 3–5 key actions, what does "done" look like
3. **Data model** — your domain concepts, what your event types mean, any business rules
4. **Constraints** — interaction constraints specific to your context, things to avoid

It writes an `## About this app` section into `CLAUDE.md`. Every future Claude session loads this automatically — you do not need to re-explain your app each time.

Re-run `/setup-claude` whenever your app's purpose or data model changes significantly.

---

## Workflow

The commands follow a consistent sequence. The order matters.

### Before starting a feature

```
/scope "description of the feature"
```

Analyses whether the feature belongs in this app, estimates complexity, and proposes alternatives if the cost is Medium or High. Run this before writing any code — it takes seconds and saves hours.

### Building a feature

```
/component <name> <tier>
```

Scaffolds a new Web Component at the right path with the correct imports, a `<style>` block using design tokens, and a matching `.test.js`. Tiers are `page`, `ui`, and `service`.

```
/migration <version> <description>
```

Scaffolds a new IDB schema migration with the correct structure and a test. Run this whenever you add a new object store or index.

### After completing a feature

Run these in order — each one gates the next:

```
/test <filepath>      ← write or complete tests for the file
/a11y <filepath>      ← audit for accessibility (Tier 1 blocking, Tier 2 advisory)
/i18n <filepath>      ← if app uses strings.js: audit for hardcoded strings
/review <filepath>    ← complexity, standards, maintainability
/docs feature <name>  ← update README and docs
/commit               ← commit at a logical checkpoint
```

`/i18n` is conditional — skip it if your app is single-language with no `app/strings.js`. If you do use `defineStrings()`, run `/i18n` on every component that shows user-visible text.

A feature is not done until all applicable steps pass.

### Before shipping

```
/test-pwa all         ← verify offline, persistence, and update flow with Playwright
/status               ← check overall app completeness
/docs changelog       ← update CHANGELOG.md
/commit               ← final commit
```

### Internationalisation

```
/i18n <filepath>      ← audit for hardcoded user-visible strings
```

If your app is single-language, hardcoded strings in `app/` are acceptable — `/i18n` flags them as warnings. If you use `app/strings.js` with `defineStrings()`, run this audit before committing any new component that shows text.

---

## Contributing a component back to the library

If you build something genuinely general-purpose — a gesture primitive, a store pattern, a UI component that any app could use unchanged — you can package it for contribution:

```
/contribute app/components/my-component/my-component.js
```

This runs eligibility checks (no domain concepts, no `app/` imports, tests present, Tier 1 a11y passing), produces a cleaned-up copy in `_contribution/`, and writes a `proposal.md` ready to attach to a GitHub issue.

---

## Command reference

| Command | What it does |
|---------|-------------|
| `/setup-claude` | Builds the app-context section of `CLAUDE.md` via structured questions |
| `/scope` | Analyses a feature request before any code is written |
| `/component` | Scaffolds a new Web Component with test |
| `/migration` | Scaffolds an IDB schema migration with test |
| `/test` | Writes or completes tests for a file |
| `/a11y` | Audits a component for accessibility (Tier 1 blocking) |
| `/i18n` | Audits a file for hardcoded user-visible strings |
| `/review` | Reviews a file for complexity, standards, and maintainability |
| `/docs` | Updates README, changelog, or feature docs |
| `/test-pwa` | Writes Playwright tests for offline, update flow, and persistence |
| `/status` | Reports what is built, what is missing, and what to work on next |
| `/commit` | Creates a git commit at a logical checkpoint |
| `/contribution-scan` | Scans `app/components/` to identify components worth contributing to the library |
| `/contribute` | Packages a specific component for contribution to the library |

---

## Keeping `CLAUDE.md` current

The technical section of `CLAUDE.md` (stack, structure, rules, workflow) is written by the CLI and updated by `/setup-claude`. Do not edit it manually — re-run `/setup-claude` instead.

The `## About this app` section is yours. Claude uses it to understand your domain without reading all your code on every session. Keep it accurate as your app evolves — stale context is worse than no context.

---

## Updating the library

When a new version of Socle is released:

```bash
npx socle update
```

This replaces `_lib/` only. Your `app/` code and `CLAUDE.md` are never touched. If the update includes a new IDB schema version, the command flags it and you run `/migration` to review and apply it.

After updating, run `/status` to check whether any new library features need wiring up in your app.

---

[← Testing](testing.md) · [Docs](https://github.com/magp/Socle/blob/main/README.md#docs) · [Next: Theming →](theming.md)
