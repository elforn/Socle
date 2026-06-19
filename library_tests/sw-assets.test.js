import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('SW install integrity', () => {
  it('build.js includes BASE_PATH as a direct element in the ASSETS array', () => {
    // The SW install handler uses cache.match(BASE_PATH) to retrieve the cached index.html
    // for the poisoned-cache check. If BASE_PATH is not in ASSETS, cache.add() is never called
    // for it, the match returns undefined, and the check silently no-ops on every install.
    const src = readFileSync(join(root, 'scaffold', 'utils', 'build.js'), 'utf8');
    expect(src).toMatch(/\[\s*BASE_PATH\s*,/);
  });

  it('sw.js install handler verifies cached index.html references the expected JS bundle', () => {
    const src = readFileSync(join(root, 'core', 'sw.js'), 'utf8');
    expect(src).toContain('text.includes(mainJs)');
    expect(src).toContain('caches.delete(CACHE_VERSION)');
  });
});
