import { test, expect } from '@playwright/test';

test.describe('Router — forward navigation', () => {
  test('renders home-page at /', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('app-router')).toBeAttached();
    await page.waitForFunction(() =>
      !!document.querySelector('app-router')?.shadowRoot?.querySelector('home-page')
    );
  });

  test('renders not-found-page for an unknown route', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      history.pushState(null, '', '/nonexistent');
      window.dispatchEvent(new CustomEvent('navigate', { detail: { path: '/nonexistent' } }));
    });
    await page.waitForFunction(() =>
      !!document.querySelector('app-router')?.shadowRoot?.querySelector('not-found-page')
    );
  });
});

test.describe('Router — back navigation', () => {
  test('returns to home-page after browser back', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() =>
      !!document.querySelector('app-router')?.shadowRoot?.querySelector('home-page')
    );

    await page.evaluate(() => {
      history.pushState(null, '', '/nonexistent');
      window.dispatchEvent(new CustomEvent('navigate', { detail: { path: '/nonexistent' } }));
    });
    await page.waitForFunction(() =>
      !!document.querySelector('app-router')?.shadowRoot?.querySelector('not-found-page')
    );

    await page.goBack();
    await page.waitForFunction(() =>
      !!document.querySelector('app-router')?.shadowRoot?.querySelector('home-page')
    );
  });
});

test.describe('Router — SW navigation intercept', () => {
  // SW registration is Phase 5 (<sw-manager>). Re-enable after Phase 5.
  test.skip('serves app shell on hard refresh at a non-root URL', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await page.evaluate(() => {
      history.pushState(null, '', '/nonexistent');
      window.dispatchEvent(new CustomEvent('navigate', { detail: { path: '/nonexistent' } }));
    });
    await page.reload();
    await page.waitForFunction(() =>
      !!document.querySelector('app-router')?.shadowRoot?.querySelector('not-found-page')
    );
  });
});
