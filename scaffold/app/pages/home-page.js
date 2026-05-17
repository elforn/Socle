import { AppElement } from '../../_lib/core/app-element.js';

class HomePage extends AppElement {
  template() {
    return '<main><h1>%%APP_NAME%%</h1></main>';
  }
}

customElements.define('home-page', HomePage);
