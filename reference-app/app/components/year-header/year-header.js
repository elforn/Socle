import { AppElement } from '../../../_lib/core/app-element.js';
import { t } from '../../../_lib/core/strings.js';

class YearHeader extends AppElement {
  set year(v) {
    this._year = Number(v);
    if (this.shadowRoot) this._updateYear();
  }

  template() {
    const year = this._year ?? new Date().getFullYear();
    const pct  = yearProgress(year);
    return `
      <style>
        @keyframes menu-in {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        :host {
          display: block;
          position: fixed;
          inset-block-start: var(--update-banner-height, 0px);
          inset-inline: 0;
          z-index: 100;
          background: var(--color-surface);
          padding-block-start: calc(var(--space-2) + var(--safe-area-top));
          padding-block-end: 0;
          padding-inline: var(--page-padding);
          transition: padding-block-start 0.2s ease;
        }

        :host(.compact) {
          padding-block-start: var(--safe-area-top);
        }

        .top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-block-end: var(--space-1);
        }

        :host(.compact) .top-row {
          padding-block-end: 0;
        }


        .year-nav {
          display: flex;
          align-items: center;
          gap: 0;
        }

        .nav-btn {
          min-block-size: var(--touch-target);
          min-inline-size: var(--touch-target);
          background: none;
          border: none;
          cursor: pointer;
          font-size: var(--font-size-heading);
          color: var(--color-text-secondary);
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .nav-btn:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: 2px;
        }

        h1 {
          font-size: var(--font-size-title);
          font-weight: var(--font-weight-bold);
          color: var(--color-text-primary);
          line-height: 1;
          min-inline-size: 4ch;
          text-align: center;
        }

        .menu-btn {
          min-block-size: var(--touch-target);
          min-inline-size: var(--touch-target);
          background: none;
          border: none;
          cursor: pointer;
          font-size: var(--font-size-subheading);
          color: var(--color-text-secondary);
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .menu-btn:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: 2px;
        }

        .strip-bar {
          margin-inline: calc(-1 * var(--page-padding));
          block-size: var(--header-strip-height);
          background: var(--color-surface-raised);
          overflow: hidden;
        }

        .strip-fill {
          block-size: 100%;
          background: var(--color-accent);
        }

        /* ── Menu ──────────────────────────────────────────────────────── */

        dialog {
          position: fixed;
          inset-block-end: 0;
          inset-inline-start: 0;
          inset-block-start: auto;
          margin: 0;
          inline-size: 100%;
          max-inline-size: 100%;
          background: var(--color-surface);
          border: none;
          border-start-start-radius: var(--radius-lg);
          border-start-end-radius: var(--radius-lg);
          border-end-start-radius: 0;
          border-end-end-radius: 0;
          padding: 0;
          padding-block-end: var(--safe-area-bottom);
          box-shadow: var(--shadow-sheet);
          color: var(--color-text-primary);
          font-family: var(--font-family);
        }

        dialog[open] {
          animation: menu-in 0.28s cubic-bezier(0.32, 0.72, 0, 1);
        }

        dialog::backdrop {
          background: var(--color-overlay);
          animation: fade-in 0.2s ease-out;
        }

        .menu-handle {
          inline-size: 36px;
          block-size: 4px;
          border-radius: var(--radius-full);
          background: var(--color-border);
          margin: var(--space-3) auto var(--space-1);
        }

        .menu-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          inline-size: 100%;
          min-block-size: var(--touch-target-lg);
          padding-inline: var(--space-5);
          background: none;
          border: none;
          border-block-start: 0.5px solid var(--color-border);
          cursor: pointer;
          font-family: var(--font-family);
          font-size: var(--font-size-body);
          font-weight: var(--font-weight-medium);
          color: var(--color-text-primary);
          text-align: start;
        }

        .menu-item.muted {
          color: var(--color-text-muted);
          cursor: default;
        }

        .menu-section-label {
          font-size: var(--font-size-caption);
          font-weight: var(--font-weight-semibold);
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding-inline: var(--space-5);
          padding-block-start: var(--space-3);
          padding-block-end: var(--space-1);
        }

        .badge {
          font-size: var(--font-size-caption);
          font-weight: var(--font-weight-medium);
          color: var(--color-text-muted);
          background: var(--color-surface-raised);
          border-radius: var(--radius-full);
          padding: 2px var(--space-2);
        }
      </style>

      <div class="top-row">
        <nav class="year-nav" aria-label="${t('home-page.year-progress')}">
          <button id="prev" class="nav-btn" aria-label="${t('home-page.prev-year')}">‹</button>
          <h1 id="year">${year}</h1>
          <button id="next" class="nav-btn" aria-label="${t('home-page.next-year')}">›</button>
        </nav>
        <button id="menu-btn" class="menu-btn" aria-label="${t('year-header.menu')}" aria-expanded="false">☰</button>
      </div>

      <div class="strip-bar">
        <div class="strip-fill" id="strip-fill" style="width:${pct}%"></div>
      </div>

      <dialog id="menu">
        <div class="menu-handle"></div>
        <p class="menu-section-label">${t('year-header.year-section')}</p>
        <div class="menu-item muted">
          <span>${t('year-header.color')}</span>
          <span class="badge">${t('year-header.theme-soon')}</span>
        </div>
        <p class="menu-section-label">${t('year-header.app-section')}</p>
        <div class="menu-item muted">
          <span>${t('year-header.theme')}</span>
          <span class="badge">${t('year-header.theme-soon')}</span>
        </div>
      </dialog>
    `;
  }

