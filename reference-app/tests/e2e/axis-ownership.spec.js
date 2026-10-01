import { test, expect } from '@playwright/test';

const currentYear = new Date().getFullYear();

// Mobile viewport: 94% of real usage, and .handle's touch-action lives behind a
// max-width: 600px query, so the desktop default would not exercise it at all.
test.use({ viewport: { width: 390, height: 844 } });

// ── Helpers ──────────────────────────────────────────────────────────────────

async function waitForPage(page) {
  await page.waitForFunction(() =>
    !!document.querySelector('app-router')?.shadowRoot?.querySelector('home-page')
  );
}

async function clickIn(page, id) {
  await page.evaluate((sel) => {
    document.querySelector('app-router').shadowRoot
      .querySelector('home-page').shadowRoot
      .querySelector(sel).click();
  }, id);
}

async function waitForDialogOpen(page) {
  await page.waitForFunction(() => {
    const d = document.querySelector('app-router')?.shadowRoot
      ?.querySelector('home-page')?.shadowRoot
      ?.querySelector('goal-dialog')?.shadowRoot
      ?.querySelector('#modal')?.shadowRoot?.querySelector('dialog');
    return d?.open;
  });
}

async function seedGoalAndReopen(page) {
  await clickIn(page, '#capstone-edit-btn');
  await clickIn(page, '#add-capstone');
  await waitForDialogOpen(page);

  await page.evaluate((title) => {
    const inp = document.querySelector('app-router').shadowRoot
      .querySelector('home-page').shadowRoot
      .querySelector('goal-dialog').shadowRoot.querySelector('input');
    inp.value = title;
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  }, 'Summit Everest');
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

  // Reopening an existing goal is what gives the dialog two tabs.
  const bar = await page.evaluate(() => {
    const el = document.querySelector('app-router').shadowRoot
      .querySelector('home-page').shadowRoot
      .querySelector('#capstone-list goal-item').shadowRoot.querySelector('.bar');
    return el.getBoundingClientRect().toJSON();
  });
  await page.mouse.click(bar.x + bar.width / 2, bar.y + bar.height / 2);
  await waitForDialogOpen(page);
  await page.waitForFunction(() => {
    const m = document.querySelector('app-router').shadowRoot
      .querySelector('home-page').shadowRoot
      .querySelector('goal-dialog').shadowRoot.querySelector('#modal');
    return m.tabCount === 2;
  });
}

// The sheet enters with a 0.28s slide-up, and getBoundingClientRect() includes the
// transform — reading it too early reports the dialog still fully below the fold, where
// Playwright's mouse cannot reach it. Wait for the animation to finish.
async function waitForDialogSettled(page) {
  await page.evaluate(async () => {
    const dlg = document.querySelector('app-router').shadowRoot
      .querySelector('home-page').shadowRoot
      .querySelector('goal-dialog').shadowRoot
      .querySelector('#modal').shadowRoot.querySelector('dialog');
    await Promise.all(dlg.getAnimations().map(a => a.finished.catch(() => {})));
  });
}

const modalPart = (page, selector) => page.evaluate((sel) => {
  const part = document.querySelector('app-router').shadowRoot
    .querySelector('home-page').shadowRoot
    .querySelector('goal-dialog').shadowRoot
    .querySelector('#modal').shadowRoot.querySelector(sel);
  return {
    touchAction: getComputedStyle(part).touchAction,
    box: part.getBoundingClientRect().toJSON(),
  };
}, selector);

const activeTab = (page) => page.evaluate(() =>
  document.querySelector('app-router').shadowRoot
    .querySelector('home-page').shadowRoot
    .querySelector('goal-dialog').shadowRoot
    .querySelector('#modal').activeTab
);

// ── Tests ────────────────────────────────────────────────────────────────────

