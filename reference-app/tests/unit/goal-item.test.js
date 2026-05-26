// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../../app/strings.js';
import '../../app/components/goal-item/goal-item.js';

HTMLElement.prototype.setPointerCapture    = () => {};
HTMLElement.prototype.releasePointerCapture = () => {};

function mount(goal = { id: 'g1', title: 'Test goal', percentage: 0 }) {
  const el = document.createElement('goal-item');
  document.body.appendChild(el);
  el.goal = goal;
  return el;
}

afterEach(() => { document.body.innerHTML = ''; });

describe('goal-item — structure', () => {
  it('renders a bar with the goal title', () => {
    const el = mount();
    expect(el.shadowRoot.querySelector('.title').textContent).toBe('Test goal');
  });

  it('renders fill width matching percentage', () => {
    const el = mount({ id: 'g1', title: 'Run', percentage: 40 });
    expect(el.shadowRoot.querySelector('.fill').style.width).toBe('40%');
  });

  it('shows 0% fill when no goal set', () => {
    const el = document.createElement('goal-item');
    document.body.appendChild(el);
    expect(el.shadowRoot.querySelector('.fill').style.width).toBe('0%');
  });

  it('updates when goal prop changes', () => {
    const el = mount({ id: 'g1', title: 'First', percentage: 10 });
    el.goal = { id: 'g1', title: 'Updated', percentage: 50 };
    expect(el.shadowRoot.querySelector('.title').textContent).toBe('Updated');
    expect(el.shadowRoot.querySelector('.fill').style.width).toBe('50%');
  });

  it('renders an action button', () => {
    const el = mount();
    expect(el.shadowRoot.querySelector('#action')).not.toBeNull();
  });

  it('action button says Fail in view mode', () => {
    const el = mount();
    expect(el.shadowRoot.querySelector('#action').textContent).toBe('Fail');
  });

  it('action button says Delete in edit mode', () => {
    const el = mount();
    el.editMode = true;
    expect(el.shadowRoot.querySelector('#action').textContent).toBe('Delete');
  });
});

describe('goal-item — failed state', () => {
  it('applies failed class for negative percentage', () => {
    const el = mount({ id: 'g1', title: 'Run', percentage: -1 });
    expect(el.classList.contains('failed')).toBe(true);
  });

  it('shows 0% fill for failed goal', () => {
    const el = mount({ id: 'g1', title: 'Run', percentage: -1 });
    expect(el.shadowRoot.querySelector('.fill').style.width).toBe('0%');
  });

  it('action button says Restore for failed goal in view mode', () => {
    const el = mount({ id: 'g1', title: 'Run', percentage: -1 });
    expect(el.shadowRoot.querySelector('#action').textContent).toBe('Restore');
  });

  it('dispatches goal-progress with percentage 0 when Restore clicked', () => {
    const el = mount({ id: 'g1', title: 'Run', percentage: -1 });
    const events = [];
    el.addEventListener('goal-progress', e => events.push(e));
    el.shadowRoot.querySelector('#action').click();
    expect(events).toHaveLength(1);
    expect(events[0].detail.percentage).toBe(0);
  });
});

describe('goal-item — tap', () => {
  it('dispatches goal-tap on tap in edit mode', () => {
    const el = mount();
    el.editMode = true;
    const events = [];
    el.addEventListener('goal-tap', e => events.push(e));
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 50, clientY: 50, pointerId: 1, button: 0 }));
    el.dispatchEvent(new PointerEvent('pointerup',   { bubbles: true, clientX: 50, clientY: 50, pointerId: 1, button: 0 }));
    expect(events).toHaveLength(1);
    expect(events[0].detail.goal.title).toBe('Test goal');
  });

  it('does not dispatch goal-tap on tap in view mode', () => {
    const el = mount();
    const events = [];
    el.addEventListener('goal-tap', e => events.push(e));
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 50, clientY: 50, pointerId: 1, button: 0 }));
    el.dispatchEvent(new PointerEvent('pointerup',   { bubbles: true, clientX: 50, clientY: 50, pointerId: 1, button: 0 }));
    expect(events).toHaveLength(0);
  });
});

