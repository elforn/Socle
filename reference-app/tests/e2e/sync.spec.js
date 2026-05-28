import { test, expect } from '@playwright/test';
import path from 'path';
import os from 'os';
import fs from 'fs';

const currentYear = new Date().getFullYear();

async function waitForPage(page) {
  await page.waitForFunction(() =>
    !!document.querySelector('app-router')?.shadowRoot?.querySelector('home-page')
  );
}

async function clickInYearHeader(page, selector) {
  await page.evaluate((sel) => {
    document.querySelector('app-router').shadowRoot
      .querySelector('home-page').shadowRoot
      .querySelector('year-header').shadowRoot
      .querySelector(sel).click();
  }, selector);
}

async function openMenu(page) {
  await clickInYearHeader(page, '#menu-btn');
}

async function closeMenu(page) {
  // Click backdrop
  await page.evaluate(() => {
    const menu = document.querySelector('app-router').shadowRoot
      .querySelector('home-page').shadowRoot
      .querySelector('year-header').shadowRoot
      .querySelector('#menu');
    menu.close();
  });
}

async function createGoal(page, title) {
  await page.evaluate(() => {
    document.querySelector('app-router').shadowRoot
      .querySelector('home-page').shadowRoot
      .querySelector('#capstone-edit-btn').click();
  });
  await page.evaluate(() => {
    document.querySelector('app-router').shadowRoot
      .querySelector('home-page').shadowRoot
      .querySelector('#add-capstone').click();
  });
  await page.waitForFunction(() => {
    const d = document.querySelector('app-router')?.shadowRoot
      ?.querySelector('home-page')?.shadowRoot
      ?.querySelector('goal-dialog')?.shadowRoot
      ?.querySelector('dialog');
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
  await page.waitForFunction(() => {
    const list = document.querySelector('app-router')?.shadowRoot
      ?.querySelector('home-page')?.shadowRoot
      ?.querySelector('#capstone-list');
    return list?.querySelectorAll('goal-item').length > 0;
  });
}

async function goalCount(page) {
  return page.evaluate(() => {
    const list = document.querySelector('app-router')?.shadowRoot
      ?.querySelector('home-page')?.shadowRoot
      ?.querySelector('#capstone-list');
    return list?.querySelectorAll('goal-item').length ?? 0;
  });
}

async function injectImportFile(page, content) {
  const json = typeof content === 'string' ? content : JSON.stringify(content);
  await page.evaluate((json) => {
    const file = new File([json], 'export.json', { type: 'application/json' });
    const dt   = new DataTransfer();
    dt.items.add(file);
    const yh    = document.querySelector('app-router').shadowRoot
      .querySelector('home-page').shadowRoot
      .querySelector('year-header');
    const input = yh.shadowRoot.querySelector('#import-input');
    Object.defineProperty(input, 'files', { value: dt.files, configurable: true });
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, json);
}

async function confirmDialogState(page) {
  return page.evaluate(() => {
    const yh = document.querySelector('app-router').shadowRoot
      .querySelector('home-page').shadowRoot
      .querySelector('year-header');
    const dialog = yh.shadowRoot.querySelector('#import-confirm');
    return {
      open:           dialog.open,
      message:        yh.shadowRoot.querySelector('#import-message').textContent,
      successHidden:  yh.shadowRoot.querySelector('#import-success-actions').hidden,
      errorHidden:    yh.shadowRoot.querySelector('#import-error-actions').hidden,
    };
  });
}

async function clearIDB(page) {
  await page.evaluate(() => new Promise((resolve, reject) => {
    // Open a new connection (same version — no upgrade needed) and clear both stores.
    // deleteDatabase would block because the Store holds an open connection,
    // so we clear the object stores instead.
    const req = indexedDB.open('youryear');
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(['events', 'images'], 'readwrite');
      tx.objectStore('events').clear();
      tx.objectStore('images').clear();
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror    = () => reject(tx.error);
    };
    req.onerror = () => reject(req.error);
  }));
}

test.describe('Sync — menu items', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/${currentYear}`);
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await waitForPage(page);
    await openMenu(page);
  });

  test('Export this year menu item is present', async ({ page }) => {
    const text = await page.evaluate((year) => {
      return document.querySelector('app-router').shadowRoot
        .querySelector('home-page').shadowRoot
        .querySelector('year-header').shadowRoot
        .querySelector('#export-year-btn').textContent.trim();
    }, currentYear);
    expect(text).toContain(String(currentYear));
  });

  test('Export all years menu item is present', async ({ page }) => {
    const present = await page.evaluate(() =>
      !!document.querySelector('app-router').shadowRoot
        .querySelector('home-page').shadowRoot
        .querySelector('year-header').shadowRoot
        .querySelector('#export-all-btn')
    );
    expect(present).toBe(true);
  });

  test('Import menu item is present', async ({ page }) => {
    const present = await page.evaluate(() =>
      !!document.querySelector('app-router').shadowRoot
        .querySelector('home-page').shadowRoot
        .querySelector('year-header').shadowRoot
        .querySelector('#import-btn')
    );
    expect(present).toBe(true);
  });
});

test.describe('Sync — export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/${currentYear}`);
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await waitForPage(page);
  });

  test('Export this year triggers a file download', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      (async () => {
        await openMenu(page);
        await clickInYearHeader(page, '#export-year-btn');
      })(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^\d{12}_youryear-\d{4}\.json$/);
  });

  test('Export all years triggers a file download', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      (async () => {
        await openMenu(page);
        await clickInYearHeader(page, '#export-all-btn');
      })(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^\d{12}_youryear-all\.json$/);
  });

  test('exported file contains valid JSON with socleVersion 1', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      (async () => {
        await openMenu(page);
        await clickInYearHeader(page, '#export-all-btn');
      })(),
    ]);
    const tmpPath = path.join(os.tmpdir(), download.suggestedFilename());
    await download.saveAs(tmpPath);
    const content = JSON.parse(fs.readFileSync(tmpPath, 'utf8'));
    expect(content.socleVersion).toBe(1);
    expect(Array.isArray(content.events)).toBe(true);
    expect(Array.isArray(content.images)).toBe(true);
    fs.unlinkSync(tmpPath);
  });

  test('year-scoped export only includes events for that year', async ({ page }) => {
    await clearIDB(page);
    await page.reload();
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await waitForPage(page);

    await createGoal(page, 'Current year goal');

    // Create a goal in the next year
    await page.goto(`/${currentYear + 1}`);
    await waitForPage(page);
    await createGoal(page, 'Next year goal');

    // Export the current year only
    await page.goto(`/${currentYear}`);
    await waitForPage(page);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      (async () => {
        await openMenu(page);
        await clickInYearHeader(page, '#export-year-btn');
      })(),
    ]);
    const tmpPath = path.join(os.tmpdir(), download.suggestedFilename());
    await download.saveAs(tmpPath);
    const content = JSON.parse(fs.readFileSync(tmpPath, 'utf8'));
    fs.unlinkSync(tmpPath);

    expect(content.events).toHaveLength(1);
    expect(String(content.events[0].payload.year)).toBe(String(currentYear));
  });
});