// These assert the DECLARATIVE half of axis ownership in a real browser: the
// resolved touch-action on the real composed tree, which happy-dom cannot model
// because it does not implement touch-action's ancestor intersection. They would
// catch someone reintroducing `none`, or adding it to a wrapper that intersects
// down onto a gesture surface.
//
// They deliberately do NOT claim to test fling suppression or tap survival. That
// needs physical touch hardware: mouse input never engages the Android gesture
// recogniser, and CDP-synthesised touch bypasses it. Three releases shipped a
// wrong touch-action value precisely because this suite cannot see that half.
test.describe('Axis ownership — resolved touch-action', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/${currentYear}`);
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await waitForPage(page);
  });

  test('a swipe-enabled component host concedes the vertical axis', async ({ page }) => {
    const ta = await page.evaluate(() => {
      const item = document.querySelector('app-router').shadowRoot
        .querySelector('home-page').shadowRoot.querySelector('year-header');
      return getComputedStyle(item).touchAction;
    });
    expect(ta).toBe('pan-y pinch-zoom');
  });

  test('the tabbed dialog body concedes vertical and keeps pinch-zoom', async ({ page }) => {
    await seedGoalAndReopen(page);
    const { touchAction } = await modalPart(page, '.body');
    expect(touchAction).toBe('pan-y pinch-zoom');
  });

  test('the drag handle concedes horizontal — it is vertical-only now', async ({ page }) => {
    // It used to be `none`: it owned both axes for a horizontal tab-swipe, so it had
    // nothing to concede and the claim could not work. Measured on-device, a hard flick
    // here swallowed the next tap — on the element holding the tab dots. Removing the
    // handle's horizontal swipe let it follow the same rule as everything else.
    await seedGoalAndReopen(page);
    const { touchAction } = await modalPart(page, '.handle');
    expect(touchAction).toBe('pan-x pinch-zoom');
  });

  test('no element in the dialog takes both axes', async ({ page }) => {
    await seedGoalAndReopen(page);
    const offenders = await page.evaluate(() => {
      const root = document.querySelector('app-router').shadowRoot
        .querySelector('home-page').shadowRoot
        .querySelector('goal-dialog').shadowRoot
        .querySelector('#modal').shadowRoot;
      return [...root.querySelectorAll('*')]
        .filter(el => getComputedStyle(el).touchAction === 'none')
        .map(el => el.tagName.toLowerCase() + '.' + (el.className || ''));
    });
    expect(offenders).toEqual([]);
  });

  test('a toast concedes the vertical axis so the page behind stays scrollable', async ({ page }) => {
    await clickIn(page, '#capstone-edit-btn');
    await clickIn(page, '#add-capstone');
    await waitForDialogOpen(page);
    await page.evaluate(() => {
      const inp = document.querySelector('app-router').shadowRoot
        .querySelector('home-page').shadowRoot
        .querySelector('goal-dialog').shadowRoot.querySelector('input');
      inp.value = 'Toast trigger';
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.evaluate(() => {
      document.querySelector('app-router').shadowRoot
        .querySelector('home-page').shadowRoot
        .querySelector('goal-dialog').shadowRoot.querySelector('#save').click();
    });

    await page.waitForFunction(() => !!document.querySelector('.socle-toast'));
    const ta = await page.evaluate(() =>
      getComputedStyle(document.querySelector('.socle-toast')).touchAction
    );
    expect(ta).toBe('pan-y pinch-zoom');
  });
});

// The pointer-driven path had no E2E coverage at all before this — tabs were only
// ever switched by clicking a segment. These do not exercise touch arbitration,
// but they do prove the refactor did not break the drag handlers themselves.
test.describe('Axis ownership — pointer-driven tab swipe', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/${currentYear}`);
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await waitForPage(page);
    await seedGoalAndReopen(page);
  });

  test('a leftward drag across the body advances the tab', async ({ page }) => {
    await waitForDialogSettled(page);
    const { box } = await modalPart(page, '.body');
    expect(await activeTab(page)).toBe(0);

    // Leftward advances, rightward goes back. Start in .body's own inline padding so
    // the drag does not land on a control — _bodyDown deliberately ignores drags that
    // start on button/input/select/etc. Travel well past the 28%-of-width commit.
    const y = box.y + box.height / 2;
    const startX = box.x + box.width - 4;
    await page.mouse.move(startX, y);
    await page.mouse.down();
    for (let dx = 20; dx <= 200; dx += 20) await page.mouse.move(startX - dx, y);
    await page.mouse.up();

    await expect.poll(() => activeTab(page)).toBe(1);
  });

  test('a rightward drag at tab 0 is clamped rather than wrapping', async ({ page }) => {
    await waitForDialogSettled(page);
    const { box } = await modalPart(page, '.body');
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + 4, y);
    await page.mouse.down();
    for (let dx = 20; dx <= 200; dx += 20) await page.mouse.move(box.x + 4 + dx, y);
    await page.mouse.up();

    expect(await activeTab(page)).toBe(0);
  });

  test('a drag inside a consumer\'s shadow-root scroller does not page tabs', async ({ page }) => {
    // Reported from a downstream app: .body's listener sees the target retargeted to the
    // slotted host, so walking parentElement never descends into the consumer's own
    // shadow tree and the dialog paged tabs while the user scrolled a chart. Only a real
    // browser reproduces this — happy-dom does not propagate composed events through a slot.
    await waitForDialogSettled(page);
    expect(await activeTab(page)).toBe(0);

    const box = await page.evaluate(() => {
      const modal = document.querySelector('app-router').shadowRoot
        .querySelector('home-page').shadowRoot
        .querySelector('goal-dialog').shadowRoot.querySelector('#modal');

      class ShadowScroller extends HTMLElement {
        connectedCallback() {
          if (this.shadowRoot) return;
          const sr = this.attachShadow({ mode: 'open' });
          sr.innerHTML = `
            <div id="scroller" style="overflow-x:auto;width:100%;height:60px;background:#333">
              <div style="width:2000px;height:40px"></div>
            </div>`;
        }
      }
      if (!customElements.get('shadow-scroller')) {
        customElements.define('shadow-scroller', ShadowScroller);
      }
      const host = document.createElement('shadow-scroller');
      modal.appendChild(host);           // slotted into modal-dialog's default slot
      const inner = host.shadowRoot.querySelector('#scroller');
      return inner.getBoundingClientRect().toJSON();
    });

    // A genuine horizontal drag, started inside the nested scroller.
    const y = box.y + box.height / 2;
    const startX = box.x + box.width - 6;
    await page.mouse.move(startX, y);
    await page.mouse.down();
    for (let dx = 20; dx <= 200; dx += 20) await page.mouse.move(startX - dx, y);
    await page.mouse.up();

    expect(await activeTab(page)).toBe(0); // the chart scrolled; the dialog did not page
  });

  test('a vertical drag is conceded — no tab change and no transform applied', async ({ page }) => {
    await waitForDialogSettled(page);
    const { box } = await modalPart(page, '.body');
    expect(await activeTab(page)).toBe(0);

    const x = box.x + 4;
    await page.mouse.move(x, box.y + 10);
    await page.mouse.down();
    for (let dy = 12; dy <= 120; dy += 12) await page.mouse.move(x, box.y + 10 + dy);
    await page.mouse.up();

    expect(await activeTab(page)).toBe(0);
    // Conceding means the module stops tracking entirely, so it never starts
    // translating .body — the tell that the horizontal path was not entered.
    const transform = await page.evaluate(() =>
      document.querySelector('app-router').shadowRoot
        .querySelector('home-page').shadowRoot
        .querySelector('goal-dialog').shadowRoot
        .querySelector('#modal').shadowRoot.querySelector('.body').style.transform
    );
    expect(transform).toBe('');
  });
});
