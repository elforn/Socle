import { test, expect } from '@playwright/test';

const currentYear = new Date().getFullYear();

async function waitForPage(page) {
  await page.waitForFunction(() =>
    !!document.querySelector('app-router')?.shadowRoot?.querySelector('home-page')
  );
}

async function openAndSaveGoal(page, title) {
  await page.evaluate(() => {
    document.querySelector('app-router').shadowRoot
      .querySelector('home-page').shadowRoot
      .querySelector('#add-capstone').click();
  });
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

async function openGoalForDelete(page) {
  // goal-item.onTap() only dispatches goal-tap (opening the edit dialog) while the
  // item is in edit mode — enable it first, same as tests/e2e/goals.spec.js does.
  await page.evaluate(() => {
    document.querySelector('app-router').shadowRoot
      .querySelector('home-page').shadowRoot
      .querySelector('#capstone-edit-btn').click();
  });
  // goal-item uses the Gestures mixin, which detects taps from real pointer events —
  // a synthetic element.click() never reaches it, so this needs a real mouse click
  // on the bar (same technique as tests/e2e/goals.spec.js's dialog-open tests).
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
}

async function clickDeleteInDialog(page) {
  await page.evaluate(() => {
    document.querySelector('app-router').shadowRoot
      .querySelector('home-page').shadowRoot
      .querySelector('goal-dialog').shadowRoot
      .querySelector('#delete').click();
  });
}

// The save toast now carries two actions, so its default life is 6000ms. Escape
// dismisses it immediately — cheaper and more deterministic than waiting it out.
async function clearToast(page) {
  await page.keyboard.press('Escape');
  await expect(page.locator('.socle-toast')).toHaveCount(0);
}

async function goalCount(page) {
  return page.evaluate(() => {
    return document.querySelector('app-router').shadowRoot
      .querySelector('home-page').shadowRoot
      .querySelector('#capstone-list').querySelectorAll('goal-item').length;
  });
}

test.describe('Toast feedback', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/${currentYear}`);
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await waitForPage(page);
  });

  test('shows success toast after saving a goal', async ({ page }) => {
    await openAndSaveGoal(page, 'Toast test goal');
    await expect(page.locator('#toast-container')).toBeVisible();
    await expect(page.locator('.socle-toast-success')).toContainText('Goal saved');
  });

  test('the save toast auto-dismisses after its two-action 6000ms default', async ({ page }) => {
    await openAndSaveGoal(page, 'Auto-dismiss goal');
    await expect(page.locator('.socle-toast-success')).toBeVisible();
    await page.waitForTimeout(3500);
    // Still up: the single-action 5000ms default would be nearly out by now.
    await expect(page.locator('.socle-toast-success')).toBeVisible();
    await expect(page.locator('.socle-toast-success')).toHaveCount(0, { timeout: 4000 });
  });

  test('the save toast renders both actions in order, Undo last', async ({ page }) => {
    await openAndSaveGoal(page, 'Two action goal');
    const btns = page.locator('.socle-toast-actions .socle-toast-btn');
    await expect(btns).toHaveCount(2);
    await expect(btns.nth(0)).toHaveText('Activity');
    await expect(btns.nth(1)).toHaveText('Undo');
    await expect(btns.nth(0)).toHaveClass(/socle-toast-btn-secondary/);
    await expect(btns.nth(1)).not.toHaveClass(/socle-toast-btn-secondary/);
  });

  test('the save toast Activity action opens the goal on its activity tab', async ({ page }) => {
    await openAndSaveGoal(page, 'Activity goal');
    await page.locator('.socle-toast-actions .socle-toast-btn').first().click();
    await page.waitForFunction(() => {
      const d = document.querySelector('app-router')?.shadowRoot
        ?.querySelector('home-page')?.shadowRoot
        ?.querySelector('goal-dialog')?.shadowRoot
        ?.querySelector('#modal')?.shadowRoot?.querySelector('dialog');
      return d?.open;
    });
    const state = await page.evaluate(() => {
      const gd = document.querySelector('app-router').shadowRoot
        .querySelector('home-page').shadowRoot
        .querySelector('goal-dialog').shadowRoot;
      return {
        activeTab: gd.querySelector('#modal').activeTab,
        activityShown: !gd.querySelector('#page-activity').hidden,
        editShown: !gd.querySelector('#page-edit').hidden,
      };
    });
    expect(state).toEqual({ activeTab: 1, activityShown: true, editShown: false });
  });

  test('the save toast Undo removes the goal the save just created', async ({ page }) => {
    await openAndSaveGoal(page, 'Undo create');
    expect(await goalCount(page)).toBe(1);
    await page.locator('.socle-toast-actions .socle-toast-btn').nth(1).click();
    await expect(page.locator('#capstone-list goal-item')).toHaveCount(0);
  });

  test('a toast is not capped at half the viewport width', async ({ page }) => {
    // Regression guard for a layout bug a unit test cannot see: the container used
    // to start at inset-inline-start: 50% and be pulled back with
    // translateX(-50%), which centred it visually but left its layout width
    // shrink-to-fit against half the viewport — capping everything inside it,
    // whatever max-inline-size the app asked for.
    await page.setViewportSize({ width: 375, height: 700 });
    await openAndSaveGoal(page, 'Width goal');
    await expect(page.locator('.socle-toast-success')).toBeVisible();
    const box = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const c = document.querySelector('#toast-container').getBoundingClientRect();
      const t = document.querySelector('.socle-toast').getBoundingClientRect();
      return { vw, container: c.width, left: t.left, right: t.right, width: t.width };
    });
    expect(box.container).toBeCloseTo(box.vw, 0);
    expect(box.width).toBeGreaterThan(box.vw / 2);
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(box.vw);
    expect(Math.abs(box.left - (box.vw - box.right))).toBeLessThanOrEqual(1);
  });

  test('delete shows toast with Undo action button', async ({ page }) => {
    await openAndSaveGoal(page, 'Goal to delete');
    await clearToast(page);
    await openGoalForDelete(page);
    await clickDeleteInDialog(page);
    await expect(page.locator('.socle-toast-info')).toContainText('Goal deleted');
    await expect(page.locator('.socle-toast-btn')).toContainText('Undo');
  });

  test('Undo restores the deleted goal', async ({ page }) => {
    await openAndSaveGoal(page, 'Undo target');
    await clearToast(page);
    await openGoalForDelete(page);
    await clickDeleteInDialog(page);
    expect(await goalCount(page)).toBe(0);
    await page.locator('.socle-toast-btn').click();
    await expect(page.locator('#capstone-list goal-item')).toHaveCount(1);
  });
});
