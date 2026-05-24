import { AppElement } from '../../_lib/core/app-element.js';
import * as Store from '../../_lib/core/store/store.js';
import '../components/goal-card/goal-card.js';

class HomePage extends AppElement {
  template() {
    return `
      <style>
        button {
          min-block-size: var(--touch-target);
          padding-inline: var(--space-4);
        }
        #goals {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          padding: var(--space-4);
        }
        p[role="status"] {
          padding-inline: var(--space-4);
        }
      </style>
      <main>
        <h1>Socle Reference App</h1>
        <p role="status">Goals: <span id="count">0</span></p>
        <button id="add">Add goal</button>
        <div id="goals"></div>
      </main>
    `;
  }

  subscribe() {
    this._onGoals = goals => {
      const list = goals ?? [];
      this.shadowRoot.querySelector('#count').textContent = String(list.length);
      this._renderGoals(list);
    };
    Store.subscribe('goals', this._onGoals);

    this._onAdd = () => Store.dispatch('goal:added', { title: `Goal ${Date.now()}`, createdAt: Date.now() });
    this.shadowRoot.querySelector('#add').addEventListener('click', this._onAdd);

    const goals = this.shadowRoot.querySelector('#goals');
    this._onGoalTap              = e => Store.dispatch('goal:toggled',           { id: e.detail.id });
    this._onGoalDelete           = e => Store.dispatch('goal:deleted',            { id: e.detail.id });
    this._onGoalCompletionChange = e => Store.dispatch('goal:completion-changed', { id: e.detail.id, completion: e.detail.completion });
    goals.addEventListener('goal-tap',               this._onGoalTap);
    goals.addEventListener('goal-delete',            this._onGoalDelete);
    goals.addEventListener('goal-completion-change', this._onGoalCompletionChange);
  }

  unsubscribe() {
    Store.unsubscribe('goals', this._onGoals);
    this.shadowRoot.querySelector('#add')?.removeEventListener('click', this._onAdd);
    const goals = this.shadowRoot.querySelector('#goals');
    goals?.removeEventListener('goal-tap',               this._onGoalTap);
    goals?.removeEventListener('goal-delete',            this._onGoalDelete);
    goals?.removeEventListener('goal-completion-change', this._onGoalCompletionChange);
  }

  _renderGoals(goals) {
    const container = this.shadowRoot.querySelector('#goals');
    const byId = new Map([...container.querySelectorAll('goal-card')].map(c => [c._goal?.id, c]));
    const seen = new Set();

    for (const goal of goals) {
      seen.add(goal.id);
      if (byId.has(goal.id)) {
        byId.get(goal.id).goal = goal;
      } else {
        const card = document.createElement('goal-card');
        card.goal = goal;
        container.appendChild(card);
      }
    }

    for (const [id, card] of byId) {
      if (!seen.has(id)) card.remove();
    }
  }
}

customElements.define('home-page', HomePage);
