import { boot } from '../_lib/core/store/store.js';
import { reducer } from './store/reducer.js';
import '../_lib/core/router/app-router.js';
import './pages/home-page.js';
import './pages/not-found-page.js';

await boot({ dbName: 'socle-ref', reducer });

console.log('Socle reference app', __APP_VERSION__);

const router = document.querySelector('app-router');
router.routes = [
  { path: '/', component: 'home-page' },
  { path: '*', component: 'not-found-page' },
];
