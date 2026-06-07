import { describe, it, expect, afterAll, vi } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import os from 'os';
import { replaceTokens, replaceBlockTokens, scaffoldApp, updateLib, addModule, removeModule, findModuleImports, ensureDevHttps } from './index.js';

// ── unit: replaceTokens ───────────────────────────────────────────────────────

describe('replaceTokens', () => {
  it('substitutes known tokens', () => {
    const result = replaceTokens('Hello %%APP_NAME%%!', { APP_NAME: 'My App' });
    expect(result).toBe('Hello My App!');
  });

  it('substitutes multiple tokens', () => {
    const result = replaceTokens('%%APP_NAME%% — %%APP_SHORT_NAME%%', {
      APP_NAME: 'My App',
      APP_SHORT_NAME: 'App',
    });
    expect(result).toBe('My App — App');
  });

  it('leaves build-time tokens untouched', () => {
    const content = 'src="%%MAIN_JS%%" base="%%BASE_PATH%%"';
    expect(replaceTokens(content, { APP_NAME: 'x' })).toBe(content);
  });

  it('replaces all occurrences', () => {
    const result = replaceTokens('%%APP_NAME%% and %%APP_NAME%%', { APP_NAME: 'Socle' });
    expect(result).toBe('Socle and Socle');
  });
});

// ── unit: replaceBlockTokens ──────────────────────────────────────────────────

describe('replaceBlockTokens', () => {
  it('substitutes {{TOKEN}} patterns', () => {
    const result = replaceBlockTokens('# {{APP_NAME}}\n{{APP_DESCRIPTION}}', {
      APP_NAME: 'My App',
      APP_DESCRIPTION: 'A cool app',
    });
    expect(result).toBe('# My App\nA cool app');
  });

  it('leaves unrecognised block tokens untouched', () => {
    const content = '{{UNKNOWN}}';
    expect(replaceBlockTokens(content, {})).toBe(content);
  });
});

// ── integration: scaffoldApp ──────────────────────────────────────────────────

const tmpDirs = [];

function makeTmpDir() {
  const dir = mkdtempSync(join(os.tmpdir(), 'socle-test-'));
  tmpDirs.push(dir);
  return dir;
}

afterAll(() => {
  for (const dir of tmpDirs) rmSync(dir, { recursive: true, force: true });
});

const BASE_OPTIONS = {
  appName: 'Test App',
  appShortName: 'Test',
  appDescription: 'A test application',
  githubUser: 'testuser',
  includeSync: false,
  includeAppHeader: false,
  includeModal: false,
  includeToast: false,
  accentColor: '#FF0000',
  version: '0.1.0',
};

