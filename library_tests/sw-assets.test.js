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

describe('SW fetch handler ordering', () => {
  // A real OS share-sheet invocation arrives as a top-level navigation
  // (event.request.mode === 'navigate'), not as a plain fetch() call.
  // If the navigate branch runs first it serves the cached homepage and silently
  // discards the share payload — the POST handler is never reached.
  // This test encodes that ordering constraint so a future edit can't quietly
  // reintroduce the bug. It cannot be verified by a fetch()-based unit test
  // (fetch() is always mode 'cors'/'same-origin', never 'navigate') — real-device
  // verification after each release remains the definitive check.
  it('Share Target POST check appears before mode === navigate check in sw.js', () => {
    const src = readFileSync(join(root, 'core', 'sw.js'), 'utf8');
    const postIdx = src.indexOf("event.request.method === 'POST'");
    const navIdx  = src.indexOf("event.request.mode === 'navigate'");
    expect(postIdx).toBeGreaterThan(-1);
    expect(navIdx).toBeGreaterThan(-1);
    expect(postIdx).toBeLessThan(navIdx);
  });
});
