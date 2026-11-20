/**
 * Reference-app coverage of modules/ — library developer tests only.
 *
 * Enforces the CLAUDE.md rule "Every library feature must be used in the reference
 * app before it is considered complete." A documented, exported entry point with
 * zero reference-app call sites is a promise the docs make that nothing checks —
 * exactly the gap that let `Gestures.attach`'s `onTap`/`onLongPress` ship as dead
 * controls for a release (CHANGELOG 1.6.0): the mixin had a reference-app consumer,
 * `attach` did not, and nobody noticed the two had drifted apart.
 *
 * Scoped to modules/, not core/: modules are the optional, individually-scaffolded
 * surface where "exported but never exercised" is unambiguous. core/ mixes public
 * API with internals used only by other core/ files (idb.js, router.js), which this
 * regex-based check can't tell apart from app-facing API without false positives.
 *
 * Detects two kinds of entry point:
 *   - named exports (`export function`, `export const`, `export class`), plus their
 *     static properties (`Gestures.attach = ...`) and object-literal methods
 *     (`export const Reorder = { attach(...) {`)
 *   - custom elements (`customElements.define('tag-name', ...)`) — these modules
 *     have no JS export at all; the only usage signal is the tag appearing in a
 *     reference-app template.
 *
 * A failure here is a build error, not a logic bug: either wire the entry point
 * into the reference app, or add it to EXEMPT below with a reason. This list is a
 * backlog of known, justified gaps — not a way to silence the check.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const modulesDir = join(root, 'modules');
const appDir = join(root, 'reference-app', 'app');

// Internal implementation files whose exports are only consumed by a sibling file
// in the same module, never meant as app-facing API — same category as core/'s
// idb.js, which this check deliberately doesn't scan for the same reason.
const INTERNAL_FILES = new Set([
  'sync/zip.js', // ZIP encode/decode, used only by sync.js
]);

const EXEMPT = new Set([
  // Test-only reset, same contract as Store.reset(): "never call in production code."
  'toast.js:_resetToast',

  // CLAUDE.md: "Not scaffolded by default — added via `npx socle add reorder`."
  // The reference app's goal lists have no manual reordering need; no consumer has
  // asked for it. Revisit if that changes.
  'reorder.js:Reorder',
  'reorder.js:Reorder.attach',

  // sync.js's low-level preview/apply pair exists for apps that want a custom
  // import-confirmation UI; the reference app uses the high-level importData()
  // helper instead, which CLAUDE.md documents as sufficient for "most apps." Real
  // gap in the sense that the preview/merge *flow* itself is undemonstrated — kept
  // as a named, open gap rather than silently exempted from scrutiny.
  'sync.js:previewImport',
  'sync.js:applyReplace',
  'sync.js:applyMerge',

  // periodic-sync.js is deliberately unused — reference-app/app/sw-extensions.js
  // documents why: YourYear uses the event-log store, which has no persisted state
  // snapshot a classic-script SW handler could read (state only exists by replaying
  // events in the page's own boot()). Wiring periodicsync here would mean
  // duplicating the reducer inside the service worker just to serve this one
  // feature. The foreground checker (digest-notifier, on boot + resume) is the
  // mechanism that actually fits this store. Revisit if a simple-store reference
  // app is ever added — that store's single persisted snapshot IS readable from a
  // classic script, and periodic-sync.js would fit it directly.
  'periodic-sync.js:isPeriodicSyncSupported',
  'periodic-sync.js:PeriodicSync',

  // filter-state.js's FilterState() has zero reference-app usage — the reference
  // app's goal lists have no search/filter bar. A feature decision (does a yearly
  // goals list need search?), not a mechanical wiring job.
  'filter-state.js:FilterState',
]);

function walkJs(dir, results = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkJs(full, results);
    else if (entry.name.endsWith('.js') && !entry.name.includes('.test.')) results.push(full);
  }
  return results;
}

function entryPointsIn(src) {
  const names = [];

  for (const m of src.matchAll(/^export\s+(?:async\s+)?(?:function|const|class)\s+(\w+)/gm)) {
    names.push(m[1]);
  }

  // Static property assignments on an already-exported name: Gestures.attach = ...
  for (const m of src.matchAll(/^(\w+)\.(\w+)\s*=/gm)) {
    if (names.includes(m[1])) names.push(`${m[1]}.${m[2]}`);
  }

  // Object-literal methods on an exported const object: export const Reorder = { attach(...) {
  const objMatch = src.match(/^export const (\w+) = \{/m);
  if (objMatch) {
    const name = objMatch[1];
    const rest = src.slice(src.indexOf(objMatch[0]) + objMatch[0].length);
    for (const m of rest.matchAll(/^\s{2}(\w+)\(/gm)) {
      names.push(`${name}.${m[1]}`);
    }
  }

  for (const m of src.matchAll(/customElements\.define\(\s*['"]([\w-]+)['"]/g)) {
    names.push(`<${m[1]}>`);
  }

  return [...new Set(names)];
}

function hasCallSite(name, appSrc) {
  if (name.startsWith('<')) {
    const tag = name.slice(1, -1);
    return new RegExp(`<${tag}[\\s>]`).test(appSrc);
  }
  const pattern = name.includes('.') ? name.replace('.', '\\.') : `\\b${name}\\b`;
  return new RegExp(pattern).test(appSrc);
}

describe('reference-app coverage of modules/ entry points', () => {
  const moduleFiles = walkJs(modulesDir);
  const appSrc = walkJs(appDir).map(f => readFileSync(f, 'utf8')).join('\n');

  for (const file of moduleFiles) {
    const rel = file.slice(modulesDir.length + 1);
    if (INTERNAL_FILES.has(rel)) continue;
    const base = rel.split('/').pop();
    const src = readFileSync(file, 'utf8');
    const entries = entryPointsIn(src);
    if (!entries.length) continue;

    it(`${rel} entry points are exercised by the reference app`, () => {
      const missing = entries.filter(
        name => !EXEMPT.has(`${base}:${name}`) && !hasCallSite(name, appSrc)
      );
      expect(
        missing,
        `${rel}: no reference-app call site for ${missing.join(', ')} — ` +
          `either use it in reference-app/app, or add a justified entry to EXEMPT in this test`
      ).toHaveLength(0);
    });
  }
});
