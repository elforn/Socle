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
  await page.evaluate(() => {
    document.querySelector('app-router').shadowRoot
      .querySelector('home-page').shadowRoot
      .querySelector('#capstone-list goal-item')
      .click();
  });
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

  test('toast auto-dismisses after 3 seconds', async ({ page }) => {
    await openAndSaveGoal(page, 'Auto-dismiss goal');
    await expect(page.locator('.socle-toast-success')).toBeVisible();
    await page.waitForTimeout(3500);
    await expect(page.locator('.socle-toast-success')).toHaveCount(0);
  });

  test('delete shows toast with Undo action button', async ({ page }) => {
    await openAndSaveGoal(page, 'Goal to delete');
    await page.waitForTimeout(3500); // let save toast dismiss
    await openGoalForDelete(page);
    await clickDeleteInDialog(page);
    await expect(page.locator('.socle-toast-info')).toContainText('Goal deleted');
    await expect(page.locator('.socle-toast-btn')).toContainText('Undo');
  });

  test('Undo restores the deleted goal', async ({ page }) => {
    await openAndSaveGoal(page, 'Undo target');
    await page.waitForTimeout(3500);
    await openGoalForDelete(page);
    await clickDeleteInDialog(page);
    expect(await goalCount(page)).toBe(0);
    await page.locator('.socle-toast-btn').click();
    await expect(page.locator('#capstone-list goal-item')).toHaveCount(1);
  });
});
