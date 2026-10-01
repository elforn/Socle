import { test, expect } from '@playwright/test';

const currentYear = new Date().getFullYear();

test.use({ viewport: { width: 390, height: 844 } });

// `fixedHeight` plus modal-dialog's scrollable body had no end-to-end demonstration: no
// dialog in the app starts with content long enough to scroll. The Activity tab is that
// demonstration by design — goal-dialog.js notes "Activity's height grows with event
// count", which is exactly why it sets fixedHeight — it just needs history to exist.
//
// This drives real history in through the UI (hold-drag on the progress bar, the only
// E2E coverage that gesture has) and then asserts the scroll container behaves.

async function waitForPage(page) {
  await page.waitForFunction(() =>
    !!document.querySelector('app-router')?.shadowRoot?.querySelector('home-page')
  );
}

const clickIn = (page, sel) => page.evaluate((s) => {
  document.querySelector('app-router').shadowRoot
    .querySelector('home-page').shadowRoot.querySelector(s).click();
}, sel);

async function waitForDialogOpen(page) {
  await page.waitForFunction(() => {
    const d = document.querySelector('app-router')?.shadowRoot
      ?.querySelector('home-page')?.shadowRoot
      ?.querySelector('goal-dialog')?.shadowRoot
      ?.querySelector('#modal')?.shadowRoot?.querySelector('dialog');
    return d?.open;
  });
}

const modalMetrics = (page) => page.evaluate(() => {
  const m = document.querySelector('app-router').shadowRoot
    .querySelector('home-page').shadowRoot
    .querySelector('goal-dialog').shadowRoot.querySelector('#modal');
  const body = m.shadowRoot.querySelector('.body');
  const dlg = m.shadowRoot.querySelector('dialog');
  return {
    activeTab: m.activeTab,
    sheetHeight: Math.round(dlg.getBoundingClientRect().height),
    scrollHeight: body.scrollHeight,
    clientHeight: body.clientHeight,
    overflowY: getComputedStyle(body).overflowY,
    rows: m.querySelectorAll('#activity-list .activity-item').length,
  };
});

test.describe('Dialog scrollable body', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/${currentYear}`);
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await waitForPage(page);

    await clickIn(page, '#capstone-edit-btn');
    await clickIn(page, '#add-capstone');
    await waitForDialogOpen(page);
    await page.evaluate(() => {
      const inp = document.querySelector('app-router').shadowRoot
        .querySelector('home-page').shadowRoot
        .querySelector('goal-dialog').shadowRoot.querySelector('input');
      inp.value = 'Summit Everest';
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.evaluate(() => {
      document.querySelector('app-router').shadowRoot
        .querySelector('home-page').shadowRoot
        .querySelector('goal-dialog').shadowRoot.querySelector('#save').click();
    });
    await page.waitForFunction(() => {
      const list = document.querySelector('app-router').shadowRoot
        .querySelector('home-page').shadowRoot.querySelector('#capstone-list');
      return list?.querySelectorAll('goal-item').length === 1;
    });
  });

  // One hold-drag = one progress-set event = one Activity row. 500ms hold, then move.
  async function setProgress(page, fraction) {
    const bar = await page.evaluate(() => {
      const el = document.querySelector('app-router').shadowRoot
        .querySelector('home-page').shadowRoot
        .querySelector('#capstone-list goal-item').shadowRoot.querySelector('.bar');
      return el.getBoundingClientRect().toJSON();
    });
    const y = bar.y + bar.height / 2;
    await page.mouse.move(bar.x + 2, y);
    await page.mouse.down();
    await page.waitForTimeout(600);           // clear the 500ms hold threshold
    await page.mouse.move(bar.x + bar.width * fraction, y);
    await page.mouse.up();
  }

  test('hold-drag on the progress bar records activity, and the body scrolls once it overflows', async ({ page }) => {
    // Enough distinct values to overflow a capped sheet at this viewport.
    for (const f of [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 0.5, 0.6, 0.7, 0.8]) {
      await setProgress(page, f);
    }

    const bar = await page.evaluate(() => {
      const el = document.querySelector('app-router').shadowRoot
        .querySelector('home-page').shadowRoot
        .querySelector('#capstone-list goal-item').shadowRoot.querySelector('.bar');
      return el.getBoundingClientRect().toJSON();
    });
    await page.mouse.click(bar.x + bar.width / 2, bar.y + bar.height / 2);
    await waitForDialogOpen(page);

    // Switch to Activity via a dot tap — the swipe path is covered in axis-ownership.spec.
    await page.evaluate(() => {
      document.querySelector('app-router').shadowRoot
        .querySelector('home-page').shadowRoot
        .querySelector('goal-dialog').shadowRoot
        .querySelector('#modal').shadowRoot.querySelectorAll('.tab-seg')[1].click();
    });
    await expect.poll(async () => (await modalMetrics(page)).activeTab).toBe(1);

    const m = await modalMetrics(page);
    expect(m.rows).toBeGreaterThan(10);           // real history, not filler
    expect(m.overflowY).toBe('auto');             // it is a real scroll container
    expect(m.scrollHeight).toBeGreaterThan(m.clientHeight); // and it actually overflows
  });

  test('fixedHeight keeps the sheet the same height on both tabs', async ({ page }) => {
    await setProgress(page, 0.4);

    const bar = await page.evaluate(() => {
      const el = document.querySelector('app-router').shadowRoot
        .querySelector('home-page').shadowRoot
        .querySelector('#capstone-list goal-item').shadowRoot.querySelector('.bar');
      return el.getBoundingClientRect().toJSON();
    });
    await page.mouse.click(bar.x + bar.width / 2, bar.y + bar.height / 2);
    await waitForDialogOpen(page);
    await page.evaluate(async () => {
      const dlg = document.querySelector('app-router').shadowRoot
        .querySelector('home-page').shadowRoot
        .querySelector('goal-dialog').shadowRoot
        .querySelector('#modal').shadowRoot.querySelector('dialog');
      await Promise.all(dlg.getAnimations().map(a => a.finished.catch(() => {})));
    });

    const onEdit = await modalMetrics(page);
    await page.evaluate(() => {
      document.querySelector('app-router').shadowRoot
        .querySelector('home-page').shadowRoot
        .querySelector('goal-dialog').shadowRoot
        .querySelector('#modal').shadowRoot.querySelectorAll('.tab-seg')[1].click();
    });
    await expect.poll(async () => (await modalMetrics(page)).activeTab).toBe(1);
    const onActivity = await modalMetrics(page);

    // The whole point of fixedHeight: the sheet must not resize as tabs change.
    expect(onActivity.sheetHeight).toBe(onEdit.sheetHeight);
  });
});
