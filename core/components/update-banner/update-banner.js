import { AppElement } from '../../app-element.js';
import { subscribe, unsubscribe } from '../../store/store.js';
import { t } from '../../strings.js';

class UpdateBanner extends AppElement {
  template() {
    return `
      <style>
        :host {
          position: fixed;
          inset-block-start: 0;
          inset-inline: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-4);
          padding-block-start: calc(var(--space-3) + var(--safe-area-top));
          padding-block-end: var(--space-3);
          padding-inline: var(--space-4);
          background: var(--color-action-dark);
          color: var(--color-action-dark-text);
          box-shadow: var(--shadow-sheet);
        }
        :host([hidden]) { display: none; }
        button {
          background: none;
          border: none;
          color: inherit;
          cursor: pointer;
          font-size: var(--font-size-body);
          min-block-size: var(--touch-target);
          min-inline-size: var(--touch-target);
          padding-inline: var(--space-3);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        #reload {
          border: 1px solid currentColor;
          border-radius: var(--radius-sm);
          padding-inline: var(--space-4);
          font-weight: var(--font-weight-medium);
        }
        .actions {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          flex-shrink: 0;
        }
      </style>
      <span>${t('update-banner.available')}</span>
      <div class="actions">
        <button id="reload">${t('update-banner.reload')}</button>
        <button id="dismiss" aria-label="${t('update-banner.dismiss')}">&#x2715;</button>
      </div>
    `;
  }

  subscribe() {
    this.setAttribute('role', 'alert');
    this._onUpdate = visible => {
      if (visible) this.removeAttribute('hidden');
    };
    subscribe('updateAvailable', this._onUpdate);

    this._onReload = () => {
      navigator.serviceWorker.getRegistration()
        .then(r => {
          if (r?.waiting) r.waiting.postMessage({ type: 'SKIP_WAITING' });
          else location.reload();
        });
    };
    this._onDismiss = () => this.setAttribute('hidden', '');

    this.shadowRoot.querySelector('#reload').addEventListener('click', this._onReload);
    this.shadowRoot.querySelector('#dismiss').addEventListener('click', this._onDismiss);
  }

  unsubscribe() {
    unsubscribe('updateAvailable', this._onUpdate);
    this.shadowRoot.querySelector('#reload')?.removeEventListener('click', this._onReload);
    this.shadowRoot.querySelector('#dismiss')?.removeEventListener('click', this._onDismiss);
  }
}

customElements.define('update-banner', UpdateBanner);
