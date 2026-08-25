/**
 * _lib/ boundary tests — library developer tests only.
 *
 * Enforces two hard rules from CLAUDE.md:
 *   1. _lib/ never imports from app/  (breaks the update mechanism if violated)
 *   2. _lib/ has zero runtime dependencies  (no bare module specifiers)
 *
 * These run automatically with `npm test`. A failure here means an architectural
 * rule has been broken, not a logic bug — treat it as a build error.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readdirSync, statSync } from 'fs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function walkJs(dir, results = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkJs(full, results);
    else if (entry.name.endsWith('.js') && !entry.name.includes('.test.') && entry.name !== 'test-setup.js' && entry.name !== 'test-helpers.js')
      results.push(full);
  }
  return results;
}

function libSourceFiles() {
  return [
    ...walkJs(join(root, 'core')),
    ...walkJs(join(root, 'modules')),
  ];
}

function importsIn(src) {
  return [...src.matchAll(/^\s*import\s+.*?\s+from\s+['"]([^'"]+)['"]/gm)]
    .map(m => m[1]);
}

describe('_lib/ import boundary', () => {
  it('no core/ or modules/ file imports from app/', () => {
    const violations = [];
    for (const file of libSourceFiles()) {
      const src = readFileSync(file, 'utf8');
      for (const path of importsIn(src)) {
        if (path.includes('/app/') || path === 'app' || path.startsWith('app/')) {
          violations.push(`${file}: imports '${path}'`);
        }
      }
    }
    expect(violations, violations.join('\n')).toHaveLength(0);
  });

  it('no core/ or modules/ file has bare module specifier imports (zero runtime deps)', () => {
    const violations = [];
    for (const file of libSourceFiles()) {
      const src = readFileSync(file, 'utf8');
      for (const path of importsIn(src)) {
        if (!path.startsWith('.') && !path.startsWith('/')) {
          violations.push(`${file}: bare import '${path}'`);
        }
      }
    }
    expect(violations, violations.join('\n')).toHaveLength(0);
  });
});
