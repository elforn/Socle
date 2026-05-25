import { AppElement } from '../../_lib/core/app-element.js';
import { navigate } from '../../_lib/core/router/router.js';
import * as Store from '../../_lib/core/store/store.js';
import { t } from '../../_lib/core/strings.js';
import '../components/year-header/year-header.js';
import '../components/goal-item/goal-item.js';
import '../components/goal-dialog/goal-dialog.js';

const EVENT_PREFIX = { capstone: 'goal', milestone: 'milestone', wow: 'wow' };

class HomePage extends AppElement {
  template() {
    return `
      <style>
        :host {
          display: block;
          --page-padding: var(--space-5);
        }

        main {
          padding: 0 var(--page-padding);
          padding-block-start: calc(var(--update-banner-height, 0px) + var(--safe-area-top) + var(--space-2) + var(--touch-target) + var(--space-1) + var(--header-strip-height) + var(--space-5));
          padding-block-end: calc(var(--tab-bar-height) + var(--safe-area-bottom) + var(--space-4));
        }

        .tab-panel {
          display: none;
          flex-direction: column;
          gap: var(--space-4);
        }
        .tab-panel.active { display: flex; }

        .section-heading {
          font-size: var(--font-size-caption);
          font-weight: var(--font-weight-semibold);
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-block-end: var(--space-1);
        }

        .edit-btn {
          font-size: var(--font-size-caption);
          font-weight: var(--font-weight-semibold);
          color: var(--color-accent);
          background: none;
          border: none;
          cursor: pointer;
          padding-block: var(--space-1);
          padding-inline: var(--space-2);
          border-radius: var(--radius-sm);
        }

        .edit-btn:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: 2px;
        }

        .list-section {
          display: flex;
          flex-direction: column;
        }


        .item-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        #capstone-list goal-item {
          --goal-item-height: 60px;
        }

        .add-row {
          margin-block-start: var(--space-2);
          display: none;
          inline-size: 100%;
          min-block-size: var(--touch-target);
          background: none;
          border: 1px dashed var(--color-border);
          border-radius: var(--radius-md);
          align-items: center;
          justify-content: center;
          gap: var(--space-2);
          cursor: pointer;
          color: var(--color-text-muted);
          font-size: var(--font-size-caption);
          font-weight: var(--font-weight-medium);
          font-family: var(--font-family);
          padding-inline: var(--space-3);
        }

        .list-section.edit .add-row { display: flex; }

        .add-row:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: 2px;
        }

        /* ── Tab bar ─────────────────────────────────────────── */

        #tab-bar {
          position: fixed;
          inset-block-end: 0;
          inset-inline-start: 0;
          inset-inline-end: 0;
          display: flex;
          background: var(--color-surface);
          border-block-start: 0.5px solid var(--color-border);
          padding-block-end: var(--safe-area-bottom);
          z-index: 50;
        }

        .tab-btn {
          flex: 1;
          background: none;
          border: none;
          cursor: pointer;
          padding-block: var(--space-3);
          font-family: var(--font-family);
          font-size: var(--font-size-caption);
          font-weight: var(--font-weight-medium);
          color: var(--color-text-muted);
        }

        .tab-btn.active {
          color: var(--color-accent);
          font-weight: var(--font-weight-semibold);
        }

        .tab-btn:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: 2px;
        }
      </style>

      <year-header id="header"></year-header>

      <main>
        <div id="goals-panel" class="tab-panel active" role="tabpanel" aria-labelledby="tab-goals">
          <section id="capstone-section" class="list-section empty" aria-label="${t('home-page.capstone-section')}">
            <div class="section-header">
              <h2 class="section-heading">${t('home-page.capstone-section')}</h2>
              <button class="edit-btn" id="capstone-edit-btn">${t('home-page.edit')}</button>
            </div>
            <div id="capstone-list" class="item-list" role="list"></div>
            <button class="add-row" id="add-capstone">+ ${t('goal-item.add-capstone')}</button>
          </section>

          <section id="milestone-section" class="list-section empty" aria-label="${t('home-page.milestone-section')}">
            <div class="section-header">
              <h2 class="section-heading">${t('home-page.milestone-section')}</h2>
              <button class="edit-btn" id="milestone-edit-btn">${t('home-page.edit')}</button>
            </div>
            <div id="milestone-list" class="item-list" role="list"></div>
            <button class="add-row" id="add-milestone">+ ${t('goal-item.add-milestone')}</button>
          </section>

          <section id="wow-section" class="list-section empty" aria-label="${t('home-page.wow-section')}">
            <div class="section-header">
              <h2 class="section-heading">${t('home-page.wow-section')}</h2>
              <button class="edit-btn" id="wow-edit-btn">${t('home-page.edit')}</button>
            </div>
            <div id="wow-list" class="item-list" role="list"></div>
            <button class="add-row" id="add-wow">+ ${t('goal-item.add-wow')}</button>
          </section>
        </div>

        <div id="lists-panel" class="tab-panel" role="tabpanel" aria-labelledby="tab-lists">
        </div>
      </main>

      <nav id="tab-bar" aria-label="${t('tab-bar.nav')}">
        <div role="tablist" aria-label="${t('tab-bar.nav')}">
          <button class="tab-btn active" id="tab-goals" role="tab" aria-selected="true" aria-controls="goals-panel">${t('tab-bar.goals')}</button>
          <button class="tab-btn" id="tab-lists" role="tab" aria-selected="false" aria-controls="lists-panel">${t('tab-bar.lists')}</button>
        </div>
      </nav>

      <goal-dialog id="dialog"></goal-dialog>
    `;
  }

