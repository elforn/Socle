%%HP_TOAST_IMPORT%%
%%HP_GESTURE_IMPORT%%
%%HP_IMAGES_IMPORT%%
import { AppElement } from '../../_lib/core/app-element.js';
import { setTheme, getTheme } from '../../_lib/core/theme/theme.js';

class HomePage extends AppElement {
  template() {
    return `
      <style>
        :host { display: block; }
        main {
          padding: var(--space-4);
          padding-block-end: calc(var(--space-4) + var(--safe-area-bottom, 0px));
          max-inline-size: 600px;
          margin-inline: auto;
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }
        .card {
          background: var(--color-surface);
          border-radius: var(--radius-lg);
          padding-block-start: var(--space-1);
          padding-block-end: var(--space-4);
          padding-inline: var(--space-4);
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow-card);
        }
        h2 {
          font-size: var(--font-size-subheading);
          font-weight: var(--font-weight-bold);
          padding-block-end: var(--space-2);
          border-block-end: 0.5px solid var(--color-border);
          margin-block-start: 0.5em;
          margin-block-end: 0.5em;
        }
        p { font-size: var(--font-size-body); color: var(--color-text-secondary); margin-block: 0; }
        .card label,
        .card fieldset,
        .card div,
        .card p { margin-block-end: 0.6em; }
        .card fieldset { margin-block-start: 0.5em; }
        .card fieldset label { margin-block-end: 0; }
        label {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
          font-size: var(--font-size-body);
        }
        input[type="text"], textarea {
          padding: var(--space-2) var(--space-3);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: var(--font-size-body);
          font-family: var(--font-family);
          background: var(--color-bg);
          color: var(--color-text-primary);
          inline-size: 100%;
        }
        textarea { block-size: 80px; resize: vertical; }
        input[type="text"]:hover, textarea:hover {
          border-color: var(--color-accent);
          transition: border-color 0.15s;
        }
        input[type="text"]:focus, textarea:focus {
          border-color: var(--color-accent);
          background: var(--color-accent-subtle);
          outline: none;
        }
        fieldset {
          border: none;
          border-radius: var(--radius-full);
          padding: var(--space-1);
          background: var(--color-accent-subtle);
          display: flex;
          flex-direction: row;
          gap: var(--space-1);
        }
        legend {
          position: absolute;
          inline-size: 1px;
          block-size: 1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
        }
        .radio-label {
          flex: 1;
          block-size: var(--touch-target);
          min-block-size: unset;
          border-radius: var(--radius-full);
          background: transparent;
          font-size: var(--font-size-caption);
          font-weight: var(--font-weight-medium);
          color: var(--color-text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s, color 0.15s, box-shadow 0.15s;
        }
        .radio-label input[type="radio"] {
          position: absolute;
          opacity: 0;
          inline-size: 1px;
          block-size: 1px;
          pointer-events: none;
        }
        .radio-label:has(input:checked) {
          background: var(--color-surface);
          color: var(--color-text-primary);
          font-weight: var(--font-weight-bold);
          box-shadow: var(--shadow-card);
        }
        .toggle-label {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: var(--space-3);
          min-block-size: var(--touch-target);
          cursor: pointer;
        }
        .toggle-label input[type="checkbox"] {
          position: absolute;
          opacity: 0;
          width: 1px;
          height: 1px;
          pointer-events: none;
        }
        .toggle-label input:focus-visible ~ .toggle-track {
          outline: 2px solid var(--color-accent);
          outline-offset: 2px;
        }
        .toggle-track {
          inline-size: 44px;
          block-size: 26px;
          background: var(--color-border);
          border-radius: 13px;
          position: relative;
          transition: background 0.2s;
          flex-shrink: 0;
        }
        .toggle-thumb {
          position: absolute;
          inset-block-start: 3px;
          inset-inline-start: 3px;
          inline-size: 20px;
          block-size: 20px;
          border-radius: 50%;
          background: var(--color-text-inverse);
          transition: inset-inline-start 0.2s;
        }
        .toggle-label input:checked ~ .toggle-track { background: var(--color-accent); }
        .toggle-label input:checked ~ .toggle-track .toggle-thumb { inset-inline-start: 21px; }
        .tabs {
          display: flex;
          border-block-end: 2px solid var(--color-border);
          gap: var(--space-1);
        }
        .tabs button {
          background: none;
          border: none;
          padding: var(--space-2) var(--space-3);
          font-size: var(--font-size-body);
          font-family: var(--font-family);
          color: var(--color-text-secondary);
          cursor: pointer;
          border-block-end: 2px solid transparent;
          margin-block-end: -2px;
          min-block-size: var(--touch-target);
        }
        .tabs button[aria-selected="true"] {
          color: var(--color-text-primary);
          border-block-end-color: var(--color-accent);
          font-weight: var(--font-weight-bold);
        }
        [role="tabpanel"] {
          padding-block: var(--space-2);
          font-size: var(--font-size-body);
          color: var(--color-text-secondary);
        }
        .actions {
          display: flex;
          gap: var(--space-2);
          flex-wrap: wrap;
        }
        button.primary {
          background: var(--color-accent);
          color: var(--color-text-inverse);
          border: none;
          border-radius: var(--radius-md);
          padding: var(--space-2) var(--space-4);
          font-size: var(--font-size-body);
          font-family: var(--font-family);
          font-weight: var(--font-weight-bold);
          min-block-size: var(--touch-target);
          cursor: pointer;
          transition: background 0.15s;
        }
        button.primary:hover { background: var(--color-accent-dark); }
        button.secondary {
          background: var(--color-surface);
          color: var(--color-text-primary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--space-2) var(--space-4);
          font-size: var(--font-size-body);
          font-family: var(--font-family);
          min-block-size: var(--touch-target);
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }
        button.secondary:hover {
          background: var(--color-accent-subtle);
          border-color: var(--color-accent);
        }
%%HP_GESTURE_CSS%%
%%HP_IMAGES_CSS%%
      </style>
      <main>
        <section class="card">
          <h2>%%APP_NAME%%</h2>

          <label>
            Entry
            <input type="text" id="entry-input" placeholder="Type something…" />
          </label>

          <label>
            Notes
            <textarea id="notes-input" placeholder="Additional notes…"></textarea>
          </label>

          <fieldset>
            <legend>Priority</legend>
            <label class="radio-label">
              <input type="radio" name="priority" value="low" checked />
              Low
            </label>
            <label class="radio-label">
              <input type="radio" name="priority" value="high" />
              High
            </label>
          </fieldset>

          <fieldset>
            <legend>Theme</legend>
            <label class="radio-label">
              <input type="radio" name="theme" value="system" />
              System
            </label>
            <label class="radio-label">
              <input type="radio" name="theme" value="light" />
              Light
            </label>
            <label class="radio-label">
              <input type="radio" name="theme" value="dark" />
              Dark
            </label>
          </fieldset>

          <label class="toggle-label">
            <input type="checkbox" id="notify-toggle" />
            <span class="toggle-track"><span class="toggle-thumb"></span></span>
            Notify me
          </label>

          <div>
            <div class="tabs" role="tablist" aria-label="View">
              <button role="tab" aria-selected="true" aria-controls="tab-details" id="tab-btn-details">Details</button>
              <button role="tab" aria-selected="false" aria-controls="tab-history" id="tab-btn-history">History</button>
            </div>
            <div id="tab-details" role="tabpanel" aria-labelledby="tab-btn-details">
              Details will appear here.
            </div>
            <div id="tab-history" role="tabpanel" aria-labelledby="tab-btn-history" hidden>
              History will appear here.
            </div>
          </div>

          <div class="actions">
            <button class="primary" id="submit-btn">Save entry</button>
%%HP_MODAL_BTN%%
          </div>
        </section>
%%HP_GESTURE_SECTION%%
%%HP_SYNC_SECTION%%
%%HP_IMAGES_SECTION%%
%%HP_TOAST_SECTION%%
%%HP_MODAL_ELEMENT%%
      </main>
    `;
  }

