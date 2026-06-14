import { initTheme } from '../_lib/core/theme/theme.js';
import './strings.js';
import './locales/fr.js';
import './locales/ca.js';
import { setLocale, getLocale } from '../_lib/core/strings.js';
import { boot } from '../_lib/core/store/store.js';
import { reducer } from './store/reducer.js';
import '../_lib/core/router/app-router.js';
import '../_lib/core/sw-manager/sw-manager.js';
import '../_lib/core/components/update-banner/update-banner.js';
import './pages/year-redirect.js';
import './pages/home-page.js';
import './pages/not-found-page.js';

initTheme();
setLocale(getLocale());

await boot({ dbName: 'youryear', reducer });

const swm = document.createElement('sw-manager');
swm.setAttribute('base-path', __BASE_PATH__);
swm.setAttribute('app-version', __APP_VERSION__);
document.body.prepend(swm);

console.log('YourYear', __APP_VERSION__);

const router = document.querySelector('app-router');
router.routes = [
  { path: '/',       component: 'year-redirect' },
  { path: '/:year',  component: 'home-page' },
  { path: '*',       component: 'not-found-page' },
];
