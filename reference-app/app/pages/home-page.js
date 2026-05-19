import { AppElement } from '../../_lib/core/app-element.js';
import * as Store from '../../_lib/core/store/store.js';

class HomePage extends AppElement {
  template() {
    return `
      <style>
        button {
          min-block-size: var(--touch-target);
          padding-inline: var(--space-4);
        }
      </style>
      <main>
        <h1>Socle Reference App</h1>
        <p role="status">Goals: <span id="count">0</span></p>
        <button id="add">Add goal</button>
      </main>
    `;
  }

  subscribe() {
    this._onGoals = goals => {
      this.shadowRoot.querySelector('#count').textContent = String((goals ?? []).length);
    };
    Store.subscribe('goals', this._onGoals);

    this._onAdd = () => Store.dispatch('goal:added', { title: 'New goal', createdAt: Date.now() });
    this.shadowRoot.querySelector('#add').addEventListener('click', this._onAdd);
  }

  unsubscribe() {
    Store.unsubscribe('goals', this._onGoals);
    this.shadowRoot.querySelector('#add')?.removeEventListener('click', this._onAdd);
  }
}

customElements.define('home-page', HomePage);
