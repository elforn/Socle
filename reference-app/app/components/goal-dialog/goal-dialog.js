import { AppElement } from '../../../_lib/core/app-element.js';
import { t } from '../../../_lib/core/strings.js';

class GoalDialog extends AppElement {
  open(goal = null) {
    this._input.value = goal?.title ?? '';
    this._saveBtn.disabled = !this._input.value.trim();
    if (this._deleteBtn) this._deleteBtn.hidden = !goal;
    this._justOpened = true;
    this._dialog.showModal();
    requestAnimationFrame(() => { this._justOpened = false; });
    this._input.select();
  }

  template() {
    return `
      <style>
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        dialog {
          background: var(--color-surface);
          border: none;
          border-radius: var(--radius-lg);
          padding: var(--space-6) var(--space-5);
          inline-size: min(90vw, 360px);
          box-shadow: var(--shadow-sheet);
          color: var(--color-text-primary);
          font-family: var(--font-family);
        }

        dialog[open] {
          animation: fade-in 0.2s ease-out;
        }

        dialog::backdrop {
          background: var(--color-overlay);
          animation: fade-in 0.2s ease-out;
        }

        .handle { display: none; }

        @media (max-width: 600px) {
          dialog {
            position: fixed;
            inset-block-end: 0;
            inset-inline-start: 0;
            inset-block-start: auto;
            margin: 0;
            inline-size: 100%;
            max-inline-size: 100%;
            border-end-start-radius: 0;
            border-end-end-radius: 0;
            border-start-start-radius: var(--radius-lg);
            border-start-end-radius: var(--radius-lg);
            padding-block-end: calc(var(--space-6) + var(--safe-area-bottom));
          }

          dialog[open] {
            animation: slide-up 0.28s cubic-bezier(0.32, 0.72, 0, 1);
          }

          .handle {
            display: block;
            inline-size: 36px;
            block-size: 4px;
            border-radius: var(--radius-full);
            background: var(--color-border);
            margin: 0 auto var(--space-5);
          }
        }

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
          margin-block-start: var(--space-4);
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
      </style>

      <dialog aria-modal="true">
        <div class="handle"></div>
        <h2>${t('goal-dialog.heading')}</h2>
        <input id="input"
               type="text"
               placeholder="${t('goal-dialog.placeholder')}"
               autocomplete="off"
               maxlength="80" />
        <div class="actions">
          <button id="delete" hidden>${t('goal-dialog.delete')}</button>
          <div class="actions-end">
            <button id="cancel">${t('goal-dialog.cancel')}</button>
            <button id="save" disabled>${t('goal-dialog.save')}</button>
          </div>
        </div>
      </dialog>
    `;
  }

  subscribe() {
    this._dialog    = this.shadowRoot.querySelector('dialog');
    this._input     = this.shadowRoot.querySelector('#input');
    this._saveBtn   = this.shadowRoot.querySelector('#save');
    this._deleteBtn = this.shadowRoot.querySelector('#delete');
    this._saved     = false;

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
      this._dialog.close();
    };

    this._onCancel = () => this._dialog.close();

    this._onDelete = () => {
      this.dispatchEvent(new CustomEvent('goal-delete', { bubbles: true, composed: true }));
      this._dialog.close();
    };

    this._onClose = () => {
      if (!this._saved) {
        this.dispatchEvent(new CustomEvent('goal-cancelled', { bubbles: true, composed: true }));
      }
      this._saved = false;
    };

    // pointerup not click: the gesture that opened the dialog synthesises a click
    // on the same frame; _justOpened guard clears via rAF so the next pointer
    // release (genuine backdrop tap) is the first one that can dismiss.
    this._onBackdrop = (e) => {
      if (!this._justOpened && e.target === this._dialog) this._dialog.close();
    };

    this._onKeyDown = (e) => { if (e.key === 'Enter') this._onSave(); };

    this._input.addEventListener('input',   this._onInput);
    this._input.addEventListener('keydown', this._onKeyDown);
    this._saveBtn.addEventListener('click', this._onSave);
    this._deleteBtn.addEventListener('click', this._onDelete);
    this.shadowRoot.querySelector('#cancel').addEventListener('click', this._onCancel);
    this._dialog.addEventListener('close', this._onClose);
    this._dialog.addEventListener('pointerup', this._onBackdrop);
  }

  unsubscribe() {
    this._input?.removeEventListener('input',   this._onInput);
    this._input?.removeEventListener('keydown', this._onKeyDown);
    this._saveBtn?.removeEventListener('click', this._onSave);
    this._deleteBtn?.removeEventListener('click', this._onDelete);
    this.shadowRoot.querySelector('#cancel')?.removeEventListener('click', this._onCancel);
    this._dialog?.removeEventListener('close', this._onClose);
    this._dialog?.removeEventListener('pointerup', this._onBackdrop);
  }
}

customElements.define('goal-dialog', GoalDialog);
