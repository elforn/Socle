# Changelog

All notable changes to Socle are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versions follow [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added
- Monorepo structure: `core/`, `modules/`, `scaffold/`, `cli/`, `reference-app/`, `docs/`
- Build script (`utils/build.js`) — content-hashed assets, `version.json`, SW template injection, `BASE_PATH` support for GitHub Pages subdirectory deployments
- CSS token system (`core/styles/tokens.css`) — warm neutral palette, accent theming via two CSS variables
- CSS animations (`core/styles/animations.css`) — page transitions, element entrances, bottom sheet, toasts, tap feedback, drag and swipe gesture classes; respects `prefers-reduced-motion`
- Service Worker template (`core/sw.js`) — cache-first strategy, cache versioning, activate-time stale-cache cleanup
- Scaffold templates (`scaffold/`) — mirroring the exact app directory structure with `%%TOKEN%%` placeholders for CLI substitution
- GitHub Actions workflow template (`scaffold/.github/workflows/deploy.yml`) — builds and deploys to GitHub Pages on push to main
- Reference app shell (`reference-app/`) — `_lib/` symlinked to monorepo `core/` and `modules/` for live development
- Claude Code project files for library development (`.claude/commands/`)

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
