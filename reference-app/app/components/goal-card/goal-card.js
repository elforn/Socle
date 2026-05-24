import { AppElement } from '../../../_lib/core/app-element.js';
import { Gestures } from '../../../_lib/modules/gestures/gestures.js';
import { t } from '../../../_lib/core/strings.js';

const REVEAL_DISTANCE = 80;    // px — fully armed position
const REVEAL_THRESHOLD = 120;   // px visual — must reveal most of button to snap
const SWIPE_VELOCITY_MIN = 0.7; // px/ms — fast flick snaps even if short
const RESISTANCE = 0.75;        // card moves slower than finger for deliberate feel
const SWIPE_DEAD_ZONE = 18;     // px — card stays still until this much movement is detected

class GoalCard extends Gestures(AppElement) {
  set goal(value) {
    this._goal = value;
    this._completion = value?.completion ?? 0;
    if (this.shadowRoot) this._update();
  }

  template() {
    return `
      <style>
        :host {
          display: block;
          position: relative;
          overflow: hidden;
          border-radius: var(--radius-md);
          outline: none;
        }
        :host(:focus-visible) {
          outline: 2px solid var(--color-accent);
          outline-offset: 2px;
        }
        .card-inner {
          position: relative;
          z-index: 1;
          background: var(--color-surface-raised);
          padding: var(--space-3) var(--space-4);
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          min-block-size: var(--touch-target);
          will-change: transform;
        }
        .title {
          margin: 0;
          font-size: var(--font-size-subheading);
          font-weight: var(--font-weight-medium);
          color: var(--color-text-primary);
        }
        .progress-bar {
          block-size: var(--touch-target);
          background: var(--color-border);
          border-radius: var(--radius-full);
          overflow: hidden;
          position: relative;
          cursor: grab;
        }
        .progress-bar:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: 3px;
        }
        .progress-bar.hold-active {
          outline: 2px solid var(--color-accent);
          outline-offset: 3px;
        }
        @keyframes bar-at-max {
          from { outline: 2px solid var(--color-accent); outline-offset: 1px; }
          to   { outline: 2px solid transparent;         outline-offset: 7px; }
        }
        .progress-bar.at-max {
          animation: bar-at-max 0.4s var(--ease-out) forwards;
        }
        .progress-fill {
          block-size: 100%;
          background: var(--color-accent);
          border-radius: var(--radius-full);
          width: 0%;
        }
        @keyframes bar-celebrate {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        .progress-fill.celebrate {
          background: linear-gradient(90deg,
            var(--color-accent) 25%,
            var(--color-accent-light) 50%,
            var(--color-accent) 75%
          );
          background-size: 300% 100%;
          animation: bar-celebrate var(--duration-slow) var(--ease-out) forwards;
        }
        .complete-flash {
          position: absolute;
          inset: 0;
          background: var(--color-accent);
          opacity: 0;
          pointer-events: none;
          border-radius: inherit;
        }
        @keyframes complete-flash {
          0%   { opacity: 0; }
          20%  { opacity: 0.18; }
          100% { opacity: 0; }
        }
        :host(.celebrating) .complete-flash {
          animation: complete-flash 600ms var(--ease-out) forwards;
        }
        .pct-label {
          position: absolute;
          inset-block: 0;
          inset-inline-start: var(--space-2);
          display: flex;
          align-items: center;
          font-size: var(--font-size-micro);
          font-weight: var(--font-weight-semibold);
          color: white;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
          pointer-events: none;
          user-select: none;
        }
        .action-left,
        .action-right {
          position: absolute;
          inset-block: 0;
          inline-size: ${REVEAL_DISTANCE}px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .action-left  { inset-inline-start: 0; background: var(--color-success); }
        .action-left.undo { background: var(--color-info); }
        .action-right { inset-inline-end: 0;   background: var(--color-danger); }
        @keyframes card-scale {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.14); animation-timing-function: var(--ease-spring); }
          100% { transform: scale(1); }
        }
        @keyframes card-ring {
          0%   { box-shadow: 0 0 0 0    color-mix(in srgb, var(--color-accent) 85%, transparent); }
          15%  { box-shadow: 0 0 0 8px  color-mix(in srgb, var(--color-accent) 50%, transparent); }
          100% { box-shadow: 0 0 0 80px transparent; }
        }
        :host(.celebrating) {
          overflow: visible;
          z-index: 2;
          border-radius: var(--radius-md);
          animation: card-scale 750ms linear forwards,
                     card-ring  700ms ease-out forwards;
        }
        button {
          background: none;
          border: none;
          color: var(--color-text-inverse);
          font: var(--font-weight-semibold) var(--font-size-caption) var(--font-family);
          padding: var(--space-2) var(--space-3);
          cursor: pointer;
          min-block-size: var(--touch-target);
          min-inline-size: var(--touch-target);
          border-radius: var(--radius-sm);
        }
        button:focus-visible {
          outline: 2px solid var(--color-text-inverse);
          outline-offset: 2px;
        }
      </style>
      <div class="action-left" aria-hidden="true">
        <button class="btn-complete" tabindex="-1">${t('goal-card.complete')}</button>
      </div>
      <div class="action-right" aria-hidden="true">
        <button class="btn-delete" tabindex="-1">${t('goal-card.delete')}</button>
      </div>
      <div class="card-inner">
        <div class="complete-flash" aria-hidden="true"></div>
        <p class="title"></p>
        <div class="progress-bar"
             role="slider"
             tabindex="0"
             aria-label="${t('goal-card.progress-label')}"
             aria-valuemin="0"
             aria-valuemax="100"
             aria-valuenow="0">
          <div class="progress-fill"></div>
          <span class="pct-label" aria-hidden="true">0%</span>
        </div>
      </div>
    `;
  }