test.describe('Sync — import', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/${currentYear}`);
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await waitForPage(page);
  });

  test('importing invalid JSON shows error dialog', async ({ page }) => {
    await openMenu(page);
    await clickInYearHeader(page, '#import-btn');
    await injectImportFile(page, 'this is not json {{');
    await page.waitForFunction(() => {
      const yh = document.querySelector('app-router').shadowRoot
        .querySelector('home-page').shadowRoot
        .querySelector('year-header');
      return yh.shadowRoot.querySelector('#import-confirm').open;
    });
    const state = await confirmDialogState(page);
    expect(state.open).toBe(true);
    expect(state.errorHidden).toBe(false);
    expect(state.successHidden).toBe(true);
  });

  test('importing wrong socleVersion shows error dialog', async ({ page }) => {
    await openMenu(page);
    await clickInYearHeader(page, '#import-btn');
    await injectImportFile(page, { socleVersion: 99, events: [], images: [] });
    await page.waitForFunction(() => {
      const yh = document.querySelector('app-router').shadowRoot
        .querySelector('home-page').shadowRoot
        .querySelector('year-header');
      return yh.shadowRoot.querySelector('#import-confirm').open;
    });
    const state = await confirmDialogState(page);
    expect(state.errorHidden).toBe(false);
  });

  test('importing duplicate data returns 0 events and 0 images added', async ({ page }) => {
    await clearIDB(page);
    await page.reload();
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await waitForPage(page);

    const payload = {
      socleVersion: 1,
      events: [
        { id: 'dedup-test-001', deviceId: null, recordedAt: 1000, occurredAt: 1000,
          type: 'goal:title-set', payload: { year: String(currentYear), id: 'g-dedup', title: 'Dedup' } },
      ],
      images: [],
    };

    // First import — event is new, count should be 1
    await openMenu(page);
    await clickInYearHeader(page, '#import-btn');
    await injectImportFile(page, payload);
    await page.waitForFunction(() => {
      const yh = document.querySelector('app-router').shadowRoot
        .querySelector('home-page').shadowRoot
        .querySelector('year-header');
      return yh.shadowRoot.querySelector('#import-confirm').open;
    });
    // Close without reloading
    await page.evaluate(() => {
      document.querySelector('app-router').shadowRoot
        .querySelector('home-page').shadowRoot
        .querySelector('year-header').shadowRoot
        .querySelector('#import-cancel').click();
    });
    await page.waitForFunction(() => {
      const yh = document.querySelector('app-router').shadowRoot
        .querySelector('home-page').shadowRoot
        .querySelector('year-header');
      return !yh.shadowRoot.querySelector('#import-confirm').open;
    });

    // Second import of same data — all IDs already exist, count should be 0
    await openMenu(page);
    await clickInYearHeader(page, '#import-btn');
    await injectImportFile(page, payload);
    await page.waitForFunction(() => {
      const yh = document.querySelector('app-router').shadowRoot
        .querySelector('home-page').shadowRoot
        .querySelector('year-header');
      return yh.shadowRoot.querySelector('#import-confirm').open;
    });
    const state = await confirmDialogState(page);
    expect(state.successHidden).toBe(false);
    expect(state.message).toContain('0');
  });

  test('importing valid data shows success dialog with counts', async ({ page }) => {
    await openMenu(page);
    await clickInYearHeader(page, '#import-btn');
    const payload = {
      socleVersion: 1,
      events: [
        { id: 'imported-1', deviceId: null, recordedAt: 1000, occurredAt: 1000,
          type: 'goal:title-set', payload: { year: String(currentYear), id: 'g-1', title: 'Imported goal' } },
      ],
      images: [],
    };
    await injectImportFile(page, payload);
    await page.waitForFunction(() => {
      const yh = document.querySelector('app-router').shadowRoot
        .querySelector('home-page').shadowRoot
        .querySelector('year-header');
      return yh.shadowRoot.querySelector('#import-confirm').open;
    });
    const state = await confirmDialogState(page);
    expect(state.open).toBe(true);
    expect(state.successHidden).toBe(false);
    expect(state.errorHidden).toBe(true);
    expect(state.message).toContain('1');
  });
});

test.describe('Sync — round-trip', () => {
  test('export then import restores goals after IDB clear', async ({ page }) => {
    await page.goto(`/${currentYear}`);
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await waitForPage(page);

    // Create a goal
    await createGoal(page, 'Round-trip goal');
    expect(await goalCount(page)).toBe(1);

    // Export all
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      (async () => {
        await openMenu(page);
        await clickInYearHeader(page, '#export-all-btn');
      })(),
    ]);
    const tmpPath = path.join(os.tmpdir(), download.suggestedFilename());
    await download.saveAs(tmpPath);
    const exportedJson = fs.readFileSync(tmpPath, 'utf8');
    fs.unlinkSync(tmpPath);

    // Clear IDB and reload to empty state
    await clearIDB(page);
    await page.reload();
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await waitForPage(page);
    expect(await goalCount(page)).toBe(0);

    // Import the exported file
    await openMenu(page);
    await clickInYearHeader(page, '#import-btn');
    await injectImportFile(page, exportedJson);
    await page.waitForFunction(() => {
      const yh = document.querySelector('app-router').shadowRoot
        .querySelector('home-page').shadowRoot
        .querySelector('year-header');
      return yh.shadowRoot.querySelector('#import-confirm').open;
    });

    // Confirm reload
    const navigationPromise = page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
    await page.evaluate(() => {
      document.querySelector('app-router').shadowRoot
        .querySelector('home-page').shadowRoot
        .querySelector('year-header').shadowRoot
        .querySelector('#import-reload').click();
    });
    await navigationPromise;
    await waitForPage(page);

    // Goal should be restored
    expect(await goalCount(page)).toBe(1);
    const title = await page.evaluate(() => {
      const item = document.querySelector('app-router').shadowRoot
        .querySelector('home-page').shadowRoot
        .querySelector('#capstone-list goal-item');
      return item?.shadowRoot?.querySelector('.title')?.textContent?.trim();
    });
    expect(title).toBe('Round-trip goal');
  });
});
