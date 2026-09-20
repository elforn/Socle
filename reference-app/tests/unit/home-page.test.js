// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { boot, dispatch, reset } from '../../_lib/core/store/store.js';
import { reducer } from '../../app/store/reducer.js';
import '../../app/strings.js';
import '../../app/pages/home-page.js';
import '../../app/components/goal-item/goal-item.js';
import '../../app/components/year-header/year-header.js';

HTMLElement.prototype.setPointerCapture    = () => {};
HTMLElement.prototype.releasePointerCapture = () => {};

let dbSeq = 0;
function freshName() { return `home-page-test-${dbSeq++}`; }

function mount(year = 2026) {
  const el = document.createElement('home-page');
  el.params = { year: String(year) };
  document.body.appendChild(el);
  // Stub the year-header's menu dialog so showModal doesn't throw
  const header = el.shadowRoot.querySelector('year-header');
  if (header) {
    const dialog = header.shadowRoot.querySelector('dialog');
    if (dialog) { dialog.showModal = () => {}; dialog.close = () => {}; }
  }
  return el;
}

afterEach(() => { document.body.innerHTML = ''; reset(); });

describe('home-page — structure', () => {
  it('renders a <main> landmark', () => {
    const el = mount();
    expect(el.shadowRoot.querySelector('main')).not.toBeNull();
  });

  it('renders a year-header component', () => {
    const el = mount();
    expect(el.shadowRoot.querySelector('year-header')).not.toBeNull();
  });

  it('renders the capstone section', () => {
    const el = mount();
    expect(el.shadowRoot.querySelector('#capstone-section')).not.toBeNull();
  });

  it('renders milestone and wow sections', () => {
    const el = mount();
    expect(el.shadowRoot.querySelector('#milestone-section')).not.toBeNull();
    expect(el.shadowRoot.querySelector('#wow-section')).not.toBeNull();
  });
});

describe('home-page — capstone edit mode', () => {
  it('capstone section shows edit class when edit button clicked', () => {
    const el = mount();
    el.shadowRoot.querySelector('#capstone-edit-btn').click();
    expect(el.shadowRoot.querySelector('#capstone-section').classList.contains('edit')).toBe(true);
  });

  it('capstone edit button text becomes Done when active', () => {
    const el = mount();
    el.shadowRoot.querySelector('#capstone-edit-btn').click();
    expect(el.shadowRoot.querySelector('#capstone-edit-btn').textContent).toBe('Done');
  });

  it('capstone edit button text returns to Edit on second click', () => {
    const el = mount();
    el.shadowRoot.querySelector('#capstone-edit-btn').click();
    el.shadowRoot.querySelector('#capstone-edit-btn').click();
    expect(el.shadowRoot.querySelector('#capstone-edit-btn').textContent).toBe('Edit');
    expect(el.shadowRoot.querySelector('#capstone-section').classList.contains('edit')).toBe(false);
  });

  it('capstone edit is independent of milestone and wow edits', () => {
    const el = mount();
    el.shadowRoot.querySelector('#capstone-edit-btn').click();
    expect(el.shadowRoot.querySelector('#milestone-section').classList.contains('edit')).toBe(false);
    expect(el.shadowRoot.querySelector('#wow-section').classList.contains('edit')).toBe(false);
  });
});

describe('home-page — milestone edit mode', () => {
  it('milestone section shows edit class when edit button clicked', () => {
    const el = mount();
    el.shadowRoot.querySelector('#milestone-edit-btn').click();
    expect(el.shadowRoot.querySelector('#milestone-section').classList.contains('edit')).toBe(true);
  });

  it('milestone edit button text becomes Done when active', () => {
    const el = mount();
    el.shadowRoot.querySelector('#milestone-edit-btn').click();
    expect(el.shadowRoot.querySelector('#milestone-edit-btn').textContent).toBe('Done');
  });

  it('milestone edit button text returns to Edit on second click', () => {
    const el = mount();
    el.shadowRoot.querySelector('#milestone-edit-btn').click();
    el.shadowRoot.querySelector('#milestone-edit-btn').click();
    expect(el.shadowRoot.querySelector('#milestone-edit-btn').textContent).toBe('Edit');
    expect(el.shadowRoot.querySelector('#milestone-section').classList.contains('edit')).toBe(false);
  });

  it('wow section edit is independent of milestone edit', () => {
    const el = mount();
    el.shadowRoot.querySelector('#milestone-edit-btn').click();
    expect(el.shadowRoot.querySelector('#wow-section').classList.contains('edit')).toBe(false);
  });
});