  subscribe() {
    this.setAttribute('tabindex', '0');

    this._cardInner = this.shadowRoot.querySelector('.card-inner');
    this._progressBar = this.shadowRoot.querySelector('.progress-bar');
    this._progressFill = this.shadowRoot.querySelector('.progress-fill');
    this._pctLabel = this.shadowRoot.querySelector('.pct-label');
    this._actionLeft = this.shadowRoot.querySelector('.action-left');
    this._actionRight = this.shadowRoot.querySelector('.action-right');
    this._btnComplete = this.shadowRoot.querySelector('.btn-complete');
    this._btnDelete = this.shadowRoot.querySelector('.btn-delete');

    this._onKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.onTap();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        this._dispatchDelete();
      } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !this.shadowRoot.activeElement) {
        // Arrow keys arm/dismiss only when no shadow child (progress bar, button) has focus
        e.preventDefault();
        if (this._armed) { this._dismiss(); } else { this._arm(e.key === 'ArrowLeft' ? 'left' : 'right'); }
      }
    };
    this.addEventListener('keydown', this._onKeyDown);

    // Arrow key control for the slider
    this._onBarKeyDown = (e) => {
      const step = 5;
      let changed = true;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); this._setCompletion(Math.min(100, this._completion + step)); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); this._setCompletion(Math.max(0, this._completion - step)); }
      else if (e.key === 'Home') { e.preventDefault(); this._setCompletion(0); }
      else if (e.key === 'End') { e.preventDefault(); this._setCompletion(100); }
      else { changed = false; }
      if (changed) this._dispatchCompletionChange();
    };
    this._progressBar.addEventListener('keydown', this._onBarKeyDown);

    // Hold-drag on progress bar via Gestures.attach; swipe passes through to card
    this._barCleanup = Gestures.attach(this._progressBar, {
      onHoldDragStart: () => {
        navigator.vibrate?.(50);
        this._progressBar.classList.add('hold-active');
        this._progressFill.style.transition = 'none';
      },
      onHoldDrag: (e) => {
        const rect = this._progressBar.getBoundingClientRect();
        if (rect.width === 0) return;
        const pct = Math.round(Math.max(0, Math.min(100, (e.endX - rect.left) / rect.width * 100)));
        this._setCompletion(pct);
      },
      onHoldDragEnd: () => {
        this._progressBar.classList.remove('hold-active', 'at-max');
        this._progressFill.style.transition = '';
        if (this._completion === 100) this._celebrate();
        this._dispatchCompletionChange();
      },
      onSwipeMove: (e) => this.onSwipeMove(e),
      onSwipe: (e) => this.onSwipe(e),
    });

    this._btnComplete.addEventListener('click', () => {
      this._dismiss();
      if (this._completion === 100) {
        this._setCompletion(0);
      } else {
        this._setCompletion(100);
        this._celebrate();
      }
      this._dispatchCompletionChange();
    });
    this._btnDelete.addEventListener('click', () => {
      this._dismiss();
      this._dispatchDelete();
    });

    this._update();
  }

  unsubscribe() {
    this.removeEventListener('keydown', this._onKeyDown);
    this._progressBar?.removeEventListener('keydown', this._onBarKeyDown);
    this._barCleanup?.();
  }

  // ── swipe gesture (mixin) — card reveal ───────────────────────────────────

  onSwipeMove(e) {
    this._cardInner.style.transition = 'none';
    if (this._armed) {
      const armOffset = this._armed === 'left' ? -REVEAL_DISTANCE : REVEAL_DISTANCE;
      const sign = e.dx >= 0 ? 1 : -1;
      const past = Math.max(0, Math.abs(e.dx) - SWIPE_DEAD_ZONE);
      const pos = Math.max(-REVEAL_DISTANCE, Math.min(REVEAL_DISTANCE, armOffset + sign * past * RESISTANCE));
      this._cardInner.style.transform = `translateX(${pos}px)`;
      return;
    }
    const sign = e.dx >= 0 ? 1 : -1;
    const past = Math.max(0, Math.abs(e.dx) - SWIPE_DEAD_ZONE);
    const clamped = Math.max(-REVEAL_DISTANCE, Math.min(REVEAL_DISTANCE, sign * past * RESISTANCE));
    this._cardInner.style.transform = `translateX(${clamped}px)`;
  }

  onSwipe(e) {
    if (this._armed) {
      const returning = (this._armed === 'left' && e.direction === 'right') ||
        (this._armed === 'right' && e.direction === 'left');
      if (returning) {
        const visual = Math.max(0, e.distance - SWIPE_DEAD_ZONE) * RESISTANCE;
        if (visual >= REVEAL_DISTANCE * 0.65 || e.velocity >= SWIPE_VELOCITY_MIN) {
          this._dismiss();
        } else {
          this._arm(this._armed); // not enough — snap back to armed
        }
      } else {
        this._arm(e.direction); // deeper in same direction — re-arm
      }
      return;
    }
    const visual = Math.max(0, e.distance - SWIPE_DEAD_ZONE) * RESISTANCE;
    const shouldReveal = visual > REVEAL_THRESHOLD || e.velocity >= SWIPE_VELOCITY_MIN;
    if (shouldReveal) {
      this._arm(e.direction);
    } else {
      this._dismiss();
    }
  }

  onTap(e) {
    if (this._armed) {
      // Pointer capture redirects pointerup to the host, so button.click() won't fire.
      // Hit-test the tap position against the exposed button and execute the action directly.
      const x = e?.endX, y = e?.endY;
      if (x != null && y != null) {
        const armed = this._armed;
        const btn = armed === 'right' ? this._btnComplete : this._btnDelete;
        const r = btn.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
          this._dismiss();
          if (armed === 'right') {
            if (this._completion === 100) { this._setCompletion(0); }
            else { this._setCompletion(100); this._celebrate(); }
            this._dispatchCompletionChange();
          } else {
            this._dispatchDelete();
          }
          return;
        }
      }
      this._dismiss();
      return;
    }
    if (this._goal) {
      this.dispatchEvent(new CustomEvent('goal-tap', {
        bubbles: true, composed: true, detail: { id: this._goal.id },
      }));
    }
  }

  // ── internal helpers ──────────────────────────────────────────────────────

  _arm(direction) {
    this._armed = direction;
    const dx = direction === 'left' ? -REVEAL_DISTANCE : REVEAL_DISTANCE;
    this._cardInner.style.transition = `transform var(--duration-normal) var(--ease-spring)`;
    this._cardInner.style.transform = `translateX(${dx}px)`;
    this._cardInner.style.pointerEvents = 'none';
    const panel = direction === 'left' ? this._actionRight : this._actionLeft;
    const btn   = direction === 'left' ? this._btnDelete  : this._btnComplete;
    panel.removeAttribute('aria-hidden');
    btn.setAttribute('tabindex', '0');
  }

  _dismiss() {
    this._armed = null;
    this._cardInner.style.transition = `transform var(--duration-normal) var(--ease-spring)`;
    this._cardInner.style.transform = 'translateX(0)';
    this._cardInner.style.pointerEvents = '';
    this._actionLeft.setAttribute('aria-hidden', 'true');
    this._actionRight.setAttribute('aria-hidden', 'true');
    this._btnComplete.setAttribute('tabindex', '-1');
    this._btnDelete.setAttribute('tabindex', '-1');
  }

  _setCompletion(pct) {
    this._completion = pct;
    this._progressFill.style.width = `${pct}%`;
    this._progressBar.setAttribute('aria-valuenow', String(pct));
    if (this._pctLabel) this._pctLabel.textContent = `${pct}%`;
    this._updateActionLeft();
    if (pct === 100) {
      this._progressBar.classList.add('at-max');
      this._progressBar.addEventListener('animationend',
        () => this._progressBar.classList.remove('at-max'), { once: true });
    } else {
      this._progressBar.classList.remove('at-max');
    }
  }

  _celebrate() {
    this._progressFill.classList.add('celebrate');
    this._progressFill.addEventListener('animationend',
      () => this._progressFill.classList.remove('celebrate'), { once: true });
    this.classList.add('celebrating');
    this.addEventListener('animationend',
      () => this.classList.remove('celebrating'), { once: true });
  }

  _dispatchDelete() {
    if (!this._goal) return;
    this.dispatchEvent(new CustomEvent('goal-delete', {
      bubbles: true, composed: true, detail: { id: this._goal.id },
    }));
  }

  _dispatchCompletionChange() {
    if (!this._goal) return;
    this.dispatchEvent(new CustomEvent('goal-completion-change', {
      bubbles: true, composed: true,
      detail: { id: this._goal.id, completion: this._completion },
    }));
  }

  _updateActionLeft() {
    if (!this._btnComplete || !this._actionLeft) return;
    const isComplete = this._completion === 100;
    this._btnComplete.textContent = isComplete ? t('goal-card.reset') : t('goal-card.complete');
    this._actionLeft.classList.toggle('undo', isComplete);
  }

  _update() {
    if (!this.shadowRoot) return;
    this.shadowRoot.querySelector('.title').textContent = this._goal?.title ?? '';
    const pct = this._completion ?? 0;
    if (this._progressFill) this._progressFill.style.width = `${pct}%`;
    if (this._progressBar) this._progressBar.setAttribute('aria-valuenow', String(pct));
    if (this._pctLabel) this._pctLabel.textContent = `${pct}%`;
    this._updateActionLeft();
  }
}

customElements.define('goal-card', GoalCard);
