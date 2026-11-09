import { test, expect } from '@playwright/test';

/*
 * Cascade invariants of _lib/core/styles/base.js, verified in a real browser.
 *
 * These cannot be unit tested: happy-dom does not resolve `:where(:host)`
 * against the host element at all (getComputedStyle returns ''), so the
 * co-located core/styles/base.test.js can only assert precedence between
 * competing rules, not that the zero-specificity defaults apply. Chromium and
 * Firefox both resolve it correctly, so the defaults are asserted here.
 *
 * The [hidden] case is the load-bearing one. `[hidden]` is a bare attribute
 * selector at (0,1,0) on purpose: it ties a single-class component rule and
 * wins on cascade order, because adopted stylesheets are ordered after the
 * component's own <style>. year-header's `.confirm-actions` (display: flex,
 * hidden by default) and modal-dialog's `.footer` both depend on that. If the
 * selector is ever weakened to `:where([hidden])` the class rule wins and
 * hidden elements render.
 */

const YEAR_HEADER = ['app-router', 'home-page', 'year-header'];
const HOME_PAGE = ['app-router', 'home-page'];

// The app has more hidden elements than this; the floor only proves the walk
// found a representative set rather than passing vacuously on an empty result.
const MIN_HIDDEN_ELEMENTS = 5;

// Walks a chain of custom-element tags through their shadow roots, then
// optionally queries within the last one. Inlined per evaluate call rather than
// shared, because page functions are serialised and cannot close over scope.
const computed = (page, prop, chain, selector) =>
  page.evaluate(({ chain, selector, prop }) => {
    let root = document;
    for (const tag of chain) root = root.querySelector(tag).shadowRoot;
    const el = selector ? root.querySelector(selector) : root.host;
    return getComputedStyle(el)[prop];
  }, { chain, selector, prop });

async function waitForPage(page) {
  await page.waitForFunction(() =>
    !!document.querySelector('app-router')?.shadowRoot?.querySelector('home-page')
  );
}

test.describe('Base stylesheet cascade', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForPage(page);
  });

  test('zero-specificity :host default applies to a component that declares none', async ({ page }) => {
    expect(await computed(page, 'display', HOME_PAGE, 'goal-dialog')).toBe('block');
  });

  // No reference-app component sets a non-block display on a bare :host — every
  // one of them uses the host as a positioning context with structurally
  // necessary children, which is why this bug went unnoticed here. The override
  // direction is therefore guarded with a probe that adopts the *shipped* sheet
  // off a live component, so it exercises the real base.js rather than a copy.
  test('a component :host rule overrides the zero-specificity default', async ({ page }) => {
    const display = await page.evaluate(() => {
      const el = document.createElement('probe-host');
      document.body.appendChild(el);
      const root = el.attachShadow({ mode: 'open' });
      root.innerHTML = '<style>:host { display: flex; }</style>';
      root.adoptedStyleSheets =
        document.querySelector('app-router').shadowRoot.adoptedStyleSheets;
      const display = getComputedStyle(el).display;
      el.remove();
      return display;
    });
    expect(display).toBe('flex');
  });

  test('box-sizing: border-box applies to the host and inherits to descendants', async ({ page }) => {
    expect(await computed(page, 'boxSizing', YEAR_HEADER)).toBe('border-box');
    expect(await computed(page, 'boxSizing', YEAR_HEADER, '#import-reload')).toBe('border-box');
  });

  test('[hidden] collapses a flex element that a class rule would otherwise display', async ({ page }) => {
    // Guard against a trivial pass: the class rule must really be display: flex,
    // so that 'none' can only come from the base sheet's [hidden] rule winning.
    const unhidden = await page.evaluate((chain) => {
      let root = document;
      for (const tag of chain) root = root.querySelector(tag).shadowRoot;
      const el = root.querySelector('#import-success-actions');
      el.removeAttribute('hidden');
      const display = getComputedStyle(el).display;
      el.setAttribute('hidden', '');
      return display;
    }, YEAR_HEADER);
    expect(unhidden).toBe('flex');

    expect(await computed(page, 'display', YEAR_HEADER, '#import-success-actions')).toBe('none');
  });

  // Exhaustive, and the reason it is worth the lines: dropping the `!important`
  // that [hidden] used to carry means any component rule above (0,1,0) — an id
  // selector, a two-class rule — now outranks it and renders a hidden element,
  // which also puts it back in the accessibility tree. Specificity math by hand
  // missed two of the five elements this catches, so it is checked at runtime.
  test('every [hidden] element in every shadow root computes display: none', async ({ page }) => {
    // Open the year menu so its hidden menu-items are mounted and styled.
    await page.evaluate((chain) => {
      let root = document;
      for (const tag of chain) root = root.querySelector(tag).shadowRoot;
      root.querySelector('#menu')?.showModal?.();
    }, YEAR_HEADER);

    const { leaked, total } = await page.evaluate(() => {
      const leaked = [];
      let total = 0;
      const label = el =>
        el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '') +
        (typeof el.className === 'string' && el.className.trim()
          ? '.' + el.className.trim().split(/\s+/).join('.') : '');
      const walk = (root, path) => {
        for (const el of root.querySelectorAll('*')) {
          if (el.hasAttribute('hidden')) {
            total++;
            const display = getComputedStyle(el).display;
            if (display !== 'none') leaked.push({ path: `${path} > ${label(el)}`, display });
          }
          if (el.shadowRoot) walk(el.shadowRoot, `${path} > ${el.tagName.toLowerCase()}`);
        }
      };
      walk(document, 'document');
      return { leaked, total };
    });

    expect(leaked).toEqual([]);
    expect(total).toBeGreaterThan(MIN_HIDDEN_ELEMENTS);
  });
});