describe('goal-item — action button', () => {
  it('dispatches goal-delete in edit mode when action button clicked', () => {
    const el = mount();
    el.editMode = true;
    const events = [];
    el.addEventListener('goal-delete', e => events.push(e));
    el.shadowRoot.querySelector('#action').click();
    expect(events).toHaveLength(1);
    expect(events[0].detail.goal.id).toBe('g1');
  });

  it('dispatches goal-progress with percentage -1 in view mode (Fail)', () => {
    const el = mount({ id: 'g1', title: 'Run', percentage: 30 });
    const events = [];
    el.addEventListener('goal-progress', e => events.push(e));
    el.shadowRoot.querySelector('#action').click();
    expect(events).toHaveLength(1);
    expect(events[0].detail.percentage).toBe(-1);
  });
});

describe('goal-item — keyboard', () => {
  it('ArrowRight increases percentage and emits goal-progress', () => {
    const el = mount({ id: 'g1', title: 'Run', percentage: 30 });
    const events = [];
    el.addEventListener('goal-progress', e => events.push(e));
    el.shadowRoot.querySelector('.bar').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
    );
    expect(events[0].detail.percentage).toBe(35);
  });

  it('ArrowLeft decreases percentage and emits goal-progress', () => {
    const el = mount({ id: 'g1', title: 'Run', percentage: 30 });
    const events = [];
    el.addEventListener('goal-progress', e => events.push(e));
    el.shadowRoot.querySelector('.bar').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })
    );
    expect(events[0].detail.percentage).toBe(25);
  });

  it('does not go below 0', () => {
    const el = mount({ id: 'g1', title: 'Run', percentage: 0 });
    el.shadowRoot.querySelector('.bar').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })
    );
    expect(el.shadowRoot.querySelector('.fill').style.width).toBe('0%');
  });

  it('does not exceed 100', () => {
    const el = mount({ id: 'g1', title: 'Run', percentage: 100 });
    el.shadowRoot.querySelector('.bar').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
    );
    expect(el.shadowRoot.querySelector('.fill').style.width).toBe('100%');
  });
});

describe('goal-item — swipe availability (_canSwipe)', () => {
  it('allows swipe on incomplete goal in view mode', () => {
    const el = mount({ id: 'g1', title: 'Run', percentage: 50 });
    expect(el._canSwipe).toBe(true);
  });

  it('disallows swipe on completed goal in view mode', () => {
    const el = mount({ id: 'g1', title: 'Run', percentage: 100 });
    expect(el._canSwipe).toBe(false);
  });

  it('allows swipe on completed goal in edit mode', () => {
    const el = mount({ id: 'g1', title: 'Run', percentage: 100 });
    el.editMode = true;
    expect(el._canSwipe).toBe(true);
  });

  it('allows swipe on failed goal in view mode', () => {
    const el = mount({ id: 'g1', title: 'Run', percentage: -1 });
    expect(el._canSwipe).toBe(true);
  });
});

describe('goal-item — hold drag', () => {
  it('emits goal-progress on hold-drag end', async () => {
    const el = mount({ id: 'g1', title: 'Run', percentage: 0 });

    el.shadowRoot.querySelector('.bar').getBoundingClientRect = () => ({ left: 0, width: 200, top: 0, height: 40 });

    const events = [];
    el.addEventListener('goal-progress', e => events.push(e));

    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 20, pointerId: 1, button: 0 }));
    await vi.waitFor(() => expect(el.classList.contains('hold-active')).toBe(true), { timeout: 600 });
    el.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 100, clientY: 20, pointerId: 1 }));
    el.dispatchEvent(new PointerEvent('pointerup',   { bubbles: true, clientX: 100, clientY: 20, pointerId: 1, button: 0 }));

    expect(events).toHaveLength(1);
    expect(events[0].detail.percentage).toBe(50);
  });
});