  subscribe() {
    this._year   = Number(this.params?.year);
    this._header = this.shadowRoot.querySelector('#header');
    this._dialog = this.shadowRoot.querySelector('#dialog');
    this._editingSection = 'capstone';
    this._editingGoal    = null;

    const capstoneSection  = this.shadowRoot.querySelector('#capstone-section');
    const milestoneSection = this.shadowRoot.querySelector('#milestone-section');
    const wowSection       = this.shadowRoot.querySelector('#wow-section');
    this._capstoneList  = this.shadowRoot.querySelector('#capstone-list');
    this._milestoneList = this.shadowRoot.querySelector('#milestone-list');
    this._wowList       = this.shadowRoot.querySelector('#wow-list');

    // ── Header ────────────────────────────────────────────────────────────

    this._header.year = this._year;

    this._onYearNavigate = e => navigate(`/${e.detail.year}`);
    this._header.addEventListener('year-navigate', this._onYearNavigate);

    // ── Tab switching ─────────────────────────────────────────────────────

    const goalsPanel = this.shadowRoot.querySelector('#goals-panel');
    const listsPanel = this.shadowRoot.querySelector('#lists-panel');
    const tabGoals   = this.shadowRoot.querySelector('#tab-goals');
    const tabLists   = this.shadowRoot.querySelector('#tab-lists');

    this._onTabGoals = () => {
      goalsPanel.classList.add('active');   listsPanel.classList.remove('active');
      tabGoals.classList.add('active');     tabLists.classList.remove('active');
      tabGoals.setAttribute('aria-selected', 'true');
      tabLists.setAttribute('aria-selected', 'false');
    };
    this._onTabLists = () => {
      listsPanel.classList.add('active');   goalsPanel.classList.remove('active');
      tabLists.classList.add('active');     tabGoals.classList.remove('active');
      tabLists.setAttribute('aria-selected', 'true');
      tabGoals.setAttribute('aria-selected', 'false');
    };
    tabGoals.addEventListener('click', this._onTabGoals);
    tabLists.addEventListener('click', this._onTabLists);

    // ── Per-section edit ──────────────────────────────────────────────────

    const capstoneEditBtn  = this.shadowRoot.querySelector('#capstone-edit-btn');
    const milestoneEditBtn = this.shadowRoot.querySelector('#milestone-edit-btn');
    const wowEditBtn       = this.shadowRoot.querySelector('#wow-edit-btn');
    this._capstoneEdit  = false;
    this._milestoneEdit = false;
    this._wowEdit       = false;

    this._onCapstoneEdit = () => {
      this._capstoneEdit = !this._capstoneEdit;
      capstoneSection.classList.toggle('edit', this._capstoneEdit);
      capstoneEditBtn.textContent = this._capstoneEdit ? t('home-page.done') : t('home-page.edit');
      this._capstoneList.querySelectorAll('goal-item').forEach(el => { el.editMode = this._capstoneEdit; });
    };
    capstoneEditBtn.addEventListener('click', this._onCapstoneEdit);

    this._onMilestoneEdit = () => {
      this._milestoneEdit = !this._milestoneEdit;
      milestoneSection.classList.toggle('edit', this._milestoneEdit);
      milestoneEditBtn.textContent = this._milestoneEdit ? t('home-page.done') : t('home-page.edit');
      this._milestoneList.querySelectorAll('goal-item').forEach(el => { el.editMode = this._milestoneEdit; });
    };
    milestoneEditBtn.addEventListener('click', this._onMilestoneEdit);

    this._onWowEdit = () => {
      this._wowEdit = !this._wowEdit;
      wowSection.classList.toggle('edit', this._wowEdit);
      wowEditBtn.textContent = this._wowEdit ? t('home-page.done') : t('home-page.edit');
      this._wowList.querySelectorAll('goal-item').forEach(el => { el.editMode = this._wowEdit; });
    };
    wowEditBtn.addEventListener('click', this._onWowEdit);

    // ── Store ─────────────────────────────────────────────────────────────

    this._onGoals = goals => {
      const items = goals?.[String(this._year)] ?? [];
      this._renderList(this._capstoneList, items, this._capstoneEdit);
      capstoneSection.classList.toggle('empty', items.length === 0);
    };
    Store.subscribe('goals', this._onGoals);

    this._onMilestones = milestone => {
      const items = milestone?.[String(this._year)] ?? [];
      this._renderList(this._milestoneList, items, this._milestoneEdit);
      milestoneSection.classList.toggle('empty', items.length === 0);
    };
    Store.subscribe('milestone', this._onMilestones);

    this._onWow = wow => {
      const items = wow?.[String(this._year)] ?? [];
      this._renderList(this._wowList, items, this._wowEdit);
      wowSection.classList.toggle('empty', items.length === 0);
    };
    Store.subscribe('wow', this._onWow);

    // ── Capstone events ───────────────────────────────────────────────────

    this._onCapstoneGoalTap = e => {
      this._editingSection = 'capstone';
      this._editingGoal    = e.detail.goal;
      this._dialog.open(e.detail.goal);
    };
    this._capstoneList.addEventListener('goal-tap', this._onCapstoneGoalTap);

    this._onCapstoneProgress = e => {
      Store.dispatch('goal:progress-set', { year: String(this._year), id: e.detail.goal.id, percentage: e.detail.percentage });
    };
    this._capstoneList.addEventListener('goal-progress', this._onCapstoneProgress);

    this._onCapstoneDelete = e => {
      Store.dispatch('goal:deleted', { year: String(this._year), id: e.detail.goal.id });
    };
    this._capstoneList.addEventListener('goal-delete', this._onCapstoneDelete);

    this._onAddCapstone = () => {
      this._editingSection = 'capstone';
      this._editingGoal    = null;
      this._dialog.open(null);
    };
    this.shadowRoot.querySelector('#add-capstone').addEventListener('click', this._onAddCapstone);

    // ── Milestone events ──────────────────────────────────────────────────

    this._onMilestoneGoalTap = e => {
      this._editingSection = 'milestone';
      this._editingGoal    = e.detail.goal;
      this._dialog.open(e.detail.goal);
    };
    this._milestoneList.addEventListener('goal-tap', this._onMilestoneGoalTap);

    this._onMilestoneProgress = e => {
      Store.dispatch('milestone:progress-set', { year: String(this._year), id: e.detail.goal.id, percentage: e.detail.percentage });
    };
    this._milestoneList.addEventListener('goal-progress', this._onMilestoneProgress);

    this._onMilestoneDelete = e => {
      Store.dispatch('milestone:deleted', { year: String(this._year), id: e.detail.goal.id });
    };
    this._milestoneList.addEventListener('goal-delete', this._onMilestoneDelete);

    this._onAddMilestone = () => {
      this._editingSection = 'milestone';
      this._editingGoal    = null;
      this._dialog.open(null);
    };
    this.shadowRoot.querySelector('#add-milestone').addEventListener('click', this._onAddMilestone);

    // ── Wow events ────────────────────────────────────────────────────────

    this._onWowGoalTap = e => {
      this._editingSection = 'wow';
      this._editingGoal    = e.detail.goal;
      this._dialog.open(e.detail.goal);
    };
    this._wowList.addEventListener('goal-tap', this._onWowGoalTap);

    this._onWowProgress = e => {
      Store.dispatch('wow:progress-set', { year: String(this._year), id: e.detail.goal.id, percentage: e.detail.percentage });
    };
    this._wowList.addEventListener('goal-progress', this._onWowProgress);

    this._onWowDelete = e => {
      Store.dispatch('wow:deleted', { year: String(this._year), id: e.detail.goal.id });
    };
    this._wowList.addEventListener('goal-delete', this._onWowDelete);

    this._onAddWow = () => {
      this._editingSection = 'wow';
      this._editingGoal    = null;
      this._dialog.open(null);
    };
    this.shadowRoot.querySelector('#add-wow').addEventListener('click', this._onAddWow);

    // ── Dialog save ───────────────────────────────────────────────────────

    this._onGoalSaved = e => {
      const prefix = EVENT_PREFIX[this._editingSection];
      const id     = this._editingGoal?.id ?? crypto.randomUUID();
      Store.dispatch(`${prefix}:title-set`, { year: String(this._year), id, title: e.detail.title });
    };
    this.shadowRoot.addEventListener('goal-saved', this._onGoalSaved);
  }

