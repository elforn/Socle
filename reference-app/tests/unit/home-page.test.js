// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { boot, dispatch, getState, reset } from '../../_lib/core/store/store.js';
import { reducer } from '../../app/store/reducer.js';
import '../../app/pages/home-page.js';

let dbSeq = 0;
function freshName() { return `home-page-test-${dbSeq++}`; }

function mount() {
  const el = document.createElement('home-page');
  document.body.appendChild(el);
  return el;
}

beforeEach(() => reset());
afterEach(() => { document.body.innerHTML = ''; });

describe('home-page — rendering', () => {
  it('renders a <main> landmark in shadow DOM', async () => {
    await boot({ dbName: freshName(), reducer });
    const el = mount();
    expect(el.shadowRoot.querySelector('main')).not.toBeNull();
  });

  it('shows initial goal count of 0', async () => {
    await boot({ dbName: freshName(), reducer });
    const el = mount();
    expect(el.shadowRoot.querySelector('#count').textContent).toBe('0');
  });

  it('count paragraph has role="status" for screen reader announcements', async () => {
    await boot({ dbName: freshName(), reducer });
    const el = mount();
    expect(el.shadowRoot.querySelector('p[role="status"]')).not.toBeNull();
  });

});

describe('home-page — store integration', () => {
  it('count updates when a goal is dispatched', async () => {
    await boot({ dbName: freshName(), reducer });
    const el = mount();
    await dispatch('goal:added', { title: 'Test goal' });
    expect(el.shadowRoot.querySelector('#count').textContent).toBe('1');
  });

  it('mounts with correct count when store already has goals', async () => {
    const name = freshName();
    await boot({ dbName: name, reducer });
    await dispatch('goal:added', { title: 'Pre-existing' });
    reset();
    await boot({ dbName: name, reducer });
    const el = mount();
    expect(el.shadowRoot.querySelector('#count').textContent).toBe('1');
  });

  it('add button dispatches goal:added and updates the count', async () => {
    await boot({ dbName: freshName(), reducer });
    const el = mount();
    el.shadowRoot.querySelector('#add').click();
    await new Promise(r => setTimeout(r, 0));
    expect(getState().goals).toHaveLength(1);
    expect(el.shadowRoot.querySelector('#count').textContent).toBe('1');
  });
});

describe('home-page — lifecycle', () => {
  it('dispatching after disconnect does not throw and store remains functional', async () => {
    await boot({ dbName: freshName(), reducer });
    const el = mount();
    document.body.removeChild(el);
    await expect(dispatch('goal:added', { title: 'After disconnect' })).resolves.toBeUndefined();
    expect(getState().goals).toHaveLength(1);
  });
});
