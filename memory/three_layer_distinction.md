---
name: three-layer-distinction
description: The three distinct layers of the Socle project — library, reference app, scaffolded app — and where things belong
metadata:
  type: feedback
---

Always keep these three layers distinct when deciding where changes, docs, and skills belong:

**Library** (`core/`, `modules/`) — the infrastructure shipped in `_lib/`. Skills that operate on the library: `/component`, `/gesture`, `/migration`, `/integrate`, `/sync`, `/generate-claude`, `/update-meta`. Docs: `docs/architecture.md`, `docs/gestures.md`, etc.

**Reference app** (`reference-app/`) — YourYear, a real app that demonstrates every library feature. Domain components live here (`goal-item`, `year-header`, `goal-dialog`, etc.). Not shipped to users — it proves the library works end-to-end. Its infrastructure files (`package.json`, `playwright.config.js`, `utils/build.js`, etc.) must stay in sync with `scaffold/` via `/sync`.

**Scaffolded app** (`scaffold/`) — the template a developer gets when they run `npx socle my-app`. Contains only infrastructure (routing shell, blank page stubs, test templates). Domain-specific code from the reference app NEVER goes into scaffold. The scaffold's Claude commands are adapted versions of library commands (via `/generate-claude`), written for app developers with no library knowledge.

**Why:** — user reminded me mid-session that these must stay distinct. The mistake to avoid: adding YourYear-specific content (goal-dialog, year-header patterns) into scaffold, or adding library-internal workflow to scaffolded app docs.

**How to apply:** Before writing to any file, ask: "Is this library infrastructure, reference app demonstration, or app developer template?" If it touches all three (like a new library feature), update each layer separately.