  subscribe() {
    const sr = this.shadowRoot;

    this._onSubmit = () => {
%%HP_TOAST_DISPATCH%%
    };
    sr.querySelector('#submit-btn').addEventListener('click', this._onSubmit);

    this._onTheme = e => setTheme(e.target.value);
    this._themeInputs = [...sr.querySelectorAll('[name="theme"]')];
    this._themeInputs.forEach(input => {
      if (input.value === getTheme()) input.checked = true;
      input.addEventListener('change', this._onTheme);
    });

%%HP_MODAL_SUBSCRIBE%%
%%HP_GESTURE_SUBSCRIBE%%
%%HP_SYNC_SUBSCRIBE%%
%%HP_IMAGES_SUBSCRIBE%%
%%HP_TOAST_SUBSCRIBE%%
    this._tabs   = [...sr.querySelectorAll('[role="tab"]')];
    this._panels = [...sr.querySelectorAll('[role="tabpanel"]')];
    this._onTab  = e => {
      const idx = this._tabs.indexOf(e.currentTarget);
      this._tabs.forEach((t, i)   => t.setAttribute('aria-selected', String(i === idx)));
      this._panels.forEach((p, i) => { p.hidden = i !== idx; });
    };
    this._tabs.forEach(t => t.addEventListener('click', this._onTab));
  }

  unsubscribe() {
    const sr = this.shadowRoot;
    sr.querySelector('#submit-btn')?.removeEventListener('click', this._onSubmit);
    this._themeInputs?.forEach(input => input.removeEventListener('change', this._onTheme));
%%HP_MODAL_UNSUBSCRIBE%%
%%HP_GESTURE_UNSUBSCRIBE%%
%%HP_SYNC_UNSUBSCRIBE%%
%%HP_IMAGES_UNSUBSCRIBE%%
%%HP_TOAST_UNSUBSCRIBE%%
    this._tabs?.forEach(t => t.removeEventListener('click', this._onTab));
  }
}

customElements.define('home-page', HomePage);
