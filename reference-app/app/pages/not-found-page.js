import { AppElement } from '../../_lib/core/app-element.js';
import '../../_lib/modules/app-header/app-header.js';

class NotFoundPage extends AppElement {
  template() {
    return `
      <app-header label="404 — Page not found"></app-header>
      <main><p>The page you were looking for doesn't exist.</p></main>
    `;
  }
}

customElements.define('not-found-page', NotFoundPage);