describe('home-page — store integration', () => {
  it('renders capstone goal-items when goals dispatched', async () => {
    await boot({ dbName: freshName(), reducer });
    const el = mount(2026);
    await dispatch('goal:title-set', { year: '2026', id: 'c1', title: 'Grand Capstone' });
    await vi.waitFor(() =>
      expect(el.shadowRoot.querySelector('#capstone-list').querySelectorAll('goal-item').length).toBe(1)
    );
  });

  it('capstone section removes empty class when goals exist', async () => {
    await boot({ dbName: freshName(), reducer });
    const el = mount(2026);
    await dispatch('goal:title-set', { year: '2026', id: 'c1', title: 'Grand Capstone' });
    await vi.waitFor(() =>
      expect(el.shadowRoot.querySelector('#capstone-section').classList.contains('empty')).toBe(false)
    );
  });

  it('renders milestone goal-items when milestones dispatched', async () => {
    await boot({ dbName: freshName(), reducer });
    const el = mount(2026);
    await dispatch('milestone:title-set', { year: '2026', id: 'm1', title: 'Q1 target' });
    await vi.waitFor(() =>
      expect(el.shadowRoot.querySelector('#milestone-list').querySelectorAll('goal-item').length).toBe(1)
    );
  });

  it('milestone section removes empty class when items exist', async () => {
    await boot({ dbName: freshName(), reducer });
    const el = mount(2026);
    await dispatch('milestone:title-set', { year: '2026', id: 'm1', title: 'Q1' });
    await vi.waitFor(() =>
      expect(el.shadowRoot.querySelector('#milestone-section').classList.contains('empty')).toBe(false)
    );
  });

  it('renders wow goal-items when wow dispatched', async () => {
    await boot({ dbName: freshName(), reducer });
    const el = mount(2026);
    await dispatch('wow:title-set', { year: '2026', id: 'w1', title: 'First marathon' });
    await vi.waitFor(() =>
      expect(el.shadowRoot.querySelector('#wow-list').querySelectorAll('goal-item').length).toBe(1)
    );
  });

  it('does not show milestones for a different year', async () => {
    await boot({ dbName: freshName(), reducer });
    const el = mount(2026);
    await dispatch('milestone:title-set', { year: '2025', id: 'm1', title: 'Past milestone' });
    await vi.waitFor(() =>
      expect(el.shadowRoot.querySelector('#milestone-section').classList.contains('empty')).toBe(true)
    );
  });

  it('removes goal-item when milestone deleted', async () => {
    await boot({ dbName: freshName(), reducer });
    const el = mount(2026);
    await dispatch('milestone:title-set', { year: '2026', id: 'm1', title: 'Q1' });
    await vi.waitFor(() =>
      expect(el.shadowRoot.querySelector('#milestone-list').querySelectorAll('goal-item').length).toBe(1)
    );
    await dispatch('milestone:deleted', { year: '2026', id: 'm1' });
    await vi.waitFor(() =>
      expect(el.shadowRoot.querySelector('#milestone-list').querySelectorAll('goal-item').length).toBe(0)
    );
  });
});

describe('home-page — goal dialog activity', () => {
  function stubDialogShow(el) {
    const dialog = el.shadowRoot.querySelector('#dialog');
    const modal = dialog.shadowRoot.querySelector('#modal');
    modal.show = () => {};
    return dialog;
  }

  it('opening an existing goal loads its real event history into the dialog', async () => {
    await boot({ dbName: freshName(), reducer });
    const el = mount(2026);
    const dialog = stubDialogShow(el);
    await dispatch('goal:title-set', { year: '2026', id: 'c1', title: 'Grand Capstone' });
    await dispatch('goal:progress-set', { year: '2026', id: 'c1', percentage: 40 });

    el.shadowRoot.querySelector('#capstone-list').dispatchEvent(new CustomEvent('goal-tap', {
      detail: { goal: { id: 'c1', title: 'Grand Capstone', percentage: 40 } },
    }));

    const modal = dialog.shadowRoot.querySelector('#modal');
    await vi.waitFor(() => expect(modal.tabCount).toBe(2));
    const items = dialog.shadowRoot.querySelectorAll('#activity-list .activity-item');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('40%');       // most recent event first
    expect(items[1].textContent).toContain('Grand Capstone');
  });

  it('opening the add-new-goal flow shows no activity tab (nothing has happened yet)', async () => {
    await boot({ dbName: freshName(), reducer });
    const el = mount(2026);
    const dialog = stubDialogShow(el);

    el.shadowRoot.querySelector('#add-capstone').click();

    const modal = dialog.shadowRoot.querySelector('#modal');
    await vi.waitFor(() => expect(modal.tabCount).toBe(1));
  });
});
