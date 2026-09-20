import { AppElement } from '../../../_lib/core/app-element.js';
import { t } from '../../../_lib/core/strings.js';
import '../../../_lib/modules/modal-dialog/modal-dialog.js';

class GoalDialog extends AppElement {
  // `activity` is this goal's events, already fetched and filtered by the caller (home-page
  // owns Store access) — goal-dialog stays a zero-store-knowledge UI component, same as
  // every other property it receives.
  open(goal = null, activity = []) {
    this._input.value = goal?.title ?? '';
    this._saveBtn.disabled = !this._input.value.trim();
    if (this._deleteBtn) this._deleteBtn.hidden = !goal;

    // Activity only exists for a goal that already has events recorded — a brand-new
    // goal (goal === null) has nothing to show, so it stays on the plain single-page
    // dialog rather than exposing an empty second tab.
    this._modal.tabCount = goal ? 2 : 1;
    this._modal.activeTab = 0;
    this._showPage(0);
    this._renderActivity(activity);

    this._modal.show();
    this._input.select();
  }

  _showPage(index) {
    this._pageEdit.hidden     = index !== 0;
    this._pageActivity.hidden = index !== 1;
  }

  _renderActivity(events) {
    this._activityList.replaceChildren();
    if (!events.length) {
      const li = document.createElement('li');
      li.className = 'activity-empty';
      li.textContent = t('goal-dialog.activity-empty');
      this._activityList.appendChild(li);
      return;
    }

    for (const event of [...events].reverse()) {
      const li = document.createElement('li');
      li.className = 'activity-item';
      const desc = document.createElement('span');
      desc.textContent = this._describeEvent(event);
      const time = document.createElement('span');
      time.className = 'activity-time';
      time.textContent = new Date(event.occurredAt).toLocaleString();
      li.append(desc, time);
      this._activityList.appendChild(li);
    }
  }

  _describeEvent(event) {
    switch (event.type.split(':')[1]) {
      case 'title-set':    return t('goal-dialog.activity-title-set', { title: event.payload.title });
      case 'progress-set': return t('goal-dialog.activity-progress-set', { percentage: event.payload.percentage });
      case 'deleted':      return t('goal-dialog.activity-deleted');
      default:             return event.type;
    }
  }

  template() {
    return `
      <style>
        h2 {
          font-size: var(--font-size-heading);
          font-weight: var(--font-weight-semibold);
          color: var(--color-text-primary);
          margin-block-end: var(--space-4);
          line-height: var(--line-height-tight);
        }

        input {
          display: block;
          inline-size: 100%;
          background: var(--color-surface-raised);
          border: 0.5px solid var(--color-border);
          border-radius: var(--radius-sm);
          padding: var(--space-3);
          font-size: var(--font-size-body);
          font-family: var(--font-family);
          color: var(--color-text-primary);
          outline: none;
          box-sizing: border-box;
        }

        input:focus {
          border-color: var(--color-accent);
        }

        input::placeholder {
          color: var(--color-text-muted);
        }

        .actions {
          display: flex;
          justify-content: space-between;
          gap: var(--space-2);
          flex: 1;
        }

        .actions-end {
          display: flex;
          gap: var(--space-2);
        }

        button {
          min-block-size: var(--touch-target);
          padding-inline: var(--space-4);
          border-radius: var(--radius-sm);
          border: none;
          cursor: pointer;
          font-size: var(--font-size-body);
          font-family: var(--font-family);
          font-weight: var(--font-weight-medium);
        }

        button:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: 2px;
        }

        #delete {
          background: none;
          color: var(--color-danger);
        }

        #cancel {
          background: none;
          color: var(--color-text-secondary);
        }

        #save {
          background: var(--color-accent);
          color: var(--color-text-inverse);
        }

        #save:disabled {
          opacity: 0.4;
          cursor: default;
        }

        #activity-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .activity-item {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: var(--space-2);
          padding-block: var(--space-2);
          border-block-end: 1px solid var(--color-border);
          font-size: var(--font-size-caption);
          color: var(--color-text-secondary);
        }

        .activity-item:last-child {
          border-block-end: none;
        }

        .activity-time {
          flex-shrink: 0;
          white-space: nowrap;
          color: var(--color-text-muted);
        }

        .activity-empty {
          color: var(--color-text-muted);
          font-size: var(--font-size-caption);
          padding-block: var(--space-2);
        }
      </style>

      <modal-dialog id="modal">
        <div id="page-edit">
          <h2>${t('goal-dialog.heading')}</h2>
          <input id="input"
                 type="text"
                 aria-label="${t('goal-dialog.placeholder')}"
                 placeholder="${t('goal-dialog.placeholder')}"
                 autocomplete="off"
                 maxlength="80" />
        </div>
        <div id="page-activity" hidden>
          <h2>${t('goal-dialog.activity-heading')}</h2>
          <ul id="activity-list"></ul>
        </div>
        <div slot="footer" class="actions">
          <button type="button" id="delete" hidden>${t('goal-dialog.delete')}</button>
          <div class="actions-end">
            <button type="button" id="cancel">${t('goal-dialog.cancel')}</button>
            <button type="button" id="save" disabled>${t('goal-dialog.save')}</button>
          </div>
        </div>
      </modal-dialog>
    `;
  }

