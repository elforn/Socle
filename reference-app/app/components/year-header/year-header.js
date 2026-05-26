import { AppElement } from '../../../_lib/core/app-element.js';
import { Gestures } from '../../../_lib/modules/gestures/gestures.js';
import { t, setLocale, getLocale } from '../../../_lib/core/strings.js';
import * as Store from '../../../_lib/core/store/store.js';

const LOCALE_LABELS = { en: 'English', fr: 'Français', ca: 'Català' };
const IMAGE_HEADER_HEIGHT = '200px';

class YearHeader extends Gestures(AppElement) {
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
          transition: padding-block-start 0.2s ease, block-size 0.2s ease;
        }

        :host(.compact) {
          padding-block-start: var(--safe-area-top);
        }

        /* ── Image mode ─────────────────────────────────────────────────── */

        :host([data-has-image]:not(.compact)) {
          block-size: var(--image-header-height, 200px);
          padding-block-start: 0;
          padding-inline: 0;
        }

        .header-bg {
          display: none;
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        :host([data-has-image]:not(.compact)) .header-bg {
          display: block;
        }

        .header-image {
          inline-size: 100%;
          block-size: 100%;
          object-fit: cover;
          object-position: center;
        }

        .image-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(0,0,0,0.65) 0%,
            rgba(0,0,0,0)    45%,
            rgba(0,0,0,0)    55%,
            rgba(0,0,0,0.65) 100%
          );
        }

        :host([data-has-image]:not(.compact)) .top-row {
          position: relative;
          z-index: 1;
          padding-block-start: calc(var(--space-2) + var(--safe-area-top));
          padding-inline: var(--page-padding);
        }

        :host([data-has-image]:not(.compact)) h1,
        :host([data-has-image]:not(.compact)) .nav-btn,
        :host([data-has-image]:not(.compact)) .menu-btn {
          color: white;
        }

        :host([data-has-image]:not(.compact)) .nav-btn:focus-visible,
        :host([data-has-image]:not(.compact)) .menu-btn:focus-visible {
          outline-color: white;
        }

        :host([data-has-image]:not(.compact)) .strip-bar {
          position: absolute;
          inset-block-end: 0;
          inset-inline: 0;
          background: rgba(255,255,255,0.2);
        }

        :host([data-has-image]:not(.compact)) .strip-fill {
          background: rgba(255,255,255,0.6);
        }

        /* ── Layout ─────────────────────────────────────────────────────── */

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

        /* ── Menu / sheets ──────────────────────────────────────────────── */

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

        .menu-item.destructive {
          color: var(--color-danger, #d32f2f);
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

        .badge.selected {
          color: var(--color-accent);
          background: color-mix(in srgb, var(--color-accent) 12%, transparent);
        }

        .menu-item-value {
          font-size: var(--font-size-body);
          color: var(--color-text-muted);
        }
      </style>

      <div class="header-bg" aria-hidden="true">
        <img class="header-image" id="header-img" alt="" aria-hidden="true">
        <div class="image-overlay"></div>
      </div>

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

      <input type="file" id="photo-input" accept="image/*" hidden>

      <dialog id="menu">
        <div class="menu-handle"></div>
        <p class="menu-section-label">${t('year-header.year-section')}</p>
        <div class="menu-item muted">
          <span>${t('year-header.color')}</span>
          <span class="badge">${t('year-header.theme-soon')}</span>
        </div>
        <button class="menu-item" id="year-photo-btn">
          <span>${t('year-header.photo')}</span>
          <span class="menu-item-value">›</span>
        </button>
        <p class="menu-section-label">${t('year-header.app-section')}</p>
        <div class="menu-item muted">
          <span>${t('year-header.theme')}</span>
          <span class="badge">${t('year-header.theme-soon')}</span>
        </div>
        <button class="menu-item" id="language-btn">
          <span>${t('year-header.language')}</span>
          <span class="menu-item-value">${LOCALE_LABELS[getLocale()]} ›</span>
        </button>
      </dialog>

      <dialog id="photo-sheet">
        <div class="menu-handle"></div>
        <p class="menu-section-label">${t('year-header.photo')}</p>
        <button class="menu-item" id="photo-add">
          <span>${t('year-header.photo-add')}</span>
        </button>
        <button class="menu-item" id="photo-change" hidden>
          <span>${t('year-header.photo-change')}</span>
        </button>
        <button class="menu-item destructive" id="photo-remove" hidden>
          <span>${t('year-header.photo-remove')}</span>
        </button>
      </dialog>

      <dialog id="lang-sheet">
        <div class="menu-handle"></div>
        <p class="menu-section-label">${t('year-header.language')}</p>
        ${['en', 'fr', 'ca'].map(locale => {
          const active = getLocale() === locale;
          return `<button class="menu-item" data-locale="${locale}">
            <span>${LOCALE_LABELS[locale]}</span>
            ${active ? `<span class="badge selected">✓</span>` : ''}
          </button>`;
        }).join('')}
      </dialog>
    `;
  }

  onSwipe(e) {
    const delta = e.direction === 'left' ? 1 : e.direction === 'right' ? -1 : 0;
    if (!delta) return;
    this.dispatchEvent(new CustomEvent('year-navigate', {
      bubbles: true, composed: true, detail: { year: this._year + delta },
    }));
  }

  subscribe() {
    this._yearEl    = this.shadowRoot.querySelector('#year');
    this._stripFill = this.shadowRoot.querySelector('#strip-fill');
    this._menuDialog = this.shadowRoot.querySelector('#menu');
    this._compact = false;
    this._imageUrl = null;

    this._onScroll = () => {
      const y = window.scrollY;
      if (!this._compact && y > 80)       { this._compact = true;  this.classList.add('compact'); }
      else if (this._compact && y < 60)   { this._compact = false; this.classList.remove('compact'); }
    };
    window.addEventListener('scroll', this._onScroll, { passive: true });

    this._onImages = images => {
      this._imagesState = images;
      this._updateImageFor(this._year);
    };
    Store.subscribe('images', this._onImages);

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
    this._menuDialog.addEventListener('click', this._onBackdrop);

    // Photo sub-sheet
    this._photoSheet = this.shadowRoot.querySelector('#photo-sheet');
    const photoInput = this.shadowRoot.querySelector('#photo-input');

    this._onYearPhotoBtn = () => {
      this._menuDialog.close();
      this._updatePhotoMenu(!!this._imagesState?.[this._year]);
      this._photoSheet.showModal();
    };
    this.shadowRoot.querySelector('#year-photo-btn').addEventListener('click', this._onYearPhotoBtn);

    this._onPhotoSheetBackdrop = e => {
      if (e.target === this._photoSheet) this._photoSheet.close();
    };
    this._photoSheet.addEventListener('click', this._onPhotoSheetBackdrop);

    const openPhotoPicker = () => {
      this._photoSheet.close();
      photoInput.click();
    };
    this._onPhotoAdd = openPhotoPicker;
    this._onPhotoChange = openPhotoPicker;
    this.shadowRoot.querySelector('#photo-add').addEventListener('click', this._onPhotoAdd);
    this.shadowRoot.querySelector('#photo-change').addEventListener('click', this._onPhotoChange);

    this._onPhotoRemove = async () => {
      this._photoSheet.close();
      const imageId = Store.getState().images?.[this._year];
      await Store.dispatch('year:image-removed', { year: this._year });
      if (imageId) Store.deleteBlob(imageId);
    };
    this.shadowRoot.querySelector('#photo-remove').addEventListener('click', this._onPhotoRemove);

    this._onPhotoInput = async e => {
      const file = e.target.files?.[0];
      if (!file) return;
      const imageId = crypto.randomUUID();
      await Store.attachBlob(imageId, file);
      Store.dispatch('year:image-set', { year: this._year, imageId });
      e.target.value = '';
    };
    photoInput.addEventListener('change', this._onPhotoInput);

    // Language
    this._langDialog = this.shadowRoot.querySelector('#lang-sheet');

    this._onLanguageBtn = () => {
      this._menuDialog.close();
      this._langDialog.showModal();
    };
    this.shadowRoot.querySelector('#language-btn').addEventListener('click', this._onLanguageBtn);

    this._onLangBackdrop = e => {
      if (e.target === this._langDialog) this._langDialog.close();
    };
    this._langDialog.addEventListener('click', this._onLangBackdrop);

    this._onLangSelect = e => {
      const btn = e.target.closest('[data-locale]');
      if (btn && btn.dataset.locale !== getLocale()) {
        setLocale(btn.dataset.locale);
        location.reload();
      }
    };
    this._langDialog.addEventListener('click', this._onLangSelect);
  }

  unsubscribe() {
    Store.unsubscribe('images', this._onImages);
    if (this._imageUrl) URL.revokeObjectURL(this._imageUrl);

    this.shadowRoot.querySelector('#prev')?.removeEventListener('click', this._onPrev);
    this.shadowRoot.querySelector('#next')?.removeEventListener('click', this._onNext);
    this.shadowRoot.querySelector('#menu-btn')?.removeEventListener('click', this._onMenuBtn);
    this._menuDialog?.removeEventListener('close', this._onMenuClose);
    this._menuDialog?.removeEventListener('click', this._onBackdrop);
    this.shadowRoot.querySelector('#year-photo-btn')?.removeEventListener('click', this._onYearPhotoBtn);
    this._photoSheet?.removeEventListener('click', this._onPhotoSheetBackdrop);
    this.shadowRoot.querySelector('#photo-add')?.removeEventListener('click', this._onPhotoAdd);
    this.shadowRoot.querySelector('#photo-change')?.removeEventListener('click', this._onPhotoChange);
    this.shadowRoot.querySelector('#photo-remove')?.removeEventListener('click', this._onPhotoRemove);
    this.shadowRoot.querySelector('#photo-input')?.removeEventListener('change', this._onPhotoInput);
    document.documentElement.style.removeProperty('--year-header-height');
    this.shadowRoot.querySelector('#language-btn')?.removeEventListener('click', this._onLanguageBtn);
    this._langDialog?.removeEventListener('click', this._onLangBackdrop);
    this._langDialog?.removeEventListener('click', this._onLangSelect);
    window.removeEventListener('scroll', this._onScroll);
  }

  _updateYear() {
    const year = this._year ?? new Date().getFullYear();
    if (this._yearEl) this._yearEl.textContent = String(year);
    const pct = yearProgress(year);
    if (this._stripFill) this._stripFill.style.width = `${pct}%`;
    this._updateImageFor(year);
  }

  async _updateImageFor(year) {
    const imageId = this._imagesState?.[year];
    if (!imageId) {
      this._clearImage();
      return;
    }
    const blob = await Store.getBlob(imageId);
    if (this._year !== year) return; // year changed while fetching
    if (!blob) {
      this._clearImage();
      return;
    }
    if (this._imageUrl) URL.revokeObjectURL(this._imageUrl);
    this._imageUrl = URL.createObjectURL(blob);
    this.shadowRoot.querySelector('#header-img').src = this._imageUrl;
    this.setAttribute('data-has-image', '');
    document.documentElement.style.setProperty('--year-header-height', IMAGE_HEADER_HEIGHT);
    this._updatePhotoMenu(true);
  }

  _clearImage() {
    if (this._imageUrl) {
      URL.revokeObjectURL(this._imageUrl);
      this._imageUrl = null;
    }
    const img = this.shadowRoot?.querySelector('#header-img');
    if (img) img.src = '';
    this.removeAttribute('data-has-image');
    document.documentElement.style.removeProperty('--year-header-height');
    this._updatePhotoMenu(false);
  }

  _updatePhotoMenu(hasImage) {
    const addBtn    = this.shadowRoot?.querySelector('#photo-add');
    const changeBtn = this.shadowRoot?.querySelector('#photo-change');
    const removeBtn = this.shadowRoot?.querySelector('#photo-remove');
    if (addBtn)    addBtn.hidden    = hasImage;
    if (changeBtn) changeBtn.hidden = !hasImage;
    if (removeBtn) removeBtn.hidden = !hasImage;
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
