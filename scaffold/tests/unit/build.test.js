import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_ROOT  = join(__dirname, '../..');
const DIST      = join(APP_ROOT, 'dist');

function runBuild(env = {}) {
  execFileSync('node', [join(APP_ROOT, 'utils/build.js')], {
    env: { ...process.env, ...env },
    stdio: 'pipe',
  });
}

function readDist(filename) {
  return readFileSync(join(DIST, filename), 'utf8');
}

function mainFilename() {
  return readdirSync(DIST).find(f => /^main\.[a-f0-9]{8}\.js$/.test(f));
}

const { version } = JSON.parse(readFileSync(join(APP_ROOT, 'package.json'), 'utf8'));

describe('build — default (BASE_PATH=/)', () => {
  beforeAll(() => runBuild());

  it('produces a hashed main.js and source map in dist/', () => {
    const fn = mainFilename();
    expect(fn).toMatch(/^main\.[a-f0-9]{8}\.js$/);
    expect(existsSync(join(DIST, `${fn}.map`))).toBe(true);
  });

  it('produces sw.js, version.json, index.html, manifest.json', () => {
    for (const f of ['sw.js', 'version.json', 'index.html', 'manifest.json']) {
      expect(existsSync(join(DIST, f)), f).toBe(true);
    }
  });

  it('version.json contains version string and ISO buildTime', () => {
    const v = JSON.parse(readDist('version.json'));
    expect(v.version).toBe(version);
    expect(() => new Date(v.buildTime).toISOString()).not.toThrow();
  });

  it('version.json buildHash matches the sw.js cache hash', () => {
    const v = JSON.parse(readDist('version.json'));
    expect(v.buildHash).toMatch(/^[a-f0-9]{8}$/);
    expect(readDist('sw.js')).toContain(`'${version}-${v.buildHash}'`);
  });

  it('produces 404.html identical to index.html (deep-link fallback on static hosts)', () => {
    expect(existsSync(join(DIST, '404.html'))).toBe(true);
    expect(readDist('404.html')).toBe(readDist('index.html'));
  });

  it('main.js bundle contains version string and no __APP_VERSION__ token', () => {
    const content = readDist(mainFilename());
    expect(content).not.toContain('__APP_VERSION__');
    expect(content).toContain(version);
  });

  it('main.js bundle has no _lib/ import paths — all resolved by bundler', () => {
    const content = readDist(mainFilename());
    expect(content).not.toContain('/_lib/');
    expect(content).not.toContain('../_lib/');
  });

  it('dist/ contains no _lib/ directory — JS is bundled', () => {
    expect(existsSync(join(DIST, '_lib'))).toBe(false);
  });

  it('dist/app/ contains only icons — no component or page JS files', () => {
    expect(existsSync(join(DIST, 'app', 'icons'))).toBe(true);
    expect(existsSync(join(DIST, 'app', 'pages'))).toBe(false);
    expect(existsSync(join(DIST, 'app', 'components'))).toBe(false);
  });

  it('tokens.css is inlined in index.html — no _lib/ stylesheet link', () => {
    const html = readDist('index.html');
    expect(html).not.toContain('href="_lib/core/styles/tokens.css"');
    expect(html).toContain('--color-bg');
  });

  it('injects CACHE_VERSION into sw.js', () => {
    const sw = readDist('sw.js');
    expect(sw).not.toContain('%%CACHE_VERSION%%');
    expect(sw).toMatch(new RegExp(`'${version}-[a-f0-9]{8}'`));
  });

  it('injects BASE_PATH into sw.js', () => {
    const sw = readDist('sw.js');
    expect(sw).not.toContain('%%BASE_PATH%%');
    expect(sw).toContain("const BASE_PATH = '/'");
  });

  it('injects ASSETS array into sw.js with bundle and manifest', () => {
    const sw = readDist('sw.js');
    expect(sw).not.toContain('%%ASSETS%%');
    const parsed = sw.match(/const ASSETS = (\[.*?\]);/s);
    expect(parsed).not.toBeNull();
    const assets = JSON.parse(parsed[1]);
    expect(assets).toContain('/');
    expect(assets).toContain('/manifest.json');
    expect(assets.some(a => /^\/main\.[a-f0-9]{8}\.js$/.test(a))).toBe(true);
    expect(assets.some(a => a.endsWith('.test.js'))).toBe(false);
    expect(assets.some(a => a.includes('/_lib/'))).toBe(false);
  });

  it('replaces %%MAIN_JS%% token in index.html', () => {
    const html = readDist('index.html');
    expect(html).not.toContain('%%MAIN_JS%%');
    expect(html).toMatch(/src="\/main\.[a-f0-9]{8}\.js"/);
  });

  it('manifest.json is valid JSON with required installability fields', () => {
    const manifest = JSON.parse(readDist('manifest.json'));
    expect(manifest.start_url).toBeTruthy();
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  it('produces a deterministic hash — same content yields same filename', () => {
    const first = mainFilename();
    runBuild();
    expect(mainFilename()).toBe(first);
  });
});

describe('build — extra-assets hook', () => {
  const fontsDir  = join(APP_ROOT, 'app', 'fonts');
  const extraFile = join(APP_ROOT, 'utils', 'extra-assets.js');

  it('absent extra-assets.js is silently ignored — build succeeds, no extra assets', () => {
    runBuild();
    const sw     = readDist('sw.js');
    const parsed = sw.match(/const ASSETS = (\[.*?\]);/s);
    const assets = JSON.parse(parsed[1]);
    expect(assets.some(a => a.includes('/app/fonts/'))).toBe(false);
  });

  describe('declared dir exists', () => {
    beforeAll(() => {
      mkdirSync(fontsDir, { recursive: true });
      writeFileSync(join(fontsDir, 'test.woff2'), 'fake-font-data');
      writeFileSync(extraFile, "export const extraAssetDirs = ['app/fonts'];\n");
      runBuild();
    });
    afterAll(() => {
      rmSync(fontsDir, { recursive: true, force: true });
      rmSync(extraFile, { force: true });
    });

    it('copies the extra dir into dist/', () => {
      expect(existsSync(join(DIST, 'app', 'fonts', 'test.woff2'))).toBe(true);
    });

    it('adds extra files to the SW ASSETS precache list', () => {
      const sw     = readDist('sw.js');
      const parsed = sw.match(/const ASSETS = (\[.*?\]);/s);
      const assets = JSON.parse(parsed[1]);
      expect(assets).toContain('/app/fonts/test.woff2');
    });
  });

  describe('declared dir does not exist', () => {
    beforeAll(() => {
      writeFileSync(extraFile, "export const extraAssetDirs = ['app/nonexistent'];\n");
      runBuild();
    });
    afterAll(() => { rmSync(extraFile, { force: true }); });

    it('build succeeds when a declared dir is absent', () => {
      expect(existsSync(join(DIST, 'sw.js'))).toBe(true);
    });

    it('absent dir contributes nothing to SW ASSETS', () => {
      const sw     = readDist('sw.js');
      const parsed = sw.match(/const ASSETS = (\[.*?\]);/s);
      const assets = JSON.parse(parsed[1]);
      expect(assets.some(a => a.includes('/app/nonexistent/'))).toBe(false);
    });
  });
});

describe('build — custom BASE_PATH', () => {
  beforeAll(() => runBuild({ BASE_PATH: '/my-app/' }));

  it('prefixes all asset paths in sw.js ASSETS with BASE_PATH', () => {
    const sw = readDist('sw.js');
    const parsed = sw.match(/const ASSETS = (\[.*?\]);/s);
    const assets = JSON.parse(parsed[1]);
    expect(assets.every(a => a.startsWith('/my-app/'))).toBe(true);
  });

  it('prefixes main.js src in index.html with BASE_PATH', () => {
    const html = readDist('index.html');
    expect(html).toContain('src="/my-app/main.');
  });

  it('injects custom BASE_PATH into sw.js', () => {
    const sw = readDist('sw.js');
    expect(sw).not.toContain('%%BASE_PATH%%');
    expect(sw).toContain("const BASE_PATH = '/my-app/'");
  });
});