  subscribe() {
    this._yearEl    = this.shadowRoot.querySelector('#year');
    this._stripFill = this.shadowRoot.querySelector('#strip-fill');
    this._menuDialog = this.shadowRoot.querySelector('#menu');
    this._compact = false;

    this._onScroll = () => {
      const y = window.scrollY;
      if (!this._compact && y > 80)       { this._compact = true;  this.classList.add('compact'); }
      else if (this._compact && y < 60)   { this._compact = false; this.classList.remove('compact'); }
    };
    window.addEventListener('scroll', this._onScroll, { passive: true });

    this._updateYear();

    this._onPrev = () => this.dispatchEvent(new CustomEvent('year-navigate', {
      bubbles: true, composed: true, detail: { year: this._year - 1 },
    }));
    this._onNext = () => this.dispatchEvent(new CustomEvent('year-navigate', {
      bubbles: true, composed: true, detail: { year: this._year + 1 },
    }));
    this.shadowRoot.querySelector('#prev').addEventListener('click', this._onPrev);
    this.shadowRoot.querySelector('#next').addEventListener('click', this._onNext);

    const menuBtn = this.shadowRoot.querySelector('#menu-btn');
    this._onMenuBtn = () => {
      this._menuDialog.showModal();
      menuBtn.setAttribute('aria-expanded', 'true');
    };
    menuBtn.addEventListener('click', this._onMenuBtn);

    this._onMenuClose = () => menuBtn.setAttribute('aria-expanded', 'false');
    this._menuDialog.addEventListener('close', this._onMenuClose);

    this._onBackdrop = e => {
      if (e.target === this._menuDialog) this._menuDialog.close();
    };
    this._menuDialog.addEventListener('pointerup', this._onBackdrop);

  }

  unsubscribe() {
    this.shadowRoot.querySelector('#prev')?.removeEventListener('click', this._onPrev);
    this.shadowRoot.querySelector('#next')?.removeEventListener('click', this._onNext);
    this.shadowRoot.querySelector('#menu-btn')?.removeEventListener('click', this._onMenuBtn);
    this._menuDialog?.removeEventListener('close', this._onMenuClose);
    this._menuDialog?.removeEventListener('pointerup', this._onBackdrop);
    window.removeEventListener('scroll', this._onScroll);
  }

  _updateYear() {
    const year = this._year ?? new Date().getFullYear();
    if (this._yearEl) this._yearEl.textContent = String(year);
    const pct = yearProgress(year);
    if (this._stripFill) this._stripFill.style.width = `${pct}%`;
  }
}

function yearProgress(year) {
  const now     = new Date();
  const current = now.getFullYear();
  if (year < current) return 100;
  if (year > current) return 0;
  const start = new Date(year, 0, 1).getTime();
  const end   = new Date(year + 1, 0, 1).getTime();
  return Math.round((now.getTime() - start) / (end - start) * 100);
}

customElements.define('year-header', YearHeader);
