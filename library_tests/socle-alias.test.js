/**
 * socle/ alias tests — library developer tests only.
 *
 * The `socle/` specifier is the library's stable address. Without it, code can
 * only reach _lib/ by relative path, which encodes the importer's depth and is
 * unresolvable from shared code kept outside the app tree. A 1.3.1 update that
 * overwrote a consumer's hand-added esbuild flag broke exactly that case, so the
 * regression test here builds a real scaffolded app whose shared module lives
 * outside the app and is symlinked in.
 *
 * Run automatically with `npm test`.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync, readdirSync, symlinkSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import { scaffoldApp } from '../cli/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmpDirs = [];

afterAll(() => {
  for (const dir of tmpDirs) rmSync(dir, { recursive: true, force: true });
});

const OPTIONS = {
  appName: 'Alias App',
  appShortName: 'Alias',
  appDescription: 'Alias resolution fixture',
  githubUser: 'testuser',
  includeSync: false,
  includeAppHeader: false,
  includeModal: false,
  includeToast: false,
  accentColor: '#FF0000',
  version: '0.1.0',
};

// A shared module outside the app, symlinked in — the layout that cannot work
// with relative specifiers, since ../../core/ from its real path leaves the app.
function makeFixture() {
  const parent = mkdtempSync(join(os.tmpdir(), 'socle-alias-'));
  tmpDirs.push(parent);

  const app = join(parent, 'app-a');
  mkdirSync(app);
  scaffoldApp(OPTIONS, app);
  symlinkSync(join(root, 'node_modules'), join(app, 'node_modules'));

  const shared = join(parent, 'shared');
  mkdirSync(shared);
  writeFileSync(join(shared, 'touch-target.js'), [
    "import { AppElement } from 'socle/core/app-element.js';",
    'export class TouchTarget extends AppElement {',
    "  template() { return '<main>shared</main>'; }",
    '}',
    "customElements.define('touch-target', TouchTarget);",
  ].join('\n'));

  symlinkSync(shared, join(app, 'app', 'shared'));

  const mainPath = join(app, 'app', 'main.js');
  writeFileSync(mainPath, "import './shared/touch-target.js';\n" + readFileSync(mainPath, 'utf8'));

  return app;
}

function bundleOf(app) {
  const dist = join(app, 'dist');
  const name = readdirSync(dist).find(f => /^main\.[a-f0-9]{8}\.js$/.test(f));
  return readFileSync(join(dist, name), 'utf8');
}

describe('socle/ alias — esbuild', () => {
  let app;

  // Throws with esbuild's own resolution error if socle/ cannot be resolved, which
  // fails every test in this block — that failure is the regression being guarded.
  beforeAll(() => {
    app = makeFixture();
    execFileSync('node', [join(app, 'utils/build.js')], { stdio: 'pipe' });
  });

  it('bundles shared code outside the app tree that imports socle/', () => {
    expect(bundleOf(app)).toContain('touch-target');
  });

  it('leaves no unresolved socle/ specifier in the output', () => {
    expect(bundleOf(app)).not.toContain("'socle/");
  });

  it('needs no preserveSymlinks flag in build.js', () => {
    expect(readFileSync(join(root, 'scaffold/utils/build.js'), 'utf8')).not.toContain('preserveSymlinks');
  });
});

// The Vitest half of the alias is the half an existing app must add by hand, so
// assert the value the config actually computes — not merely that a line is present.
describe('socle/ alias — vitest', () => {
  it('resolves to a directory holding the real library code', async () => {
    const config = (await import('../reference-app/vitest.config.js')).default;
    const target = config.resolve.alias.socle;

    expect(existsSync(join(target, 'core', 'app-element.js'))).toBe(true);
    expect(existsSync(join(target, 'core', 'store', 'store.js'))).toBe(true);
  });

  it('resolves to an absolute path, since a relative one would anchor to the CWD', async () => {
    const config = (await import('../reference-app/vitest.config.js')).default;
    expect(config.resolve.alias.socle.startsWith('/')).toBe(true);
  });
});
