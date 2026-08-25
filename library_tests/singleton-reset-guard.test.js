/**
 * Guards against the exact regression fixed in core/strings.test.js (0.15.9) and
 * update-banner.test.js: a test file imports strings.js's `reset()` to isolate its
 * own defineStrings() fixtures per test, but never snapshots/restores the shared
 * _locales registry around the suite. Under vitest `isolate: false`, that leaves
 * the registry wiped for every test file that runs afterward in the same worker.
 *
 * Any test file that imports `reset` from core/strings.js must also import
 * `_snapshot`/`_restore` from the same module (in practice, via
 * core/test-helpers.js's `guardSingleton`).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function walkTestFiles(dir, results = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkTestFiles(full, results);
    else if (entry.name.endsWith('.test.js')) results.push(full);
  }
  return results;
}

function testFiles() {
  return [
    ...walkTestFiles(join(root, 'core')),
    ...walkTestFiles(join(root, 'modules')),
  ];
}

function importsResetFromStrings(src) {
  return [...src.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]([^'"]*\/strings\.js)['"]/g)]
    .some(([, bindings]) => /\breset\b/.test(bindings));
}

describe('strings.js reset() guard', () => {
  it('every test file that imports reset from strings.js also snapshots/restores it', () => {
    const violations = [];
    for (const file of testFiles()) {
      const src = readFileSync(file, 'utf8');
      if (!importsResetFromStrings(src)) continue;
      if (!/_snapshot/.test(src) || !/_restore/.test(src)) {
        violations.push(file);
      }
    }
    expect(violations, violations.join('\n')).toHaveLength(0);
  });
});