  unsubscribe() {
    Store.unsubscribe('goals',     this._onGoals);
    Store.unsubscribe('milestone', this._onMilestones);
    Store.unsubscribe('wow',       this._onWow);

    this._header?.removeEventListener('year-navigate', this._onYearNavigate);

    this.shadowRoot.querySelector('#tab-goals')?.removeEventListener('click', this._onTabGoals);
    this.shadowRoot.querySelector('#tab-lists')?.removeEventListener('click', this._onTabLists);

    this.shadowRoot.querySelector('#capstone-edit-btn')?.removeEventListener('click', this._onCapstoneEdit);
    this.shadowRoot.querySelector('#milestone-edit-btn')?.removeEventListener('click', this._onMilestoneEdit);
    this.shadowRoot.querySelector('#wow-edit-btn')?.removeEventListener('click', this._onWowEdit);

    this._capstoneList?.removeEventListener('goal-tap',      this._onCapstoneGoalTap);
    this._capstoneList?.removeEventListener('goal-progress', this._onCapstoneProgress);
    this._capstoneList?.removeEventListener('goal-delete',   this._onCapstoneDelete);
    this.shadowRoot.querySelector('#add-capstone')?.removeEventListener('click', this._onAddCapstone);

    this._milestoneList?.removeEventListener('goal-tap',      this._onMilestoneGoalTap);
    this._milestoneList?.removeEventListener('goal-progress', this._onMilestoneProgress);
    this._milestoneList?.removeEventListener('goal-delete',   this._onMilestoneDelete);
    this.shadowRoot.querySelector('#add-milestone')?.removeEventListener('click', this._onAddMilestone);

    this._wowList?.removeEventListener('goal-tap',      this._onWowGoalTap);
    this._wowList?.removeEventListener('goal-progress', this._onWowProgress);
    this._wowList?.removeEventListener('goal-delete',   this._onWowDelete);
    this.shadowRoot.querySelector('#add-wow')?.removeEventListener('click', this._onAddWow);

    this.shadowRoot.removeEventListener('goal-saved', this._onGoalSaved);
  }

  _renderList(container, items, editMode = false) {
    const byId = new Map();
    container.querySelectorAll('goal-item').forEach(el => {
      if (el._goal?.id) byId.set(el._goal.id, el);
    });

    const ordered = items.map(goal => {
      const el = byId.get(goal.id) ?? document.createElement('goal-item');
      byId.delete(goal.id);
      el.editMode = editMode;
      el.goal = goal;
      return el;
    });

    byId.forEach(el => el.remove());
    ordered.forEach(el => container.appendChild(el));
  }
}

customElements.define('home-page', HomePage);
