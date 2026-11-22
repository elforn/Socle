import { test, expect } from '@playwright/test';
import { execFileSync, spawn } from 'child_process';
import { cpSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Reproduces a GitHub Pages project-page deployment: the app is built with a
// non-root BASE_PATH and served under that prefix, exactly as deploy.yml does.
// Regression coverage for the router matching raw location.pathname and
// navigate() losing the prefix — see _lib/core/router/router.js.

const root     = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const prefix   = 'demo-app';
const port     = 4322;
const baseUrl  = `http://localhost:${port}/${prefix}/`;
const isolated = join(root, 'tests', '.base-path-build');
const wrapper  = join(root, 'tests', '.base-path-dist');

let server;

test.describe('Router — non-root BASE_PATH deployment', () => {
  test.beforeAll(async () => {
    // Builds into an isolated OUT_DIR — never the shared dist/ the main
    // webServer (port 4321) may be serving from concurrently.
    execFileSync('node', ['utils/build.js'], {
      cwd: root,
      env: { ...process.env, BASE_PATH: `/${prefix}/`, OUT_DIR: 'tests/.base-path-build' },
      stdio: 'inherit',
    });

    rmSync(wrapper, { recursive: true, force: true });
    mkdirSync(wrapper, { recursive: true });
    // Served at both the wrapper root and under the prefix: `serve --single`
    // falls back to whichever index.html sits at the serve root for any
    // unmatched deep path, and both copies reference the same /prefix/-baked
    // asset URLs, so either one resolves correctly.
    cpSync(isolated, wrapper, { recursive: true });
    cpSync(isolated, join(wrapper, prefix), { recursive: true });

    server = spawn('npx', ['--yes', 'serve', wrapper, '-l', String(port), '--single'], {
      cwd: root,
      stdio: 'pipe',
    });

    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      try {
        const res = await fetch(baseUrl);
        if (res.ok) return;
      } catch {}
      await new Promise(r => setTimeout(r, 200));
    }
    throw new Error('static server for base-path test did not become ready');
  });

  test.afterAll(() => {
    server?.kill();
    rmSync(wrapper, { recursive: true, force: true });
    rmSync(isolated, { recursive: true, force: true });
  });

  test('renders home, not not-found, at the prefixed root', async ({ page }) => {
    await page.goto(baseUrl);
    await expect(page.locator('app-router')).toBeAttached();
    await page.waitForFunction(() =>
      !!document.querySelector('app-router')?.shadowRoot?.querySelector('home-page')
    );
  });

  test('a hard reload at the prefixed root still renders home, not not-found', async ({ page }) => {
    await page.goto(baseUrl);
    await page.waitForFunction(() =>
      !!document.querySelector('app-router')?.shadowRoot?.querySelector('home-page')
    );

    await page.reload();
    await page.waitForFunction(() =>
      !!document.querySelector('app-router')?.shadowRoot?.querySelector('home-page')
    );
    expect(new URL(page.url()).pathname).toBe(`/${prefix}/`);
  });
});