  subscribe() {
    this._modal         = this.shadowRoot.querySelector('#modal');
    this._input         = this.shadowRoot.querySelector('#input');
    this._saveBtn       = this.shadowRoot.querySelector('#save');
    this._deleteBtn     = this.shadowRoot.querySelector('#delete');
    this._pageEdit      = this.shadowRoot.querySelector('#page-edit');
    this._pageActivity  = this.shadowRoot.querySelector('#page-activity');
    this._activityList  = this.shadowRoot.querySelector('#activity-list');
    this._saved         = false;

    // Edit is a fixed-height form; Activity's height grows with event count. Without this,
    // switching tabs would visibly resize the sheet.
    this._modal.fixedHeight = true;

    this._onTabChange = e => this._showPage(e.detail.index);
    this._modal.addEventListener('modal-tab-change', this._onTabChange);

    this._onInput = () => {
      this._saveBtn.disabled = !this._input.value.trim();
    };

    this._onSave = () => {
      const title = this._input.value.trim();
      if (!title) return;
      this._saved = true;
      this.dispatchEvent(new CustomEvent('goal-saved', {
        bubbles: true, composed: true, detail: { title },
      }));
      this._modal.close();
    };

    this._onCancel = () => this._modal.close();

    this._onDelete = () => {
      this.dispatchEvent(new CustomEvent('goal-delete', { bubbles: true, composed: true }));
      this._modal.close();
    };

    this._onModalClose = e => {
      e.stopPropagation();
      if (!this._saved) {
        this.dispatchEvent(new CustomEvent('goal-cancelled', { bubbles: true, composed: true }));
      }
      this._saved = false;
    };

    this._onKeyDown = (e) => { if (e.key === 'Enter') this._onSave(); };

    this._input.addEventListener('input',   this._onInput);
    this._input.addEventListener('keydown', this._onKeyDown);
    this._saveBtn.addEventListener('click', this._onSave);
    this._deleteBtn.addEventListener('click', this._onDelete);
    this.shadowRoot.querySelector('#cancel').addEventListener('click', this._onCancel);
    this._modal.addEventListener('modal-close', this._onModalClose);
  }

  unsubscribe() {
    this._input?.removeEventListener('input',   this._onInput);
    this._input?.removeEventListener('keydown', this._onKeyDown);
    this._saveBtn?.removeEventListener('click', this._onSave);
    this._deleteBtn?.removeEventListener('click', this._onDelete);
    this.shadowRoot.querySelector('#cancel')?.removeEventListener('click', this._onCancel);
    this._modal?.removeEventListener('modal-close', this._onModalClose);
    this._modal?.removeEventListener('modal-tab-change', this._onTabChange);
  }
}

customElements.define('goal-dialog', GoalDialog);
