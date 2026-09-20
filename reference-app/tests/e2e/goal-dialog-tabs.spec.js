import { test, expect } from '@playwright/test';

const currentYear = new Date().getFullYear();

// ── Helpers ──────────────────────────────────────────────────────────────────

async function waitForPage(page) {
  await page.waitForFunction(() =>
    !!document.querySelector('app-router')?.shadowRoot?.querySelector('home-page')
  );
}

async function openDialog(page, sectionAddBtnId) {
  await page.evaluate((id) => {
    document.querySelector('app-router').shadowRoot
      .querySelector('home-page').shadowRoot
      .querySelector(id).click();
  }, sectionAddBtnId);
}

async function fillAndSaveDialog(page, title) {
  await page.waitForFunction(() => {
    const d = document.querySelector('app-router')?.shadowRoot
      ?.querySelector('home-page')?.shadowRoot
      ?.querySelector('goal-dialog')?.shadowRoot
      ?.querySelector('#modal')?.shadowRoot?.querySelector('dialog');
    return d?.open;
  });
  await page.evaluate((t) => {
    const inp = document.querySelector('app-router').shadowRoot
      .querySelector('home-page').shadowRoot
      .querySelector('goal-dialog').shadowRoot
      .querySelector('input');
    inp.value = t;
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  }, title);
  await page.evaluate(() => {
    document.querySelector('app-router').shadowRoot
      .querySelector('home-page').shadowRoot
      .querySelector('goal-dialog').shadowRoot
      .querySelector('#save').click();
  });
}

async function enableEditMode(page, editBtnId) {
  await page.evaluate((id) => {
    document.querySelector('app-router').shadowRoot
      .querySelector('home-page').shadowRoot
      .querySelector(id).click();
  }, editBtnId);
}

async function dialogTabCount(page) {
  return page.evaluate(() =>
    document.querySelector('app-router').shadowRoot
      .querySelector('home-page').shadowRoot
      .querySelector('goal-dialog').shadowRoot
      .querySelector('#modal').tabCount
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Goal dialog activity tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/${currentYear}`);
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await waitForPage(page);

    await enableEditMode(page, '#capstone-edit-btn');
    await openDialog(page, '#add-capstone');
    await fillAndSaveDialog(page, 'Summit Everest');
    await page.waitForFunction(() => {
      const list = document.querySelector('app-router').shadowRoot
        .querySelector('home-page').shadowRoot.querySelector('#capstone-list');
      return list?.querySelectorAll('goal-item').length === 1;
    });
  });

  test('reopening an existing goal shows a real Activity tab built from its event history', async ({ page }) => {
    const barBounds = await page.evaluate(() => {
      const bar = document.querySelector('app-router').shadowRoot
        .querySelector('home-page').shadowRoot
        .querySelector('#capstone-list goal-item').shadowRoot
        .querySelector('.bar');
      return bar.getBoundingClientRect().toJSON();
    });
    await page.mouse.click(barBounds.x + barBounds.width / 2, barBounds.y + barBounds.height / 2);

    await page.waitForFunction(() => {
      const d = document.querySelector('app-router')?.shadowRoot
        ?.querySelector('home-page')?.shadowRoot
        ?.querySelector('goal-dialog')?.shadowRoot
        ?.querySelector('#modal')?.shadowRoot?.querySelector('dialog');
      return d?.open;
    });

    expect(await dialogTabCount(page)).toBe(2);

    // Tap the second segment dash on the drag handle to switch to the Activity page
    await page.evaluate(() => {
      document.querySelector('app-router').shadowRoot
        .querySelector('home-page').shadowRoot
        .querySelector('goal-dialog').shadowRoot
        .querySelector('#modal').shadowRoot
        .querySelectorAll('.tab-seg')[1].click();
    });

    await page.waitForFunction(() => {
      const activity = document.querySelector('app-router').shadowRoot
        .querySelector('home-page').shadowRoot
        .querySelector('goal-dialog').shadowRoot
        .querySelector('#page-activity');
      return activity && !activity.hidden;
    });

    const activityText = await page.evaluate(() =>
      document.querySelector('app-router').shadowRoot
        .querySelector('home-page').shadowRoot
        .querySelector('goal-dialog').shadowRoot
        .querySelector('#activity-list').textContent
    );
    expect(activityText).toContain('Summit Everest');
  });

  test('adding a brand-new goal has no Activity tab (nothing has happened yet)', async ({ page }) => {
    await openDialog(page, '#add-capstone');
    await page.waitForFunction(() => {
      const d = document.querySelector('app-router')?.shadowRoot
        ?.querySelector('home-page')?.shadowRoot
        ?.querySelector('goal-dialog')?.shadowRoot
        ?.querySelector('#modal')?.shadowRoot?.querySelector('dialog');
      return d?.open;
    });

    expect(await dialogTabCount(page)).toBe(1);
  });
});
