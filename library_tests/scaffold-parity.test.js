/**
 * Scaffold parity tests — library developer tests only.
 *
 * These verify that the scaffold templates stay structurally in sync with the
 * reference app. They are NOT the reference-app tests (reference-app/tests/)
 * and NOT the test templates delivered to app developers (scaffold/tests/).
 *
 * Run automatically with the monorepo test suite (`npm test`).
 * Must all pass before any commit that touches reference-app/ infrastructure.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const scaffold = join(root, 'scaffold');
const refApp = join(root, 'reference-app');

function read(...parts) { return readFileSync(join(...parts), 'utf8'); }
function scaffoldPkg() { return JSON.parse(read(scaffold, 'package.json')); }
function rootPkg() { return JSON.parse(read(root, 'package.json')); }

// ─── build.js ────────────────────────────────────────────────────────────────

describe('scaffold/utils/build.js', () => {
  it('uses esbuild for bundling — no manual import path rewriting', () => {
    const src = read(scaffold, 'utils/build.js');
    expect(src).toContain("from 'esbuild'");
    expect(src).toContain('bundle:');
    expect(src).toContain('minify:');
    expect(src).not.toContain("replace(/'\\.\\/(?!_lib\\/)/g");
    expect(src).not.toContain(".replaceAll(\"'../_lib/\"");
  });

  it('build.js is identical between scaffold and reference-app', () => {
    expect(read(scaffold, 'utils/build.js')).toBe(read(refApp, 'utils/build.js'));
  });
});

// ─── app/main.js ─────────────────────────────────────────────────────────────

describe('scaffold/app/main.js', () => {
  it('has %%STORE_BOOT%% token before router setup', () => {
    const src = read(scaffold, 'app/main.js');
    const bootPos = src.indexOf('%%STORE_BOOT%%');
    const routerPos = src.indexOf('router.routes');
    expect(bootPos).toBeGreaterThan(-1);
    expect(bootPos).toBeLessThan(routerPos);
  });

  it('has %%STORE_IMPORT%% and %%REDUCER_IMPORT%% tokens', () => {
    const src = read(scaffold, 'app/main.js');
    expect(src).toContain('%%STORE_IMPORT%%');
    expect(src).toContain('%%REDUCER_IMPORT%%');
  });
});

// ─── app/pages/home-page.js ──────────────────────────────────────────────────

describe('scaffold/app/pages/home-page.js', () => {
  it('does not call Store.dispatch (dispatch is event-log-only; home-page is store-agnostic)', () => {
    expect(read(scaffold, 'app/pages/home-page.js')).not.toContain('Store.dispatch');
  });

  it('does not hardcode a store import (store path differs between event-log and simple store)', () => {
    expect(read(scaffold, 'app/pages/home-page.js')).not.toContain("from '../../_lib/core/store/store");
  });
});

// ─── app/store/reducer.js ────────────────────────────────────────────────────

describe('scaffold/app/store/reducer.js', () => {
  it('exists', () => {
    expect(existsSync(join(scaffold, 'app/store/reducer.js'))).toBe(true);
  });

  it('exports a reducer function', () => {
    expect(read(scaffold, 'app/store/reducer.js')).toContain('export function reducer');
  });
});

// ─── vitest.config.js ────────────────────────────────────────────────────────

describe('scaffold/vitest.config.js', () => {
  it('declares setupFiles pointing to _lib/core/test-setup.js', () => {
    const src = read(scaffold, 'vitest.config.js');
    expect(src).toContain('setupFiles');
    expect(src).toContain('_lib/core/test-setup.js');
  });
});

// ─── package.json ────────────────────────────────────────────────────────────

describe('scaffold/package.json', () => {
  it('includes fake-indexeddb as a devDependency', () => {
    expect(scaffoldPkg().devDependencies).toHaveProperty('fake-indexeddb');
  });

  it('includes happy-dom as a devDependency', () => {
    expect(scaffoldPkg().devDependencies).toHaveProperty('happy-dom');
  });

  it('fake-indexeddb version matches monorepo root', () => {
    expect(scaffoldPkg().devDependencies['fake-indexeddb'])
      .toBe(rootPkg().devDependencies['fake-indexeddb']);
  });

  it('happy-dom version matches monorepo root', () => {
    expect(scaffoldPkg().devDependencies['happy-dom'])
      .toBe(rootPkg().devDependencies['happy-dom']);
  });
});

// ─── tests/unit/build.test.js ────────────────────────────────────────────────

describe('scaffold/tests/unit/build.test.js', () => {
  it('asserts bundled output has no _lib/ import paths', () => {
    expect(read(scaffold, 'tests/unit/build.test.js')).toContain('/_lib/');
  });

  it('build.test.js is identical between scaffold and reference-app', () => {
    expect(read(scaffold, 'tests/unit/build.test.js')).toBe(read(refApp, 'tests/unit/build.test.js'));
  });
});

// ─── tests/unit/store.test.js ────────────────────────────────────────────────

describe('scaffold/tests/unit/store.test.js', () => {
  it('exists', () => {
    expect(existsSync(join(scaffold, 'tests/unit/store.test.js'))).toBe(true);
  });

  it('imports Store from _lib/core/store/store.js', () => {
    expect(read(scaffold, 'tests/unit/store.test.js'))
      .toContain('_lib/core/store/store.js');
  });
});

// ─── reference-app/package.json parity ───────────────────────────────────────
//
// The reference app is the living example of a scaffolded app. Its package.json
// must mirror scaffold/package.json so that "scaffold a new app, compare to
// reference app" is a valid integration test once the CLI ships.

describe('reference-app/package.json matches scaffold/package.json', () => {
  function refPkg() { return JSON.parse(read(refApp, 'package.json')); }

  it('has the same scripts as scaffold (build, serve, dev, test, test:unit, test:watch, test:e2e)', () => {
    const scaffoldScripts = scaffoldPkg().scripts;
    const refScripts = refPkg().scripts;
    for (const [key, value] of Object.entries(scaffoldScripts)) {
      // Scaffold scripts contain %%PORT%% token; reference-app uses the resolved default (3000)
      const resolved = value.replaceAll('%%PORT%%', '3000');
      expect(refScripts[key], `scripts.${key} missing from reference-app`).toBe(resolved);
    }
  });

  it('declares the same devDependencies as scaffold', () => {
    const scaffoldDeps = scaffoldPkg().devDependencies;
    const refDeps = refPkg().devDependencies ?? {};
    for (const [pkg, version] of Object.entries(scaffoldDeps)) {
      expect(refDeps[pkg], `devDependencies.${pkg} missing from reference-app`).toBe(version);
    }
  });

  it('has "type": "module"', () => {
    expect(refPkg().type).toBe('module');
  });
});
