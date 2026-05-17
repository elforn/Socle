# Changelog

All notable changes to Socle are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versions follow [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added
- Monorepo structure and minimal Node.js build script (asset hashing, version.json, SW manifest injection)
- AppElement base class with Shadow DOM, adoptedStyleSheets, and render/subscribe lifecycle
- CSS token system (`core/styles/tokens.css`) — warm neutral palette, accent theming via two variables
- Optional CSS animations file (`core/styles/animations.css`) — page transitions, gestures, toasts, charts
- History API router with SW navigation intercept — all routes serve index.html
- Store module with one-way data flow (action → store → IDB → component)
- IndexedDB wrapper with append-only event log schema and migration runner
- Event schema: `{ id, deviceId, recordedAt, occurredAt, type, payload }`
- SW lifecycle management: two-layer update flow (SW waiting detection + version.json check)
- Gesture library: tap, long press, swipe (in progress)
- Reference app: yearly goals app (`reference-app/goals/`)
- UI design system (`.claude/ui.md`) extracted from visual references
- Claude Code project files for library development (`.claude/commands/`)
- CLI template generation for app developers (`/generate-claude` command)

---

<!--
Template for new versions:

## [x.y.z] — YYYY-MM-DD

### Added
-

### Changed
-

### Fixed
-

### Deprecated
-

### Breaking
-
Migration: describe what developers need to change in their app/ code.
-->