describe('scaffoldApp', () => {
  it('creates the expected directory structure', () => {
    const dest = makeTmpDir();
    scaffoldApp(BASE_OPTIONS, dest);

    expect(existsSync(join(dest, 'index.html'))).toBe(true);
    expect(existsSync(join(dest, 'manifest.json'))).toBe(true);
    expect(existsSync(join(dest, 'package.json'))).toBe(true);
    expect(existsSync(join(dest, 'app', 'main.js'))).toBe(true);
    expect(existsSync(join(dest, '_lib', 'core', 'app-element.js'))).toBe(true);
    expect(existsSync(join(dest, '_lib', 'modules', 'gestures', 'gestures.js'))).toBe(true);
  });

  it('replaces all %%APP_NAME%% tokens in output files', () => {
    const dest = makeTmpDir();
    scaffoldApp(BASE_OPTIONS, dest);

    const filesToCheck = [
      join(dest, 'index.html'),
      join(dest, 'manifest.json'),
      join(dest, 'package.json'),
      join(dest, 'app', 'main.js'),
      join(dest, 'app', 'pages', 'home-page.js'),
    ];

    for (const file of filesToCheck) {
      expect(readFileSync(file, 'utf8'), `${file} still has %%APP_NAME%%`).not.toContain('%%APP_NAME%%');
    }
  });

  it('replaces all user-supplied tokens in manifest.json', () => {
    const dest = makeTmpDir();
    scaffoldApp(BASE_OPTIONS, dest);
    const manifest = readFileSync(join(dest, 'manifest.json'), 'utf8');
    expect(manifest).not.toContain('%%APP_SHORT_NAME%%');
    expect(manifest).not.toContain('%%APP_DESCRIPTION%%');
    expect(manifest).not.toContain('%%LANG%%');
    expect(manifest).toContain('Test App');
    expect(manifest).toContain('Test');
    expect(manifest).toContain('A test application');
  });

  it('replaces %%LANG%% in index.html', () => {
    const dest = makeTmpDir();
    scaffoldApp(BASE_OPTIONS, dest);
    const html = readFileSync(join(dest, 'index.html'), 'utf8');
    expect(html).not.toContain('%%LANG%%');
    expect(html).toContain('lang="en"');
  });

  it('leaves build-time tokens in place', () => {
    const dest = makeTmpDir();
    scaffoldApp(BASE_OPTIONS, dest);
    expect(readFileSync(join(dest, 'index.html'), 'utf8')).toContain('%%MAIN_JS%%');
    expect(readFileSync(join(dest, 'manifest.json'), 'utf8')).toContain('%%BASE_PATH%%');
  });

  it('writes correct lib-version.json', () => {
    const dest = makeTmpDir();
    scaffoldApp(BASE_OPTIONS, dest);

    const lv = JSON.parse(readFileSync(join(dest, '_lib', 'lib-version.json'), 'utf8'));
    expect(lv.version).toBe('0.1.0');
    expect(lv.modules).toEqual(['core', 'gestures']);
    expect(lv.scaffolded).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('generates CLAUDE.md and removes the template', () => {
    const dest = makeTmpDir();
    scaffoldApp(BASE_OPTIONS, dest);

    expect(existsSync(join(dest, 'CLAUDE.md'))).toBe(true);
    expect(existsSync(join(dest, 'CLAUDE.md.template'))).toBe(false);

    const claude = readFileSync(join(dest, 'CLAUDE.md'), 'utf8');
    expect(claude).toContain('Test App');
    expect(claude).toContain('A test application');
    expect(claude).toContain('0.1.0');
    expect(claude).toContain('core, gestures');
    expect(claude).not.toContain('{{APP_NAME}}');
  });

  it('patches --color-accent in tokens.css', () => {
    const dest = makeTmpDir();
    scaffoldApp(BASE_OPTIONS, dest);

    const css = readFileSync(join(dest, '_lib', 'core', 'styles', 'tokens.css'), 'utf8');
    expect(css).toContain('--color-accent: #FF0000;');
  });

  it('does not copy sync module when includeSync is false', () => {
    const dest = makeTmpDir();
    scaffoldApp(BASE_OPTIONS, dest);
    expect(existsSync(join(dest, '_lib', 'modules', 'sync'))).toBe(false);
  });

  it('copies sync module when includeSync is true', () => {
    const dest = makeTmpDir();
    scaffoldApp({ ...BASE_OPTIONS, includeSync: true }, dest);
    expect(existsSync(join(dest, '_lib', 'modules', 'sync', 'sync.js'))).toBe(true);

    const lv = JSON.parse(readFileSync(join(dest, '_lib', 'lib-version.json'), 'utf8'));
    expect(lv.modules).toContain('sync');
  });

  describe('store type selection', () => {
    it('event-log (default): main.js imports store.js and reducer', () => {
      const dest = makeTmpDir();
      scaffoldApp({ ...BASE_OPTIONS, storeType: 'event-log' }, dest);
      const main = readFileSync(join(dest, 'app', 'main.js'), 'utf8');
      expect(main).toContain("from '../_lib/core/store/store.js'");
      expect(main).toContain("from './store/reducer.js'");
      expect(main).toContain('reducer');
    });

    it('event-log: _lib/core/store has store.js and store.test.js but not store-simple.*', () => {
      const dest = makeTmpDir();
      scaffoldApp({ ...BASE_OPTIONS, storeType: 'event-log' }, dest);
      expect(existsSync(join(dest, '_lib', 'core', 'store', 'store.js'))).toBe(true);
      expect(existsSync(join(dest, '_lib', 'core', 'store', 'store.test.js'))).toBe(true);
      expect(existsSync(join(dest, '_lib', 'core', 'store', 'store-simple.js'))).toBe(false);
      expect(existsSync(join(dest, '_lib', 'core', 'store', 'store-simple.test.js'))).toBe(false);
    });

    it('event-log: app/store/reducer.js exists', () => {
      const dest = makeTmpDir();
      scaffoldApp({ ...BASE_OPTIONS, storeType: 'event-log' }, dest);
      expect(existsSync(join(dest, 'app', 'store', 'reducer.js'))).toBe(true);
    });

    it('event-log: lib-version.json records store as event-log', () => {
      const dest = makeTmpDir();
      scaffoldApp({ ...BASE_OPTIONS, storeType: 'event-log' }, dest);
      const lv = JSON.parse(readFileSync(join(dest, '_lib', 'lib-version.json'), 'utf8'));
      expect(lv.store).toBe('event-log');
    });

    it('simple: main.js imports store.js with no reducer', () => {
      const dest = makeTmpDir();
      scaffoldApp({ ...BASE_OPTIONS, storeType: 'simple' }, dest);
      const main = readFileSync(join(dest, 'app', 'main.js'), 'utf8');
      expect(main).toContain("from '../_lib/core/store/store.js'");
      expect(main).not.toContain("from './store/reducer.js'");
      expect(main).not.toContain(', reducer }');
    });

    it('simple: boot call has no reducer argument', () => {
      const dest = makeTmpDir();
      scaffoldApp({ ...BASE_OPTIONS, storeType: 'simple' }, dest);
      const main = readFileSync(join(dest, 'app', 'main.js'), 'utf8');
      expect(main).toContain("await boot({ dbName:");
      expect(main).not.toContain('reducer });');
    });

    it('simple: _lib/core/store has store.js and store.test.js (renamed from store-simple.*) but not store-simple.*', () => {
      const dest = makeTmpDir();
      scaffoldApp({ ...BASE_OPTIONS, storeType: 'simple' }, dest);
      expect(existsSync(join(dest, '_lib', 'core', 'store', 'store.js'))).toBe(true);
      expect(existsSync(join(dest, '_lib', 'core', 'store', 'store.test.js'))).toBe(true);
      expect(existsSync(join(dest, '_lib', 'core', 'store', 'store-simple.js'))).toBe(false);
      expect(existsSync(join(dest, '_lib', 'core', 'store', 'store-simple.test.js'))).toBe(false);
    });

    it('simple: app/store/reducer.js does not exist', () => {
      const dest = makeTmpDir();
      scaffoldApp({ ...BASE_OPTIONS, storeType: 'simple' }, dest);
      expect(existsSync(join(dest, 'app', 'store', 'reducer.js'))).toBe(false);
    });

    it('simple: lib-version.json records store as simple', () => {
      const dest = makeTmpDir();
      scaffoldApp({ ...BASE_OPTIONS, storeType: 'simple' }, dest);
      const lv = JSON.parse(readFileSync(join(dest, '_lib', 'lib-version.json'), 'utf8'));
      expect(lv.store).toBe('simple');
    });
  });
});

// ── integration: updateLib ────────────────────────────────────────────────────

describe('updateLib', () => {
  it('throws when _lib/lib-version.json is missing', async () => {
    const dest = makeTmpDir();
    await expect(updateLib(dest, () => Promise.resolve('y')))
      .rejects.toThrow('No _lib/lib-version.json found');
  });

  it('reports already up to date when versions match', async () => {
    const dest = makeTmpDir();
    scaffoldApp(BASE_OPTIONS, dest);

    // Set lib-version to the current monorepo version
    const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
    const lvPath = join(dest, '_lib', 'lib-version.json');
    const lv = JSON.parse(readFileSync(lvPath, 'utf8'));
    lv.version = version;
    writeFileSync(lvPath, JSON.stringify(lv, null, 2));

    let logged = '';
    const orig = console.log;
    console.log = s => { logged += s + '\n'; };
    await updateLib(dest, () => Promise.resolve('y'));
    console.log = orig;

    expect(logged).toContain('Already up to date');
  });

  it('updates _lib/ and rewrites lib-version.json when outdated', async () => {
    const dest = makeTmpDir();
    scaffoldApp(BASE_OPTIONS, dest);

    // Force an old version so the update triggers
    const lvPath = join(dest, '_lib', 'lib-version.json');
    const lv = JSON.parse(readFileSync(lvPath, 'utf8'));
    lv.version = '0.0.1';
    writeFileSync(lvPath, JSON.stringify(lv, null, 2));

    await updateLib(dest, () => Promise.resolve('y'));

    const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
    const updated = JSON.parse(readFileSync(lvPath, 'utf8'));
    expect(updated.version).toBe(version);
  });

  it('preserves accent color across update', async () => {
    const dest = makeTmpDir();
    scaffoldApp({ ...BASE_OPTIONS, accentColor: '#ABCDEF' }, dest);

    const lvPath = join(dest, '_lib', 'lib-version.json');
    const lv = JSON.parse(readFileSync(lvPath, 'utf8'));
    lv.version = '0.0.1';
    writeFileSync(lvPath, JSON.stringify(lv, null, 2));

    await updateLib(dest, () => Promise.resolve('y'));

    const css = readFileSync(join(dest, '_lib', 'core', 'styles', 'tokens.css'), 'utf8');
    expect(css).toContain('--color-accent: #ABCDEF;');
  });

  it('re-applies store-simple.* → store.* rename after update for simple-store apps', async () => {
    const dest = makeTmpDir();
    scaffoldApp({ ...BASE_OPTIONS, storeType: 'simple' }, dest);

    const lvPath = join(dest, '_lib', 'lib-version.json');
    const lv = JSON.parse(readFileSync(lvPath, 'utf8'));
    lv.version = '0.0.1';
    writeFileSync(lvPath, JSON.stringify(lv, null, 2));

    await updateLib(dest, () => Promise.resolve('y'));

    expect(existsSync(join(dest, '_lib', 'core', 'store', 'store.js'))).toBe(true);
    expect(existsSync(join(dest, '_lib', 'core', 'store', 'store.test.js'))).toBe(true);
    expect(existsSync(join(dest, '_lib', 'core', 'store', 'store-simple.js'))).toBe(false);
    expect(existsSync(join(dest, '_lib', 'core', 'store', 'store-simple.test.js'))).toBe(false);
  });

  it('removes store-simple.* after update for event-log apps', async () => {
    const dest = makeTmpDir();
    scaffoldApp({ ...BASE_OPTIONS, storeType: 'event-log' }, dest);

    const lvPath = join(dest, '_lib', 'lib-version.json');
    const lv = JSON.parse(readFileSync(lvPath, 'utf8'));
    lv.version = '0.0.1';
    writeFileSync(lvPath, JSON.stringify(lv, null, 2));

    await updateLib(dest, () => Promise.resolve('y'));

    expect(existsSync(join(dest, '_lib', 'core', 'store', 'store.js'))).toBe(true);
    expect(existsSync(join(dest, '_lib', 'core', 'store', 'store.test.js'))).toBe(true);
    expect(existsSync(join(dest, '_lib', 'core', 'store', 'store-simple.js'))).toBe(false);
    expect(existsSync(join(dest, '_lib', 'core', 'store', 'store-simple.test.js'))).toBe(false);
  });

});

// ── unit: findModuleImports ───────────────────────────────────────────────────

describe('findModuleImports', () => {
  it('returns files that import from the given module', () => {
    const dest = makeTmpDir();
    scaffoldApp(BASE_OPTIONS, dest);  // includeGestures: true (default) — home-page.js imports gestures

    const matches = findModuleImports(join(dest, 'app'), 'gestures');
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.some(f => f.includes('home-page.js'))).toBe(true);
  });

  it('returns empty array when no files import from the module', () => {
    const dest = makeTmpDir();
    scaffoldApp(BASE_OPTIONS, dest);  // sync not included

    expect(findModuleImports(join(dest, 'app'), 'sync')).toEqual([]);
  });

  it('returns empty array when app dir does not exist', () => {
    const dest = makeTmpDir();
    expect(findModuleImports(join(dest, 'app'), 'gestures')).toEqual([]);
  });
});

// ── integration: addModule ────────────────────────────────────────────────────

describe('addModule', () => {
  it('copies module files and updates lib-version.json', () => {
    const dest = makeTmpDir();
    scaffoldApp(BASE_OPTIONS, dest);  // includeSync: false

    addModule(dest, 'sync');

    expect(existsSync(join(dest, '_lib', 'modules', 'sync', 'sync.js'))).toBe(true);
    const lv = JSON.parse(readFileSync(join(dest, '_lib', 'lib-version.json'), 'utf8'));
    expect(lv.modules).toContain('sync');
  });

  it('no-ops and logs when module is already installed', () => {
    const dest = makeTmpDir();
    scaffoldApp(BASE_OPTIONS, dest);  // gestures included by default

    let logged = '';
    const orig = console.log;
    console.log = s => { logged += s + '\n'; };
    addModule(dest, 'gestures');
    console.log = orig;

    expect(logged).toContain('already installed');
    const lv = JSON.parse(readFileSync(join(dest, '_lib', 'lib-version.json'), 'utf8'));
    expect(lv.modules.filter(m => m === 'gestures').length).toBe(1);
  });

  it('throws on unknown module name', () => {
    const dest = makeTmpDir();
    scaffoldApp(BASE_OPTIONS, dest);

    expect(() => addModule(dest, 'unknown-module')).toThrow('Unknown module');
  });

  it('throws when lib-version.json is missing', () => {
    const dest = makeTmpDir();
    expect(() => addModule(dest, 'sync')).toThrow('No _lib/lib-version.json found');
  });
});

// ── integration: removeModule ─────────────────────────────────────────────────

describe('removeModule', () => {
  it('removes module directory and updates lib-version.json', async () => {
    const dest = makeTmpDir();
    scaffoldApp(BASE_OPTIONS, dest);  // gestures: true (default)
    // Add sync via addModule so no scaffold page imports it in app/
    addModule(dest, 'sync');

    await removeModule(dest, 'sync', () => Promise.resolve('y'));

    expect(existsSync(join(dest, '_lib', 'modules', 'sync'))).toBe(false);
    const lv = JSON.parse(readFileSync(join(dest, '_lib', 'lib-version.json'), 'utf8'));
    expect(lv.modules).not.toContain('sync');
  });

  it('no-ops and logs when module is not installed', async () => {
    const dest = makeTmpDir();
    scaffoldApp(BASE_OPTIONS, dest);  // includeSync: false

    let logged = '';
    const orig = console.log;
    console.log = s => { logged += s + '\n'; };
    await removeModule(dest, 'sync', () => Promise.resolve('y'));
    console.log = orig;

    expect(logged).toContain('not installed');
  });

  it('warns about app/ imports and proceeds when user confirms', async () => {
    const dest = makeTmpDir();
    scaffoldApp(BASE_OPTIONS, dest);  // home-page.js imports gestures (includeGestures: true)

    const ask = vi.fn().mockResolvedValue('y');
    await removeModule(dest, 'gestures', ask);

    expect(ask).toHaveBeenCalled();
    expect(existsSync(join(dest, '_lib', 'modules', 'gestures'))).toBe(false);
    const lv = JSON.parse(readFileSync(join(dest, '_lib', 'lib-version.json'), 'utf8'));
    expect(lv.modules).not.toContain('gestures');
  });

  it('aborts removal when user declines after import warning', async () => {
    const dest = makeTmpDir();
    scaffoldApp(BASE_OPTIONS, dest);  // home-page.js imports gestures (includeGestures: true)

    const ask = vi.fn().mockResolvedValue('n');
    await removeModule(dest, 'gestures', ask);

    expect(ask).toHaveBeenCalled();
    expect(existsSync(join(dest, '_lib', 'modules', 'gestures'))).toBe(true);
  });

  it('throws when attempting to remove core', async () => {
    const dest = makeTmpDir();
    scaffoldApp(BASE_OPTIONS, dest);

    await expect(removeModule(dest, 'core', () => Promise.resolve('y')))
      .rejects.toThrow("Cannot remove 'core'");
  });

  it('throws when lib-version.json is missing', async () => {
    const dest = makeTmpDir();
    await expect(removeModule(dest, 'sync', () => Promise.resolve('y')))
      .rejects.toThrow('No _lib/lib-version.json found');
  });
});

// ── ensureDevHttps ────────────────────────────────────────────────────────────

describe('ensureDevHttps', () => {
  function writePkg(dir, scripts) {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ scripts }, null, 2) + '\n');
  }
  function readPkg(dir) {
    return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  }

  it('adds dev:https derived from the dev script', () => {
    const dir = makeTmpDir();
    writePkg(dir, { dev: 'node utils/build.js && npx serve dist --listen 3000 --single' });
    ensureDevHttps(join(dir, 'package.json'));
    const pkg = readPkg(dir);
    expect(pkg.scripts['dev:https']).toBe(
      'node utils/build.js && npx serve dist --listen tcp:0.0.0.0:3000 --single --ssl-cert local.pem --ssl-key local-key.pem'
    );
  });

  it('is idempotent — does not overwrite an existing dev:https', () => {
    const dir = makeTmpDir();
    const existing = 'custom dev:https command';
    writePkg(dir, {
      dev: 'node utils/build.js && npx serve dist --listen 3000 --single',
      'dev:https': existing,
    });
    ensureDevHttps(join(dir, 'package.json'));
    expect(readPkg(dir).scripts['dev:https']).toBe(existing);
  });

  it('uses port 3000 as fallback when dev script has no --listen port', () => {
    const dir = makeTmpDir();
    writePkg(dir, { dev: 'node utils/build.js' });
    ensureDevHttps(join(dir, 'package.json'));
    expect(readPkg(dir).scripts['dev:https']).toContain('tcp:0.0.0.0:3000');
  });

  it('handles a non-standard port in the dev script', () => {
    const dir = makeTmpDir();
    writePkg(dir, { dev: 'node utils/build.js && npx serve dist --listen 8080 --single' });
    ensureDevHttps(join(dir, 'package.json'));
    expect(readPkg(dir).scripts['dev:https']).toContain('tcp:0.0.0.0:8080');
  });

  it('preserves all other scripts when writing', () => {
    const dir = makeTmpDir();
    writePkg(dir, {
      build: 'node utils/build.js',
      dev: 'node utils/build.js && npx serve dist --listen 3000 --single',
      test: 'vitest run',
    });
    ensureDevHttps(join(dir, 'package.json'));
    const pkg = readPkg(dir);
    expect(pkg.scripts.build).toBe('node utils/build.js');
    expect(pkg.scripts.test).toBe('vitest run');
    expect(pkg.scripts['dev:https']).toBeTruthy();
  });
});
